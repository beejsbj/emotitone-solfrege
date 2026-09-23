import { describe, expect, it } from 'vitest';
import { m } from '@strudel/mini';
import { transpiler } from '@strudel/transpiler';
import '@strudel/tonal';
import { logNotesToStrudel, type StrudelConfig } from '@/services/StrudelNotation';
import type { LogNote } from '@/types/patterns';

function note(pitch: string, start: number, duration: number): LogNote {
  return { id: `${pitch}-${start}`, note: pitch, pressTime: start,
    releaseTime: start + duration, duration, octave: 4, scaleIndex: 0,
    key: 'C', mode: 'major', instrument: 'sine' } as LogNote;
}

// Execute the complete generated code through the installed mini + transpiler.
// Query whole onsets, not fragments split at scheduler query boundaries.
function playback(notes: LogNote[], sourceBpm = 120, bpm = sourceBpm, sound = 'sine', config?: Partial<StrudelConfig>) {
  const code = logNotesToStrudel(notes, { sourceBpm, bpm, sound, ...config });
  const { output } = transpiler(code);
  const pattern = new Function('m', output)(m);
  // .cpm() scales the pattern against Strudel's 1 cycle/second base.
  const haps = pattern.queryArc(0, 24).filter((hap: any) => hap.hasOnset());
  const events = haps
    .map((hap: any) => ({ pitch: hap.value.note, start: Number(hap.whole.begin) * 1000,
      duration: Number(hap.whole.duration) * 1000 * (hap.value.clip ?? 1) }))
    .sort((a: any, b: any) => a.start - b.start || String(a.pitch).localeCompare(String(b.pitch)));
  return { code, events, controls: haps.map((hap: any) => hap.value) };
}

describe('recording to actual Strudel playback', () => {
  it('replays a legacy hold with the resolved sound live envelope and an explicit full gate', () => {
    const { code, controls } = playback([note('C4', 0, 500)], 120, 120, 'gm_marimba');
    expect(code).toContain('.clip(1)');
    expect(controls[0]).toMatchObject({
      note: 'C4', s: 'gm_marimba', clip: 1,
      attack: 0.001, decay: 0.001, sustain: 1, release: 0.2,
    });
  });

  it('preserves distinct captured envelopes in simultaneous chord lanes and legacy defaults', () => {
    const normal = { ...note('C4', 0, 500), articulation: {
      attack: 0.003, decay: 0.001, sustain: 1, release: 0.12,
    } };
    const rhythmic = { ...note('E4', 0, 500), articulation: {
      attack: 0.003, decay: 0.001, sustain: 1, release: 0.03,
    } };
    const custom = { ...note('G4', 0, 500), articulation: {
      attack: 0.02, decay: 0.05, sustain: 0.6, release: 0.4,
    } };
    const { events, controls, code } = playback([normal, rhythmic, custom, note('D4', 520, 500)]);
    expect(events.slice(0, 5)).toEqual([
      { pitch: 'C4', start: 0, duration: 500 },
      { pitch: 'E4', start: 0, duration: 500 },
      { pitch: 'G4', start: 0, duration: 500 },
      { pitch: 'D4', start: 520, duration: 500 },
      { pitch: 'C4', start: 1520, duration: 500 },
    ]);
    for (const captured of [normal, rhythmic, custom]) {
      expect(controls.find((value: any) => value.note === captured.note))
        .toMatchObject(captured.articulation);
    }
    expect(controls.find((value: any) => value.note === 'D4')).toMatchObject({
      clip: 1, attack: 0.003, decay: 0.001, sustain: 1, release: 0.12,
    });
    expect(code).toContain('.as("note:clip:attack:decay:sustain:release")');
  });

  it.each([
    { attack: NaN, decay: -1, sustain: 2, release: Infinity },
    { attack: -1, decay: Infinity, sustain: -0.1, release: NaN },
    { attack: '0.1', decay: null, sustain: NaN, release: -0.1 },
    { attack: undefined, decay: NaN, sustain: Infinity, release: null },
    null,
  ])('falls back per field for malformed persisted articulation %j', articulation => {
    const captured = { ...note('C4', 0, 500), articulation } as unknown as LogNote;
    const { controls, code } = playback([captured]);
    expect(controls[0]).toMatchObject({
      attack: 0.003, decay: 0.001, sustain: 1, release: 0.12,
    });
    expect(code).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('retains valid fields in partial metadata, including zero envelope stages', () => {
    const captured = { ...note('C4', 0, 500), articulation: {
      attack: 0, sustain: 0, release: 0,
    } } as LogNote;
    expect(playback([captured]).controls[0]).toMatchObject({
      attack: 0, decay: 0.001, sustain: 0, release: 0,
    });
  });

  it.each([NaN, Infinity, 0, -1])('falls back to a full gate for invalid persisted gate %s', gateDuration => {
    const captured = { ...note('C4', 0, 500), gateDuration };
    const { events, controls, code } = playback([captured]);
    expect(events[0].duration).toBe(500);
    expect(controls[0].clip).toBe(1);
    expect(code).not.toMatch(/NaN|Infinity|undefined/);
  });

  it.each([
    [60, 1000, 160, 840, 1040, 600, 2640],
    [120, 500, 80, 420, 520, 300, 1320],
    [240, 250, 40, 210, 260, 150, 660],
  ])('scales rolled chord gates and onsets at playback BPM %s while keeping release seconds',
    (bpm, firstGate, rolledStart, rolledGate, nextStart, nextGate, loopStart) => {
      const rhythmic = { ...note('E4', 80, 420), articulation: {
        attack: 0.003, decay: 0.001, sustain: 1, release: 0.03,
      } };
      const { events, controls, code } = playback([
        note('C4', 0, 500), rhythmic, note('D4', 520, 300),
      ], 120, bpm);
      expect(events.slice(0, 4)).toEqual([
        { pitch: 'C4', start: 0, duration: firstGate },
        { pitch: 'E4', start: rolledStart, duration: rolledGate },
        { pitch: 'D4', start: nextStart, duration: nextGate },
        { pitch: 'C4', start: loopStart, duration: firstGate },
      ]);
      expect(controls.find((value: any) => value.note === 'E4').release).toBe(0.03);
      expect(controls.find((value: any) => value.note === 'C4').release).toBe(0.12);
      expect(code).toContain('.as("note:clip:release")');
    });

  it('encodes only the release column for mixed normal and rhythmic notes without coalesced gates', () => {
    const rhythmic = { ...note('E4', 500, 500), articulation: {
      attack: 0.003, decay: 0.001, sustain: 1, release: 0.03,
    } };
    const { code, controls } = playback([note('C4', 0, 500), rhythmic]);
    expect(code).toContain('C4:0.12@0.25 E4:0.03@0.25');
    expect(code).toContain('.as("note:release")');
    expect(['C4', 'E4'].map(pitch => controls.find((value: any) => value.note === pitch))).toEqual([
      { note: 'C4', s: 'sine', clip: 1, attack: 0.003, decay: 0.001, sustain: 1, release: 0.12 },
      { note: 'E4', s: 'sine', clip: 1, attack: 0.003, decay: 0.001, sustain: 1, release: 0.03 },
    ]);
  });

  it('maps relative colon controls through the actual scale transform, including octave displacement', () => {
    const high = { ...note('C5', 0, 500), octave: 5 };
    const low = { ...note('C3', 520, 500), octave: 3, articulation: {
      attack: 0.003, decay: 0.001, sustain: 1, release: 0.03,
    } };
    const { events, controls, code } = playback([high, low], 120, 120, 'sine', {
      notationType: 'relative', scaleKey: 'C', scaleMode: 'major', scaleOctave: 4,
    });
    expect(code).toContain('.as("n:clip:release").scale("C4:major")');
    expect(events.slice(0, 2)).toEqual([
      { pitch: 'C5', start: 0, duration: 500 },
      { pitch: 'C3', start: 520, duration: 500 },
    ]);
    expect(controls.find((value: any) => value.note === 'C3').release).toBe(0.03);
  });

  it.each([60, 120, 180])('preserves a long phrase at source tempo %s', bpm => {
    const notes = Array.from({ length: 8 }, (_, i) => note('C4', i * 500, 500));
    const { events, code } = playback(notes, bpm);
    expect(code).not.toContain('[ ');
    events.slice(0, 8).forEach((event: any, i: number) => {
      expect(event.start).toBeCloseTo(i * 500, 0);
      expect(event.duration).toBeCloseTo(500, 0);
    });
    expect(events[8].start).toBeCloseTo(4000 + 60000 / bpm, 0);
  });

  it('scales note lengths and loop tail by the playback/source tempo ratio', () => {
    const { events } = playback([note('C4', 1000, 500)], 120, 60);
    expect(events[0].duration).toBeCloseTo(1000, 0);
    expect(events[1].start).toBeCloseTo(2000, 0);
  });

  it('keeps two crossing holds as one attack per note', () => {
    const { events } = playback([note('C4', 0, 2000), note('D4', 1000, 2000)]);
    expect(events.slice(0, 3)).toEqual([
      { pitch: 'C4', start: 0, duration: 2000 },
      { pitch: 'D4', start: 1000, duration: 2000 },
      { pitch: 'C4', start: 3500, duration: 2000 },
    ]);
  });

  it('aligns a full-length chord lane with a delayed shorter lane', () => {
    const { events } = playback([note('C4', 0, 500), note('E4', 80, 420)]);
    expect(events.slice(0, 3)).toEqual([
      { pitch: 'C4', start: 0, duration: 500 },
      { pitch: 'E4', start: 80, duration: 420 },
      { pitch: 'C4', start: 1000, duration: 500 },
    ]);
  });

  it('coalesces a tiny gap visually without stretching the key hold or moving the next onset', () => {
    const notes = [note('C4', 0, 500), note('D4', 520, 500)];
    const { code, events } = playback(notes);
    expect(code.split('`')[1].match(/~/g)).toHaveLength(1); // Only loop tail.
    expect(events[0].duration).toBeCloseTo(500, 0);
    expect(events[1].start).toBeCloseTo(520, 0);
    expect(notes[0].duration).toBe(500);
  });

  it('preserves even a sub-millisecond overlap without splitting a hold', () => {
    const { events } = playback([note('C4', 0, 500.5), note('D4', 500, 500)]);
    expect(events[0].duration).toBeCloseTo(500.5, 0);
    expect(events[1].start).toBeCloseTo(500, 0);
    expect(events[2].start).toBeCloseTo(1500, 0);
  });

  it('preserves an intentional pause', () => {
    const { events } = playback([note('C4', 0, 100), note('D4', 300, 100)]);
    expect(events[0].duration).toBeCloseTo(100, 0);
    expect(events[1].start).toBeCloseTo(300, 0);
  });

  it('does not invent attacks when rounded chord-lane weights differ', () => {
    for (let i = 0; i < 25; i++) {
      const notes = [note('C4', 0, 437.17 + i), note('D4', 0, 783.63 + i),
        note('E4', 213.21, 811.17 + i)];
      const { events } = playback(notes, 137);
      const loopMs = Math.max(...notes.map(note => note.releaseTime)) + 60000 / 137;
      for (let loop = 0; loop < 3; loop++) {
        // Allow sub-ms notation rounding at the loop boundary, but count any
        // unwanted near-boundary attacks rather than filtering them away.
        const inLoop = events.filter((event: any) => event.start >= loop * loopMs - 1 &&
          event.start < (loop + 1) * loopMs - 1);
        expect(inLoop, `iteration ${i}, loop ${loop}`).toHaveLength(3);
        inLoop.forEach((event: any, index: number) => {
          expect(event.start - loop * loopMs).toBeCloseTo(notes[index].pressTime, 0);
          expect(event.duration).toBeCloseTo(notes[index].duration, 0);
        });
      }
    }
  });
});
