import { Note as TonalNote } from "@tonaljs/tonal";
import { onMounted, onUnmounted, watch } from "vue";
import { useVisualConfig } from "@/composables/useVisualConfig";
import { createMidiSession } from "@/services/midiSession";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import type { ChromaticNote } from "@/types/music";
import type {
  DevMidiWindow,
  MidiAccessAdapter,
  MidiInputPortAdapter,
  MidiMessageHandler,
  MidiNoteEventDetail,
  MidiOutputPortAdapter,
  MidiPortStateChangeHandler,
} from "@/types/midi";

const MIDI_NOTE_ON = 0x90;
const MIDI_NOTE_OFF = 0x80;
const MIDI_CHANNEL_MASK = 0x0f;
const DEV_MIDI_INPUT_ID = "__dev_virtual_input__";

function canRequestMidiAccess() {
  return (
    typeof navigator !== "undefined"
    && typeof navigator.requestMIDIAccess === "function"
  );
}

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

function createBrowserMidiAccessAdapter(access: MIDIAccess): MidiAccessAdapter {
  const inputAdapters = new WeakMap<MIDIInput, MidiInputPortAdapter>();
  const outputAdapters = new WeakMap<MIDIOutput, MidiOutputPortAdapter>();

  const adaptInput = (input: MIDIInput) => {
    const existing = inputAdapters.get(input);
    if (existing) {
      return existing;
    }

    const adapter: MidiInputPortAdapter = {
      get id() {
        return input.id;
      },
      get name() {
        return input.name;
      },
      get state() {
        return input.state;
      },
      setMessageHandler(handler: MidiMessageHandler | null) {
        input.onmidimessage = handler
          ? (event) => handler((event as MIDIMessageEvent).data)
          : null;
      },
    };
    inputAdapters.set(input, adapter);
    return adapter;
  };

  const adaptOutput = (output: MIDIOutput) => {
    const existing = outputAdapters.get(output);
    if (existing) {
      return existing;
    }

    const adapter: MidiOutputPortAdapter = {
      get id() {
        return output.id;
      },
      get name() {
        return output.name;
      },
      get state() {
        return output.state;
      },
      send(message, timestamp) {
        output.send(message, timestamp);
      },
    };
    outputAdapters.set(output, adapter);
    return adapter;
  };

  return {
    getInputs: () => Array.from(access.inputs.values(), adaptInput),
    getOutputs: () => Array.from(access.outputs.values(), adaptOutput),
    setStateChangeHandler(handler: MidiPortStateChangeHandler | null) {
      access.onstatechange = handler ? () => handler() : null;
    },
  };
}

export function useMidiControls() {
  const musicStore = useMusicStore();
  const keyboardDrawerStore = useKeyboardDrawerStore();
  const { dynamicColorConfig } = useVisualConfig();
  const devSimulatorTimeouts = new Set<number>();

  const requestAccess = canRequestMidiAccess()
    ? async () => createBrowserMidiAccessAdapter(
        await navigator.requestMIDIAccess()
      )
    : undefined;

  const session = createMidiSession({
    requestAccess,
    effects: {
      attackNote: (solfegeIndex, octave) =>
        musicStore.attackNoteWithOctave(solfegeIndex, octave),
      releaseNote: (noteId) => {
        void musicStore.releaseNote(noteId);
      },
      parseNoteInput: (note) => musicStore.parseNoteInput(note),
      getNoteName: (solfegeIndex, octave) =>
        musicStore.getNoteName(solfegeIndex, octave),
      isPressActive: (pressId) =>
        keyboardDrawerStore.hasActiveTouch(pressId),
      pressKey: (pressId, noteKey) => {
        keyboardDrawerStore.addTouch(pressId, noteKey);
      },
      releaseKey: (pressId) => {
        keyboardDrawerStore.removeTouch(pressId);
      },
      activateVisualNote: (activationId, noteKey) => {
        keyboardDrawerStore.activateVisualNote(activationId, noteKey);
      },
      releaseVisualNote: (activationId) => {
        keyboardDrawerStore.releaseVisualNote(activationId);
      },
      clearVisualNotes: () => {
        keyboardDrawerStore.clearVisualNotes();
      },
      stateChanged: (state) => {
        keyboardDrawerStore.setMidiSessionState(state);
      },
    },
    sync: {
      dynamicColorConfig: dynamicColorConfig.value,
      currentKey: musicStore.currentKey as ChromaticNote,
      currentMode: musicStore.currentMode,
      mainOctave: keyboardDrawerStore.keyboardConfig.mainOctave,
    },
  });

  const parseMidiNoteNumber = (note: number | string) => {
    if (typeof note === "number") {
      return Number.isInteger(note) && note >= 0 && note <= 127 ? note : null;
    }

    const midi = TonalNote.get(note).midi;
    return typeof midi === "number" && midi >= 0 && midi <= 127 ? midi : null;
  };

  const sendDevPacket = (
    messageType: number,
    note: number | string,
    velocity: number,
    channel: number
  ) => {
    const midiNote = parseMidiNoteNumber(note);
    if (midiNote === null) {
      console.warn("[emotitoneMidiSim] Invalid note:", note);
      return;
    }

    session.receivePacket(DEV_MIDI_INPUT_ID, [
      messageType | clamp(channel - 1, 0, MIDI_CHANNEL_MASK),
      midiNote,
      clamp(velocity, 0, 127),
    ]);
  };

  const setDevSimulatorTimeout = (callback: () => void, durationMs: number) => {
    const timeout = window.setTimeout(() => {
      devSimulatorTimeouts.delete(timeout);
      callback();
    }, durationMs);
    devSimulatorTimeouts.add(timeout);
  };

  const installDevMidiSimulator = () => {
    if (!shouldExposeDevMidiSimulator()) {
      return;
    }

    const devWindow = window as DevMidiWindow;
    devWindow.__emotitoneMidiSim = {
      noteOn: (note, velocity = 100, channel = 1) => {
        sendDevPacket(MIDI_NOTE_ON, note, velocity, channel);
      },
      noteOff: (note, channel = 1) => {
        sendDevPacket(MIDI_NOTE_OFF, note, 0, channel);
      },
      tap: (note, durationMs = 250, velocity = 100, channel = 1) => {
        devWindow.__emotitoneMidiSim?.noteOn(note, velocity, channel);
        setDevSimulatorTimeout(() => {
          devWindow.__emotitoneMidiSim?.noteOff(note, channel);
        }, durationMs);
      },
      chord: (notes, durationMs = 350, velocity = 100, channel = 1) => {
        notes.forEach((note) => {
          devWindow.__emotitoneMidiSim?.noteOn(note, velocity, channel);
        });
        setDevSimulatorTimeout(() => {
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
    devSimulatorTimeouts.forEach((timeout) => window.clearTimeout(timeout));
    devSimulatorTimeouts.clear();

    if (shouldExposeDevMidiSimulator()) {
      delete (window as DevMidiWindow).__emotitoneMidiSim;
    }
  };

  const handleNotePlayed = (event: Event) => {
    session.notePlayed((event as CustomEvent<MidiNoteEventDetail>).detail);
  };

  const handleNoteReleased = (event: Event) => {
    session.noteReleased((event as CustomEvent<MidiNoteEventDetail>).detail);
  };

  // Keep the console adapter available as soon as setup creates the composable.
  installDevMidiSimulator();

  watch(
    () => [
      dynamicColorConfig.value,
      musicStore.currentKey,
      musicStore.currentMode,
    ] as const,
    ([colors, currentKey, currentMode]) => {
      session.syncPalette(
        colors,
        currentKey as ChromaticNote,
        currentMode
      );
    },
    { deep: true }
  );

  watch(
    () => keyboardDrawerStore.keyboardConfig.mainOctave,
    (mainOctave) => {
      session.syncMainOctave(mainOctave);
    }
  );

  onMounted(() => {
    window.addEventListener("note-played", handleNotePlayed as EventListener);
    window.addEventListener("note-released", handleNoteReleased as EventListener);
    if (session.getState().isSupported) {
      void session.connect();
    }
  });

  onUnmounted(() => {
    window.removeEventListener("note-played", handleNotePlayed as EventListener);
    window.removeEventListener("note-released", handleNoteReleased as EventListener);
    uninstallDevMidiSimulator();
    session.dispose();
  });

  return session;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}
