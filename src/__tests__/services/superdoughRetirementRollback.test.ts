import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSuperdoughTestAudio } from './superdoughTestAudio'

vi.unmock('superdough')
// @ts-ignore — exercise the installed, patched public entry.
type Dough = typeof import('superdough')
let dough: Dough
let audio: ReturnType<typeof createSuperdoughTestAudio>

beforeEach(async () => {
  audio = createSuperdoughTestAudio()
  dough = await vi.importActual('superdough')
  dough.setAudioContext(audio.context)
  dough.setSuperdoughAudioController({ getOrbit: () => ({ connectToOutput() {} }), reset() {} })
  dough.registerSynthSounds()
  audio.advance(.99)
})
afterEach(() => { dough.resetGlobalEffects(); vi.unstubAllGlobals() })

const attack = (id: string, at: number) => dough.superdough({
  s: 'sine', note: 69, voiceId: id, sustainUntilRelease: true,
  attack: .003, decay: .001, sustain: 1, release: .03,
}, at, .25, 1)

describe('native provisional retirement rollback', () => {
  it('restores more than eight future victims and ignores withdrawn cleanup callbacks', async () => {
    dough.setMaxPolyphony(16)
    for (let i = 0; i < 16; i++) await attack(`held-${i}`, 1)
    for (let i = 0; i < 12; i++) await attack(`queued-${i}`, 1.1)
    const staleCallbacks = audio.sources.filter(source => source instanceof audio.Constant)
      .map(source => source.onended?.bind(source)).filter((callback): callback is () => void => callback !== undefined)
    expect(staleCallbacks.length).toBeGreaterThanOrEqual(12)

    audio.advance(1.05)
    for (let i = 0; i < 12; i++) expect(dough.cancelVoice(`queued-${i}`)).toBe(true)
    audio.advance(1.2)
    // Even callbacks already queued for delivery cannot dispose restored voices.
    for (const callback of staleCallbacks) callback()
    for (let i = 0; i < 16; i++) expect(dough.hasVoice(`held-${i}`)).toBe(true)
    for (let i = 0; i < 12; i++) expect(dough.hasVoice(`queued-${i}`)).toBe(false)
    expect(audio.voices.slice(0, 16).every(source => !source.disconnected)).toBe(true)

    dough.resetGlobalEffects()
    audio.advance(1.201) // Deliver the built-in oscillator's final ended event.
    expect(audio.voices.every(source => source.disconnected)).toBe(true)
  })

  it('withdraws only the budget fade, preserving a genuine key-off and its natural tail', async () => {
    dough.setMaxPolyphony(1)
    await attack('held', 1)
    await attack('queued', 1.1)
    audio.advance(1.095)
    expect(dough.releaseVoice('held')).toBe(true)
    expect(dough.cancelVoice('queued')).toBe(true)
    expect(audio.voices[0].stopAt).toBeCloseTo(1.125)
    audio.advance(1.115)
    expect(dough.hasVoice('held')).toBe(true)
    audio.advance(1.126)
    expect(dough.hasVoice('held')).toBe(false)
  })

  it('does not revive a voice whose retirement has already begun', async () => {
    dough.setMaxPolyphony(1)
    await attack('held', 1)
    await attack('queued', 1.1)
    audio.advance(1.105)
    expect(dough.cancelVoice('queued')).toBe(true)
    audio.advance(1.112)
    expect(dough.hasVoice('held')).toBe(false)
  })
})
