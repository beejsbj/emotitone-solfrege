import { it, expect } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

function wav(channels: number[][]) {
  const bytes = Buffer.alloc(44 + channels[0].length * channels.length * 2)
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8)
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(channels.length, 22)
  bytes.writeUInt32LE(48000, 24); bytes.writeUInt32LE(48000 * channels.length * 2, 28)
  bytes.writeUInt16LE(channels.length * 2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36)
  bytes.writeUInt32LE(bytes.length - 44, 40)
  for (let i = 0; i < channels[0].length; i++) for (let c = 0; c < channels.length; c++) {
    bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, channels[c][i])) * 32767), 44 + (i * channels.length + c) * 2)
  }
  return bytes
}
it('provides short before/after WAVs with measured differences for listening', async () => {
  if (process.env.RENDER_EFFECT_LISTENING !== '1') {
    const encoded = wav([[0, 1, -1], [.5, 2, -2]])
    expect(encoded.subarray(0, 4).toString()).toBe('RIFF')
    expect(encoded.readUInt32LE(40)).toBe(12)
    expect(Array.from({ length: 6 }, (_, i) => encoded.readInt16LE(44 + i * 2)))
      .toEqual([0, 16384, 32767, 32767, -32767, -32767])
    return
  }
  await promisify(execFile)('node', ['audio-lab/effects/capture.mjs', '/tmp/emotitone-effects-listening.json', 'listening'], { timeout: 120000 })
  const { clips } = JSON.parse(readFileSync('/tmp/emotitone-effects-listening.json', 'utf8'))
  const output = '/tmp/emotitone-effects-listening'
  mkdirSync(output, { recursive: true })
  const metrics = clips.map((clip: any) => {
    for (const side of ['before', 'after']) {
      expect(clip[side][0].some((sample: number) => Math.abs(sample) > .01)).toBe(true)
      writeFileSync(`${output}/${clip.name}-${side}.wav`, wav(clip[side]))
    }
    let maxError = 0, errorPower = 0
    for (let c = 0; c < clip.before.length; c++) for (let i = 0; i < clip.before[c].length; i++) {
      const error = clip.before[c][i] - clip.after[c][i]
      maxError = Math.max(maxError, Math.abs(error)); errorPower += error * error
    }
    // FIR convolution and native feedback sum in a different order from the
    // worklet. Bound the isolated filter/delay A/B; room noise intentionally differs.
    if (clip.name !== 'room') expect(maxError).toBeLessThan(2e-6)
    return { name: clip.name, shape: clip.shape, maxError, rmsError: Math.sqrt(errorPower / (clip.before.length * clip.before[0].length)) }
  })
  writeFileSync(`${output}/metrics.json`, JSON.stringify(metrics, null, 2) + '\n')
  expect(clips).toHaveLength(3)
}, 120000)
