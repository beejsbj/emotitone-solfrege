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
  await promisify(execFile)('node', ['audio-lab/effects/capture.mjs', '/tmp/emotitone-effects-engine.json', 'engine'], { timeout: 120000 })
  const actual = JSON.parse(readFileSync('/tmp/emotitone-effects-engine.json', 'utf8'))
  const reference = JSON.parse(readFileSync('audio-lab/effects/fixtures/reference.json', 'utf8'))
  expect(actual.ownership).toMatchObject({ context: true, master: true, graph: true, orbit: true, preparationResumes: 0 })
  expect(new Float32Array(actual.delay)).toEqual(decode(reference.delay))
  const processor = new Float32Array(actual.processorDelay)
  processor[2400] -= 1 // separate dry signal from the processor's dry+wet output
  expect(processor).toEqual(decode(reference.delay))
  const metrics: any = { roomDecayDb: [], roomSpectrumDb: [] }
  for (let channel = 0; channel < 2; channel++) {
    const expected = decode(reference.room[channel]), rendered = actual.room[channel]
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
  metrics.ownership = actual.ownership
  writeFileSync('/tmp/emotitone-effects-metrics.json', JSON.stringify(metrics, null, 2) + '\n')
}, 120000)
