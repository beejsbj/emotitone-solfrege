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
it('renders app-owned native buses against frozen delay and room, through the real worklet/graph', async () => {
  await promisify(execFile)('node', ['audio-lab/effects/capture.mjs', '/tmp/emotitone-effects-engine.json', 'engine'], { timeout: 180000 })
  const actual = JSON.parse(readFileSync('/tmp/emotitone-effects-engine.json', 'utf8'))
  const reference = JSON.parse(readFileSync('audio-lab/effects/fixtures/reference.json', 'utf8'))
  expect(actual.ownership).toMatchObject({ context: true, master: true, graph: true, orbit: true, preparationResumes: 0 })
  // The engine plays its unit impulses through the worklet at half level, under its output limiter's
  // ceiling (BJS-590), so these checks measure the buses alone; halving is exact in floating point,
  // so the frozen reference compares at half scale.
  const halfDelay = decode(reference.delay).map(value => value * .5)
  expect(new Float32Array(actual.delay)).toEqual(halfDelay)
  const processor = new Float32Array(actual.processorDelay)
  processor[2400] -= .5 // separate dry signal from the processor's dry+wet output
  expect(processor).toEqual(halfDelay)
  const degraded = new Float32Array(actual.degraded.pcm)
  degraded[2400] -= 1
  expect(degraded).toEqual(decode(reference.delay)) // dry+delay survive; room stays silent
  expect(actual.degraded.roomWarnings).toBe(2) // once for each of the two orbits
  expect(actual.degraded.failedRenders).toBe(2) // repeated ready() does not retry
  const metrics: any = { roomDecayDb: [], roomSpectrumDb: [] }
  for (let channel = 0; channel < 2; channel++) {
    // The room impulse also plays at half level (see the delay above): the reference at half scale.
    const expected = decode(reference.room[channel]).map(value => value * .5), rendered = actual.room[channel]
    const decay = []
    for (let from = 0; from + 4800 <= expected.length; from += 4800) {
      decay.push(10 * Math.log10(power(rendered, from, from + 4800) / power(expected, from, from + 4800)))
    }
    expect(decay.every(value => Math.abs(value) < 1)).toBe(true)
    const expectedBands = bands(expected)
    const spectrum = bands(rendered).map((p, i) => 10 * Math.log10(p / expectedBands[i]))
    expect(spectrum.every(value => Math.abs(value) < 1)).toBe(true)
    metrics.roomDecayDb.push(decay); metrics.roomSpectrumDb.push(spectrum)
  }
  const filterReference = decode(reference.filters.find((f: any) => f.rate === 48000 && f.cutoff === 1000 && f.q === 10).pcm)
  let maxError = 0
  for (let i = 0; i < filterReference.length; i++) maxError = Math.max(maxError, Math.abs(actual.filter[i] - filterReference[i]))
  expect(maxError).toBe(0)
  metrics.filterMaxError = maxError
  metrics.delaySampleExact = true
  // Stop All's cut (BJS-598): the shared room and delay go silent within 11 ms of it, with no step,
  // and take new sound at once; after a plain stop they ring on.
  const { plain, cut } = actual.tails
  expect(plain.beforeStop).toBeGreaterThan(1e-3)
  expect(plain.afterStop).toBeGreaterThan(1e-3)
  expect(plain.echoAfterStop).toBeGreaterThan(1e-2)
  expect(cut.beforeStop).toBe(plain.beforeStop)
  expect(cut.afterStop).toBeLessThan(1e-6)
  expect(cut.moveAtStop).toBeLessThanOrEqual(cut.moveBefore)
  expect(cut.newHit).toBeGreaterThan(1e-3)
  metrics.tails = actual.tails
  metrics.ownership = actual.ownership
  writeFileSync('/tmp/emotitone-effects-metrics.json', JSON.stringify(metrics, null, 2) + '\n')
}, 180000)
