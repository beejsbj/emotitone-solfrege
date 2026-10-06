/** Portable Strudel export; timing and controls also drive the Looper builder. */
import type { LogNote } from '@/types/patterns';
import type { Shape } from '@/types/instrument';
import type { MusicalMode } from '@/types/music';
import { planRecordedPattern, type WeightedSlot } from './recordedPatternPlan';

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
  /**
   * The Shape the pattern was played with: filter and effects modifiers, and
   * the envelope fallback for notes without recorded articulation. Recorded
   * per-note articulation always wins. Absent means neutral.
   */
  shape?: Shape;
  /** Optional full phrase duration, including silence after the final note. */
  patternDurationMs?: number;
}

export const DEFAULT_SOURCE_BPM = 120;
const at = (weight: number) => weight === 1 ? '' : `@${weight}`;

/** Coalesce adjacent rests in one sequence; brace lanes stay independent. */
export function mergeStrudelRests(tokens: string[], precision = 4): string[] {
  const merged: string[] = [];
  let restWeight = 0;
  const flush = () => {
    if (restWeight > 0) merged.push(`~${at(Math.max(10 ** -precision, Number(restWeight.toFixed(precision))))}`);
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

export class StrudelNotation {
  constructor(private notes: LogNote[], private config: Partial<StrudelConfig> = {}) {}
  toString(): string {
    if (!this.notes.length) return '';
    const plan = planRecordedPattern(this.notes, this.config);
    const render = (slots: WeightedSlot[], precision: number): string => mergeStrudelRests(slots.map(slot => {
      let value = '~';
      if (slot.note) {
        const fields = [String(slot.note.pitch)];
        for (const field of plan.fields.slice(1)) {
          const control = slot.note.controls[field];
          if (control !== undefined) fields.push(String(control));
        }
        value = fields.join(':');
      } else if (slot.lanes) value = `{${slot.lanes.map(lane => render(lane, lane[0].precision)).join(', ')}}`;
      return value + at(slot.weight);
    }), precision).join(' ');
    const { config, fields } = plan;
    const as = fields.includes('vib') || fields.includes('tremolo')
      ? `[${fields.map(f => `'${f}'`).join(', ')}]` : `"${fields.join(':')}"`;
    const modifier = (entry: [string, number]) => `.${entry[0]}(${entry[1]})`;
    const filters = Object.entries(plan.modifiers).filter(([key]) => key === 'lpf' || key === 'lpq').map(modifier).join('');
    const effects = Object.entries(plan.modifiers).filter(([key]) => key !== 'lpf' && key !== 'lpq').map(modifier).join('');
    return `\`<\n${render(plan.slots, config.precision)}\n>\`.as(${as})${plan.relative ? `.scale("${plan.scale}")` : ''}.sound("${config.sound}")${filters}${Object.entries(plan.globals).map(modifier).join('')}${effects}.cpm(${config.bpm} / ${config.beatsPerBar})`;
  }
}
export function logNotesToStrudel(notes: LogNote[], config?: Partial<StrudelConfig>): string {
  return new StrudelNotation(notes, config).toString();
}
