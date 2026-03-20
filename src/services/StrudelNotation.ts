/**
 * StrudelNotation — converts LogNote arrays into Strudel mini-notation strings.
 *
 * @example
 * const strudel = logNotesToStrudel(loggedNotes, { bpm: 120 })
 * // `<
 * // C4@0.5 D4@0.25 E4@0.25 G4@0.5
 * // >`.as("note").sound("sine")
 */

import type { LogNote } from "@/types/patterns";

export interface StrudelConfig {
  /** Playback tempo in BPM. @default 120 */
  bpm: number;
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
  scaleMode?: string;
  /** Optional scale octave override for relative notation. */
  scaleOctave?: number;
}

const DEFAULT_CONFIG: StrudelConfig = {
  bpm: 120,
  beatsPerBar: 4,
  notationType: "absolute",
  precision: 4,
  sound: "sine",
};

const REST_GAP_THRESHOLD_MS = 50;
const OVERLAP_EPSILON_MS = 1;

/** Length of one bar in milliseconds. */
function barLengthMs(config: StrudelConfig): number {
  return (60000 / config.bpm) * config.beatsPerBar;
}

/** Converts a duration in ms to a Strudel @x string. Returns "" when @x === 1. */
function toAt(ms: number, barMs: number, precision: number): string {
  const x = parseFloat((ms / barMs).toFixed(precision));
  return x === 1 ? "" : `@${x}`;
}

/**
 * Converts an array of LogNotes into a Strudel mini-notation string.
 *
 * Notes are rendered sequentially. Gaps between notes produce ~ rests.
 * The first note's pressTime is treated as t=0.
 */
export class StrudelNotation {
  private notes: LogNote[];
  private config: StrudelConfig;

  constructor(notes: LogNote[], config?: Partial<StrudelConfig>) {
    this.notes = [...notes].sort(
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
      if (gap > REST_GAP_THRESHOLD_MS) {
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

    const inner = tokens.join(" ");

    if (this.config.notationType === "relative") {
      const first = this.notes[0];
      const scaleOctave =
        this.config.scaleOctave ??
        (Number.isFinite(first?.octave) ? first.octave : 4);
      const scale = `${this.config.scaleKey ?? first?.key ?? "C"}${scaleOctave}:${this.config.scaleMode ?? first?.mode ?? "major"}`;
      return `\`<\n${inner}\n>\`.as("n").scale("${scale}").sound("${this.config.sound}")`;
    }

    return `\`<\n${inner}\n>\`.as("note").sound("${this.config.sound}")`;
  }

  private renderStandaloneNote(note: LogNote, barMs: number) {
    return `${this.noteValue(note)}${toAt(this.noteDuration(note), barMs, this.config.precision)}`;
  }

  private renderOverlapBlock(
    notes: LogNote[],
    origin: number,
    blockStart: number,
    blockEnd: number,
    barMs: number
  ) {
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
    if (lane.length === 1) {
      const note = lane[0];
      const startsWithBlock =
        this.noteStart(note, origin) - blockStart <= REST_GAP_THRESHOLD_MS;
      const endsWithBlock =
        blockEnd - this.noteEnd(note, origin) <= REST_GAP_THRESHOLD_MS;

      if (startsWithBlock && endsWithBlock) {
        return this.noteValue(note);
      }
    }

    const tokens: string[] = [];
    let cursor = blockStart;

    for (const note of lane) {
      const start = this.noteStart(note, origin);
      const end = this.noteEnd(note, origin);
      const gap = start - cursor;

      if (gap > REST_GAP_THRESHOLD_MS) {
        tokens.push(`~${toAt(gap, barMs, this.config.precision)}`);
      }

      tokens.push(
        `${this.noteValue(note)}${toAt(
          this.noteDuration(note),
          barMs,
          this.config.precision
        )}`
      );
      cursor = end;
    }

    const trailingGap = blockEnd - cursor;
    if (trailingGap > REST_GAP_THRESHOLD_MS) {
      tokens.push(`~${toAt(trailingGap, barMs, this.config.precision)}`);
    }

    return tokens.join(" ");
  }

  private noteValue(note: LogNote) {
    return this.config.notationType === "relative"
      ? String(note.scaleIndex)
      : note.note;
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
 * const strudel = logNotesToStrudel(store.loggedNotes, { bpm: 90 })
 * window.open(`https://strudel.cc/#${btoa(strudel)}`) // open in strudel.cc
 */
export function logNotesToStrudel(
  notes: LogNote[],
  config?: Partial<StrudelConfig>
): string {
  return new StrudelNotation(notes, config).toString();
}
