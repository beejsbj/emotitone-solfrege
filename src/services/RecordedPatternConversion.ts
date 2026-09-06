import { Note as TonalNote } from "@tonaljs/tonal";
import type { ChordMember } from "@/components/compounds/Chord.vue";
import type { NoteSurfaceStyle } from "@/components/primatives/Note.vue";
import type { CodeStripNote, CodeStripToken } from "@/components/uniques/CodeStrip/types";
import { getScaleForMode, getSolfegeNameForMode, normalizeScaleIndex } from "@/data";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import type { LogNote, PatternNote } from "@/types/patterns";
import type { CodeStripConfig, KeyboardConfig } from "@/types/visual";

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

interface IndexedNote {
  note: PatternNote;
  inputOrder: number;
}

interface NoteSpan extends IndexedNote {
  start: number;
  end: number;
}

interface ScheduledRest {
  kind: "rest";
  start: number;
  end: number;
}

interface ScheduledSound {
  kind: "sound";
  notes: NoteSpan[];
  start: number;
  end: number;
}

type ScheduledEvent = ScheduledRest | ScheduledSound;

const DEFAULT_SOURCE_CONFIG: RecordedSourceConfig = {
  bpm: 120,
  sourceBpm: 120,
  beatsPerBar: 4,
  notationType: "absolute",
  precision: 4,
  sound: "sine",
};

export const DEFAULT_SOURCE_BPM = DEFAULT_SOURCE_CONFIG.sourceBpm;

const OVERLAP_EPSILON_MS = 1;
const NOTE_NAMES: CodeStripNote[] = ["do", "re", "mi", "fa", "sol", "la", "ti"];

/**
 * Converts one recording into its initial editable Strudel document and, when
 * requested, the identity metadata used to decorate that same document.
 * Timing is interpreted once into a shared schedule before either form renders.
 */
export function convertRecordedPattern(
  input: RecordedPatternCodeStripInput,
): RecordedPatternWithCodeStrip;
export function convertRecordedPattern(
  input: RecordedPatternSourceInput,
): RecordedPatternSource;
export function convertRecordedPattern(
  input: RecordedPatternCodeStripInput | RecordedPatternSourceInput,
): RecordedPatternWithCodeStrip | RecordedPatternSource {
  const sourceConfig = { ...DEFAULT_SOURCE_CONFIG, ...input.source };
  const schedule = scheduleRecording(input.notes);
  const source = renderSource(schedule, sourceConfig);

  if (!input.codeStrip) {
    return { source };
  }

  return {
    source,
    tokens: renderCodeStripTokens(schedule, sourceConfig, input.codeStrip),
  };
}

function scheduleRecording(notes: PatternNote[]): ScheduledEvent[] {
  if (!notes.length) return [];

  const sorted = notes
    .map((note, inputOrder): IndexedNote => ({ note, inputOrder }))
    .sort(
      (left, right) =>
        left.note.pressTime - right.note.pressTime || left.inputOrder - right.inputOrder,
    );
  const schedule: ScheduledEvent[] = [];
  let timelineCursor = sorted[0].note.pressTime;
  let scheduleCursor = 0;
  let index = 0;

  while (index < sorted.length) {
    const block = [sorted[index]];
    const blockStart = sorted[index].note.pressTime;
    let blockEnd = noteEnd(sorted[index].note);
    let nextIndex = index + 1;

    while (nextIndex < sorted.length) {
      const next = sorted[nextIndex];
      if (next.note.pressTime >= blockEnd - OVERLAP_EPSILON_MS) break;

      block.push(next);
      blockEnd = Math.max(blockEnd, noteEnd(next.note));
      nextIndex++;
    }

    const gap = blockStart - timelineCursor;
    if (gap > OVERLAP_EPSILON_MS) {
      schedule.push({ kind: "rest", start: scheduleCursor, end: scheduleCursor + gap });
      scheduleCursor += gap;
    }

    const blockDuration = Math.max(1, blockEnd - blockStart);
    schedule.push({
      kind: "sound",
      notes: block.map(({ note, inputOrder }) => ({
        note,
        inputOrder,
        start: scheduleCursor + Math.max(0, note.pressTime - blockStart),
        end: scheduleCursor + Math.max(1, noteEnd(note) - blockStart),
      })),
      start: scheduleCursor,
      end: scheduleCursor + blockDuration,
    });

    timelineCursor = blockEnd;
    scheduleCursor += blockDuration;
    index = nextIndex;
  }

  return schedule;
}

function renderSource(schedule: ScheduledEvent[], config: RecordedSourceConfig) {
  if (!schedule.length) return "";

  const notes = schedule
    .flatMap((event) => event.kind === "sound" ? event.notes : [])
    .sort(sourceNoteOrder);
  const relative = config.notationType === "relative" &&
    notes.every((span) => relativeNoteValue(span.note, notes, config) != null);
  const barMs = barLengthMs(config);
  const tokens = schedule.map((event) => {
    if (event.kind === "rest") {
      return `~${toAt(event.end - event.start, barMs, config.precision)}`;
    }

    if (event.notes.length === 1) {
      const span = event.notes[0];
      return `${sourceNoteValue(span.note, notes, config, relative)}${toAt(
        span.end - span.start,
        barMs,
        config.precision,
      )}`;
    }

    return renderOverlapSource(event, notes, config, relative, barMs);
  });
  const inner = `[ ${tokens.join(" ")} ]`;
  const cpmExpression = `${config.bpm} / ${config.beatsPerBar}`;

  if (relative) {
    const first = notes[0].note as PatternNote & Partial<Pick<LogNote, "key" | "mode">>;
    const scaleOctave = config.scaleOctave ??
      (Number.isFinite(first.octave) ? first.octave : 4);
    const scale = `${config.scaleKey ?? first.key ?? "C"}${scaleOctave}:${config.scaleMode ?? first.mode ?? "major"}`;
    return `\`<\n${inner}\n>\`.as("n").scale("${scale}").sound("${config.sound}").cpm(${cpmExpression})`;
  }

  return `\`<\n${inner}\n>\`.as("note").sound("${config.sound}").cpm(${cpmExpression})`;
}

function renderOverlapSource(
  event: ScheduledSound,
  allNotes: NoteSpan[],
  config: RecordedSourceConfig,
  relative: boolean,
  barMs: number,
) {
  const lanes = buildLanes([...event.notes].sort(sourceNoteOrder));
  const laneStrings = lanes.map((lane) => {
    if (
      lane.length === 1 &&
      lane[0].start - event.start <= OVERLAP_EPSILON_MS &&
      event.end - lane[0].end <= OVERLAP_EPSILON_MS
    ) {
      return sourceNoteValue(lane[0].note, allNotes, config, relative);
    }

    const tokens: string[] = [];
    let cursor = event.start;
    for (const span of lane) {
      const gap = span.start - cursor;
      if (gap > OVERLAP_EPSILON_MS) {
        tokens.push(`~${toAt(gap, barMs, config.precision)}`);
      }
      tokens.push(`${sourceNoteValue(span.note, allNotes, config, relative)}${toAt(
        span.end - span.start,
        barMs,
        config.precision,
      )}`);
      cursor = span.end;
    }

    const trailingGap = event.end - cursor;
    if (trailingGap > OVERLAP_EPSILON_MS) {
      tokens.push(`~${toAt(trailingGap, barMs, config.precision)}`);
    }
    return tokens.join(" ");
  });

  return `{${laneStrings.join(", ")}}${toAt(
    event.end - event.start,
    barMs,
    config.precision,
  )}`;
}

function buildLanes(notes: NoteSpan[]) {
  const lanes: NoteSpan[][] = [];
  for (const note of notes) {
    const lane = lanes.find((candidate) =>
      candidate[candidate.length - 1].end <= note.start + OVERLAP_EPSILON_MS
    );
    if (lane) lane.push(note);
    else lanes.push([note]);
  }
  return lanes;
}

function renderCodeStripTokens(
  schedule: ScheduledEvent[],
  sourceConfig: RecordedSourceConfig,
  config: RecordedCodeStripConfig,
) {
  const barMs = barLengthMs(sourceConfig);
  return schedule.map((event): CodeStripToken => {
    const duration = formatDuration(event.end - event.start, barMs);
    if (event.kind === "rest") return { type: "rest", duration };
    if (event.notes.length === 1) return noteToken(event.notes[0], duration, config);

    const pressOrdered = [...event.notes].sort(
      (left, right) =>
        left.note.pressTime - right.note.pressTime || left.inputOrder - right.inputOrder,
    );
    const voicingRanks = new Map(
      [...event.notes]
        .sort((left, right) =>
          pitchRank(left.note) - pitchRank(right.note) || left.inputOrder - right.inputOrder
        )
        .map((span, voicingOrder) => [span.note.id, voicingOrder]),
    );
    const pressRanks = new Map(
      pressOrdered.map((span, pressOrder) => [span.note.id, pressOrder]),
    );
    const members = pressOrdered.map((span): ChordMember => ({
      id: span.note.id,
      syllable: solfegeLabel(span.note, config.mode),
      degree: degreeLabel(span.note, config.mode),
      rawPitch: span.note.note,
      scaleIndex: span.note.scaleIndex,
      octave: span.note.octave,
      mode: config.mode,
      musicKey: config.musicKey,
      surfaceStyle: noteSurfaceStyle(config.surfaceStyle),
      accidental: isAccidental(span.note.note),
      keyBrightness: config.keyBrightness,
      keySaturation: config.keySaturation,
      voicingOrder: voicingRanks.get(span.note.id),
      pressOrder: pressRanks.get(span.note.id),
    }));

    return {
      type: "chord",
      symbol: "",
      display: "notes",
      members,
      duration,
      accessibleName: `Overlapping notes: ${pressOrdered.map((span) => span.note.note).join(", ")}`,
    };
  });
}

function noteToken(
  span: NoteSpan,
  duration: string,
  config: RecordedCodeStripConfig,
): CodeStripToken {
  const note = span.note;
  const normalizedIndex = normalizeScaleIndex(config.mode, note.scaleIndex);
  const codeStripNote = NOTE_NAMES[positiveModulo(normalizedIndex, NOTE_NAMES.length)];
  const syllable = solfegeLabel(note, config.mode);
  const degree = degreeLabel(note, config.mode);
  const glyph = config.notation === "note" ? "raw" : config.notation === "degree" ? "deg" : "syl";

  return {
    type: "note",
    note: codeStripNote,
    text: glyph === "raw" ? note.note : glyph === "deg" ? degree : syllable,
    glyph,
    duration,
    syllable,
    degree,
    rawPitch: note.note,
    scaleIndex: note.scaleIndex,
    octave: note.octave,
    mode: config.mode,
    musicKey: config.musicKey,
    surfaceStyle: noteSurfaceStyle(config.surfaceStyle),
    isAccidental: isAccidental(note.note),
    keyBrightness: config.keyBrightness,
    keySaturation: config.keySaturation,
  };
}

function sourceNoteValue(
  note: PatternNote,
  allNotes: NoteSpan[],
  config: RecordedSourceConfig,
  relative: boolean,
) {
  return relative ? String(relativeNoteValue(note, allNotes, config)) : note.note;
}

function relativeNoteValue(
  note: PatternNote,
  allNotes: NoteSpan[],
  config: RecordedSourceConfig,
) {
  const contextual = note as PatternNote & Partial<Pick<LogNote, "key" | "mode">>;
  const first = allNotes[0]?.note as
    | (PatternNote & Partial<Pick<LogNote, "key" | "mode">>)
    | undefined;
  const mode = (config.scaleMode ?? contextual.mode ?? "major") as MusicalMode;
  const scale = getScaleForMode(mode);
  const degree = normalizeScaleIndex(mode, note.scaleIndex);
  const scaleOctave = config.scaleOctave ?? first?.octave ?? 4;
  const scaleKey = config.scaleKey ?? first?.key ?? "C";
  const rootMidi = TonalNote.midi(`${scaleKey}${scaleOctave}`);
  const noteMidi = TonalNote.midi(note.note);
  const degreeSemitones = scale.intervals[degree];

  if (rootMidi == null || noteMidi == null || degreeSemitones == null) return null;
  const octaveCycles = (noteMidi - (rootMidi + degreeSemitones)) / 12;
  const roundedCycles = Math.round(octaveCycles);
  return Math.abs(octaveCycles - roundedCycles) > Number.EPSILON * 16
    ? null
    : degree + roundedCycles * scale.degreeCount;
}

function sourceNoteOrder(left: NoteSpan, right: NoteSpan) {
  return left.note.pressTime - right.note.pressTime ||
    left.note.octave - right.note.octave ||
    left.note.scaleIndex - right.note.scaleIndex ||
    left.note.note.localeCompare(right.note.note);
}

function barLengthMs(config: RecordedSourceConfig) {
  return (60000 / config.sourceBpm) * config.beatsPerBar;
}

function toAt(ms: number, barMs: number, precision: number) {
  const ratio = Number.parseFloat((ms / barMs).toFixed(precision));
  return ratio === 1 ? "" : `@${ratio}`;
}

function formatDuration(durationMs: number, barMs: number) {
  const safeBarMs = Number.isFinite(barMs) && barMs > 0 ? barMs : 2000;
  const ratio = Number.parseFloat((Math.max(1, durationMs) / safeBarMs).toFixed(4));
  return `@${ratio}`;
}

function noteEnd(note: PatternNote) {
  return note.pressTime + Math.max(1, note.duration);
}

function solfegeLabel(note: PatternNote, mode: MusicalMode) {
  return getSolfegeNameForMode(mode, note.scaleIndex);
}

function degreeLabel(note: PatternNote, mode: MusicalMode) {
  return String(normalizeScaleIndex(mode, note.scaleIndex) + 1);
}

function pitchRank(note: PatternNote) {
  if (typeof note.frequency === "number" && Number.isFinite(note.frequency)) {
    return note.frequency;
  }

  const match = note.note.match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!match) return note.octave * 12 + note.scaleIndex;
  const [, rawPitchClass, accidental, rawOctave] = match;
  const base = ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as const)[
    rawPitchClass.toUpperCase() as "A" | "B" | "C" | "D" | "E" | "F" | "G"
  ];
  return Number(rawOctave) * 12 + base + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0);
}

function isAccidental(note: string) {
  return /[#b♯♭]/.test(note);
}

function noteSurfaceStyle(surfaceStyle: KeyboardConfig["surfaceStyle"]): NoteSurfaceStyle {
  return surfaceStyle === "monochrome" ? "monochrome" : "colored";
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}
