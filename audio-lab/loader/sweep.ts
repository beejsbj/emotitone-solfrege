/**
 * BJS-488 loader receipts, run in headless Chrome by audio-lab/loader/run.mjs.
 *
 * - catalog(): the Instrument Picker's list (oscillators plus the app catalog,
 *   kept to what the picker can select).
 * - sweep(names): load each instrument through the app loader, under the name
 *   the app plays it by (resolveLiveSoundName), and render low, middle and
 *   high pitches (every zone edge for soundfonts) on the worklet core,
 *   checking non-silence, pitch (pitchy, ±10 cents) and loop sustain.
 * - piano(mode): load the piano into a real AudioWorklet while probe key
 *   presses run, recording long tasks and press round-trips. "legacy" also
 *   keeps decoded AudioBuffers alive, as the old engine did, for the memory A/B.
 */
import { PitchDetector } from 'pitchy'
import { catalogSoundNames, getCatalogSound, registerSampleMap, registerSoundfonts, sampleZoneSources } from '../../src/audio/soundCatalog'
import { SAMPLE_PACKS, sampleMapUrl } from '../../src/audio/sampleSources'
import { GM_SOUNDFONTS } from '../../src/data/gmSoundfonts'
import { isSelectableInstrument } from '../../src/data/instrumentCatalog'
import { OSCILLATOR_SOUNDS } from '../../src/services/audioEngine'
import { resolveLiveSoundName } from '../../src/services/liveInstrumentNames'
import { prepareLiveInstrument, releasePreparedLiveInstrument } from '../../src/services/preparedLiveInstrument'
import { LiveAudioCore } from '../../src/audio/live/core'
import { createLiveWorklet } from '../../src/audio/live/bridge'
import { pcmTransferList, preparedPcmBytes } from '../../src/audio/live/pcm'
import type { PreparedLiveInstrument } from '../../src/audio/live/types'

const RATE = 48000
const maps: Record<string, Record<string, unknown>> = {}
const lab = window as unknown as Record<string, unknown>

async function registerAll() {
  if (Object.keys(maps).length) return
  for (const { key } of SAMPLE_PACKS) {
    maps[key] = await (await fetch(sampleMapUrl(key))).json()
    registerSampleMap(maps[key])
  }
  registerSoundfonts(GM_SOUNDFONTS)
}

lab.catalog = async () => {
  await registerAll()
  const registered = [...new Set([...OSCILLATOR_SOUNDS, ...catalogSoundNames()])]
  return {
    registered: { all: registered.length, vcsl: Object.keys(maps.vcsl).filter(k => !k.startsWith('_')).length,
      gm: Object.keys(GM_SOUNDFONTS).length, oscillators: OSCILLATOR_SOUNDS.length },
    selectable: registered.filter(isSelectableInstrument),
  }
}

/** One note on a fresh core, so no earlier probe's release tail can sound in this one. */
function render(instrument: PreparedLiveInstrument, pitch: number, instrumentId: string, holdSeconds: number) {
  const core = new LiveAudioCore(RATE, () => {})
  core.command({ type: 'prepare', requestId: 1, instrument }, 0)
  const frames = Math.ceil((holdSeconds + .3) * RATE)
  const left = new Float32Array(frames), right = new Float32Array(frames)
  core.command({ type: 'press', ownerId: 'probe', notes: [{ pitch, instrumentId }] }, 0)
  const releaseAt = Math.round(holdSeconds * RATE)
  for (let at = 0; at < frames; at += 128) {
    if (at <= releaseAt && releaseAt < at + 128) core.command({ type: 'release', ownerId: 'probe' }, at)
    const end = Math.min(at + 128, frames)
    core.render([left.subarray(at, end), right.subarray(at, end)], at)
  }
  return left
}

function rms(data: Float32Array, from: number, to: number) {
  let sum = 0
  const a = Math.floor(from * RATE), b = Math.min(data.length, Math.floor(to * RATE))
  for (let i = a; i < b; i++) sum += data[i] * data[i]
  return Math.sqrt(sum / Math.max(1, b - a))
}

const detector = PitchDetector.forFloat32Array(8192)
function cents(data: Float32Array, pitch: number) {
  const expected = 440 * 2 ** ((pitch - 69) / 12)
  let best: { cents: number; clarity: number } | undefined
  for (const start of [.08, .2, .35]) {
    const window = data.subarray(Math.floor(start * RATE), Math.floor(start * RATE) + 8192)
    if (window.length < 8192) continue
    const [frequency, clarity] = detector.findPitch(window, RATE)
    if (!(frequency > 0)) continue
    // Octave errors are a detector artefact on harmonic-rich samples; fold them.
    let error = 1200 * Math.log2(frequency / expected)
    error -= 1200 * Math.round(error / 1200)
    if (!best || clarity > best.clarity) best = { cents: error, clarity }
  }
  return best
}

function probePitches(prepared: PreparedLiveInstrument): number[] {
  if (prepared.kind !== 'sample-bank') return [48, 60, 72]
  if (prepared.zoneSelection === 'first-range') {
    const low = Math.min(...prepared.zones.map(zone => zone.lowMidi!)), high = Math.max(...prepared.zones.map(zone => zone.highMidi!))
    const edges = prepared.zones.flatMap(zone => [zone.lowMidi!, zone.highMidi! - 1])
    return [...new Set([Math.max(low, 36), 60, Math.min(high - 1, 84), ...edges.filter(pitch => pitch >= 36 && pitch <= 84)])]
      .filter(pitch => prepared.zones.some(zone => pitch >= zone.lowMidi! && pitch <= zone.highMidi!)).sort((a, b) => a - b)
  }
  const roots = [...new Set(prepared.zones.map(zone => zone.rootMidi))].sort((a, b) => a - b)
  // Roots play the raw sample; a pitch between two roots exercises resampling.
  const middle = Math.floor(roots.length / 2)
  const between = roots.length > 1 ? Math.round((roots[middle - 1] + roots[middle]) / 2) : roots[0] + 3
  return [...new Set([roots[0], between, roots[middle], roots.at(-1)!])].map(pitch => Math.min(96, Math.max(24, pitch)))
}

lab.sweep = async (names: string[]) => {
  await registerAll()
  const results = []
  for (const name of names) {
    const context = new OfflineAudioContext(2, 1, RATE)
    const started = performance.now()
    const sound = resolveLiveSoundName(name)
    let prepared
    try { prepared = await prepareLiveInstrument(context, sound) } catch (error) { prepared = { kind: 'error', reason: String(error) } }
    const loadMs = Math.round(performance.now() - started)
    if (prepared.kind !== 'sample-bank' && prepared.kind !== 'oscillator') {
      results.push({ name, kind: prepared.kind, reason: (prepared as { reason?: string }).reason, loadMs })
      continue
    }
    const entry = getCatalogSound(sound)
    const pitched = prepared.kind === 'oscillator' || entry?.kind === 'soundfont' || (entry?.kind === 'sample' && !Array.isArray(entry.bank))
    const probes = []
    for (const pitch of probePitches(prepared)) {
      const pcm = render(prepared, pitch, sound, .6)
      const level = rms(pcm, .02, .5)
      const detected = pitched ? cents(pcm, pitch) : undefined
      probes.push({ pitch, rms: Number(level.toFixed(5)), cents: detected && Number(detected.cents.toFixed(1)),
        clarity: detected && Number(detected.clarity.toFixed(2)) })
    }
    // Hold through at least one full loop of every looped zone; the tail must still sound.
    const loops = []
    if (prepared.kind === 'sample-bank') for (const zone of prepared.zones) {
      if (zone.loopEndFrame === undefined || zone.loopStartFrame === undefined) continue
      const pitch = Math.round(Math.min(Math.max(zone.rootMidi, zone.lowMidi ?? 0), (zone.highMidi ?? 128) - 1))
      const increment = 2 ** ((pitch - zone.rootMidi) / 12) * zone.sampleRate / RATE
      const hold = Math.min(8, (zone.loopEndFrame + (zone.loopEndFrame - zone.loopStartFrame)) / increment / RATE + .3)
      const pcm = render(prepared, pitch, sound, hold)
      loops.push({ zone: zone.id, pitch, hold: Number(hold.toFixed(2)), tailRms: Number(rms(pcm, hold - .15, hold).toFixed(5)),
        onsetRms: Number(rms(pcm, .02, .2).toFixed(5)) })
    }
    const bytes = preparedPcmBytes(prepared)
    const kind = entry?.kind ?? 'oscillator'
    results.push({ name, sound, kind, zones: prepared.kind === 'sample-bank' ? prepared.zones.length : 0,
      sourceBytes: bytes.source, derivedBytes: bytes.derived, loadMs, pitched, probes, loops })
    releasePreparedLiveInstrument(context, sound, prepared)
  }
  return results
}

lab.piano = async (mode: 'owned' | 'legacy') => {
  await registerAll()
  const context = new AudioContext({ sampleRate: RATE, latencyHint: 'interactive' })
  await context.resume()
  const acknowledged = new Map<string, number>()
  const worklet = await createLiveWorklet(context, context.destination, {
    onEvent: event => { if (event.phase === 'attack' && !acknowledged.has(event.ownerId)) acknowledged.set(event.ownerId, performance.now()) },
  })
  const triangle = await prepareLiveInstrument(context, 'triangle')
  if (triangle.kind !== 'oscillator') throw new Error('triangle did not prepare')
  await worklet.prepare(triangle)
  const longTasks: number[] = []
  const observer = new PerformanceObserver(list => { for (const entry of list.getEntries()) longTasks.push(Math.round(entry.duration)) })
  observer.observe({ type: 'longtask', buffered: false })
  const sent = new Map<string, number>()
  let serial = 0, lastTick = performance.now(), maxTickGapMs = 0
  const probe = setInterval(() => {
    // A 25 ms tick that arrives late means queued input waited that long too.
    const now = performance.now()
    maxTickGapMs = Math.max(maxTickGapMs, now - lastTick)
    lastTick = now
    const ownerId = `probe-${++serial}`
    sent.set(ownerId, performance.now())
    worklet.press(ownerId, [{ pitch: 72, instrumentId: 'triangle', velocity: .01 }])
    setTimeout(() => worklet.release(ownerId), 10)
  }, 25)
  const started = performance.now()
  let summary: Record<string, unknown>
  if (mode === 'owned') {
    const prepared = await prepareLiveInstrument(context, 'piano')
    if (prepared.kind !== 'sample-bank') throw new Error(`piano did not prepare: ${JSON.stringify(prepared)}`)
    const bytes = preparedPcmBytes(prepared)
    const transferSizes = pcmTransferList(prepared).map(buffer => buffer.byteLength)
    const postStarted = performance.now()
    await worklet.prepare(prepared)
    summary = { zones: prepared.zones.length, sourceBytes: bytes.source, derivedBytes: bytes.derived,
      transferBuffers: transferSizes.length, largestTransferBytes: Math.max(...transferSizes),
      prepareRoundTripMs: Math.round(performance.now() - postStarted),
      detachedOnMainThread: prepared.zones.every(zone => zone.channels.every(channel => channel.byteLength === 0)) }
    releasePreparedLiveInstrument(context, 'piano', prepared)
  } else {
    // What the app did before: the old engine decoded and kept every file; the
    // worklet receives a structured clone of those buffers.
    const bank = getCatalogSound('piano')
    if (bank?.kind !== 'sample') throw new Error('piano is not registered')
    const keep: AudioBuffer[] = []
    const zones = []
    for (const [index, { url, rootMidi }] of sampleZoneSources(bank.bank).entries()) {
      const buffer = await context.decodeAudioData(await (await fetch(url)).arrayBuffer())
      keep.push(buffer)
      zones.push({ id: `piano:${index}`, rootMidi, sampleRate: buffer.sampleRate,
        channels: Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel)) })
    }
    lab.legacyBuffers = keep
    const node = new AudioWorkletNode(context, 'emotitone-live', { numberOfInputs: 0, numberOfOutputs: 3,
      outputChannelCount: [2, 2, 2], channelCount: 2, processorOptions: { instanceId: 'legacy' } })
    const acknowledgedPrepare = new Promise<void>(resolve => {
      node.port.onmessage = ({ data }) => { if ([data].flat().some((message: { type: string }) => message.type === 'prepared')) resolve() }
    })
    const postStarted = performance.now()
    node.port.postMessage({ type: 'prepare', requestId: 1, instrument: { kind: 'sample-bank', instrumentId: 'piano',
      zoneSelection: 'nearest-root', gain: .8, attack: .001, decay: .001, sustain: 1, release: .2, zones } })
    const postMs = performance.now() - postStarted
    await acknowledgedPrepare
    lab.legacyNode = node
    summary = { zones: zones.length, sourceBytes: zones.reduce((sum, zone) => sum + zone.channels.reduce((total, channel) => total + channel.byteLength, 0), 0),
      clonePostMs: Number(postMs.toFixed(1)), prepareRoundTripMs: Math.round(performance.now() - postStarted), decodedBuffersKept: keep.length }
  }
  const loadMs = performance.now() - started
  clearInterval(probe)
  await new Promise(resolve => setTimeout(resolve, 300))
  observer.disconnect()
  const roundTrips = [...sent].filter(([id]) => acknowledged.has(id)).map(([id, at]) => acknowledged.get(id)! - at).sort((a, b) => a - b)
  let pianoPlayed: boolean | undefined
  if (mode === 'owned') {
    // A piano note through the worklet proves the transferred bank plays.
    worklet.press('piano-check', [{ pitch: 60, instrumentId: 'piano' }])
    await new Promise(resolve => setTimeout(resolve, 200))
    worklet.release('piano-check')
    pianoPlayed = acknowledged.has('piano-check')
  }
    lab.keepWorklet = worklet
  return { mode, ...summary, loadMs: Math.round(loadMs), longTasksMs: longTasks,
    longTaskApi: PerformanceObserver.supportedEntryTypes.includes('longtask'), maxInputTickGapMs: Math.round(maxTickGapMs), pianoPlayed,
    probes: { sent: sent.size, acknowledged: roundTrips.length, maxRoundTripMs: Math.round(roundTrips.at(-1) ?? 0),
      p95RoundTripMs: Math.round(roundTrips[Math.floor(roundTrips.length * .95)] ?? 0) } }
}
lab.loaderReady = true
