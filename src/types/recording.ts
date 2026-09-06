import type { CodeStripToken } from "@/components/uniques/CodeStrip/types";
import type { ChromaticNote, MusicalMode } from "./music";
import type { PatternNote } from "./patterns";
import type { CodeStripConfig, KeyboardConfig } from "./visual";

export interface RecordedSourceConfig {
  /** Playback tempo in BPM. Used by the live runtime, not @ duration sizing. */
  bpm: number;
  /** Capture tempo used to convert milliseconds into Strudel cycle fractions. */
  sourceBpm: number;
  beatsPerBar: number;
  notationType: "absolute" | "relative";
  precision: number;
  sound: string;
  scaleKey?: string;
  scaleMode?: MusicalMode;
  scaleOctave?: number;
}

export interface RecordedCodeStripConfig {
  mode: MusicalMode;
  musicKey: ChromaticNote;
  notation: CodeStripConfig["notation"];
  surfaceStyle: KeyboardConfig["surfaceStyle"];
  keyBrightness: number;
  keySaturation: number;
}

interface RecordedPatternConversionBase {
  notes: PatternNote[];
  source?: Partial<RecordedSourceConfig>;
}

export interface RecordedPatternSourceInput extends RecordedPatternConversionBase {
  codeStrip?: undefined;
}

export interface RecordedPatternCodeStripInput extends RecordedPatternConversionBase {
  codeStrip: RecordedCodeStripConfig;
}

export interface RecordedPatternSource {
  source: string;
}

export interface RecordedPatternWithCodeStrip extends RecordedPatternSource {
  tokens: CodeStripToken[];
}

export interface IndexedRecordedNote {
  note: PatternNote;
  inputOrder: number;
}

export interface RecordedNoteSpan extends IndexedRecordedNote {
  start: number;
  end: number;
}

export interface ScheduledRecordedRest {
  kind: "rest";
  start: number;
  end: number;
}

export interface ScheduledRecordedSound {
  kind: "sound";
  notes: RecordedNoteSpan[];
  start: number;
  end: number;
}

export type ScheduledRecordedEvent = ScheduledRecordedRest | ScheduledRecordedSound;
