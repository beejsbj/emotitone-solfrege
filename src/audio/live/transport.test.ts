import { describe, expect, it } from 'vitest'
import { LiveAudioCore, LIVE_RESERVED_VOICES } from './core'
import type { LiveResponse, PreparedLiveInstrument } from './types'
import type { TransportChange, TransportMemberTable, TransportReceipt } from './transport'
import { TRANSPORT_LOOKAHEAD_SECONDS } from './transport'
import { readTransportEvents, TransportEventKind, type DecodedTransportEvent } from './transportEvents'
import { MAX_AUDIO_VOICES } from '../voicePolicy'

/**
 * Headless timing receipts for the pattern transport (design doc §4, BJS-485):
 * the real render core, an arithmetic oracle that reads only the raw note
 * data, and onset detection on the rendered PCM.
 */
const RATE = 8000
const QUANTUM = 128
const sine: PreparedLiveInstrument = { kind: 'oscillator', instrumentId: 'sine', waveform: 'sine',
  gain: 1, attack: .001, decay: .01, sustain: .5, release: .01 }

interface RawNote { begin: number; gate: number; pitch: number; velocity?: number
  attack?: number; release?: number; gain?: [number, number][] }

let generation = 0
function table(id: string, notes: RawNote[], lengthBars: number): TransportMemberTable {
  const sorted = [...notes].sort((a, b) => a.begin - b.begin)
  const column = <T extends Float32Array | Float64Array | Uint32Array>(Type: new (n: number) => T, read: (note: RawNote, index: number) => number) => {
    const values = new Type(sorted.length)
    sorted.forEach((note, index) => { values[index] = read(note, index) })
    return values
  }
  const gainPoints = sorted.flatMap(note => note.gain ?? [])
  let cursor = 0
  const gainStart = column(Uint32Array, note => { const start = cursor; cursor += note.gain?.length ?? 0; return start })
  return {
    id, generation: ++generation, instrumentId: 'sine', lengthBars,
    shaping: { cutoff: 12000, resonance: 0, room: 0, delay: 0 },
    begin: column(Float64Array, note => note.begin), gate: column(Float64Array, note => note.gate),
    pitch: column(Float32Array, note => note.pitch), velocity: column(Float32Array, note => note.velocity ?? 1),
    attack: column(Float32Array, note => note.attack ?? .001), decay: column(Float32Array, () => .01),
    sustain: column(Float32Array, () => .5), release: column(Float32Array, note => note.release ?? .01),
    pitchStart: new Uint32Array(sorted.length), pitchCount: new Uint32Array(sorted.length),
    pitchTime: new Float32Array(0), pitchCents: new Float32Array(0),
    gainStart, gainCount: column(Uint32Array, note => note.gain?.length ?? 0),
    gainTime: Float32Array.from(gainPoints.map(([time]) => time)),
    gainValue: Float32Array.from(gainPoints.map(([, value]) => value)),
  }
}

function setup() {
  const events: (DecodedTransportEvent & { deliveredAt: number })[] = []
  const receipts: TransportReceipt[] = []
  const anchors: Extract<LiveResponse, { type: 'transport-anchors' }>[] = []
  const live: LiveResponse[] = []
  const queued: { buffer: ArrayBuffer; count: number }[] = []
  let frame = 0
  let stalled = false
  let requestId = 0
  const core = new LiveAudioCore(RATE, response => {
    if (response.type === 'transport-events') queued.push({ buffer: response.buffer, count: response.count })
    else if (response.type === 'transport-applied') receipts.push(response)
    else if (response.type === 'transport-anchors') anchors.push(response)
    else live.push(response)
  })
  // The bridge: decode each batch in FIFO order between quanta, then return it.
  function deliver() {
    if (stalled) return
    while (queued.length) {
      const batch = queued.shift()!
      readTransportEvents(batch, event => events.push({ ...event, deliveredAt: frame }))
      core.command({ type: 'transport-recycle', buffer: batch.buffer }, frame)
    }
  }
  core.command({ type: 'prepare', requestId: 0, instrument: sine }, 0)
  const pcm: number[] = []
  return {
    core, events, receipts, anchors, live, pcm,
    get frame() { return frame },
    stall(value: boolean) { stalled = value; deliver() },
    start(bpm: number) { core.command({ type: 'transport-start', requestId: ++requestId, run: 1, bpm }, frame); deliver(); return requestId },
    stop() { core.command({ type: 'transport-stop', requestId: ++requestId }, frame); deliver(); return requestId },
    change(change: TransportChange, boundary: 'immediate' | { bar: number } = 'immediate') {
      core.command({ type: 'transport-change', requestId: ++requestId, change, boundary }, frame)
      deliver()
      return requestId
    },
    join(member: TransportMemberTable, offsetBars = 0, rate = 1, boundary: 'immediate' | { bar: number } = 'immediate') {
      return this.change({ type: 'join', member: { table: member, offsetBars, rate, muted: false } }, boundary)
    },
    render(seconds: number) {
      const quanta = Math.round(seconds * RATE / QUANTUM)
      for (let index = 0; index < quanta; index++) {
        const output = [new Float32Array(QUANTUM), new Float32Array(QUANTUM)]
        core.render(output, frame)
        frame += QUANTUM
        for (const sample of output[0]) pcm.push(sample)
        deliver()
      }
    },
  }
}

const fpb = (bpm: number) => 240 * RATE / bpm
/** The arithmetic oracle: raw notes, offset, rate and tempo, nothing from the transport. */
function oracle(notes: RawNote[], lengthBars: number, bpm: number, untilBars: number, startFrame = 0, offset = 0, rate = 1) {
  const onsets: { frame: number; pitch: number; gateFrames: number }[] = []
  for (let loop = 0; offset + loop * lengthBars / rate < untilBars; loop++) for (const note of notes) {
    const bar = offset + loop * lengthBars / rate + note.begin / rate
    if (bar >= untilBars) continue
    onsets.push({ frame: Math.ceil(startFrame + bar * fpb(bpm) - 1e-6), pitch: note.pitch,
      gateFrames: Math.round(note.gate / rate * fpb(bpm)) })
  }
  return onsets.sort((a, b) => a.frame - b.frame)
}

/** Attacks that were announced and never cancelled. */
function sounded(events: DecodedTransportEvent[]) {
  const cancelled = new Set(events.filter(event => event.kind === TransportEventKind.Cancel).map(event => event.serial))
  return events.filter(event => event.kind === TransportEventKind.Attack && !cancelled.has(event.serial))
}

/** #140's detector: amplitude 0.0005 after at least 10 ms of silence. */
function pcmOnsets(pcm: ArrayLike<number>) {
  const onsets: number[] = []
  const quiet = Math.round(.01 * RATE)
  let silent = quiet
  for (let index = 0; index < pcm.length; index++) {
    if (Math.abs(pcm[index]) > .0005) {
      if (silent >= quiet) onsets.push(index)
      silent = 0
    } else silent++
  }
  return onsets
}

// Fixtures in bars at rate 1. Gaps leave the detector its 10 ms of silence.
const melody: RawNote[] = [0, .25, .5, .75].map((begin, index) => ({ begin, gate: .2, pitch: 60 + index * 2 }))
const rests: RawNote[] = [{ begin: 0, gate: .1, pitch: 60 }, { begin: .5, gate: .1, pitch: 64 }, { begin: 1.25, gate: .2, pitch: 67 }]
const chord: RawNote[] = [
  { begin: 0, gate: .4, pitch: 60 }, { begin: 0, gate: .4, pitch: 64 }, { begin: 0, gate: .4, pitch: 67 },
  { begin: .5, gate: .2, pitch: 62 }, { begin: .5, gate: .35, pitch: 65 },
]

describe('pattern transport timing receipts', () => {
  it.each([
    ['a melody', melody, 1, 120, 0, 1],
    ['a pattern with rests', rests, 1.75, 150, .375, 1],
    ['a melody at half time', melody, 1, 90, 0, .5],
    ['rests at double time', rests, 1.75, 90, 0, 2],
  ] as const)('plays %s on the oracle frames with no lost or extra attacks', (_name, notes, length, bpm, offset, rate) => {
    const rig = setup()
    rig.join(table('m', [...notes], length), offset, rate)
    rig.start(bpm)
    rig.render(8 * 240 / bpm)
    const expected = oracle([...notes], length, bpm, rig.core.transport.barAt(rig.frame - 1), 0, offset, rate)
      .filter(onset => onset.frame < rig.frame)
    const attacks = sounded(rig.events).filter(event => event.frame < rig.frame)
    expect(attacks.map(event => event.frame)).toEqual(expected.map(onset => onset.frame))
    expect(rig.events.some(event => event.kind === TransportEventKind.Cancel)).toBe(false)
    // Every attack has one release at its gate end.
    for (const attack of attacks.slice(0, -2)) {
      const releases = rig.events.filter(event => event.kind === TransportEventKind.Release && event.serial === attack.serial)
      expect(releases).toHaveLength(1)
      expect(releases[0].frame).toBe(attack.frame + attack.length)
    }
    // PCM: one onset per expected attack, within 12 ms (worklet frames are exact).
    const heard = pcmOnsets(rig.pcm)
    expect(heard).toHaveLength(expected.length)
    heard.forEach((at, index) => expect(Math.abs(at - expected[index].frame)).toBeLessThanOrEqual(.012 * RATE))
  })

  it('renders every note of a chord pattern as an isolated stem on its oracle frames', () => {
    const bpm = 120
    for (const [index, note] of chord.entries()) {
      const rig = setup()
      rig.join(table('chord', [note], 1))
      rig.start(bpm)
      rig.render(4 * 240 / bpm)
      const expected = oracle([note], 1, bpm, 4).filter(onset => onset.frame < rig.frame)
      const heard = pcmOnsets(rig.pcm)
      expect(heard, `stem ${index}`).toHaveLength(expected.length)
      // A sine starts at phase zero, so its first audible sample is one frame in.
      heard.forEach((at, onset) => expect(Math.abs(at - expected[onset].frame)).toBeLessThanOrEqual(1))
    }
    // Together, the events still carry every lane and every voice.
    const rig = setup()
    rig.join(table('chord', chord, 1))
    rig.start(bpm)
    rig.render(4 * 240 / bpm)
    expect(sounded(rig.events).filter(event => event.frame < rig.frame).map(event => event.frame))
      .toEqual(oracle(chord, 1, bpm, 4).map(onset => onset.frame))
  })

  it('announces attacks and gate ends a lookahead before they are rendered', () => {
    const rig = setup()
    rig.join(table('m', melody, 1))
    rig.start(120)
    rig.render(4)
    const lookahead = TRANSPORT_LOOKAHEAD_SECONDS * RATE
    // Only onsets inside the first lookahead after Start can be announced late.
    for (const event of rig.events) if (event.kind !== TransportEventKind.Cancel && event.frame >= lookahead + QUANTUM) {
      // Delivered by the end of a quantum at least lookahead − one quantum ahead.
      expect(event.frame - event.deliveredAt).toBeGreaterThanOrEqual(lookahead - QUANTUM)
    }
  })

  it('takes an immediate tempo change at the next quantum without lost or doubled attacks', () => {
    const rig = setup()
    rig.join(table('m', melody, 1))
    rig.start(120)
    // Change between notes: a gate already sounding keeps its old-tempo length.
    rig.render(2.45)
    const changeFrame = rig.frame
    const changeBar = rig.core.transport.barAt(changeFrame)
    rig.change({ type: 'tempo', bpm: 240 })
    rig.render(3)
    const receipt = rig.receipts.at(-1)!
    expect(receipt).toMatchObject({ appliedFrame: changeFrame, late: false })
    expect(receipt.appliedBar).toBeCloseTo(changeBar, 9)
    // Piecewise oracle: 120 BPM before the change, 240 after, same bar grid.
    const before = oracle(melody, 1, 120, changeBar).map(onset => onset.frame)
    const afterFrames: number[] = []
    for (let loop = 0; loop < 20; loop++) for (const note of melody) {
      const bar = loop + note.begin
      if (bar < changeBar) continue
      const frame = Math.ceil(changeFrame + (bar - changeBar) * fpb(240) - 1e-6)
      if (frame < rig.frame) afterFrames.push(frame)
    }
    expect(sounded(rig.events).filter(event => event.frame < rig.frame).map(event => event.frame))
      .toEqual([...before, ...afterFrames])
    expect(pcmOnsets(rig.pcm)).toHaveLength(before.length + afterFrames.length)
    // The published map has exactly the start anchor and the change anchor.
    expect(rig.anchors.at(-1)!.anchors).toEqual([
      { frame: 0, bar: 0, bpm: 120 }, { frame: changeFrame, bar: changeBar, bpm: 240 }])
  })

  it('swaps a member table exactly at a bar: the note on the bar belongs to the new table', () => {
    const rig = setup()
    rig.join(table('m', melody, 1))
    rig.start(120)
    rig.render(1.2)
    const bent = melody.map(note => ({ ...note, pitch: note.pitch + 1 }))
    const requestId = rig.join(table('m', bent, 1), 0, 1, { bar: 2 })
    rig.render(4)
    const receipt = rig.receipts.find(entry => entry.requestId === requestId)!
    expect(receipt).toMatchObject({ appliedBar: 2, appliedFrame: 2 * fpb(120), late: false })
    const attacks = sounded(rig.events)
    const boundary = 2 * fpb(120)
    const generations = new Set(attacks.filter(event => event.frame < boundary).map(event => event.generation))
    const after = new Set(attacks.filter(event => event.frame >= boundary).map(event => event.generation))
    expect(generations.size).toBe(1)
    expect(after.size).toBe(1)
    expect([...after][0]).toBeGreaterThan([...generations][0])
    expect(attacks.map(event => event.frame)).toEqual(oracle(melody, 1, 120, 10).map(onset => onset.frame)
      .filter(frame => frame < rig.frame))
  })

  it('reports a bar boundary already passed as late and applies it at once', () => {
    const rig = setup()
    rig.join(table('m', melody, 1))
    rig.start(120)
    rig.render(2.5)
    const id = rig.change({ type: 'tempo', bpm: 60 }, { bar: 1 })
    expect(rig.receipts.find(entry => entry.requestId === id)).toMatchObject({ appliedFrame: rig.frame, late: true })
  })

  it('answers each request by id: an immediate mute applies before an earlier-submitted future tempo', () => {
    const rig = setup()
    rig.join(table('m', melody, 1))
    rig.start(120)
    rig.render(.5)
    const tempo = rig.change({ type: 'tempo', bpm: 90 }, { bar: 2 })
    const mute = rig.change({ type: 'update', memberId: 'm', patch: { muted: true } })
    rig.render(4)
    expect(rig.receipts.map(entry => entry.requestId).filter(id => id === tempo || id === mute)).toEqual([mute, tempo])
    // The future tempo was published as provisional before it applied.
    expect(rig.anchors.some(entry => entry.provisional && entry.anchors.at(-1)!.bar === 2)).toBe(true)
  })

  it('answers a pending bar change that Stop drops, so no caller waits forever', () => {
    const rig = setup()
    rig.join(table('m', melody, 1))
    rig.start(120)
    rig.render(.5)
    const pending = rig.change({ type: 'tempo', bpm: 90 }, { bar: 4 })
    const stopFrame = rig.frame
    rig.stop()
    expect(rig.receipts.find(entry => entry.requestId === pending))
      .toMatchObject({ appliedFrame: stopFrame, appliedBar: null, cancelled: true })
    rig.render(10)
    expect(rig.receipts.filter(entry => entry.requestId === pending)).toHaveLength(1)
  })

  it('mutes within the 10 ms fade, cancels announced onsets, and resumes on unmute', () => {
    const rig = setup()
    rig.join(table('m', [{ begin: 0, gate: .9, pitch: 60 }], 1))
    rig.start(120)
    rig.render(.5)
    const muteFrame = rig.frame
    rig.change({ type: 'update', memberId: 'm', patch: { muted: true } })
    rig.render(.5)
    const release = rig.events.find(event => event.kind === TransportEventKind.Release)!
    expect(release.frame).toBe(muteFrame)
    // Silent within the fade.
    expect(rig.pcm.slice(muteFrame + .01 * RATE + 1).every(sample => sample === 0)).toBe(true)
    rig.render(2)
    expect(rig.events.filter(event => event.kind === TransportEventKind.Attack)).toHaveLength(1)
    rig.change({ type: 'update', memberId: 'm', patch: { muted: false } })
    rig.render(2.1)
    expect(sounded(rig.events).length).toBeGreaterThan(1)
  })

  it('stops with one release per sounding note, cancels the lookahead, and suppresses the authored release', () => {
    const rig = setup()
    rig.join(table('m', [{ begin: 0, gate: .99, pitch: 60 }, { begin: .999, gate: .001, pitch: 62 }], 1))
    rig.start(120)
    rig.render(1.97)
    const stopFrame = rig.frame
    rig.stop()
    rig.render(2)
    const releases = rig.events.filter(event => event.kind === TransportEventKind.Release && event.serial === 1)
    // The gate end was announced ahead; Stop corrects it once, to the fade
    // boundary, and nothing for the note follows.
    expect(releases.filter(event => event.deliveredAt >= stopFrame).map(event => event.frame)).toEqual([stopFrame])
    expect(Math.min(...releases.map(event => event.frame))).toBe(stopFrame)
    // Both onsets inside the lookahead (the last note and the next pass) are withdrawn.
    const cancels = rig.events.filter(event => event.kind === TransportEventKind.Cancel)
    expect(cancels).toHaveLength(2)
    for (const cancel of cancels) {
      expect(cancel.frame).toBeGreaterThan(stopFrame)
      expect(rig.events.some(event => event.kind === TransportEventKind.Attack && event.serial === cancel.serial)).toBe(true)
    }
    expect(rig.pcm.slice(stopFrame + .01 * RATE + 1).every(sample => sample === 0)).toBe(true)
    expect(rig.core.voiceCount).toBe(0)
  })

  it('loses no edge through a 1,000 ms main-thread stall of dense playback', () => {
    const rig = setup()
    // Sixteen members of sixteenth notes at 240 BPM: 512 edges a second.
    const sixteenths = Array.from({ length: 16 }, (_, index) => ({ begin: index / 16, gate: 1 / 32, pitch: 60 }))
    for (let member = 0; member < 16; member++) rig.join(table(`m${member}`, sixteenths, 1))
    rig.start(240)
    rig.render(.5)
    rig.stall(true)
    rig.render(1)
    rig.stall(false)
    rig.render(.5)
    const attacks = rig.events.filter(event => event.kind === TransportEventKind.Attack)
    const releases = rig.events.filter(event => event.kind === TransportEventKind.Release)
    const expected = oracle(sixteenths, 1, 240, rig.core.transport.barAt(rig.frame + TRANSPORT_LOOKAHEAD_SECONDS * RATE))
    expect(attacks.length).toBeGreaterThanOrEqual(16 * expected.filter(onset => onset.frame < rig.frame).length)
    expect(new Set(attacks.map(event => event.serial)).size).toBe(attacks.length)
    expect(rig.events.some(event => event.kind === TransportEventKind.SnapshotBegin)).toBe(false)
    // Every attack whose gate has ended was released exactly once.
    const ended = attacks.filter(event => event.frame + event.length <= rig.frame)
    const released = new Set(releases.map(event => event.serial))
    expect(ended.every(event => released.has(event.serial))).toBe(true)
  })

  it('recovers consumers from a snapshot after overflowing its event pool', () => {
    const rig = setup()
    const dense = Array.from({ length: 32 }, (_, index) => ({ begin: index / 32, gate: 1 / 40, pitch: 60 }))
    for (let member = 0; member < 16; member++) rig.join(table(`m${member}`, dense, 1))
    // A long gate is sounding across the overflow.
    rig.join(table('long', [{ begin: 0, gate: 3.5, pitch: 72 }], 4))
    rig.start(240)
    // About 1,100 edges a second for five seconds overflows the 4,032-edge pool.
    rig.stall(true)
    rig.render(5)
    rig.stall(false)
    rig.render(.2)
    // A consumer registry that applies every record it received.
    const active = new Map<number, number>()
    for (const event of rig.events) {
      if (event.kind === TransportEventKind.SnapshotBegin) active.clear()
      else if (event.kind === TransportEventKind.Attack || event.kind === TransportEventKind.Active) active.set(event.serial, event.generation)
      else active.delete(event.serial)
    }
    expect(rig.events.some(event => event.kind === TransportEventKind.SnapshotBegin)).toBe(true)
    // The long note is still active after recovery; the registry holds no ended note.
    const longGeneration = rig.events.find(event => event.kind === TransportEventKind.Active && event.noteIndex === 0
      && event.length > RATE)!.generation
    expect([...active.values()]).toContain(longGeneration)
    const truth = (rig.core as unknown as { voices: { transport?: { serial: number }; released: boolean }[] }).voices
      .filter(voice => voice.transport && !voice.released).map(voice => voice.transport!.serial)
    for (const serial of truth) expect(active.has(serial)).toBe(true)
    // Beyond the sounding voices, only onsets announced inside the lookahead remain.
    const announced = [...active.keys()].filter(serial => !truth.includes(serial))
    const queued = new Set<number>()
    ;(rig.core.transport as unknown as { forEachAnnounced(visit: (onset: { serial: number }) => void): void })
      .forEachAnnounced(onset => queued.add(onset.serial))
    expect(announced.every(serial => queued.has(serial))).toBe(true)
  })

  it('keeps every held live note when live and transport voices fill the whole pool', () => {
    const rig = setup()
    const voices = (rig.core as unknown as { voices: { transport?: unknown; ownerId: string; released: boolean }[] }).voices
    // Sixteen held live notes take the live reserve...
    for (let key = 0; key < LIVE_RESERVED_VOICES; key++) {
      rig.core.command({ type: 'press', ownerId: `key${key}`, notes: [{ pitch: 70 + key, instrumentId: 'sine' }] }, rig.frame)
    }
    // ...and dense, long transport notes fill the rest of the 64-voice pool.
    const thick = Array.from({ length: 16 }, (_, index) => ({ begin: index / 64, gate: .9, pitch: 40 + index }))
    for (let member = 0; member < 8; member++) rig.join(table(`m${member}`, thick, 1))
    rig.start(120)
    rig.render(1)
    expect(voices).toHaveLength(MAX_AUDIO_VOICES)
    expect(voices.filter(voice => voice.transport)).toHaveLength(MAX_AUDIO_VOICES - LIVE_RESERVED_VOICES)
    // A full pool: a further live press steals a transport voice, not a live one...
    rig.core.command({ type: 'press', ownerId: 'extra', notes: [{ pitch: 100, instrumentId: 'sine' }] }, rig.frame)
    // ...and later transport onsets steal transport voices, never the held keys.
    rig.render(4)
    const live = voices.filter(voice => !voice.transport)
    expect(live.map(voice => voice.ownerId).sort()).toEqual([...Array.from({ length: 16 }, (_, key) => `key${key}`), 'extra'].sort())
    expect(live.every(voice => !voice.released)).toBe(true)
    expect(voices.length).toBeLessThanOrEqual(MAX_AUDIO_VOICES)
    expect(sounded(rig.events).length).toBeGreaterThan(8 * 16 * 2)
    // Live input never ends the transport's voices.
    rig.core.command({ type: 'release', ownerId: 'extra' }, rig.frame)
    expect(voices.filter(voice => voice.transport && !voice.released).length).toBeGreaterThan(0)
  })

  it('replays a recorded gain curve and per-note articulation, stretched with tempo', () => {
    const rig = setup()
    // Gain 1 for the first half of the note, 0.5 for the second (times in bars after onset).
    rig.join(table('m', [{ begin: 0, gate: .5, pitch: 69, gain: [[0, 1], [.2, 1], [.25, .5], [.5, .5]] }], 1))
    rig.start(120)
    rig.render(1)
    const window = (from: number, to: number) => {
      let sum = 0
      for (let index = Math.round(from * RATE); index < Math.round(to * RATE); index++) sum += rig.pcm[index] ** 2
      return Math.sqrt(sum / ((to - from) * RATE))
    }
    expect(window(.55, .75) / window(.1, .35)).toBeCloseTo(.5, 1)
  })
})

describe('pending bar changes (BJS-491)', () => {
  const lookahead = TRANSPORT_LOOKAHEAD_SECONDS * RATE

  it('announces notes on and after a pending bar a full lookahead ahead, against the state it will make', () => {
    const rig = setup()
    rig.join(table('m', melody, 1))
    rig.start(120)
    rig.render(.5)
    const bent = table('m', melody.map(note => ({ ...note, pitch: note.pitch + 1 })), 1)
    rig.change({ type: 'replace', table: bent }, { bar: 2 })
    rig.change({ type: 'tempo', bpm: 150 }, { bar: 3 })
    rig.render(8)
    const boundary = 2 * fpb(120)
    const attacks = sounded(rig.events)
    // Every note from the bar on is the new table, announced ahead, never withdrawn.
    expect(rig.events.some(event => event.kind === TransportEventKind.Cancel)).toBe(false)
    for (const attack of attacks.filter(event => event.frame >= boundary)) {
      expect(attack.generation).toBe(bent.generation)
      expect(attack.frame - attack.deliveredAt).toBeGreaterThanOrEqual(lookahead - QUANTUM)
    }
    // The tempo bar is placed on the old tempo, and later notes on the new one.
    const tempoFrame = 3 * fpb(120)
    const expected = oracle(melody, 1, 120, 3).map(onset => onset.frame)
    for (let loop = 3; loop < 8; loop++) for (const note of melody) {
      const frame = Math.ceil(tempoFrame + (loop + note.begin - 3) * fpb(150) - 1e-6)
      if (frame < rig.frame) expected.push(frame)
    }
    expect(attacks.filter(event => event.frame < rig.frame).map(event => event.frame)).toEqual(expected)
  })

  it('withdraws previewed notes when an immediate change lands before the bar', () => {
    const rig = setup()
    rig.join(table('m', melody, 1))
    rig.start(120)
    rig.render(.5)
    const bent = table('m', melody.map(note => ({ ...note, pitch: note.pitch + 1 })), 1)
    rig.change({ type: 'replace', table: bent }, { bar: 2 })
    // Inside the lookahead of bar 2: the bent note on the bar is already announced.
    rig.render(3.98 - .5)
    expect(rig.events.some(event => event.kind === TransportEventKind.Attack && event.generation === bent.generation)).toBe(true)
    rig.change({ type: 'update', memberId: 'm', patch: { muted: true } })
    rig.render(1)
    expect(rig.events.some(event => event.kind === TransportEventKind.Cancel && event.generation === bent.generation)).toBe(true)
    // The muted member stays muted through the replacement: replace swaps the table only.
    expect(sounded(rig.events).filter(event => event.frame >= 2 * fpb(120))).toEqual([])
    rig.change({ type: 'update', memberId: 'm', patch: { muted: false } })
    rig.render(1)
    const resumed = sounded(rig.events).filter(event => event.frame >= 2 * fpb(120))
    expect(resumed.length).toBeGreaterThan(0)
    expect(resumed.every(event => event.generation === bent.generation)).toBe(true)
  })

  it.each([['immediate'], ['bar']] as const)('retunes every member at one frame with a batch (%s)', boundary => {
    const rig = setup()
    // Two members with a note exactly on every bar and on every half bar.
    const notes = (pitch: number) => [{ begin: 0, gate: .2, pitch }, { begin: .5, gate: .2, pitch: pitch + 2 }]
    const a = table('a', notes(60), 1)
    const b = table('b', notes(67), 1)
    rig.join(a)
    rig.join(b)
    rig.start(120)
    rig.render(1.3)
    const a2 = table('a', notes(62), 1)
    const b2 = table('b', notes(69), 1)
    const id = rig.change({ type: 'batch', changes: [{ type: 'replace', table: a2 }, { type: 'replace', table: b2 }] },
      boundary === 'immediate' ? 'immediate' : { bar: 2 })
    rig.render(4)
    const receipt = rig.receipts.find(entry => entry.requestId === id)!
    expect(receipt.late).toBe(false)
    const at = receipt.appliedFrame
    const attacks = sounded(rig.events)
    const old = new Set([a.generation, b.generation])
    const fresh = new Set([a2.generation, b2.generation])
    // No frame plays old harmony beside new: before the batch frame every
    // attack is old, from it every attack is new, for both members.
    expect(attacks.filter(event => event.frame < at).every(event => old.has(event.generation))).toBe(true)
    const after = attacks.filter(event => event.frame >= at)
    expect(after.length).toBeGreaterThanOrEqual(4)
    expect(after.every(event => fresh.has(event.generation))).toBe(true)
    // Same-frame notes of both members change together.
    const firstAfter = after[0].frame
    expect(new Set(after.filter(event => event.frame === firstAfter).map(event => event.generation))).toEqual(fresh)
  })

  it('refuses a whole batch when one part is invalid', () => {
    const rig = setup()
    rig.join(table('m', melody, 1))
    rig.start(120)
    rig.render(.2)
    const before = rig.receipts.length
    rig.change({ type: 'batch', changes: [{ type: 'update', memberId: 'm', patch: { muted: true } }, { type: 'tempo', bpm: -1 }] })
    expect(rig.receipts).toHaveLength(before)
    rig.render(1)
    expect(sounded(rig.events).length).toBeGreaterThan(2)
  })

  it('starts a recovered run at the bar it stopped on, on the same grid', () => {
    const rig = setup()
    rig.join(table('m', rests, 1.75))
    rig.core.command({ type: 'transport-start', requestId: 99, run: 2, bpm: 150, bar: 3.6 }, rig.frame)
    rig.render(5)
    expect(rig.receipts.at(-1)).toMatchObject({ requestId: 99, appliedBar: 3.6 })
    // The oracle from bar 0, shifted so bar 3.6 lands on frame 0.
    const expected = oracle(rests, 1.75, 150, 20, -3.6 * fpb(150))
      .filter(onset => onset.frame >= 0 && onset.frame < rig.frame).map(onset => onset.frame)
    expect(expected.length).toBeGreaterThan(2)
    expect(sounded(rig.events).filter(event => event.frame < rig.frame).map(event => event.frame)).toEqual(expected)
  })
})

describe('live Repeat and Arp on the transport grid (S111)', () => {
  /** Frames of live (non-transport) attacks, in order. */
  const liveAttacks = (live: LiveResponse[]) => live.flatMap(response =>
    response.type === 'event' && response.event.phase === 'attack' ? [Math.round(response.event.at * RATE)] : [])

  it.each([4, 8, 16] as const)('starts Repeat on the next 1/%i subdivision and stays frame-exact on the grid', rate => {
    const rig = setup()
    rig.join(table('m', Array.from({ length: rate }, (_, index) => ({ begin: index / rate, gate: .02, pitch: 48 })), 1))
    rig.start(120)
    rig.render(.37)
    const pressBar = rig.core.transport.barAt(rig.frame)
    rig.core.command({ type: 'configure', config: { style: 'repeat', bpm: 120, rate } }, rig.frame)
    rig.core.command({ type: 'press', ownerId: 'key', notes: [{ pitch: 72, instrumentId: 'sine' }] }, rig.frame)
    rig.render(4)
    const first = Math.ceil(pressBar * rate - 1e-9) / rate
    const attacks = liveAttacks(rig.live)
    expect(attacks.length).toBeGreaterThan(4)
    expect(attacks).toEqual(attacks.map((_, index) => Math.ceil((first + index / rate) * fpb(120) - 1e-6)))
    // Each live pulse lands on the same frame as the transport's note on that subdivision.
    const transportFrames = new Set(sounded(rig.events).map(event => event.frame))
    expect(attacks.filter(frame => frame < rig.frame - fpb(120) / rate).every(frame => transportFrames.has(frame))).toBe(true)
  })

  it('keeps Arp on the grid through a tempo change and a division change', () => {
    const rig = setup()
    rig.join(table('m', [{ begin: 0, gate: .1, pitch: 48 }], 1))
    rig.start(120)
    rig.render(.2)
    rig.core.command({ type: 'configure', config: { style: 'arp-up', bpm: 120, rate: 8 } }, rig.frame)
    rig.core.command({ type: 'press', ownerId: 'a', notes: [{ pitch: 60, instrumentId: 'sine' }] }, rig.frame)
    rig.core.command({ type: 'press', ownerId: 'b', notes: [{ pitch: 64, instrumentId: 'sine' }] }, rig.frame)
    rig.render(.9)
    const tempoFrame = rig.frame
    const tempoBar = rig.core.transport.barAt(tempoFrame)
    rig.change({ type: 'tempo', bpm: 180 })
    rig.render(1)
    const divisionFrame = rig.frame
    rig.core.command({ type: 'configure', config: { style: 'arp-up', bpm: 180, rate: 16 } }, divisionFrame)
    rig.render(1)
    const barOf = (frame: number) => frame < tempoFrame ? frame / fpb(120) : tempoBar + (frame - tempoFrame) / fpb(180)
    const frameOf = (bar: number) => bar <= tempoBar ? bar * fpb(120) : tempoFrame + (bar - tempoBar) * fpb(180)
    const offGrid = (frame: number) => {
      const division = frame < divisionFrame ? 8 : 16
      // The onset is the subdivision's exact frame rounded up.
      return frame !== Math.ceil(frameOf(Math.round(barOf(frame) * division) / division) - 1e-6)
    }
    const attacks = liveAttacks(rig.live)
    expect(attacks.length).toBeGreaterThan(20)
    expect(attacks.filter(offGrid)).toEqual([])
    expect(attacks.some(frame => frame > divisionFrame && Math.round(barOf(frame) * 16) % 2 === 1)).toBe(true)
    // The pitches still alternate up the held chord.
    const pitches = rig.live.flatMap(response => response.type === 'event' && response.event.phase === 'attack' ? [response.event.pitch] : [])
    expect(pitches.slice(0, 4)).toEqual([60, 64, 60, 64])
  })

  it('anchors at the press when phase is "press", and when no transport runs', () => {
    for (const running of [true, false]) {
      const rig = setup()
      if (running) {
        rig.join(table('m', [{ begin: 0, gate: .1, pitch: 48 }], 1))
        rig.start(120)
      }
      rig.render(.37)
      const pressFrame = rig.frame
      rig.core.command({ type: 'configure', config: { style: 'repeat', bpm: 120, rate: 8, ...(running ? { phase: 'press' as const } : {}) } }, pressFrame)
      rig.core.command({ type: 'press', ownerId: 'key', notes: [{ pitch: 72, instrumentId: 'sine' }] }, pressFrame)
      rig.render(.2)
      expect(liveAttacks(rig.live)[0]).toBe(pressFrame)
    }
  })
})
