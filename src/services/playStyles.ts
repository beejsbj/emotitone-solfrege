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

interface RhythmicPulse {
  at: number
  step: number
  duration: number
  voices: Map<number, PlayingVoice>
}

const TICK_MS = 20
const LOOKAHEAD_MS = 50
// Queue rhythmic audio far enough ahead to survive rendering delays between
// timer callbacks. This does not delay the first attack, and owner release
// still cancels queued voices before they sound.
const RHYTHMIC_LOOKAHEAD_MS = 150
const CHORD_WINDOW_MS = 30
const STRUM_MS = 35
const GATE = 0.8
// Keep the recurring grid beyond the live adapter's 5 ms preparation lead;
// applying this once here preserves the intended intervals between its notes.
export const PLAY_STYLE_SCHEDULING_LEAD_MS = 20

/** Transform held inputs into timestamped output voices. All times are ms on
 * deps.now's monotonic clock; adapters schedule sound and recording alike.
 */
export function createPlayStyleEngine<T>(deps: {
  now(): number
  start(value: T, at: number, style: PlayStyle): PlayStyleVoice
  schedulingLeadMs?: number
  initialLeadMs?: number
  /** Future audio to queue; independent of the first-note lead. */
  lookaheadMs?: number
}) {
  let config: PlayStyleConfig = { style: 'together', bpm: 120, rate: 8 }
  const held = new Map<string, readonly HeldNote<T>[]>()
  const playing = new Set<PlayingVoice>()
  const pendingPulses = new Set<RhythmicPulse>()
  let batchTimer: ReturnType<typeof setTimeout> | undefined
  let tickTimer: ReturnType<typeof setTimeout> | undefined
  let strumBatch: OwnedNote<T>[] = []
  let strumQueue: (OwnedNote<T> & { at: number })[] = []
  let nextAt: number | undefined
  let stepIndex = 0
  const schedulingLeadMs = Math.max(0, deps.schedulingLeadMs ?? 0)
  const initialLeadMs = Number.isFinite(deps.initialLeadMs)
    ? Math.max(0, deps.initialLeadMs!) : schedulingLeadMs

  const lookaheadMs = Number.isFinite(deps.lookaheadMs)
    ? Math.max(TICK_MS, deps.lookaheadMs!) : RHYTHMIC_LOOKAHEAD_MS

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
    const item = { voice, owners: new Set(owners), pitch: note.pitch, releaseAt }
    playing.add(item)
    if (duration !== undefined) voice.release(releaseAt)
    return item
  }

  function pulseNotes(notes: ReturnType<typeof pool>, step: number) {
    if (config.style === 'repeat' || !notes.length) return notes
    const cycle = config.style === 'arp-up-down' && notes.length > 1
      ? 2 * notes.length - 2 : notes.length
    const position = step % cycle
    const index = position < notes.length ? position : cycle - position
    return [notes[index]]
  }

  function revisePendingPulses() {
    if (!isRhythmic()) return
    const now = deps.now()
    const notes = pool()
    for (const pulse of pendingPulses) {
      // The first attack belongs to the first press, even if a lower key
      // arrives before audio onset. Later pulses use the evolving held chord.
      if (config.style !== 'repeat' && pulse.step === 0
        && [...pulse.voices.values()].some(item => playing.has(item))) continue
      // Close deadlines are already committed to audio. Preserve them rather
      // than canceling a note we cannot safely replace before its onset.
      const lead = pulse.step === 0 ? initialLeadMs : schedulingLeadMs
      if (pulse.at <= now || pulse.at < now + lead) continue
      const desired = pulseNotes(notes, pulse.step)
      const pitches = new Set(desired.map(({ note }) => note.pitch))
      for (const [pitch, item] of pulse.voices) {
        if (!pitches.has(pitch) || !playing.has(item)) {
          if (playing.delete(item)) item.voice.release(now)
          pulse.voices.delete(pitch)
        }
      }
      for (const { note, owners } of desired) {
        const existing = pulse.voices.get(note.pitch)
        if (existing) existing.owners = new Set(owners)
        else pulse.voices.set(note.pitch, start(note, owners, pulse.at, pulse.duration))
      }
    }
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
    pendingPulses.clear()
  }

  function changeRhythm(next: PlayStyleConfig) {
    if (stepMs() === 60_000 / next.bpm * 4 / next.rate) {
      config = next
      return
    }
    const now = deps.now()
    const earliestSafeAt = now + schedulingLeadMs
    const boundary = [...pendingPulses]
      .filter(pulse => pulse.at >= earliestSafeAt)
      .sort((a, b) => a.at - b.at)[0]
    // Keep the next safe pulse on the existing grid, including its pitch and
    // gate. New spacing begins after this musical boundary. Earlier voices
    // (including imminent onsets) are never cut off or retriggered.
    if (boundary) {
      for (const pulse of pendingPulses) {
        if (pulse.at <= boundary.at) continue
        for (const item of pulse.voices.values()) {
          item.voice.release(now)
          playing.delete(item)
        }
        pendingPulses.delete(pulse)
      }
      config = next
      nextAt = boundary.at + stepMs()
      stepIndex = boundary.step + 1
    } else {
      // The boundary may be outside the lookahead, or a stalled timer may
      // have passed it. Advance on the old grid before adopting new spacing.
      const interval = stepMs()
      if (nextAt !== undefined && nextAt < earliestSafeAt) {
        const missed = Math.ceil((earliestSafeAt - nextAt) / interval)
        nextAt += missed * interval
        stepIndex += missed
      }
      config = next
    }
    tick()
  }

  function tick() {
    if (tickTimer !== undefined) clearTimeout(tickTimer)
    tickTimer = undefined
    const now = deps.now()
    const horizon = now + LOOKAHEAD_MS
    for (const item of playing) {
      if (item.releaseAt <= now) playing.delete(item)
    }
    for (const pulse of pendingPulses) {
      if (pulse.at <= now) pendingPulses.delete(pulse)
    }
    // A late callback shifts the remaining tail as one unit. Clamping each
    // overdue note independently would turn a strum into a simultaneous chord.
    if (strumQueue[0]?.at < now + schedulingLeadMs) {
      const shift = now + schedulingLeadMs - strumQueue[0].at
      strumQueue.forEach(note => { note.at += shift })
    }
    while (strumQueue.length && strumQueue[0].at <= horizon) {
      const note = strumQueue.shift()!
      if (held.has(note.owner)) start(note, new Set([note.owner]), note.at)
    }
    if (isRhythmic() && held.size) {
      const notes = pool()
      const interval = stepMs()
      const queuePulse = () => {
        const pulse: RhythmicPulse = { at: nextAt!, step: stepIndex, duration: interval * GATE, voices: new Map() }
        for (const { note, owners } of pulseNotes(notes, stepIndex)) {
          pulse.voices.set(note.pitch, start(note, owners, pulse.at, pulse.duration))
        }
        pendingPulses.add(pulse)
        stepIndex += 1
        nextAt = pulse.at + interval
      }
      // An input-turn attack needs only the adapter's preparation lead. The
      // recurring queue keeps its larger safety margin for timer delivery.
      if (nextAt === undefined) {
        nextAt = now + initialLeadMs
        if (notes.length) queuePulse()
      }
      // Keep the musical grid after a suspended/background timer, dropping
      // missed pulses instead of emitting them all on resume.
      const earliestSafeAt = now + schedulingLeadMs
      if (nextAt < earliestSafeAt) {
        const missed = Math.ceil((earliestSafeAt - nextAt) / interval)
        nextAt += missed * interval
        stepIndex += missed
      }
      while (notes.length && nextAt <= now + lookaheadMs) {
        queuePulse()
      }
    }
    if (strumQueue.length || (isRhythmic() && held.size)) {
      tickTimer = setTimeout(tick, TICK_MS)
    }
  }

  function batch() {
    if (batchTimer !== undefined) return
    // Nearby individual key presses form a chord before choosing the
    // direction of a strum. Keyboard and MIDI note-ons arrive
    // in separate event-loop turns even when the player intends one chord.
    batchTimer = setTimeout(() => {
      batchTimer = undefined
      if (strumBatch.length) {
        const direction = config.style === 'strum-down' ? -1 : 1
        const now = deps.now()
        strumBatch.sort((a, b) => direction * (a.pitch - b.pitch))
        strumQueue.push(...strumBatch.map((note, i) => ({
          ...note,
          at: now + schedulingLeadMs + i * STRUM_MS,
        })))
        strumQueue.sort((a, b) => a.at - b.at)
        strumBatch = []
      }
      tick()
    }, CHORD_WINDOW_MS)
  }

  function addOutput(owner: string, notes: readonly HeldNote<T>[]) {
    if (config.style === 'together') {
      const now = deps.now() + schedulingLeadMs
      for (const note of notes) start(note, new Set([owner]), now)
    } else if (config.style.startsWith('strum-')) {
      strumBatch.push(...notes.map(note => ({ ...note, owner })))
      batch()
    } else {
      // A second owner of a unison keeps an already sounding pulse alive.
      for (const item of playing) {
        if (notes.some(note => note.pitch === item.pitch)) item.owners.add(owner)
      }
      if (nextAt === undefined) tick()
      else revisePendingPulses()
    }
  }

  function release(owner: string) {
    held.delete(owner)
    strumBatch = strumBatch.filter(note => note.owner !== owner)
    strumQueue = strumQueue.filter(note => note.owner !== owner)
    const now = deps.now()
    // An imminent arpeggio slot cannot be replaced within the adapter's setup
    // margin. Let its prepared attack finish its gate while the chord remains
    // held; cancelOutput still stops it when the final input lets go.
    const committed = new Set<PlayingVoice>()
    if (held.size && config.style.startsWith('arp-')) {
      for (const pulse of pendingPulses) {
        const lead = pulse.step === 0 ? initialLeadMs : schedulingLeadMs
        if (pulse.at > now && pulse.at < now + lead) {
          pulse.voices.forEach(item => committed.add(item))
        }
      }
    }
    for (const item of playing) {
      if (!item.owners.delete(owner)) continue
      if (!item.owners.size) {
        if (committed.has(item)) continue
        if (item.releaseAt > now) item.voice.release(now)
        playing.delete(item)
      }
    }
    if (!held.size) cancelOutput()
    else revisePendingPulses()
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
      if (next.style === config.style) {
        changeRhythm(next)
        return
      }
      cancelOutput()
      config = next
      for (const [owner, notes] of held) addOutput(owner, notes)
    },
  }
}
