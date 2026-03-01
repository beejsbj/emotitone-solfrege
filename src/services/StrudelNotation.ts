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
}

const DEFAULT_CONFIG: StrudelConfig = {
  bpm: 120,
  beatsPerBar: 4,
  notationType: "absolute",
  precision: 4,
  sound: "sine",
};

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
    this.notes = [...notes].sort((a, b) => a.pressTime - b.pressTime);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  toString(): string {
    if (this.notes.length === 0) return "";

    const barMs = barLengthMs(this.config);
    const origin = this.notes[0].pressTime;
    const tokens: string[] = [];
    let cursor = 0;

    for (const ln of this.notes) {
      const start = ln.pressTime - origin;
      const dur = Math.max(1, ln.duration);

      // Insert rest for gap before this note (> 50ms threshold)
      const gap = start - cursor;
      if (gap > 50) {
        tokens.push(`~${toAt(gap, barMs, this.config.precision)}`);
      }

      const name =
        this.config.notationType === "relative"
          ? String(ln.scaleIndex)
          : ln.note;

      tokens.push(`${name}${toAt(dur, barMs, this.config.precision)}`);
      cursor = start + dur;
    }

    const inner = tokens.join(" ");

    if (this.config.notationType === "relative") {
      const first = this.notes[0];
      const scale = `${first?.key ?? "C"}4:${first?.mode ?? "major"}`;
      return `\`<\n${inner}\n>\`.as("n").scale("${scale}").sound("${this.config.sound}")`;
    }

    return `\`<\n${inner}\n>\`.as("note").sound("${this.config.sound}")`;
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
