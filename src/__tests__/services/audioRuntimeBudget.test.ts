import { afterEach, expect, it, vi } from 'vitest'
import { MAX_AUDIO_VOICES, VOICE_RETIRE_SECONDS } from '@/audio/voicePolicy'
import { createSuperdoughTestAudio } from './superdoughTestAudio'

vi.unmock('superdough')

afterEach(() => { vi.unstubAllGlobals() })

it('applies the application budget to real native admission and matches worklet retirement timing', async () => {
  const audio = createSuperdoughTestAudio()
  // @ts-ignore — superdough does not publish TypeScript declarations.
  const dough = await import('superdough')
  dough.setAudioContext(audio.context)
  dough.setSuperdoughAudioController({ getOrbit: () => ({ connectToOutput() {} }), reset() {} })
  dough.registerSound('runtime-budget-test', (at: number, _value: unknown, onended: () => void) => {
    const source = new audio.Source(audio.context)
    source.start(at)
    source.onended = onended
    return { node: source, stop: (time: number) => source.stop(time) }
  })
  // Skip browser effect loading while exercising the real initAudio options.
  vi.stubGlobal('window', undefined)
  const runtime = await import('@/services/audioRuntime')
  const attack = (id: string) => dough.superdough({ s: 'runtime-budget-test', voiceId: id,
    sustainUntilRelease: true, release: .03 }, audio.context.currentTime, .25, 1)
  try {
    await runtime.initializeAudio()
    expect(dough.maxPolyphony).toBe(MAX_AUDIO_VOICES)
    expect(dough.maxPolyphony).toBe(64)
    for (let i = 0; i < MAX_AUDIO_VOICES; i++) await attack(`initial-${i}`)
    audio.advance(.02)
    // Release order differs from admission order: choose the oldest admitted
    // tail, preserving older held notes, exactly as the worklet does.
    dough.releaseVoice('initial-41')
    dough.releaseVoice('initial-40')
    await attack('replacement-a')
    expect(audio.sources[40].stopAt).toBeCloseTo(.02 + VOICE_RETIRE_SECONDS)
    expect(audio.sources[41].stopAt).toBeCloseTo(.05)
    expect(audio.sources[0].stopAt).toBe(Infinity)
    await attack('replacement-b')
    expect(audio.sources[41].stopAt).toBeCloseTo(.02 + VOICE_RETIRE_SECONDS)
    expect(VOICE_RETIRE_SECONDS).toBe(.01)
    await Promise.all(Array.from({ length: 30 }, (_, i) => attack(`burst-${i}`)))
    const remaining = () => audio.sources.filter(source => !source.disconnected && !(source instanceof audio.Constant))
    expect(remaining().length).toBeLessThanOrEqual(MAX_AUDIO_VOICES + 8)
    audio.advance(.031)
    expect(remaining()).toHaveLength(MAX_AUDIO_VOICES)
    dough.releaseAllVoices()
    audio.advance(.062)
    expect(remaining()).toHaveLength(0)
  } finally {
    dough.resetGlobalEffects()
  }
})
