export interface HeldNotePress {
  pressId: string;
}

export type HeldNoteResolution =
  | { status: "active"; noteId: string }
  | { status: "released"; noteId: string }
  | { status: "failed"; error?: unknown };

export interface HeldNotesOptions<Press extends HeldNotePress> {
  attack: (press: Press) => Promise<string | null>;
  release: (noteId: string, press: Press) => void;
  onPressed?: (press: Press) => void;
  onUnpressed?: (press: Press) => void;
  beforeNoteRelease?: (noteId: string, press: Press) => void;
  afterNoteRelease?: (noteId: string, press: Press) => void;
  onAttackFailure?: (press: Press, error?: unknown) => void;
}

export interface HeldNoteGeneration<Press extends HeldNotePress> {
  press: Press;
  released: boolean;
  noteId?: string;
  completion: Promise<HeldNoteResolution>;
}

export interface KeyboardHeldPress extends HeldNotePress {
  key: string;
  label: string;
  solfegeIndex: number;
  octave: number;
  noteKey: string;
}

export interface SolfegeHeldPress extends HeldNotePress {
  noteKey: string;
  solfegeIndex: number;
  octave: number;
}

export interface MidiHeldPress extends HeldNotePress {
  inputId: string;
  noteName: string;
  solfegeIndex: number;
  octave: number;
  isRoliInput: boolean;
}
