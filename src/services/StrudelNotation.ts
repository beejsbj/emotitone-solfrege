/**
 * StrudelNotation — converts LogNote arrays into Strudel mini-notation strings.
 *
 * @example
 * const strudel = logNotesToStrudel(loggedNotes, { bpm: 120, sourceBpm: 120 })
 * // `<
 * // C4@0.5 D4@0.25 E4@0.25 G4@0.5
 * // >`.as("note").sound("sine").cpm(120 / 4)
 */

import type { LogNote } from "@/types/patterns";
import type { MusicalMode } from "@/types/music";
import { Note as TonalNote } from "@tonaljs/tonal";
import { getScaleForMode, normalizeScaleIndex } from "@/data";
import { prepareRecordedNotes, recordedLoopTailMs, type PreparedRecordedNote } from "./recordedTiming";
import { getLiveArticulation, type LiveArticulation } from "./liveArticulation";

export interface StrudelConfig {
  /** Playback tempo in BPM. Used by the live runtime, not @ duration sizing. @default 120 */
  bpm: number;
  /** Source tempo in BPM used to convert milliseconds into Strudel cycle fractions. @default 120 */
  sourceBpm: number;
  /** Beats per bar. @default 4 */
  beatsPerBar: number;
  /** 'absolute' uses note names (C4), 'relative' uses scale degrees (0-6). @default 'absolute' */
  notationType: "absolute" | "relative";
  /** Decimal places for @x duration values. @default 4 */
  precision: number;
  /** Sound/instrument name passed to .sound(). @default 'sine' */
  sound: string;
  /** Optional scale key override for relative notation. */
  scaleKey?: string;
  /** Optional scale mode override for relative notation. */
  scaleMode?: MusicalMode;
  /** Optional scale octave override for relative notation. */
  scaleOctave?: number;
}

const DEFAULT_CONFIG: StrudelConfig = {
  bpm: 120,
  sourceBpm: 120,
  beatsPerBar: 4,
  notationType: "absolute",
  precision: 4,
  sound: "sine",
};

export const DEFAULT_SOURCE_BPM = DEFAULT_CONFIG.sourceBpm;

const OVERLAP_EPSILON_MS = 0;
type RecordedControl = 'clip' | keyof LiveArticulation;
const RECORDED_CONTROLS: RecordedControl[] = ['clip', 'attack', 'decay', 'sustain', 'release'];

/** Length of one bar in milliseconds. */
function barLengthMs(config: StrudelConfig): number {
  return (60000 / config.sourceBpm) * config.beatsPerBar;
}

/** Converts a duration in ms to a Strudel @x string. Returns "" when @x === 1. */
function toAt(ms: number, barMs: number, precision: number): string {
  const x = Math.max(10 ** -precision, parseFloat((ms / barMs).toFixed(precision)));
  return x === 1 ? "" : `@${x}`;
}

/** Coalesce adjacent rests in one sequence; brace lanes stay independent. */
export function mergeStrudelRests(tokens: string[], precision = 4): string[] {
  const merged: string[] = [];
  let restWeight = 0;
  const flush = () => {
    if (restWeight > 0) merged.push(`~${toAt(restWeight, 1, precision)}`);
    restWeight = 0;
  };
  for (const token of tokens) {
    const rest = token.match(/^~(?:@(\d+(?:\.\d+)?))?$/);
    if (rest) restWeight += rest[1] === undefined ? 1 : Number(rest[1]);
    else { flush(); merged.push(token); }
  }
  flush();
  return merged;
}

/**
 * Converts an array of LogNotes into a Strudel mini-notation string.
 *
 * Notes are rendered sequentially. Deliberate gaps produce ~ rests and retain
 * their measured duration in the source timeline.
 * The first note's pressTime is treated as t=0.
 */
export class StrudelNotation {
  private notes: PreparedRecordedNote<LogNote>[];
  private config: StrudelConfig;
  private renderRelative = false;
  private controlFields: RecordedControl[] = [];

  constructor(notes: LogNote[], config?: Partial<StrudelConfig>) {
    this.notes = prepareRecordedNotes(notes).sort(
      (a, b) =>
        a.pressTime - b.pressTime ||
        a.octave - b.octave ||
        a.scaleIndex - b.scaleIndex ||
        a.note.localeCompare(b.note)
    );
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  toString(): string {
    if (this.notes.length === 0) return "";

    this.renderRelative = this.config.notationType === "relative" &&
      this.notes.every((note) => this.relativeNoteValue(note) != null);
    const envelope = getLiveArticulation(this.config.sound);
    this.controlFields = RECORDED_CONTROLS.filter(control =>
      this.notes.some(note => this.noteControl(note, control) !==
        (control === 'clip' ? 1 : envelope[control])));
    const barMs = barLengthMs(this.config);
    const origin = this.notes[0].pressTime;
    const tokens: string[] = [];
    let cursor = 0;
    let index = 0;

    while (index < this.notes.length) {
      const block = [this.notes[index]];
      const blockStart = this.noteStart(this.notes[index], origin);
      let blockEnd = this.noteEnd(this.notes[index], origin);
      let nextIndex = index + 1;

      while (nextIndex < this.notes.length) {
        const nextStart = this.noteStart(this.notes[nextIndex], origin);
        if (nextStart >= blockEnd - OVERLAP_EPSILON_MS) {
          break;
        }

        block.push(this.notes[nextIndex]);
        blockEnd = Math.max(blockEnd, this.noteEnd(this.notes[nextIndex], origin));
        nextIndex++;
      }

      const gap = blockStart - cursor;
      if (gap > OVERLAP_EPSILON_MS) {
        tokens.push(`~${toAt(gap, barMs, this.config.precision)}`);
      }

      tokens.push(
        block.length === 1
          ? this.renderStandaloneNote(block[0], barMs)
          : this.renderOverlapBlock(block, origin, blockStart, blockEnd, barMs)
      );

      cursor = blockEnd;
      index = nextIndex;
    }

    tokens.push(`~${toAt(recordedLoopTailMs(this.config.sourceBpm), barMs, this.config.precision)}`);
    // Direct @ weights in <> are cycle lengths. A surrounding [] would
    // normalize the entire take into one cycle, regardless of its duration.
    const inner = mergeStrudelRests(tokens, this.config.precision).join(" ");
    const cpmExpression = `${this.config.bpm} / ${this.config.beatsPerBar}`;
    // Each mapped column is present on every note. Apply global defaults only
    // to unmapped controls so they cannot overwrite recorded per-note values.
    const controls = RECORDED_CONTROLS.filter(control => !this.controlFields.includes(control))
      .map(control => `.${control}(${control === 'clip' ? 1 : envelope[control]})`).join('');
    const mapping = [this.renderRelative ? 'n' : 'note', ...this.controlFields].join(':');

    if (this.renderRelative) {
      const first = this.notes[0];
      const scaleOctave =
        this.config.scaleOctave ??
        (Number.isFinite(first?.octave) ? first.octave : 4);
      const scale = `${this.config.scaleKey ?? first?.key ?? "C"}${scaleOctave}:${this.config.scaleMode ?? first?.mode ?? "major"}`;
      return `\`<\n${inner}\n>\`.as("${mapping}").scale("${scale}").sound("${this.config.sound}")${controls}.cpm(${cpmExpression})`;
    }

    return `\`<\n${inner}\n>\`.as("${mapping}").sound("${this.config.sound}")${controls}.cpm(${cpmExpression})`;
  }

  private renderStandaloneNote(note: LogNote, barMs: number) {
    return `${this.noteValue(note)}${toAt(
      this.noteDuration(note),
      barMs,
      this.config.precision,
    )}`;
  }

  private renderOverlapBlock(
    notes: LogNote[],
    origin: number,
    blockStart: number,
    blockEnd: number,
    barMs: number
  ) {
    if (notes.every(note => this.noteStart(note, origin) === blockStart &&
      this.noteEnd(note, origin) === blockEnd)) {
      return `{${notes.map(note => this.noteValue(note)).join(", ")}}${toAt(
        blockEnd - blockStart, barMs, this.config.precision,
      )}`;
    }
    const lanes = this.buildLanes(notes, origin);
    const laneStrings = lanes.map((lane) =>
      this.renderLane(lane, origin, blockStart, blockEnd, barMs)
    );

    return `{${laneStrings.join(", ")}}${toAt(
      blockEnd - blockStart,
      barMs,
      this.config.precision
    )}`;
  }

  private buildLanes(notes: LogNote[], origin: number) {
    const lanes: LogNote[][] = [];

    for (const note of notes) {
      const start = this.noteStart(note, origin);
      let placed = false;

      for (const lane of lanes) {
        const last = lane[lane.length - 1];
        if (this.noteEnd(last, origin) <= start + OVERLAP_EPSILON_MS) {
          lane.push(note);
          placed = true;
          break;
        }
      }

      if (!placed) {
        lanes.push([note]);
      }
    }

    return lanes;
  }

  private renderLane(
    lane: LogNote[],
    origin: number,
    blockStart: number,
    blockEnd: number,
    barMs: number
  ) {
    // Every lane must carry the same total weight. Omitting a full-span
    // note's weight makes it 1 while padded lanes may total e.g. 0.25;
    // {} then repeats those shorter lanes, inventing extra attacks.
    // Round shared boundaries, not individual durations: independent rounding
    // can give lanes different totals and create an extra attack at the end.
    const precision = Math.max(6, this.config.precision);
    const units = 10 ** precision;
    const boundary = (time: number) => Math.round((time - blockStart) / barMs * units);
    const format = (ticks: number) => toAt(ticks, units, precision);
    const tokens: string[] = [];
    let cursor = 0;

    for (const note of lane) {
      const start = boundary(this.noteStart(note, origin));
      const end = boundary(this.noteEnd(note, origin));
      const gap = start - cursor;

      if (gap > 0) tokens.push(`~${format(gap)}`);

      tokens.push(`${this.noteValue(note)}${format(end - start)}`);
      cursor = end;
    }

    const trailingGap = boundary(blockEnd) - cursor;
    if (trailingGap > 0) tokens.push(`~${format(trailingGap)}`);

    return mergeStrudelRests(tokens, precision).join(" ");
  }

  private noteValue(note: PreparedRecordedNote<LogNote>) {
    const pitch = this.renderRelative ? String(this.relativeNoteValue(note)) : note.note;
    return [pitch, ...this.controlFields.map(control => this.noteControl(note, control))].join(':');
  }

  private noteControl(note: PreparedRecordedNote<LogNote>, control: RecordedControl): number {
    if (control === 'clip') {
      const ratio = (note.gateDuration ?? this.noteDuration(note)) / this.noteDuration(note);
      return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
    }
    const value = note.articulation?.[control];
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 &&
      (control !== 'sustain' || value <= 1)
      ? value : getLiveArticulation(this.config.sound)[control];
  }

  private relativeNoteValue(note: LogNote) {
    const mode = (this.config.scaleMode ?? note.mode ?? "major") as MusicalMode;
    const scale = getScaleForMode(mode);
    const degree = normalizeScaleIndex(mode, note.scaleIndex);
    const scaleOctave = this.config.scaleOctave ?? this.notes[0]?.octave ?? 4;
    const scaleKey = this.config.scaleKey ?? this.notes[0]?.key ?? "C";
    const rootMidi = TonalNote.midi(`${scaleKey}${scaleOctave}`);
    const noteMidi = TonalNote.midi(note.note);
    const degreeSemitones = scale.intervals[degree];

    if (rootMidi == null || noteMidi == null || degreeSemitones == null) {
      return null;
    }

    const octaveCycles = (noteMidi - (rootMidi + degreeSemitones)) / 12;
    const roundedCycles = Math.round(octaveCycles);
    if (Math.abs(octaveCycles - roundedCycles) > Number.EPSILON * 16) {
      return null;
    }

    return degree + roundedCycles * scale.degreeCount;
  }

  private noteDuration(note: LogNote) {
    return Math.max(1, note.duration);
  }

  private noteStart(note: LogNote, origin: number) {
    return note.pressTime - origin;
  }

  private noteEnd(note: LogNote, origin: number) {
    return this.noteStart(note, origin) + this.noteDuration(note);
  }
}

/**
 * One-liner convenience wrapper.
 *
 * @example
 * const strudel = logNotesToStrudel(store.loggedNotes, { sourceBpm: 90 })
 * window.open(`https://strudel.cc/#${btoa(strudel)}`) // open in strudel.cc
 */
export function logNotesToStrudel(
  notes: LogNote[],
  config?: Partial<StrudelConfig>
): string {
  return new StrudelNotation(notes, config).toString();
}
