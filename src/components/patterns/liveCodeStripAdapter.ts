import { getSolfegeNameForMode, normalizeScaleIndex } from "@/data";
import type { ChordMember } from "@/components/compounds/Chord.vue";
import type { CodeStripNote, CodeStripToken } from "@/components/uniques/CodeStrip.vue";
import type { NoteSurfaceStyle } from "@/components/primatives/Note.vue";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import type { PatternNote } from "@/types/patterns";
import type { KeyboardConfig, LiveStripConfig } from "@/types/visual";

const REST_GAP_THRESHOLD_MS = 50;
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
  displayIndex?: number;
}

interface ScheduledChord {
  kind: "chord";
  notes: NoteSpan[];
  start: number;
  end: number;
  displayIndex?: number;
}

interface ScheduledRest {
  kind: "rest";
  start: number;
  end: number;
  displayIndex?: number;
}

type ScheduledEvent = ScheduledNote | ScheduledChord | ScheduledRest;

export interface LiveCodeStripFrame {
  tokens: CodeStripToken[];
  activeTokenIndex: number | null;
}

export interface LiveCodeStripInput {
  notes: PatternNote[];
  mode: MusicalMode;
  musicKey: ChromaticNote;
  notation: LiveStripConfig["notation"];
  showRests: boolean;
  barMs: number;
  playbackPhase: number | null;
  surfaceStyle: KeyboardConfig["surfaceStyle"];
  keyBrightness: number;
  keySaturation: number;
}

export function buildLiveCodeStripFrame(input: LiveCodeStripInput): LiveCodeStripFrame {
  if (!input.notes.length) {
    return { tokens: [], activeTokenIndex: null };
  }

  const schedule = buildSchedule(input.notes);
  const totalDuration = schedule[schedule.length - 1]?.end ?? 0;
  const position = playbackPosition(input.playbackPhase, totalDuration);
  const tokens: CodeStripToken[] = [];

  for (const event of schedule) {
    if (event.kind === "rest" && !input.showRests) {
      continue;
    }

    event.displayIndex = tokens.length;
    const duration = formatDuration(event.end - event.start, input.barMs);

    if (event.kind === "rest") {
      tokens.push({
        type: "rest",
        duration,
        progress: progressAt(position, event.start, event.end),
      });
      continue;
    }

    if (event.kind === "note") {
      tokens.push(noteToken(event.note, duration, progressAt(position, event.start, event.end), input));
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
      progress: progressAt(position, span.start, span.end),
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

  const activeEvent = position == null
    ? undefined
    : schedule.find((event) => position >= event.start && position < event.end);

  return {
    tokens,
    activeTokenIndex: activeEvent?.displayIndex ?? null,
  };
}

function buildSchedule(notes: PatternNote[]): ScheduledEvent[] {
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
    if (gap > REST_GAP_THRESHOLD_MS) {
      schedule.push({ kind: "rest", start: weightCursor, end: weightCursor + gap });
      weightCursor += gap;
    }

    const blockDuration = Math.max(1, blockEnd - blockStart);
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

    timelineCursor = blockEnd;
    weightCursor += blockDuration;
    index = nextIndex;
  }

  return schedule;
}

function noteToken(
  span: NoteSpan,
  duration: string,
  progress: number,
  input: LiveCodeStripInput,
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
    progress,
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

function playbackPosition(phase: number | null, totalDuration: number) {
  if (phase == null || !Number.isFinite(phase) || totalDuration <= 0) {
    return null;
  }

  return positiveModulo(phase, 1) * totalDuration;
}

function progressAt(position: number | null, start: number, end: number) {
  if (position == null || position <= start) return 0;
  if (position >= end) return 1;
  return (position - start) / Math.max(1, end - start);
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
