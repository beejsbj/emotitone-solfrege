import type { ChromaticNote, MusicalMode } from "@/types/music";
import type { DynamicColorConfig } from "@/types/visual";

export interface MidiSessionState {
  isSupported: boolean;
  isConnecting: boolean;
  isListening: boolean;
  connectedInputs: string[];
  connectedOutputs: string[];
  syncedOutput: string | null;
  lastError: string | null;
}

export type MidiMessageHandler = (data: ArrayLike<number>) => void;
export type MidiPortStateChangeHandler = () => void;
export type MidiTimeoutHandle = ReturnType<typeof globalThis.setTimeout>;

export interface MidiInputPortAdapter {
  readonly id: string;
  readonly name: string | null;
  readonly state: string;
  setMessageHandler(handler: MidiMessageHandler | null): void;
}

export interface MidiOutputPortAdapter {
  readonly id: string;
  readonly name: string | null;
  readonly state: string;
  send(message: number[], timestamp?: number): void;
}

export interface MidiAccessAdapter {
  getInputs(): Iterable<MidiInputPortAdapter>;
  getOutputs(): Iterable<MidiOutputPortAdapter>;
  setStateChangeHandler(handler: MidiPortStateChangeHandler | null): void;
}

export interface MidiNoteEventDetail {
  source?: string;
  mirrorMidi?: boolean;
  duration?: string;
  durationMs?: number;
  noteId?: string;
  noteName?: string;
  octave?: number;
  solfegeIndex?: number;
}

export interface MidiSessionSyncSettings {
  dynamicColorConfig: DynamicColorConfig;
  currentKey: ChromaticNote;
  currentMode: MusicalMode;
  mainOctave: number;
}

export interface MidiSessionEffects {
  attackNote(solfegeIndex: number, octave: number): Promise<string | null>;
  releaseNote(noteId: string): void;
  parseNoteInput(note: string): { solfegeIndex: number; octave: number } | null;
  getNoteName(solfegeIndex: number, octave: number): string;
  isPressActive(pressId: string): boolean;
  pressKey(pressId: string, noteKey: string): void;
  releaseKey(pressId: string): void;
  activateVisualNote(activationId: string, noteKey: string): void;
  releaseVisualNote(activationId: string): void;
  clearVisualNotes(): void;
  stateChanged(state: MidiSessionState): void;
}

export interface CreateMidiSessionOptions {
  requestAccess?: () => Promise<MidiAccessAdapter>;
  effects: MidiSessionEffects;
  sync: MidiSessionSyncSettings;
}

export interface MidiSession {
  getState(): MidiSessionState;
  connect(): Promise<void>;
  disconnect(): void;
  receivePacket(inputId: string, data: ArrayLike<number>): void;
  notePlayed(detail?: MidiNoteEventDetail): void;
  noteReleased(detail?: MidiNoteEventDetail): void;
  syncPalette(
    dynamicColorConfig: DynamicColorConfig,
    currentKey: ChromaticNote,
    currentMode: MusicalMode
  ): void;
  syncMainOctave(mainOctave: number): void;
  setInputEnabled(enabled: boolean): void;
  dispose(): void;
}

export interface DevMidiSimulator {
  noteOn(note: number | string, velocity?: number, channel?: number): void;
  noteOff(note: number | string, channel?: number): void;
  tap(
    note: number | string,
    durationMs?: number,
    velocity?: number,
    channel?: number
  ): void;
  chord(
    notes: Array<number | string>,
    durationMs?: number,
    velocity?: number,
    channel?: number
  ): void;
  help: string;
}

export type DevMidiWindow = Window & typeof globalThis & {
  __emotitoneMidiSim?: DevMidiSimulator;
};
