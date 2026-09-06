import type { ChordDisplay, ChordMember } from "@/components/compounds/Chord.vue";
import type { NoteGeometry, NoteSurfaceStyle } from "@/components/primatives/Note.vue";
import type { ChromaticNote, MusicalMode } from "@/types/music";

export type CodeStripNote = "do" | "re" | "mi" | "fa" | "sol" | "la" | "ti";
export type CodeStripGlyph = "syl" | "deg" | "raw";
export type CodeStripDensity = "dense" | "default" | "spaced";
export type CodeStripDurationMode = "stacked" | "bar" | "hidden";

export interface CodeStripNoteToken {
  type: "note";
  note: CodeStripNote;
  text: string;
  glyph?: CodeStripGlyph;
  lit?: boolean;
  accidental?: string;
  duration?: string;
  progress?: number;
  syllable?: string;
  degree?: string;
  rawPitch?: string;
  scaleIndex?: number;
  octave?: number;
  mode?: MusicalMode;
  musicKey?: ChromaticNote;
  surfaceStyle?: NoteSurfaceStyle;
  isAccidental?: boolean | null;
  keyBrightness?: number;
  keySaturation?: number;
}

export interface CodeStripChordToken {
  type: "chord";
  symbol: string;
  members: ChordMember[];
  display?: ChordDisplay;
  geometry?: NoteGeometry;
  duration?: string;
  progress?: number;
  accessibleName?: string;
}

export type CodeStripToken =
  | CodeStripNoteToken
  | CodeStripChordToken
  | { type: "rest"; duration?: string; progress?: number }
  | { type: "bracket"; text: "{" | "}" }
  | { type: "separator"; text?: "," | "/" };

