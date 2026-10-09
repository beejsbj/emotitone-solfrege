import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSuperdoughTestAudio } from './superdoughTestAudio'

vi.unmock('superdough')
// @ts-ignore superdough does not publish declarations
type Dough = typeof import('superdough')
let dough: Dough
let audio: ReturnType<typeof createSuperdoughTestAudio>
beforeEach(async () => {
  audio = createSuperdoughTestAudio()
  dough = await vi.importActual('superdough')
  dough.setAudioContext(audio.context)
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

function synth(value: Record<string, unknown> = {}) {
  return dough.getZZFX({ s: 'z_sine', note: 60, duration: .02, release: .01, ...value }, 1).node
}

describe('published superdough synthesis caches', () => {
  it('reuses deterministic samples with independent source nodes and unchanged random consumption', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(.25)
    const first = synth()
    const second = synth()
    expect(first).not.toBe(second)
    expect(first.buffer).toBe(second.buffer)
    expect(audio.buffers).toHaveLength(1)
    // buildSamples consumes one random draw even when randomness is zero.
    expect(random).toHaveBeenCalledTimes(2)
  })

  it.each([{ zrand: .2 }, { znoise: .2 }, { s: 'z_noise' }])('does not share randomized/noise samples for %j', (value) => {
    const first = synth(value)
    const second = synth(value)
    expect(first.buffer).not.toBe(second.buffer)
    expect(audio.buffers).toHaveLength(2)
  })

  it('keeps randomized pitch variation in the rendered samples', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(.1).mockReturnValueOnce(.9)
    const first = synth({ zrand: .2 })
    const second = synth({ zrand: .2 })
    expect([...first.buffer.getChannelData(0)]).not.toEqual([...second.buffer.getChannelData(0)])
  })

  it('distinguishes pitch, envelope, and sample rate in the reusable material', () => {
    const first = synth()
    expect(synth({ note: 61 }).buffer).not.toBe(first.buffer)
    expect(synth({ attack: .015 }).buffer).not.toBe(first.buffer)
    audio.context.sampleRate = 16000
    expect(synth().buffer).not.toBe(first.buffer)
    expect(audio.buffers).toHaveLength(4)
  })

  it('uses an LRU entry bound while retaining recently used samples', () => {
    const first = synth({ freq: 200 })
    const second = synth({ freq: 201 })
    for (let freq = 202; freq < 264; freq++) synth({ freq })
    expect(synth({ freq: 200 }).buffer).toBe(first.buffer)
    synth({ freq: 264 })
    expect(synth({ freq: 200 }).buffer).toBe(first.buffer)
    expect(synth({ freq: 201 }).buffer).not.toBe(second.buffer)
  })

  it('also evicts by decoded bytes for longer generated sounds', () => {
    const first = synth({ freq: 200, duration: 10 })
    expect(synth({ freq: 200, duration: 10 }).buffer).toBe(first.buffer)
    // Each mono 8kHz buffer exceeds 320kB; 30 exceed the 8MiB cache budget.
    for (let freq = 201; freq < 230; freq++) synth({ freq, duration: 10 })
    expect(synth({ freq: 200, duration: 10 }).buffer).not.toBe(first.buffer)
  })

  it('reuses the identical bass-drum saturation curve', () => {
    dough.registerSynthSounds()
    const { onTrigger } = dough.getSound('sbd')
    onTrigger(1, { duration: .1 }, () => {})
    onTrigger(2, { duration: .1 }, () => {})
    expect(audio.shapers).toHaveLength(2)
    expect(audio.shapers[0].curve).toBe(audio.shapers[1].curve)
  })
})
