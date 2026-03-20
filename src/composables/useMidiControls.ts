import { onMounted, onUnmounted, ref, watch } from "vue";
import { Note as TonalNote } from "@tonaljs/tonal";
import type { ChromaticNote } from "@/types";
import { useMusicStore } from "@/stores/music";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useVisualConfig } from "@/composables/useVisualConfig";
import {
  buildRoliAllNotesOffMessages,
  buildRoliMainOctaveMessage,
  buildRoliNoteOffMessage,
  buildRoliNoteOnMessage,
  buildRoliPaletteUpdateMessages,
  isRoliMidiPortName,
  pickPreferredRoliOutput,
  ROLI_SYNC_CONTROL_CHANNEL,
} from "@/services/roliLiveSync";

const MIDI_NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const MIDI_NOTE_ON = 0x90;
const MIDI_NOTE_OFF = 0x80;
const MIDI_CONTROL_CHANGE = 0xb0;
const MIDI_STATUS_MASK = 0xf0;
const MIDI_CHANNEL_MASK = 0x0f;
const DEV_MIDI_INPUT_ID = "__dev_virtual_input__";
const DEFAULT_MIRROR_DURATION_MS = 500;

interface DevMidiSimulator {
  noteOn: (note: number | string, velocity?: number, channel?: number) => void;
  noteOff: (note: number | string, channel?: number) => void;
  tap: (
    note: number | string,
    durationMs?: number,
    velocity?: number,
    channel?: number
  ) => void;
  chord: (
    notes: Array<number | string>,
    durationMs?: number,
    velocity?: number,
    channel?: number
  ) => void;
  help: string;
}

type DevMidiWindow = Window & typeof globalThis & {
  __emotitoneMidiSim?: DevMidiSimulator;
};

function shouldExposeDevMidiSimulator() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    import.meta.env.DEV
    || window.location.hostname === "127.0.0.1"
    || window.location.hostname === "localhost"
  );
}

interface ActiveMidiNote {
  noteId: string;
  pressId: string;
}

interface MidiNoteResolver {
  parseNoteInput: (
    note: string
  ) => { solfegeIndex: number; octave: number } | null;
  getNoteName: (solfegeIndex: number, octave: number) => string;
}

interface MirroredNoteEventDetail {
  source?: string;
  duration?: string;
  durationMs?: number;
  noteId?: string;
  noteName?: string;
  octave?: number;
  solfegeIndex?: number;
}

function buildMidiPressId(inputId: string, channel: number, noteNumber: number) {
  return `midi:${inputId}:${channel}:${noteNumber}`;
}

function incrementPendingNoteCount(map: Map<string, number>, noteName: string) {
  map.set(noteName, (map.get(noteName) || 0) + 1);
}

function consumePendingNoteCount(map: Map<string, number>, noteName: string) {
  const count = map.get(noteName);

  if (!count) {
    return false;
  }

  if (count === 1) {
    map.delete(noteName);
  } else {
    map.set(noteName, count - 1);
  }

  return true;
}

function toneNotationToMs(notation: string, bpm: number = 120) {
  const match = notation.match(/^(\d+)n$/);

  if (!match) {
    return DEFAULT_MIRROR_DURATION_MS;
  }

  const noteValue = Number.parseInt(match[1], 10);
  const wholeNoteMs = ((60 / bpm) * 4) * 1000;

  return wholeNoteMs / noteValue;
}

function shouldDebugRoliSync() {
  return import.meta.env.DEV;
}

function debugRoliSync(message: string, payload?: Record<string, unknown>) {
  if (!shouldDebugRoliSync()) {
    return;
  }

  if (payload) {
    console.debug(`[ROLI sync] ${message}`, payload);
    return;
  }

  console.debug(`[ROLI sync] ${message}`);
}

export function hasActiveTouchPress(
  activeTouches: unknown,
  pressId: string
): boolean {
  if (activeTouches instanceof Map) {
    return activeTouches.has(pressId);
  }

  if (activeTouches && typeof activeTouches === "object") {
    return Object.prototype.hasOwnProperty.call(activeTouches, pressId);
  }

  return false;
}

export function midiNoteNumberToName(noteNumber: number) {
  const noteName = MIDI_NOTE_NAMES[noteNumber % 12];
  const octave = Math.floor(noteNumber / 12) - 1;
  return `${noteName}${octave}`;
}

export function resolvePlayableMidiNote(
  noteNumber: number,
  noteResolver: MidiNoteResolver
) {
  const chromaticNote = midiNoteNumberToName(noteNumber);
  const parsed = noteResolver.parseNoteInput(chromaticNote);

  if (!parsed) {
    return null;
  }

  // Only accept notes that round-trip exactly into the current scale.
  if (noteResolver.getNoteName(parsed.solfegeIndex, parsed.octave) !== chromaticNote) {
    return null;
  }

  return parsed;
}

export function resolveMirroredEventDurationMs(
  detail?: MirroredNoteEventDetail
) {
  return typeof detail?.durationMs === "number"
    ? detail.durationMs
    : typeof detail?.duration === "string"
      ? toneNotationToMs(detail.duration)
      : DEFAULT_MIRROR_DURATION_MS;
}

export function resolveVisualNoteKey(
  detail: MirroredNoteEventDetail | undefined,
  noteResolver: MidiNoteResolver
): string | null {
  if (
    typeof detail?.solfegeIndex === "number"
    && typeof detail.octave === "number"
  ) {
    return `${detail.solfegeIndex}_${detail.octave}`;
  }

  if (!detail?.noteName) {
    return null;
  }

  const parsed = noteResolver.parseNoteInput(detail.noteName);
  if (!parsed) {
    return null;
  }

  return `${parsed.solfegeIndex}_${parsed.octave}`;
}

export function resolveMirroredMidiNoteNumber(
  detail: MirroredNoteEventDetail | undefined,
  noteResolver: MidiNoteResolver
): number | null {
  if (
    typeof detail?.solfegeIndex === "number"
    && typeof detail.octave === "number"
  ) {
    return TonalNote.get(
      noteResolver.getNoteName(detail.solfegeIndex, detail.octave)
    ).midi ?? null;
  }

  if (!detail?.noteName) {
    return null;
  }

  return TonalNote.get(detail.noteName).midi ?? null;
}

export function useMidiControls() {
  const musicStore = useMusicStore();
  const keyboardDrawerStore = useKeyboardDrawerStore();
  const { dynamicColorConfig } = useVisualConfig();

  const midiAccess = ref<MIDIAccess | null>(null);
  const selectedRoliOutput = ref<MIDIOutput | null>(null);
  const roliInputIds = ref<Set<string>>(new Set());
  const activeMidiNotes = ref<Map<string, ActiveMidiNote>>(new Map());
  const pendingReleasedPressIds = ref<Set<string>>(new Set());
  const pendingInputNoteOns = ref<Map<string, number>>(new Map());
  const pendingInputNoteOffs = ref<Set<string>>(new Set());
  const mirroredNoteTimeouts = ref<Map<string, number>>(new Map());
  const mirroredEventNotes = ref<Map<string, number>>(new Map());
  const visualNoteTimeouts = ref<Map<string, number>>(new Map());

  const parseMidiNoteNumber = (note: number | string): number | null => {
    if (typeof note === "number") {
      return Number.isInteger(note) && note >= 0 && note <= 127 ? note : null;
    }

    const midi = TonalNote.get(note).midi;
    return typeof midi === "number" && midi >= 0 && midi <= 127 ? midi : null;
  };

  const setPlaybackVisualTimeout = (activationId: string, durationMs: number) => {
    const existingTimeoutId = visualNoteTimeouts.value.get(activationId);
    if (existingTimeoutId) {
      window.clearTimeout(existingTimeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      keyboardDrawerStore.releaseVisualNote(activationId);
      visualNoteTimeouts.value.delete(activationId);
    }, durationMs);

    visualNoteTimeouts.value.set(activationId, timeoutId);
  };

  const clearVisualNoteTimeouts = () => {
    visualNoteTimeouts.value.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    visualNoteTimeouts.value.clear();
  };

  const activateVisualNoteFromEvent = (
    detail: MirroredNoteEventDetail | undefined
  ) => {
    const noteKey = resolveVisualNoteKey(detail, musicStore);
    if (!noteKey) {
      return;
    }

    const activationId =
      detail?.noteId || `playback:${noteKey}:${Date.now()}:${Math.random()}`;
    keyboardDrawerStore.activateVisualNote(activationId, noteKey);

    if (!detail?.noteId) {
      setPlaybackVisualTimeout(
        activationId,
        resolveMirroredEventDurationMs(detail)
      );
    }
  };

  const releaseVisualNoteFromEvent = (
    detail: MirroredNoteEventDetail | undefined
  ) => {
    if (!detail?.noteId) {
      return;
    }

    const timeoutId = visualNoteTimeouts.value.get(detail.noteId);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      visualNoteTimeouts.value.delete(detail.noteId);
    }

    keyboardDrawerStore.releaseVisualNote(detail.noteId);
  };

  const handleMidiPacket = (inputId: string, rawData: ArrayLike<number>) => {
    const data = Array.from(rawData).slice(0, 3);
    if (data.length < 2) {
      return;
    }

    const [status, noteNumber, velocity = 0] = data;
    const messageType = status & MIDI_STATUS_MASK;
    const channel = (status & MIDI_CHANNEL_MASK) + 1;
    const pressId = buildMidiPressId(inputId, channel, noteNumber);

    if (messageType === MIDI_NOTE_ON && velocity > 0) {
      if (
        activeMidiNotes.value.has(pressId)
        || hasActiveTouchPress(keyboardDrawerStore.touch.activeTouches, pressId)
      ) {
        return;
      }

      const parsed = resolvePlayableMidiNote(noteNumber, musicStore);
      if (!parsed) {
        return;
      }

      keyboardDrawerStore.addTouch(
        pressId,
        `${parsed.solfegeIndex}_${parsed.octave}`
      );
      incrementPendingNoteCount(
        pendingInputNoteOns.value,
        midiNoteNumberToName(noteNumber)
      );

      void musicStore
        .attackNoteWithOctave(parsed.solfegeIndex, parsed.octave)
        .then((noteId) => {
          if (!noteId) {
            consumePendingNoteCount(
              pendingInputNoteOns.value,
              midiNoteNumberToName(noteNumber)
            );
            pendingReleasedPressIds.value.delete(pressId);
            keyboardDrawerStore.removeTouch(pressId);
            return;
          }

          if (pendingReleasedPressIds.value.has(pressId)) {
            pendingReleasedPressIds.value.delete(pressId);
            pendingInputNoteOffs.value.add(noteId);
            musicStore.releaseNote(noteId);
            keyboardDrawerStore.removeTouch(pressId);
            return;
          }

          activeMidiNotes.value.set(pressId, { noteId, pressId });
        });
      return;
    }

    if (
      messageType === MIDI_NOTE_OFF
      || (messageType === MIDI_NOTE_ON && velocity === 0)
    ) {
      const activeNote = activeMidiNotes.value.get(pressId);
      if (!activeNote) {
        pendingReleasedPressIds.value.add(pressId);
        keyboardDrawerStore.removeTouch(pressId);
        return;
      }

      pendingInputNoteOffs.value.add(activeNote.noteId);
      musicStore.releaseNote(activeNote.noteId);
      keyboardDrawerStore.removeTouch(activeNote.pressId);
      activeMidiNotes.value.delete(pressId);
      pendingReleasedPressIds.value.delete(pressId);
    }
  };

  const installDevMidiSimulator = () => {
    if (!shouldExposeDevMidiSimulator()) {
      return;
    }

    const devWindow = window as DevMidiWindow;
    devWindow.__emotitoneMidiSim = {
      noteOn: (note, velocity = 100, channel = 1) => {
        const midiNote = parseMidiNoteNumber(note);
        if (midiNote === null) {
          console.warn("[emotitoneMidiSim] Invalid note:", note);
          return;
        }

        handleMidiPacket(DEV_MIDI_INPUT_ID, [
          MIDI_NOTE_ON | Math.max(0, Math.min(15, channel - 1)),
          midiNote,
          Math.max(0, Math.min(127, velocity)),
        ]);
      },
      noteOff: (note, channel = 1) => {
        const midiNote = parseMidiNoteNumber(note);
        if (midiNote === null) {
          console.warn("[emotitoneMidiSim] Invalid note:", note);
          return;
        }

        handleMidiPacket(DEV_MIDI_INPUT_ID, [
          MIDI_NOTE_OFF | Math.max(0, Math.min(15, channel - 1)),
          midiNote,
          0,
        ]);
      },
      tap: (note, durationMs = 250, velocity = 100, channel = 1) => {
        const midiNote = parseMidiNoteNumber(note);
        if (midiNote === null) {
          console.warn("[emotitoneMidiSim] Invalid note:", note);
          return;
        }

        devWindow.__emotitoneMidiSim?.noteOn(midiNote, velocity, channel);
        window.setTimeout(() => {
          devWindow.__emotitoneMidiSim?.noteOff(midiNote, channel);
        }, durationMs);
      },
      chord: (notes, durationMs = 350, velocity = 100, channel = 1) => {
        notes.forEach((note) => {
          devWindow.__emotitoneMidiSim?.noteOn(note, velocity, channel);
        });

        window.setTimeout(() => {
          notes.forEach((note) => {
            devWindow.__emotitoneMidiSim?.noteOff(note, channel);
          });
        }, durationMs);
      },
      help:
        'window.__emotitoneMidiSim.tap("C4"), noteOn(60), noteOff("C4"), chord(["C4","E4","G4"])',
    };

    console.info(
      "[emotitoneMidiSim] ready:",
      devWindow.__emotitoneMidiSim.help
    );
  };

  const uninstallDevMidiSimulator = () => {
    if (!shouldExposeDevMidiSimulator()) {
      return;
    }

    delete (window as DevMidiWindow).__emotitoneMidiSim;
  };

  // Expose the simulator as soon as the composable is created so console
  // testing works even before the component mount cycle finishes.
  installDevMidiSimulator();

  const sendToRoliOutput = (message: number[]) => {
    selectedRoliOutput.value?.send(message);
  };

  const syncRoliPalette = () => {
    if (!selectedRoliOutput.value) {
      return;
    }

    debugRoliSync("syncing palette", {
      output: selectedRoliOutput.value.name || selectedRoliOutput.value.id,
      currentKey: musicStore.currentKey,
      currentMode: musicStore.currentMode,
    });
    const messages = buildRoliPaletteUpdateMessages(
      dynamicColorConfig.value,
      musicStore.currentKey as ChromaticNote,
      musicStore.currentMode
    );
    messages.forEach((message, index) => {
      selectedRoliOutput.value?.send(message, window.performance.now() + index);
    });
  };

  const syncRoliMainOctave = () => {
    if (!selectedRoliOutput.value) {
      return;
    }

    debugRoliSync("sending main octave to ROLI", {
      output: selectedRoliOutput.value.name || selectedRoliOutput.value.id,
      mainOctave: keyboardDrawerStore.keyboardConfig.mainOctave,
    });
    sendToRoliOutput(
      buildRoliMainOctaveMessage(keyboardDrawerStore.keyboardConfig.mainOctave)
    );
  };

  const clearMirroredTimeouts = () => {
    mirroredNoteTimeouts.value.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    mirroredNoteTimeouts.value.clear();
  };

  const clearMirroredEventNotes = () => {
    mirroredEventNotes.value.clear();
  };

  const flushRoliOutput = () => {
    if (!selectedRoliOutput.value) {
      clearMirroredTimeouts();
      clearMirroredEventNotes();
      return;
    }

    buildRoliAllNotesOffMessages(ROLI_SYNC_CONTROL_CHANNEL).forEach((message) => {
      sendToRoliOutput(message);
    });

    clearMirroredTimeouts();
    clearMirroredEventNotes();
  };

  const releaseMidiNotes = (inputId?: string) => {
    for (const [pressId, activeNote] of activeMidiNotes.value.entries()) {
      if (!inputId || pressId.startsWith(`midi:${inputId}:`)) {
        pendingInputNoteOffs.value.add(activeNote.noteId);
        musicStore.releaseNote(activeNote.noteId);
        keyboardDrawerStore.removeTouch(activeNote.pressId);
        activeMidiNotes.value.delete(pressId);
      }
    }
  };

  const syncInputs = () => {
    if (!midiAccess.value) {
      roliInputIds.value = new Set();
      keyboardDrawerStore.setMidiInputs([]);
      return;
    }

    const inputNames: string[] = [];
    const nextRoliInputIds = new Set<string>();

    for (const input of midiAccess.value.inputs.values()) {
      input.onmidimessage = null;

      if (input.state !== "connected") {
        continue;
      }

      inputNames.push(input.name || "MIDI input");
      if (isRoliMidiPortName(input.name)) {
        nextRoliInputIds.add(input.id);
      }
      input.onmidimessage = (event) => {
        const midiEvent = event as MIDIMessageEvent;
        handleMidiPacket(input.id, midiEvent.data);
      };
    }

    roliInputIds.value = nextRoliInputIds;
    keyboardDrawerStore.setMidiInputs(inputNames);
  };

  const syncOutputs = () => {
    if (!midiAccess.value) {
      selectedRoliOutput.value = null;
      keyboardDrawerStore.setMidiOutputs([]);
      keyboardDrawerStore.setMidiSyncedOutput(null);
      return;
    }

    const outputs = Array.from(midiAccess.value.outputs.values()).filter(
      (output) => output.state === "connected"
    );
    const previousOutputId = selectedRoliOutput.value?.id;
    const preferredOutput = pickPreferredRoliOutput(outputs);

    keyboardDrawerStore.setMidiOutputs(
      outputs.map((output) => output.name || "MIDI output")
    );

    if (selectedRoliOutput.value && previousOutputId !== preferredOutput?.id) {
      flushRoliOutput();
    }

    selectedRoliOutput.value = preferredOutput;
    keyboardDrawerStore.setMidiSyncedOutput(
      preferredOutput?.name || null
    );

    if (preferredOutput && previousOutputId !== preferredOutput.id) {
      debugRoliSync("selected ROLI output", {
        output: preferredOutput.name || preferredOutput.id,
      });
      syncRoliPalette();
      syncRoliMainOctave();
    }
  };

  const mirrorNotePlayed = (event: Event) => {
    if (!selectedRoliOutput.value) {
      return;
    }

    const detail = (event as CustomEvent<MirroredNoteEventDetail>).detail;
    const noteName = detail?.noteName;

    if (noteName && consumePendingNoteCount(pendingInputNoteOns.value, noteName)) {
      return;
    }

    const midiNote = resolveMirroredMidiNoteNumber(detail, musicStore);
    if (midiNote === null) {
      return;
    }

    if (detail?.noteId) {
      mirroredEventNotes.value.set(detail.noteId, midiNote);
    }

    debugRoliSync("mirroring note to ROLI", {
      source: detail?.source || "app",
      noteName: noteName || null,
      solfegeIndex: detail?.solfegeIndex ?? null,
      octave: detail?.octave ?? null,
      midiNote,
    });
    sendToRoliOutput(buildRoliNoteOnMessage(midiNote));

    if (detail?.noteId) {
      return;
    }

    const durationMs = resolveMirroredEventDurationMs(detail);
    const timeoutKey = `${midiNote}:${Date.now()}:${Math.random()}`;
    const timeoutId = window.setTimeout(() => {
      sendToRoliOutput(buildRoliNoteOffMessage(midiNote));
      mirroredNoteTimeouts.value.delete(timeoutKey);
    }, durationMs);

    mirroredNoteTimeouts.value.set(timeoutKey, timeoutId);
  };

  const mirrorNoteReleased = (event: Event) => {
    if (!selectedRoliOutput.value) {
      return;
    }

    const detail = (event as CustomEvent<MirroredNoteEventDetail>).detail;

    if (detail?.noteId && pendingInputNoteOffs.value.has(detail.noteId)) {
      pendingInputNoteOffs.value.delete(detail.noteId);
      return;
    }

    const midiNote =
      (detail?.noteId ? mirroredEventNotes.value.get(detail.noteId) : null)
      ?? resolveMirroredMidiNoteNumber(detail, musicStore);
    if (midiNote === null) {
      return;
    }

    if (detail?.noteId) {
      mirroredEventNotes.value.delete(detail.noteId);
    }

    debugRoliSync("releasing mirrored note from ROLI", {
      source: detail?.source || "app",
      noteName: detail?.noteName || null,
      midiNote,
    });
    sendToRoliOutput(buildRoliNoteOffMessage(midiNote));
  };

  const handleNotePlayed = (event: Event) => {
    const detail = (event as CustomEvent<MirroredNoteEventDetail>).detail;
    activateVisualNoteFromEvent(detail);
    mirrorNotePlayed(event);
  };

  const handleNoteReleased = (event: Event) => {
    const detail = (event as CustomEvent<MirroredNoteEventDetail>).detail;
    releaseVisualNoteFromEvent(detail);
    mirrorNoteReleased(event);
  };

  const disconnectMidi = () => {
    releaseMidiNotes();
    pendingReleasedPressIds.value.clear();
    pendingInputNoteOns.value.clear();
    pendingInputNoteOffs.value.clear();
    flushRoliOutput();

    if (midiAccess.value) {
      for (const input of midiAccess.value.inputs.values()) {
        input.onmidimessage = null;
      }

      midiAccess.value.onstatechange = null;
    }

    midiAccess.value = null;
    selectedRoliOutput.value = null;
    roliInputIds.value = new Set();
    keyboardDrawerStore.setMidiConnecting(false);
    keyboardDrawerStore.setMidiListening(false);
    keyboardDrawerStore.setMidiOutputs([]);
    keyboardDrawerStore.setMidiSyncedOutput(null);
  };

  const connectMidi = async () => {
    keyboardDrawerStore.refreshMidiSupport();

    if (!keyboardDrawerStore.midi.isSupported) {
      return;
    }

    if (midiAccess.value) {
      keyboardDrawerStore.setMidiListening(true);
      syncInputs();
      syncOutputs();
      return;
    }

    keyboardDrawerStore.setMidiConnecting(true);
    keyboardDrawerStore.setMidiError(null);

    try {
      const access = await navigator.requestMIDIAccess();
      midiAccess.value = access;
      keyboardDrawerStore.setMidiListening(true);

      access.onstatechange = (event) => {
        const midiConnectionEvent = event as MIDIConnectionEvent;

        if (
          midiConnectionEvent.port.type === "input"
          && midiConnectionEvent.port.state === "disconnected"
        ) {
          releaseMidiNotes(midiConnectionEvent.port.id);
        }

        syncInputs();
        syncOutputs();
      };

      syncInputs();
      syncOutputs();
    } catch (error) {
      keyboardDrawerStore.setMidiListening(false);
      keyboardDrawerStore.setMidiError(
        error instanceof Error
          ? error.message
          : "MIDI access was not granted."
      );
    } finally {
      keyboardDrawerStore.setMidiConnecting(false);
    }
  };

  watch(
    () => [
      dynamicColorConfig.value,
      musicStore.currentKey,
      musicStore.currentMode,
    ],
    () => {
      syncRoliPalette();
    },
    { deep: true }
  );

  watch(
    () => keyboardDrawerStore.keyboardConfig.mainOctave,
    () => {
      syncRoliMainOctave();
    }
  );

  onMounted(() => {
    installDevMidiSimulator();
    keyboardDrawerStore.refreshMidiSupport();
    window.addEventListener("note-played", handleNotePlayed as EventListener);
    window.addEventListener("note-released", handleNoteReleased as EventListener);
    if (keyboardDrawerStore.midi.isSupported) {
      void connectMidi();
    }
  });

  onUnmounted(() => {
    window.removeEventListener("note-played", handleNotePlayed as EventListener);
    window.removeEventListener("note-released", handleNoteReleased as EventListener);
    uninstallDevMidiSimulator();
    clearVisualNoteTimeouts();
    keyboardDrawerStore.clearVisualNotes();
    disconnectMidi();
  });
}
