import { describe, expect, it } from 'vitest'
import { logNotesToStrudel, mergeStrudelRests } from '@/services/StrudelNotation'
import { defaultPatterns } from '@/data/patterns'
import type { LogNote } from '@/types/patterns'
import type { Shape } from '@/types/instrument'

const NEUTRAL: Shape = { cutoff: 12000, resonance: 0, room: 0, delay: 0, attack: null, release: null }

function makeNote(
  id: string,
  note: string,
  scaleIndex: number,
  octave: number,
  pressTime: number,
  duration: number
): LogNote {
  return {
    id,
    note,
    key: 'C',
    mode: 'major',
    scaleDegree: scaleIndex + 1,
    scaleIndex,
    solfege: {
      name: ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'][scaleIndex] ?? 'Do',
      number: scaleIndex + 1,
      emotion: 'neutral',
      description: 'test note',
      texture: 'smooth',
    },
    octave,
    instrument: 'sine',
    pressTime,
    releaseTime: pressTime + duration,
    duration,
    sessionId: 'test-session',
  }
}

describe('StrudelNotation', () => {
  it('keeps @ durations tied to source BPM rather than playback BPM', () => {
    const notes = [
      makeNote('c', 'C4', 0, 4, 1000, 500),
    ]

    const result = logNotesToStrudel(notes, {
      bpm: 60,
      sourceBpm: 120,
    })

    expect(result).toContain('C4@0.25')
    expect(result).not.toContain('C4@0.125')
    expect(result).toContain('.cpm(60 / 4)')
  })

  it('keeps captured weights directly inside the repeating sequence with a loop tail', () => {
    const notes = [
      makeNote('c', 'C4', 0, 4, 1000, 120),
      makeNote('d', 'D4', 1, 4, 1200, 120),
    ]

    const result = logNotesToStrudel(notes)

    expect(result).toContain('<\nC4@0.06 ~@0.04 D4@0.06 ~@0.25\n>')
  })

  it('preserves octave displacement in relative scale degrees', () => {
    const high = logNotesToStrudel([
      makeNote('c8', 'C8', 0, 8, 1000, 120),
    ], {
      notationType: 'relative',
      scaleKey: 'C',
      scaleMode: 'major',
      scaleOctave: 4,
    })
    const low = logNotesToStrudel([
      makeNote('c3', 'C3', 0, 3, 1000, 120),
    ], {
      notationType: 'relative',
      scaleKey: 'C',
      scaleMode: 'major',
      scaleOctave: 4,
    })

    expect(high).toContain('28@0.06 ~@0.25')
    expect(low).toContain('-7@0.06 ~@0.25')
  })

  it('uses the active scale length for octave displacement in sparse modes', () => {
    const result = logNotesToStrudel([
      {
        ...makeNote('c8', 'C8', 0, 8, 1000, 120),
        mode: 'major pentatonic' as const,
      },
    ], {
      notationType: 'relative',
      scaleKey: 'C',
      scaleMode: 'major pentatonic',
      scaleOctave: 4,
    })

    expect(result).toContain('20@0.06 ~@0.25')
  })

  it('falls back to absolute notation when a pitch is outside the active scale', () => {
    const result = logNotesToStrudel([
      makeNote('f-sharp', 'F#4', 3, 4, 1000, 120),
    ], {
      notationType: 'relative',
      scaleKey: 'C',
      scaleMode: 'major',
      scaleOctave: 4,
    })

    expect(result).toContain('F#4@0.06 ~@0.25')
    expect(result).toContain('.as("note")')
    expect(result).not.toContain('.scale(')
  })

  it('groups simultaneous notes into a chord block', () => {
    const notes = [
      makeNote('c', 'C4', 0, 4, 1000, 500),
      makeNote('e', 'E4', 2, 4, 1000, 500),
      makeNote('g', 'G4', 4, 4, 1000, 500),
      makeNote('d', 'D4', 1, 4, 1500, 500),
    ]

    const result = logNotesToStrudel(notes)

    expect(result).toContain('{C4, E4, G4}@0.25 D4@0.25')
  })

  it('renders staggered overlaps as padded brace lanes', () => {
    const notes = [
      makeNote('c', 'C4', 0, 4, 1000, 1000),
      makeNote('e', 'E4', 2, 4, 1500, 1000),
    ]

    const result = logNotesToStrudel(notes)

    expect(result).toContain('{C4@0.5 ~@0.25, ~@0.25 E4@0.5}@0.75')
  })

  it('keeps relative notation chord grouping and scale metadata', () => {
    const notes = [
      makeNote('do', 'C4', 0, 4, 1000, 500),
      makeNote('mi', 'E4', 2, 4, 1000, 500),
    ]

    const result = logNotesToStrudel(notes, {
      bpm: 90,
      notationType: 'relative',
      scaleKey: 'C',
      scaleMode: 'major',
      scaleOctave: 3,
    })

    expect(result).toContain('{7, 9}@0.25')
    expect(result).toContain('.as("n").scale("C3:major")')
    expect(result).toContain('.cpm(90 / 4)')
  })

  it('preserves measured gaps between rapid human taps', () => {
    const notes = [
      makeNote('c', 'C4', 0, 4, 1000, 80),
      makeNote('d', 'D4', 1, 4, 1160, 80),
      makeNote('e', 'E4', 2, 4, 1320, 80),
    ]

    const result = logNotesToStrudel(notes, { sourceBpm: 120 })

    expect(result).toContain('C4@0.04 ~@0.04 D4@0.04 ~@0.04 E4@0.04')
  })

  it('keeps the human tap floor at fast source tempos', () => {
    const notes = [
      makeNote('c', 'C4', 0, 4, 1000, 80),
      makeNote('d', 'D4', 1, 4, 1160, 80),
    ]

    const result = logNotesToStrudel(notes, { sourceBpm: 240 })

    expect(result).toContain('C4@0.08 ~@0.08 D4@0.08')
  })

  it('preserves quick rolled attacks inside an overlapping chord', () => {
    const notes = [
      makeNote('c', 'C4', 0, 4, 1000, 500),
      makeNote('e', 'E4', 2, 4, 1080, 420),
    ]

    const result = logNotesToStrudel(notes, { sourceBpm: 120 })

    expect(result).toContain('{C4@0.25, ~@0.04 E4@0.21}@0.25')
  })

  it('preserves an intentional pause after the rapid-tap coalescing window', () => {
    const notes = [
      makeNote('c', 'C4', 0, 4, 1000, 80),
      makeNote('d', 'D4', 1, 4, 1330, 80),
    ]

    const result = logNotesToStrudel(notes, { sourceBpm: 120 })

    expect(result).toContain('C4@0.04 ~@0.125 D4@0.04')
  })

  it("keeps sparse-scale degrees aligned with the actual pitch", () => {
    const notes = [
      {
        ...makeNote("la", "A4", 4, 4, 1000, 500),
        key: "C",
        mode: "major pentatonic" as const,
      },
    ]

    const result = logNotesToStrudel(notes, {
      notationType: "relative",
      scaleKey: "C",
      scaleMode: "major pentatonic",
      scaleOctave: 4,
    })

    expect(result).toContain("4@0.25 ~@0.25")
    expect(result).toContain('.scale("C4:major pentatonic")')
  })

  it("prints the pattern Shape's filter and uses its envelope for notes without articulation", () => {
    const notes = [makeNote("c", "C4", 0, 4, 1000, 500)];
    const result = logNotesToStrudel(notes, {
      sound: "triangle",
      shape: { ...NEUTRAL, cutoff: 1800, resonance: 4.5, attack: 0.05, release: 0.8 },
    });

    expect(result).toContain('.sound("triangle")');
    expect(result).toContain('.lpf(1800)');
    expect(result).toContain('.lpq(4.5)');
    expect(result).toContain('.attack(0.05)');
    expect(result).toContain('.release(0.8)');
  });

  it("omits neutral filters and falls back to the natural envelope", () => {
    const notes = [makeNote("c", "C4", 0, 4, 1000, 500)];
    const neutral = logNotesToStrudel(notes, { sound: "triangle", shape: NEUTRAL });
    expect(neutral).not.toContain('.lpf(');
    expect(neutral).not.toContain('.lpq(');
    expect(neutral).not.toContain('.room(');
    expect(neutral).not.toContain('.delay(');
    expect(neutral).toContain('.attack(0.003)');
    expect(neutral).toContain('.release(0.12)');

    // Absent Shape (legacy) is neutral: piano keeps its own envelope.
    const legacy = logNotesToStrudel(notes, { sound: "piano" });
    expect(legacy).toContain('.attack(0.001)');
    expect(legacy).toContain('.release(0.2)');

    // An explicit stage equal to another instrument's default is still intent.
    const explicit = logNotesToStrudel(notes, {
      sound: "piano", shape: { ...NEUTRAL, attack: 0.003, release: 0.12 },
    });
    expect(explicit).toContain('.attack(0.003)');
    expect(explicit).toContain('.release(0.12)');
  });

  it("keeps sample shaping and effects from the pattern Shape", () => {
    const notes = [makeNote("c", "C4", 0, 4, 1000, 500)];
    const result = logNotesToStrudel(notes, {
      sound: "piano",
      shape: { cutoff: 2200, resonance: 2, room: 0.4, delay: 0.6, attack: null, release: null },
    });

    expect(result).toContain('.lpf(2200).lpq(2)');
    expect(result).toContain('.attack(0.001)');
    expect(result).toContain('.release(0.2)');
    expect(result).toContain('.room(0.4)');
    expect(result).toContain('.delay(0.6).delaytime(0.25).delayfeedback(0.3)');
  });

  it("prints uniform recorded articulation once and varying articulation per note", () => {
    const notes = [
      { ...makeNote("c", "C4", 0, 4, 1000, 500), articulation: { attack: 0.2, decay: 0.001, sustain: 1, release: 0.8 } },
      { ...makeNote("d", "D4", 1, 4, 1500, 500), articulation: { attack: 0.4, decay: 0.001, sustain: 1, release: 0.8 } },
    ] as LogNote[];
    // Recorded values win over the pattern Shape.
    const result = logNotesToStrudel(notes, { sound: "triangle", shape: { ...NEUTRAL, attack: 0.05 } });

    expect(result).toContain('.as("note:attack")');
    expect(result).toContain('C4:0.2@0.25 D4:0.4@0.25');
    expect(result).toContain('.clip(1).decay(0.001).sustain(1).release(0.8)');
    expect(result).not.toContain('.attack(');

    const uniform = logNotesToStrudel(notes.map(note => ({ ...note, articulation: { ...note.articulation!, attack: 0.2 } })), {
      sound: "triangle",
    });
    expect(uniform).toContain('.as("note")');
    expect(uniform).toContain('C4@0.25 D4@0.25');
    expect(uniform).toContain('.attack(0.2)');
    expect(uniform).toContain('.release(0.8)');
  });

  it("fills legacy notes in a recorded take from the Shape, then the natural envelope", () => {
    const notes = [
      { ...makeNote("c", "C4", 0, 4, 1000, 500), articulation: { attack: 0.2, decay: 0.001, sustain: 1, release: 0.8 } },
      makeNote("d", "D4", 1, 4, 1500, 500),
    ] as LogNote[];
    const result = logNotesToStrudel(notes, { sound: "triangle", shape: { ...NEUTRAL, attack: 0.05 } });

    expect(result).toContain('.as("note:attack:release")');
    expect(result).toContain('C4:0.2:0.8@0.25 D4:0.05:0.12@0.25');
  });

  it('merges adjacent rests without crossing notes or chord lanes', () => {
    expect(mergeStrudelRests(['~@0.1', '~@0.15', 'C4@0.25', '~', '~@0.5', '{~@0.2 D4@0.8, E4}']))
      .toEqual(['~@0.25', 'C4@0.25', '~@1.5', '{~@0.2 D4@0.8, E4}']);
  })

  it('still pads a live take when the caller supplies its note-span duration', () => {
    const result = logNotesToStrudel([makeNote('c', 'C4', 0, 4, 1000, 500)], {
      sourceBpm: 120, patternDurationMs: 500,
    })
    expect(result).toContain('C4@0.25 ~@0.25')
    expect(result).not.toContain('[ ')
  })

  it('uses authored trailing silence instead of adding another beat to it', () => {
    const result = logNotesToStrudel([makeNote('c', 'C4', 0, 4, 1000, 500)], {
      sourceBpm: 120, patternDurationMs: 750,
    })
    expect(result).toContain('C4@0.25 ~@0.125')
    expect(result).not.toContain('~@0.375')
  })

  it("preserves a parsed pattern's trailing rest at the loop boundary", () => {
    const chorus = defaultPatterns.find(
      (pattern) => pattern.name === "Warrior of the Mind (Chorus)",
    )
    expect(chorus).toBeDefined()
    expect(chorus?.duration).toBe(7920)

    const result = logNotesToStrudel(chorus!.notes as LogNote[], {
      bpm: chorus!.bpm,
      sourceBpm: chorus!.bpm,
      patternDurationMs: chorus!.duration,
    })

    expect(result).toContain('C#4@0.25 ~@0.375')
  })
})
