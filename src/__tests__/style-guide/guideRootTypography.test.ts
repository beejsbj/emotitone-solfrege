import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const guideDefaults = read('src/style-guide/guide-defaults.css')
const previewCard = read('src/style-guide/preview-card.css')

// A real specimen must render as it does in production. Production's root
// typography (weight 600 plus the small-caps/old-style feature settings) comes
// from style.css; a guide `font:` shorthand on html/body resets both.
const rootRules = (css: string) =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]*)\{([^}]*)\}/g)]
    .map(([, selector, body]) => ({ selector: selector.trim(), body }))
    .filter(({ selector }) =>
      selector.split(',').every((part) => /^(html|body)(\.[\w-]+)*$/.test(part.trim())),
    )

describe('style-guide root typography', () => {
  it.each([
    ['guide-defaults.css', guideDefaults],
    ['preview-card.css', previewCard],
  ])('%s leaves the production root font untouched', (_name, css) => {
    const rules = rootRules(css)
    expect(rules.length).toBeGreaterThan(0)
    for (const { body } of rules) {
      expect(body).not.toMatch(/(^|[;\s])font\s*:/)
      expect(body).not.toMatch(/font-(weight|feature-settings|size)\s*:/)
    }
  })
})
