import { getSolfegeNameForMode, normalizeScaleIndex } from "@/data";
import type { ChordMember } from "@/components/compounds/Chord.vue";
import type { NoteSurfaceStyle } from "@/components/primatives/Note.vue";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import type { PatternNote } from "@/types/patterns";
import type { KeyboardConfig, CodeStripConfig } from "@/types/visual";
import { getRestGapThresholdMs } from "@/services/StrudelNotation";
import type { CodeStripNote, CodeStripToken } from "./types";

const OVERLAP_EPSILON_MS = 1;
const NOTE_NAMES: CodeStripNote[] = ["do", "re", "mi", "fa", "sol", "la", "ti"];

interface IndexedNote {
  note: PatternNote;
  inputOrder: number;
}

interface NoteSpan {
  indexed: IndexedNote;
  start: number;
  end: number;
}

interface ScheduledNote {
  kind: "note";
  note: NoteSpan;
  start: number;
  end: number;
}

interface ScheduledChord {
  kind: "chord";
  notes: NoteSpan[];
  start: number;
  end: number;
}

interface ScheduledRest {
  kind: "rest";
  start: number;
  end: number;
}

type ScheduledEvent = ScheduledNote | ScheduledChord | ScheduledRest;

export interface RecordedCodeStripInput {
  notes: PatternNote[];
  mode: MusicalMode;
  musicKey: ChromaticNote;
  notation: CodeStripConfig["notation"];
  barMs: number;
  sourceBpm: number;
  surfaceStyle: KeyboardConfig["surfaceStyle"];
  keyBrightness: number;
  keySaturation: number;
}

export function buildRecordedCodeStripTokens(input: RecordedCodeStripInput): CodeStripToken[] {
  if (!input.notes.length) {
    return [];
  }

  const schedule = buildSchedule(
    input.notes,
    getRestGapThresholdMs(input.sourceBpm),
  );
  const tokens: CodeStripToken[] = [];

  for (const event of schedule) {
    const duration = formatDuration(event.end - event.start, input.barMs);

    if (event.kind === "rest") {
      tokens.push({
        type: "rest",
        duration,
      });
      continue;
    }

    if (event.kind === "note") {
      tokens.push(noteToken(event.note, duration, input));
      continue;
    }

    const pressOrdered = [...event.notes].sort(
      (left, right) =>
        left.indexed.note.pressTime - right.indexed.note.pressTime ||
        left.indexed.inputOrder - right.indexed.inputOrder,
    );
    const voicingRanks = new Map(
      [...event.notes]
        .sort(
          (left, right) =>
            pitchRank(left.indexed.note) - pitchRank(right.indexed.note) ||
            left.indexed.inputOrder - right.indexed.inputOrder,
        )
        .map((span, voicingOrder) => [span.indexed.note.id, voicingOrder]),
    );
    const pressRanks = new Map(
      pressOrdered.map((span, pressOrder) => [span.indexed.note.id, pressOrder]),
    );
    const members = pressOrdered.map((span): ChordMember => ({
      id: span.indexed.note.id,
      syllable: solfegeLabel(span.indexed.note, input.mode),
      degree: degreeLabel(span.indexed.note, input.mode),
      rawPitch: span.indexed.note.note,
      scaleIndex: span.indexed.note.scaleIndex,
      octave: span.indexed.note.octave,
      mode: input.mode,
      musicKey: input.musicKey,
      surfaceStyle: noteSurfaceStyle(input.surfaceStyle),
      accidental: isAccidental(span.indexed.note.note),
      keyBrightness: input.keyBrightness,
      keySaturation: input.keySaturation,
      voicingOrder: voicingRanks.get(span.indexed.note.id),
      pressOrder: pressRanks.get(span.indexed.note.id),
    }));

    tokens.push({
      type: "chord",
      symbol: "",
      display: "notes",
      members,
      duration,
      accessibleName: `Overlapping notes: ${pressOrdered
        .map((span) => span.indexed.note.note)
        .join(", ")}`,
    });
  }

  return tokens;
}

function buildSchedule(notes: PatternNote[], restGapThresholdMs: number): ScheduledEvent[] {
  const sorted: IndexedNote[] = notes
    .map((note, inputOrder) => ({ note, inputOrder }))
    .sort(
      (left, right) =>
        left.note.pressTime - right.note.pressTime || left.inputOrder - right.inputOrder,
    );
  const schedule: ScheduledEvent[] = [];
  let timelineCursor = sorted[0].note.pressTime;
  let weightCursor = 0;
  let index = 0;

  while (index < sorted.length) {
    const block = [sorted[index]];
    const blockStart = sorted[index].note.pressTime;
    let blockEnd = noteEnd(sorted[index].note);
    let nextIndex = index + 1;

    while (nextIndex < sorted.length) {
      const next = sorted[nextIndex];
      if (next.note.pressTime >= blockEnd - OVERLAP_EPSILON_MS) {
        break;
      }

      block.push(next);
      blockEnd = Math.max(blockEnd, noteEnd(next.note));
      nextIndex++;
    }

    const gap = blockStart - timelineCursor;
    if (gap > OVERLAP_EPSILON_MS) {
      schedule.push({ kind: "rest", start: weightCursor, end: weightCursor + gap });
      weightCursor += gap;
    }

    const nextBlockStart = sorted[nextIndex]?.note.pressTime;
    const followingGap = nextBlockStart == null ? 0 : nextBlockStart - blockEnd;
    const coalescedGap = block.length === 1 &&
      followingGap > OVERLAP_EPSILON_MS &&
      followingGap <= restGapThresholdMs
      ? followingGap
      : 0;
    const blockDuration = Math.max(1, blockEnd - blockStart + coalescedGap);
    const spans = block.map((indexed): NoteSpan => ({
      indexed,
      start: weightCursor + Math.max(0, indexed.note.pressTime - blockStart),
      end: weightCursor + Math.max(1, noteEnd(indexed.note) - blockStart),
    }));

    if (spans.length === 1) {
      schedule.push({
        kind: "note",
        note: spans[0],
        start: weightCursor,
        end: weightCursor + blockDuration,
      });
    } else {
      schedule.push({
        kind: "chord",
        notes: spans,
        start: weightCursor,
        end: weightCursor + blockDuration,
      });
    }

    timelineCursor = blockEnd + coalescedGap;
    weightCursor += blockDuration;
    index = nextIndex;
  }

  return schedule;
}

function noteToken(
  span: NoteSpan,
  duration: string,
  input: RecordedCodeStripInput,
): CodeStripToken {
  const note = span.indexed.note;
  const normalizedIndex = normalizeScaleIndex(input.mode, note.scaleIndex);
  const codeStripNote = NOTE_NAMES[positiveModulo(normalizedIndex, NOTE_NAMES.length)];
  const syllable = solfegeLabel(note, input.mode);
  const degree = degreeLabel(note, input.mode);
  const glyph = input.notation === "note" ? "raw" : input.notation === "degree" ? "deg" : "syl";
  const text = glyph === "raw" ? note.note : glyph === "deg" ? degree : syllable;

  return {
    type: "note",
    note: codeStripNote,
    text,
    glyph,
    duration,
    syllable,
    degree,
    rawPitch: note.note,
    scaleIndex: note.scaleIndex,
    octave: note.octave,
    mode: input.mode,
    musicKey: input.musicKey,
    surfaceStyle: noteSurfaceStyle(input.surfaceStyle),
    isAccidental: isAccidental(note.note),
    keyBrightness: input.keyBrightness,
    keySaturation: input.keySaturation,
  };
}

function solfegeLabel(note: PatternNote, mode: MusicalMode) {
  return getSolfegeNameForMode(mode, note.scaleIndex);
}

function degreeLabel(note: PatternNote, mode: MusicalMode) {
  return String(normalizeScaleIndex(mode, note.scaleIndex) + 1);
}

function formatDuration(durationMs: number, barMs: number) {
  const safeBarMs = Number.isFinite(barMs) && barMs > 0 ? barMs : 2000;
  const ratio = Number.parseFloat((Math.max(1, durationMs) / safeBarMs).toFixed(4));
  return `@${ratio}`;
}

function noteEnd(note: PatternNote) {
  return note.pressTime + Math.max(1, note.duration);
}

function pitchRank(note: PatternNote) {
  if (typeof note.frequency === "number" && Number.isFinite(note.frequency)) {
    return note.frequency;
  }

  const match = note.note.match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!match) {
    return note.octave * 12 + note.scaleIndex;
  }

  const [, rawPitchClass, accidental, rawOctave] = match;
  const base = ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as const)[
    rawPitchClass.toUpperCase() as "A" | "B" | "C" | "D" | "E" | "F" | "G"
  ];
  const accidentalOffset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  return Number(rawOctave) * 12 + base + accidentalOffset;
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
