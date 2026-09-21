import { describe, expect, it } from 'vitest';
import { mini } from '@strudel/mini';
import { logNotesToStrudel } from '@/services/StrudelNotation';
import type { LogNote } from '@/types/patterns';

function note(pitch: string, start: number, duration: number): LogNote {
  return { id: `${pitch}-${start}`, note: pitch, pressTime: start,
    releaseTime: start + duration, duration, octave: 4, scaleIndex: 0,
    key: 'C', mode: 'major', instrument: 'sine' } as LogNote;
}

// Run the generated mini-notation through the actual installed Strudel parser.
// Query whole onsets, not fragments split at scheduler query boundaries.
function playback(notes: LogNote[], sourceBpm = 120, bpm = sourceBpm) {
  const code = logNotesToStrudel(notes, { sourceBpm, bpm });
  const pattern = mini(code.split('`')[1]);
  const cycleMs = 240000 / bpm;
  const events = pattern.queryArc(0, 12).filter((hap: any) => hap.hasOnset())
    .map((hap: any) => ({ pitch: hap.value, start: Number(hap.whole.begin) * cycleMs,
      duration: Number(hap.whole.duration) * cycleMs }))
    .sort((a: any, b: any) => a.start - b.start || a.pitch.localeCompare(b.pitch));
  return { code, events };
}

describe('recording to actual Strudel playback', () => {
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

  it('fills a tiny silent gap without moving the next onset or changing raw notes', () => {
    const notes = [note('C4', 0, 500), note('D4', 520, 500)];
    const { code, events } = playback(notes);
    expect(code.split('`')[1].match(/~/g)).toHaveLength(1); // Only loop tail.
    expect(events[0].duration).toBeCloseTo(520, 0);
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
