/**
 * Reads a webaudiofontdata preset file without running it.
 *
 * A font file is JavaScript: `console.log(...); var _tone_<font>={zones:[...]};`.
 * @strudel/soundfonts `eval`s that text. This module parses only the object
 * literal assigned to the `var`, and only plain data (objects, arrays, strings,
 * numbers, booleans, null, comments). Numbers may be written as arithmetic on
 * numeric literals (some fonts say `originalPitch:4200-140`), which is computed
 * here. Any other expression, call or identifier is a parse error, so remote
 * code is never executed.
 */

export interface SoundfontZone {
  originalPitch: number
  coarseTune: number
  fineTune: number
  keyRangeLow: number
  keyRangeHigh: number
  sampleRate: number
  loopStart: number
  loopEnd: number
  /** Base64 of an encoded audio file (MP3/OGG/WAV). */
  file?: string
  /** Base64 of raw 16-bit little-endian PCM at `sampleRate` (older fonts). */
  sample?: string
}

export class SoundfontParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SoundfontParseError'
  }
}

type Literal = string | number | boolean | null | Literal[] | { [key: string]: Literal }

const IDENTIFIER = /[A-Za-z_$][\w$]*/y
const NUMBER = /[+-]?(?:0[xX][\da-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/y
const UNSIGNED = /(?:0[xX][\da-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/y
const ESCAPES: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', 0: '\0' }

class LiteralParser {
  position = 0
  constructor(private text: string) {}

  fail(message: string): never {
    throw new SoundfontParseError(`${message} at offset ${this.position}`)
  }

  skip() {
    const text = this.text
    while (this.position < text.length) {
      const char = text[this.position]
      if (char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '﻿') this.position++
      else if (text.startsWith('//', this.position)) {
        const end = text.indexOf('\n', this.position)
        this.position = end === -1 ? text.length : end + 1
      } else if (text.startsWith('/*', this.position)) {
        const end = text.indexOf('*/', this.position + 2)
        if (end === -1) this.fail('Unterminated comment')
        this.position = end + 2
      } else break
    }
  }

  value(depth = 0): Literal {
    if (depth > 32) this.fail('Preset nests too deeply')
    this.skip()
    const char = this.text[this.position]
    if (char === '{') return this.object(depth)
    if (char === '[') return this.array(depth)
    if (char === '"' || char === "'") return this.string()
    if (/[\d.+\-(]/.test(char ?? '')) {
      const parsed = this.sum(depth)
      if (!Number.isFinite(parsed)) this.fail('Invalid number')
      return parsed
    }
    IDENTIFIER.lastIndex = this.position
    const word = IDENTIFIER.exec(this.text)?.[0]
    if (word === 'true' || word === 'false' || word === 'null') {
      this.position += word.length
      return word === 'true' ? true : word === 'false' ? false : null
    }
    return this.fail('Only plain data is allowed in a soundfont preset')
  }

  /** Arithmetic on numeric literals only: + - * / and parentheses. */
  sum(depth: number): number {
    let value = this.product(depth)
    for (;;) {
      this.skip()
      const operator = this.text[this.position]
      if (operator !== '+' && operator !== '-') return value
      this.position++
      const right = this.product(depth)
      value = operator === '+' ? value + right : value - right
    }
  }

  product(depth: number): number {
    let value = this.unary(depth)
    for (;;) {
      this.skip()
      const operator = this.text[this.position]
      // "//" and "/*" start comments, which skip() has already consumed.
      if (operator !== '*' && operator !== '/') return value
      this.position++
      const right = this.unary(depth)
      value = operator === '*' ? value * right : value / right
    }
  }

  unary(depth: number): number {
    if (depth > 32) this.fail('Preset nests too deeply')
    this.skip()
    const char = this.text[this.position]
    if (char === '+' || char === '-') {
      this.position++
      const operand = this.unary(depth + 1)
      return char === '-' ? -operand : operand
    }
    if (char === '(') {
      this.position++
      const inner = this.sum(depth + 1)
      this.skip()
      if (this.text[this.position] !== ')') this.fail('Expected ")"')
      this.position++
      return inner
    }
    UNSIGNED.lastIndex = this.position
    const number = UNSIGNED.exec(this.text)
    if (!number) return this.fail('Only plain data is allowed in a soundfont preset')
    this.position = UNSIGNED.lastIndex
    return Number(number[0])
  }

  object(depth: number) {
    this.position++
    const entries: [string, Literal][] = []
    for (;;) {
      this.skip()
      if (this.text[this.position] === '}') { this.position++; break }
      const key = this.key()
      this.skip()
      if (this.text[this.position] !== ':') this.fail('Expected ":"')
      this.position++
      entries.push([key, this.value(depth + 1)])
      this.skip()
      const next = this.text[this.position]
      if (next === ',') this.position++
      else if (next !== '}') this.fail('Expected "," or "}"')
    }
    // fromEntries defines own properties, so a "__proto__" key stays inert data.
    return Object.fromEntries(entries)
  }

  key(): string {
    const char = this.text[this.position]
    if (char === '"' || char === "'") return this.string()
    IDENTIFIER.lastIndex = this.position
    const word = IDENTIFIER.exec(this.text)?.[0]
    if (word) { this.position += word.length; return word }
    NUMBER.lastIndex = this.position
    const number = NUMBER.exec(this.text)?.[0]
    if (number) { this.position += number.length; return String(Number(number)) }
    return this.fail('Expected a property name')
  }

  array(depth: number) {
    this.position++
    const items: Literal[] = []
    for (;;) {
      this.skip()
      if (this.text[this.position] === ']') { this.position++; break }
      items.push(this.value(depth + 1))
      this.skip()
      const next = this.text[this.position]
      if (next === ',') this.position++
      else if (next !== ']') this.fail('Expected "," or "]"')
    }
    return items
  }

  string(): string {
    const quote = this.text[this.position++]
    const result: string[] = []
    const boundary = quote === "'" ? /['\\\n]/g : /["\\\n]/g
    for (;;) {
      // Scan each run once, including escape-heavy input and large base64 payloads.
      boundary.lastIndex = this.position
      const match = boundary.exec(this.text)
      if (!match || match[0] === '\n') this.fail('Unterminated string')
      result.push(this.text.slice(this.position, match.index))
      this.position = match.index + 1
      if (match[0] === quote) return result.join('')
      const code = this.text[this.position++]
      if (code === 'u' || code === 'x') {
        const length = code === 'u' ? 4 : 2
        const hex = this.text.slice(this.position, this.position + length)
        if (!new RegExp(`^[\\da-fA-F]{${length}}$`).test(hex)) this.fail('Invalid escape')
        result.push(String.fromCharCode(parseInt(hex, 16)))
        this.position += length
      } else if (code === '\n') {
        // Line continuation.
      } else result.push(ESCAPES[code] ?? code)
    }
  }
}

/** Parse a preset file's text into its zones. Throws on anything that is not plain data. */
export function parseSoundfontPreset(text: string): SoundfontZone[] {
  const assignment = /\bvar\s+[A-Za-z_$][\w$]*\s*=\s*/.exec(text)
  if (!assignment) throw new SoundfontParseError('No preset assignment found')
  const parser = new LiteralParser(text)
  parser.position = assignment.index + assignment[0].length
  parser.skip()
  if (text[parser.position] !== '{') parser.fail('Preset must be an object')
  const preset = parser.value()
  parser.skip()
  if (text[parser.position] === ';') parser.position++
  parser.skip()
  if (parser.position !== text.length) parser.fail('Unexpected text after the preset')
  const zones = Array.isArray(preset) ? preset : (preset as { zones?: Literal }).zones
  if (!Array.isArray(zones) || !zones.length) throw new SoundfontParseError('Preset has no zones')
  return zones.map((zone, index) => validateZone(zone, index))
}

const REQUIRED_FIELDS = new Set(['originalPitch', 'keyRangeLow', 'keyRangeHigh', 'sampleRate'])
const NUMERIC_FIELDS = ['originalPitch', 'coarseTune', 'fineTune', 'keyRangeLow', 'keyRangeHigh',
  'sampleRate', 'loopStart', 'loopEnd'] as const

function validateZone(zone: Literal, index: number): SoundfontZone {
  if (!zone || typeof zone !== 'object' || Array.isArray(zone)) throw new SoundfontParseError(`Zone ${index} is not an object`)
  const result = {} as SoundfontZone
  for (const field of NUMERIC_FIELDS) {
    const value = zone[field] ?? (REQUIRED_FIELDS.has(field) ? undefined : 0)
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new SoundfontParseError(`Zone ${index} has an invalid ${field}`)
    result[field] = value
  }
  if (typeof zone.file === 'string' && zone.file) result.file = zone.file
  else if (typeof zone.sample === 'string' && zone.sample) result.sample = zone.sample
  else throw new SoundfontParseError(`Zone ${index} has no audio`)
  return result
}
