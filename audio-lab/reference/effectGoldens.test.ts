import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// The references were captured from the previous audio engine (1.3.0) before it left the app
// (BJS-486, BJS-495). They are frozen: nothing can regenerate them now.
it('keeps the frozen effect references from the previous engine', () => {
  const reference = JSON.parse(readFileSync('audio-lab/effects/fixtures/reference.json', 'utf8'))
  expect(reference.filters).toHaveLength(12)
  expect(reference.room).toHaveLength(2)
  expect(typeof reference.delay).toBe('string')
})
