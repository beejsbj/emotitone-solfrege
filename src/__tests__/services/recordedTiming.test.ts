import { describe, expect, it } from 'vitest';
import { prepareRecordedNotes } from '@/services/recordedTiming';

const note = (pressTime: number, duration: number) => ({
  pressTime, duration, releaseTime: pressTime + duration,
});

describe('recorded timing preparation', () => {
  it('coalesces a silent micro-gap into a slot while retaining the original gate and timestamps', () => {
    const notes = [note(1000, 500), note(1520, 500)];
    const prepared = prepareRecordedNotes(notes);
    expect(prepared).toEqual([
      { pressTime: 1000, releaseTime: 1500, duration: 520, gateDuration: 500 },
      note(1520, 500),
    ]);
    expect(notes).toEqual([note(1000, 500), note(1520, 500)]);
    expect(prepareRecordedNotes(prepared)).toEqual(prepared);
  });

  it.each([0.5, 40])('extends only voices at the global silence boundary for a %s ms gap', gap => {
    const prepared = prepareRecordedNotes([
      note(1000, 500), note(1100, 400), note(1200, 100), note(1500 + gap, 200),
    ]);
    expect(prepared[0]).toEqual({ pressTime: 1000, releaseTime: 1500, duration: 500 + gap, gateDuration: 500 });
    expect(prepared[1]).toEqual({ pressTime: 1100, releaseTime: 1500, duration: 400 + gap, gateDuration: 400 });
    expect(prepared[2]).toEqual(note(1200, 100));
    expect(prepareRecordedNotes(prepared)).toEqual(prepared);
  });

  it.each([0, -0.5, 40.5])('preserves touching, overlapping, and deliberate gaps (%s ms)', gap => {
    const notes = [note(1000, 500), note(1500 + gap, 500)];
    expect(prepareRecordedNotes(notes)).toEqual(notes);
  });
});
