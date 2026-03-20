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
    expect(result).toContain('const BPM = 60;')
    expect(result).toContain('.cpm(BPM / 4)')
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

    expect(result).toContain('{0, 2}@0.25')
    expect(result).toContain('.as("n").scale("C3:major")')
    expect(result).toContain('const BPM = 90;')
    expect(result).toContain('.cpm(BPM / 4)')
  })
})
