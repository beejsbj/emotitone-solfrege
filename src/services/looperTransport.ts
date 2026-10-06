import { stack, silence, type Pattern } from '@strudel/core';
import { uiBeatClock } from '@/composables/useUIBeat';
import { memberPattern } from '@/audio/looper/patternBuilder';
import { LooperTempoMap, eventBarPosition } from '@/audio/looper/tempoMap';
import type { ChromaticNote, MusicalMode } from '@/types/music';
import type { CachedLooperPhrase, LooperMember, LooperMemberSettings, LooperBoundary,
  LooperChangeReceipt, LooperTransportOptions } from '@/types/looperTransport';

export { buildLooperPhrase, prepareLooperPhrase } from '@/audio/looper/patternBuilder';
export type { CachedLooperPhrase, LooperMember, LooperChangeReceipt, LooperTransportOptions } from '@/types/looperTransport';

const validBpm = (bpm: number) => {
  if (!Number.isFinite(bpm) || bpm <= 0) throw new RangeError('Tempo must be positive');
};
const validateSettings = (settings: Partial<LooperMemberSettings>) => {
  if (settings.offsetBars !== undefined && !Number.isFinite(settings.offsetBars)) throw new RangeError('Offset must be finite');
  if (settings.rate !== undefined && ![.5, 1, 2].includes(settings.rate)) throw new RangeError('Rate must be 0.5, 1 or 2');
};

/** One opt-in consumer of createPatternEditor's scheduler. No UI/store integration.
 * Membership only changes future onsets: submitted gates and release tails finish.
 */
export function createLooperTransport(options: LooperTransportOptions) {
  const { playback, audioContext, clock } = options;
  const beat = options.beat ?? uiBeatClock;
  const tempo = new LooperTempoMap();
  let tempoChosen = options.bpm !== undefined;
  let bpm = options.bpm ?? 120, key = options.key ?? 'C', mode = options.mode ?? 'major';
  validBpm(bpm);
  let calibrationMs = 0, generation: number | undefined;
  let disposed = false;
  const errors: string[] = [];
  let running = false, releaseClaim: (() => void) | undefined;
  let members = new Map<string, LooperMember>();
  let effectiveMembers = new Map<string, LooperMember>();
  let soloId: string | null = null;
  let current: Pattern = silence;
  type StackState = { members: Map<string, LooperMember>; soloId: string | null; key: ChromaticNote; mode: MusicalMode };
  const desiredState = (): StackState => ({ members: new Map(members), soloId, key, mode });
  let history: { boundary: number; state: StackState }[] = [];
  let currentState: StackState = desiredState();
  let pending: { boundary: number; old: Pattern; oldState: StackState; next: Pattern; nextState: StackState } | undefined;
  let retireQueued = false;
  let effectiveSoloId: string | null = null;
  let lastChange: LooperChangeReceipt | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  const transformed = new WeakMap<CachedLooperPhrase, Map<string, Pattern>>();

  const serialize = <T>(job: () => Promise<T> | T, allowDisposed = false): Promise<T> => {
    const result = queue.then(() => {
      if (disposed && !allowDisposed) throw new Error('Looper transport was disposed');
      return job();
    });
    queue = result.catch(() => undefined);
    return result;
  };
  function compose(state = desiredState()): Pattern {
    const { members, soloId, key, mode } = state;
    return stack(...[...members.values()].filter(m => !m.muted && (!soloId || m.phraseId === soloId)).map(m => {
      let cache = transformed.get(m.phrase);
      if (!cache) { cache = new Map(); transformed.set(m.phrase, cache); }
      const id = `${key}:${mode}:${bpm}:${m.rate}:${m.offsetBars}:${m.pinned}`;
      let pattern = cache.get(id);
      if (!pattern) {
        pattern = memberPattern(m, key, mode, bpm);
        // Bound the per-phrase transform cache during repeated dial changes.
        if (cache.size >= 32) cache.delete(cache.keys().next().value!);
        cache.set(id, pattern);
      }
      return pattern;
    }));
  }
  function finishEffectiveMembership() {
    const at = position();
    let latest = -1;
    history.forEach((entry, index) => { if (entry.boundary <= at) latest = index; });
    if (latest < 0) return;
    effectiveMembers = history[latest].state.members;
    effectiveSoloId = history[latest].state.soloId;
    if (latest > 0) history = history.slice(latest);
  }
  async function retire() {
    const handoff = pending;
    if (!handoff || playback.scheduler.lastEnd < handoff.boundary) return;
    // The scheduler has queried the handoff. Retain its presentation membership
    // until the audio clock reaches it; retirement only drops the old Pattern.
    await playback.setPattern(handoff.next, false);
    current = handoff.next;
    currentState = handoff.nextState;
    pending = undefined;
    playback.invalidate();
  }
  function position(): number {
    if (!running) return 0;
    return Math.max(0, tempo.barAt(audioContext().currentTime));
  }
  function frame(rawPosition: number) {
    if (!running || generation === undefined) return;
    if (!playback.scheduler.started) { void stop().catch(error => errors.push(String(error))); return; }
    if (audioContext().state !== 'running') { beat.suspend(generation); return; }
    finishEffectiveMembership();
    beat.publish(generation, { rawPosition, barPosition: position() });
    if (pending && playback.scheduler.lastEnd >= pending.boundary && !retireQueued) {
      retireQueued = true;
      void serialize(retire).catch(error => errors.push(String(error))).finally(() => { retireQueued = false; });
    }
  }
  let unsubscribe = playback.onFrame(frame);
  const unsubscribeStop = playback.onStop(() => { if (running) void stop().catch(error => errors.push(String(error))); });

  async function replace(policy: LooperBoundary, started: number, requested: number): Promise<LooperChangeReceipt> {
    if (pending && playback.scheduler.lastEnd >= pending.boundary) await retire();
    const next = compose();
    const scheduler = playback.scheduler;
    if (!running) {
      current = next; currentState = desiredState();
      effectiveMembers = new Map(members); effectiveSoloId = soloId;
      return { boundaryBar: 0, boundaryAudioTime: audioContext().currentTime,
        requestedAudioTime: requested, preparationAndSwapMs: performance.now() - started, policy: 'immediate' };
    }
    finishEffectiveMembership();
    let boundary: number;
    if (policy === 'immediate') {
      boundary = scheduler.lastEnd;
      await playback.setPattern(next, false);
      pending = undefined;
      current = next; currentState = desiredState();
    } else {
      const proposed = typeof policy === 'object' ? policy.bar : Math.floor(scheduler.lastEnd) + 1;
      if (!Number.isFinite(proposed) || !Number.isInteger(proposed) || proposed <= scheduler.lastEnd) {
        throw new RangeError('Bar boundary must be an integer beyond the committed query frontier');
      }
      // Changes made before a queued handoff share its boundary and its original
      // branch. A different explicit boundary is rejected instead of building chains.
      const queued = pending && pending.boundary > scheduler.lastEnd ? pending : undefined;
      if (queued && typeof policy === 'object' && proposed !== queued.boundary) {
        throw new RangeError('A different bar handoff is already pending');
      }
      boundary = queued?.boundary ?? proposed;
      const oldState = queued?.oldState ?? currentState;
      const old = queued?.old ?? current;
      const transition = stack(old.filterHaps(h => Boolean(h.whole && Number(h.whole.begin) < boundary)),
        next.filterHaps(h => Boolean(h.whole && Number(h.whole.begin) >= boundary)));
      await playback.setPattern(transition, false);
      pending = { boundary, old, oldState, next, nextState: desiredState() };
      current = transition;
    }
    history = history.filter(entry => entry.boundary < boundary);
    history.push({ boundary, state: desiredState() });
    playback.invalidate();
    lastChange = { boundaryBar: boundary, boundaryAudioTime: tempo.timeAt(boundary), requestedAudioTime: requested,
      preparationAndSwapMs: performance.now() - started, policy: policy === 'immediate' ? 'immediate' : 'bar' };
    return { ...lastChange };
  }
  function change(mutate: () => void, policy: LooperBoundary): Promise<LooperChangeReceipt> {
    const requested = audioContext().currentTime;
    return serialize(async () => {
      const started = performance.now();
      // A rejected handoff must not alter desired membership/configuration.
      const before = { members: new Map(members), soloId, key, mode };
      try { mutate(); return await replace(policy, started, requested); }
      catch (error) { members = before.members; soloId = before.soloId; key = before.key; mode = before.mode; throw error; }
    });
  }
  async function stop() {
    return serialize(async () => {
      if (!running && !releaseClaim) return;
      running = false;
      pending = undefined; history = [];
      try { await playback.stop(); }
      finally {
        beat.stop(generation); generation = undefined;
        releaseClaim?.(); releaseClaim = undefined;
        effectiveMembers = new Map(members); effectiveSoloId = soloId;
      }
    }, true);
  }
  return {
    join(phrase: CachedLooperPhrase, settings: Partial<LooperMemberSettings> = {}, policy: LooperBoundary = 'immediate') {
      validateSettings(settings);
      return change(() => {
        members.set(phrase.phraseId, { phrase, phraseId: phrase.phraseId, base: phrase.base, lengthBars: phrase.lengthBars,
          offsetBars: 0, rate: 1, pinned: false, muted: false, ...settings });
      }, policy);
    },
    leave(phraseId: string, policy: LooperBoundary = 'immediate') {
      return change(() => { members.delete(phraseId); if (soloId === phraseId) soloId = null; }, policy);
    },
    update(phraseId: string, settings: Partial<LooperMemberSettings>, policy: LooperBoundary = 'immediate') {
      validateSettings(settings);
      return change(() => {
        const member = members.get(phraseId);
        if (!member) throw new Error(`Unknown Looper member: ${phraseId}`);
        members.set(phraseId, { ...member, ...settings });
      }, policy);
    },
    solo(phraseId: string | null, policy: LooperBoundary = 'immediate') {
      return change(() => {
        if (phraseId !== null && !members.has(phraseId)) throw new Error(`Unknown Looper member: ${phraseId}`);
        soloId = phraseId;
      }, policy);
    },
    setKeyMode(nextKey: ChromaticNote, nextMode: MusicalMode, policy: LooperBoundary = 'immediate') {
      return change(() => { key = nextKey; mode = nextMode; }, policy);
    },
    setTempo(nextBpm: number) {
      validBpm(nextBpm);
      return serialize(async () => {
        tempoChosen = true;
        if (nextBpm === bpm) return;
        if (!running) { bpm = nextBpm; current = compose(); return; }
        const s = playback.scheduler;
        const at = s.lastTick + s.clock.duration + s.latency;
        const frontier = s.lastEnd;
        const previousBpm = bpm, previousAnchors = tempo.segments, previousPending = pending;
        try {
          tempo.retime(at, frontier, nextBpm / 240);
          bpm = nextBpm;
          if (pending && pending.boundary > s.lastEnd) pending = { ...pending, old: compose(pending.oldState) };
          s.setCps(bpm / 240);
          beat.retime(generation!, bpm);
          // Pending musical handoffs keep their bar; refresh both branches from
          // immutable captured controls at the new tempo.
          await replace(pending && pending.boundary > s.lastEnd ? { bar: pending.boundary } : 'immediate', performance.now(), audioContext().currentTime);
          return { boundaryBar: frontier, boundaryAudioTime: at };
        } catch (error) {
          bpm = previousBpm; pending = previousPending;
          s.setCps(bpm / 240); beat.retime(generation!, bpm);
          const [first, ...rest] = previousAnchors;
          tempo.reset(first.audioTime, first.bar, first.cps);
          for (const anchor of rest) tempo.retime(anchor.audioTime, anchor.bar, anchor.cps);
          throw error;
        }
      });
    },
    start() {
      return serialize(async () => {
        if (running) return;
        if (playback.scheduler.started) throw new Error('Stop Code Strip playback before starting the Looper');
        releaseClaim = playback.claim();
        try {
          await playback.ready();
          if (!tempoChosen && members.size) { bpm = members.values().next().value!.phrase.context.bpm; tempoChosen = true; }
          playback.scheduler.setCps(bpm / 240);
          current = compose();
          generation = beat.arm({ mappingAvailable: true, bpm, meter: { beatsPerBar: 4, beatUnit: 4 } });
          await playback.setPattern(current, true);
          const s = playback.scheduler;
          tempo.reset(s.lastTick + s.latency, s.lastBegin, bpm / 240);
          currentState = desiredState();
          history = [{ boundary: 0, state: currentState }];
          running = true; effectiveMembers = new Map(members); effectiveSoloId = soloId;
          playback.invalidate();
        } catch (error) {
          try { await playback.stop(); }
          catch (cleanupError) { errors.push(String(cleanupError)); }
          finally {
            running = false;
            beat.stop(generation); generation = undefined;
            releaseClaim?.(); releaseClaim = undefined;
          }
          throw error;
        }
      });
    },
    stop,
    async dispose() {
      disposed = true;
      try { await stop(); }
      finally { unsubscribe(); unsubscribeStop(); unsubscribe = () => undefined; }
    },
    position,
    eventPosition(epochTimestampMs: number): number {
      if (!running) throw new Error('Looper is not running');
      const context = audioContext();
      const latency = [context.baseLatency, context.outputLatency].reduce<number>((sum, v) => sum + (Number.isFinite(v) && v! >= 0 ? v! : 0), 0);
      return eventBarPosition(tempo, clock, epochTimestampMs, latency * 1000, calibrationMs);
    },
    getCalibrationMs: () => calibrationMs,
    setCalibrationMs(value: number) {
      if (!Number.isFinite(value)) throw new RangeError('Calibration must be finite');
      calibrationMs = value;
    },
    snapshot() {
      finishEffectiveMembership();
      return { running, disposed, errors: [...errors], bpm, key, mode, soloId, members: [...members.values()], effectiveMembers: [...effectiveMembers.values()],
        effectiveSoloId, pendingBoundary: history.find(entry => entry.boundary > position())?.boundary ?? pending?.boundary, generation, lastChange: lastChange && { ...lastChange } };
    },
    /** Slice 4 filters identity first, then maps rich-widget spans to local bars. */
    memberPosition(phraseId: string) {
      finishEffectiveMembership();
      const member = effectiveMembers.get(phraseId);
      return member ? { localBar: (position() - member.offsetBars) * member.rate,
        lengthBars: member.lengthBars, audible: !member.muted && (!effectiveSoloId || effectiveSoloId === phraseId) } : null;
    },
  };
}
export type LooperTransport = ReturnType<typeof createLooperTransport>;
