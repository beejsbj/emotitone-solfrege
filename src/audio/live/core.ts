import type { LiveCommand, LiveConfig, LiveEnvelopeOverride, LiveInputNote, LiveResponse, LiveSampleZone,
  LiveVoiceEvent, PreparedLiveInstrument } from './types'
import { createSampleResampler, type SampleResampler } from './resampler'
import { VoiceEffects } from './lowpass'
import { PeakLimiter } from './limiter'
import { velocityToGain } from '../velocity'
import { OPEN_CUTOFF_HZ, type LiveShaping } from '../liveShaping'
import { MAX_AUDIO_VOICES, VOICE_RETIRE_SECONDS } from '../voicePolicy'
import { AudioTransport, type TransportCommand, type TransportMemberTable, type TransportOnset } from './transport'
import { TransportEventKind, TransportEventWriter, type TransportEventBatch } from './transportEvents'

/**
 * Stolen voices that may fade at once (BJS-590). 24 lets a burst of 20 steals
 * inside one 10 ms fade all finish; past it, the quietest fade is the one cut.
 * Measured (desktop V8, 64 piano voices held, then a burst of 64 steals): the
 * worst quantum costs 807 µs at 24 against 721 µs at 8 and 1054 µs at 64.
 */
const MAX_FADES = 24
const PLAN_SECONDS = .15
const GATE = .8
/**
 * Every live touch plays at least its first note (BJS-597). A release that
 * arrives before any of its owner's notes has started (a tap inside one audio
 * callback, a strum's 30 ms gather, a wait for the grid, an arp turn) is held
 * until that first onset, then lets go once the note is through its attack:
 * the envelope's own, or the recorded rise of a sample, at least
 * MIN_LIVE_GATE and at most MAX_LIVE_GATE. MAX_LIVE_GATE is a quick deliberate
 * tap, so a slow attack is as loud as one and never as long as a held note.
 */
const MIN_LIVE_GATE = .005
const MAX_LIVE_GATE = .05
/**
 * The hard ceiling on a lifted touch's wait, from its lift, never more than
 * MAX_LIFT_WAIT: in Repeat/Arp one turn per lifted key queued ahead of it,
 * doubled since lifted keys share turns with held ones, plus the turn already
 * planned; in a strum, its own string's place; and this slack. A note already
 * planned waits for its frame. Past the ceiling the touch lets go unheard.
 */
const LIFT_SLACK_SECONDS = .1
/** Strum strings sound this far apart. */
const STRUM_SPACING_SECONDS = .035
const MAX_LIFT_WAIT = 4
/** Recording (not playback) time a sample's rise is read from: a fixed, rate-independent scan. */
const RISE_WINDOW_SECONDS = MAX_LIVE_GATE
/** Each zone's recorded rise in source frames, read once at its first rescued tap. */
const recordedRises = new WeakMap<LiveSampleZone, number>()
const MAX_PITCH_BEND_CENTS = 50
const PITCH_SMOOTH_SECONDS = .007
const MIN_GAIN_EXPRESSION = .25
const MAX_GAIN_EXPRESSION = 1.75
const GAIN_SMOOTH_SECONDS = .007
/**
 * Voices a player's live notes can always claim: transport onsets never take
 * the pool beyond MAX_AUDIO_VOICES minus this, and never steal a held live
 * note. A live press over saturated playback steals a transport voice first.
 */
export const LIVE_RESERVED_VOICES = 16
const TRANSPORT_COMMANDS = new Set(['transport-start', 'transport-stop', 'transport-change', 'transport-recycle'])
function polyBlep(t: number, dt: number) {
  return t < dt ? 2 * t / dt - (t / dt) ** 2 - 1
    : t > 1 - dt ? ((t - 1) / dt) ** 2 + 2 * (t - 1) / dt + 1 : 0
}
function polyBlamp(t: number, dt: number) {
  return t < dt ? (1 - t / dt) ** 3 / 3
    : t > 1 - dt ? (1 + (t - 1) / dt) ** 3 / 3 : 0
}
interface PlannedNote extends LiveInputNote {
  noteId: string
  ownerId: string
  owners: Set<string>
}
interface Pulse {
  frame: number
  step: number
  duration?: number
  style: LiveConfig['style']
  notes: PlannedNote[]
  /** The transport bar a grid-locked pulse sits on; it moves with the tempo map. */
  gridBar?: number
  /** A Repeat/Arp turn given to a key let go before its first turn. */
  lifted?: boolean
}
/** Identity and expression of a voice started by the pattern transport. */
interface TransportVoice {
  serial: number
  generation: number
  noteIndex: number
  memberId: string
  /** The frame its release was announced for, if it has been announced. */
  announcedRelease?: number
  table: TransportMemberTable
  framesPerTableBar: number
  pitchPoint: number
  gainPoint: number
}
interface Voice extends PlannedNote {
  effects: VoiceEffects
  attack: number
  decay: number
  sustain: number
  transport?: TransportVoice
  expressionOwnerId: string
  instrument: PreparedLiveInstrument
  zone?: LiveSampleZone
  resampler?: SampleResampler
  start: number
  end: number
  style: LiveConfig['style']
  position: number
  increment: number
  pitchIncrement: number
  pitchTarget: number
  pitchRampRemaining: number
  gainExpression: number
  gainTarget: number
  gainRampRemaining: number
  releaseStart?: number
  releaseLength: number
  releaseLevel: number
  released: boolean
  published: boolean
}

/** Audio-thread musical transport and PCM mixer. No DOM, timers, or promises. */
export class LiveAudioCore {
  private effectShape: LiveShaping = { cutoff: OPEN_CUTOFF_HZ, resonance: 0, room: 0, delay: 0 }
  private effectPool: VoiceEffects[]
  private scratch = [new Float32Array(128), new Float32Array(128)]
  private instruments = new Map<string, PreparedLiveInstrument>()
  private envelopeOverride: LiveEnvelopeOverride = {}
  // Shaped copies are built once per shape change, not per voice.
  private shaped = new Map<string, PreparedLiveInstrument>()
  private held = new Map<string, LiveInputNote[]>()
  private voices: Voice[] = []
  private fades: Voice[] = []
  private pulses: Pulse[] = []
  private config: LiveConfig = { style: 'together', bpm: 120, rate: 8 }
  private nextFrame?: number
  /** The transport bar of the next grid-locked pulse; undefined while unlocked. */
  private gridBar?: number
  private gridTempoVersion = -1
  private boundaryDuration?: number
  private step = 0
  private serial = 0
  private strum: PlannedNote[] = []
  private strumAt?: number
  private planDirty = false
  private endingOwners = new Set<string>()
  /** Held live owners none of whose notes has started yet. */
  private unsounded = new Set<string>()
  /** Releases held for a first onset: the frame each is due (the wait bound, then the gate after the onset). */
  private earlyReleases = new Map<string, number>()
  /** Owners let go before their first note, with the frame of the lift: the queue for arp turns. */
  private liftedAt = new Map<string, number>()
  /** Whether the last Repeat/Arp turn to start went to a lifted key. */
  private lastTurnLifted = false
  /** No later than the earliest due frame (Infinity when none), so render checks one number, not the map. */
  private nextEarlyRelease = Infinity
  private forgetting = new Map<number, string>()
  private pitchBends = new Map<string, number>()
  private gainExpressions = new Map<string, number>()
  readonly transport: AudioTransport
  /** The output's peak limiter (BJS-590): the last stage of every render. */
  readonly limiter: PeakLimiter
  private readonly transportEvents = new TransportEventWriter()
  private readonly postEvents = (batch: TransportEventBatch) => this.send(batch)

  constructor(private sampleRate: number, private send: (message: LiveResponse) => void, private notePrefix = 'worklet') {
    this.effectPool = Array.from({ length: MAX_AUDIO_VOICES + MAX_FADES }, () => new VoiceEffects(sampleRate))
    this.limiter = new PeakLimiter(sampleRate)
    this.transport = new AudioTransport(sampleRate, send, this.transportEvents, {
      silence: (memberId, frame) => this.silenceMember(memberId, frame),
    })
  }

  /** Forced fade of transport voices (mute, solo, stop): one release at the fade boundary. */
  private silenceMember(memberId: string | null, frame: number) {
    for (const voice of this.voices) if (voice.transport && !voice.released
      && (memberId === null || voice.transport.memberId === memberId)) {
      this.releaseVoice(voice, frame, VOICE_RETIRE_SECONDS * this.sampleRate)
    }
  }

  private transportEvent(kind: TransportEventKind, voice: Voice, frame: number, length: number) {
    const transport = voice.transport!
    this.transportEvents.write(kind, transport.serial, transport.generation, transport.noteIndex,
      frame, this.transport.isRunning ? this.transport.barAt(frame) : 0, length, this.postEvents)
  }

  /**
   * After overflow, describe every active transport note once a batch is free
   * again, then repeat the gate ends already announced for them (those
   * announcements may be among the dropped records and are not sent twice).
   */
  private recoverTransportEvents() {
    const writer = this.transportEvents
    if (!writer.overflowed) return
    let active = 0
    let announced = 0
    this.transport.forEachAnnounced(() => { active++ })
    for (const voice of this.voices) if (voice.transport && !voice.released) {
      active++
      if (voice.transport.announcedRelease !== undefined) announced++
    }
    if (writer.capacity < active + announced + 1) return
    writer.overflowed = false
    writer.write(TransportEventKind.SnapshotBegin, active, 0, 0, 0, 0, 0, this.postEvents)
    this.transport.forEachAnnounced(onset => writer.write(TransportEventKind.Active, onset.serial,
      onset.member!.table.generation, onset.noteIndex, onset.frame, onset.bar, onset.gateFrames, this.postEvents))
    for (const voice of this.voices) if (voice.transport && !voice.released) {
      const transport = voice.transport
      writer.write(TransportEventKind.Active, transport.serial, transport.generation, transport.noteIndex,
        voice.start, this.transport.isRunning ? this.transport.barAt(voice.start) : 0, voice.end - voice.start, this.postEvents)
    }
    for (const voice of this.voices) if (voice.transport && !voice.released && voice.transport.announcedRelease !== undefined) {
      this.transportEvent(TransportEventKind.Release, voice, voice.transport.announcedRelease, voice.releaseLength / this.sampleRate)
    }
  }

  private flushTransportEvents() {
    this.recoverTransportEvents()
    this.transportEvents.flush(this.postEvents)
  }

  get voiceCount() { return this.voices.length + this.fades.length }
  private rhythmic() { return this.config.style === 'repeat' || this.config.style.startsWith('arp-') }
  /** Repeat/Arp follow the transport's bar grid while it runs (S111). */
  private locked() { return this.transport.isRunning && this.config.phase !== 'press' }
  private gridFrame(bar: number) { return Math.ceil(this.transport.frameAt(bar) - 1e-6) }
  private interval() { return this.sampleRate * 60 / this.config.bpm * 4 / this.config.rate }
  private note(note: LiveInputNote, ownerId: string, owners = new Set([ownerId])): PlannedNote {
    return { ...note, ownerId, owners: new Set(owners), noteId: `${this.notePrefix}-${++this.serial}` }
  }
  private pool() {
    const notes = new Map<number, { note: LiveInputNote; ownerId: string; owners: Set<string> }>()
    for (const [ownerId, held] of this.held) for (const note of held) {
      const prior = notes.get(note.pitch)
      if (prior) prior.owners.add(ownerId)
      else notes.set(note.pitch, { note, ownerId, owners: new Set([ownerId]) })
    }
    return [...notes.values()].sort((a, b) => a.note.pitch - b.note.pitch)
  }
  private selection(step: number, pulse?: Pulse) {
    const all = this.pool()
    if (this.config.style === 'repeat' || !all.length) return all
    // Keys let go before their first turn take turns first come, first served, a chord lifted
    // together in pool order, each once (BJS-597). While held keys remain, turns alternate:
    // a lifted key never takes a turn straight after another, and the turns between are the
    // held keys' own arpeggio, so the held pattern goes on.
    const pool = this.liftedAt.size ? all.filter(entry => !this.lifted(entry.owners)) : all
    if (this.liftedAt.size && !(pool.length && this.previousTurnLifted(step))) {
      let first: (typeof all)[number] | undefined
      let firstLift = Infinity
      for (const entry of all) {
        let lift = Infinity
        for (const owner of entry.owners) lift = Math.min(lift, this.liftedAt.get(owner) ?? Infinity)
        if (lift < firstLift && !this.pulses.some(other => other !== pulse
          && other.notes.some(note => note.pitch === entry.note.pitch))) { first = entry; firstLift = lift }
      }
      if (first) return [first]
    }
    if (!pool.length) return []
    const cycle = this.config.style === 'arp-up-down' && pool.length > 1 ? pool.length * 2 - 2 : pool.length
    const position = step % cycle
    return [pool[position < pool.length ? position : cycle - position]]
  }
  private lifted(owners: Set<string>) {
    for (const owner of owners) if (this.liftedAt.has(owner)) return true
    return false
  }
  private liftedTurn(notes: PlannedNote[]) { return notes.some(note => this.lifted(note.owners)) }
  private previousTurnLifted(step: number) {
    const previous = this.pulses.find(pulse => pulse.step === step - 1 && pulse.duration !== undefined)
    return previous ? Boolean(previous.lifted) : this.lastTurnLifted
  }
  /** Frames between Repeat/Arp turns. */
  private turnFrames(frame: number) {
    if (!this.rhythmic()) return 0
    if (!this.locked()) return this.interval()
    const bar = this.transport.barAt(frame)
    return this.transport.frameAt(bar + 1 / this.config.rate) - this.transport.frameAt(bar)
  }
  /** Hold a lifted touch's release until its first onset, under its hard ceiling. */
  private lift(owner: string, frame: number) {
    const queued = this.liftedAt.size
    this.liftedAt.set(owner, frame)
    const slack = LIFT_SLACK_SECONDS * this.sampleRate
    // A strum still gathering waits for it to spread; each string's own place is set then.
    const wait = this.strumAt !== undefined && this.strum.some(note => note.owners.has(owner))
      ? this.strumAt - frame + slack
      : slack + (2 * queued + 3) * this.turnFrames(frame)
    this.holdRelease(owner, frame + Math.ceil(Math.min(MAX_LIFT_WAIT * this.sampleRate, wait)))
    // A note already planned waits for its own frame.
    for (const pulse of this.pulses) if (pulse.notes.some(note => note.owners.has(owner))) this.awaitOnset(owner, pulse.frame)
    // A chord lifted together shares the ceiling of its last key.
    let ceiling = 0
    for (const [other, at] of this.liftedAt) if (at === frame) ceiling = Math.max(ceiling, this.earlyReleases.get(other)!)
    for (const [other, at] of this.liftedAt) if (at === frame) this.earlyReleases.set(other, ceiling)
  }

  /** Move a lifted touch's ceiling to cover a planned onset, never past MAX_LIFT_WAIT from the lift. */
  private awaitOnset(owner: string, onset: number) {
    const lift = this.liftedAt.get(owner)
    const due = this.earlyReleases.get(owner)
    if (lift === undefined || due === undefined) return
    this.earlyReleases.set(owner, Math.min(lift + Math.ceil(MAX_LIFT_WAIT * this.sampleRate),
      Math.max(due, Math.ceil(onset + LIFT_SLACK_SECONDS * this.sampleRate))))
  }
  private revise(frame: number) {
    for (const pulse of this.pulses) {
      if (pulse.duration === undefined || pulse.frame < frame) continue
      if (pulse.step === 0 && pulse.notes.length && this.config.style !== 'repeat') continue
      const previous = pulse.notes
      pulse.notes = this.selection(pulse.step, pulse).map(({ note, ownerId, owners }) => {
        const match = previous.find(old => old.pitch === note.pitch && old.instrumentId === note.instrumentId)
        return match ? { ...match, velocity: note.velocity, ownerId, owners: new Set(owners) } : this.note(note, ownerId, owners)
      })
      pulse.lifted = this.liftedTurn(pulse.notes)
    }
    this.planDirty = true
  }

  command(command: LiveCommand, frame: number) {
    if (TRANSPORT_COMMANDS.has(command.type)) {
      this.transport.command(command as TransportCommand, frame)
      this.flushTransportEvents()
      return
    }
    // A stop for an owner already let go and ended has nothing to drop, and no second owner-ended to send.
    if (command.type === 'release' && command.cancel && !this.held.has(command.ownerId)) return
    // A lifted touch before its first onset is held for it; a stop (`cancel`) is not.
    const early = command.type === 'release' && !command.cancel
      && (this.unsounded.has(command.ownerId) || this.earlyReleases.has(command.ownerId))
    const endedOwners = command.type === 'clear' ? [...this.held.keys()]
      : command.type === 'release' && !early ? [command.ownerId] : []
    switch (command.type) {
      case 'prepare':
        this.instruments.set(command.instrument.instrumentId, command.instrument)
        this.shaped.delete(command.instrument.instrumentId)
        this.send({ type: 'prepared', requestId: command.requestId })
        return
      case 'forget': {
        this.instruments.delete(command.instrumentId)
        this.shaped.delete(command.instrumentId)
        this.forgetting.set(command.requestId, command.instrumentId)
        for (const pulse of this.pulses) pulse.notes = pulse.notes.filter(note => note.instrumentId !== command.instrumentId)
        this.strum = this.strum.filter(note => note.instrumentId !== command.instrumentId)
        for (const [owner, notes] of this.held) {
          const remaining = notes.filter(note => note.instrumentId !== command.instrumentId)
          if (remaining.length) this.held.set(owner, remaining)
          else {
            this.held.delete(owner); this.pitchBends.delete(owner); this.gainExpressions.delete(owner)
            this.unsounded.delete(owner); this.earlyReleases.delete(owner); this.liftedAt.delete(owner)
            this.endingOwners.add(owner)
          }
        }
        for (const collection of [this.voices, this.fades]) for (let index = collection.length - 1; index >= 0; index--) {
          const voice = collection[index]
          if (voice.instrumentId !== command.instrumentId) continue
          this.releaseVoice(voice, frame, command.instant ? 0 : VOICE_RETIRE_SECONDS * this.sampleRate)
          if (command.instant) { voice.effects.inUse = false; collection.splice(index, 1) }
        }
        this.planDirty = true
        break
      }
      case 'effects': {
        const shape = command.shaping
        if (![shape.cutoff, shape.resonance, shape.room, shape.delay].every(Number.isFinite)) return
        this.effectShape = shape
        for (const voice of this.voices) if (!voice.shaping) voice.effects.set(shape)
        for (const voice of this.fades) if (!voice.shaping) voice.effects.set(shape)
        return
      }
      case 'shape': {
        // Sounding voices keep their envelope; the next attack uses the new one.
        const { attack, release } = command.envelope
        const valid = (value?: number) => value === undefined || (Number.isFinite(value) && value >= 0)
        if (!valid(attack) || !valid(release)) return
        this.envelopeOverride = { attack, release }
        this.shaped.clear()
        return
      }
      case 'clear':
        this.held.clear(); this.pitchBends.clear(); this.gainExpressions.clear()
        this.unsounded.clear(); this.earlyReleases.clear(); this.liftedAt.clear(); this.nextEarlyRelease = Infinity
        this.cancel(frame)
        break
      case 'release':
        if (!early) this.release(command.ownerId, frame)
        // A repeated release keeps the one already held.
        else if (!this.earlyReleases.has(command.ownerId)) this.lift(command.ownerId, frame)
        break
      case 'pitch-bend': this.pitchBend(command.ownerId, command.cents); break
      case 'gain-expression': this.gainExpression(command.ownerId, command.gain); break
      case 'press': {
        if (this.held.has(command.ownerId)) this.release(command.ownerId, frame)
        const notes = command.notes.filter(note => Number.isFinite(note.pitch) && note.pitch >= 0 && note.pitch <= 127
          && this.instruments.has(note.instrumentId))
        if (!notes.length) break
        this.held.set(command.ownerId, notes)
        this.unsounded.add(command.ownerId)
        this.add(command.ownerId, notes, frame)
        break
      }
      case 'configure': {
        const next = { ...this.config, ...command.config }
        if (!Number.isFinite(next.bpm) || next.bpm < 1 || next.bpm > 1000 || ![4, 8, 16].includes(next.rate)
          || !['together', 'repeat', 'arp-up', 'arp-up-down', 'strum-up', 'strum-down'].includes(next.style)
          || ![undefined, 'grid', 'press'].includes(next.phase)) return
        if (next.style !== this.config.style) {
          this.cancel(frame)
          this.config = next
          for (const [owner, notes] of this.held) this.add(owner, notes, frame)
        } else if (this.rhythmic() && this.locked() && next.rate !== this.config.rate) {
          // On the grid the transport owns the tempo. A new division keeps the
          // next pulse and continues on the new division's next subdivision.
          const boundary = this.pulses.find(pulse => pulse.frame >= frame)
          this.config = next
          if (boundary) {
            this.pulses = this.pulses.filter(pulse => pulse.frame <= boundary.frame)
            this.nextFrame = boundary.frame + 1
            this.step = boundary.step + 1
          }
          this.gridBar = undefined
          this.planDirty = true
        } else if (this.rhythmic() && !this.locked() && (next.bpm !== this.config.bpm || next.rate !== this.config.rate)) {
          // The next pulse keeps its old timestamp and gate; the new interval
          // begins after it, preserving sequence phase without a retrigger.
          const boundary = this.pulses.find(pulse => pulse.frame >= frame)
          const oldInterval = this.interval()
          this.config = next
          if (boundary) {
            this.pulses = this.pulses.filter(pulse => pulse.frame <= boundary.frame)
            this.nextFrame = boundary.frame + this.interval()
            this.step = boundary.step + 1
          } else this.boundaryDuration = oldInterval * GATE
          this.planDirty = true
        } else this.config = next
        break
      }
    }
    this.fill(frame)
    this.publishPlan(frame)
    for (const ownerId of endedOwners) this.endingOwners.add(ownerId)
    this.finishOwners()
    this.finishForgetting()
  }

  private finishForgetting() {
    for (const [requestId, instrumentId] of this.forgetting) {
      if (this.voices.some(voice => voice.instrumentId === instrumentId)
        || this.fades.some(voice => voice.instrumentId === instrumentId)) continue
      this.forgetting.delete(requestId)
      this.send({ type: 'forgotten', requestId })
    }
  }

  private finishOwners() {
    for (const ownerId of this.endingOwners) {
      if (this.voices.some(voice => voice.ownerId === ownerId && !voice.released)
        || this.pulses.some(pulse => pulse.notes.some(note => note.ownerId === ownerId))) continue
      this.endingOwners.delete(ownerId)
      this.send({ type: 'owner-ended', ownerId })
    }
  }

  private add(ownerId: string, notes: LiveInputNote[], frame: number) {
    if (this.config.style === 'together') {
      this.pulses.push({ frame, step: 0, style: this.config.style, notes: notes.map(note => this.note(note, ownerId)) })
    } else if (this.config.style.startsWith('strum-')) {
      this.strum.push(...notes.map(note => this.note(note, ownerId)))
      this.strumAt ??= frame + this.sampleRate * .03
    } else {
      for (const voice of this.voices) if (!voice.transport && notes.some(note => note.pitch === voice.pitch)) {
        voice.owners.add(ownerId)
        // A touch that joins its own instrument's sounding live note is heard at once.
        if (!voice.released && notes.some(note => note.pitch === voice.pitch && note.instrumentId === voice.instrumentId)) {
          this.unsounded.delete(ownerId)
        }
      }
      if (this.nextFrame === undefined) { this.nextFrame = frame; this.step = 0 }
      else this.revise(frame)
    }
    this.planDirty = true
  }

  private release(owner: string, frame: number) {
    this.held.delete(owner)
    this.unsounded.delete(owner)
    this.earlyReleases.delete(owner)
    this.liftedAt.delete(owner)
    this.pitchBends.delete(owner)
    this.gainExpressions.delete(owner)
    this.strum = this.strum.filter(note => note.ownerId !== owner)
    for (const pulse of this.pulses) pulse.notes = pulse.notes.filter(note => {
      note.owners.delete(owner)
      if (note.ownerId === owner && note.owners.size) note.ownerId = note.owners.values().next().value!
      return note.owners.size > 0
    })
    for (const voice of this.voices) {
      voice.owners.delete(owner)
      if (!voice.owners.size) this.releaseVoice(voice, frame)
      else if (!voice.released && voice.expressionOwnerId === owner) {
        this.retargetExpression(voice, voice.owners.values().next().value!)
        if (voice.published) this.send({ type: 'expression-owner', noteId: voice.noteId,
          ownerId: voice.expressionOwnerId, at: frame / this.sampleRate,
          cents: this.pitchBends.get(voice.expressionOwnerId) ?? 0,
          gain: this.gainExpressions.get(voice.expressionOwnerId) ?? 1 })
      }
    }
    if (!this.held.size) this.cancel(frame)
    else if (this.rhythmic()) this.revise(frame)
    this.planDirty = true
  }

  private cancel(frame: number) {
    this.pulses = []
    this.strum = []
    this.strumAt = this.nextFrame = this.boundaryDuration = this.gridBar = undefined
    this.step = 0
    this.lastTurnLifted = false
    // Live input never ends the pattern transport's voices.
    for (const voice of this.voices) if (!voice.transport) this.releaseVoice(voice, frame)
    this.planDirty = true
  }

  private retargetExpression(voice: Voice, ownerId: string) {
    voice.expressionOwnerId = ownerId
    voice.pitchTarget = voice.increment * 2 ** ((this.pitchBends.get(ownerId) ?? 0) / 1200)
    voice.pitchRampRemaining = Math.max(1, Math.round(PITCH_SMOOTH_SECONDS * this.sampleRate))
    voice.gainTarget = this.gainExpressions.get(ownerId) ?? 1
    voice.gainRampRemaining = Math.max(1, Math.round(GAIN_SMOOTH_SECONDS * this.sampleRate))
  }

  private pitchBend(ownerId: string, cents: number) {
    if (!Number.isFinite(cents) || !this.held.has(ownerId)) return
    const bounded = Math.max(-MAX_PITCH_BEND_CENTS, Math.min(MAX_PITCH_BEND_CENTS, cents))
    if (bounded === 0) this.pitchBends.delete(ownerId)
    else this.pitchBends.set(ownerId, bounded)
    const ratio = 2 ** (bounded / 1200)
    for (const voice of this.voices) {
      // A deduped rhythmic voice has one deterministic expression owner.
      // Never retune a release tail, including one from an earlier press.
      if (voice.released || voice.expressionOwnerId !== ownerId) continue
      voice.pitchTarget = voice.increment * ratio
      voice.pitchRampRemaining = Math.max(1, Math.round(PITCH_SMOOTH_SECONDS * this.sampleRate))
    }
  }

  private gainExpression(ownerId: string, gain: number) {
    if (!Number.isFinite(gain) || !this.held.has(ownerId)) return
    const bounded = Math.max(MIN_GAIN_EXPRESSION, Math.min(MAX_GAIN_EXPRESSION, gain))
    if (bounded === 1) this.gainExpressions.delete(ownerId)
    else this.gainExpressions.set(ownerId, bounded)
    for (const voice of this.voices) {
      // Just like pitch, a deduped rhythmic voice has one deterministic owner.
      // Release tails retain their last multiplier and are never snapped back.
      if (voice.released || voice.expressionOwnerId !== ownerId) continue
      voice.gainTarget = bounded
      voice.gainRampRemaining = Math.max(1, Math.round(GAIN_SMOOTH_SECONDS * this.sampleRate))
    }
  }

  private fill(frame: number) {
    if (this.strumAt !== undefined && frame >= this.strumAt) {
      const direction = this.config.style === 'strum-down' ? -1 : 1
      this.strum.sort((a, b) => direction * (a.pitch - b.pitch))
      this.strum.forEach((note, index) => {
        const at = this.strumAt! + index * STRUM_SPACING_SECONDS * this.sampleRate
        this.pulses.push({ frame: at, step: index, style: this.config.style, notes: [note] })
        // Each string's place is known now: a lifted one waits for its own.
        if (this.liftedAt.size) for (const owner of note.owners) this.awaitOnset(owner, at)
      })
      this.strum = []
      this.strumAt = undefined
      this.planDirty = true
    }
    if (!this.rhythmic() || !this.held.size || this.nextFrame === undefined) return
    if (this.locked()) {
      this.fillOnGrid(frame)
      return
    }
    this.gridBar = undefined
    while (this.nextFrame <= frame + PLAN_SECONDS * this.sampleRate) {
      const notes = this.selection(this.step).map(({ note, ownerId, owners }) => this.note(note, ownerId, owners))
      this.pulses.push({ frame: this.nextFrame, step: this.step, style: this.config.style,
        duration: this.boundaryDuration ?? this.interval() * GATE,
        notes, lifted: this.liftedTurn(notes) })
      this.boundaryDuration = undefined
      this.nextFrame += this.interval()
      this.step++
      this.planDirty = true
    }
  }

  /**
   * Repeat/Arp on the transport's bar grid: the first pulse waits for the next
   * subdivision (1/rate of a bar) at or after it is due, and every pulse sits
   * on the frame the transport would give a note on that bar. Unstarted pulses
   * move when the tempo map changes, so they stay on the grid through a tempo
   * change.
   */
  private fillOnGrid(frame: number) {
    const division = 1 / this.config.rate
    if (this.gridTempoVersion !== this.transport.tempoVersion) {
      this.gridTempoVersion = this.transport.tempoVersion
      for (const pulse of this.pulses) if (pulse.gridBar !== undefined && pulse.frame > frame) {
        pulse.frame = Math.max(frame, this.gridFrame(pulse.gridBar))
        pulse.duration = (this.transport.frameAt(pulse.gridBar + division) - pulse.frame) * GATE
        this.planDirty = true
      }
      if (this.gridBar !== undefined) this.nextFrame = this.gridFrame(this.gridBar)
    }
    if (this.gridBar === undefined) {
      const due = this.transport.barAt(Math.max(frame, this.nextFrame!))
      this.gridBar = Math.ceil(due / division - 1e-9) * division
      this.nextFrame = this.gridFrame(this.gridBar)
    }
    while (this.nextFrame! <= frame + PLAN_SECONDS * this.sampleRate) {
      const at = this.nextFrame!
      const notes = this.selection(this.step).map(({ note, ownerId, owners }) => this.note(note, ownerId, owners))
      this.pulses.push({ frame: at, step: this.step, style: this.config.style, gridBar: this.gridBar,
        duration: (this.transport.frameAt(this.gridBar + division) - at) * GATE,
        notes, lifted: this.liftedTurn(notes) })
      this.gridBar += division
      this.nextFrame = this.gridFrame(this.gridBar)
      this.step++
      this.planDirty = true
    }
  }

  private event(note: PlannedNote, phase: LiveVoiceEvent['phase'], frame: number, style: LiveConfig['style']): LiveVoiceEvent {
    return { phase, noteId: note.noteId, ownerId: note.ownerId, pitch: note.pitch,
      instrumentId: note.instrumentId, velocity: note.velocity, style, at: Math.ceil(frame) / this.sampleRate }
  }
  private voiceEvent(voice: Voice, phase: LiveVoiceEvent['phase'], frame: number): LiveVoiceEvent {
    const { attack, decay, sustain } = voice
    return { ...this.event(voice, phase, frame, voice.style),
      articulation: { attack, decay, sustain, release: voice.releaseLength / this.sampleRate } }
  }
  private publishPlan(frame: number) {
    if (!this.planDirty) return
    this.planDirty = false
    const events: LiveVoiceEvent[] = []
    for (const pulse of this.pulses) for (const note of pulse.notes) {
      events.push(this.event(note, 'attack', pulse.frame, pulse.style))
      if (pulse.duration !== undefined) events.push(this.event(note, 'release', pulse.frame + pulse.duration, pulse.style))
    }
    for (const voice of this.voices) if (!voice.transport && !voice.released && Number.isFinite(voice.end) && voice.end >= frame) {
      events.push(this.event(voice, 'release', voice.end, voice.style))
    }
    events.sort((a, b) => a.at - b.at || (a.phase === 'release' ? -1 : 1))
    this.send({ type: 'plan', events })
  }

  private zone(instrument: PreparedLiveInstrument, pitch: number) {
    if (instrument.kind !== 'sample-bank') return undefined
    if (instrument.zoneSelection === 'first-range') return instrument.zones.find(zone =>
      pitch >= (zone.lowMidi ?? -Infinity) && pitch <= (zone.highMidi ?? Infinity))
    let best: LiveSampleZone | undefined
    for (const zone of instrument.zones) if (!best || Math.abs(zone.rootMidi - pitch) < Math.abs(best.rootMidi - pitch)) best = zone
    return best
  }
  private instrument(instrumentId: string) {
    const prepared = this.instruments.get(instrumentId)
    const { attack, release } = this.envelopeOverride
    if (!prepared || (attack === undefined && release === undefined)) return prepared
    let shaped = this.shaped.get(instrumentId)
    if (!shaped) {
      shaped = { ...prepared, attack: attack ?? prepared.attack, release: release ?? prepared.release }
      this.shaped.set(instrumentId, shaped)
    }
    return shaped
  }
  /**
   * Make room for one more voice. Live input prefers a releasing voice, then
   * the oldest transport voice, then the oldest held live voice. Transport
   * onsets stay below the live reserve and never steal a live voice; false
   * means the onset is refused.
   */
  private admit(transport: boolean, frame: number): boolean {
    const full = this.voices.length >= MAX_AUDIO_VOICES
    let index = -1
    if (transport) {
      let transportVoices = 0
      for (const voice of this.voices) if (voice.transport) transportVoices++
      if (!full && transportVoices < MAX_AUDIO_VOICES - LIVE_RESERVED_VOICES) return true
      index = this.voices.findIndex(voice => voice.transport && voice.released)
      if (index < 0) index = this.voices.findIndex(voice => voice.transport)
      if (index < 0) return false
    } else {
      if (!full) return true
      index = this.voices.findIndex(voice => voice.released)
      if (index < 0) index = this.voices.findIndex(voice => voice.transport)
      if (index < 0) index = 0
    }
    const [stolen] = this.voices.splice(index, 1)
    if (stolen.published) {
      this.releaseVoice(stolen, frame, VOICE_RETIRE_SECONDS * this.sampleRate)
      this.fades.push(stolen)
      if (this.fades.length > MAX_FADES) this.dropQuietestFade(frame)
    } else stolen.effects.inUse = false
    return true
  }

  /** Cut the fade with the least level left (the one just stolen included), so the cut is as small a step as it can be. */
  private dropQuietestFade(frame: number) {
    let quietest = 0
    let least = Infinity
    for (let index = 0; index < this.fades.length; index++) {
      const voice = this.fades[index]
      const level = this.envelope(voice, frame) * voice.instrument.gain * velocityToGain(voice.velocity) * voice.gainExpression
      if (level < least) { least = level; quietest = index }
    }
    const [dropped] = this.fades.splice(quietest, 1)
    dropped.effects.inUse = false
  }

  private createVoice(note: PlannedNote, instrument: PreparedLiveInstrument, zone: LiveSampleZone | undefined,
    frame: number, style: LiveConfig['style'], end: number, releaseSeconds: number,
    envelope: { attack: number; decay: number; sustain: number }, transport?: TransportVoice): Voice {
    const increment = zone ? 2 ** ((note.pitch - zone.rootMidi) / 12) * zone.sampleRate / this.sampleRate
      : 440 * 2 ** ((note.pitch - 69) / 12) / this.sampleRate
    const pitchIncrement = increment * 2 ** ((transport ? 0 : this.pitchBends.get(note.ownerId) ?? 0) / 1200)
    const gainExpression = transport ? 1 : this.gainExpressions.get(note.ownerId) ?? 1
    let effectIndex = 0
    while (this.effectPool[effectIndex].inUse) effectIndex++
    const effects = this.effectPool[effectIndex]
    effects.inUse = true
    effects.reset(note.shaping ?? this.effectShape)
    const voice: Voice = { ...note, effects, owners: new Set(note.owners), expressionOwnerId: note.ownerId, instrument, zone,
      ...envelope, transport,
      resampler: zone ? createSampleResampler(zone, increment) : undefined,
      style, start: frame, end,
      position: 0, increment, pitchIncrement, pitchTarget: pitchIncrement, pitchRampRemaining: 0,
      gainExpression, gainTarget: gainExpression, gainRampRemaining: 0,
      releaseLength: Math.max(0, releaseSeconds) * this.sampleRate,
      releaseLevel: 0, released: false, published: Boolean(transport) }
    this.voices.push(voice)
    return voice
  }

  private start(note: PlannedNote, pulse: Pulse, frame: number) {
    const instrument = this.instrument(note.instrumentId)
    if (!instrument) return
    const zone = this.zone(instrument, note.pitch)
    if (instrument.kind === 'sample-bank' && (!zone || !zone.channels[0]?.length)) return
    this.admit(false, frame)
    const { attack, decay, sustain } = instrument
    return this.createVoice(note, instrument, zone, frame, pulse.style,
      pulse.duration === undefined ? Infinity : Math.ceil(pulse.frame + pulse.duration),
      pulse.duration === undefined ? instrument.release : .03, { attack, decay, sustain })
  }

  private holdRelease(owner: string, due: number) {
    this.earlyReleases.set(owner, due)
    this.nextEarlyRelease = Math.min(this.nextEarlyRelease, due)
  }

  /**
   * Apply the held releases now due. Runs only on a frame one comes due, never
   * per quantum: first the gates, before that frame's onsets; then, with
   * `ceilings`, the lifted touches whose ceiling it is, after the onsets, so a
   * turn landing on its ceiling still plays.
   */
  private settleEarlyReleases(frame: number, ceilings: boolean) {
    let next = Infinity
    for (const [owner, due] of this.earlyReleases) {
      if (due > frame || (!ceilings && this.liftedAt.has(owner))) { next = Math.min(next, due); continue }
      this.release(owner, frame)
      this.endingOwners.add(owner)
    }
    this.nextEarlyRelease = next
  }

  /** Frames a held release waits after its first onset: through the voice's attack, within the live gate bounds. */
  private tapGate(voice?: Voice) {
    let rise = voice?.attack ?? 0
    // A sample's own onset (a bowed or swelled note) is in its PCM, not its envelope.
    if (voice?.zone) rise = Math.max(rise, recordedRise(voice.zone) / voice.increment / this.sampleRate)
    return Math.ceil(Math.max(MIN_LIVE_GATE, Math.min(MAX_LIVE_GATE, rise)) * this.sampleRate)
  }

  /** Start a transport onset with its table's own articulation; false if it cannot sound. */
  private startScheduled(onset: TransportOnset, frame: number): boolean {
    const member = onset.member!
    const { table } = member
    const index = onset.noteIndex
    // The member's own instrument, without the live Shape tab's envelope override.
    const instrument = this.instruments.get(table.instrumentId)
    if (!instrument) return false
    const pitch = table.pitch[index]
    const zone = this.zone(instrument, pitch)
    if (instrument.kind === 'sample-bank' && (!zone || !zone.channels[0]?.length)) return false
    if (!this.admit(true, frame)) return false
    const velocity = table.velocity[index]
    const note: PlannedNote = { pitch, instrumentId: table.instrumentId, velocity: Number.isFinite(velocity) ? velocity : undefined,
      shaping: table.shaping, noteId: '', ownerId: member.id, owners: new Set([member.id]) }
    this.createVoice(note, instrument, zone, frame, 'together', onset.frame + onset.gateFrames, table.release[index],
      { attack: table.attack[index], decay: table.decay[index], sustain: table.sustain[index] },
      { serial: onset.serial, generation: table.generation, noteIndex: index, memberId: member.id, table,
        framesPerTableBar: onset.framesPerTableBar, pitchPoint: 0, gainPoint: 0 })
    return true
  }

  /** Recorded pitch and gain curves at `frame`, ramped to over the coming span. */
  private followExpression(voice: Voice, frame: number, span: number) {
    const transport = voice.transport!
    const { table, noteIndex } = transport
    const at = (frame + span - voice.start) / transport.framesPerTableBar
    const pitchCount = table.pitchCount[noteIndex]
    if (pitchCount) {
      const start = table.pitchStart[noteIndex]
      const cents = curveAt(table.pitchTime, table.pitchCents, start, pitchCount, at, transport, 'pitchPoint')
      voice.pitchTarget = voice.increment * 2 ** (Math.max(-MAX_PITCH_BEND_CENTS, Math.min(MAX_PITCH_BEND_CENTS, cents)) / 1200)
      voice.pitchRampRemaining = span
    }
    const gainCount = table.gainCount[noteIndex]
    if (gainCount) {
      const start = table.gainStart[noteIndex]
      const gain = curveAt(table.gainTime, table.gainValue, start, gainCount, at, transport, 'gainPoint')
      voice.gainTarget = Math.max(MIN_GAIN_EXPRESSION, Math.min(MAX_GAIN_EXPRESSION, gain))
      voice.gainRampRemaining = span
    }
  }
  private envelope(voice: Voice, frame: number): number {
    if (voice.releaseStart !== undefined) return voice.releaseLength > 0
      ? voice.releaseLevel * Math.max(0, 1 - (frame - voice.releaseStart) / voice.releaseLength) : 0
    const elapsed = (frame - voice.start) / this.sampleRate
    const { attack, decay, sustain } = voice
    if (attack > 0 && elapsed < attack) return elapsed / attack
    if (decay > 0 && elapsed < attack + decay) return 1 + (sustain - 1) * (elapsed - attack) / decay
    return sustain
  }
  private releaseVoice(voice: Voice, frame: number, releaseLength?: number) {
    if (voice.released && releaseLength === undefined) return
    const wasReleased = voice.released
    const remaining = voice.releaseStart === undefined ? Infinity
      : Math.max(0, voice.releaseStart + voice.releaseLength - frame)
    voice.releaseLevel = this.envelope(voice, frame)
    voice.releaseStart = frame
    // Apply forced retirement before reporting it to the recorder. Already
    // releasing tails may be shortened, but retain their single note-off.
    voice.releaseLength = Math.min(releaseLength ?? voice.releaseLength, remaining)
    voice.released = true
    if (voice.published && !wasReleased) {
      const transport = voice.transport
      // An announced gate end stands; only an earlier (forced) release is news.
      if (!transport) this.send({ type: 'event', event: this.voiceEvent(voice, 'release', frame) })
      else if (transport.announcedRelease === undefined || frame < transport.announcedRelease) {
        transport.announcedRelease = frame
        this.transportEvent(TransportEventKind.Release, voice, frame, voice.releaseLength / this.sampleRate)
      }
    }
    this.planDirty = true
  }

  private oscillator(voice: Voice) {
    const phase = voice.position % 1
    const instrument = voice.instrument
    if (instrument.kind !== 'oscillator') return 0
    // PolyBLEP removes the discontinuity aliasing of naive saw/square waves.
    const dt = Math.min(.5, voice.pitchIncrement)
    switch (instrument.waveform) {
      case 'sine': return Math.sin(2 * Math.PI * phase)
      case 'triangle': return 1 - 4 * Math.abs(phase - .5)
        + 4 * dt * (polyBlamp(phase, dt) - polyBlamp((phase + .5) % 1, dt))
      case 'sawtooth': return 2 * phase - 1 - polyBlep(phase, dt)
      case 'square': return (phase < .5 ? 1 : -1) + polyBlep(phase, dt) - polyBlep((phase + .5) % 1, dt)
    }
  }

  private mix(collection: Voice[], output: Float32Array[], offset: number, length: number, firstFrame: number, room?: Float32Array[], delay?: Float32Array[]) {
    // Each envelope section is affine. The sampler can mix a contiguous block
    // with one coefficient lookup per stereo frame and no virtual calls in its
    // inner filter loop; source/filter state stays local for the whole span.
    for (let index = collection.length - 1; index >= 0; index--) {
      const voice = collection[index]
      const instrument = voice.instrument
      const velocityGain = velocityToGain(voice.velocity)
      let sampleOffset = 0
      while (sampleOffset < length) {
        const frame = firstFrame + sampleOffset
        let boundary = Math.min(firstFrame + length, frame + 128)
        let envelopeStep = 0
        if (voice.released) {
          boundary = Math.min(boundary, Math.ceil(voice.releaseStart! + voice.releaseLength))
          if (frame >= boundary) { voice.effects.inUse = false; collection.splice(index, 1); break }
          envelopeStep = -voice.releaseLevel / voice.releaseLength
        } else {
          const attackEnd = voice.start + voice.attack * this.sampleRate
          const decayEnd = attackEnd + voice.decay * this.sampleRate
          if (frame < attackEnd) {
            boundary = Math.min(boundary, Math.ceil(attackEnd))
            envelopeStep = 1 / (voice.attack * this.sampleRate)
          } else if (frame < decayEnd) {
            boundary = Math.min(boundary, Math.ceil(decayEnd))
            envelopeStep = (voice.sustain - 1) / (voice.decay * this.sampleRate)
          }
        }
        if (voice.pitchRampRemaining) boundary = Math.min(boundary, frame + voice.pitchRampRemaining)
        if (voice.gainRampRemaining) boundary = Math.min(boundary, frame + voice.gainRampRemaining)
        const span = boundary - frame
        let envelope = this.envelope(voice, frame)
        let gain = envelope * instrument.gain * velocityGain * voice.gainExpression
        const gainStep = envelopeStep * instrument.gain * velocityGain * voice.gainExpression
        this.scratch[0].fill(0)
        this.scratch[1].fill(0)
        let rendered = span
        if (voice.resampler) {
          if (voice.pitchRampRemaining || voice.gainRampRemaining) {
            let consumed = 0
            while (consumed < span) {
              const pitchStep = voice.pitchRampRemaining
                ? (voice.pitchTarget - voice.pitchIncrement) / voice.pitchRampRemaining : 0
              const gainExpressionStep = voice.gainRampRemaining
                ? (voice.gainTarget - voice.gainExpression) / voice.gainRampRemaining : 0
              gain = envelope * instrument.gain * velocityGain * voice.gainExpression
              const mixed = voice.resampler.mix(this.scratch[0], this.scratch[1], consumed, 1,
                voice.position, gain, 0, voice.pitchIncrement)
              if (!mixed) {
                this.releaseVoice(voice, frame + consumed, 0)
                voice.effects.inUse = false; collection.splice(index, 1); break
              }
              voice.position += voice.pitchIncrement
              if (voice.pitchRampRemaining) {
                voice.pitchIncrement += pitchStep
                if (--voice.pitchRampRemaining === 0) voice.pitchIncrement = voice.pitchTarget
              }
              if (voice.gainRampRemaining) {
                voice.gainExpression += gainExpressionStep
                if (--voice.gainRampRemaining === 0) voice.gainExpression = voice.gainTarget
              }
              envelope += envelopeStep
              consumed++
            }
            rendered = consumed
          } else {
            const consumed = voice.resampler.mix(this.scratch[0], this.scratch[1], 0, span, voice.position, gain, gainStep, voice.pitchIncrement)
            voice.position += consumed * voice.pitchIncrement
            if (consumed < span) {
              this.releaseVoice(voice, frame + consumed, 0)
              voice.effects.inUse = false; collection.splice(index, 1)
            }
            rendered = consumed
          }
        } else {
          for (let i = 0; i < span; i++) {
            const sample = this.oscillator(voice) * (voice.gainRampRemaining
              ? envelope * instrument.gain * velocityGain * voice.gainExpression : gain)
            this.scratch[0][i] = this.scratch[1][i] = sample
            voice.position += voice.pitchIncrement
            if (voice.pitchRampRemaining) {
              voice.pitchIncrement += (voice.pitchTarget - voice.pitchIncrement) / voice.pitchRampRemaining
              if (--voice.pitchRampRemaining === 0) voice.pitchIncrement = voice.pitchTarget
            }
            if (voice.gainRampRemaining) {
              voice.gainExpression += (voice.gainTarget - voice.gainExpression) / voice.gainRampRemaining
              if (--voice.gainRampRemaining === 0) voice.gainExpression = voice.gainTarget
            }
            envelope += envelopeStep
            gain += gainStep
          }
        }
        voice.effects.process(this.scratch[0], this.scratch[1], output, room, delay, offset + sampleOffset, rendered)
        if (rendered < span) break
        sampleOffset += span
      }
    }
  }

  render(output: Float32Array[], firstFrame: number, room?: Float32Array[], delay?: Float32Array[]) {
    const length = output[0]?.length ?? 0
    const endFrame = firstFrame + length
    for (const channel of output) channel.fill(0)
    if (room) for (const channel of room) channel.fill(0)
    if (delay) for (const channel of delay) channel.fill(0)
    this.transport.beginQuantum(firstFrame, endFrame)
    const announceUntil = endFrame + this.transport.lookahead
    this.announceReleases(announceUntil)
    let frame = firstFrame
    while (frame < endFrame) {
      let onset: TransportOnset | undefined
      let started = false
      while ((onset = this.transport.takeDue(frame))) {
        if (onset.kind === 'silence') this.silenceMember(onset.member?.id ?? null, frame)
        else if (this.startScheduled(onset, frame)) started = true
        else this.transportEvents.write(TransportEventKind.Cancel, onset.serial, onset.member!.table.generation,
          onset.noteIndex, onset.frame, onset.bar, onset.gateFrames, this.postEvents)
        this.transport.recycle(onset)
      }
      if (started) this.announceReleases(announceUntil)
      if (frame >= this.nextEarlyRelease) this.settleEarlyReleases(frame, false)
      this.fill(frame)
      while (this.pulses.length && this.pulses.some(pulse => pulse.frame <= frame)) {
        const index = this.pulses.findIndex(pulse => pulse.frame <= frame)
        const [pulse] = this.pulses.splice(index, 1)
        for (const note of pulse.notes) {
          const voice = this.start(note, pulse, frame)
          if (this.unsounded.size) for (const owner of note.owners) {
            if (this.unsounded.delete(owner) && this.earlyReleases.has(owner)) {
              this.liftedAt.delete(owner)
              this.holdRelease(owner, frame + this.tapGate(voice))
            }
          }
        }
        if (pulse.duration !== undefined) this.lastTurnLifted = Boolean(pulse.lifted)
        this.planDirty = true
      }
      if (frame >= this.nextEarlyRelease) this.settleEarlyReleases(frame, true)
      // Admission is complete for this frame. A same-frame burst may steal an
      // unrendered voice; do not report that voice as an audible performance.
      for (const voice of this.voices) if (!voice.published) {
        voice.published = true
        this.send({ type: 'event', event: this.voiceEvent(voice, 'attack', frame) })
      }
      for (const voice of this.voices) if (!voice.released && frame >= voice.end) this.releaseVoice(voice, frame)
      let boundary = endFrame
      for (const pulse of this.pulses) if (pulse.frame > frame) boundary = Math.min(boundary, Math.ceil(pulse.frame))
      for (const voice of this.voices) if (!voice.released && voice.end > frame) boundary = Math.min(boundary, Math.ceil(voice.end))
      if (this.strumAt !== undefined) boundary = Math.min(boundary, Math.ceil(this.strumAt))
      boundary = Math.min(boundary, this.nextEarlyRelease)
      boundary = Math.min(boundary, Math.max(frame + 1, this.transport.nextFrame))
      if (this.nextFrame !== undefined) {
        const planningBoundary = Math.ceil(this.nextFrame - PLAN_SECONDS * this.sampleRate)
        if (planningBoundary > frame) boundary = Math.min(boundary, planningBoundary)
      }
      const span = Math.max(1, boundary - frame)
      for (const voice of this.voices) if (voice.transport && !voice.released) this.followExpression(voice, frame, span)
      this.mix(this.voices, output, frame - firstFrame, span, frame, room, delay)
      this.mix(this.fades, output, frame - firstFrame, span, frame, room, delay)
      frame += span
    }
    // The voice sum is complete: hold it under full scale before it leaves the worklet.
    this.limiter.process(output, room, delay)
    this.publishPlan(endFrame)
    this.finishOwners()
    this.finishForgetting()
    this.flushTransportEvents()
  }

  /** Announce gate ends inside the lookahead, so visual releases arrive before they are heard. */
  private announceReleases(until: number) {
    for (const voice of this.voices) {
      const transport = voice.transport
      if (!transport || voice.released || transport.announcedRelease !== undefined || voice.end > until) continue
      transport.announcedRelease = voice.end
      this.transportEvent(TransportEventKind.Release, voice, voice.end, voice.releaseLength / this.sampleRate)
    }
  }
}

/**
 * Source frames until a zone's recording first reaches 70% of its loudest
 * point in its first RISE_WINDOW_SECONDS, on whichever channel gets there
 * later. The scan reads a fixed stretch of the recording whatever the
 * transposition, once per zone.
 */
function recordedRise(zone: LiveSampleZone): number {
  let rise = recordedRises.get(zone)
  if (rise !== undefined) return rise
  rise = 0
  // Each channel rises on its own; the later one decides, so a side that comes in late is heard.
  for (const source of zone.channels) {
    const end = Math.min(source.length, Math.ceil(RISE_WINDOW_SECONDS * zone.sampleRate))
    let peak = 0
    for (let index = 0; index < end; index++) peak = Math.max(peak, Math.abs(source[index]))
    let channelRise = 0
    while (channelRise < end && Math.abs(source[channelRise]) < .7 * peak) channelRise++
    rise = Math.max(rise, channelRise)
  }
  recordedRises.set(zone, rise)
  return rise
}

/** Linear interpolation of a recorded curve; the cursor only moves forward. */
function curveAt(times: Float32Array, values: Float32Array, start: number, count: number, at: number,
  cursor: { pitchPoint: number; gainPoint: number }, key: 'pitchPoint' | 'gainPoint'): number {
  let point = cursor[key]
  while (point + 1 < count && times[start + point + 1] <= at) point++
  cursor[key] = point
  const time = times[start + point]
  if (at <= time || point + 1 >= count) return values[start + point]
  const nextTime = times[start + point + 1]
  const mix = (at - time) / (nextTime - time)
  return values[start + point] + (values[start + point + 1] - values[start + point]) * mix
}
