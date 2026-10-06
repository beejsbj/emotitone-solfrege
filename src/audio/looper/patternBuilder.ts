import { Fraction, Hap, Pattern, TimeSpan, pure, silence, type StrudelFraction } from '@strudel/core';
import '@strudel/tonal';
import { Note } from '@tonaljs/tonal';
import { resolveLiveSoundName } from '@/services/liveInstrumentNames';
import { getScaleForMode } from '@/data';
import { recordedPatternPlanSteps, approximateRecordedDegree, type RecordedPatternPlan, type WeightedSlot } from '@/services/recordedPatternPlan';
import type { Phrase } from '@/types/phrases';
import type { CachedLooperPhrase, LooperMember } from '@/types/looperTransport';
import type { ChromaticNote, MusicalMode } from '@/types/music';

/** One note of a cached member, positioned in bars within one period. */
interface LooperEvent {
  begin: StrudelFraction;
  end: StrudelFraction;
  beginBars: number;
  value: Record<string, string | number>;
  noteId: string;
}

/**
 * Lay the plan's slots out as absolute note events, exactly as the exported
 * `<...>` source places them: top-level weights are bars, and each brace lane
 * divides its block in proportion to its own weights (lanes share one total).
 * Export weights are decimals at a known precision, so positions are summed as
 * integers and become exact rationals once per note: Fraction(float) runs a
 * Farey search that would cost milliseconds per phrase.
 */
function* layoutSlots(slots: WeightedSlot[], begin: StrudelFraction, span: StrudelFraction | null,
  value: (slot: WeightedSlot) => Record<string, string | number>, out: LooperEvent[]): Generator<void, StrudelFraction> {
  const scale = 10 ** Math.max(...slots.map(slot => slot.precision));
  const units = slots.map(slot => Math.round(slot.weight * scale));
  const total = units.reduce((sum, weight) => sum + weight, 0);
  // At top level a weight is a bar; inside a lane it is a share of the block.
  const at = (cursor: number) => span ? begin.add(span.mul(cursor).div(total)) : Fraction(cursor).div(scale);
  let cursor = 0, start = at(0);
  for (let index = 0; index < slots.length; index++) {
    const slot = slots[index];
    cursor += units[index];
    const end = at(cursor);
    if (slot.note) {
      out.push({ begin: start, end, beginBars: start.valueOf(), value: value(slot), noteId: slot.note.id });
    } else if (slot.lanes) {
      for (const lane of slot.lanes) yield* layoutSlots(lane, start, end.sub(start), value, out);
    }
    start = end;
    yield;
  }
  return start;
}

/**
 * A Pattern over a fixed event table repeating every `period` bars. Queries
 * binary-search the table, so cost depends on the notes in the arc rather than
 * the phrase length, and no Fraction is built from a float on the hot path.
 */
function eventPattern(events: LooperEvent[], period: StrudelFraction, phraseId: string): Pattern {
  if (!events.length) return silence;
  events.sort((a, b) => a.beginBars - b.beginBars);
  const begins = events.map(event => event.beginBars);
  const periodBars = period.valueOf();
  const longest = Math.max(...events.map(event => event.end.valueOf() - event.beginBars));
  const firstAtOrAfter = (bars: number) => {
    let low = 0, high = begins.length;
    while (low < high) { const mid = (low + high) >> 1; if (begins[mid] < bars) low = mid + 1; else high = mid; }
    return low;
  };
  // Strudel's own primitives fragment haps at cycle (bar) boundaries; split
  // queries the same way so Drawer and scheduler see the identical hap stream.
  return new Pattern(state => {
    const { begin, end } = state.span;
    const point = begin.equals(end);
    const from = begin.valueOf(), to = end.valueOf();
    const haps: Hap[] = [];
    for (let cycle = Math.floor(from / periodBars) - 1; cycle <= Math.floor(to / periodBars); cycle++) {
      const shift = period.mul(cycle), shiftBars = cycle * periodBars;
      // Float bounds only narrow the candidates; exact Fractions decide overlap.
      for (let i = firstAtOrAfter(from - shiftBars - longest - 1e-9); i < events.length && begins[i] <= to - shiftBars + 1e-9; i++) {
        const event = events[i];
        const wholeBegin = event.begin.add(shift), wholeEnd = event.end.add(shift);
        const overlaps = point ? wholeBegin.lte(begin) && wholeEnd.gt(begin) : wholeBegin.lt(end) && wholeEnd.gt(begin);
        if (!overlaps) continue;
        const part = point ? new TimeSpan(begin, begin)
          : new TimeSpan(wholeBegin.max(begin), wholeEnd.min(end));
        haps.push(new Hap(new TimeSpan(wholeBegin, wholeEnd), part, { ...event.value }, { phraseId, noteId: event.noteId }));
      }
    }
    return haps;
  }).splitQueries();
}

function* patternSteps(plan: RecordedPatternPlan, phraseId: string, periodBars?: number): Generator<void, Pattern> {
  if (!plan.slots.length) return silence;
  const modifiers = Object.fromEntries(Object.entries(plan.modifiers)
    .map(([key, value]) => [key === 'lpf' ? 'cutoff' : key === 'lpq' ? 'resonance' : key, value]));
  const noteField = plan.relative ? 'n' : 'note';
  const value = (slot: WeightedSlot) => ({ [noteField]: slot.note!.pitch, ...slot.note!.controls, ...modifiers, s: plan.config.sound });
  const events: LooperEvent[] = [];
  const total = yield* layoutSlots(plan.slots, Fraction(0), null, value, events);
  // A whole-bar member period may be shorter than the rounded weights by a
  // rounding unit; clip that sliver so no gate crosses into the next period.
  const period = periodBars === undefined ? total : Fraction(periodBars);
  for (const event of events) if (event.end.gt(period)) event.end = period;
  return eventPattern(events.filter(event => event.begin.lt(period)), period, phraseId);
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
function* phraseSteps(phrase: Phrase, lengthOverride?: number): Generator<void, CachedLooperPhrase> {
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
  // The Looper's domain decides membership length (with its ringing-note
  // grace); a gate past that boundary is clipped by the whole-bar period.
  const lengthBars = lengthOverride !== undefined && Number.isInteger(lengthOverride) && lengthOverride >= 1
    ? lengthOverride
    : Math.max(1, Math.ceil(Math.max(phrase.duration, end) / barMs));
  const notes = capturedNotes.map(note => ({ ...note, key: context.key, mode: context.mode }));
  const plan = yield* recordedPatternPlanSteps(notes, { sourceBpm: context.bpm, notationType: 'relative',
    scaleKey: context.key, scaleMode: context.mode, scaleOctave: context.octave,
    sound: resolveLiveSoundName(context.instrument), shape: context.shape, patternDurationMs: lengthBars * barMs, precision: 6 });
  // The member's period is its whole-bar length, not the export's trailing
  // weight: a gate ending exactly at a bar must not add the default extra beat.
  plan.lengthBars = lengthBars;
  const base = yield* patternSteps(plan, phrase.id, lengthBars);
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
export function buildLooperPhrase(phrase: Phrase, options: { lengthBars?: number } = {}): CachedLooperPhrase {
  return complete(phraseSteps(phrase, options.lengthBars));
}
/** Fresh recordings yield between small groups so preparation does not starve Cyclist.
 * sliceMs is an elapsed budget, not a promise about OS pauses or one expression curve.
 */
export async function prepareLooperPhrase(phrase: Phrase, options: {
  sliceMs?: number;
  yieldToScheduler?: () => Promise<void>;
  onSlice?: (elapsedMs: number) => void;
  /** Whole-bar membership length, normally the domain's `phraseLengthBars`. */
  lengthBars?: number;
} = {}): Promise<CachedLooperPhrase> {
  const budget = options.sliceMs ?? 2;
  if (!Number.isFinite(budget) || budget <= 0) throw new RangeError('Slice budget must be positive');
  const yieldToScheduler = options.yieldToScheduler ?? (() => new Promise(resolve => setTimeout(resolve, 0)));
  const steps = phraseSteps(phrase, options.lengthBars);
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
  // Convert once: Strudel would otherwise build these Fractions from floats on every query.
  return pattern.fast(Fraction(rate)).late(Fraction(offsetBars)).withContext(context => ({ ...context, looperKey: key, looperMode: mode }));
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
