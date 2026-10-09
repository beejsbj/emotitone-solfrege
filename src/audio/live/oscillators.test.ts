import { describe, expect, it } from 'vitest'
import { LiveAudioCore } from './core'
import { getLiveArticulation } from '../../services/liveArticulation'
import type { LiveCommand, LiveVoiceEvent } from './types'

const rate = 48000
function oscillator(waveform: 'square' | 'sawtooth', frequency = 440) {
  const events: LiveVoiceEvent[] = []
  const core = new LiveAudioCore(rate, message => {
    if (message.type === 'event') events.push(message.event)
  })
  let frame = 0
  const send = (command: LiveCommand) => core.command(command, frame)
  send({ type: 'prepare', requestId: 1, instrument: {
    kind: 'oscillator', instrumentId: waveform, waveform, gain: .24, ...getLiveArticulation(waveform),
  } })
  const press = () => send({ type: 'press', ownerId: 'finger', notes: [{
    pitch: 69 + 12 * Math.log2(frequency / 440), instrumentId: waveform,
  }] })
  const render = (seconds: number) => {
    const pcm = new Float32Array(Math.round(seconds * rate))
    for (let i = 0; i < pcm.length; i += 128) core.render([pcm.subarray(i, i + 128)], frame + i)
    frame += pcm.length
    return pcm
  }
  return { core, send, press, render, events }
}
function magnitude(pcm: Float32Array, frequency: number) {
  let real = 0, imaginary = 0
  for (let i = 0; i < pcm.length; i++) {
    const phase = 2 * Math.PI * frequency * i / rate
    real += pcm[i] * Math.cos(phase)
    imaginary += pcm[i] * Math.sin(phase)
  }
  return 2 * Math.hypot(real, imaginary) / pcm.length
}
function rms(pcm: Float32Array) {
  return Math.sqrt(pcm.reduce((sum, value) => sum + value * value, 0) / pcm.length)
}
function pitch(pcm: Float32Array) {
  const crossings: number[] = []
  for (let i = 1; i < pcm.length; i++) if (pcm[i - 1] <= 0 && pcm[i] > 0) {
    crossings.push(i - 1 - pcm[i - 1] / (pcm[i] - pcm[i - 1]))
  }
  return rate * (crossings.length - 1) / (crossings.at(-1)! - crossings[0])
}

describe.each(['square', 'sawtooth'] as const)('%s worklet PCM', waveform => {
  it('has the expected harmonic family and releases to silence', () => {
    const voice = oscillator(waveform)
    voice.press(); voice.render(.1)
    const pcm = voice.render(.5)
    const fundamental = magnitude(pcm, 440)
    expect(fundamental).toBeGreaterThan(.14)
    for (let harmonic = 2; harmonic <= 8; harmonic++) {
      const level = magnitude(pcm, 440 * harmonic) / fundamental
      if (waveform === 'square' && harmonic % 2 === 0) expect(level).toBeLessThan(.001)
      else expect(level).toBeCloseTo(1 / harmonic, 2)
    }
    voice.send({ type: 'release', ownerId: 'finger' }); voice.render(.12)
    expect(rms(voice.render(.05))).toBe(0)
    expect(voice.core.voiceCount).toBe(0)
  })

  it('keeps high-note foldback below -20 dBc (a naive oscillator fails)', () => {
    const frequency = 5000
    const voice = oscillator(waveform, frequency)
    voice.press(); voice.render(.1)
    const pcm = voice.render(.1)
    const fundamental = magnitude(pcm, frequency)
    // The first five above-Nyquist harmonics fold to 23, 18, 13, 8 and 3 kHz.
    // PolyBLEP suppresses rather than eliminates aliases; bound their level.
    for (let harmonic = 5; harmonic <= 9; harmonic++) {
      const folded = Math.abs(((harmonic * frequency + rate / 2) % rate) - rate / 2)
      expect(magnitude(pcm, folded) / fundamental).toBeLessThan(.1)
    }
    const naive = Float32Array.from({ length: pcm.length }, (_, i) => {
      const phase = (i * frequency / rate) % 1
      return waveform === 'square' ? (phase < .5 ? 1 : -1) : 2 * phase - 1
    })
    expect(magnitude(naive, 23000) / magnitude(naive, frequency)).toBeGreaterThan(.1)
  })

  it('bends the sounding pitch and applies successive tremolo gain targets', () => {
    const voice = oscillator(waveform)
    voice.press(); voice.render(.1)
    const base = voice.render(.25)
    voice.send({ type: 'pitch-bend', ownerId: 'finger', cents: 50 }); voice.render(.02)
    expect(pitch(voice.render(.25))).toBeCloseTo(440 * 2 ** (50 / 1200), 1)
    voice.send({ type: 'pitch-bend', ownerId: 'finger', cents: 0 }); voice.render(.02)
    // The finger-expression controller supplies tremolo as changing gain targets.
    for (const gain of [.5, 1.5, .5, 1]) {
      voice.send({ type: 'gain-expression', ownerId: 'finger', gain }); voice.render(.02)
      expect(rms(voice.render(.25)) / rms(base)).toBeCloseTo(gain, 2)
    }
    expect(voice.events.filter(event => event.phase === 'attack').map(event => event.pitch)).toEqual([69])
  })

  it('renders every repeat without further main-thread commands', () => {
    const voice = oscillator(waveform)
    voice.send({ type: 'configure', config: { style: 'repeat', bpm: 120, rate: 16 } })
    voice.press()
    const pcm = voice.render(1)
    expect(voice.events.filter(event => event.phase === 'attack').map(event => event.at)).toEqual(
      Array.from({ length: 8 }, (_, i) => i * .125),
    )
    for (let i = 0; i < 8; i++) {
      expect(rms(pcm.subarray(Math.round((i * .125 + .01) * rate), Math.round((i * .125 + .08) * rate)))).toBeGreaterThan(.1)
    }
  })
})
