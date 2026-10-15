/**
 * BJS-488 loader receipts, run in headless Chrome by audio-lab/loader/run.mjs.
 *
 * - catalog(): today's picker list (superdough + @strudel/soundfonts
 *   registration) against the app catalog's list.
 * - sweep(names): load each instrument through the app loader and render low,
 *   middle and high pitches (every zone edge for soundfonts) on the worklet
 *   core, checking non-silence, pitch (pitchy, ±10 cents) and loop sustain.
 * - piano(mode): load the piano into a real AudioWorklet while probe key
 *   presses run, recording long tasks and press round-trips. "legacy" also
 *   keeps decoded AudioBuffers alive, as superdough did, for the memory A/B.
 */
// @ts-ignore — superdough ships no TypeScript declarations.
import * as dough from 'superdough'
import { PitchDetector } from 'pitchy'
import { catalogSoundNames, getCatalogSound, registerSampleMap, registerSoundfonts, sampleZoneSources } from '../../src/audio/soundCatalog'
import { SAMPLE_PACKS, sampleMapUrl } from '../../src/audio/sampleSources'
import { GM_SOUNDFONTS } from '../../src/data/gmSoundfonts'
import { categoriseInstrument } from '../../src/data/instrumentCatalog'
import { prepareLiveInstrument, releasePreparedLiveInstrument } from '../../src/services/preparedLiveInstrument'
import { LiveAudioCore } from '../../src/audio/live/core'
import { createLiveWorklet } from '../../src/audio/live/bridge'
import { pcmTransferList, preparedPcmBytes } from '../../src/audio/live/pcm'
import type { PreparedLiveInstrument } from '../../src/audio/live/types'
import { registerFallbackSoundfonts } from '../../src/services/soundfontFallback'

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
  // Today's picker: every key in superdough's sound map after the old boot.
  dough.registerSynthSounds()
  for (const map of Object.values(maps)) await dough.samples(map, map._base)
  const synths = Object.keys(dough.soundMap.get()).filter(name => {
    const sound = dough.getSound(name)
    return sound && !sound.data?.samples && sound.data?.type !== 'soundfont'
  })
  const today = [...new Set([...Object.keys(dough.soundMap.get()), ...Object.keys(GM_SOUNDFONTS)])].filter(name => !name.startsWith('_'))
  const now = [...new Set([...synths, ...catalogSoundNames()])]
  const selectable = (list: string[]) => list.filter(name => categoriseInstrument(name) !== null)
  return {
    registered: { today: today.length, now: now.length, vcsl: Object.keys(maps.vcsl).filter(k => !k.startsWith('_')).length,
      gm: Object.keys(GM_SOUNDFONTS).length, synths: synths.length },
    selectableToday: selectable(today), selectableNow: selectable(now), synths,
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
    let prepared
    try { prepared = await prepareLiveInstrument(context, name) } catch (error) { prepared = { kind: 'error', reason: String(error) } }
    const loadMs = Math.round(performance.now() - started)
    if (prepared.kind !== 'sample-bank' && prepared.kind !== 'oscillator') {
      results.push({ name, kind: prepared.kind, reason: (prepared as { reason?: string }).reason, loadMs })
      continue
    }
    const sound = getCatalogSound(name)
    const pitched = prepared.kind === 'oscillator' || sound?.kind === 'soundfont' || (sound?.kind === 'sample' && !Array.isArray(sound.bank))
    const probes = []
    for (const pitch of probePitches(prepared)) {
      const pcm = render(prepared, pitch, name, .6)
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
      const pcm = render(prepared, pitch, name, hold)
      loops.push({ zone: zone.id, pitch, hold: Number(hold.toFixed(2)), tailRms: Number(rms(pcm, hold - .15, hold).toFixed(5)),
        onsetRms: Number(rms(pcm, .02, .2).toFixed(5)) })
    }
    const bytes = preparedPcmBytes(prepared)
    const kind = sound?.kind ?? 'oscillator'
    results.push({ name, kind, zones: prepared.kind === 'sample-bank' ? prepared.zones.length : 0,
      sourceBytes: bytes.source, derivedBytes: bytes.derived, loadMs, pitched, probes, loops })
    releasePreparedLiveInstrument(context, name, prepared)
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
    // What the app did before: superdough decodes and keeps every file; the
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
lab.fontParity = async (names: string[], probePitches = [36, 48, 55, 60, 63, 64, 67, 72, 76, 84], hold = .8) => {
  await registerAll()
  // Reference: @strudel/soundfonts as patched (evaluates the font file; lab only).
  // @ts-ignore — no declarations.
  const upstream = await import('@strudel/soundfonts')
  const results = []
  for (const name of names) {
    const font = GM_SOUNDFONTS[name][0]
    // Zones: the app loader against upstream's prepared zones, same decoder and rate.
    const context = new OfflineAudioContext(2, 1, RATE)
    const reference = await upstream.getPreparedSoundfont(font, context)
    const ours = await prepareLiveInstrument(context, name)
    if (ours.kind !== 'sample-bank') { results.push({ name, error: JSON.stringify(ours) }); continue }
    const zoneMismatches = reference.flatMap((zone: any, index: number) => {
      const mine = ours.zones[index]
      const root = (zone.originalPitch - 100 * zone.coarseTune - zone.fineTune) / 100
      const loops = zone.loopStart > 1 && zone.loopStart < zone.loopEnd
      if (!mine) return [{ index, missing: true }]
      const tuning = mine.rootMidi === root && mine.lowMidi === zone.keyRangeLow && mine.highMidi === zone.keyRangeHigh + 1
        && mine.loopStartFrame === (loops ? zone.loopStart / zone.sampleRate * zone.buffer.sampleRate : undefined)
        && mine.loopEndFrame === (loops ? zone.loopEnd / zone.sampleRate * zone.buffer.sampleRate : undefined)
      // Upstream decodes a buffer sized by the base64 length, so its PCM may carry a decoded zero tail.
      const shared = Math.min(mine.channels[0].length, zone.buffer.length)
      const pcmPrefixEqual = mine.channels.length === zone.buffer.numberOfChannels
        && mine.channels.every((channel, number) => channel.subarray(0, shared).every((value, frame) => value === zone.buffer.getChannelData(number)[frame]))
      let upstreamTailPeak = 0
      for (let number = 0; number < zone.buffer.numberOfChannels; number++) {
        const data = zone.buffer.getChannelData(number)
        for (let frame = shared; frame < data.length; frame++) upstreamTailPeak = Math.max(upstreamTailPeak, Math.abs(data[frame]))
      }
      return tuning && pcmPrefixEqual && mine.channels[0].length === zone.buffer.length ? []
        : [{ index, tuning, pcmPrefixEqual, frames: mine.channels[0].length, upstreamFrames: zone.buffer.length, upstreamTailPeak }]
    })
    // Patterns: one note through superdough, voiced by upstream, then by the app's fallback registration.
    const renderNote = async (note: string | number = 'C4') => {
      dough.resetGlobalEffects()
      const offline = new OfflineAudioContext(2, Math.ceil(RATE * (hold + .6)), RATE)
      dough.setAudioContext(offline)
      dough.setSuperdoughAudioController(null)
      await dough.initAudio({ disableWorklets: true })
      await dough.superdough({ s: name, note, gain: .8, attack: .01, decay: .1, sustain: .8, release: .2 }, .05, hold, 1)
      return (await offline.startRendering()).getChannelData(0)
    }
    upstream.registerSoundfonts()
    const before = await renderNote()
    registerFallbackSoundfonts({ [name]: GM_SOUNDFONTS[name] })
    const after = await renderNote()
    let maxDifference = 0
    for (let frame = 0; frame < before.length; frame++) maxDifference = Math.max(maxDifference, Math.abs(before[frame] - after[frame]))
    // Pitch through each renderer: superdough with upstream's loader, superdough with the
    // app's fallback, and the live worklet with the app's loader. Same data, so the same pitch.
    const pitches = []
    for (const pitch of probePitches) {
      if (!ours.zones.some(zone => pitch >= zone.lowMidi! && pitch <= zone.highMidi!)) continue
      registerFallbackSoundfonts({ [name]: GM_SOUNDFONTS[name] })
      const fallbackPcm = await renderNote(pitch)
      const fallback = cents(fallbackPcm, pitch)
      upstream.registerSoundfonts()
      const upstreamPcm = await renderNote(pitch)
      const upstreamPitch = cents(upstreamPcm, pitch)
      const livePcm = render(ours, pitch, name, hold)
      const live = cents(livePcm, pitch)
      // Level late in the hold: a loop that ends early shows here.
      const tail = (pcm: Float32Array, start: number) => Number(rms(pcm, start + hold - .2, start + hold).toFixed(5))
      pitches.push({ pitch, upstreamTailRms: tail(upstreamPcm, .05), workletTailRms: tail(livePcm, 0),
        upstreamCents: upstreamPitch && Number(upstreamPitch.cents.toFixed(1)),
        fallbackCents: fallback && Number(fallback.cents.toFixed(1)), workletCents: live && Number(live.cents.toFixed(1)) })
    }
    releasePreparedLiveInstrument(context, name, ours)
    results.push({ name, font, zones: reference.length, zoneMismatches, patternRms: Number(rms(after, .06, .8).toFixed(5)),
      patternMaxDifference: maxDifference, pitches })
  }
  return results
}
lab.loaderReady = true
