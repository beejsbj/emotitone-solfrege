import { it, expect } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFileSync, writeFileSync } from 'node:fs'

it('freezes installed superdough effects before migration', async () => {
  if (process.env.REGENERATE_EFFECT_GOLDENS !== '1') {
    expect(JSON.parse(readFileSync('audio-lab/effects/fixtures/reference.json', 'utf8')).filters).toHaveLength(12)
    return
  }
  await promisify(execFile)('node', ['audio-lab/effects/capture.mjs', '/tmp/emotitone-effects-reference.json'], { timeout: 120000 })
  const result = JSON.parse(readFileSync('/tmp/emotitone-effects-reference.json', 'utf8'))
  const encode = (pcm: number[]) => Buffer.from(new Float32Array(pcm).buffer).toString('base64')
  result.filters = result.filters.map((f: any) => ({ ...f, pcm: encode(f.pcm) }))
  result.delay = encode(result.delay)
  result.room = result.room.map(encode)
  writeFileSync('audio-lab/effects/fixtures/reference.json', JSON.stringify(result) + '\n')
  expect(result.filters).toHaveLength(12)
}, 120000)
