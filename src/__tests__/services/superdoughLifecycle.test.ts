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
})

afterEach(() => {
  dough.resetGlobalEffects()
  vi.unstubAllGlobals()
})

function attack(id: string, at = 1, naturalDuration?: number) {
  return dough.superdough({ s: 'lifecycle-test', voiceId: id, sustainUntilRelease: true, release: .03, naturalDuration }, at, .25, 1)
}

describe('published superdough lifecycle and voice budget', () => {
  it('starts an overdue held attack immediately and reports its corrected onset', async () => {
    audio.advance(.02)
    await expect(attack('late', .01)).resolves.toBe(.02)
    expect(audio.sources[0].startAt).toBe(.02)
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
    expect(audio.sources[0].startAt).toBe(1)
    audio.advance(readyAt)
    finishPreparation()
    await expect(pending).resolves.toBe(Math.max(1, readyAt))
    expect(dough.hasVoice('prepared')).toBe(true)
  })

  it('continues skipping overdue finite pattern events', async () => {
    audio.advance(.02)
    await dough.superdough({ s: 'lifecycle-test' }, .01, .25, 1)
    expect(audio.sources).toHaveLength(0)
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
    expect(audio.sources.every(source => source.ended)).toBe(true)
  })

  it('keeps a real future cleanup deadline for a finite note effect tail', async () => {
    await dough.superdough({ s: 'lifecycle-test', naturalDuration: 1, release: .1 }, 1, 5, 1)
    const source = audio.sources[0]
    audio.advance(2)
    expect(source.disconnected).toBe(false)
    expect(audio.sources.filter(node => node instanceof audio.Constant)).toHaveLength(1)
    audio.advance(6.2)
    expect(source.disconnected).toBe(true)
    expect(audio.sources.every(node => node.ended)).toBe(true)
  })

  it('steals a release tail before an older held voice', async () => {
    dough.setMaxPolyphony(2)
    await attack('held')
    await attack('tail')
    audio.advance(1.1)
    dough.releaseVoice('tail')
    await attack('new', 1.12)
    audio.advance(1.115)
    expect(dough.hasVoice('held')).toBe(true)
    expect(dough.hasVoice('tail')).toBe(false)
    expect(dough.hasVoice('new')).toBe(true)
  })

  it('bounds active sources and retirement fades during a same-tick burst', async () => {
    dough.setMaxPolyphony(2)
    await Promise.all(Array.from({ length: 30 }, (_, i) => attack(`burst-${i}`)))
    expect(audio.sources.filter(source => !source.disconnected && !(source instanceof audio.Constant)).length).toBeLessThanOrEqual(4)
    audio.advance(.02)
    expect(Array.from({ length: 30 }, (_, i) => dough.hasVoice(`burst-${i}`)).filter(Boolean)).toHaveLength(2)
  })
})
