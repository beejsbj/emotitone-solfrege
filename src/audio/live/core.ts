import type { LiveCommand, LiveConfig, LiveInputNote, LiveResponse, LiveSampleZone,
  LiveVoiceEvent, PreparedLiveInstrument } from './types'

const MAX_VOICES = 128
const MAX_FADES = 8
const PLAN_SECONDS = .15
const GATE = .8
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
}
interface Voice extends PlannedNote {
  instrument: PreparedLiveInstrument
  zone?: LiveSampleZone
  start: number
  end: number
  style: LiveConfig['style']
  position: number
  increment: number
  releaseStart?: number
  releaseLength: number
  releaseLevel: number
  released: boolean
  finished: boolean
}

/** Audio-thread musical transport and PCM mixer. No DOM, timers, or promises. */
export class LiveAudioCore {
  private instruments = new Map<string, PreparedLiveInstrument>()
  private held = new Map<string, LiveInputNote[]>()
  private voices: Voice[] = []
  private fades: Voice[] = []
  private pulses: Pulse[] = []
  private config: LiveConfig = { style: 'together', bpm: 120, rate: 8 }
  private nextFrame?: number
  private boundaryDuration?: number
  private step = 0
  private serial = 0
  private strum: PlannedNote[] = []
  private strumAt?: number
  private planDirty = false
  private endingOwners = new Set<string>()

  constructor(private sampleRate: number, private send: (message: LiveResponse) => void) {}

  get voiceCount() { return this.voices.length + this.fades.length }
  private rhythmic() { return this.config.style === 'repeat' || this.config.style.startsWith('arp-') }
  private interval() { return this.sampleRate * 60 / this.config.bpm * 4 / this.config.rate }
  private note(note: LiveInputNote, ownerId: string, owners = new Set([ownerId])): PlannedNote {
    return { ...note, ownerId, owners: new Set(owners), noteId: `worklet-${++this.serial}` }
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
  private selection(step: number) {
    const pool = this.pool()
    if (this.config.style === 'repeat' || !pool.length) return pool
    const cycle = this.config.style === 'arp-up-down' && pool.length > 1 ? pool.length * 2 - 2 : pool.length
    const position = step % cycle
    return [pool[position < pool.length ? position : cycle - position]]
  }
  private revise(frame: number) {
    for (const pulse of this.pulses) {
      if (pulse.duration === undefined || pulse.frame < frame) continue
      if (pulse.step === 0 && pulse.notes.length && this.config.style !== 'repeat') continue
      const previous = pulse.notes
      pulse.notes = this.selection(pulse.step).map(({ note, ownerId, owners }) => {
        const match = previous.find(old => old.pitch === note.pitch && old.instrumentId === note.instrumentId)
        return match ? { ...match, ownerId, owners: new Set(owners) } : this.note(note, ownerId, owners)
      })
    }
    this.planDirty = true
  }

  command(command: LiveCommand, frame: number) {
    const endedOwners = command.type === 'clear' ? [...this.held.keys()]
      : command.type === 'release' ? [command.ownerId] : []
    switch (command.type) {
      case 'prepare':
        this.instruments.set(command.instrument.instrumentId, command.instrument)
        this.send({ type: 'prepared', requestId: command.requestId })
        return
      case 'forget': this.instruments.delete(command.instrumentId); return
      case 'clear': this.held.clear(); this.cancel(frame); break
      case 'release': this.release(command.ownerId, frame); break
      case 'press': {
        if (this.held.has(command.ownerId)) this.release(command.ownerId, frame)
        const notes = command.notes.filter(note => Number.isFinite(note.pitch) && this.instruments.has(note.instrumentId))
        if (!notes.length) break
        this.held.set(command.ownerId, notes)
        this.add(command.ownerId, notes, frame)
        break
      }
      case 'configure': {
        const next = { ...this.config, ...command.config }
        if (!Number.isFinite(next.bpm) || next.bpm < 1 || next.bpm > 1000 || ![4, 8, 16].includes(next.rate)
          || !['together', 'repeat', 'arp-up', 'arp-up-down', 'strum-up', 'strum-down'].includes(next.style)) return
        if (next.style !== this.config.style) {
          this.cancel(frame)
          this.config = next
          for (const [owner, notes] of this.held) this.add(owner, notes, frame)
        } else if (this.rhythmic() && (next.bpm !== this.config.bpm || next.rate !== this.config.rate)) {
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
      for (const voice of this.voices) if (notes.some(note => note.pitch === voice.pitch)) voice.owners.add(ownerId)
      if (this.nextFrame === undefined) { this.nextFrame = frame; this.step = 0 }
      else this.revise(frame)
    }
    this.planDirty = true
  }

  private release(owner: string, frame: number) {
    this.held.delete(owner)
    this.strum = this.strum.filter(note => note.ownerId !== owner)
    for (const pulse of this.pulses) pulse.notes = pulse.notes.filter(note => {
      note.owners.delete(owner)
      return note.owners.size > 0
    })
    for (const voice of this.voices) {
      voice.owners.delete(owner)
      if (!voice.owners.size) this.releaseVoice(voice, frame)
    }
    if (!this.held.size) this.cancel(frame)
    else if (this.rhythmic()) this.revise(frame)
    this.planDirty = true
  }

  private cancel(frame: number) {
    this.pulses = []
    this.strum = []
    this.strumAt = this.nextFrame = this.boundaryDuration = undefined
    this.step = 0
    for (const voice of this.voices) this.releaseVoice(voice, frame)
    this.planDirty = true
  }

  private fill(frame: number) {
    if (this.strumAt !== undefined && frame >= this.strumAt) {
      const direction = this.config.style === 'strum-down' ? -1 : 1
      this.strum.sort((a, b) => direction * (a.pitch - b.pitch))
      this.strum.forEach((note, index) => this.pulses.push({ frame: this.strumAt! + index * .035 * this.sampleRate,
        step: index, style: this.config.style, notes: [note] }))
      this.strum = []
      this.strumAt = undefined
      this.planDirty = true
    }
    if (!this.rhythmic() || !this.held.size || this.nextFrame === undefined) return
    while (this.nextFrame <= frame + PLAN_SECONDS * this.sampleRate) {
      this.pulses.push({ frame: this.nextFrame, step: this.step, style: this.config.style,
        duration: this.boundaryDuration ?? this.interval() * GATE,
        notes: this.selection(this.step).map(({ note, ownerId, owners }) => this.note(note, ownerId, owners)) })
      this.boundaryDuration = undefined
      this.nextFrame += this.interval()
      this.step++
      this.planDirty = true
    }
  }

  private event(note: PlannedNote, phase: LiveVoiceEvent['phase'], frame: number, style: LiveConfig['style']): LiveVoiceEvent {
    return { phase, noteId: note.noteId, ownerId: note.ownerId, pitch: note.pitch,
      instrumentId: note.instrumentId, style, at: Math.ceil(frame) / this.sampleRate }
  }
  private publishPlan(frame: number) {
    if (!this.planDirty) return
    this.planDirty = false
    const events: LiveVoiceEvent[] = []
    for (const pulse of this.pulses) for (const note of pulse.notes) {
      events.push(this.event(note, 'attack', pulse.frame, pulse.style))
      if (pulse.duration !== undefined) events.push(this.event(note, 'release', pulse.frame + pulse.duration, pulse.style))
    }
    for (const voice of this.voices) if (!voice.released && Number.isFinite(voice.end) && voice.end >= frame) {
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
  private start(note: PlannedNote, pulse: Pulse, frame: number) {
    const instrument = this.instruments.get(note.instrumentId)
    if (!instrument) return
    const zone = this.zone(instrument, note.pitch)
    if (instrument.kind === 'sample-bank' && (!zone || !zone.channels[0]?.length)) return
    if (this.voices.length >= MAX_VOICES) {
      // Prefer an already releasing voice, otherwise the oldest held voice.
      const index = Math.max(0, this.voices.findIndex(voice => voice.released))
      const [stolen] = this.voices.splice(index, 1)
      this.releaseVoice(stolen, frame)
      stolen.releaseLevel = this.envelope(stolen, frame)
      stolen.releaseStart = frame
      stolen.releaseLength = this.sampleRate * .005
      this.fades.push(stolen)
      if (this.fades.length > MAX_FADES) this.fades.shift()
    }
    const voice: Voice = { ...note, owners: new Set(note.owners), instrument, zone,
      style: pulse.style, start: frame, end: pulse.duration === undefined ? Infinity : Math.ceil(pulse.frame + pulse.duration),
      position: 0, increment: zone ? 2 ** ((note.pitch - zone.rootMidi) / 12) * zone.sampleRate / this.sampleRate
        : 440 * 2 ** ((note.pitch - 69) / 12) / this.sampleRate,
      releaseLength: (pulse.duration === undefined ? Math.max(0, instrument.release) : .03) * this.sampleRate,
      releaseLevel: 0, released: false, finished: false }
    this.voices.push(voice)
    this.send({ type: 'event', event: this.event(voice, 'attack', frame, voice.style) })
  }
  private envelope(voice: Voice, frame: number): number {
    if (voice.releaseStart !== undefined) return voice.releaseLength > 0
      ? voice.releaseLevel * Math.max(0, 1 - (frame - voice.releaseStart) / voice.releaseLength) : 0
    const elapsed = (frame - voice.start) / this.sampleRate
    const { attack, decay, sustain } = voice.instrument
    if (attack > 0 && elapsed < attack) return elapsed / attack
    if (decay > 0 && elapsed < attack + decay) return 1 + (sustain - 1) * (elapsed - attack) / decay
    return sustain
  }
  private releaseVoice(voice: Voice, frame: number) {
    if (voice.released) return
    voice.releaseLevel = this.envelope(voice, frame)
    voice.releaseStart = frame
    voice.released = true
    this.send({ type: 'event', event: this.event(voice, 'release', frame, voice.style) })
    this.planDirty = true
  }

  private sample(voice: Voice, channel: number) {
    const zone = voice.zone
    if (zone) {
      const data = zone.channels[Math.min(channel, zone.channels.length - 1)]
      const loopStart = zone.loopStartFrame ?? 0
      const loopEnd = Math.min(zone.loopEndFrame ?? 0, data.length)
      const looping = loopEnd > loopStart && loopStart >= 0
      if (looping && voice.position >= loopEnd) voice.position = loopStart + (voice.position - loopStart) % (loopEnd - loopStart)
      if (voice.position >= data.length) { voice.finished = true; return 0 }
      const index = Math.floor(voice.position)
      let next = index + 1
      if (looping && next >= loopEnd) next = Math.floor(loopStart)
      const fraction = voice.position - index
      return data[index] + ((data[next] ?? 0) - data[index]) * fraction
    }
    const phase = voice.position % 1
    const instrument = voice.instrument
    if (instrument.kind !== 'oscillator') return 0
    // PolyBLEP removes the discontinuity aliasing of naive saw/square waves.
    const dt = Math.min(.5, voice.increment)
    switch (instrument.waveform) {
      case 'sine': return Math.sin(2 * Math.PI * phase)
      case 'triangle': return 1 - 4 * Math.abs(phase - .5)
        + 4 * dt * (polyBlamp(phase, dt) - polyBlamp((phase + .5) % 1, dt))
      case 'sawtooth': return 2 * phase - 1 - polyBlep(phase, dt)
      case 'square': return (phase < .5 ? 1 : -1) + polyBlep(phase, dt) - polyBlep((phase + .5) % 1, dt)
    }
  }

  private mix(collection: Voice[], output: Float32Array[], offset: number, frame: number) {
    for (let index = collection.length - 1; index >= 0; index--) {
      const voice = collection[index]
      if (voice.released && frame >= voice.releaseStart! + voice.releaseLength) {
        collection.splice(index, 1); continue
      }
      if (!voice.finished) {
        const level = this.envelope(voice, frame) * voice.instrument.gain
        if (voice.zone) {
          for (let channel = 0; channel < output.length; channel++) output[channel][offset] += this.sample(voice, channel) * level
        } else {
          const sample = this.sample(voice, 0) * level
          for (let channel = 0; channel < output.length; channel++) output[channel][offset] += sample
        }
        voice.position += voice.increment
        if (voice.finished) {
          this.releaseVoice(voice, frame)
          collection.splice(index, 1)
        }
      }
    }
  }

  render(output: Float32Array[], firstFrame: number) {
    const length = output[0]?.length ?? 0
    for (const channel of output) channel.fill(0)
    for (let offset = 0; offset < length; offset++) {
      const frame = firstFrame + offset
      this.fill(frame)
      // Queue sizes are bounded by held notes and a 150 ms horizon. Sorting
      // only when needed also covers overlapping independently batched strums.
      while (this.pulses.length && this.pulses.some(pulse => pulse.frame <= frame)) {
        const index = this.pulses.findIndex(pulse => pulse.frame <= frame)
        const [pulse] = this.pulses.splice(index, 1)
        for (const note of pulse.notes) this.start(note, pulse, frame)
        this.planDirty = true
      }
      for (const voice of this.voices) if (!voice.released && frame >= voice.end) this.releaseVoice(voice, frame)
      this.mix(this.voices, output, offset, frame)
      this.mix(this.fades, output, offset, frame)
    }
    this.publishPlan(firstFrame + length)
    this.finishOwners()
  }
}
