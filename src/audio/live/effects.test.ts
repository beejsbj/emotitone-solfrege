import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { LiveAudioCore } from './core'
import { VoiceEffects } from './lowpass'
import type { LiveShaping } from '../liveShaping'

const reference = JSON.parse(readFileSync('audio-lab/effects/fixtures/reference.json', 'utf8'))
function decode(encoded: string) {
  const buffer = Buffer.from(encoded, 'base64')
  return new Float32Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
}
const open: LiveShaping = { cutoff: 12000, resonance: 0, room: 0, delay: 0 }
function prepare(core: LiveAudioCore, rate: number, data: Float32Array) {
  core.command({ type: 'prepare', requestId: 1, instrument: {
    kind: 'sample-bank', instrumentId: 'fixture', zoneSelection: 'nearest-root',
    gain: 1, attack: 0, decay: 0, sustain: 1, release: 0,
    zones: [{ id: 'zone', rootMidi: 69, sampleRate: rate, channels: [data] }],
  } }, 0)
}
function render(core: LiveAudioCore, length: number) {
  const output = Array.from({ length: 3 }, () => [new Float32Array(length), new Float32Array(length)])
  core.render(output[0], 0, output[1], output[2])
  return output
}

describe('worklet Shape PCM', () => {
  for (const fixture of reference.filters) it(`matches native lowpass ${fixture.rate} Hz / ${fixture.cutoff} Hz / Q ${fixture.q}`, () => {
    const expected = decode(fixture.pcm)
    const source = new Float32Array(expected.length); source[0] = 1
    const core = new LiveAudioCore(fixture.rate, () => {})
    prepare(core, fixture.rate, source)
    core.command({ type: 'effects', shaping: { ...open, cutoff: fixture.cutoff, resonance: fixture.q === 1 ? 0 : fixture.q } }, 0)
    core.command({ type: 'press', ownerId: 'key', notes: [{ pitch: 69, instrumentId: 'fixture' }] }, 0)
    const actual = render(core, expected.length)[0][0]
    let error = 0
    for (let i = 0; i < actual.length; i++) error = Math.max(error, Math.abs(actual[i] - expected[i]))
    expect(error).toBe(0)
    expect(actual).toEqual(expected)
  })
  it('sends each filtered voice at its room/delay levels and bypasses at 12 kHz', () => {
    const core = new LiveAudioCore(48000, () => {})
    const source = new Float32Array(4096); source[0] = 1
    prepare(core, 48000, source)
    core.command({ type: 'effects', shaping: { ...open, room: .5, delay: .25 } }, 0)
    core.command({ type: 'press', ownerId: 'a', notes: [{ pitch: 69, instrumentId: 'fixture' }] }, 0)
    const [dry, room, delay] = render(core, 4096)
    expect(dry[0]).toEqual(source)
    expect(room[0][0]).toBe(.5)
    expect(delay[0][0]).toBe(.25)
    expect(room[0].slice(1).every(value => value === 0)).toBe(true)
  })
  it('keeps playback Shape snapshots independent of live edits and sums after filtering', () => {
    const fixture = reference.filters.find((f: any) => f.rate === 48000 && f.cutoff === 1000 && f.q === 10)
    const expected = decode(fixture.pcm)
    const source = new Float32Array(expected.length); source[0] = 1
    const core = new LiveAudioCore(48000, () => {})
    prepare(core, 48000, source)
    core.command({ type: 'press', ownerId: 'playback', notes: [{ pitch: 69, instrumentId: 'fixture',
      shaping: { ...open, cutoff: 1000, resonance: 10, room: .5, delay: .25 } }] }, 0)
    core.command({ type: 'effects', shaping: { ...open, room: 0, delay: 0 } }, 0)
    core.command({ type: 'press', ownerId: 'live', notes: [{ pitch: 69, instrumentId: 'fixture' }] }, 0)
    const [dry, room, delay] = render(core, expected.length)
    for (let i = 0; i < expected.length; i++) {
      expect(dry[0][i]).toBe(Math.fround(source[i] + expected[i]))
      expect(room[0][i]).toBe(Math.fround(expected[i] * .5))
      expect(delay[0][i]).toBe(Math.fround(expected[i] * .25))
    }
  })
  it('glides held voices and reuses filter state through dense stealing and retirement', () => {
    const core = new LiveAudioCore(48000, () => {})
    prepare(core, 48000, new Float32Array(4096).fill(.2))
    // Fail if admission uses a callback scan of the preallocated effect pool.
    const pool = (core as unknown as { effectPool: VoiceEffects[] }).effectPool
    const find = vi.spyOn(pool, 'find').mockImplementation(() => { throw new Error('callback allocation in effect admission') })
    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < 100; i++) core.command({ type: 'press', ownerId: `key-${i}`, notes: [{ pitch: 69, instrumentId: 'fixture' }] }, round * 4096)
      core.command({ type: 'effects', shaping: { ...open, cutoff: 1000, resonance: 10, room: 1, delay: .5 } }, round * 4096)
      const output = [new Float32Array(4096), new Float32Array(4096)]
      core.render(output, round * 4096)
      expect(output[0].every(Number.isFinite)).toBe(true)
      core.command({ type: 'clear' }, (round + 1) * 4096)
      core.render(output, (round + 1) * 4096)
      expect(core.voiceCount).toBe(0)
    }
    expect(find).not.toHaveBeenCalled()
    find.mockRestore()
  })
  it('allocates no typed buffers, arrays, maps or sets while processing 60 s of 16 changing filters', () => {
    const effects = Array.from({ length: 16 }, () => new VoiceEffects(48000))
    const left = new Float32Array(128).fill(.1), right = new Float32Array(128).fill(-.1)
    const dry = [new Float32Array(128), new Float32Array(128)]
    const room = [new Float32Array(128), new Float32Array(128)]
    const delay = [new Float32Array(128), new Float32Array(128)]
    const shape = { ...open, cutoff: 1000, resonance: 10, room: .5, delay: .3 }
    for (const effect of effects) effect.reset(shape)
    const allocations: string[] = []
    for (const name of ['Float32Array', 'Float64Array', 'Array', 'Map', 'Set'] as const) {
      const original = globalThis[name]
      vi.stubGlobal(name, new Proxy(original, { construct(target, args) {
        allocations.push(name)
        return Reflect.construct(target, args)
      } }))
    }
    try {
      for (let frame = 0; frame < 48000 * 60; frame += 128) {
        for (const channel of dry) channel.fill(0)
        for (const effect of effects) {
          if (frame % 48000 === 0) effect.set(shape)
          effect.process(left, right, dry, room, delay, 0, 128)
        }
      }
    } finally { vi.unstubAllGlobals() }
    expect(allocations).toEqual([])
    expect(dry[0].every(Number.isFinite)).toBe(true)
  }, 30000)
})
