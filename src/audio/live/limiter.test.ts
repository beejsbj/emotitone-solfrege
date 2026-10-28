import { describe, expect, it } from 'vitest'
import { LiveAudioCore } from './core'
import { LIMITER_CEILING, PeakLimiter } from './limiter'
import { readTransportEvents } from './transportEvents'
import type { LiveCommand, LiveResponse, LiveSampleZone, PreparedLiveInstrument } from './types'
import { GATE_BPM, gateMembers } from '@/lab/phoneGate/fixtures'
import { buildPatternMember } from '@/services/patternMember'
import { OPEN_CUTOFF_HZ } from '@/audio/liveShaping'

const RATE = 48000
const QUANTUM = 128

/** Run a signal through a limiter one render quantum at a time, as the worklet does. */
function limit(channels: Float32Array[], sends?: { room: Float32Array[]; delay: Float32Array[] }) {
  const limiter = new PeakLimiter(RATE)
  const out = channels.map(channel => Float32Array.from(channel))
  const room = sends?.room.map(channel => Float32Array.from(channel))
  const delay = sends?.delay.map(channel => Float32Array.from(channel))
  for (let frame = 0; frame < out[0].length; frame += QUANTUM) {
    const slice = (bus: Float32Array[]) => bus.map(channel => channel.subarray(frame, frame + QUANTUM))
    limiter.process(slice(out), room && slice(room), delay && slice(delay))
  }
  return { out, room, delay, limiter }
}

/** Seeded noise shaped like music: a few partials with a slow swell, scaled to `peak`. */
function music(seconds: number, peak: number, seed = 1) {
  let s = seed
  const random = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)
  const frames = Math.round(seconds * RATE)
  const channels = [new Float32Array(frames), new Float32Array(frames)]
  const partials = Array.from({ length: 6 }, () => ({ hz: 80 + random() * 2000, phase: random() * 6.28, amp: random() }))
  let max = 0
  for (let i = 0; i < frames; i++) {
    const swell = .5 + .5 * Math.sin(2 * Math.PI * i / RATE * .7)
    for (let c = 0; c < 2; c++) {
      let value = 0
      for (const p of partials) value += p.amp * Math.sin(2 * Math.PI * p.hz * i / RATE + p.phase + c)
      channels[c][i] = value * swell + (random() - .5) * .05
      max = Math.max(max, Math.abs(channels[c][i]))
    }
  }
  for (const channel of channels) for (let i = 0; i < frames; i++) channel[i] *= peak / max
  return channels
}

const rms = (channel: Float32Array) => Math.sqrt(channel.reduce((sum, value) => sum + value * value, 0) / channel.length)
const peakOf = (channels: Float32Array[]) => Math.max(...channels.map(channel => channel.reduce((m, v) => Math.max(m, Math.abs(v)), 0)))

describe('output peak limiter (BJS-590)', () => {
  it('leaves material below the ceiling untouched, sample for sample', () => {
    const input = music(2, LIMITER_CEILING * .999)
    const { out, limiter } = limit(input)
    for (let c = 0; c < 2; c++) {
      expect(out[c]).toEqual(input[c])
      expect(rms(out[c])).toBe(rms(input[c]))
    }
    expect(limiter.currentGain).toBe(1)
  })

  it('holds material over full scale under it, with no gain step, and returns to exactly unity', () => {
    // Two seconds 4 dB over, then two seconds of quiet material.
    const loud = music(2, 1.6)
    const quiet = music(2, .5, 2)
    const input = loud.map((channel, c) => { const joined = new Float32Array(channel.length + quiet[c].length)
      joined.set(channel); joined.set(quiet[c], channel.length); return joined })
    const { out, limiter } = limit(input)
    expect(peakOf(out)).toBeLessThanOrEqual(1)
    // The ceiling holds, except where a new peak lands in the first frames of a
    // quantum, too early for the attack: those few use the headroom to full scale.
    const overCeiling: number[] = []
    for (let i = 0; i < loud[0].length; i++) {
      if (Math.max(Math.abs(out[0][i]), Math.abs(out[1][i])) > LIMITER_CEILING + 1e-6) overCeiling.push(i % QUANTUM)
    }
    expect(overCeiling.length).toBeLessThan(loud[0].length / 2000)
    expect(Math.max(...overCeiling)).toBeLessThan(32)
    // The gain is the same on both channels and moves smoothly: never a step between frames.
    let worstStep = 0
    for (let i = 1; i < input[0].length; i++) {
      const c = Math.abs(input[0][i]) > Math.abs(input[1][i]) ? 0 : 1
      if (Math.abs(input[c][i]) < .2 || Math.abs(input[c][i - 1]) < .2) continue
      const step = Math.abs(out[c][i] / input[c][i] - out[c][i - 1] / input[c][i - 1])
      worstStep = Math.max(worstStep, step)
    }
    expect(worstStep).toBeLessThan(.02)
    // It releases: the last of the quiet material is untouched again.
    const tail = input[0].length - QUANTUM * 20
    expect(limiter.currentGain).toBe(1)
    for (let c = 0; c < 2; c++) expect(out[c].subarray(tail)).toEqual(input[c].subarray(tail))
  })

  it('ignores a non-finite sample rather than muting the output behind it', () => {
    const input = music(1, .8)
    const bad = input.map(channel => Float32Array.from(channel))
    bad[0][QUANTUM * 10 + 5] = Infinity
    bad[1][QUANTUM * 20 + 7] = -Infinity
    bad[0][QUANTUM * 30 + 9] = Number.NaN
    const { out, limiter } = limit(bad)
    // Every other sample passes untouched, and the gain never left 1.
    for (let c = 0; c < 2; c++) for (let i = 0; i < input[c].length; i++) {
      if (!Number.isFinite(bad[c][i])) continue
      if (out[c][i] !== input[c][i]) throw new Error(`channel ${c} frame ${i}: ${out[c][i]} != ${input[c][i]}`)
    }
    expect(limiter.currentGain).toBe(1)
    expect(limiter.peakIn).toBeLessThanOrEqual(Math.fround(.8))
  })

  it('applies the gain it chose for the dry sum to the room and delay sends', () => {
    const input = music(1, 1.4)
    const room = input.map(channel => channel.map(value => value * .5))
    const delay = input.map(channel => channel.map(value => value * .25))
    const result = limit(input, { room, delay })
    for (let c = 0; c < 2; c++) for (let i = 0; i < input[c].length; i += 97) {
      if (Math.abs(input[c][i]) < .05) continue
      const gain = result.out[c][i] / input[c][i]
      expect(result.room![c][i]).toBeCloseTo(room[c][i] * gain, 6)
      expect(result.delay![c][i]).toBeCloseTo(delay[c][i] * gain, 6)
    }
  })
})

// ── The phone gate's loop on the real core, with a stand-in piano (CI has no piano samples). ──

/**
 * A piano-like bank: a zone every three semitones, decaying partials with a
 * hammer-fast attack. Its sustained tones sum louder than the real piano's, so
 * each zone is normalised to 0.28: the soak then overshoots full scale by about
 * as much as the real piano did (hundreds of samples, a few dB, at the loop's
 * onsets under live chords; BJS-590 investigation, frame 462628, peak 1.299).
 */
function standInPiano(): PreparedLiveInstrument {
  const zoneRate = 24000
  const zones: LiveSampleZone[] = []
  for (let root = 21; root <= 108; root += 3) {
    const hz = 440 * 2 ** ((root - 69) / 12)
    const frames = Math.round(1.5 * zoneRate)
    const channels = [new Float32Array(frames), new Float32Array(frames)]
    let max = 0
    for (let i = 0; i < frames; i++) {
      const t = i / zoneRate
      const envelope = Math.min(1, t / .002) * Math.exp(-t / .6)
      for (let c = 0; c < 2; c++) {
        let value = 0
        for (let h = 1; h <= 6 && h * hz < zoneRate / 2; h++) value += Math.sin(2 * Math.PI * h * hz * t + c * h * .3) / h * Math.exp(-t * h / 1.5)
        channels[c][i] = value * envelope
        max = Math.max(max, Math.abs(channels[c][i]))
      }
    }
    for (const channel of channels) for (let i = 0; i < frames; i++) channel[i] *= .28 / max
    zones.push({ id: `stand-in:${root}`, rootMidi: root, sampleRate: zoneRate, channels })
  }
  // The piano bank's gain, and its articulation (instant attack, held sustain).
  return { kind: 'sample-bank', instrumentId: 'piano', gain: .8, attack: .001, decay: 0, sustain: 1, release: .3,
    zoneSelection: 'nearest-root', zones }
}

interface Post { at: number; command: LiveCommand }
const BEAT = 60 / GATE_BPM
const BAR = BEAT * 4
const CHORDS = [[64, 67, 72], [65, 69, 72], [62, 67, 71], [64, 67, 72]]

/** The gate's soak: its four-member loop, and a chord on every beat, each released after 45% of a beat. */
/** Room and delay send levels for every voice; powers of two, so each send is an exact fraction of the dry sum. */
const SENDS = { room: .5, delay: .25 }

function soak(chordOffset: number, bars: number, sends = false) {
  const queued: LiveResponse[] = []
  const core = new LiveAudioCore(RATE, response => { queued.push(response) })
  let frame = 0
  const deliver = () => {
    for (const response of queued.splice(0)) if (response.type === 'transport-events') {
      readTransportEvents(response, () => {})
      core.command({ type: 'transport-recycle', buffer: response.buffer }, frame)
    }
  }
  core.command({ type: 'prepare', requestId: 1, instrument: standInPiano() }, frame)
  const shape = { cutoff: OPEN_CUTOFF_HZ, resonance: 0, ...SENDS }
  // Live notes take the Shape's sends; each loop member carries the same Shape.
  if (sends) core.command({ type: 'effects', shaping: shape }, frame)
  const joins = gateMembers().map((member, index) => {
    const config = sends ? { ...member.config, shape: { ...shape, attack: null, release: null } } : member.config
    const { table } = buildPatternMember({ ...member, config, generation: 100 + index, instrumentId: 'piano' })
    table.lengthBars = member.lengthBars!
    return { type: 'join' as const, member: { table, offsetBars: 0, rate: 1, muted: false } }
  })
  core.command({ type: 'transport-change', requestId: 2, change: { type: 'batch', changes: joins }, boundary: 'immediate' }, frame)
  core.command({ type: 'transport-start', requestId: 3, run: 1, bpm: GATE_BPM }, frame)
  deliver()
  const posts: Post[] = []
  for (let t = chordOffset, beat = 0; t < bars * BAR; t += BEAT, beat++) {
    CHORDS[beat % 4].forEach((pitch, index) => {
      const ownerId = `chord-${beat}#${index}`
      posts.push({ at: t, command: { type: 'press', ownerId, notes: [{ pitch, instrumentId: 'piano', velocity: .6 }] } })
      posts.push({ at: t + BEAT * .45, command: { type: 'release', ownerId } })
    })
  }
  posts.sort((a, b) => a.at - b.at)
  const total = Math.ceil(bars * BAR * RATE / QUANTUM) * QUANTUM
  const bus = () => [new Float32Array(total), new Float32Array(total)]
  const out = bus(), room = bus(), delay = bus()
  const quantum = [new Float32Array(QUANTUM), new Float32Array(QUANTUM)]
  const roomQuantum = [new Float32Array(QUANTUM), new Float32Array(QUANTUM)]
  const delayQuantum = [new Float32Array(QUANTUM), new Float32Array(QUANTUM)]
  let next = 0
  while (frame < total) {
    // Messages reach the worklet between callbacks (1024 frames here, as on the phone).
    if (frame % 1024 === 0) while (next < posts.length && posts[next].at * RATE <= frame) core.command(posts[next++].command, frame)
    core.render(quantum, frame, roomQuantum, delayQuantum)
    for (let c = 0; c < 2; c++) {
      out[c].set(quantum[c], frame); room[c].set(roomQuantum[c], frame); delay[c].set(delayQuantum[c], frame)
    }
    frame += QUANTUM
    deliver()
  }
  return { out, room, delay, core }
}

describe('the phone gate loop with live chords on its beats (BJS-590)', () => {
  it.each([.35, .36, .42])('never leaves the worklet over full scale (chords %s s after the beat)', offset => {
    const { out, core } = soak(offset, 6)
    let over = 0
    for (const channel of out) for (const value of channel) if (Math.abs(value) > 1) over++
    expect(over).toBe(0)
    expect(peakOf(out)).toBeLessThanOrEqual(1)
    // The voice sum itself went over full scale, by about as much as the real piano's (1.23 here, +1.8 dB):
    // without the limiter these frames clip.
    expect(core.limiter.peakIn).toBeGreaterThan(1.1)
  })

  it('limits the room and delay sends by the same gain, frame for frame, as the dry output', () => {
    const { out, room, delay, core } = soak(.42, 6, true)
    expect(core.limiter.peakIn).toBeGreaterThan(1.1)
    // Every voice sends the same exact fraction of what it adds to the dry sum, so whatever gain the limiter
    // applies, each send stays exactly that fraction of the limited dry output.
    let mismatches = 0
    for (let c = 0; c < 2; c++) for (let i = 0; i < out[c].length; i++) {
      if (room[c][i] !== out[c][i] * SENDS.room || delay[c][i] !== out[c][i] * SENDS.delay) mismatches++
    }
    expect(mismatches).toBe(0)
  })
})
