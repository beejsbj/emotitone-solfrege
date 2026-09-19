import { createPlayStyleEngine, type PlayStyle } from '../../services/playStyles'
import type { PreparedNativeInstrument, NativeSampleZone } from '../../services/preparedNativeInstrument'
import type { LiveInputNote, LiveVoiceEvent, LiveRenderer, LiveRendererCallbacks } from '../liveRenderer'

export const NATIVE_LOOKAHEAD_MS = 400
const MAX_VOICES = 64
const MAX_RETIRING = 8
const STEAL_FADE = .005
let serial = 0

type Source = AudioBufferSourceNode | OscillatorNode
interface Voice {
  note: LiveInputNote
  ownerId: string
  noteId: string
  style: PlayStyle
  instrument: PreparedNativeInstrument
  source: Source
  gain: GainNode
  at: number
  releaseAt: number
  releaseLevel: number
  releaseLength: number
  stopAt: number
  naturalEnd: number
  attacked: boolean
  released: boolean
  cancelled: boolean
  retiring: boolean
}

export interface PreparedNativeRenderer extends LiveRenderer {
  prepare(instrument: PreparedNativeInstrument): Promise<void>
}

/** Native browser nodes reuse the original AudioBuffers. All loading and bank
 * selection precede press(); the first node is submitted in the input turn.
 * The 400 ms queue protects recurring beats from shorter main-thread stalls;
 * it does not delay input or make this scheduler independent of that thread.
 */
export function createPreparedNativeRenderer(context: AudioContext, destination: AudioNode,
  callbacks: LiveRendererCallbacks): PreparedNativeRenderer {
  const instance = `native-${++serial}`
  let noteSerial = 0
  let disposed = false
  const instruments = new Map<string, PreparedNativeInstrument>()
  const held = new Map<string, LiveInputNote[]>()
  const owners = new Set<string>()
  const voices = new Set<Voice>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastPlan = ''
  let mutationDepth = 0

  function event(voice: Voice, phase: LiveVoiceEvent['phase'], at: number): LiveVoiceEvent {
    return { ...voice.note, ownerId: voice.ownerId, noteId: voice.noteId, style: voice.style, phase, at }
  }
  function levelAt(voice: Voice, at: number): number {
    const instrument = voice.instrument
    const elapsed = Math.max(0, at - voice.at)
    if (at >= voice.releaseAt) return voice.releaseLength > 0
      ? voice.releaseLevel * Math.max(0, 1 - (at - voice.releaseAt) / voice.releaseLength) : 0
    if (instrument.attack > 0 && elapsed < instrument.attack) return instrument.gain * elapsed / instrument.attack
    if (instrument.decay > 0 && elapsed < instrument.attack + instrument.decay) {
      return instrument.gain * (1 - (1 - instrument.sustain) * (elapsed - instrument.attack) / instrument.decay)
    }
    return instrument.gain * instrument.sustain
  }
  function disconnect(voice: Voice) {
    voice.source.onended = null
    voice.source.disconnect()
    voice.gain.disconnect()
    voices.delete(voice)
  }
  function endOwners() {
    for (const ownerId of owners) {
      if (held.has(ownerId) || [...voices].some(voice => voice.ownerId === ownerId && !voice.cancelled && !voice.released)) continue
      owners.delete(ownerId)
      callbacks.onOwnerEnded?.(ownerId)
    }
  }
  function flush() {
    if (disposed) return
    const now = context.currentTime
    const events: LiveVoiceEvent[] = []
    for (const voice of voices) {
      if (voice.cancelled) continue
      if (!voice.attacked && voice.at <= now) {
        voice.attacked = true
        events.push(event(voice, 'attack', voice.at))
      }
      const end = Math.min(voice.releaseAt, voice.naturalEnd)
      if (voice.attacked && !voice.released && end <= now) {
        voice.released = true
        events.push(event(voice, 'release', end))
      }
    }
    events.sort((a, b) => a.at - b.at || (a.phase === 'attack' ? -1 : 1))
    for (const next of events) callbacks.onEvent(next)
    for (const voice of voices) if (Math.min(voice.stopAt, voice.naturalEnd) <= now || voice.cancelled) disconnect(voice)
  }
  function plan() {
    if (disposed) return
    const now = context.currentTime
    const events: LiveVoiceEvent[] = []
    for (const voice of voices) {
      if (voice.cancelled) continue
      if (!voice.attacked && voice.at > now) events.push(event(voice, 'attack', voice.at))
      const end = Math.min(voice.releaseAt, voice.naturalEnd)
      if (!voice.released && Number.isFinite(end) && end >= now) events.push(event(voice, 'release', end))
    }
    events.sort((a, b) => a.at - b.at || (a.phase === 'release' ? -1 : 1))
    const signature = events.map(next => `${next.noteId}:${next.phase}:${next.at}`).join('|')
    if (signature !== lastPlan) { lastPlan = signature; callbacks.onPlan?.(events) }
  }
  function update() {
    if (disposed) return
    flush()
    plan()
    // Cancellation must be mirrored while the controller still has owner
    // metadata. A replacement press can release and recreate the same owner
    // within one operation, so only retire after that operation is complete.
    if (mutationDepth === 0) endOwners()
    if (!disposed && timer === undefined && voices.size) timer = setTimeout(() => {
      timer = undefined
      update()
    }, 10)
  }
  function releaseVoice(voice: Voice, at: number, fade?: number) {
    const now = context.currentTime
    at = Math.max(now, at)
    // A future node can be cancelled without any attack/release notification.
    if (!voice.attacked && voice.at > now && at <= voice.at) {
      voice.cancelled = true
      voice.stopAt = now
      voice.source.stop(now)
      update()
      return
    }
    if (at >= voice.releaseAt && fade === undefined) return
    const level = levelAt(voice, at)
    voice.releaseAt = fade !== undefined && voice.released ? at : Math.min(voice.releaseAt, at)
    voice.releaseLevel = level
    voice.releaseLength = fade ?? (voice.style === 'repeat' || voice.style.startsWith('arp-') ? .03 : voice.instrument.release)
    voice.stopAt = voice.releaseAt + Math.max(0, voice.releaseLength)
    const gain = voice.gain.gain
    gain.cancelScheduledValues(voice.releaseAt)
    gain.setValueAtTime(level, voice.releaseAt)
    gain.linearRampToValueAtTime(0, voice.stopAt)
    voice.source.stop(voice.stopAt)
    update()
  }
  function enforceLimit(at: number) {
    const overlapping = [...voices].filter(voice => !voice.cancelled && !voice.retiring && voice.at <= at && Math.min(voice.stopAt, voice.naturalEnd) > at)
    if (overlapping.length < MAX_VOICES) return
    const oldest = overlapping.find(voice => voice.releaseAt <= at) ?? overlapping[0]
    oldest.retiring = true
    releaseVoice(oldest, at, STEAL_FADE)
    const retiring = [...voices].filter(voice => voice.retiring && voice.stopAt > at)
    if (retiring.length > MAX_RETIRING) releaseVoice(retiring[0], at, 0)
  }
  function chooseZone(instrument: Extract<PreparedNativeInstrument, { kind: 'sample-bank' }>, pitch: number): NativeSampleZone | undefined {
    return instrument.zoneSelection === 'first-range'
      ? instrument.zones.find(zone => pitch >= zone.lowMidi! && pitch <= zone.highMidi!)
      : instrument.zones.reduce<NativeSampleZone | undefined>((best, zone) => !best || Math.abs(zone.rootMidi - pitch) < Math.abs(best.rootMidi - pitch) ? zone : best, undefined)
  }
  function start(value: LiveInputNote & { ownerId: string }, milliseconds: number, style: PlayStyle) {
    const instrument = instruments.get(value.instrumentId)
    if (!instrument) return { release() {} }
    const at = Math.max(context.currentTime, milliseconds / 1000)
    let source: Source
    let naturalEnd = Infinity
    if (instrument.kind === 'sample-bank') {
      const zone = chooseZone(instrument, value.pitch)
      if (!zone) return { release() {} }
      const sampler = context.createBufferSource()
      sampler.buffer = zone.buffer
      const rate = 2 ** ((value.pitch - zone.rootMidi) / 12)
      sampler.playbackRate.setValueAtTime(rate, at)
      if (zone.loopStartFrame !== undefined && zone.loopEndFrame !== undefined) {
        sampler.loop = true
        sampler.loopStart = zone.loopStartFrame / zone.buffer.sampleRate
        sampler.loopEnd = zone.loopEndFrame / zone.buffer.sampleRate
      } else naturalEnd = at + zone.buffer.length / zone.buffer.sampleRate / rate
      source = sampler
    } else {
      const oscillator = context.createOscillator()
      oscillator.type = instrument.waveform
      oscillator.frequency.setValueAtTime(440 * 2 ** ((value.pitch - 69) / 12), at)
      source = oscillator
    }
    enforceLimit(at)
    const gain = context.createGain()
    gain.gain.value = 0
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(instrument.gain, at + instrument.attack)
    gain.gain.linearRampToValueAtTime(instrument.gain * instrument.sustain, at + instrument.attack + instrument.decay)
    source.connect(gain)
    gain.connect(destination)
    const voice: Voice = { note: { pitch: value.pitch, instrumentId: value.instrumentId }, ownerId: value.ownerId,
      noteId: `${instance}-${++noteSerial}`, style, instrument, source, gain, at, releaseAt: Infinity,
      releaseLevel: 0, releaseLength: instrument.release, stopAt: Infinity, naturalEnd,
      attacked: false, released: false, cancelled: false, retiring: false }
    voices.add(voice)
    source.onended = () => { update(); disconnect(voice); update() }
    source.start(at)
    update()
    return { release: (when: number) => releaseVoice(voice, when / 1000) }
  }
  const engine = createPlayStyleEngine<LiveInputNote & { ownerId: string }>({
    now: () => context.currentTime * 1000,
    start(value, at, style) {
      try { return start(value, at, style) }
      catch (error) {
        callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
        return { release() {} }
      }
    },
    schedulingLeadMs: 0,
    initialLeadMs: 0,
    lookaheadMs: NATIVE_LOOKAHEAD_MS,
  })
  function safely(operation: () => void) {
    if (disposed) return
    mutationDepth++
    try { flush(); operation() }
    catch (error) { callbacks.onError?.(error instanceof Error ? error : new Error(String(error))) }
    finally { mutationDepth--; update() }
  }
  function release(ownerId: string) {
    safely(() => { held.delete(ownerId); engine.release(ownerId) })
  }
  function clear() {
    safely(() => { held.clear(); engine.clear() })
  }
  const onStateChange = () => {
    if (!disposed && context.state === 'closed') callbacks.onError?.(new Error('Native live audio context closed'))
  }
  context.addEventListener?.('statechange', onStateChange)
  return {
    prepare(instrument) {
      if (disposed) return Promise.reject(new Error('Native live renderer has been disposed'))
      instruments.set(instrument.instrumentId, instrument)
      return Promise.resolve()
    },
    async forget(instrumentId) {
      if (disposed) throw new Error('Native live renderer has been disposed')
      instruments.delete(instrumentId)
      for (const [owner, notes] of held) if (notes.some(note => note.instrumentId === instrumentId)) release(owner)
      for (const voice of voices) if (voice.note.instrumentId === instrumentId) releaseVoice(voice, context.currentTime, context.state === 'running' ? STEAL_FADE : 0)
      if (context.state === 'running') await new Promise<void>(resolve => setTimeout(resolve, 10))
      for (const voice of voices) if (voice.note.instrumentId === instrumentId) disconnect(voice)
      update()
    },
    press(ownerId, notes) {
      safely(() => {
        if (held.has(ownerId)) { held.delete(ownerId); engine.release(ownerId) }
        const available = notes.filter(note => instruments.has(note.instrumentId) && Number.isFinite(note.pitch))
        if (!available.length) { callbacks.onOwnerEnded?.(ownerId); return }
        held.set(ownerId, available)
        owners.add(ownerId)
        engine.press(ownerId, available.map(note => ({ pitch: note.pitch, value: { ...note, ownerId } })))
      })
    },
    release,
    configure: config => safely(() => engine.configure(config)),
    clear,
    dispose() {
      if (disposed) return
      clear()
      disposed = true
      context.removeEventListener?.('statechange', onStateChange)
      if (timer !== undefined) clearTimeout(timer)
      for (const voice of voices) { voice.source.stop(context.currentTime); disconnect(voice) }
      instruments.clear()
      owners.clear()
    },
  }
}
