import { onMounted, onUnmounted, ref, watch } from "vue";
import { Note as TonalNote } from "@tonaljs/tonal";
import type { ChromaticNote } from "@/types";
import { useInstrumentStore } from "@/stores/instrument";
import { useMusicStore } from "@/stores/music";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useVisualConfig } from "@/composables/useVisualConfig";
import { SCHEDULED_LIVE_MIDI_EVENT } from "@/services/scheduledLiveVoice";
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
  isRoliInput: boolean;
}

interface PendingMidiPress {
  noteName: string;
  isRoliInput: boolean;
}

interface MidiNoteResolver {
  parseNoteInput: (
    note: string
  ) => { solfegeIndex: number; octave: number } | null;
  getNoteName: (solfegeIndex: number, octave: number) => string;
}

interface MirroredNoteEventDetail {
  source?: string;
  mirrorMidi?: boolean;
  duration?: string;
  durationMs?: number;
  noteId?: string;
  noteName?: string;
  octave?: number;
  keyboardOctave?: number;
  solfegeIndex?: number;
  isBorrowed?: boolean;
  timestamp?: number;
}

interface ScheduledMidiNoteEventDetail extends MirroredNoteEventDetail {
  noteId: string;
  phase: "attack" | "release";
  timestamp: number;
}

export interface MidiOwnerTransition {
  midiNote: number;
  phase: "attack" | "release";
  timestamp: number;
}

interface ScheduledMidiOwnerEvent extends MidiOwnerTransition {
  ownerId: string;
}

interface PendingMidiOwnerUpdate {
  ownerId: string;
  midiNote: number;
  phase: "attack" | "release";
  timestamp?: number;
}

interface ClearableMidiOutput extends MIDIOutput {
  clear(): void;
}

export function createMidiNoteReferenceCounter(
  noteOn: (midiNote: number, timestamp?: number) => void,
  noteOff: (midiNote: number, timestamp?: number) => void,
) {
  const ownerCounts = new Map<number, number>();

  return {
    acquire(midiNote: number, timestamp?: number) {
      const count = ownerCounts.get(midiNote) ?? 0;
      ownerCounts.set(midiNote, count + 1);
      if (count === 0) {
        if (timestamp === undefined) noteOn(midiNote);
        else noteOn(midiNote, timestamp);
      }
    },
    release(midiNote: number, timestamp?: number) {
      const count = ownerCounts.get(midiNote) ?? 0;
      if (count <= 0) {
        return;
      }
      if (count === 1) {
        ownerCounts.delete(midiNote);
        if (timestamp === undefined) noteOff(midiNote);
        else noteOff(midiNote, timestamp);
        return;
      }
      ownerCounts.set(midiNote, count - 1);
    },
    clear() {
      ownerCounts.clear();
    },
  };
}

/**
 * Keeps timestamped and immediate MIDI voices on one per-pitch ownership
 * timeline. Web MIDI packets are rebuilt whenever that future changes so a
 * release is emitted only when the final owner of a pitch has ended.
 */
export function createMidiNoteOwnerScheduler(
  sendNow: (transition: Omit<MidiOwnerTransition, "timestamp">) => void,
  replaceScheduled: (transitions: MidiOwnerTransition[]) => void,
  now: () => number = () => performance.now(),
) {
  const activeOwners = new Map<number, Set<string>>();
  const scheduledEvents = new Map<string, ScheduledMidiOwnerEvent>();
  let queuedTransitions: MidiOwnerTransition[] = [];
  let isBatching = false;
  let advancedCurrentBatch = false;
  let batchTime = 0;

  const eventKey = (ownerId: string, phase: ScheduledMidiOwnerEvent["phase"]) =>
    `${ownerId}\u0000${phase}`;

  const ordered = (events: Iterable<ScheduledMidiOwnerEvent>) =>
    [...events].sort((left, right) =>
      left.timestamp - right.timestamp
      || (left.phase === right.phase ? 0 : left.phase === "attack" ? -1 : 1)
      || left.ownerId.localeCompare(right.ownerId)
    );

  const apply = (
    ownersByNote: Map<number, Set<string>>,
    event: Pick<ScheduledMidiOwnerEvent, "ownerId" | "midiNote" | "phase">,
  ): Omit<MidiOwnerTransition, "timestamp"> | null => {
    const owners = ownersByNote.get(event.midiNote) ?? new Set<string>();
    const before = owners.size;

    if (event.phase === "attack") {
      owners.add(event.ownerId);
      ownersByNote.set(event.midiNote, owners);
    } else {
      owners.delete(event.ownerId);
      if (owners.size === 0) ownersByNote.delete(event.midiNote);
    }

    if (before === 0 && owners.size > 0) {
      return { midiNote: event.midiNote, phase: "attack" };
    }
    if (before > 0 && owners.size === 0) {
      return { midiNote: event.midiNote, phase: "release" };
    }
    return null;
  };

  const advance = (timestamp: number) => {
    for (const event of ordered(scheduledEvents.values())) {
      if (event.timestamp > timestamp) break;
      apply(activeOwners, event);
      scheduledEvents.delete(eventKey(event.ownerId, event.phase));
    }
  };

  const rebuild = () => {
    const projectedOwners = new Map(
      [...activeOwners].map(([midiNote, owners]) => [midiNote, new Set(owners)]),
    );
    const transitions: MidiOwnerTransition[] = [];

    for (const event of ordered(scheduledEvents.values())) {
      const transition = apply(projectedOwners, event);
      if (transition) transitions.push({ ...transition, timestamp: event.timestamp });
    }
    const unchanged = transitions.length === queuedTransitions.length
      && transitions.every((transition, index) => {
        const queued = queuedTransitions[index];
        return transition.midiNote === queued.midiNote
          && transition.phase === queued.phase
          && transition.timestamp === queued.timestamp;
      });
    if (unchanged) return;
    queuedTransitions = transitions;
    replaceScheduled(transitions);
  };

  const update = (
    ownerId: string,
    midiNote: number,
    phase: ScheduledMidiOwnerEvent["phase"],
    timestamp?: number,
  ) => {
    const currentTime = isBatching ? batchTime : now();
    if (!isBatching || !advancedCurrentBatch) {
      advance(currentTime);
      advancedCurrentBatch = true;
    }
    const key = eventKey(ownerId, phase);
    scheduledEvents.delete(key);
    let immediateTransition: Omit<MidiOwnerTransition, "timestamp"> | null = null;

    if (timestamp === undefined || timestamp < currentTime) {
      immediateTransition = apply(activeOwners, { ownerId, midiNote, phase });
    } else {
      scheduledEvents.set(key, { ownerId, midiNote, phase, timestamp });
    }
    rebuild();
    if (immediateTransition) sendNow(immediateTransition);
  };

  return {
    beginBatch() {
      isBatching = true;
      advancedCurrentBatch = false;
      batchTime = now();
    },
    endBatch() {
      isBatching = false;
      advancedCurrentBatch = false;
      batchTime = 0;
    },
    attack(ownerId: string, midiNote: number, timestamp?: number) {
      update(ownerId, midiNote, "attack", timestamp);
    },
    release(ownerId: string, midiNote: number, timestamp?: number) {
      update(ownerId, midiNote, "release", timestamp);
    },
    clear() {
      activeOwners.clear();
      scheduledEvents.clear();
      queuedTransitions = [];
      isBatching = false;
      advancedCurrentBatch = false;
      batchTime = 0;
    },
  };
}

export function shouldMirrorNoteEvent(
  detail: Pick<MirroredNoteEventDetail, "mirrorMidi"> | undefined,
) {
  return detail?.mirrorMidi !== false;
}

function resolveMidiEventTimestamp(detail: MirroredNoteEventDetail | undefined) {
  const timestamp = detail?.timestamp;
  return typeof timestamp === "number" && Number.isFinite(timestamp)
    ? performance.now() + timestamp - Date.now()
    : undefined;
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
  if (typeof detail?.solfegeIndex === "number") {
    const keyboardOctave = detail.keyboardOctave ?? detail.octave;
    return detail.solfegeIndex >= 0 && typeof keyboardOctave === "number"
      ? `${detail.solfegeIndex}_${keyboardOctave}`
      : null;
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
  const exactMidiNote = (noteName: string) => {
    const midiNote = TonalNote.get(noteName).midi;
    return typeof midiNote === "number"
      && Number.isInteger(midiNote)
      && midiNote >= 0
      && midiNote <= 127
      ? midiNote
      : null;
  };

  if (
    detail?.noteName
    && typeof detail.keyboardOctave === "number"
  ) {
    return exactMidiNote(detail.noteName);
  }

  if (
    detail?.noteName
    && (detail.isBorrowed || detail.solfegeIndex === -1)
  ) {
    return exactMidiNote(detail.noteName);
  }

  if (
    typeof detail?.solfegeIndex === "number"
    && typeof detail.octave === "number"
  ) {
    return exactMidiNote(
      noteResolver.getNoteName(detail.solfegeIndex, detail.octave),
    );
  }

  if (!detail?.noteName) {
    return null;
  }

  return exactMidiNote(detail.noteName);
}

export function useMidiControls() {
  const instrumentStore = useInstrumentStore();
  const musicStore = useMusicStore();
  const keyboardDrawerStore = useKeyboardDrawerStore();
  const { dynamicColorConfig } = useVisualConfig();

  const midiAccess = ref<MIDIAccess | null>(null);
  const selectedRoliOutput = ref<MIDIOutput | null>(null);
  const roliInputIds = ref<Set<string>>(new Set());
  const activeMidiNotes = ref<Map<string, ActiveMidiNote>>(new Map());
  const pendingMidiPresses = ref<Map<string, PendingMidiPress>>(new Map());
  const pendingReleasedPressIds = ref<Set<string>>(new Set());
  const pendingInputNoteOns = ref<Map<string, number>>(new Map());
  const pendingInputNoteOffs = ref<Set<string>>(new Set());
  const mirroredNoteTimeouts = ref<Map<string, number>>(new Map());
  const mirroredEventNotes = ref<Map<string, number>>(new Map());
  const anonymousMirroredOwners = ref<Map<number, string[]>>(new Map());
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
    const noteName = midiNoteNumberToName(noteNumber);
    // Only suppress the immediate echo of an ordinary ROLI press. Styled
    // output is a new performance and must reach the MIDI mirror in full.
    const isRoliInput = roliInputIds.value.has(inputId) && (musicStore.playStyle ?? "together") === "together";

    if (messageType === MIDI_NOTE_ON && velocity > 0) {
      if (instrumentStore.isInteractionLocked) {
        return;
      }

      if (
        activeMidiNotes.value.has(pressId)
        || pendingMidiPresses.value.has(pressId)
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
      pendingMidiPresses.value.set(pressId, { noteName, isRoliInput });
      if (isRoliInput) {
        incrementPendingNoteCount(pendingInputNoteOns.value, noteName);
      }

      void musicStore
        .attackNoteWithOctave(parsed.solfegeIndex, parsed.octave)
        .then((noteId) => {
          const pendingPress = pendingMidiPresses.value.get(pressId);
          pendingMidiPresses.value.delete(pressId);
          const replacedTogetherAttack = noteId?.startsWith("held_") && pendingPress?.isRoliInput;
          if (replacedTogetherAttack) {
            consumePendingNoteCount(pendingInputNoteOns.value, pendingPress.noteName);
          }

          if (!noteId) {
            if (pendingPress?.isRoliInput) {
              consumePendingNoteCount(pendingInputNoteOns.value, pendingPress.noteName);
            }
            pendingReleasedPressIds.value.delete(pressId);
            keyboardDrawerStore.removeTouch(pressId);
            return;
          }

          if (pendingReleasedPressIds.value.has(pressId)) {
            pendingReleasedPressIds.value.delete(pressId);
            if (pendingPress?.isRoliInput) {
              pendingInputNoteOffs.value.add(noteId);
            }
            musicStore.releaseNote(noteId);
            pendingInputNoteOffs.value.delete(noteId);
            keyboardDrawerStore.removeTouch(pressId);
            return;
          }

          activeMidiNotes.value.set(pressId, { noteId, pressId, isRoliInput: isRoliInput && !replacedTogetherAttack });
        })
        .catch(() => {
          const pendingPress = pendingMidiPresses.value.get(pressId);
          pendingMidiPresses.value.delete(pressId);

          if (pendingPress?.isRoliInput) {
            consumePendingNoteCount(pendingInputNoteOns.value, pendingPress.noteName);
          }

          pendingReleasedPressIds.value.delete(pressId);
          keyboardDrawerStore.removeTouch(pressId);
        });
      return;
    }

    if (
      messageType === MIDI_NOTE_OFF
      || (messageType === MIDI_NOTE_ON && velocity === 0)
    ) {
      const activeNote = activeMidiNotes.value.get(pressId);
      if (!activeNote) {
        if (pendingMidiPresses.value.has(pressId)) {
          pendingReleasedPressIds.value.add(pressId);
          keyboardDrawerStore.removeTouch(pressId);
        }
        return;
      }

      if (activeNote.isRoliInput) {
        pendingInputNoteOffs.value.add(activeNote.noteId);
      }
      musicStore.releaseNote(activeNote.noteId);
      pendingInputNoteOffs.value.delete(activeNote.noteId);
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

  const sendToRoliOutput = (message: number[], timestamp?: number) => {
    if (timestamp === undefined) selectedRoliOutput.value?.send(message);
    else selectedRoliOutput.value?.send(message, timestamp);
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

  let pendingImmediateMidiTransitions: Array<Omit<MidiOwnerTransition, "timestamp">> = [];
  let pendingScheduledMidiTransitions: MidiOwnerTransition[] = [];
  let hasPendingScheduledReplacement = false;
  let midiOutputFlushQueued = false;
  let midiOutputFlushGeneration = 0;
  let pendingMidiOwnerUpdates: PendingMidiOwnerUpdate[] = [];
  let midiOwnerFlushQueued = false;
  let midiOwnerFlushGeneration = 0;

  const queueMidiOutputFlush = () => {
    if (midiOutputFlushQueued) return;
    midiOutputFlushQueued = true;
    const generation = midiOutputFlushGeneration;

    queueMicrotask(() => {
      if (generation !== midiOutputFlushGeneration) return;
      midiOutputFlushQueued = false;
      const immediate = pendingImmediateMidiTransitions;
      const scheduled = pendingScheduledMidiTransitions;
      const replaceScheduled = hasPendingScheduledReplacement;
      pendingImmediateMidiTransitions = [];
      hasPendingScheduledReplacement = false;

      if (!selectedRoliOutput.value) return;
      if (replaceScheduled) {
        (selectedRoliOutput.value as ClearableMidiOutput).clear();
        syncRoliPalette();
        syncRoliMainOctave();
      }
      immediate.forEach(({ midiNote, phase }) => {
        sendToRoliOutput(
          phase === "attack"
            ? buildRoliNoteOnMessage(midiNote)
            : buildRoliNoteOffMessage(midiNote),
        );
      });
      if (replaceScheduled) {
        scheduled.forEach(({ midiNote, phase, timestamp }) => {
          sendToRoliOutput(
            phase === "attack"
              ? buildRoliNoteOnMessage(midiNote)
              : buildRoliNoteOffMessage(midiNote),
            timestamp,
          );
        });
      }
    });
  };

  const resetPendingMidiOutputFlush = () => {
    midiOutputFlushGeneration += 1;
    midiOutputFlushQueued = false;
    pendingImmediateMidiTransitions = [];
    pendingScheduledMidiTransitions = [];
    hasPendingScheduledReplacement = false;
  };

  const midiOwnerScheduler = createMidiNoteOwnerScheduler(
    (transition) => {
      pendingImmediateMidiTransitions.push(transition);
      queueMidiOutputFlush();
    },
    (transitions) => {
      pendingScheduledMidiTransitions = transitions;
      hasPendingScheduledReplacement = true;
      queueMidiOutputFlush();
    },
  );

  const queueMidiOwnerUpdate = (update: PendingMidiOwnerUpdate) => {
    pendingMidiOwnerUpdates.push(update);
    if (midiOwnerFlushQueued) return;
    midiOwnerFlushQueued = true;
    const generation = midiOwnerFlushGeneration;

    queueMicrotask(() => {
      if (generation !== midiOwnerFlushGeneration) return;
      midiOwnerFlushQueued = false;
      const updates = pendingMidiOwnerUpdates;
      pendingMidiOwnerUpdates = [];
      midiOwnerScheduler.beginBatch();
      try {
        updates.forEach(({ ownerId, midiNote, phase, timestamp }) => {
          if (phase === "attack") {
            midiOwnerScheduler.attack(ownerId, midiNote, timestamp);
          } else {
            midiOwnerScheduler.release(ownerId, midiNote, timestamp);
          }
        });
      } finally {
        midiOwnerScheduler.endBatch();
      }
    });
  };

  const resetPendingMidiOwnerUpdates = () => {
    midiOwnerFlushGeneration += 1;
    midiOwnerFlushQueued = false;
    pendingMidiOwnerUpdates = [];
  };

  const clearMirroredTimeouts = () => {
    mirroredNoteTimeouts.value.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    mirroredNoteTimeouts.value.clear();
  };

  const clearMirroredEventNotes = () => {
    mirroredEventNotes.value.clear();
    anonymousMirroredOwners.value.clear();
  };

  const flushRoliOutput = () => {
    resetPendingMidiOwnerUpdates();
    resetPendingMidiOutputFlush();
    if (!selectedRoliOutput.value) {
      clearMirroredTimeouts();
      clearMirroredEventNotes();
      midiOwnerScheduler.clear();
      return;
    }

    (selectedRoliOutput.value as ClearableMidiOutput).clear();
    buildRoliAllNotesOffMessages(ROLI_SYNC_CONTROL_CHANNEL).forEach((message) => {
      sendToRoliOutput(message);
    });

    clearMirroredTimeouts();
    clearMirroredEventNotes();
    midiOwnerScheduler.clear();
  };

  const releaseMidiNotes = (inputId?: string) => {
    for (const [pressId, activeNote] of activeMidiNotes.value.entries()) {
      if (!inputId || pressId.startsWith(`midi:${inputId}:`)) {
        if (activeNote.isRoliInput) {
          pendingInputNoteOffs.value.add(activeNote.noteId);
        }
        musicStore.releaseNote(activeNote.noteId);
        pendingInputNoteOffs.value.delete(activeNote.noteId);
        keyboardDrawerStore.removeTouch(activeNote.pressId);
        activeMidiNotes.value.delete(pressId);
      }
    }

    for (const [pressId] of pendingMidiPresses.value.entries()) {
      if (!inputId || pressId.startsWith(`midi:${inputId}:`)) {
        pendingReleasedPressIds.value.add(pressId);
        keyboardDrawerStore.removeTouch(pressId);
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
    const detail = (event as CustomEvent<MirroredNoteEventDetail>).detail;
    if (!shouldMirrorNoteEvent(detail)) return;
    const noteName = detail?.noteName;

    if (detail?.source !== "live-play-style" && noteName && consumePendingNoteCount(pendingInputNoteOns.value, noteName)) {
      return;
    }

    if (!selectedRoliOutput.value) {
      return;
    }

    const midiNote = resolveMirroredMidiNoteNumber(detail, musicStore);
    if (midiNote === null) {
      return;
    }

    if (detail?.noteId) {
      if (mirroredEventNotes.value.has(detail.noteId)) {
        return;
      }
      mirroredEventNotes.value.set(detail.noteId, midiNote);
    }

    debugRoliSync("mirroring note to ROLI", {
      source: detail?.source || "app",
      noteName: noteName || null,
      solfegeIndex: detail?.solfegeIndex ?? null,
      octave: detail?.octave ?? null,
      midiNote,
    });
    if (detail?.noteId) {
      queueMidiOwnerUpdate({
        ownerId: `mirrored:${detail.noteId}`,
        midiNote,
        phase: "attack",
        timestamp: resolveMidiEventTimestamp(detail),
      });
      return;
    }

    const durationMs = resolveMirroredEventDurationMs(detail);
    const timeoutKey = `${midiNote}:${Date.now()}:${Math.random()}`;
    const ownerId = `timeout:${timeoutKey}`;
    const anonymousOwners = anonymousMirroredOwners.value.get(midiNote) ?? [];
    anonymousOwners.push(ownerId);
    anonymousMirroredOwners.value.set(midiNote, anonymousOwners);
    queueMidiOwnerUpdate({
      ownerId,
      midiNote,
      phase: "attack",
      timestamp: resolveMidiEventTimestamp(detail),
    });
    const timeoutId = window.setTimeout(() => {
      const remainingOwners = anonymousMirroredOwners.value.get(midiNote)
        ?.filter((candidate) => candidate !== ownerId) ?? [];
      if (remainingOwners.length > 0) {
        anonymousMirroredOwners.value.set(midiNote, remainingOwners);
      } else {
        anonymousMirroredOwners.value.delete(midiNote);
      }
      queueMidiOwnerUpdate({ ownerId, midiNote, phase: "release" });
      mirroredNoteTimeouts.value.delete(timeoutKey);
    }, durationMs);

    mirroredNoteTimeouts.value.set(timeoutKey, timeoutId);
  };

  const mirrorNoteReleased = (event: Event) => {
    const detail = (event as CustomEvent<MirroredNoteEventDetail>).detail;
    if (!shouldMirrorNoteEvent(detail)) return;

    if (detail?.noteId && pendingInputNoteOffs.value.has(detail.noteId)) {
      pendingInputNoteOffs.value.delete(detail.noteId);
      return;
    }

    if (!selectedRoliOutput.value) {
      return;
    }

    const storedMidiNote = detail?.noteId
      ? mirroredEventNotes.value.get(detail.noteId)
      : undefined;
    if (detail?.noteId && storedMidiNote === undefined) {
      return;
    }
    const midiNote = storedMidiNote
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
    if (detail?.noteId) {
      queueMidiOwnerUpdate({
        ownerId: `mirrored:${detail.noteId}`,
        midiNote,
        phase: "release",
        timestamp: resolveMidiEventTimestamp(detail),
      });
      return;
    }

    const anonymousOwners = anonymousMirroredOwners.value.get(midiNote);
    const ownerId = anonymousOwners?.shift();
    if (!ownerId) return;
    if (anonymousOwners?.length === 0) anonymousMirroredOwners.value.delete(midiNote);
    const timeoutKey = ownerId.slice("timeout:".length);
    const timeoutId = mirroredNoteTimeouts.value.get(timeoutKey);
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    mirroredNoteTimeouts.value.delete(timeoutKey);
    queueMidiOwnerUpdate({
      ownerId,
      midiNote,
      phase: "release",
      timestamp: resolveMidiEventTimestamp(detail),
    });
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

  const handleScheduledMidiNote = (event: Event) => {
    const detail = (event as CustomEvent<ScheduledMidiNoteEventDetail>).detail;
    if (!selectedRoliOutput.value || !shouldMirrorNoteEvent(detail)) return;
    const midiNote = resolveMirroredMidiNoteNumber(detail, musicStore);
    if (midiNote === null) return;
    const timestamp = resolveMidiEventTimestamp(detail);
    if (timestamp === undefined) return;
    const ownerId = `scheduled:${detail.noteId}`;
    queueMidiOwnerUpdate({ ownerId, midiNote, phase: detail.phase, timestamp });
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

  watch(
    () => instrumentStore.isInteractionLocked,
    (isLocked) => {
      if (isLocked) {
        releaseMidiNotes();
      }
    },
    { flush: "sync" }
  );

  onMounted(() => {
    installDevMidiSimulator();
    keyboardDrawerStore.refreshMidiSupport();
    window.addEventListener("note-played", handleNotePlayed as EventListener);
    window.addEventListener("note-released", handleNoteReleased as EventListener);
    window.addEventListener(SCHEDULED_LIVE_MIDI_EVENT, handleScheduledMidiNote as EventListener);
    if (keyboardDrawerStore.midi.isSupported) {
      void connectMidi();
    }
  });

  onUnmounted(() => {
    window.removeEventListener("note-played", handleNotePlayed as EventListener);
    window.removeEventListener("note-released", handleNoteReleased as EventListener);
    window.removeEventListener(SCHEDULED_LIVE_MIDI_EVENT, handleScheduledMidiNote as EventListener);
    uninstallDevMidiSimulator();
    clearVisualNoteTimeouts();
    keyboardDrawerStore.clearVisualNotes();
    disconnectMidi();
  });
}
