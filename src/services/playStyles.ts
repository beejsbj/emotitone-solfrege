export const PLAY_STYLE_OPTIONS = [
  { value: 'together', label: 'Together' },
  { value: 'strum-up', label: 'Strum ↑' },
  { value: 'strum-down', label: 'Strum ↓' },
  { value: 'arp-up', label: 'Arp ↑' },
  { value: 'arp-up-down', label: 'Arp ↕' },
  { value: 'repeat', label: 'Repeat' },
] as const

export type PlayStyle = (typeof PLAY_STYLE_OPTIONS)[number]['value']
export type PlayStyleRate = 4 | 8 | 16

export interface PlayModeOption {
  value: string
  label: string
  style: PlayStyle
  rate?: PlayStyleRate
}

// One selector includes each rhythmic style's rate; sustained styles only
// need one position. The engine retains independent style/rate parameters.
export const PLAY_MODE_OPTIONS = PLAY_STYLE_OPTIONS.flatMap<PlayModeOption>((option) =>
  option.value.startsWith('arp-') || option.value === 'repeat'
    ? ([4, 8, 16] as const).map(rate => ({
      value: `${option.value}:${rate}`,
      label: `${option.label}\n1/${rate}`,
      style: option.value,
      rate,
    }))
    : [{ ...option, style: option.value }],
)

export function playModeValue(style: PlayStyle, rate: PlayStyleRate): string {
  return style.startsWith('arp-') || style === 'repeat' ? `${style}:${rate}` : style
}

export interface PlayStyleVoice {
  // An earlier release must replace any previously scheduled release, and a
  // release before onset must cancel that onset entirely.
  release(at: number): void
}

interface PlayStyleConfig {
  style: PlayStyle
  bpm: number
  rate: PlayStyleRate
}

interface HeldNote<T> {
  pitch: number
  value: T
}

interface OwnedNote<T> extends HeldNote<T> {
  owner: string
}

interface PlayingVoice {
  voice: PlayStyleVoice
  owners: Set<string>
  pitch: number
  releaseAt: number
}

const TICK_MS = 20
const LOOKAHEAD_MS = 50
const STRUM_MS = 35
const GATE = 0.8

/** Transform held inputs into timestamped output voices. All times are ms on
 * deps.now's monotonic audio clock; adapters schedule sound and recording alike.
 */
export function createPlayStyleEngine<T>(deps: {
  now(): number
  start(value: T, at: number, style: PlayStyle): PlayStyleVoice
}) {
  let config: PlayStyleConfig = { style: 'together', bpm: 120, rate: 8 }
  const held = new Map<string, readonly HeldNote<T>[]>()
  const playing = new Set<PlayingVoice>()
  let batchTimer: ReturnType<typeof setTimeout> | undefined
  let tickTimer: ReturnType<typeof setTimeout> | undefined
  let strumBatch: OwnedNote<T>[] = []
  let strumQueue: (OwnedNote<T> & { at: number })[] = []
  let nextAt: number | undefined
  let stepIndex = 0

  const isRhythmic = () => config.style.startsWith('arp-') || config.style === 'repeat'
  const stepMs = () => 60_000 / config.bpm * 4 / config.rate

  function pool() {
    const pitches = new Map<number, { note: HeldNote<T>; owners: Set<string> }>()
    for (const [owner, notes] of held) {
      for (const note of notes) {
        const existing = pitches.get(note.pitch)
        if (existing) existing.owners.add(owner)
        else pitches.set(note.pitch, { note, owners: new Set([owner]) })
      }
    }
    return [...pitches.values()].sort((a, b) => a.note.pitch - b.note.pitch)
  }

  function start(note: HeldNote<T>, owners: Set<string>, at: number, duration?: number) {
    const voice = deps.start(note.value, at, config.style)
    const releaseAt = duration === undefined ? Infinity : at + duration
    playing.add({ voice, owners: new Set(owners), pitch: note.pitch, releaseAt })
    if (duration !== undefined) voice.release(releaseAt)
  }

  function cancelOutput() {
    if (batchTimer !== undefined) clearTimeout(batchTimer)
    if (tickTimer !== undefined) clearTimeout(tickTimer)
    batchTimer = undefined
    tickTimer = undefined
    strumBatch = []
    strumQueue = []
    nextAt = undefined
    stepIndex = 0
    const now = deps.now()
    for (const item of playing) {
      if (item.releaseAt > now) item.voice.release(now)
    }
    playing.clear()
  }

  function tick() {
    if (tickTimer !== undefined) clearTimeout(tickTimer)
    tickTimer = undefined
    const now = deps.now()
    const horizon = now + LOOKAHEAD_MS
    for (const item of playing) {
      if (item.releaseAt <= now) playing.delete(item)
    }
    while (strumQueue.length && strumQueue[0].at <= horizon) {
      const note = strumQueue.shift()!
      if (held.has(note.owner)) start(note, new Set([note.owner]), Math.max(now, note.at))
    }
    if (isRhythmic() && held.size) {
      const notes = pool()
      const interval = stepMs()
      nextAt ??= now
      // Keep the musical grid after a suspended/background timer, dropping
      // missed pulses instead of emitting them all on resume.
      if (nextAt < now) {
        const missed = Math.ceil((now - nextAt) / interval)
        nextAt += missed * interval
        stepIndex += missed
      }
      while (notes.length && nextAt <= horizon) {
        if (config.style === 'repeat') {
          for (const { note, owners } of notes) start(note, owners, nextAt, interval * GATE)
        } else {
          const cycle = config.style === 'arp-up-down' && notes.length > 1
            ? 2 * notes.length - 2 : notes.length
          const position = stepIndex % cycle
          const index = position < notes.length ? position : cycle - position
          const { note, owners } = notes[index]
          start(note, owners, nextAt, interval * GATE)
        }
        stepIndex += 1
        nextAt += interval
      }
    }
    if (strumQueue.length || (isRhythmic() && held.size)) {
      tickTimer = setTimeout(tick, TICK_MS)
    }
  }

  function batch() {
    if (batchTimer !== undefined) return
    // Same-turn individual key presses form a chord before choosing the first
    // arp note or the direction of a strum.
    batchTimer = setTimeout(() => {
      batchTimer = undefined
      if (strumBatch.length) {
        const direction = config.style === 'strum-down' ? -1 : 1
        const now = deps.now()
        strumBatch.sort((a, b) => direction * (a.pitch - b.pitch))
        strumQueue.push(...strumBatch.map((note, i) => ({ ...note, at: now + i * STRUM_MS })))
        strumQueue.sort((a, b) => a.at - b.at)
        strumBatch = []
      }
      tick()
    }, 0)
  }

  function addOutput(owner: string, notes: readonly HeldNote<T>[]) {
    if (config.style === 'together') {
      const now = deps.now()
      for (const note of notes) start(note, new Set([owner]), now)
    } else if (config.style.startsWith('strum-')) {
      strumBatch.push(...notes.map(note => ({ ...note, owner })))
      batch()
    } else {
      // A second owner of a unison keeps an already sounding pulse alive.
      for (const item of playing) {
        if (notes.some(note => note.pitch === item.pitch)) item.owners.add(owner)
      }
      if (nextAt === undefined) batch()
    }
  }

  function release(owner: string) {
    held.delete(owner)
    strumBatch = strumBatch.filter(note => note.owner !== owner)
    strumQueue = strumQueue.filter(note => note.owner !== owner)
    const now = deps.now()
    for (const item of playing) {
      item.owners.delete(owner)
      if (!item.owners.size) {
        if (item.releaseAt > now) item.voice.release(now)
        playing.delete(item)
      }
    }
    if (!held.size) cancelOutput()
  }

  return {
    press(owner: string, notes: readonly HeldNote<T>[]) {
      if (held.has(owner)) release(owner)
      if (!notes.length) return
      held.set(owner, [...notes])
      addOutput(owner, notes)
    },
    release,
    clear() {
      held.clear()
      cancelOutput()
    },
    configure(update: Partial<PlayStyleConfig>) {
      const next = { ...config, ...update }
      if (!Number.isFinite(next.bpm) || next.bpm <= 0) return
      if (![4, 8, 16].includes(next.rate)) return
      if (!PLAY_STYLE_OPTIONS.some(option => option.value === next.style)) return
      if (next.style === config.style && next.bpm === config.bpm && next.rate === config.rate) return
      // Tempo and pulse division have no bearing on an already held chord or
      // a fixed-spread strum. Keep those voices and pending strums intact.
      if (next.style === config.style && !isRhythmic()) {
        config = next
        return
      }
      cancelOutput()
      config = next
      for (const [owner, notes] of held) addOutput(owner, notes)
    },
  }
}
