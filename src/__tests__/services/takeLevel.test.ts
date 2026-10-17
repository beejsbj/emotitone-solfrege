import { describe, expect, it } from 'vitest';
import { m } from '@strudel/mini';
import { transpiler } from '@strudel/transpiler';
import '@strudel/tonal';
import { LiveAudioCore } from '@/audio/live/core';
import type { PreparedLiveInstrument } from '@/audio/live/types';
import { buildPatternMember } from '@/services/patternMember';
import { logNotesToStrudel } from '@/services/StrudelNotation';
import type { LogNote } from '@/types/patterns';

/**
 * BJS-556: a recorded take plays with its loudest note at full level and its
 * soft-to-loud shape intact. Measured on the rendered PCM of the real render
 * core, fed the table the app builds from the stored notes.
 */
const RATE = 8000;
const QUANTUM = 128;
const sine: PreparedLiveInstrument = { kind: 'oscillator', instrumentId: 'sine', waveform: 'sine',
  gain: 1, attack: .001, decay: .01, sustain: .5, release: .01 };

function note(pitch: string, start: number, duration: number, velocity?: number, extra: Partial<LogNote> = {}): LogNote {
  return { id: `${pitch}-${start}`, note: pitch, pressTime: start, releaseTime: start + duration, duration,
    octave: 4, scaleIndex: 0, key: 'C', mode: 'major', instrument: 'sine',
    ...(velocity === undefined ? {} : { velocity }), ...extra } as LogNote;
}

/** One note every 500 ms at 120 bpm: one note per half bar. */
const take = (velocities: (number | undefined)[]) =>
  velocities.map((velocity, index) => note('C4', index * 500, 400, velocity));

/** Render a stored take through the real core; return the RMS level of each 500 ms slot. */
function slotLevels(notes: LogNote[], count = notes.length) {
  const { table } = buildPatternMember({ id: 'take', generation: 1, notes, config: { sourceBpm: 120, bpm: 120 },
    instrumentId: 'sine', instrument: 'sine', key: 'C', mode: 'major' });
  const core = new LiveAudioCore(RATE, () => {});
  core.command({ type: 'prepare', requestId: 0, instrument: sine }, 0);
  core.command({ type: 'transport-start', requestId: 1, run: 1, bpm: 120 }, 0);
  core.command({ type: 'transport-change', requestId: 2, change: { type: 'join', member:
    { table, offsetBars: 0, rate: 1, muted: false } }, boundary: 'immediate' }, 0);
  const pcm: number[] = [];
  for (let frame = 0; frame < 0.5 * count * RATE; frame += QUANTUM) {
    const output = [new Float32Array(QUANTUM), new Float32Array(QUANTUM)];
    core.render(output, frame);
    pcm.push(...output[0]);
  }
  // RMS of the sustained part of each slot: independent of oscillator phase at the attack.
  const rms = (from: number, to: number) => {
    let sum = 0;
    for (let index = from; index < to; index++) sum += pcm[index] ** 2;
    return Math.sqrt(sum / (to - from));
  };
  return Array.from({ length: count }, (_, index) =>
    rms(Math.round((index * 500 + 100) * RATE / 1000), Math.round((index * 500 + 350) * RATE / 1000)));
}

/** A velocity-free note: what the app plays at full level today. */
const reference = () => slotLevels(take([undefined]), 1)[0];

describe('take level at the playback seam', () => {
  it('raises a soft take so its loudest note matches a full-level note', () => {
    expect(reference()).toBeGreaterThan(0);
    expect(Math.max(...slotLevels(take([.2, .1, .15])))).toBeCloseTo(reference(), 3);
  });

  it('keeps the exact soft-to-loud ratios of the performance', () => {
    const [a, b, c] = slotLevels(take([.2, .1, .15]));
    expect(b / a).toBeCloseTo(.5, 2);
    expect(c / a).toBeCloseTo(.75, 2);
  });

  it('plays a soft take and the same take played louder identically', () => {
    const quiet = slotLevels(take([.2, .1]));
    const loud = slotLevels(take([.8, .4]));
    quiet.forEach((peak, index) => expect(peak).toBeCloseTo(loud[index], 4));
  });

  it('plays an evenly soft take at full level', () => {
    const [first, second] = slotLevels(take([.3, .3]));
    expect(first / reference()).toBeCloseTo(1, 2);
    expect(second / reference()).toBeCloseTo(1, 2);
  });

  it('leaves a take without velocity, or with a full-level note, as it was played', () => {
    const [first, second] = slotLevels(take([undefined, undefined]));
    expect(first).toBeCloseTo(reference(), 4);
    expect(second / first).toBeCloseTo(1, 2);
    const [loud, soft] = slotLevels(take([1, .4]));
    expect(loud).toBeCloseTo(reference(), 4);
    expect(soft / loud).toBeCloseTo(.4, 2);
  });

  it('normalises the whole take, chord lanes included', () => {
    // The chord's E4 is the loudest note of the take; its C4 and the later C4 keep their ratios to it.
    const chord = [note('C4', 0, 400, .1), note('E4', 0, 400, .3), note('C4', 500, 400, .15)];
    const [first, second] = slotLevels(chord, 2);
    const [solo] = slotLevels([note('E4', 0, 400, .3)], 1);
    // Alone, a .3 note is the whole take and plays at full level; in the chord it is full level too.
    expect(solo / reference()).toBeCloseTo(1, 2);
    expect(second / first).toBeGreaterThan(0);
    // The two slots are one chord (E4 full, C4 a third of it) and a single C4 at half of full.
    expect(first).toBeGreaterThan(reference() * .9);
    expect(second / reference()).toBeCloseTo(.5, 1);
  });

  it('keeps a recorded gain curve as a multiplier on the normalised note', () => {
    const curved = (velocity: number) => [{ ...note('C4', 0, 400, velocity),
      gainExpression: [{ timeMs: 0, gain: 1 }, { timeMs: 200, gain: .5 }, { timeMs: 400, gain: .5 }] },
      note('C4', 500, 400, velocity * 2)];
    const quiet = slotLevels(curved(.2));
    const loud = slotLevels(curved(.4));
    quiet.forEach((peak, index) => expect(peak).toBeCloseTo(loud[index], 4));
  });

  it('does not rewrite the stored notes', () => {
    const stored = take([.2, .1]);
    const before = JSON.stringify(stored);
    buildPatternMember({ id: 'take', generation: 1, notes: stored, config: { sourceBpm: 120, bpm: 120 },
      instrumentId: 'sine', instrument: 'sine', key: 'C', mode: 'major' });
    logNotesToStrudel(stored);
    expect(JSON.stringify(stored)).toBe(before);
  });
});

describe('take level in the exported Strudel text', () => {
  function gains(notes: LogNote[], notationType: 'absolute' | 'relative' = 'absolute') {
    const code = logNotesToStrudel(notes, { sourceBpm: 120, bpm: 120, notationType });
    const pattern = new Function('m', transpiler(code).output)(m);
    return pattern.queryArc(0, 8).filter((hap: any) => hap.hasOnset())
      .sort((a: any, b: any) => Number(a.whole.begin) - Number(b.whole.begin))
      .map((hap: any) => hap.value.gain as number | undefined);
  }

  it.each(['absolute', 'relative'] as const)('carries the normalised gains (%s)', notationType => {
    expect(gains(take([.2, .1, .15]), notationType).slice(0, 3)).toEqual([
      expect.closeTo(.8), expect.closeTo(.4), expect.closeTo(.6)]);
  });

  it('writes the same ratios the transport plays', () => {
    const exported = gains(take([.5, .25]));
    const [a, b] = slotLevels(take([.5, .25]));
    expect(b / a).toBeCloseTo(exported[1]! / exported[0]!, 2);
  });

  it('keeps a velocity-free take as it is today', () => {
    expect(logNotesToStrudel(take([undefined, undefined]))).not.toContain('gain');
  });

  it('writes an evenly soft take as the full-level text, with no gain column', () => {
    expect(logNotesToStrudel(take([.3, .3]))).toBe(logNotesToStrudel(take([undefined, undefined])));
  });
});
