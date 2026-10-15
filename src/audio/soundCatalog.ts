/**
 * The app's own instrument catalog: sound name → kind → where its data lives.
 * It replaces superdough's sound registry as the source for loading sampled
 * and soundfont instruments into the live worklet. Synths are rendered without
 * data and are listed by the audio service, not here.
 */

/** Note-keyed banks map a note name to its sample URLs; array banks are unpitched lists. */
export type SampleBank = string[] | Record<string, string[]>

export type CatalogSound =
  | { kind: 'sample'; bank: SampleBank }
  | { kind: 'soundfont'; fonts: readonly string[] }

export interface SampleZoneSource {
  rootMidi: number
  url: string
}

/** A dough-samples style map: `{ _base?, name: url | url[] | { note: url | url[] } }`. */
export type SampleMap = Record<string, unknown>

const sounds = new Map<string, CatalogSound>()

export function getCatalogSound(name: string): CatalogSound | undefined {
  return sounds.get(name.toLowerCase())
}

export function catalogSoundNames(): string[] {
  return [...sounds.keys()].filter(name => !name.startsWith('_'))
}

export function clearSoundCatalog(): void {
  sounds.clear()
}

/** Register every bank of a sample map, resolving URLs against its `_base` like superdough's `samples()`. */
export function registerSampleMap(map: SampleMap, baseUrl = typeof map._base === 'string' ? map._base : ''): string[] {
  const registered: string[] = []
  for (const [key, raw] of Object.entries(map)) {
    if (key.startsWith('_')) continue
    const value = typeof raw === 'string' ? [raw] : raw
    if (!value || typeof value !== 'object') throw new Error(`Wrong sample map format for ${key}`)
    const base = typeof (value as { _base?: unknown })._base === 'string' ? (value as { _base: string })._base : baseUrl
    const full = (path: unknown) => {
      if (typeof path !== 'string') throw new Error(`Wrong sample map format for ${key}`)
      return base + path
    }
    const bank: SampleBank = Array.isArray(value)
      ? value.map(full)
      : Object.fromEntries(Object.entries(value).filter(([note]) => !note.startsWith('_'))
        .map(([note, paths]) => [note, (typeof paths === 'string' ? [paths] : paths as unknown[]).map(full)]))
    sounds.set(key.toLowerCase(), { kind: 'sample', bank })
    registered.push(key)
  }
  return registered
}

export function registerSoundfonts(fonts: Readonly<Record<string, readonly string[]>>): void {
  for (const [name, list] of Object.entries(fonts)) sounds.set(name.toLowerCase(), { kind: 'soundfont', fonts: list })
}

const CHROMA: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }
const ACCIDENTAL: Record<string, number> = { '#': 1, b: -1, s: 1, f: -1 }

/** superdough's sample-key pitch parser: `C4`, `Ds1`, `Bb2`; a missing octave means 3. */
export function sampleKeyToMidi(key: string): number {
  const match = /^([a-gA-G])([#bsf]*)(-?[0-9]*)$/.exec(key)
  if (!match) throw new Error(`Not a note: "${key}"`)
  const [, pitchClass, accidentals, octave] = match
  const offset = [...accidentals].reduce((sum, char) => sum + ACCIDENTAL[char], 0)
  return (Number(octave || 3) + 1) * 12 + CHROMA[pitchClass.toLowerCase()] + offset
}

/**
 * The zones the live sampler plays, chosen as superdough chooses with n = 0:
 * an array bank is one zone of its first sample at root MIDI 36; a keyed bank
 * is one zone per note key (first sample), rooted at that note, in insertion order.
 */
export function sampleZoneSources(bank: SampleBank): SampleZoneSource[] {
  if (Array.isArray(bank)) return bank.length ? [{ rootMidi: 36, url: bank[0] }] : []
  return Object.entries(bank).filter(([key, urls]) => !key.startsWith('_') && urls.length)
    .map(([key, urls]) => ({ rootMidi: sampleKeyToMidi(key), url: urls[0] }))
}
