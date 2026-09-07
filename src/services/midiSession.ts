import { Note as TonalNote } from "@tonaljs/tonal";
import { createHeldNotes } from "@/composables/heldNotes";
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
import type { MidiHeldPress } from "@/types/heldNotes";
import type {
  CreateMidiSessionOptions,
  MidiAccessAdapter,
  MidiInputPortAdapter,
  MidiNoteEventDetail,
  MidiOutputPortAdapter,
  MidiSession,
  MidiSessionState,
} from "@/types/midi";

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
const DEFAULT_MIRROR_DURATION_MS = 500;

type TimeoutHandle = ReturnType<typeof globalThis.setTimeout>;

export function createMidiSession(
  options: CreateMidiSessionOptions
): MidiSession {
  const { effects } = options;
  let state: MidiSessionState = {
    isSupported: Boolean(options.requestAccess),
    isConnecting: false,
    isListening: false,
    connectedInputs: [],
    connectedOutputs: [],
    syncedOutput: null,
    lastError: null,
  };
  let syncSettings = { ...options.sync };
  let midiAccess: MidiAccessAdapter | null = null;
  let selectedRoliOutput: MidiOutputPortAdapter | null = null;
  let connectedInputs = new Map<string, MidiInputPortAdapter>();
  let roliInputIds = new Set<string>();
  let pendingConnection: Promise<void> | null = null;
  let connectionGeneration = 0;
  let playbackActivationSequence = 0;
  let inputEnabled = true;
  let disposed = false;

  const pendingInputNoteOns = new Map<string, number>();
  const pendingInputNoteOffs = new Set<string>();
  const mirroredNoteTimeouts = new Set<TimeoutHandle>();
  const mirroredEventNotes = new Map<string, number>();
  const visualNoteTimeouts = new Map<string, TimeoutHandle>();

  const heldNotes = createHeldNotes<MidiHeldPress>({
    attack: ({ solfegeIndex, octave }) =>
      effects.attackNote(solfegeIndex, octave),
    release: (noteId) => {
      effects.releaseNote(noteId);
    },
    onPressed: ({ pressId, noteName, solfegeIndex, octave, isRoliInput }) => {
      effects.pressKey(pressId, `${solfegeIndex}_${octave}`);
      if (isRoliInput) {
        incrementPendingNoteCount(pendingInputNoteOns, noteName);
      }
    },
    onUnpressed: ({ pressId }) => {
      effects.releaseKey(pressId);
    },
    beforeNoteRelease: (noteId, { isRoliInput }) => {
      if (isRoliInput && !disposed) {
        pendingInputNoteOffs.add(noteId);
      }
    },
    onAttackFailure: ({ noteName, isRoliInput }) => {
      if (isRoliInput) {
        consumePendingNoteCount(pendingInputNoteOns, noteName);
      }
    },
  });

  const publishState = (updates: Partial<MidiSessionState> = {}) => {
    const nextState: MidiSessionState = {
      ...state,
      ...updates,
      connectedInputs: updates.connectedInputs
        ? [...updates.connectedInputs]
        : [...state.connectedInputs],
      connectedOutputs: updates.connectedOutputs
        ? [...updates.connectedOutputs]
        : [...state.connectedOutputs],
    };

    if (statesEqual(state, nextState)) {
      return;
    }

    state = nextState;
    effects.stateChanged(copyState(state));
  };

  const sendToOutput = (
    output: MidiOutputPortAdapter,
    message: number[],
    timestamp?: number
  ) => {
    output.send(message, timestamp);
  };

  const clearMirroredOutputState = () => {
    mirroredNoteTimeouts.forEach((timeoutId) => {
      globalThis.clearTimeout(timeoutId);
    });
    mirroredNoteTimeouts.clear();
    mirroredEventNotes.clear();
  };

  const flushOutput = (output: MidiOutputPortAdapter | null) => {
    if (output) {
      buildRoliAllNotesOffMessages(ROLI_SYNC_CONTROL_CHANNEL).forEach(
        (message) => sendToOutput(output, message)
      );
    }

    clearMirroredOutputState();
  };

  const sendPalette = () => {
    const output = selectedRoliOutput;
    if (!output) {
      return;
    }

    const messages = buildRoliPaletteUpdateMessages(
      syncSettings.dynamicColorConfig,
      syncSettings.currentKey,
      syncSettings.currentMode
    );
    const now = typeof performance === "undefined"
      ? Date.now()
      : performance.now();

    messages.forEach((message, index) => {
      sendToOutput(output, message, now + index);
    });
  };

  const sendMainOctave = () => {
    if (!selectedRoliOutput) {
      return;
    }

    sendToOutput(
      selectedRoliOutput,
      buildRoliMainOctaveMessage(syncSettings.mainOctave)
    );
  };

  const releaseInputNotes = (inputId?: string) => {
    heldNotes.releaseWhere((press) => !inputId || press.inputId === inputId);
  };

  const reconcileInputs = () => {
    const nextInputs = new Map<string, MidiInputPortAdapter>();

    if (midiAccess) {
      for (const input of midiAccess.getInputs()) {
        if (input.state === "connected") {
          nextInputs.set(input.id, input);
        }
      }
    }

    for (const [inputId, previousInput] of connectedInputs) {
      if (nextInputs.get(inputId) !== previousInput) {
        previousInput.setMessageHandler(null);
        releaseInputNotes(inputId);
      }
    }

    connectedInputs = nextInputs;
    roliInputIds = new Set(
      Array.from(nextInputs.values())
        .filter((input) => isRoliMidiPortName(input.name))
        .map((input) => input.id)
    );

    for (const [inputId, input] of nextInputs) {
      input.setMessageHandler((data) => {
        if (connectedInputs.get(inputId) === input) {
          receivePacket(inputId, data);
        }
      });
    }

    return Array.from(nextInputs.values(), (input) => input.name || "MIDI input");
  };

  const reconcileOutputs = () => {
    const outputs = midiAccess
      ? Array.from(midiAccess.getOutputs()).filter(
          (output) => output.state === "connected"
        )
      : [];
    const nextRoliOutput = pickPreferredRoliOutput(outputs);
    const outputChanged = nextRoliOutput !== selectedRoliOutput;

    if (outputChanged) {
      flushOutput(selectedRoliOutput);
      selectedRoliOutput = nextRoliOutput;

      if (selectedRoliOutput) {
        sendPalette();
        sendMainOctave();
      }
    }

    return {
      connectedOutputs: outputs.map((output) => output.name || "MIDI output"),
      syncedOutput: selectedRoliOutput?.name || null,
    };
  };

  const reconcilePorts = (updates: Partial<MidiSessionState> = {}) => {
    const connectedInputNames = reconcileInputs();
    const outputState = reconcileOutputs();

    publishState({
      ...updates,
      connectedInputs: connectedInputNames,
      ...outputState,
    });
  };

  const cleanupConnection = () => {
    releaseInputNotes();

    for (const input of connectedInputs.values()) {
      input.setMessageHandler(null);
    }
    connectedInputs.clear();
    roliInputIds.clear();

    if (midiAccess) {
      midiAccess.setStateChangeHandler(null);
    }
    midiAccess = null;

    flushOutput(selectedRoliOutput);
    selectedRoliOutput = null;
  };

  const connect = async () => {
    if (disposed || !options.requestAccess) {
      return;
    }

    if (midiAccess) {
      reconcilePorts({
        isConnecting: false,
        isListening: true,
        lastError: null,
      });
      return;
    }

    if (pendingConnection) {
      return pendingConnection;
    }

    const generation = ++connectionGeneration;
    publishState({
      isConnecting: true,
      isListening: false,
      connectedInputs: [],
      connectedOutputs: [],
      syncedOutput: null,
      lastError: null,
    });

    let connection!: Promise<void>;
    connection = Promise.resolve()
      .then(() => options.requestAccess!())
      .then((access) => {
        if (disposed || generation !== connectionGeneration) {
          return;
        }

        midiAccess = access;
        access.setStateChangeHandler(() => {
          if (
            !disposed
            && generation === connectionGeneration
            && midiAccess === access
          ) {
            reconcilePorts();
          }
        });
        reconcilePorts({
          isConnecting: false,
          isListening: true,
          lastError: null,
        });
      })
      .catch((error: unknown) => {
        if (disposed || generation !== connectionGeneration) {
          return;
        }

        cleanupConnection();
        publishState({
          isConnecting: false,
          isListening: false,
          connectedInputs: [],
          connectedOutputs: [],
          syncedOutput: null,
          lastError: error instanceof Error
            ? error.message
            : "MIDI access was not granted.",
        });
      })
      .finally(() => {
        if (pendingConnection === connection) {
          pendingConnection = null;
        }
      });

    pendingConnection = connection;
    return connection;
  };

  const disconnect = () => {
    if (disposed) {
      return;
    }

    connectionGeneration += 1;
    pendingConnection = null;
    cleanupConnection();
    publishState({
      isConnecting: false,
      isListening: false,
      connectedInputs: [],
      connectedOutputs: [],
      syncedOutput: null,
      lastError: null,
    });
  };

  const receivePacket = (inputId: string, rawData: ArrayLike<number>) => {
    if (disposed) {
      return;
    }

    const data = Array.from(rawData).slice(0, 3);
    if (data.length < 2) {
      return;
    }

    const [status, noteNumber, velocity = 0] = data;
    if (
      !isMidiByte(status)
      || !isMidiDataByte(noteNumber)
      || !isMidiDataByte(velocity)
    ) {
      return;
    }

    const messageType = status & MIDI_STATUS_MASK;
    const channel = (status & MIDI_CHANNEL_MASK) + 1;
    const pressId = `midi:${inputId}:${channel}:${noteNumber}`;

    if (messageType === MIDI_NOTE_ON && velocity > 0) {
      if (
        !inputEnabled
        || heldNotes.isHeld(pressId)
        || effects.isPressActive(pressId)
      ) {
        return;
      }

      const noteName = midiNoteNumberToName(noteNumber);
      const parsed = resolvePlayableNote(noteNumber, noteName, options);
      if (!parsed) {
        return;
      }

      void heldNotes.press({
        pressId,
        inputId,
        noteName,
        solfegeIndex: parsed.solfegeIndex,
        octave: parsed.octave,
        isRoliInput: roliInputIds.has(inputId),
      });
      return;
    }

    if (
      messageType === MIDI_NOTE_OFF
      || (messageType === MIDI_NOTE_ON && velocity === 0)
    ) {
      heldNotes.release(pressId);
    }
  };

  const setVisualNoteTimeout = (activationId: string, durationMs: number) => {
    const existingTimeout = visualNoteTimeouts.get(activationId);
    if (existingTimeout !== undefined) {
      globalThis.clearTimeout(existingTimeout);
    }

    const timeout = globalThis.setTimeout(() => {
      effects.releaseVisualNote(activationId);
      visualNoteTimeouts.delete(activationId);
    }, durationMs);
    visualNoteTimeouts.set(activationId, timeout);
  };

  const activateVisualNote = (detail?: MidiNoteEventDetail) => {
    const noteKey = resolveVisualNoteKey(detail, options);
    if (!noteKey) {
      return;
    }

    const activationId = detail?.noteId
      || `playback:${noteKey}:${++playbackActivationSequence}`;
    effects.activateVisualNote(activationId, noteKey);

    if (!detail?.noteId) {
      setVisualNoteTimeout(activationId, resolveEventDurationMs(detail));
    }
  };

  const releaseVisualNote = (detail?: MidiNoteEventDetail) => {
    if (!detail?.noteId) {
      return;
    }

    const timeout = visualNoteTimeouts.get(detail.noteId);
    if (timeout !== undefined) {
      globalThis.clearTimeout(timeout);
      visualNoteTimeouts.delete(detail.noteId);
    }
    effects.releaseVisualNote(detail.noteId);
  };

  const notePlayed = (detail?: MidiNoteEventDetail) => {
    if (disposed) {
      return;
    }

    activateVisualNote(detail);
    if (detail?.mirrorMidi === false) {
      return;
    }

    if (
      detail?.noteName
      && consumePendingNoteCount(pendingInputNoteOns, detail.noteName)
    ) {
      return;
    }

    if (!selectedRoliOutput) {
      return;
    }

    const midiNote = resolveMirroredMidiNote(detail, options);
    if (midiNote === null) {
      return;
    }

    if (detail?.noteId) {
      mirroredEventNotes.set(detail.noteId, midiNote);
    }
    sendToOutput(selectedRoliOutput, buildRoliNoteOnMessage(midiNote));

    if (detail?.noteId) {
      return;
    }

    const timeout = globalThis.setTimeout(() => {
      if (selectedRoliOutput) {
        sendToOutput(selectedRoliOutput, buildRoliNoteOffMessage(midiNote));
      }
      mirroredNoteTimeouts.delete(timeout);
    }, resolveEventDurationMs(detail));
    mirroredNoteTimeouts.add(timeout);
  };

  const noteReleased = (detail?: MidiNoteEventDetail) => {
    if (disposed) {
      return;
    }

    releaseVisualNote(detail);
    if (detail?.mirrorMidi === false) {
      return;
    }

    if (detail?.noteId && pendingInputNoteOffs.delete(detail.noteId)) {
      return;
    }

    if (!selectedRoliOutput) {
      return;
    }

    const midiNote = (
      detail?.noteId ? mirroredEventNotes.get(detail.noteId) : undefined
    ) ?? resolveMirroredMidiNote(detail, options);
    if (midiNote === null || midiNote === undefined) {
      return;
    }

    if (detail?.noteId) {
      mirroredEventNotes.delete(detail.noteId);
    }
    sendToOutput(selectedRoliOutput, buildRoliNoteOffMessage(midiNote));
  };

  const syncPalette: MidiSession["syncPalette"] = (
    dynamicColorConfig,
    currentKey,
    currentMode
  ) => {
    if (disposed) {
      return;
    }

    syncSettings = {
      ...syncSettings,
      dynamicColorConfig,
      currentKey,
      currentMode,
    };
    sendPalette();
  };

  const syncMainOctave = (mainOctave: number) => {
    if (disposed) {
      return;
    }

    syncSettings = { ...syncSettings, mainOctave };
    sendMainOctave();
  };

  const setInputEnabled = (enabled: boolean) => {
    if (disposed || inputEnabled === enabled) {
      return;
    }

    inputEnabled = enabled;
    if (!enabled) {
      releaseInputNotes();
    }
  };

  const dispose = () => {
    if (disposed) {
      return;
    }

    connectionGeneration += 1;
    pendingConnection = null;
    cleanupConnection();
    disposed = true;

    visualNoteTimeouts.forEach((timeout) => {
      globalThis.clearTimeout(timeout);
    });
    visualNoteTimeouts.clear();
    pendingInputNoteOns.clear();
    pendingInputNoteOffs.clear();
    effects.clearVisualNotes();
    publishState({
      isConnecting: false,
      isListening: false,
      connectedInputs: [],
      connectedOutputs: [],
      syncedOutput: null,
      lastError: null,
    });
  };

  effects.stateChanged(copyState(state));

  return {
    getState: () => copyState(state),
    connect,
    disconnect,
    receivePacket,
    notePlayed,
    noteReleased,
    syncPalette,
    syncMainOctave,
    setInputEnabled,
    dispose,
  };
}

function copyState(state: MidiSessionState): MidiSessionState {
  return {
    ...state,
    connectedInputs: [...state.connectedInputs],
    connectedOutputs: [...state.connectedOutputs],
  };
}

function statesEqual(left: MidiSessionState, right: MidiSessionState) {
  return (
    left.isSupported === right.isSupported
    && left.isConnecting === right.isConnecting
    && left.isListening === right.isListening
    && arraysEqual(left.connectedInputs, right.connectedInputs)
    && arraysEqual(left.connectedOutputs, right.connectedOutputs)
    && left.syncedOutput === right.syncedOutput
    && left.lastError === right.lastError
  );
}

function arraysEqual(left: string[], right: string[]) {
  return (
    left.length === right.length
    && left.every((value, index) => value === right[index])
  );
}

function isMidiByte(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0xff;
}

function isMidiDataByte(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0x7f;
}

function midiNoteNumberToName(noteNumber: number) {
  const noteName = MIDI_NOTE_NAMES[noteNumber % 12];
  const octave = Math.floor(noteNumber / 12) - 1;
  return `${noteName}${octave}`;
}

function resolvePlayableNote(
  noteNumber: number,
  noteName: string,
  options: CreateMidiSessionOptions
) {
  const parsed = options.effects.parseNoteInput(noteName);
  if (!parsed) {
    return null;
  }

  return options.effects.getNoteName(parsed.solfegeIndex, parsed.octave)
    === midiNoteNumberToName(noteNumber)
    ? parsed
    : null;
}

function resolveVisualNoteKey(
  detail: MidiNoteEventDetail | undefined,
  options: CreateMidiSessionOptions
) {
  if (
    typeof detail?.solfegeIndex === "number"
    && typeof detail.octave === "number"
  ) {
    return `${detail.solfegeIndex}_${detail.octave}`;
  }

  if (!detail?.noteName) {
    return null;
  }

  const parsed = options.effects.parseNoteInput(detail.noteName);
  return parsed ? `${parsed.solfegeIndex}_${parsed.octave}` : null;
}

function resolveMirroredMidiNote(
  detail: MidiNoteEventDetail | undefined,
  options: CreateMidiSessionOptions
) {
  if (
    typeof detail?.solfegeIndex === "number"
    && typeof detail.octave === "number"
  ) {
    return TonalNote.get(
      options.effects.getNoteName(detail.solfegeIndex, detail.octave)
    ).midi ?? null;
  }

  return detail?.noteName ? TonalNote.get(detail.noteName).midi ?? null : null;
}

function resolveEventDurationMs(detail?: MidiNoteEventDetail) {
  if (typeof detail?.durationMs === "number") {
    return detail.durationMs;
  }

  const match = detail?.duration?.match(/^(\d+)n$/);
  if (!match) {
    return DEFAULT_MIRROR_DURATION_MS;
  }

  const noteValue = Number.parseInt(match[1], 10);
  return ((60 / 120) * 4 * 1000) / noteValue;
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
