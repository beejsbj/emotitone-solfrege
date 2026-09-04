import { describe, expect, it } from 'vitest'
import { logNotesToStrudel } from '@/services/StrudelNotation'
import type { LogNote } from '@/types/patterns'

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
      fleckShape: 'circle',
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

  it('wraps captured events in one sequential pattern inside the repeating cycle', () => {
    const notes = [
      makeNote('c', 'C4', 0, 4, 1000, 120),
      makeNote('d', 'D4', 1, 4, 1200, 120),
    ]

    const result = logNotesToStrudel(notes)

    expect(result).toContain('<\n[ C4@0.1 D4@0.06 ]\n>')
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

    expect(high).toContain('[ 28@0.06 ]')
    expect(low).toContain('[ -7@0.06 ]')
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

    expect(result).toContain('[ 20@0.06 ]')
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

    expect(result).toContain('[ F#4@0.06 ]')
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

  it('coalesces rapid human taps instead of inserting a rest between each note', () => {
    const notes = [
      makeNote('c', 'C4', 0, 4, 1000, 80),
      makeNote('d', 'D4', 1, 4, 1160, 80),
      makeNote('e', 'E4', 2, 4, 1320, 80),
    ]

    const result = logNotesToStrudel(notes, { sourceBpm: 120 })

    expect(result).toContain('C4@0.08 D4@0.08 E4@0.04')
    expect(result).not.toContain('~')
  })

  it('keeps the human tap floor at fast source tempos', () => {
    const notes = [
      makeNote('c', 'C4', 0, 4, 1000, 80),
      makeNote('d', 'D4', 1, 4, 1160, 80),
    ]

    const result = logNotesToStrudel(notes, { sourceBpm: 240 })

    expect(result).not.toContain('~')
  })

  it('preserves quick rolled attacks inside an overlapping chord', () => {
    const notes = [
      makeNote('c', 'C4', 0, 4, 1000, 500),
      makeNote('e', 'E4', 2, 4, 1080, 420),
    ]

    const result = logNotesToStrudel(notes, { sourceBpm: 120 })

    expect(result).toContain('{C4, ~@0.04 E4@0.21}@0.25')
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

    expect(result).toContain("[ 4@0.25 ]")
    expect(result).toContain('.scale("C4:major pentatonic")')
  })
})
