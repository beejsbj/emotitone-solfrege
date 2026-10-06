import { beforeAll, describe, expect, it } from 'vitest';
import * as core from '@strudel/core';
import * as mini from '@strudel/mini';
import * as tonal from '@strudel/tonal';
import { transpiler } from '@strudel/transpiler';
import { planRecordedPattern, approximateRecordedDegree } from '@/services/recordedPatternPlan';
import { patternFromPlan, buildLooperPhrase, prepareLooperPhrase, memberPattern } from '@/audio/looper/patternBuilder';
import { logNotesToStrudel } from '@/services/StrudelNotation';
import type { PatternNote, LogNote } from '@/types/patterns';
import type { Phrase } from '@/types/phrases';
import type { LooperMember } from '@/types/looperTransport';
import type { StrudelConfig } from '@/services/StrudelNotation';

const shape = { cutoff: 8300, resonance: 1.4, room: .13, delay: .1, attack: null, release: null };
const note = (id: string, pitch: string, index: number, at: number, duration: number): PatternNote => ({
  id, note: pitch, scaleIndex: index, scaleDegree: index + 1, octave: Number(pitch.at(-1)),
  pressTime: at, releaseTime: at + duration, duration,
});
const logs = (notes: PatternNote[]): LogNote[] => notes.map(n => ({ ...n, key: 'C', mode: 'major',
  instrument: 'sine', sessionId: 'test', solfege: { name: 'Do', number: 1, emotion: '', description: '', texture: '' } }));
const phrase = (notes: PatternNote[], duration = 8000): Phrase => ({ id: 'p', shelf: 'kept', notes, duration, createdAt: 0,
  context: { key: 'C', mode: 'major', octave: 4, bpm: 120, instrument: 'sine', shape } });
const pitch = [0, 30, -30, 30, -30, 30, -30].map((cents, i) => ({ cents, timeMs: i * 50 }));
const gain = [1, 1.3, .8, 1.3, .8, 1.3, .8].map((gain, i) => ({ gain, timeMs: i * 50 }));
const fixtures: [string, PatternNote[]][] = [
  ['sequential and rests', [note('a', 'C4', 0, 900, 210), note('b', 'D4', 1, 1450, 330)]],
  ['borrowed and octave', [note('a', 'C4', 0, 0, 350), note('b', 'F#4', -1, 600, 700), note('c', 'C5', 0, 1500, 500)]],
  ['chord', [note('a', 'C4', 0, 0, 600), note('b', 'E4', 2, 0, 600), note('c', 'G4', 4, 1200, 500)]],
  ['overlap lanes with boundary rounding', [note('a', 'C4', 0, 0, 1327.37), note('b', 'D4', 1, 114.73, 114), note('c', 'E4', 2, 258.51, 531.93)]],
  ['long held', [note('a', 'G3', 4, 0, 3400), note('b', 'D4', 1, 2900, 220)]],
  ['recorded articulation and expression', [
    { ...note('a', 'C4', 0, 0, 500), articulation: { attack: .004, decay: .1, sustain: .7, release: .06 }, pitchExpression: pitch },
    { ...note('b', 'E4', 2, 515, 700), articulation: { attack: .01, decay: .03, sustain: .4, release: .08 }, gainExpression: gain },
    { ...note('c', 'G4', 4, 580, 800), pitchExpression: pitch, gainExpression: gain },
  ]],
];
const stream = (pattern: core.Pattern) => pattern.queryArc(0, 8).map(h => ({
  begin: Number(h.whole!.begin), end: Number(h.whole!.end), partBegin: Number(h.part.begin), partEnd: Number(h.part.end), value: h.value,
})).sort((a, b) => a.begin - b.begin || a.end - b.end || JSON.stringify(a.value).localeCompare(JSON.stringify(b.value)));

beforeAll(async () => { await core.evalScope(core, mini, tonal); });

describe('direct Pattern construction equivalence to export', () => {
  it.each(fixtures)('%s across eight cycles in absolute and relative notation', async (_, notes) => {
    for (const notationType of ['absolute', 'relative'] as const) {
      const options: Partial<StrudelConfig> = { notationType, sourceBpm: 120, bpm: 120, precision: 4, sound: 'sine', shape };
      const code = logNotesToStrudel(logs(notes), options).replace(/\.cpm\([^)]*\)$/, '');
      const exported = (await core.evaluate(code, transpiler)).pattern;
      const plan = planRecordedPattern(logs(notes), options);
      const direct = patternFromPlan(plan, 'fixture');
      const actual = stream(plan.relative ? direct.scale(core.pure(plan.scale)) : direct), expected = stream(exported);
      expect(actual).toHaveLength(expected.length);
      actual.forEach((hap, i) => {
        expect(hap.value).toEqual(expected[i].value);
        for (const field of ['begin', 'end', 'partBegin', 'partEnd'] as const) expect(hap[field]).toBeCloseTo(expected[i][field], 9);
      });
      expect(direct.queryArc(0, 8).every(h => h.context.phraseId === 'fixture' && notes.some(n => n.id === h.context.noteId))).toBe(true);
    }
  });
  it('yields fresh dense construction and preserves the synchronous hap stream', async () => {
    const source = phrase(Array.from({ length: 512 }, (_, i) => note(String(i), 'C4', 0, i * 250, 160)), 512 * 250);
    let yields = 0;
    const async = await prepareLooperPhrase(source, { sliceMs: .001,
      yieldToScheduler: async () => { yields++; } });
    expect(yields).toBeGreaterThan(10);
    const sync = buildLooperPhrase(source);
    expect(stream(async.base)).toEqual(stream(sync.base));
    expect(async.lengthBars).toBe(64);
  });
  it('builds whole-bar independent periods and keeps offset on the shared grid', () => {
    const cached = buildLooperPhrase(phrase([note('a', 'C4', 0, 0, 150), note('b', 'E4', 2, 4500, 200)], 5100));
    expect(cached.lengthBars).toBe(3);
    for (const rate of [.5, 1, 2] as const) {
      const member: LooperMember = { phrase: cached, phraseId: 'p', base: cached.base, lengthBars: 3, rate, offsetBars: .375, pinned: true, muted: false };
      const haps = memberPattern(member, 'D', 'minor', 120).queryArc(0, 12).filter(h => h.hasOnset());
      const expected = Array.from({ length: 20 }, (_, j) => { const i = j - 2; return [.375 + i * 3 / rate, .375 + (2.25 + i * 3) / rate]; }).flat().filter(c => c >= 0 && c < 12);
      expect(haps.map(h => Number(h.whole!.begin)).sort((a,b)=>a-b)).toEqual(expected.sort((a,b)=>a-b));
    }
  });
  it('pins borrowed pitches, transposes them exactly with key, and approximates them only when mode changes', () => {
    const cached = buildLooperPhrase(phrase([note('a', 'F#4', -1, 0, 500)]));
    const member: LooperMember = { phrase: cached, phraseId: 'p', base: cached.base, lengthBars: 4, rate: 1, offsetBars: 0, pinned: false, muted: false };
    expect(memberPattern(member, 'D', 'major', 120).queryArc(0, 1)[0].value.note).toBe('Ab4');
    expect(memberPattern({ ...member, pinned: true }, 'D', 'minor', 120).queryArc(0, 1)[0].value.note).toBe('F#4');
    expect(approximateRecordedDegree({ ...cached.notes[0], key: 'C', mode: 'major' }, cached.plan.config, cached.notes[0])).toBe(3);
    expect(memberPattern(member, 'D', 'minor', 120).queryArc(0, 1)[0].value.note).toBe('G4');
  });
  it('preserves octave cycles when bending to a scale with fewer degrees', () => {
    const cached = buildLooperPhrase(phrase([note('a', 'C5', 0, 0, 500)]));
    const member: LooperMember = { phrase: cached, phraseId: 'p', base: cached.base, lengthBars: 4, rate: 1, offsetBars: 0, pinned: false, muted: false };
    expect(memberPattern(member, 'D', 'major pentatonic', 120).queryArc(0, 1)[0].value.note).toBe('D5');
  });
  it('stretches captured expression from immutable values and preserves Shape envelope times', () => {
    const source = phrase([{ ...note('a', 'C4', 0, 0, 700), pitchExpression: pitch, gainExpression: gain,
      articulation: { attack: .006, decay: .02, sustain: .5, release: .08 } }, note('b', 'D4', 1, 1200, 300)]);
    const before = JSON.stringify(source);
    const cached = buildLooperPhrase(source);
    const member: LooperMember = { phrase: cached, phraseId: 'p', base: cached.base, lengthBars: 4, rate: 2, offsetBars: 0, pinned: true, muted: false };
    const values = memberPattern(member, 'C', 'major', 180).queryArc(0, 1).map(h => h.value);
    expect(values[0]).toMatchObject({ attack: .002, release: .08 / 3, vib: 30, tremolo: 30 });
    expect(values[1].release).toBe(.12);
    const invalidSource = phrase([{ ...note('invalid', 'C4', 0, 0, 700), articulation: { attack: NaN, decay: .01, sustain: .5, release: NaN } }]);
    const invalidCached = buildLooperPhrase(invalidSource);
    const fallback = memberPattern({ ...member, phrase: invalidCached }, 'C', 'major', 180).queryArc(0, 1)[0].value;
    expect(fallback.attack).toBe(.003);
    expect(fallback.release).toBe(.12);
    expect(JSON.stringify(source)).toBe(before);
  });
});
