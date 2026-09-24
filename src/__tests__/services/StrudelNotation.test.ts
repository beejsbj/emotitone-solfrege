import { describe, expect, it, vi } from 'vitest'
vi.unmock('@strudel/core')
import { logNotesToStrudel, mergeStrudelRests } from '@/services/StrudelNotation'
import { defaultPatterns } from '@/data/patterns'
import { as } from '@strudel/core/controls.mjs'
import { mini } from '@strudel/mini/mini.mjs'
import { m } from '@strudel/mini'
import { transpiler } from '@strudel/transpiler'
import '@strudel/tonal'

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
  it('keeps plain pitches and timing with explicit playback gate and envelope', () => {
    const result = logNotesToStrudel([
      makeNote('c', 'C4', 0, 4, 1000, 500),
    ])

    expect(result).toBe('`<\nC4@0.25 ~@0.25\n>`.as("note").sound("sine").clip(1).attack(0.003).decay(0.001).sustain(1).release(0.12).cpm(120 / 4)')
  })

  it('maps expressive chord members independently without extra Strudel events', () => {
    const curve = [
      { timeMs: 0, cents: 0 }, { timeMs: 50, cents: 30 },
      { timeMs: 100, cents: -30 }, { timeMs: 150, cents: 30 },
      { timeMs: 200, cents: -30 }, { timeMs: 250, cents: 30 },
      { timeMs: 300, cents: -30 },
    ]
    const result = logNotesToStrudel([
      { ...makeNote('c', 'C4', 0, 4, 1000, 500), pitchExpression: curve },
      makeNote('e', 'E4', 2, 4, 1000, 500),
    ])

    expect(result).toContain('{C4:10:0.3, E4:0:0}@0.25')
    expect(result).toContain(".as(['note', 'vib', 'vibmod'])")

    const pattern = as(["note", "vib", "vibmod"], mini(result.split('`')[1]))
    const events = pattern.queryArc(0, 0.5)
    expect(events).toHaveLength(2)
    expect(events.map((event) => event.value)).toEqual([
      { note: 'C4', vib: 10, vibmod: 0.3 },
      { note: 'E4', vib: 0, vibmod: 0 },
    ])
  })

  it('maps relative expressive values through n:vib:vibmod without changing pitch event count', () => {
    const curve = [
      { timeMs: 0, cents: 0 }, { timeMs: 50, cents: 25 },
      { timeMs: 100, cents: -25 }, { timeMs: 150, cents: 25 },
      { timeMs: 200, cents: -25 }, { timeMs: 250, cents: 25 },
      { timeMs: 300, cents: -25 },
    ]
    const result = logNotesToStrudel([
      { ...makeNote('do', 'C4', 0, 4, 1000, 500), pitchExpression: curve },
      makeNote('mi', 'E4', 2, 4, 1000, 500),
    ], { notationType: 'relative' })

    expect(result).toContain('{0:10:0.25, 2:0:0}@0.25')
    expect(result).toContain(".as(['n', 'vib', 'vibmod'])")

    const events = as(["n", "vib", "vibmod"], mini(result.split('`')[1])).queryArc(0, 0.5)
    expect(events).toHaveLength(2)
    expect(events.map((event) => event.value)).toEqual([
      { n: 0, vib: 10, vibmod: 0.25 },
      { n: 2, vib: 0, vibmod: 0 },
    ])
  })

  it('maps gain tremolo and vibrato independently per overlapping note', () => {
    const pitch = [
      { timeMs: 0, cents: 0 }, { timeMs: 50, cents: 25 }, { timeMs: 100, cents: -25 },
      { timeMs: 150, cents: 25 }, { timeMs: 200, cents: -25 }, { timeMs: 250, cents: 25 }, { timeMs: 300, cents: -25 },
    ]
    const gain = [
      { timeMs: 0, gain: 1 }, { timeMs: 50, gain: 1.3 }, { timeMs: 100, gain: 0.8 },
      { timeMs: 150, gain: 1.3 }, { timeMs: 200, gain: 0.8 }, { timeMs: 250, gain: 1.3 }, { timeMs: 300, gain: 0.8 },
    ]
    const result = logNotesToStrudel([
      { ...makeNote('c', 'C4', 0, 4, 1000, 500), gainExpression: gain },
      { ...makeNote('e', 'E4', 2, 4, 1000, 500), pitchExpression: pitch },
    ])
    expect(result).toContain('{C4:0:0:10:0.385, E4:10:0.25}@0.25')
    expect(result).toContain(".as(['note', 'vib', 'vibmod', 'tremolo', 'tremolodepth'])")
    const events = as(["note", "vib", "vibmod", "tremolo", "tremolodepth"], mini(result.split('`')[1])).queryArc(0, 0.5)
    expect(events.map((event) => event.value)).toEqual([
      { note: 'C4', vib: 0, vibmod: 0, tremolo: 10, tremolodepth: 0.385 },
      { note: 'E4', vib: 10, vibmod: 0.25 },
    ])
  })

  it.each(['absolute', 'relative'] as const)('combines both expression axes on one %s note', (notationType) => {
    const gainExpression = [1, 1.3, 0.8, 1.3, 0.8, 1.3, 0.8]
      .map((gain, index) => ({ timeMs: index * 50, gain }))
    const pitchExpression = [0, 25, -25, 25, -25, 25, -25]
      .map((cents, index) => ({ timeMs: index * 50, cents }))
    const result = logNotesToStrudel([
      { ...makeNote('c', 'C4', 0, 4, 1000, 500), gainExpression, pitchExpression },
      makeNote('e', 'E4', 2, 4, 1000, 500),
    ], { notationType })
    const field = notationType === 'relative' ? 'n' : 'note'
    const keys = [field, 'vib', 'vibmod', 'tremolo', 'tremolodepth']
    expect(result).toContain(`.as([${keys.map(key => `'${key}'`).join(', ')}])`)
    const events = as(keys, mini(result.split('`')[1])).queryArc(0, 0.5)
    expect(events.map(event => event.value)).toEqual([
      { [field]: field === 'n' ? 0 : 'C4', vib: 10, vibmod: 0.25, tremolo: 10, tremolodepth: 0.385 },
      { [field]: field === 'n' ? 2 : 'E4', vib: 0, vibmod: 0 },
    ])
  })

  describe.each(['absolute', 'relative'] as const)('%s playback fidelity', (notationType) => {
    it.each(['plain', 'articulated', 'vibrato', 'tremolo', 'both'] as const)(
      'evaluates complete %s notation with overlapping voices and recorded gates', (kind) => {
        const expressive = kind === 'vibrato' || kind === 'both'
        const tremolo = kind === 'tremolo' || kind === 'both'
        const articulated = kind !== 'plain'
        const pitchExpression = [0, 25, -25, 25, -25, 25, -25]
          .map((cents, index) => ({ timeMs: index * 50, cents }))
        const gainExpression = [1, 1.3, 0.8, 1.3, 0.8, 1.3, 0.8]
          .map((gain, index) => ({ timeMs: index * 50, gain }))
        const envelope = { attack: 0.02, decay: 0.04, sustain: 0.6, release: 0.03 }
        const defaults = { attack: 0.003, decay: 0.001, sustain: 1, release: 0.12 }
        const notes = [
          { ...makeNote('c', 'C4', 0, 4, 1000, 500),
            ...(articulated ? { articulation: envelope } : {}),
            ...(expressive ? { pitchExpression } : {}),
            ...(tremolo ? { gainExpression } : {}),
          },
          makeNote('e', 'E4', 2, 4, 1250, 500),
          // The 20ms silent gap becomes a display slot, retaining E's 500ms gate.
          makeNote('g', 'G4', 4, 4, 1770, 500),
        ]
        const code = logNotesToStrudel(notes, { notationType, sourceBpm: 120, bpm: 120 })
        const { output } = transpiler(code)
        const pattern = new Function('m', output)(m)
        const events = pattern.queryArc(0, 1.77).filter((event: any) => event.hasOnset())
          .sort((a: any, b: any) => Number(a.whole.begin) - Number(b.whole.begin))
        expect(events).toHaveLength(3)
        for (const [index, event] of events.entries()) {
          expect(event.value).toMatchObject({
            note: notes[index].note, s: 'sine',
            ...(index === 0 && articulated ? envelope : defaults),
          })
          expect(event.value.clip).toBeCloseTo(index === 1 ? 500 / 520 : 1, 10)
          expect(Number(event.whole.begin) * 1000).toBeCloseTo([0, 250, 770][index], 6)
          expect(Number(event.whole.duration) * event.value.clip * 1000).toBeCloseTo(500, 6)
          if (expressive) {
            expect(event.value.vib).toBe(index === 0 ? 10 : 0)
            expect(event.value.vibmod).toBe(index === 0 ? 0.25 : 0)
          } else {
            expect(event.value).not.toHaveProperty('vib')
            expect(event.value).not.toHaveProperty('vibmod')
          }
          if (tremolo && index === 0) {
            expect(event.value.tremolo).toBe(10)
            expect(event.value.tremolodepth).toBe(0.385)
          } else {
            expect(event.value).not.toHaveProperty('tremolo')
            expect(event.value).not.toHaveProperty('tremolodepth')
          }
        }
      },
    )
  })

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
