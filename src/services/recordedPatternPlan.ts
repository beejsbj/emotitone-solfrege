/** Pure timing/control authority shared by portable export and direct playback. */
import { Note } from '@tonaljs/tonal';
import { getScaleForMode, normalizeScaleIndex } from '@/data';
import type { PatternNote, LogNote } from '@/types/patterns';
import type { StrudelConfig } from './StrudelNotation';
import { prepareRecordedNotes, recordedLoopTailMs } from './recordedTiming';
import { approximateVibrato } from './vibratoApproximation';
import { approximateTremolo } from './tremoloApproximation';
import { resolveLiveEnvelope } from './shape';

export const DEFAULT_STRUDEL_CONFIG: StrudelConfig = {
  bpm: 120, sourceBpm: 120, beatsPerBar: 4, notationType: 'absolute', precision: 4, sound: 'sine',
};
export const RECORDED_CONTROLS = ['clip', 'attack', 'decay', 'sustain', 'release'] as const;
export type RecordedControl = typeof RECORDED_CONTROLS[number];
export type RecordedPlanNote = PatternNote & Partial<Pick<LogNote, 'key' | 'mode'>>;
export interface PlannedNote {
  id: string;
  pitch: string | number;
  controls: Record<string, number>;
}
export interface WeightedSlot {
  weight: number;
  precision: number;
  note?: PlannedNote;
  lanes?: WeightedSlot[][];
}
export interface RecordedPatternPlan {
  config: StrudelConfig;
  relative: boolean;
  scale: string;
  fields: string[];
  globals: Record<string, number>;
  modifiers: Record<string, number>;
  slots: WeightedSlot[];
  lengthBars: number;
}
export function roundedWeight(ms: number, barMs: number, precision: number): number {
  return Math.max(10 ** -precision, Number((ms / barMs).toFixed(precision)));
}

/** Exact relative-export degree, including octave cycles. Borrowed pitches return null. */
export function recordedDegree(note: RecordedPlanNote, config: StrudelConfig, first: RecordedPlanNote): number | null {
  const mode = config.scaleMode ?? note.mode ?? 'major';
  const scale = getScaleForMode(mode);
  const degree = normalizeScaleIndex(mode, note.scaleIndex);
  const root = Note.midi(`${config.scaleKey ?? first.key ?? 'C'}${config.scaleOctave ?? first.octave ?? 4}`);
  const midi = Note.midi(note.note);
  const semitones = scale.intervals[degree];
  if (root == null || midi == null || semitones == null) return null;
  const cycles = (midi - root - semitones) / 12;
  return Math.abs(cycles - Math.round(cycles)) <= Number.EPSILON * 16
    ? degree + Math.round(cycles) * scale.degreeCount : null;
}

/** Bending view only: nearest recorded degree; ties choose the lower pitch.
 * Search absolute semitone distance across octave boundaries and degree counts.
 */
export function approximateRecordedDegree(note: RecordedPlanNote, config: StrudelConfig, first: RecordedPlanNote): number {
  const exact = recordedDegree(note, config, first);
  if (exact != null) return exact;
  const scale = getScaleForMode(config.scaleMode ?? note.mode ?? 'major');
  const root = Note.midi(`${config.scaleKey ?? first.key ?? 'C'}${config.scaleOctave ?? first.octave ?? 4}`);
  const midi = Note.midi(note.note);
  if (root == null || midi == null) throw new Error(`Invalid recorded pitch: ${note.note}`);
  const octave = Math.floor((midi - root) / 12);
  let best = 0, distance = Infinity;
  for (let cycle = octave - 1; cycle <= octave + 1; cycle++) {
    for (let index = 0; index < scale.degreeCount; index++) {
      const d = Math.abs(root + cycle * 12 + scale.intervals[index] - midi);
      if (d < distance) { distance = d; best = cycle * scale.degreeCount + index; }
    }
  }
  return best;
}

export function* recordedPatternPlanSteps(input: readonly RecordedPlanNote[], options: Partial<StrudelConfig> = {}): Generator<void, RecordedPatternPlan> {
  const config = { ...DEFAULT_STRUDEL_CONFIG, ...options };
  if (!Number.isFinite(config.sourceBpm) || config.sourceBpm <= 0) throw new Error('Invalid source tempo');
  const notes = prepareRecordedNotes(input).sort((a, b) => a.pressTime - b.pressTime || a.octave - b.octave ||
    a.scaleIndex - b.scaleIndex || a.note.localeCompare(b.note));
  const first = notes[0];
  yield;
  const degrees = new Map<RecordedPlanNote, number | null>();
  if (config.notationType === 'relative') for (const note of notes) {
    degrees.set(note, recordedDegree(note, config, first));
    yield;
  }
  const relative = config.notationType === 'relative' && notes.every(note => degrees.get(note) != null);
  const scale = `${config.scaleKey ?? first?.key ?? 'C'}${config.scaleOctave ?? first?.octave ?? 4}:${config.scaleMode ?? first?.mode ?? 'major'}`;
  const envelope = resolveLiveEnvelope(config.sound, config.shape);
  const planned: (PlannedNote & { vibrato?: ReturnType<typeof approximateVibrato>; tremolo?: ReturnType<typeof approximateTremolo> })[] = [];
  for (const note of notes) {
    const controls: Record<string, number> = {};
    for (const control of RECORDED_CONTROLS) {
      if (control === 'clip') {
        const ratio = (note.gateDuration ?? note.duration) / note.duration;
        controls.clip = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
      } else {
        const value = note.articulation?.[control];
        controls[control] = typeof value === 'number' && Number.isFinite(value) && value >= 0 &&
          (control !== 'sustain' || value <= 1) ? value : envelope[control];
      }
    }
    planned.push({ id: note.id, pitch: relative ? degrees.get(note)! : note.note, controls,
      vibrato: approximateVibrato(note.pitchExpression), tremolo: approximateTremolo(note.gainExpression) });
    yield;
  }
  const varying = RECORDED_CONTROLS.filter(c => new Set(planned.map(n => n.controls[c])).size > 1);
  const vibrato = planned.some(n => n.vibrato), tremolo = planned.some(n => n.tremolo);
  for (const n of planned) {
    if (vibrato) Object.assign(n.controls, n.vibrato ?? { vib: 0, vibmod: 0 });
    if (n.tremolo) Object.assign(n.controls, n.tremolo);
  }
  const globals = Object.fromEntries(RECORDED_CONTROLS.filter(c => !varying.includes(c)).map(c => [c, planned[0]?.controls[c] ?? envelope[c as keyof typeof envelope]]));
  const fields = [relative ? 'n' : 'note', ...varying, ...(vibrato ? ['vib', 'vibmod'] : []), ...(tremolo ? ['tremolo', 'tremolodepth'] : [])];
  const modifiers: Record<string, number> = {};
  const { cutoff, resonance, room, delay } = config.shape ?? {};
  if (cutoff !== undefined && cutoff < 12000) modifiers.lpf = Math.round(cutoff);
  if (resonance !== undefined && resonance > 0) modifiers.lpq = Number(resonance.toFixed(1));
  if (room !== undefined && room > 0) modifiers.room = Number(room.toFixed(3));
  if (delay !== undefined && delay > 0) Object.assign(modifiers, { delay: Number(delay.toFixed(3)), delaytime: .25, delayfeedback: .3 });
  const slots: WeightedSlot[] = [];
  if (!first) return { config, relative, scale, fields, globals, modifiers, slots, lengthBars: 0 };
  const barMs = 60000 / config.sourceBpm * config.beatsPerBar;
  const start = (i: number) => notes[i].pressTime - first.pressTime;
  const end = (i: number) => start(i) + notes[i].duration;
  const slot = (ms: number, precision = config.precision): WeightedSlot => ({ weight: roundedWeight(ms, barMs, precision), precision });
  let cursor = 0;
  for (let i = 0; i < notes.length;) {
    const blockStart = start(i);
    let blockEnd = end(i), next = i + 1;
    while (next < notes.length && start(next) < blockEnd) { blockEnd = Math.max(blockEnd, end(next)); next++; }
    if (blockStart > cursor) slots.push(slot(blockStart - cursor));
    const outer = slot(blockEnd - blockStart);
    if (next === i + 1) outer.note = planned[i];
    else if (notes.slice(i, next).every((_, j) => start(i + j) === blockStart && end(i + j) === blockEnd)) {
      outer.lanes = planned.slice(i, next).map(note => [{ weight: 1, precision: config.precision, note }]);
    } else {
      const lanes: number[][] = [];
      for (let j = i; j < next; j++) {
        const lane = lanes.find(lane => end(lane[lane.length - 1]) <= start(j));
        if (lane) lane.push(j); else lanes.push([j]);
        yield;
      }
      const precision = Math.max(6, config.precision), units = 10 ** precision;
      const boundary = (time: number) => Math.round((time - blockStart) / barMs * units);
      outer.lanes = [];
      for (const lane of lanes) {
        const tokens: WeightedSlot[] = [];
        let at = 0;
        for (const j of lane) {
          const begin = boundary(start(j)), finish = boundary(end(j));
          if (begin > at) tokens.push({ weight: roundedWeight(begin - at, units, precision), precision });
          tokens.push({ weight: roundedWeight(finish - begin, units, precision), precision, note: planned[j] });
          at = finish;
          yield;
        }
        if (boundary(blockEnd) > at) tokens.push({ weight: roundedWeight(boundary(blockEnd) - at, units, precision), precision });
        outer.lanes.push(tokens);
        yield;
      }
    }
    slots.push(outer); cursor = blockEnd; i = next;
    yield;
  }
  const tail = (config.patternDurationMs ?? cursor) - cursor;
  slots.push(slot(Number.isFinite(tail) && tail > 0 ? tail : recordedLoopTailMs(config.sourceBpm)));
  return { config, relative, scale, fields, globals, modifiers, slots, lengthBars: slots.reduce((sum, s) => sum + s.weight, 0) };
}

export function planRecordedPattern(input: readonly RecordedPlanNote[], options: Partial<StrudelConfig> = {}): RecordedPatternPlan {
  const steps = recordedPatternPlanSteps(input, options);
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}
