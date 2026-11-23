import { it, expect } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFileSync, writeFileSync } from 'node:fs'

const decode = (encoded: string) => {
  const buffer = Buffer.from(encoded, 'base64')
  return new Float32Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
}
function power(pcm: ArrayLike<number>, from: number, to: number) {
  let sum = 0
  for (let i = from; i < to; i++) sum += pcm[i] * pcm[i]
  return sum / (to - from)
}
// Broad spectral envelopes: energy after first-order lowpasses at band edges.
// Compare band energy, rather than a single noisy DFT bin.
function bands(pcm: ArrayLike<number>) {
  const values = [250, 1000, 4000, 12000].map(cutoff => {
    const alpha = 1 - Math.exp(-2 * Math.PI * cutoff / 48000)
    let y = 0, sum = 0
    for (let i = 0; i < pcm.length; i++) { y += alpha * (pcm[i] - y); sum += y * y }
    return sum / pcm.length
  })
  return values
}
it('renders the worklet\'s own room and echo against the frozen native delay and room, through the real processor and bridge', async () => {
  await promisify(execFile)('node', ['audio-lab/effects/capture.mjs', '/tmp/emotitone-effects-engine.json', 'engine'], { timeout: 180000 })
  const actual = JSON.parse(readFileSync('/tmp/emotitone-effects-engine.json', 'utf8'))
  const reference = JSON.parse(readFileSync('audio-lab/effects/fixtures/reference.json', 'utf8'))
  expect(actual.ownership).toMatchObject({ context: true, master: true, preparationResumes: 0 })
  // The engine plays its unit impulses through the worklet at half level, under its output limiter's
  // ceiling (BJS-590), so these checks measure the effects alone; halving is exact in floating point,
  // so the frozen reference compares at half scale.
  const halfDelay = decode(reference.delay).map(value => value * .5)
  for (const pcm of [actual.delay, actual.processorDelay]) {
    const echo = new Float32Array(pcm)
    expect(echo[2400]).toBe(.5)
    echo[2400] = 0 // the dry impulse; the rest is the echo alone
    expect(echo).toEqual(halfDelay)
  }
  // The processor renders the room exactly as the core does in the page, except that Chrome's audio thread
  // flushes float32 denormals (below 1.18e-38) to zero.
  const flushed = (pcm: number[][]) => pcm.map(channel => channel.map(value => Math.abs(value) < 1.1754943508222875e-38 ? 0 : value))
  expect(flushed(actual.processorRoom)).toEqual(flushed(actual.room))
  const metrics: any = { roomDecayDb: [], roomSpectrumDb: [], roomLevelDb: [] }
  for (let channel = 0; channel < 2; channel++) {
    // The room impulse also plays at half level (see the delay above): the reference at half scale.
    const expected = decode(reference.room[channel]).map(value => value * .5)
    const rendered = Float64Array.from(actual.room[channel])
    expect(rendered[0]).toBe(.5)
    rendered[0] = 0 // the dry impulse
    const level = 10 * Math.log10(power(rendered, 0, expected.length) / power(expected, 0, expected.length))
    expect(Math.abs(level)).toBeLessThan(.5)
    const decay = []
    for (let from = 0; from + 4800 <= expected.length; from += 4800) {
      decay.push(10 * Math.log10(power(rendered, from, from + 4800) / power(expected, from, from + 4800)))
    }
    // The room is a feedback delay network tuned to the old convolver's impulse (BJS-596): within 2.5 dB in
    // every 100 ms window while it falls its first 60 dB (2 s), and 3.5 dB after (audio-lab/effects/README.md).
    expect(decay.every((value, index) => Math.abs(value) < (index < 20 ? 2.5 : 3.5))).toBe(true)
    const expectedBands = bands(expected)
    const spectrum = bands(rendered).map((p, i) => 10 * Math.log10(p / expectedBands[i]))
    expect(spectrum.every(value => Math.abs(value) < 1)).toBe(true)
    metrics.roomDecayDb.push(decay); metrics.roomSpectrumDb.push(spectrum); metrics.roomLevelDb.push(level)
  }
  const filterReference = decode(reference.filters.find((f: any) => f.rate === 48000 && f.cutoff === 1000 && f.q === 10).pcm)
  let maxError = 0
  for (let i = 0; i < filterReference.length; i++) maxError = Math.max(maxError, Math.abs(actual.filter[i] - filterReference[i]))
  expect(maxError).toBe(0)
  metrics.filterMaxError = maxError
  metrics.delaySampleExact = true
  // At the destination, dry and wet together never go over full scale (BJS-596): with no room or echo the
  // chords stay under the limiter's ceiling, and every room and delay setting up to 1 / 1 at the maximum
  // feedback is held under full scale.
  for (const { room, delay, peak } of actual.peaks) {
    expect(peak, `room ${room} / delay ${delay}`).toBeLessThanOrEqual(1)
    if (!room && !delay) expect(peak).toBeLessThan(.966)
  }
  metrics.peaks = actual.peaks
  // Stop All's cut (BJS-598): the notes, their room and their echo go silent within 10 ms of it, with no step,
  // and the room and echo take new sound afterwards; after a plain stop they ring on.
  const { plain, cut } = actual.tails
  expect(plain.beforeStop).toBeGreaterThan(.05)
  expect(plain.afterStop).toBeGreaterThan(1e-3)
  expect(plain.echoAfterStop).toBeGreaterThan(1e-2)
  expect(cut.beforeStop).toBe(plain.beforeStop)
  expect(cut.afterStop).toBe(0)
  expect(cut.echoAfterStop).toBe(0)
  expect(cut.moveAtStop).toBeLessThanOrEqual(cut.moveBefore)
  expect(cut.newTail).toBeGreaterThan(1e-3)
  metrics.tails = actual.tails
  metrics.ownership = actual.ownership
  writeFileSync('/tmp/emotitone-effects-metrics.json', JSON.stringify(metrics, null, 2) + '\n')
}, 180000)
