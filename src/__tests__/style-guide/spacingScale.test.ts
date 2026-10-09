import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseSpacingScale } from '@/style-guide/tokens/spacingScale'

const tokenCss = readFileSync(resolve(process.cwd(), 'src/emotitone-design-system.css'), 'utf8')

describe('spacing scale specimen source', () => {
  it('reads every step and role from the token file', () => {
    const steps = parseSpacingScale(tokenCss)
    expect(steps.map((step) => step.token)).toEqual(
      Array.from({ length: 11 }, (_, i) => `--s-${i + 1}`),
    )
    expect(steps[0]).toEqual({ token: '--s-1', value: '2px', hint: 'Hairline gap' })
    expect(steps[3]).toEqual({ token: '--s-4', value: '8px', hint: 'Chip padding' })
    expect(steps[10]).toEqual({ token: '--s-11', value: '64px', hint: 'Poster / hero gap' })
    for (const step of steps) expect(step.hint).not.toBe('')
  })
})
