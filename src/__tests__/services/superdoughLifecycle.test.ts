import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSuperdoughTestAudio } from './superdoughTestAudio'

vi.unmock('superdough')

// The installed published entry executes unchanged against a fake audio clock.
// @ts-ignore superdough does not publish declarations
type Dough = typeof import('superdough')
let dough: Dough
let audio: ReturnType<typeof createSuperdoughTestAudio>

beforeEach(async () => {
  audio = createSuperdoughTestAudio()
  dough = await vi.importActual('superdough')
  dough.setAudioContext(audio.context)
  dough.setSuperdoughAudioController({ getOrbit: () => ({ connectToOutput() {} }), reset() {} })
  dough.setMaxPolyphony(128)
  dough.registerSound('lifecycle-test', (at: number, value: { naturalDuration?: number }, onended: () => void) => {
    const source = new audio.Source(audio.context)
    source.start(at)
    source.naturalEnd = at + (value.naturalDuration ?? Infinity)
    source.onended = onended
    return { node: source, stop: (time: number) => source.stop(time) }
  })
  // Unlike the arbitrary custom source above, this fixture explicitly implements
  // a finite gate and declares its absolute envelope timing to the engine.
  dough.registerSound('gated-test', (at: number, value: { duration: number; release: number }, onended: () => void) => {
    const source = new audio.Source(audio.context)
    const releaseAt = at + value.duration
    const endAt = releaseAt + value.release
    source.start(at)
    source.naturalEnd = endAt
    source.onended = onended
    return { node: source, stop: (time: number) => source.stop(time), releaseAt, endAt }
  })
})

afterEach(() => {
  dough.resetGlobalEffects()
  vi.unstubAllGlobals()
})

function attack(id: string, at = 1, naturalDuration?: number) {
  return dough.superdough({ s: 'lifecycle-test', voiceId: id, sustainUntilRelease: true, release: .03, naturalDuration }, at, .25, 1)
}

describe('published superdough lifecycle and voice budget', () => {
  it('withdraws a future retirement when its incoming builtin voice is cancelled before onset', async () => {
    dough.setMaxPolyphony(1)
    dough.registerSynthSounds()
    audio.advance(.99)
    await dough.superdough({ s: 'sine', note: 60, voiceId: 'a', sustainUntilRelease: true, release: .03 }, 1, .25, 1)
    const originalStop = audio.voices[0].stopAt
    await dough.superdough({ s: 'sine', note: 60, voiceId: 'b', sustainUntilRelease: true, release: .03 }, 1.1, .25, 1)
    expect(audio.voices[0].stopAt).toBe(originalStop)
    audio.advance(1.05)
    dough.cancelVoice('b')
    expect(audio.voices[0].stopAt).toBe(originalStop)
    audio.advance(1.12)
    expect(dough.hasVoice('a')).toBe(true)
  })

  it('preserves authored release while the independent retirement gate reaches zero earlier', async () => {
    dough.setMaxPolyphony(1)
    audio.advance(.99)
    await attack('a', 1)
    const ramps = audio.gains.map(node => vi.spyOn(node.gain, 'linearRampToValueAtTime'))
    await attack('b', 1.1)
    audio.advance(1.095)
    for (const ramp of ramps) ramp.mockClear()
    dough.releaseVoice('a')
    expect(audio.voices[0].stopAt).toBeCloseTo(1.125)
    const ends = ramps.flatMap(ramp => ramp.mock.calls.map(([, at]) => Number(at)))
    expect(ends.some(end => Math.abs(end - 1.125) < 1e-9)).toBe(true)
    expect(ends.some(end => Math.abs(end - 1.11) < 1e-9)).toBe(true)
    audio.advance(1.112)
    expect(dough.hasVoice('a')).toBe(false)
  })

  it('restores a generic source and ignores stale retirement cleanup after cancellation', async () => {
    dough.setMaxPolyphony(1)
    audio.advance(.99)
    await attack('a', 1); await attack('b', 1.1)
    const timer = audio.sources.find(source => source instanceof audio.Constant)!
    const staleCleanup = timer.onended!.bind(timer)
    expect(audio.voices[0].stopAt).toBe(Infinity)
    audio.advance(1.05)
    dough.cancelVoice('b')
    staleCleanup()
    audio.advance(1.12)
    expect(dough.hasVoice('a')).toBe(true)
    expect(audio.voices[0].stopAt).toBe(Infinity)
    expect(audio.voices[0].disconnected).toBe(false)
  })

  it('withdraws more than eight provisional retirements and cleans all queued timers on reset', async () => {
    dough.setMaxPolyphony(64)
    audio.advance(.99)
    for (let i = 0; i < 64; i++) await attack(`original-${i}`, 1)
    for (let i = 0; i < 12; i++) await attack(`replacement-${i}`, 1.1)
    audio.advance(1.05)
    for (let i = 0; i < 12; i++) dough.cancelVoice(`replacement-${i}`)
    audio.advance(1.12)
    expect(audio.voices.slice(0, 64).every(source => !source.ended && !source.disconnected)).toBe(true)
    expect(audio.voices.filter(source => !source.disconnected)).toHaveLength(64)
    dough.resetGlobalEffects()
    audio.advance(1.2)
    expect(audio.sources.every(source => source.ended && source.disconnected)).toBe(true)
  })

  it('preserves a genuine key-off when withdrawing a future budget retirement', async () => {
    dough.setMaxPolyphony(1)
    audio.advance(.99)
    await attack('a', 1); await attack('b', 1.1)
    audio.advance(1.08)
    dough.releaseVoice('a')
    audio.advance(1.09)
    dough.cancelVoice('b')
    expect(audio.voices[0].stopAt).toBeCloseTo(1.11)
    audio.advance(1.105)
    expect(dough.hasVoice('a')).toBe(true)
    audio.advance(1.12)
    expect(dough.hasVoice('a')).toBe(false)
  })

  it('anchors a new provisional fade at unity after clearing an older reservation', async () => {
    dough.setMaxPolyphony(1)
    audio.advance(.99)
    await attack('a', 1); await attack('b', 1.1)
    const gate = audio.gains.find(node => node.gain.linearRampToValueAtTime.mock.calls.some(([, at]) => Math.abs(at - 1.11) < 1e-9))!.gain
    audio.advance(1.05)
    dough.cancelVoice('b')
    await attack('c', 1.2)
    expect(gate.setValueAtTime).toHaveBeenCalledWith(1, 1.2)
    expect(gate.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 1.21)
  })

  it('anchors held release at unity and computes a later release edge from its existing linear curve', async () => {
    audio.advance(.99)
    await attack('a', 1)
    dough.releaseVoice('a', 1.1)
    const gate = audio.gains.find(node => node.gain.linearRampToValueAtTime.mock.calls.some(([, at]) => Math.abs(at - 1.13) < 1e-9))!.gain
    expect(gate.setValueAtTime).toHaveBeenCalledWith(1, 1)
    expect(gate.setValueAtTime).toHaveBeenCalledWith(1, 1.1)
    dough.releaseVoice('a', 1.11)
    const [level, at] = gate.setValueAtTime.mock.calls.at(-1)!
    expect(at).toBe(1.11)
    expect(level).toBeCloseTo(2 / 3)
    expect(gate.linearRampToValueAtTime.mock.calls.at(-1)![1]).toBeCloseTo(1.13)
  })

  it('steals at the incoming finite onset instead of the lookahead scheduling clock', async () => {
    dough.setMaxPolyphony(64)
    audio.advance(.99)
    for (let i = 0; i < 64; i++) await dough.superdough({ s: 'gated-test', release: .1 }, 1, .5, 1)
    await dough.superdough({ s: 'gated-test', release: .1 }, 1.09, .5, 1)
    expect(audio.voices[0].stopAt).toBe(Infinity)
    audio.advance(1.05)
    expect(audio.voices[0].ended).toBe(false)
    expect(audio.voices[0].disconnected).toBe(false)
    audio.advance(1.101)
    expect(audio.voices[0].disconnected).toBe(true)
  })

  it('chooses release priority at the incoming onset even when the release is still future', async () => {
    dough.setMaxPolyphony(2)
    audio.advance(.99)
    await attack('held', 1)
    await dough.superdough({ s: 'gated-test', release: .1 }, 1.01, .04, 1)
    await attack('new', 1.09)
    expect(audio.voices[0].stopAt).toBe(Infinity)
    audio.advance(1.101)
    expect(audio.voices[1].ended).toBe(true)
    expect(audio.voices[0].ended).toBe(false)
  })

  it('retains more than eight queued retirements until their audible intervals finish', async () => {
    dough.setMaxPolyphony(64)
    audio.advance(.99)
    for (let i = 0; i < 64; i++) await dough.superdough({ s: 'gated-test', release: .1 }, 1, .5, 1)
    for (let i = 0; i < 12; i++) await dough.superdough({ s: 'gated-test', release: .1 }, 1.09 + i * .02, .5, 1)
    expect(audio.voices.slice(0, 64).every(source => !source.disconnected)).toBe(true)
    expect(audio.voices.slice(0, 12).every(source => source.stopAt === Infinity)).toBe(true)
    audio.advance(1.05)
    expect(audio.voices.slice(0, 64).every(source => !source.ended)).toBe(true)
    dough.resetGlobalEffects()
    expect(audio.voices.every(source => source.disconnected)).toBe(true)
  })

  it('does not charge nonoverlapping future allocations against the audible budget', async () => {
    dough.setMaxPolyphony(2)
    audio.advance(.99)
    for (let i = 0; i < 12; i++) await dough.superdough({ s: 'gated-test', release: .01 }, 1 + i * .1, .02, 1)
    expect(audio.voices.every(source => !source.disconnected && source.stopAt === Infinity)).toBe(true)
  })

  it('accounts for queued retirees when an earlier onset arrives out of order', async () => {
    dough.setMaxPolyphony(2)
    audio.advance(.99)
    await attack('first', 1); await attack('second', 1)
    await attack('later', 1.09)
    await attack('middle', 1.05)
    expect(audio.voices[0].stopAt).toBe(Infinity)
    expect(audio.voices[1].stopAt).toBe(Infinity)
    expect(audio.voices[2].stopAt).toBe(Infinity)
    expect(audio.voices[3].stopAt).toBe(Infinity)
    audio.advance(1.04)
    expect(audio.voices.every(source => !source.ended)).toBe(true)
    audio.advance(1.061)
    expect(audio.voices[0].ended).toBe(true)
    expect(audio.voices[1].ended).toBe(false)
    audio.advance(1.101)
    expect(audio.voices[1].ended).toBe(true)
  })

  it('bounds overlapping future fades at their retirement boundary without cutting prior hold', async () => {
    dough.setMaxPolyphony(64)
    audio.advance(.99)
    for (let i = 0; i < 64; i++) await attack(`initial-${i}`, 1)
    for (let i = 0; i < 12; i++) await attack(`incoming-${i}`, 1.09)
    expect(audio.voices.slice(0, 64).every(source => !source.disconnected)).toBe(true)
    expect(audio.voices.slice(0, 12).every(source => source.stopAt === Infinity)).toBe(true)
    audio.advance(1.05)
    expect(audio.voices.every(source => !source.ended)).toBe(true)
    audio.advance(1.091)
    expect(audio.voices.filter(source => !source.disconnected)).toHaveLength(72)
    audio.advance(1.101)
    expect(audio.voices.filter(source => !source.disconnected)).toHaveLength(64)
  })

  it('keeps custom sources with unknown ends counted beyond their hap duration', async () => {
    dough.setMaxPolyphony(2)
    audio.advance(.99)
    await dough.superdough({ s: 'lifecycle-test', release: .01 }, 1, .01, 1)
    await dough.superdough({ s: 'lifecycle-test', release: .01 }, 1, .01, 1)
    await attack('later', 1.2)
    audio.advance(1.211)
    expect(audio.voices[0].ended).toBe(true)
    expect(audio.voices[1].stopAt).toBe(Infinity)
  })

  it.each([NaN, undefined, '1.02', -1])('conservatively counts invalid custom timing %s', async timing => {
    const original = dough.getSound('lifecycle-test').onTrigger
    dough.registerSound('invalid-timing', (...args: unknown[]) => ({
      ...original(...args), releaseAt: timing, endAt: timing,
    }))
    dough.setMaxPolyphony(2)
    audio.advance(.99)
    await dough.superdough({ s: 'invalid-timing' }, 1, .01, 1)
    await attack('held', 1)
    await attack('next', 1.1)
    audio.advance(1.111)
    expect(audio.voices[0].ended).toBe(true)
    expect(audio.voices[1].stopAt).toBe(Infinity)
  })

  it('frees unknown source intervals after an observed natural end', async () => {
    dough.setMaxPolyphony(1)
    await attack('natural', 1, .05)
    audio.advance(1.06)
    await attack('next', 1.1)
    expect(audio.voices[0].stopAt).toBe(Infinity)
    expect(audio.voices[1].stopAt).toBe(Infinity)
  })

  it('uses manual release ends for future admission and never extends a queued retirement', async () => {
    dough.setMaxPolyphony(2)
    audio.advance(.99)
    await attack('held', 1); await attack('released', 1)
    dough.releaseVoice('released', 1.01) // tail ends at 1.04, before the next onset
    await attack('next', 1.09)
    expect(audio.voices[0].stopAt).toBe(Infinity)
    expect(audio.voices[1].stopAt).toBeCloseTo(1.04)
    await attack('overflow', 1.1)
    expect(audio.voices[0].stopAt).toBe(Infinity)
    dough.releaseAllVoices(1.2)
    audio.advance(1.111)
    expect(audio.voices[0].ended).toBe(true)
    expect(audio.voices[1].stopAt).toBeCloseTo(1.04)
    audio.advance(1.24)
    expect(audio.voices.every(source => source.disconnected)).toBe(true)
  })

  it('cleans every staggered future retirement without a global reset', async () => {
    dough.setMaxPolyphony(2)
    audio.advance(.99)
    for (let i = 0; i < 15; i++) await attack(`future-${i}`, 1 + i * .02)
    expect(audio.voices.every(source => !source.disconnected)).toBe(true)
    dough.releaseAllVoices(1.4)
    audio.advance(1.44)
    expect(audio.voices.every(source => source.ended && source.disconnected)).toBe(true)
    expect(Array.from({ length: 15 }, (_, i) => dough.hasVoice(`future-${i}`))).not.toContain(true)
  })

  it('counts an unclipped sample through its full slice instead of its short hap duration', async () => {
    dough.setMaxPolyphony(1)
    Object.assign(audio.context, { decodeAudioData: async () => audio.context.createBuffer(1, 8000, 8000) })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) }))
    await dough.samples({ 'unclipped-test': [`https://example.test/sample-${crypto.randomUUID()}.wav`] })
    const original = dough.getSound('unclipped-test').onTrigger
    const handles: { releaseAt: number; endAt: number }[] = []
    dough.registerSound('unclipped-test', async (...args: unknown[]) => {
      const handle = await original(...args)
      handles.push(handle)
      return handle
    })
    audio.advance(.99)
    await dough.superdough({ s: 'unclipped-test' }, 1, .02, 1)
    expect(handles[0].releaseAt).toBe(2)
    expect(handles[0].endAt).toBeCloseTo(2.01)
    expect(audio.voices[0].stopAt).toBeCloseTo(2.02)
    await attack('replacement', 1.2)
    expect(audio.voices[0].stopAt).toBeCloseTo(2.02)
    audio.advance(1.1)
    expect(audio.voices[0].disconnected).toBe(false)
    audio.advance(1.211)
    expect(audio.voices[0].disconnected).toBe(true)
  })

  it('admits nonoverlapping basic synth envelopes using declared source timing', async () => {
    dough.setMaxPolyphony(1)
    dough.registerSynthSounds()
    audio.advance(.99)
    await dough.superdough({ s: 'sine', note: 60, release: .1 }, 1, .02, 1)
    expect(audio.voices[0].stopAt).toBeCloseTo(1.13)
    await dough.superdough({ s: 'sine', note: 60, release: .1 }, 1.2, .02, 1)
    expect(audio.voices[0].stopAt).toBeCloseTo(1.13)
    expect(audio.voices[0].disconnected).toBe(false)
  })

  it('starts an overdue held attack immediately and reports its corrected onset', async () => {
    audio.advance(.02)
    await expect(attack('late', .01)).resolves.toBe(.02)
    expect(audio.voices[0].startAt).toBe(.02)
    expect(dough.hasVoice('late')).toBe(true)
  })

  it.each([.5, 1.05])('reports graph admission after source preparation at %ss', async (readyAt) => {
    let finishPreparation!: () => void
    const preparation = new Promise<void>(resolve => { finishPreparation = resolve })
    const original = dough.getSound('lifecycle-test').onTrigger
    dough.registerSound('lifecycle-test', async (...args: unknown[]) => {
      const handle = original(...args)
      await preparation
      return handle
    })
    const pending = attack('prepared', 1)
    expect(audio.voices[0].startAt).toBe(1)
    audio.advance(readyAt)
    finishPreparation()
    await expect(pending).resolves.toBe(Math.max(1, readyAt))
    expect(dough.hasVoice('prepared')).toBe(true)
  })

  it('continues skipping overdue finite pattern events', async () => {
    audio.advance(.02)
    await dough.superdough({ s: 'lifecycle-test' }, .01, .25, 1)
    expect(audio.voices).toHaveLength(0)
  })

  it('restores the default budget when initAudio receives no limit', async () => {
    // Disable browser initialization; this call still runs real budget setup.
    vi.stubGlobal('window', undefined)
    await dough.initAudio()
    expect(dough.maxPolyphony).toBe(128)
  })

  it.each([undefined, null, 0, -3, NaN, Infinity, 'bad', '12junk', true, [2]])('rejects invalid voice budget %s', (value) => {
    dough.setMaxPolyphony(value)
    expect(dough.maxPolyphony).toBe(128)
  })

  it.each([1, 16, '32'])('accepts the positive integer budget %s', (value) => {
    dough.setMaxPolyphony(value)
    expect(dough.maxPolyphony).toBe(Number(value))
  })

  it('cleans an ordinary released voice without allocating a timeout source', async () => {
    await attack('ordinary')
    dough.releaseVoice('ordinary', 1.2)
    audio.advance(1.24)
    expect(dough.hasVoice('ordinary')).toBe(false)
    expect(audio.sources.filter(source => source instanceof audio.Constant)).toHaveLength(0)
  })

  it('shortens cleanup when a held source ended naturally before key release', async () => {
    await attack('natural', 1, 1)
    audio.advance(2)
    dough.releaseVoice('natural', 3)
    audio.advance(3.04)
    expect(dough.hasVoice('natural')).toBe(false)
    expect(audio.voices.every(source => source.ended)).toBe(true)
  })

  it('keeps a real future cleanup deadline for a finite note effect tail', async () => {
    await dough.superdough({ s: 'lifecycle-test', naturalDuration: 1, release: .1 }, 1, 5, 1)
    const source = audio.voices[0]
    audio.advance(2)
    expect(source.disconnected).toBe(false)
    expect(audio.sources.filter(node => node instanceof audio.Constant)).toHaveLength(1)
    audio.advance(6.2)
    expect(source.disconnected).toBe(true)
    expect(audio.voices.every(node => node.ended)).toBe(true)
  })

  it('steals a release tail before an older held voice', async () => {
    dough.setMaxPolyphony(2)
    await attack('held')
    await attack('tail')
    audio.advance(1.1)
    dough.releaseVoice('tail')
    await attack('new', 1.12)
    audio.advance(1.115)
    expect(dough.hasVoice('tail')).toBe(true)
    audio.advance(1.131)
    expect(dough.hasVoice('held')).toBe(true)
    expect(dough.hasVoice('tail')).toBe(false)
    expect(dough.hasVoice('new')).toBe(true)
  })

  it('bounds active sources and retirement fades during a same-tick burst', async () => {
    dough.setMaxPolyphony(2)
    audio.advance(1)
    await Promise.all(Array.from({ length: 30 }, (_, i) => attack(`burst-${i}`)))
    expect(audio.sources.filter(source => !source.disconnected && !(source instanceof audio.Constant)).length).toBeLessThanOrEqual(4)
    audio.advance(1.02)
    expect(Array.from({ length: 30 }, (_, i) => dough.hasVoice(`burst-${i}`)).filter(Boolean)).toHaveLength(2)
  })

  it('fades a finite pattern voice before stealing it at the polyphony limit', async () => {
    dough.setMaxPolyphony(1)
    await dough.superdough({ s: 'lifecycle-test', release: .1 }, 1, 5, 1)
    const first = audio.voices[0]
    const ramps = audio.gains.map(node => vi.spyOn(node.gain, 'linearRampToValueAtTime'))
    audio.advance(1.1)
    await dough.superdough({ s: 'lifecycle-test', release: .1 }, 1.1, 5, 1)
    expect(first.stopAt).toBe(Infinity)
    expect(ramps.some(ramp => ramp.mock.calls.some(([value, at]) =>
      value === 0 && Math.abs(Number(at) - 1.11) < 1e-9,
    ))).toBe(true)
    audio.advance(1.12)
    expect(first.disconnected).toBe(true)
  })
})
