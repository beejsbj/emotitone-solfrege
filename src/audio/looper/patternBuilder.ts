import { pure, timeCat, stack, silence, type Pattern } from '@strudel/core';
import '@strudel/tonal';
import { Note } from '@tonaljs/tonal';
import { resolveLiveSoundName } from '@/services/liveInstrumentNames';
import { getScaleForMode } from '@/data';
import { recordedPatternPlanSteps, approximateRecordedDegree, type RecordedPatternPlan, type WeightedSlot } from '@/services/recordedPatternPlan';
import type { Phrase } from '@/types/phrases';
import type { CachedLooperPhrase, LooperMember } from '@/types/looperTransport';
import type { ChromaticNote, MusicalMode } from '@/types/music';

/** Bound each timeCat to eight entries. This also bounds traversal of silent arcs. */
function* sequenceSteps(slots: WeightedSlot[], plan: RecordedPatternPlan, phraseId: string): Generator<void, Pattern> {
  let parts: [number, Pattern][] = [];
  const modifiers = Object.fromEntries(Object.entries(plan.modifiers)
    .map(([key, value]) => [key === 'lpf' ? 'cutoff' : key === 'lpq' ? 'resonance' : key, value]));
  for (const slot of slots) {
    let pattern = silence;
    if (slot.note) {
      pattern = pure({ [plan.relative ? 'n' : 'note']: slot.note.pitch, ...slot.note.controls, ...modifiers })
        .withContext(context => ({ ...context, phraseId, noteId: slot.note!.id }));
    } else if (slot.lanes) {
      const lanes: Pattern[] = [];
      for (const lane of slot.lanes) lanes.push(yield* sequenceSteps(lane, plan, phraseId));
      pattern = stack(...lanes);
    }
    parts.push([slot.weight, pattern]);
    yield;
  }
  while (parts.length > 8) {
    const groups: [number, Pattern][] = [];
    for (let index = 0; index < parts.length; index += 8) {
      const group = parts.slice(index, index + 8);
      groups.push([group.reduce((sum, [weight]) => sum + weight, 0), timeCat(...group)]);
      yield;
    }
    parts = groups;
  }
  return timeCat(...parts);
}
function* patternSteps(plan: RecordedPatternPlan, phraseId: string): Generator<void, Pattern> {
  if (!plan.slots.length) return silence;
  const sequence = yield* sequenceSteps(plan.slots, plan, phraseId);
  // <> uses weights in bars; timeCat alone normalizes them to one bar.
  return sequence.slow(plan.lengthBars).sound(pure(plan.config.sound));
}
function complete<T>(steps: Generator<void, T>): T {
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}
/** No source strings, mini parser or transpiler. Equivalence probe and offline export tools. */
export function patternFromPlan(plan: RecordedPatternPlan, phraseId: string): Pattern {
  return complete(patternSteps(plan, phraseId));
}
function* phraseSteps(phrase: Phrase): Generator<void, CachedLooperPhrase> {
  const context = { ...phrase.context, shape: { ...phrase.context.shape } };
  const capturedNotes: Phrase['notes'] = [];
  for (const note of phrase.notes) {
    capturedNotes.push({ ...note, articulation: note.articulation && { ...note.articulation },
      pitchExpression: note.pitchExpression?.map(point => ({ ...point })),
      gainExpression: note.gainExpression?.map(point => ({ ...point })),
    });
    yield;
  }
  const barMs = 240000 / context.bpm;
  const origin = Math.min(...capturedNotes.map(n => n.pressTime));
  const end = Math.max(0, ...capturedNotes.map(n => n.pressTime - origin + Math.max(1, n.duration)));
  const lengthBars = Math.max(1, Math.ceil(Math.max(phrase.duration, end) / barMs));
  const notes = capturedNotes.map(note => ({ ...note, key: context.key, mode: context.mode }));
  const plan = yield* recordedPatternPlanSteps(notes, { sourceBpm: context.bpm, notationType: 'relative',
    scaleKey: context.key, scaleMode: context.mode, scaleOctave: context.octave,
    sound: resolveLiveSoundName(context.instrument), shape: context.shape, patternDurationMs: lengthBars * barMs, precision: 6 });
  // A gate ending exactly at the bar must not add the export's default extra beat.
  if (plan.slots.length) {
    const sounding = plan.slots.slice(0, -1).reduce((s, slot) => s + slot.weight, 0);
    plan.slots[plan.slots.length - 1].weight = Math.max(0, lengthBars - sounding);
    if (plan.slots[plan.slots.length - 1].weight === 0) plan.slots.pop();
    plan.lengthBars = lengthBars;
  }
  const base = yield* patternSteps(plan, phrase.id);
  const pitches = new Map<string, number>();
  if (!plan.relative) for (const note of notes) {
    pitches.set(note.note, approximateRecordedDegree(note, plan.config, notes[0]));
    yield;
  }
  const degrees = plan.relative ? base : base.fmap(value => {
    const { note, ...controls } = value;
    return { ...controls, n: pitches.get(String(note))! };
  });
  return { phraseId: phrase.id, base, degrees, plan, lengthBars, context, notes: capturedNotes };
}
/** Synchronous offline/prewarm path. Use prepareLooperPhrase when audio is running. */
export function buildLooperPhrase(phrase: Phrase): CachedLooperPhrase {
  return complete(phraseSteps(phrase));
}
/** Fresh recordings yield between small groups so preparation does not starve Cyclist.
 * sliceMs is an elapsed budget, not a promise about OS pauses or one expression curve.
 */
export async function prepareLooperPhrase(phrase: Phrase, options: {
  sliceMs?: number;
  yieldToScheduler?: () => Promise<void>;
  onSlice?: (elapsedMs: number) => void;
} = {}): Promise<CachedLooperPhrase> {
  const budget = options.sliceMs ?? 2;
  if (!Number.isFinite(budget) || budget <= 0) throw new RangeError('Slice budget must be positive');
  const yieldToScheduler = options.yieldToScheduler ?? (() => new Promise(resolve => setTimeout(resolve, 0)));
  const steps = phraseSteps(phrase);
  for (;;) {
    const start = performance.now();
    let step = steps.next();
    while (!step.done && performance.now() - start < budget) step = steps.next();
    options.onSlice?.(performance.now() - start);
    if (step.done) return step.value;
    await yieldToScheduler();
  }
}

/** Immutable captured times stretch; Shape-owned envelope/effect times stay in seconds. */
export function memberPattern(member: LooperMember, key: ChromaticNote, mode: MusicalMode, bpm: number): Pattern {
  const { phrase, rate, offsetBars, pinned } = member;
  const recorded = phrase.context;
  let pattern = phrase.base;
  if (pinned) {
    if (phrase.plan.relative) pattern = pattern.scale(pure(phrase.plan.scale));
  } else if (!phrase.plan.relative && mode === recorded.mode) {
    // Exact key transposition retains borrowed chromatic pitches in the same mode.
    const shift = Note.chroma(key)! - Note.chroma(recorded.key)!;
    pattern = pattern.fmap(value => ({ ...value, note: Note.fromMidi(Note.midi(String(value.note))! + shift) }));
  } else {
    const oldCount = getScaleForMode(recorded.mode).degreeCount;
    const newCount = getScaleForMode(mode).degreeCount;
    pattern = phrase.degrees.fmap(value => {
      const n = Number(value.n), cycle = Math.floor(n / oldCount), degree = n - cycle * oldCount;
      return { ...value, n: cycle * newCount + Math.min(degree, newCount - 1) };
    }).scale(pure(`${key}${recorded.octave}:${mode}`));
  }
  const captured = new Map(phrase.notes.map(n => [n.id, n.articulation]));
  // Controls in values already match export; alter only notes with recorded articulation.
  const totalRate = bpm / recorded.bpm * rate;
  if (totalRate !== 1) {
    pattern = pattern.withContext(context => ({ ...context, looperPlaybackRate: totalRate }));
    // Recorded fallback distinction is note-specific; map haps instead of changing the cache.
    pattern = stretchPattern(pattern, captured, totalRate);
  }
  return pattern.fast(rate).late(offsetBars).withContext(context => ({ ...context, looperKey: key, looperMode: mode }));
}

function stretchPattern(pattern: Pattern, articulation: Map<string, Phrase['notes'][number]['articulation']>, rate: number): Pattern {
  return pattern.withHap(hap => {
    const value = { ...hap.value };
    const recorded = articulation.get(String(hap.context.noteId));
    for (const control of ['attack', 'decay', 'release'] as const) {
      const captured = recorded?.[control];
      if (typeof captured === 'number' && Number.isFinite(captured) && captured >= 0) value[control] = Number(value[control]) / rate;
    }
    for (const control of ['vib', 'tremolo']) if (value[control] !== undefined) value[control] = Number(value[control]) * rate;
    return hap.withValue(() => value);
  });
}
