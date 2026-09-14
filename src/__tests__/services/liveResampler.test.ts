import { describe, expect, it } from 'vitest'
import { createSampleResampler, prepareSampleMipmaps } from '@/audio/live/resampler'
import type { LiveSampleZone } from '@/audio/live/types'

function zone(channels: Float32Array[], loopStartFrame?: number, loopEndFrame?: number): LiveSampleZone {
  return { id: 'test', rootMidi: 60, sampleRate: 48000, channels, loopStartFrame, loopEndFrame,
    mipmaps: prepareSampleMipmaps(channels, loopStartFrame, loopEndFrame) }
}
const rms = (values: number[]) => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length)

describe('prepared PCM band-limited resampling', () => {
  it('suppresses the 18kHz alias when a 15kHz/48kHz sample is pitched up one octave', () => {
    const pcm = Float32Array.from({ length: 4096 }, (_, index) => Math.sin(2 * Math.PI * 15000 * index / 48000))
    const sampler = createSampleResampler(zone([pcm]), 2)
    const original = Array.from({ length: 1024 }, (_, frame) => pcm[(frame + 256) * 2])
    const filtered = Array.from({ length: 1024 }, (_, frame) => sampler.sample(0, (frame + 256) * 2))
    const attenuationDb = 20 * Math.log10(rms(filtered) / rms(original))
    expect(rms(original)).toBeGreaterThan(.7)
    expect(attenuationDb).toBeLessThan(-60)
  })

  it('preserves original-rate integer samples bit for bit without mutating or detaching PCM', () => {
    const pcm = Float32Array.from({ length: 256 }, (_, index) => Math.sin(index * .31))
    const saved = pcm.slice()
    const sampler = createSampleResampler(zone([pcm]), 1)
    expect(Array.from(pcm, (_, index) => sampler.sample(0, index))).toEqual([...saved])
    expect(pcm).toEqual(saved)
    expect(pcm.byteLength).toBe(saved.byteLength)
  })

  it.each([.5, .943874, 1, 1.059463, 1.5, 2, 4, 16])('preserves low-frequency pitch and level at rate %s', rate => {
    const frequency = 150
    const pcm = Float32Array.from({ length: 8192 }, (_, index) => Math.sin(2 * Math.PI * frequency * index / 48000))
    const sampler = createSampleResampler(zone([pcm]), rate)
    let error = 0
    for (let frame = 0; frame < 256; frame++) {
      const position = 1024 + frame * rate
      error = Math.max(error, Math.abs(sampler.sample(0, position) - Math.sin(2 * Math.PI * frequency * position / 48000)))
    }
    expect(error).toBeLessThan(.01)
  })

  it('keeps stereo channels independent and wraps filter neighborhoods within sustained loops', () => {
    const left = Float32Array.from({ length: 128 }, (_, index) => index >= 32 && index < 96 ? 1 : 100)
    const right = Float32Array.from(left, value => -value / 2)
    const prepared = zone([left, right], 32, 96)
    for (const rate of [1, 1.25, 2, 4]) {
      const sampler = createSampleResampler(prepared, rate)
      for (const position of [32, 32.4, 94.9, 95.5, 96, 97.5, 160.4]) {
        expect(sampler.sample(0, position)).toBeCloseTo(1, 5)
        expect(sampler.sample(1, position)).toBeCloseTo(-.5, 5)
      }
    }
  })

  it('handles fractional resampled loops and sample edges without invalid reads', () => {
    const prepared = zone([Float32Array.from({ length: 63 }, (_, i) => Math.sin(i))], 5.25, 55.75)
    for (const rate of [.5, 1, 1.5, 2, 64]) {
      const sampler = createSampleResampler(prepared, rate)
      for (const position of [-1, 0, .1, 5.25, 55.74, 55.75, 1000.25]) expect(Number.isFinite(sampler.sample(0, position))).toBe(true)
    }
    const oneShot = createSampleResampler(zone([new Float32Array([1, 2, 3])]), 1.5)
    expect(oneShot.sample(0, -1)).toBe(0)
    expect(oneShot.sample(0, 3)).toBe(0)
  })

  it.each([.5, 1, 1.059463, 1.5, 2, 4])('mixes stereo envelope spans identically to single reads at rate %s', rate => {
    const left = Float32Array.from({ length: 512 }, (_, i) => Math.sin(i * .1))
    const right = Float32Array.from(left, value => value * -.25)
    const sampler = createSampleResampler(zone([left, right], 64, 384), rate)
    const output = [new Float32Array(128), new Float32Array(128)]
    expect(sampler.mix(output[0], output[1], 7, 100, 360, .5, -.002)).toBe(100)
    let position = 360
    let gain = .5
    for (let frame = 0; frame < 100; frame++) {
      expect(output[0][7 + frame]).toBeCloseTo(sampler.sample(0, position) * gain, 6)
      expect(output[1][7 + frame]).toBeCloseTo(sampler.sample(1, position) * gain, 6)
      position += rate
      gain -= .002
    }
    expect(output[0][6]).toBe(0)
    expect(output[0][107]).toBe(0)
  })

  it('ends a one-shot span at its exact source duration and supports a mono destination', () => {
    const sampler = createSampleResampler(zone([new Float32Array(64).fill(1)]), 2)
    const output = new Float32Array(32)
    expect(sampler.mix(output, undefined, 2, 20, 48, 1, 0)).toBe(8)
    expect(output.slice(10).every(value => value === 0)).toBe(true)
    expect(output[2]).toBeCloseTo(sampler.sample(0, 48), 6)
  })

  it('bounds the additional pyramid PCM by the original size plus small rounding overhead', () => {
    const channels = [new Float32Array(4097), new Float32Array(4097)]
    const levels = prepareSampleMipmaps(channels)
    const additional = levels.flat().reduce((sum, channel) => sum + channel.byteLength, 0)
    expect(additional).toBeLessThanOrEqual(channels.reduce((sum, channel) => sum + channel.byteLength, 0) + 128)
    expect(levels).toHaveLength(13)
  })
})
