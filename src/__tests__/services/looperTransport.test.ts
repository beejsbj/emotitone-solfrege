import { describe, expect, it } from 'vitest';
import { silence, type Pattern } from '@strudel/core';
import { createLooperTransport, buildLooperPhrase } from '@/services/looperTransport';
import { UIBeatClock } from '@/composables/useUIBeat';
import type { LooperPlaybackPort, LooperScheduler } from '@/types/looperTransport';
import type { Phrase } from '@/types/phrases';

function rig() {
  const context = { currentTime: 10, state: 'running' as AudioContextState, baseLatency: .01, outputLatency: .04 };
  const scheduler: LooperScheduler = { started: false, cps: .5, lastBegin: .375, lastEnd: .4,
    lastTick: 10.5, latency: .1, clock: { duration: .05 }, pattern: silence,
    now: () => -999, setCps(cps) { this.cps = cps; } };
  let draw: (raw: number) => void = () => undefined;
  let claims = 0, starts = 0, stops = 0, replacements = 0;
  const fail = { ready: false, set: false, stop: false };
  let unsubscriptions = 0;
  const beat = new UIBeatClock({ observeEnvironment: false, documentVisible: () => true, reducedMotion: () => false });
  const playback: LooperPlaybackPort = {
    scheduler, ready: async () => { if (fail.ready) throw new Error('preparation failed'); },
    async setPattern(pattern: Pattern, autostart: boolean) {
      if (fail.set) throw new Error('install failed');
      replacements++; scheduler.pattern = pattern;
      if (autostart) { scheduler.started = true; starts++; }
    },
    invalidate: () => undefined,
    stop() { scheduler.started = false; stops++; if (fail.stop) throw new Error('stop failed'); },
    onFrame(fn) { draw = fn; return () => { unsubscriptions++; draw = () => undefined; }; },
    onStop: () => () => { unsubscriptions++; },
    claim() { if (claims) throw new Error('claimed'); claims++; return () => { claims--; }; },
  };
  const service = createLooperTransport({ playback, audioContext: () => context,
    clock: { fromEpochTime: epoch => epoch - 100000 }, beat, bpm: 120 });
  return { service, context, scheduler, beat, fail, draw: (raw = -999) => draw(raw),
    counts: () => ({ claims, starts, stops, replacements, unsubscriptions }) };
}
function cached(id: string, duration = 4000) {
  const phrase: Phrase = { id, shelf: 'kept', createdAt: 0, duration: 4000,
    context: { key: 'C', mode: 'major', instrument: 'sine', bpm: 120, octave: 4,
      shape: { cutoff: 12000, resonance: 0, room: 0, delay: 0, attack: null, release: null } },
    notes: [{ id: `${id}-note`, note: 'C4', octave: 4, scaleIndex: 0, scaleDegree: 1,
      pressTime: 0, releaseTime: duration, duration }] };
  return buildLooperPhrase(phrase);
}

describe('Looper scheduler adapter', () => {
  it('starts once, joins/leaves without restarting, and retains the UIBeat generation', async () => {
    const r = rig();
    await r.service.join(cached('a'));
    await r.service.start();
    const gen = r.beat.snapshot.generation;
    const join = await r.service.join(cached('b'));
    expect(join.boundaryBar).toBe(.4);
    expect(join.boundaryAudioTime).toBeCloseTo(10.65);
    await r.service.leave('b');
    expect(r.counts()).toMatchObject({ starts: 1, stops: 0, claims: 1 });
    expect(r.beat.snapshot.generation).toBe(gen);
    await r.service.stop();
    expect(r.counts()).toMatchObject({ starts: 1, stops: 1, claims: 0 });
    expect(r.service.position()).toBe(0);
    await r.service.dispose();
  });
  it('coalesces future changes, filters whole onsets and retires the old branch after the frontier', async () => {
    const r = rig(); await r.service.join(cached('a')); await r.service.start();
    const first = await r.service.join(cached('b', 200), {}, 'bar');
    const second = await r.service.update('b', { offsetBars: .375, rate: 2 }, 'bar');
    expect(first.boundaryBar).toBe(1); expect(second.boundaryBar).toBe(1);
    const transition = r.scheduler.pattern!;
    const events = transition.queryArc(.5, 3);
    // A's long gate crosses B but has no extra onset at B.
    expect(events.filter(h => h.context.phraseId === 'a' && h.hasOnset() && Number(h.whole!.begin) === 1)).toHaveLength(0);
    expect(events.filter(h => h.context.phraseId === 'b').every(h => Number(h.whole!.begin) >= 1)).toBe(true);
    expect(r.service.memberPosition('b')).toBeNull();
    r.scheduler.lastEnd = 1.1; r.draw();
    await Promise.resolve(); await Promise.resolve();
    expect(r.scheduler.pattern).not.toBe(transition);
    expect(r.service.memberPosition('b')).toBeNull();
    r.context.currentTime = 12;
    r.draw();
    expect(r.service.memberPosition('b')).toMatchObject({ audible: true });
    expect(r.service.snapshot().pendingBoundary).toBeUndefined();
    await r.service.dispose();
  });
  it('rejects committed or conflicting boundaries without changing members', async () => {
    const r = rig(); await r.service.join(cached('a')); await r.service.start();
    await expect(r.service.join(cached('b'), {}, { bar: 0 })).rejects.toThrow('frontier');
    expect(r.service.snapshot().members.map(m => m.phraseId)).toEqual(['a']);
    await r.service.join(cached('b'), {}, { bar: 1 });
    await expect(r.service.update('b', { rate: 2 }, { bar: 2 })).rejects.toThrow('pending');
    expect(r.service.snapshot().members.find(m => m.phraseId === 'b')?.rate).toBe(1);
    await r.service.dispose();
  });
  it('mute and solo preserve silent members phase and allow gates to finish', async () => {
    const r = rig(); await r.service.join(cached('a')); await r.service.join(cached('b')); await r.service.start();
    await r.service.solo('b');
    expect(new Set(r.scheduler.pattern!.queryArc(0, 4).map(h => h.context.phraseId))).toEqual(new Set(['b']));
    await r.service.solo(null); await r.service.update('b', { muted: true });
    expect(r.service.snapshot().members).toHaveLength(2);
    expect(new Set(r.scheduler.pattern!.queryArc(0, 4).map(h => h.context.phraseId))).toEqual(new Set(['a']));
    await r.service.update('b', { muted: false });
    expect(new Set(r.scheduler.pattern!.queryArc(0, 4).map(h => h.context.phraseId))).toEqual(new Set(['a', 'b']));
    expect(r.counts()).toMatchObject({ starts: 1, stops: 0 });
    await r.service.dispose();
  });
  it('uses anchored audio position and latency/calibration conversion through tempo changes', async () => {
    const r = rig(); await r.service.join(cached('a')); await r.service.start();
    r.context.currentTime = 10.6;
    expect(r.service.position()).toBeCloseTo(.375);
    const gen = r.beat.snapshot.generation;
    const change = await r.service.setTempo(180);
    expect(change).toEqual({ boundaryBar: .4, boundaryAudioTime: 10.65 });
    expect(r.service.position()).toBeCloseTo(.375);
    r.service.setCalibrationMs(20);
    expect(r.service.eventPosition(110670)).toBeCloseTo(.375);
    r.context.currentTime = 10.85; r.draw();
    expect(r.service.position()).toBeCloseTo(.55);
    expect(r.beat.snapshot.generation).toBe(gen);
    expect(r.beat.snapshot.barPosition).toBeCloseTo(.55);
    expect(r.beat.snapshot.bpm).toBe(180);
    await r.service.dispose();
  });
  it('retains effective membership through rapid frontiers before the audio catches up', async () => {
    const r = rig(); await r.service.join(cached('a')); await r.service.start();
    await r.service.join(cached('b'), {}, 'bar');
    r.scheduler.lastEnd = 1.1; r.draw();
    await Promise.resolve(); await Promise.resolve();
    await r.service.join(cached('c'));
    expect(r.service.snapshot().effectiveMembers.map(m => m.phraseId)).toEqual(['a']);
    r.context.currentTime = 12.04; // bar 1.095, between the two membership boundaries
    expect(r.service.snapshot().effectiveMembers.map(m => m.phraseId)).toEqual(['a', 'b']);
    r.context.currentTime = 12.1;
    expect(r.service.snapshot().effectiveMembers.map(m => m.phraseId)).toEqual(['a', 'b', 'c']);
    await r.service.dispose();
  });
  it('keeps a pending musical handoff while tempo stretches both branches from captured controls', async () => {
    const r = rig();
    await r.service.join(cached('a')); await r.service.start();
    await r.service.join(cached('b', 200), {}, 'bar');
    await r.service.setTempo(180);
    expect(r.service.snapshot().pendingBoundary).toBe(1);
    expect(r.scheduler.pattern!.queryArc(0, 1).every(h => h.context.phraseId === 'a')).toBe(true);
    expect(new Set(r.scheduler.pattern!.queryArc(2, 3).map(h => h.context.phraseId))).toEqual(new Set(['a', 'b']));
    const at = r.service.position();
    await r.service.setTempo(90);
    expect(r.service.position()).toBe(at);
    expect(r.beat.snapshot.generation).toBe(r.service.snapshot().generation);
    await r.service.dispose();
  });
  it('honors a tempo chosen before start and reports external scheduler stops', async () => {
    const r = rig(); await r.service.join(cached('a')); await r.service.setTempo(90); await r.service.start();
    expect(r.scheduler.cps).toBe(90 / 240);
    r.scheduler.started = false; r.draw();
    await Promise.resolve(); await Promise.resolve();
    expect(r.service.snapshot().running).toBe(false);
    expect(r.counts().claims).toBe(0);
    await r.service.dispose();
  });
  it('never retires a rejected handoff into sounding membership', async () => {
    const r = rig(); await r.service.join(cached('a')); await r.service.start();
    const prior = r.scheduler.pattern;
    r.fail.set = true;
    await expect(r.service.join(cached('b'), {}, 'bar')).rejects.toThrow('install failed');
    expect(r.service.snapshot().pendingBoundary).toBeUndefined();
    r.fail.set = false; r.scheduler.lastEnd = 1.1; r.context.currentTime = 12.1; r.draw();
    await Promise.resolve(); await Promise.resolve();
    expect(r.scheduler.pattern).toBe(prior);
    expect(r.service.snapshot().members.map(m => m.phraseId)).toEqual(['a']);
    await r.service.dispose();
  });
  it('rolls back a rejected tempo update without changing position or the queued membership', async () => {
    const r = rig(); await r.service.join(cached('a')); await r.service.start();
    await r.service.join(cached('b'), {}, 'bar');
    const position = r.service.position(), pattern = r.scheduler.pattern;
    r.fail.set = true;
    await expect(r.service.setTempo(180)).rejects.toThrow('install failed');
    expect(r.service.snapshot()).toMatchObject({ bpm: 120, pendingBoundary: 1 });
    expect(r.service.position()).toBe(position);
    expect(r.scheduler.cps).toBe(.5); expect(r.scheduler.pattern).toBe(pattern);
    r.fail.set = false; await r.service.dispose();
  });
  it('releases startup ownership even when cleanup fails, and always unsubscribes on disposal', async () => {
    const r = rig(); r.fail.ready = true; r.fail.stop = true;
    await expect(r.service.start()).rejects.toThrow('preparation failed');
    expect(r.counts().claims).toBe(0);
    expect(r.beat.snapshot.status).toBe('idle');
    r.fail.ready = false; r.fail.stop = false; await r.service.start();
    r.fail.stop = true;
    await expect(r.service.dispose()).rejects.toThrow('stop failed');
    expect(r.counts()).toMatchObject({ claims: 0, unsubscriptions: 2 });
    await expect(r.service.start()).rejects.toThrow('disposed');
  });
  it('refuses to take over a running Code Strip and can recover after a rejected start', async () => {
    const r = rig(); r.scheduler.started = true;
    await expect(r.service.start()).rejects.toThrow('Code Strip');
    expect(r.counts().claims).toBe(0);
    r.scheduler.started = false;
    await r.service.start();
    await r.service.dispose();
  });
});
