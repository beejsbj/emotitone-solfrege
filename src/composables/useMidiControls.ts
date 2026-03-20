import { onMounted, onUnmounted, ref } from "vue";
import { Note as TonalNote } from "@tonaljs/tonal";
import { useMusicStore } from "@/stores/music";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";

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
const MIDI_STATUS_MASK = 0xf0;
const MIDI_CHANNEL_MASK = 0x0f;
const DEV_MIDI_INPUT_ID = "__dev_virtual_input__";

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

function buildMidiPressId(inputId: string, channel: number, noteNumber: number) {
  return `midi:${inputId}:${channel}:${noteNumber}`;
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

export function useMidiControls() {
  const musicStore = useMusicStore();
  const keyboardDrawerStore = useKeyboardDrawerStore();

  const midiAccess = ref<MIDIAccess | null>(null);
  const activeMidiNotes = ref<Map<string, ActiveMidiNote>>(new Map());
  const pendingReleasedPressIds = ref<Set<string>>(new Set());

  const parseMidiNoteNumber = (note: number | string): number | null => {
    if (typeof note === "number") {
      return Number.isInteger(note) && note >= 0 && note <= 127 ? note : null;
    }

    const midi = TonalNote.get(note).midi;
    return typeof midi === "number" && midi >= 0 && midi <= 127 ? midi : null;
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
        || keyboardDrawerStore.touch.activeTouches.has(pressId)
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

      void musicStore
        .attackNoteWithOctave(parsed.solfegeIndex, parsed.octave)
        .then((noteId) => {
          if (!noteId) {
            pendingReleasedPressIds.value.delete(pressId);
            keyboardDrawerStore.removeTouch(pressId);
            return;
          }

          if (pendingReleasedPressIds.value.has(pressId)) {
            pendingReleasedPressIds.value.delete(pressId);
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

  const releaseMidiNotes = (inputId?: string) => {
    for (const [pressId, activeNote] of activeMidiNotes.value.entries()) {
      if (!inputId || pressId.startsWith(`midi:${inputId}:`)) {
        musicStore.releaseNote(activeNote.noteId);
        keyboardDrawerStore.removeTouch(activeNote.pressId);
        activeMidiNotes.value.delete(pressId);
      }
    }
  };

  const syncInputs = () => {
    if (!midiAccess.value) {
      keyboardDrawerStore.setMidiInputs([]);
      return;
    }

    const inputNames: string[] = [];

    for (const input of midiAccess.value.inputs.values()) {
      input.onmidimessage = null;

      if (input.state !== "connected") {
        continue;
      }

      inputNames.push(input.name || "MIDI input");
      input.onmidimessage = (event) => {
        const midiEvent = event as MIDIMessageEvent;
        handleMidiPacket(input.id, midiEvent.data);
      };
    }

    keyboardDrawerStore.setMidiInputs(inputNames);
  };

  const disconnectMidi = () => {
    releaseMidiNotes();
    pendingReleasedPressIds.value.clear();

    if (midiAccess.value) {
      for (const input of midiAccess.value.inputs.values()) {
        input.onmidimessage = null;
      }

      midiAccess.value.onstatechange = null;
    }

    midiAccess.value = null;
    keyboardDrawerStore.setMidiConnecting(false);
    keyboardDrawerStore.setMidiListening(false);
  };

  const connectMidi = async () => {
    keyboardDrawerStore.refreshMidiSupport();

    if (!keyboardDrawerStore.midi.isSupported) {
      return;
    }

    if (midiAccess.value) {
      keyboardDrawerStore.setMidiListening(true);
      syncInputs();
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
      };

      syncInputs();
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

  onMounted(() => {
    installDevMidiSimulator();
    keyboardDrawerStore.refreshMidiSupport();
    if (keyboardDrawerStore.midi.isSupported) {
      void connectMidi();
    }
  });

  onUnmounted(() => {
    uninstallDevMidiSimulator();
    disconnectMidi();
  });
}
