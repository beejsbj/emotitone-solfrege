import { describe, expect, it } from 'vitest'
import { LiveAudioCore } from './core'
import type { LiveCommand, LiveResponse, LiveVoiceEvent, PreparedLiveInstrument } from './types'

const bank: PreparedLiveInstrument = {
  kind: 'sample-bank', instrumentId: 'test', zoneSelection: 'nearest-root',
  gain: 1, attack: 0, decay: 0, sustain: 1, release: 0.01,
  zones: [{ id: 'zone', rootMidi: 60, sampleRate: 1000,
    channels: [new Float32Array([1, .5, 0, -.5]), new Float32Array([.2, .4, .6, .8])],
    loopStartFrame: 0, loopEndFrame: 4 }],
}
// A constant loop makes envelope timing measurable directly from rendered PCM.
const envelopeBank: PreparedLiveInstrument = {
  ...bank, attack: .002, decay: .003, sustain: .6, release: .2,
  zones: [{ ...bank.zones[0], channels: [new Float32Array([1, 1, 1, 1])] }],
}
function setup(instrument = bank) {
  const events: LiveVoiceEvent[] = []
  const messages: LiveResponse[] = []
  const core = new LiveAudioCore(1000, response => {
    messages.push(response)
    if (response.type === 'event') events.push(response.event)
  })
  let frame = 0
  const send = (command: LiveCommand) => core.command(command, frame)
  send({ type: 'prepare', requestId: 1, instrument })
  const press = (ownerId: string, pitches: number[]) => send({ type: 'press', ownerId,
    notes: pitches.map(pitch => ({ pitch, instrumentId: instrument.instrumentId })) })
  const render = (length: number) => {
    const output = [new Float32Array(length), new Float32Array(length)]
    core.render(output, frame)
    frame += length
    return output
  }
  return { core, events, messages, send, press, render }
}

describe('production live audio render core', () => {
  it('smoothly bends only its expression owner while leaving oscillator and PCM pitch events unchanged', () => {
    const oscillator: PreparedLiveInstrument = { kind: 'oscillator', instrumentId: 'osc', waveform: 'sine',
      gain: 1, attack: 0, decay: 0, sustain: 1, release: 0 }
    const baseline = setup(oscillator)
    baseline.press('finger', [48]); baseline.render(20)
    const base = baseline.render(1000)[0]
    const bent = setup(oscillator)
    bent.press('finger', [48]); bent.render(20)
    bent.send({ type: 'pitch-bend', ownerId: 'finger', cents: 500 })
    const expressive = bent.render(1000)[0]
    const rising = (samples: Float32Array) => samples.reduce((count, value, index) =>
      count + +(index > 20 && samples[index - 1] <= 0 && value > 0), 0)
    expect(rising(expressive)).toBeGreaterThan(rising(base))
    expect(bent.events.filter(event => event.phase === 'attack').map(event => event.pitch)).toEqual([48])
    const clamped = setup(oscillator)
    clamped.press('finger', [48]); clamped.render(20)
    clamped.send({ type: 'pitch-bend', ownerId: 'finger', cents: 50 })
    expect(expressive).toEqual(clamped.render(1000)[0])

    const pcm: PreparedLiveInstrument = { ...bank, zones: [{ ...bank.zones[0], rootMidi: 69,
      channels: [Float32Array.from({ length: 2000 }, (_, index) => Math.sin(2 * Math.PI * index / 10))],
      loopStartFrame: 0, loopEndFrame: 2000 }] }
    const pcmBase = setup(pcm)
    pcmBase.press('finger', [69]); pcmBase.render(20)
    const pcmUnbent = pcmBase.render(1000)[0]
    const pcmBent = setup(pcm)
    pcmBent.press('finger', [69]); pcmBent.render(20)
    pcmBent.send({ type: 'pitch-bend', ownerId: 'finger', cents: 50 })
    expect(rising(pcmBent.render(1000)[0])).toBeGreaterThan(rising(pcmUnbent))
  })

  it('isolates bends and clears stale expression on release, repress, clear, and invalid input', () => {
    const oscillator: PreparedLiveInstrument = { kind: 'oscillator', instrumentId: 'osc', waveform: 'sine',
      gain: 1, attack: 0, decay: 0, sustain: 1, release: 0 }
    const reference = setup(oscillator)
    reference.press('b', [48]); reference.render(30)
    const actual = setup(oscillator)
    actual.press('a', [48]); actual.press('b', [48]); actual.render(20)
    actual.send({ type: 'pitch-bend', ownerId: 'a', cents: 50 }); actual.render(10)
    actual.send({ type: 'release', ownerId: 'a' })
    expect(actual.render(10)[0]).toEqual(reference.render(10)[0])

    actual.send({ type: 'pitch-bend', ownerId: 'b', cents: 50 }); actual.send({ type: 'release', ownerId: 'b' })
    actual.press('b', [48]); actual.render(1)
    const fresh = setup(oscillator)
    fresh.press('b', [48]); fresh.render(1)
    expect(actual.render(10)[0]).toEqual(fresh.render(10)[0])
    actual.send({ type: 'pitch-bend', ownerId: 'b', cents: Infinity })
    expect(actual.render(20)[0].every(Number.isFinite)).toBe(true)
    actual.send({ type: 'pitch-bend', ownerId: 'b', cents: 50 }); actual.send({ type: 'clear' })
    actual.press('b', [48])
    const cleared = setup(oscillator)
    cleared.press('b', [48])
    expect(actual.render(20)[0]).toEqual(cleared.render(20)[0])
  })

  it('smoothly applies bounded per-owner gain to oscillator and PCM voices without changing their lifecycle', () => {
    const oscillator: PreparedLiveInstrument = { kind: 'oscillator', instrumentId: 'osc', waveform: 'sine',
      gain: 1, attack: 0, decay: 0, sustain: 1, release: .1 }
    const rms = (samples: Float32Array) => Math.sqrt(samples.reduce((sum, sample) => sum + sample ** 2, 0) / samples.length)
    const oscillatorBase = setup(oscillator)
    oscillatorBase.press('a', [60]); oscillatorBase.render(40)
    const oscillatorReference = oscillatorBase.render(100)[0]
    const oscillatorGain = setup(oscillator)
    oscillatorGain.press('a', [60]); oscillatorGain.render(40)
    oscillatorGain.send({ type: 'gain-expression', ownerId: 'a', gain: .25 })
    const oscillatorOutput = oscillatorGain.render(100)[0]
    expect(rms(oscillatorOutput.subarray(10))).toBeCloseTo(rms(oscillatorReference.subarray(10)) * .25, 2)
    expect(oscillatorGain.events.filter(event => event.phase === 'attack')).toHaveLength(1)
    oscillatorGain.send({ type: 'release', ownerId: 'a' })
    expect(rms(oscillatorGain.render(10)[0])).toBeLessThan(rms(oscillatorReference.subarray(0, 10)) * .3)

    const pcm = setup({ ...bank, gain: 1, release: .1, zones: [{ ...bank.zones[0],
      channels: [Float32Array.from({ length: 500 }, (_, index) => Math.sin(2 * Math.PI * index / 20))], loopEndFrame: 500 }] })
    const pcmReference = setup({ ...bank, gain: 1, release: .1, zones: [{ ...bank.zones[0],
      channels: [Float32Array.from({ length: 500 }, (_, index) => Math.sin(2 * Math.PI * index / 20))], loopEndFrame: 500 }] })
    pcm.press('a', [60]); pcmReference.press('a', [60]); pcm.render(40); pcmReference.render(40)
    pcm.send({ type: 'gain-expression', ownerId: 'a', gain: .25 })
    expect(rms(pcm.render(100)[0].subarray(10))).toBeCloseTo(rms(pcmReference.render(100)[0].subarray(10)) * .25, 2)
  })

  it('isolates gain owners, retains a release-tail gain, and carries gain into delayed attacks', () => {
    const constant: PreparedLiveInstrument = { ...bank, gain: 1, release: .1, zones: [{ ...bank.zones[0],
      channels: [new Float32Array(500).fill(1)], loopEndFrame: 500 }] }
    const isolated = setup(constant)
    isolated.press('a', [60]); isolated.press('b', [64]); isolated.render(1)
    isolated.send({ type: 'gain-expression', ownerId: 'a', gain: .25 }); isolated.render(10)
    // Owner b is still unity, so its distinct PCM voice keeps the total above one.
    expect(isolated.render(1)[0][0]).toBeCloseTo(1.25, 3)
    isolated.send({ type: 'release', ownerId: 'a' })
    expect(isolated.render(1)[0][0]).toBeCloseTo(1.25, 2)
    isolated.send({ type: 'clear' }); isolated.render(200)
    isolated.press('a', [60]); isolated.render(1)
    expect(isolated.render(1)[0][0]).toBeCloseTo(1, 3)

    const delayed = setup(constant)
    delayed.send({ type: 'configure', config: { style: 'strum-up' } })
    delayed.press('a', [60]); delayed.send({ type: 'gain-expression', ownerId: 'a', gain: .25 })
    expect(delayed.render(31)[0].at(-1)).toBeCloseTo(.25, 3)
    delayed.send({ type: 'gain-expression', ownerId: 'a', gain: Infinity })
    expect(delayed.render(10)[0].every(Number.isFinite)).toBe(true)
  })

  it('renders immediate stereo PCM, resamples by source rate/root pitch and loops', () => {
    const { press, render } = setup()
    press('finger', [48])
    const [left, right] = render(16)
    expect([...left].filter((_, index) => index % 2 === 0)).toEqual([1, .5, 0, -.5, 1, .5, 0, -.5])
    expect([...right].filter((_, index) => index % 2 === 0)).toEqual([.2, .4, .6, .8, .2, .4, .6, .8].map(Math.fround))
  })

  it('generates every 1/16 pulse and gate without main-thread callbacks', () => {
    const { send, press, render, events } = setup()
    send({ type: 'configure', config: { style: 'repeat', rate: 16 } })
    press('finger', [60])
    render(1000)
    expect(events.filter(e => e.phase === 'attack').map(e => e.at)).toEqual(
      [0, .125, .25, .375, .5, .625, .75, .875])
    expect(events.filter(e => e.phase === 'release').map(e => e.at)).toEqual(
      [.1, .225, .35, .475, .6, .725, .85, .975])
  })

  it('interpolates fractional sample positions with the source sample rate', () => {
    const halfRate: PreparedLiveInstrument = { ...bank, kind: 'sample-bank', zoneSelection: 'nearest-root',
      zones: [{ ...bank.zones[0], sampleRate: 500, loopEndFrame: 32,
        channels: [Float32Array.from({ length: 32 }, (_, index) => Math.sin(2 * Math.PI * index / 32))] }] }
    const { press, render } = setup(halfRate)
    press('finger', [60])
    const output = render(64)[0]
    for (let index = 0; index < output.length; index++) {
      expect(output[index]).toBeCloseTo(Math.sin(2 * Math.PI * index / 64), 2)
    }
  })

  it('honors first matching soundfont ranges and never fills an unsupported range with a wrong sample', () => {
    const ranges: PreparedLiveInstrument = { ...bank, kind: 'sample-bank', zoneSelection: 'first-range', zones: [
      { ...bank.zones[0], lowMidi: 60, highMidi: 64, loopEndFrame: 2, channels: [new Float32Array([.2, .2])] },
      { ...bank.zones[0], lowMidi: 64, highMidi: 67, loopEndFrame: 2, channels: [new Float32Array([.9, .9])] },
    ] }
    const { press, render, events } = setup(ranges)
    press('shared-boundary', [64]); press('outside', [80])
    expect(render(1)[0][0]).toBeCloseTo(.2)
    expect(events.filter(e => e.phase === 'attack').map(e => e.pitch)).toEqual([64])
  })

  it('selects the nearest sample root and preserves bank order for equal-distance roots', () => {
    const nearest: PreparedLiveInstrument = { ...bank, kind: 'sample-bank', zoneSelection: 'nearest-root', zones: [
      { ...bank.zones[0], rootMidi: 60, channels: [new Float32Array([.2, .2])] },
      { ...bank.zones[0], rootMidi: 64, channels: [new Float32Array([.9, .9])] },
    ] }
    const { press, render, send } = setup(nearest)
    press('tie', [62]); expect(render(1)[0][0]).toBeCloseTo(.2)
    send({ type: 'clear' }); render(20)
    press('closer', [63]); expect(render(1)[0][0]).toBeCloseTo(.9)
  })

  it.each(['sine', 'triangle', 'square', 'sawtooth'] as const)('renders finite audible %s and completes its release', waveform => {
    const { press, render, send, core } = setup({ kind: 'oscillator', instrumentId: 'osc', waveform,
      gain: .3, attack: .002, decay: .003, sustain: .7, release: .01 })
    press('finger', [48])
    const output = render(100)[0]
    expect(output.every(Number.isFinite)).toBe(true)
    expect(output.some(sample => Math.abs(sample) > .1)).toBe(true)
    expect(Math.max(...output.map(Math.abs))).toBeLessThanOrEqual(Math.fround(.3))
    send({ type: 'release', ownerId: 'finger' }); render(20)
    expect(core.voiceCount).toBe(0)
  })

  it.each(['strum-up', 'strum-down'] as const)('collects and sorts nearby %s inputs, maintaining35ms spread', style => {
    const { press, send, render, events } = setup()
    send({ type: 'configure', config: { style } })
    press('e', [64]); render(10); press('c', [60]); press('g', [67]); render(120)
    expect(events.filter(e => e.phase === 'attack').map(e => [e.pitch, e.at])).toEqual(
      style === 'strum-up' ? [[60, .03], [64, .065], [67, .1]] : [[67, .03], [64, .065], [60, .1]])
  })

  it('removes a released pending strum without shifting remaining notes', () => {
    const { press, send, render, events } = setup()
    send({ type: 'configure', config: { style: 'strum-up' } })
    press('a', [60]); press('b', [64]); press('c', [67]); render(40)
    send({ type: 'release', ownerId: 'b' }); render(100)
    expect(events.filter(e => e.phase === 'attack').map(e => [e.pitch, e.at])).toEqual([[60, .03], [67, .1]])
  })

  it('updates future arp notes while retaining the immediate first press and up-down sequence', () => {
    const { press, send, render, events } = setup()
    send({ type: 'configure', config: { style: 'arp-up-down', rate: 16 } })
    press('first', [64]); press('lower', [60]); press('higher', [67]); render(510)
    expect(events.filter(e => e.phase === 'attack').map(e => e.pitch)).toEqual([64, 64, 67, 64, 60])
  })

  it('does not post unchanged plans every render quantum and acknowledges bank retirement after its bounded fade', () => {
    const { press, send, render, events, messages } = setup()
    press('held', [60]); render(10)
    const plans = messages.filter(message => message.type === 'plan').length
    for (let i = 0; i < 10; i++) render(10)
    expect(messages.filter(message => message.type === 'plan')).toHaveLength(plans)
    send({ type: 'forget', requestId: 2, instrumentId: 'test', instant: false })
    expect(messages.filter(message => message.type === 'forgotten')).toHaveLength(0)
    expect(render(4)[0].some(value => value !== 0)).toBe(true)
    render(7)
    expect(messages.filter(message => message.type === 'forgotten')).toEqual([{ type: 'forgotten', requestId: 2 }])
    press('new', [60]); render(4)
    expect(events.filter(event => event.phase === 'attack')).toHaveLength(1)
  })

  it('forgets suspended banks immediately without needing an audio render callback', () => {
    const { core, press, render, send, messages } = setup()
    press('held', [60]); render(1)
    send({ type: 'forget', requestId: 9, instrumentId: 'test', instant: true })
    expect(core.voiceCount).toBe(0)
    expect(messages.at(-1)).toEqual({ type: 'forgotten', requestId: 9 })
  })

  it('cancels an onset before rendering without reporting a note that never sounded', () => {
    const { press, send, render, events } = setup()
    press('finger', [60]); send({ type: 'release', ownerId: 'finger' })
    expect(render(100)[0].every(value => value === 0)).toBe(true)
    expect(events).toEqual([])
  })

  it('releases and removes a naturally ended one-shot without waiting for key-up', () => {
    const instrument: PreparedLiveInstrument = { ...bank, kind: 'sample-bank', zoneSelection: 'nearest-root',
      zones: [{ ...bank.zones[0], loopStartFrame: undefined, loopEndFrame: undefined }] }
    const { press, render, core, events, send } = setup(instrument)
    press('held', [60]); render(20)
    expect(core.voiceCount).toBe(0)
    expect(events.map(event => [event.phase, event.at])).toEqual([['attack', 0], ['release', .004]])
    expect(events[0].articulation).toEqual({ attack: 0, decay: 0, sustain: 1, release: .01 })
    expect(events[1].articulation).toEqual({ attack: 0, decay: 0, sustain: 1, release: 0 })
    send({ type: 'release', ownerId: 'held' })
    expect(events).toHaveLength(2)
  })

  it('preserves30ms rhythmic releases while Together retains instrument articulation', () => {
    const { press, render, send, core } = setup({ ...bank, release: .2 })
    send({ type: 'configure', config: { style: 'repeat', rate: 16 } })
    press('held', [60]); render(1); send({ type: 'release', ownerId: 'held' }); render(31)
    expect(core.voiceCount).toBe(0)
    send({ type: 'configure', config: { style: 'together' } })
    press('held', [60]); render(1); send({ type: 'release', ownerId: 'held' }); render(31)
    expect(core.voiceCount).toBe(1)
  })

  it('acknowledges original unison owner only after its surviving shared lifecycle ends', () => {
    const { press, render, send, messages } = setup()
    send({ type: 'configure', config: { style: 'repeat', rate: 16 } })
    press('original', [60]); render(1); press('other', [60])
    send({ type: 'release', ownerId: 'original' }); render(10)
    expect(messages.filter(message => message.type === 'owner-ended')).toEqual([])
    render(90)
    const releaseIndex = messages.findIndex(message => message.type === 'event' && message.event.phase === 'release')
    const endedIndex = messages.findIndex(message => message.type === 'owner-ended' && message.ownerId === 'original')
    expect(endedIndex).toBeGreaterThan(releaseIndex)
  })

  it.each(['repeat', 'arp-up'] as const)('hands a shared %s voice to the surviving expression owner', style => {
    const constant: PreparedLiveInstrument = { ...bank, zones: [{ ...bank.zones[0],
      channels: [new Float32Array(500).fill(1)], loopEndFrame: 500 }] }
    const { core, press, render, send, events, messages } = setup(constant)
    send({ type: 'configure', config: { style, rate: 16 } })
    press('first', [60]); render(1)
    press('second', [60])
    send({ type: 'gain-expression', ownerId: 'first', gain: .25 })
    send({ type: 'gain-expression', ownerId: 'second', gain: 1.5 })
    render(10)
    send({ type: 'release', ownerId: 'first' })
    expect(core.voiceCount).toBe(1)
    expect(messages.filter(message => message.type === 'expression-owner')).toEqual([
      { type: 'expression-owner', noteId: events[0].noteId, ownerId: 'second', at: .011,
        cents: 0, gain: 1.5 },
    ])
    expect(render(10)[0].at(-1)).toBeCloseTo(1.5, 3)
    send({ type: 'gain-expression', ownerId: 'second', gain: .5 })
    expect(render(10)[0].at(-1)).toBeCloseTo(.5, 3)
    expect(events.filter(event => event.phase === 'attack')).toHaveLength(1)
  })

  it('retunes a shared rhythmic voice immediately when its expression owner releases', () => {
    const oscillator: PreparedLiveInstrument = { kind: 'oscillator', instrumentId: 'osc', waveform: 'sine',
      gain: 1, attack: 0, decay: 0, sustain: 1, release: 0 }
    const run = (cents: number) => {
      const { press, render, send } = setup(oscillator)
      send({ type: 'configure', config: { style: 'repeat', rate: 16 } })
      press('first', [48]); render(1); press('second', [48]); render(10)
      send({ type: 'release', ownerId: 'first' })
      send({ type: 'pitch-bend', ownerId: 'second', cents })
      return render(50)[0]
    }
    const neutral = run(0)
    const bent = run(50)
    expect([...bent.subarray(10)]).not.toEqual([...neutral.subarray(10)])
  })

  it('preserves arp phase at the next old-grid tempo boundary', () => {
    const { send, press, render, events } = setup()
    send({ type: 'configure', config: { style: 'arp-up', rate: 16 } })
    press('chord', [67, 60, 64])
    render(150)
    send({ type: 'configure', config: { bpm: 60 } })
    render(700)
    expect(events.filter(e => e.phase === 'attack').map(e => [e.pitch, e.at])).toEqual(
      [[60, 0], [64, .125], [67, .25], [60, .5], [64, .75]])
  })

  it('retains owner unisons and cancels queued pulses on final release', () => {
    const { send, press, render, events } = setup()
    send({ type: 'configure', config: { style: 'repeat', rate: 16 } })
    press('a', [60]); render(10); press('b', [60])
    send({ type: 'release', ownerId: 'a' }); render(20)
    expect(events.filter(e => e.phase === 'release')).toHaveLength(0)
    send({ type: 'release', ownerId: 'b' }); render(300)
    expect(events.map(e => [e.phase, e.at])).toEqual([['attack', 0], ['release', .03]])
  })

  it('bounds voice rendering and retires all output after repeated clear', () => {
    const { core, press, send, render, events } = setup()
    for (let i = 0; i < 200; i++) { press(`o${i}`, [60]); render(1) }
    expect(core.voiceCount).toBeLessThanOrEqual(72)
    send({ type: 'clear' }); send({ type: 'clear' })
    render(30)
    expect(core.voiceCount).toBe(0)
    const released = events.filter(e => e.phase === 'release').map(e => e.noteId)
    expect(new Set(released).size).toBe(released.length)
    expect(released).toHaveLength(200)
  })

  it('admits at most64 simultaneous voices without reporting stolen pre-onset notes as played', () => {
    const { core, press, render, events } = setup()
    for (let index = 0; index < 100; index++) press(`owner-${index}`, [60])
    render(1)
    expect(core.voiceCount).toBe(64)
    expect(events).toHaveLength(64)
    expect(events.every(event => event.phase === 'attack')).toBe(true)
  })

  // A constant-level loop makes every rendered frame equal the envelope.
  const dc: PreparedLiveInstrument = { ...bank, instrumentId: 'dc', attack: 0, release: 0,
    zones: [{ id: 'dc', rootMidi: 60, sampleRate: 1000, channels: [new Float32Array([1, 1, 1, 1])],
      loopStartFrame: 0, loopEndFrame: 4 }] }

  it('applies Shape envelope overrides to new voices only', () => {
    const { send, press, render } = setup(dc)
    press('before', [60])
    render(1)
    send({ type: 'shape', envelope: { attack: .01, release: .5 } })
    // The sounding voice keeps its instant attack and prepared release.
    expect(render(2)[0][1]).toBe(1)
    send({ type: 'shape', envelope: { attack: .01 } })
    send({ type: 'release', ownerId: 'before' })
    render(1)
    press('after', [60])
    // 10ms at 1kHz ramps over ten frames.
    expect([...render(4)[0]]).toEqual([0, .1, .2, .3].map(Math.fround))
  })

  it('restores prepared articulation when the override is cleared and ignores invalid values', () => {
    const { send, press, render } = setup(dc)
    send({ type: 'shape', envelope: { attack: .01 } })
    send({ type: 'shape', envelope: { attack: -1 } })
    send({ type: 'shape', envelope: { attack: Number.NaN } })
    press('shaped', [60])
    expect(render(2)[0][1]).toBeCloseTo(.1)
    send({ type: 'release', ownerId: 'shaped' })
    render(5)
    send({ type: 'shape', envelope: {} })
    press('natural', [60])
    expect(render(2)[0][1]).toBe(1)
  })

  it('uses the Shape release for held voices', () => {
    const { send, press, render } = setup(dc)
    send({ type: 'shape', envelope: { release: .004 } })
    press('finger', [60])
    render(3)
    send({ type: 'release', ownerId: 'finger' })
    expect([...render(5)[0]]).toEqual([1, .75, .5, .25, 0])
  })

  it.each([
    ['together', .2], ['repeat', .03], ['arp-up', .03],
  ] as const)('reports the rendered ADSR and key-up fade for %s', (style, release) => {
    const { press, send, render, events, core } = setup(envelopeBank)
    send({ type: 'configure', config: { style } })
    press('held', [60]); render(10)
    send({ type: 'release', ownerId: 'held' })
    const output = render(release * 1000 + 1)[0]
    expect(events.map(event => event.articulation)).toEqual([
      { attack: .002, decay: .003, sustain: .6, release },
      { attack: .002, decay: .003, sustain: .6, release },
    ])
    expect(events[1].at).toBe(.01)
    expect(output[0]).toBeCloseTo(.6)
    expect(output[output.length - 2]).toBeCloseTo(.6 / (release * 1000))
    expect(output[output.length - 1]).toBe(0)
    expect(core.voiceCount).toBe(0)
  })

  it('reports a30ms automatic rhythmic gate fade', () => {
    const { press, send, render, events } = setup(envelopeBank)
    send({ type: 'configure', config: { style: 'repeat', rate: 16 } })
    press('held', [60]); render(101)
    expect(events.at(-1)).toMatchObject({ phase: 'release', at: .1,
      articulation: { attack: .002, decay: .003, sustain: .6, release: .03 } })
  })

  it.each(['pressure', 'forget'] as const)('never extends an existing release during %s retirement', reason => {
    for (const remaining of [0, 1, 10, 15]) {
      const { core, press, render, send, events } = setup({ ...envelopeBank,
        attack: 0, decay: 0, sustain: 1, release: .02 })
      send({ type: 'prepare', requestId: 2, instrument: { kind: 'oscillator', instrumentId: 'silent',
        waveform: 'sine', gain: 0, attack: 0, decay: 0, sustain: 1, release: .02 } })
      press('tail', [60])
      if (reason === 'pressure') send({ type: 'press', ownerId: 'held',
        notes: Array.from({ length: 63 }, () => ({ pitch: 60, instrumentId: 'silent' })) })
      render(10)
      send({ type: 'release', ownerId: 'tail' })
      render(20 - remaining)
      if (reason === 'pressure') send({ type: 'press', ownerId: 'replacement',
        notes: [{ pitch: 60, instrumentId: 'silent' }] })
      else send({ type: 'forget', requestId: 3, instrumentId: 'test', instant: false })
      const output = render(12)[0]
      const fade = Math.min(10, remaining)
      for (let frame = 0; frame < output.length; frame++) {
        expect(output[frame], `${reason}: ${remaining}ms left, frame ${frame}`).toBeCloseTo(
          frame < fade ? remaining / 20 * (1 - frame / fade) : 0, 6)
      }
      expect(events.filter(event => event.ownerId === 'tail' && event.phase === 'release')).toHaveLength(1)
      expect(core.voiceCount).toBe(reason === 'pressure' ? 64 : 0)
    }
  })

  it('publishes only the actual10ms fade when stealing the oldest held voice', () => {
    const { press, send, render, events, core } = setup(envelopeBank)
    send({ type: 'prepare', requestId: 2, instrument: { ...envelopeBank, instrumentId: 'silent', gain: 0 } })
    press('oldest', [60])
    for (let i = 0; i < 63; i++) send({ type: 'press', ownerId: `silent-${i}`,
      notes: [{ pitch: 60, instrumentId: 'silent' }] })
    render(10)
    send({ type: 'press', ownerId: 'new', notes: [{ pitch: 60, instrumentId: 'silent' }] })
    const output = render(11)[0]
    expect([...output]).toEqual([.6, .54, .48, .42, .36, .3, .24, .18, .12, .06, 0].map(Math.fround))
    expect(core.voiceCount).toBe(64)
    expect(events.filter(event => event.phase === 'release')).toEqual([
      expect.objectContaining({ ownerId: 'oldest', at: .01,
        articulation: { attack: .002, decay: .003, sustain: .6, release: .01 } }),
    ])
    send({ type: 'clear' }); render(201)
    const attacks = events.filter(event => event.phase === 'attack').map(event => event.noteId).sort()
    const releases = events.filter(event => event.phase === 'release').map(event => event.noteId).sort()
    expect(releases).toEqual(attacks)
    expect(core.voiceCount).toBe(0)
  })

  it('steals the oldest admitted releasing voice before an older held voice', () => {
    const { press, send, render, events } = setup(envelopeBank)
    send({ type: 'prepare', requestId: 2, instrument: { ...envelopeBank, instrumentId: 'silent', gain: 0 } })
    const silent = (ownerId: string) => send({ type: 'press', ownerId,
      notes: [{ pitch: 60, instrumentId: 'silent' }] })
    silent('oldest-held')
    press('older-tail', [60])
    silent('younger-tail')
    for (let i = 0; i < 61; i++) silent(`held-${i}`)
    render(10)
    send({ type: 'release', ownerId: 'younger-tail' })
    send({ type: 'release', ownerId: 'older-tail' })
    silent('new')
    const output = render(11)[0]
    expect(output[9]).toBeCloseTo(.06)
    expect(output[10]).toBe(0)
    expect(events.filter(event => event.phase === 'release').map(event => event.ownerId))
      .toEqual(['younger-tail', 'older-tail'])
    send({ type: 'clear' }); render(201)
    expect(events.filter(event => event.phase === 'release' && event.ownerId === 'oldest-held')).toHaveLength(1)
    expect(new Set(events.filter(event => event.phase === 'release').map(event => event.noteId)).size).toBe(65)
  })

  it.each([false, true])('reports the actual bank retirement fade (instant=%s)', instant => {
    const { press, send, render, events, core } = setup(envelopeBank)
    press('held', [60]); render(10)
    send({ type: 'forget', requestId: 2, instrumentId: 'test', instant })
    expect(events.at(-1)).toMatchObject({ phase: 'release', at: .01,
      articulation: { attack: .002, decay: .003, sustain: .6, release: instant ? 0 : .01 } })
    const output = render(11)[0]
    expect([...output]).toEqual((instant ? Array(11).fill(0)
      : [.6, .54, .48, .42, .36, .3, .24, .18, .12, .06, 0]).map(Math.fround))
    expect(core.voiceCount).toBe(0)
  })
})
