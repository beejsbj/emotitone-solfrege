import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { LiveAudioCore } from './core'
import { ECHO_LOOP_FRAMES, MAX_ECHO_FEEDBACK } from './echo'
import { LIMITER_CEILING } from './limiter'
import { WetEffects } from './wet'
import { readTransportEvents } from './transportEvents'
import type { TransportMemberTable } from './transport'
import type { LiveResponse, PreparedLiveInstrument } from './types'
import { OPEN_CUTOFF_HZ, type LiveShaping } from '../liveShaping'

/**
 * The room and the echo inside the worklet (BJS-596), heard in the core's
 * rendered output: what reaches the destination, the limiter included.
 */
const RATE = 48000
const QUANTUM = 128
const open: LiveShaping = { cutoff: OPEN_CUTOFF_HZ, resonance: 0, room: 0, delay: 0 }
const reference = JSON.parse(readFileSync('audio-lab/effects/fixtures/reference.json', 'utf8'))
function decode(encoded: string) {
  const buffer = Buffer.from(encoded, 'base64')
  return new Float32Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
}

function bank(data: Float32Array, rate = RATE): PreparedLiveInstrument {
  return { kind: 'sample-bank', instrumentId: 'fixture', zoneSelection: 'nearest-root',
    gain: 1, attack: 0, decay: 0, sustain: 1, release: 0,
    zones: [{ id: 'zone', rootMidi: 69, sampleRate: rate, channels: [data] }] }
}

/** Render `frames` one quantum at a time, as the worklet does. */
function renderQuanta(core: LiveAudioCore, frames: number, from = 0) {
  const out = [new Float32Array(frames), new Float32Array(frames)]
  const quantum = [new Float32Array(QUANTUM), new Float32Array(QUANTUM)]
  for (let frame = 0; frame < frames; frame += QUANTUM) {
    core.render(quantum, from + frame)
    for (let c = 0; c < 2; c++) out[c].set(quantum[c].subarray(0, Math.min(QUANTUM, frames - frame)), frame)
  }
  return out
}

/** A unit impulse at `at`, played at half level (under the limiter's ceiling) through `shape`. */
function impulseThrough(shape: LiveShaping, frames: number, at = 0, rate = RATE) {
  const data = new Float32Array(frames); data[at] = 1
  const core = new LiveAudioCore(rate, () => {})
  core.command({ type: 'prepare', requestId: 1, instrument: bank(data, rate) }, 0)
  core.command({ type: 'effects', shaping: shape }, 0)
  core.command({ type: 'press', ownerId: 'note', notes: [{ pitch: 69, instrumentId: 'fixture', velocity: .5 }] }, 0)
  return { core, out: renderQuanta(core, frames) }
}

const power = (pcm: ArrayLike<number>, from: number, to: number) => {
  let sum = 0
  for (let i = from; i < to; i++) sum += pcm[i] * pcm[i]
  return sum / (to - from)
}
const dB = (ratio: number) => 10 * Math.log10(ratio)
/** Energy after first-order lowpasses at the frozen comparison's band edges. */
function bands(pcm: ArrayLike<number>) {
  return [250, 1000, 4000, 12000].map(cutoff => {
    const alpha = 1 - Math.exp(-2 * Math.PI * cutoff / RATE)
    let y = 0, sum = 0
    for (let i = 0; i < pcm.length; i++) { y += alpha * (pcm[i] - y); sum += y * y }
    return sum / pcm.length
  })
}
/** One band of a signal: the difference of two first-order lowpasses (or the residue above the lower edge). */
function band(pcm: ArrayLike<number>, low: number, high: number | undefined, rate = RATE) {
  const lowpass = (cutoff: number) => {
    const alpha = 1 - Math.exp(-2 * Math.PI * cutoff / rate)
    let y = 0
    return Float64Array.from(pcm as ArrayLike<number>, value => (y += alpha * (value - y)))
  }
  const below = lowpass(low)
  const above = high === undefined ? Float64Array.from(pcm as ArrayLike<number>) : lowpass(high)
  return above.map((value, i) => value - below[i])
}
/** Seconds to fall 60 dB, from the slope of 100 ms window energies between `from` and `to` seconds. */
function t60(pcm: ArrayLike<number>, from: number, to: number, rate = RATE) {
  const window = Math.round(.1 * rate)
  const xs: number[] = [], ys: number[] = []
  for (let t = from; t + .1 <= to + 1e-9; t += .1) {
    const start = Math.round(t * rate)
    xs.push(t + .05); ys.push(dB(power(pcm, start, start + window)))
  }
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length, my = ys.reduce((s, y) => s + y, 0) / ys.length
  let num = 0, den = 0
  for (let i = 0; i < xs.length; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2 }
  return -60 / (num / den)
}

describe('the echo (BJS-596)', () => {
  it('matches the frozen native delay bus sample for sample: 250 ms, feedback 0.3, a quantum more each turn', () => {
    // The browser capture: an impulse 50 ms in, delay send 0.6, at half level; the reference at half scale.
    const { out } = impulseThrough({ ...open, delay: .6 }, 96000, 2400)
    const expected = decode(reference.delay).map(value => value * .5)
    const wet = Float32Array.from(out[0])
    expect(wet[2400]).toBe(.5)
    wet[2400] = 0 // the dry impulse; the rest is the echo alone
    expect(wet).toEqual(expected)
    expect(out[1]).toEqual(out[0])
  })

  it('times its echoes from the send and decays each turn by the feedback, up to the 0.98 maximum', () => {
    for (const [time, feedback] of [[.1, .5], [.25, MAX_ECHO_FEEDBACK], [.25, 3]]) {
      const data = new Float32Array(RATE); data[0] = 1
      const core = new LiveAudioCore(RATE, () => {})
      core.command({ type: 'prepare', requestId: 1, instrument: bank(data) }, 0)
      core.command({ type: 'echo', time, feedback }, 0)
      core.command({ type: 'effects', shaping: { ...open, delay: .5 } }, 0)
      core.command({ type: 'press', ownerId: 'note', notes: [{ pitch: 69, instrumentId: 'fixture', velocity: .5 }] }, 0)
      const out = renderQuanta(core, 4 * RATE)[0]
      const frames = Math.round(time * RATE)
      const held = Math.fround(Math.min(MAX_ECHO_FEEDBACK, feedback))
      const echoes: number[] = []
      for (let i = 1; i < out.length; i++) if (out[i] !== 0) echoes.push(i)
      expect(echoes.length).toBeGreaterThan(5)
      echoes.forEach((frame, turn) => {
        expect(frame, `echo ${turn}`).toBe(frames + turn * (frames + ECHO_LOOP_FRAMES))
        expect(out[frame] / out[echoes[0]]).toBeCloseTo(held ** turn, 5)
      })
      expect(out[echoes[0]]).toBe(.25)
    }
  })

  it('ignores an echo setting that is not a number', () => {
    const { core } = impulseThrough({ ...open, delay: .5 }, QUANTUM)
    core.command({ type: 'echo', time: Number.NaN, feedback: .5 }, QUANTUM)
    const out = renderQuanta(core, RATE / 2, QUANTUM)[0]
    // Still 250 ms after the send at frame 0.
    expect(out.findIndex(value => value !== 0)).toBe(12000 - QUANTUM)
  })
})

describe('the room (BJS-596)', () => {
  const frames = 3 * RATE
  /** The room's impulse response at half level, left and right. */
  function roomResponse(rate = RATE) {
    const { out } = impulseThrough({ ...open, room: 1 }, Math.round(3 * rate), 0, rate)
    expect(out[0][0]).toBe(.5)
    for (const channel of out) channel[0] -= .5 // the dry impulse
    return out
  }

  it('builds from silence over its first 100 ms, then falls 60 dB in about 2 s, the highs faster', () => {
    const [left, right] = roomResponse()
    // Nothing comes back before the shortest line, then it swells in.
    const first = left.findIndex(value => value !== 0)
    expect(first / RATE).toBeGreaterThan(.025)
    expect(first / RATE).toBeLessThan(.035)
    expect(dB(power(left, 0, 2400) / power(left, 4800, 9600))).toBeLessThan(-6)
    // Decay, read from 100 ms windows over the first 1.5 s of tail, by band.
    const low = t60(band(left, 250, 1000), .2, 1.5)
    const high = t60(band(left, 4000, 12000), .2, 1.5)
    expect(low).toBeGreaterThan(1.85); expect(low).toBeLessThan(2.15)
    expect(high).toBeLessThan(low)
    expect(high).toBeGreaterThan(1.3)
    // Two uncorrelated sides: a wide room, not a mono one.
    let cross = 0, l = 0, r = 0
    for (let i = 0; i < left.length; i++) { cross += left[i] * right[i]; l += left[i] ** 2; r += right[i] ** 2 }
    expect(Math.abs(cross / Math.sqrt(l * r))).toBeLessThan(.2)
  })

  it('keeps the old convolver room\'s level, spectrum and decay (the frozen native capture)', () => {
    const rendered = roomResponse()
    for (let c = 0; c < 2; c++) {
      const expected = decode(reference.room[c]).map(value => value * .5)
      // The same energy in all.
      expect(Math.abs(dB(power(rendered[c], 0, frames) / power(expected, 0, frames)))).toBeLessThan(.5)
      // The same balance in four broad bands.
      const want = bands(expected)
      bands(rendered[c]).forEach((energy, index) => expect(Math.abs(dB(energy / want[index])), `band ${index}`).toBeLessThan(1))
      // Every 100 ms window within 2.5 dB of the old room's while the tail falls its first 60 dB (2 s), and 3.5 dB
      // after. A feedback network's tail curves the other way from the old impulse's swept lowpass, so it cannot
      // follow it exactly: its decay is a little quicker in the middle and slower at the end (audio-lab/effects/README.md).
      for (let from = 0; from + 4800 <= frames; from += 4800) {
        const difference = dB(power(rendered[c], from, from + 4800) / power(expected, from, from + 4800))
        expect(Math.abs(difference), `window at ${from / RATE} s`).toBeLessThan(from < 2 * RATE ? 2.5 : 3.5)
      }
    }
  })

  it('sounds the same at 44.1 kHz: the same decay and level', () => {
    const at48 = roomResponse()[0]
    const at44 = roomResponse(44100)[0]
    expect(Math.abs(t60(band(at44, 250, 1000, 44100), .2, 1.5, 44100) - t60(band(at48, 250, 1000), .2, 1.5))).toBeLessThan(.1)
    const level = (pcm: Float32Array, rate: number) => power(pcm, Math.round(.1 * rate), Math.round(.6 * rate))
    expect(Math.abs(dB(level(at44, 44100) / level(at48, RATE)))).toBeLessThan(.5)
  })
})

// ── Dry and wet together at the destination ──

/**
 * A bright, sustained tone whose four-note chords peak at about 0.93 dry: just
 * under the limiter's ceiling, so any room or echo on top goes over it.
 */
function loudBank(): PreparedLiveInstrument {
  const frames = 2 * RATE
  const data = new Float32Array(frames)
  for (let i = 0; i < frames; i++) {
    const t = i / RATE
    let value = 0
    for (let h = 1; h <= 8; h++) value += Math.sin(2 * Math.PI * 220 * h * t) / h
    data[i] = value * .135
  }
  return { ...bank(data), gain: 1, release: .3 }
}

describe('dry and wet are limited together (BJS-596)', () => {
  it.each([[0, 0, .3], [1, 0, .3], [0, 1, .3], [1, 1, .3], [1, 1, MAX_ECHO_FEEDBACK]])(
    'never leaves over full scale at room %s / delay %s (feedback %s)', (room, delay, feedback) => {
      const core = new LiveAudioCore(RATE, () => {})
      core.command({ type: 'prepare', requestId: 1, instrument: loudBank() }, 0)
      core.command({ type: 'echo', time: .25, feedback }, 0)
      core.command({ type: 'effects', shaping: { ...open, room, delay } }, 0)
      const out = [new Float32Array(QUANTUM), new Float32Array(QUANTUM)]
      let peak = 0
      let frame = 0
      // Chords on every half second for four seconds, each held 0.4 s, then two seconds of tails.
      for (let beat = 0; beat < 8; beat++) {
        const at = beat * RATE / 2
        while (frame < at) { core.render(out, frame); frame += QUANTUM; peak = Math.max(peak, ...out[0].map(Math.abs), ...out[1].map(Math.abs)) }
        for (const pitch of [57, 61, 64, 69]) core.command({ type: 'press', ownerId: `${beat}-${pitch}`, notes: [{ pitch, instrumentId: 'fixture' }] }, frame)
        while (frame < at + .4 * RATE) { core.render(out, frame); frame += QUANTUM; peak = Math.max(peak, ...out[0].map(Math.abs), ...out[1].map(Math.abs)) }
        for (const pitch of [57, 61, 64, 69]) core.command({ type: 'release', ownerId: `${beat}-${pitch}` }, frame)
      }
      while (frame < 6 * RATE) { core.render(out, frame); frame += QUANTUM; peak = Math.max(peak, ...out[0].map(Math.abs), ...out[1].map(Math.abs)) }
      expect(peak).toBeLessThanOrEqual(1)
      // Dry alone stays under the ceiling, untouched; with any room or echo the mix went over full scale,
      // and without the limiter after the effects these renders would clip.
      if (room || delay) expect(core.limiter.peakIn).toBeGreaterThan(1)
      else expect(core.limiter.peakIn).toBeLessThan(LIMITER_CEILING)
    })

  it('leaves the dry mix untouched, bit for bit, while nothing is sent', () => {
    const quiet = (bypass: boolean) => {
      const core = new LiveAudioCore(RATE, () => {})
      if (bypass) core.wet.process = () => {}
      core.command({ type: 'prepare', requestId: 1, instrument: loudBank() }, 0)
      core.command({ type: 'press', ownerId: 'a', notes: [{ pitch: 69, instrumentId: 'fixture' }] }, 0)
      const out = renderQuanta(core, RATE)
      expect(core.wet.active).toBe(false)
      return out
    }
    const withWet = quiet(false), without = quiet(true)
    for (let c = 0; c < 2; c++) expect(withWet[c]).toEqual(without[c])
  })

  it('stops running once a tail has died away, and its output there is exact silence', () => {
    const { core, out } = impulseThrough({ ...open, room: 1, delay: 1 }, 2 * RATE)
    expect(core.wet.active).toBe(true)
    expect(out[0].subarray(RATE).some(value => value !== 0)).toBe(true)
    // The echo at feedback 0.3 lasts longest: 12 turns to fall 120 dB, about 3.3 s.
    const later = renderQuanta(core, 3 * RATE, 2 * RATE)
    expect(core.wet.active).toBe(false)
    const tail = renderQuanta(core, RATE, 5 * RATE)
    expect(tail[0].every(value => value === 0) && tail[1].every(value => value === 0)).toBe(true)
    expect(Math.max(...later[0].subarray(-RATE / 2).map(Math.abs))).toBeLessThan(1e-6)
  })

  it('allocates nothing while the room and echo run 60 s of changing sends', () => {
    const wet = new WetEffects(RATE)
    const output = [new Float32Array(QUANTUM), new Float32Array(QUANTUM)]
    const room = [new Float32Array(QUANTUM), new Float32Array(QUANTUM)]
    const delay = [new Float32Array(QUANTUM), new Float32Array(QUANTUM)]
    const allocations: string[] = []
    for (const name of ['Float32Array', 'Float64Array', 'Int32Array', 'Array', 'Map', 'Set'] as const) {
      const original = globalThis[name]
      vi.stubGlobal(name, new Proxy(original, { construct(target, args) {
        allocations.push(name)
        return Reflect.construct(target, args)
      } }))
    }
    try {
      for (let frame = 0; frame < 60 * RATE; frame += QUANTUM) {
        const sending = frame % RATE < RATE / 2
        for (let c = 0; c < 2; c++) {
          output[c].fill(0)
          for (let i = 0; i < QUANTUM; i++) room[c][i] = delay[c][i] = sending ? Math.sin((frame + i) * .05) * .3 : 0
        }
        if (frame % (10 * RATE) === 0) wet.setEcho(.25, frame % (20 * RATE) ? .9 : .3)
        if (frame % (7 * RATE) === 0) wet.cut(frame)
        wet.process(output, room, delay, frame, QUANTUM)
      }
    } finally { vi.unstubAllGlobals() }
    expect(allocations).toEqual([])
    expect(output[0].every(Number.isFinite)).toBe(true)
  }, 60000)
})

// ── Cuts: Stop All's second tap, and the "cut" tail policy ──

const sine: PreparedLiveInstrument = { kind: 'oscillator', instrumentId: 'sine', waveform: 'sine',
  gain: .3, attack: .002, decay: 0, sustain: 1, release: .05 }
const one = <T extends Float32Array | Float64Array | Uint32Array>(Type: { from(values: number[]): T }, value: number) => Type.from([value])

/** One held A4 for four bars as a Looper member, sending to the room and the echo. */
function heldMember(): TransportMemberTable {
  return { id: 'held', generation: 1, instrumentId: 'sine', lengthBars: 4,
    shaping: { ...open, room: .5, delay: .5 },
    begin: one(Float64Array, 0), gate: one(Float64Array, 3.9), pitch: one(Float32Array, 69), velocity: one(Float32Array, 1),
    attack: one(Float32Array, .002), decay: one(Float32Array, 0), sustain: one(Float32Array, 1), release: one(Float32Array, .05),
    pitchStart: one(Uint32Array, 0), pitchCount: one(Uint32Array, 0), pitchTime: new Float32Array(0), pitchCents: new Float32Array(0),
    gainStart: one(Uint32Array, 0), gainCount: one(Uint32Array, 0), gainTime: new Float32Array(0), gainValue: new Float32Array(0) }
}

/** A Looper member and a live note both feeding the room and echo, rendered to `seconds`; the stop lands at 0.4 s. */
function stopRig(stop: 'plain' | 'cut' | 'wet-cut', seconds = 1.6) {
  const queued: LiveResponse[] = []
  const core = new LiveAudioCore(RATE, response => { queued.push(response) })
  let frame = 0
  const deliver = () => {
    for (const response of queued.splice(0)) if (response.type === 'transport-events') {
      readTransportEvents(response, () => {})
      core.command({ type: 'transport-recycle', buffer: response.buffer }, frame)
    }
  }
  core.command({ type: 'prepare', requestId: 1, instrument: sine }, 0)
  core.command({ type: 'effects', shaping: { ...open, room: .5, delay: .5 } }, 0)
  core.command({ type: 'transport-change', requestId: 2, boundary: 'immediate',
    change: { type: 'join', member: { table: heldMember(), offsetBars: 0, rate: 1, muted: false } } }, 0)
  core.command({ type: 'transport-start', requestId: 3, run: 1, bpm: 120 }, 0)
  core.command({ type: 'press', ownerId: 'live', notes: [{ pitch: 64, instrumentId: 'sine' }] }, 0)
  deliver()
  const total = Math.round(seconds * RATE)
  const out = [new Float32Array(total), new Float32Array(total)]
  const quantum = [new Float32Array(QUANTUM), new Float32Array(QUANTUM)]
  const stopAt = Math.ceil(.4 * RATE / QUANTUM) * QUANTUM
  // The live note lets go before the stop and has finished its release by then: only its room and echo still sound.
  const liveOff = stopAt - 25 * QUANTUM
  while (frame < total) {
    if (frame === liveOff) core.command({ type: 'release', ownerId: 'live' }, frame)
    if (frame === stopAt) {
      if (stop === 'wet-cut') {
        core.command({ type: 'transport-change', requestId: 4, boundary: 'immediate', change: { type: 'update', memberId: 'held', patch: { muted: true } } }, frame)
        core.command({ type: 'wet-cut' }, frame)
      } else core.command({ type: 'transport-stop', requestId: 4, ...(stop === 'cut' ? { cut: true } : {}) }, frame)
      deliver()
    }
    core.render(quantum, frame)
    for (let c = 0; c < 2; c++) out[c].set(quantum[c], frame)
    frame += QUANTUM
    deliver()
  }
  return { core, out, stopAt }
}

const peakOf = (pcm: Float32Array, from: number, to: number) => {
  let peak = 0
  for (let i = from; i < to; i++) peak = Math.max(peak, Math.abs(pcm[i]))
  return peak
}
const largestMove = (pcm: Float32Array, from: number, to: number) => {
  let move = 0
  for (let i = from + 1; i < to; i++) move = Math.max(move, Math.abs(pcm[i] - pcm[i - 1]))
  return move
}

describe('cutting the room and echo (BJS-596, BJS-598)', () => {
  it('rings on after a plain stop', () => {
    const { out, stopAt } = stopRig('plain')
    // Past the notes' own release: what is left is the room and the echo.
    expect(peakOf(out[0], stopAt + .06 * RATE, stopAt + .2 * RATE)).toBeGreaterThan(1e-3)
    // The echo of the notes' last 250 ms comes round after the stop.
    expect(peakOf(out[0], stopAt + .3 * RATE, stopAt + .6 * RATE)).toBeGreaterThan(1e-3)
  })

  it.each(['cut', 'wet-cut'] as const)('a %s fades every tail to silence in 10 ms with no step, then takes new sound at once', stop => {
    const { core, out, stopAt } = stopRig(stop)
    const fade = .01 * RATE
    expect(peakOf(out[0], stopAt - .05 * RATE, stopAt)).toBeGreaterThan(.05)
    for (let c = 0; c < 2; c++) {
      // Silence, exactly, from the end of the fade: the member, the live note, their room and their echo.
      expect(out[c].subarray(stopAt + fade + .05 * RATE).every(value => value === 0), `channel ${c}`).toBe(true)
      // A ramp, not a step: no move through the cut larger than the music's own before it.
      expect(largestMove(out[c], stopAt - 1, stopAt + fade + 1)).toBeLessThanOrEqual(largestMove(out[c], stopAt - .05 * RATE, stopAt) + 1e-6)
    }
    // A short note after the cut gets a room and echo of their own, heard once the note itself has ended.
    let frame = out[0].length
    core.command({ type: 'press', ownerId: 'again', notes: [{ pitch: 64, instrumentId: 'sine' }] }, frame)
    renderQuanta(core, 20 * QUANTUM, frame)
    frame += 20 * QUANTUM
    core.command({ type: 'release', ownerId: 'again' }, frame)
    const after = renderQuanta(core, RATE / 2, frame)
    expect(peakOf(after[0], .1 * RATE, .2 * RATE)).toBeGreaterThan(1e-3)
    expect(peakOf(after[0], .3 * RATE, .4 * RATE)).toBeGreaterThan(1e-3)
  })

  it('a cut while one is fading carries on down from where it is, never back up', () => {
    const wet = new WetEffects(RATE)
    const output = [new Float32Array(QUANTUM), new Float32Array(QUANTUM)]
    const send = [new Float32Array(QUANTUM).fill(.2), new Float32Array(QUANTUM).fill(.2)]
    const silent = [new Float32Array(QUANTUM), new Float32Array(QUANTUM)]
    let frame = 0
    for (; frame < RATE; frame += QUANTUM) { output[0].fill(0); output[1].fill(0); wet.process(output, send, send, frame, QUANTUM) }
    const levels: number[] = []
    wet.cut(frame)
    for (let quantum = 0; quantum < 8; quantum++, frame += QUANTUM) {
      if (quantum === 2) wet.cut(frame)
      output[0].fill(0); output[1].fill(0)
      wet.process(output, silent, silent, frame, QUANTUM)
      levels.push(peakOf(output[0], 0, QUANTUM))
    }
    // Two quanta in, the second cut starts 10 ms more from the level it had reached.
    expect(levels[2]).toBeLessThan(levels[0])
    expect(levels[3]).toBeLessThan(levels[2])
    expect(levels[5]).toBeGreaterThan(0)
    expect(levels[7]).toBe(0)
  })
})
