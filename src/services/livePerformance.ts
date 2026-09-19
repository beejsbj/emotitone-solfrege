import type { LiveConfig, LiveInputNote, LiveRenderer, LiveVoiceEvent } from '@/audio/liveRenderer'
import type { LiveClockBoundary } from '@/services/liveAudioClock'
import { subscribeLivePlayback } from '@/services/livePlayback'

/** Owns prepared live input independently of musical state and renderer choice. */
export function createLivePerformance<T>(callbacks: {
  now(): number
  onEvent(event: LiveVoiceEvent, metadata: T, boundary?: LiveClockBoundary): void
  onMirror(event: LiveVoiceEvent, metadata: T, phase: 'attack' | 'release' | 'cancel'): void
  onOwnerClosed(ownerId: string): void
  onError(error: Error): void
}) {
  const owners = new Map<string, { metadata: T; renderer: LiveRenderer; held: boolean }>()
  const active = new Map<string, LiveVoiceEvent>()
  const plans = new Map<string, LiveVoiceEvent>()
  function mirror(event: LiveVoiceEvent, phase = event.phase as 'attack' | 'release' | 'cancel') {
    const owner = owners.get(event.ownerId)
    if (owner) callbacks.onMirror(event, owner.metadata, phase)
  }
  function close(boundary?: LiveClockBoundary) {
    const at = boundary?.audioTime ?? callbacks.now()
    for (const event of plans.values()) mirror({ ...event, at }, 'cancel')
    for (const event of active.values()) {
      const ended = { ...event, phase: 'release' as const, at }
      mirror(ended, 'cancel')
      const owner = owners.get(event.ownerId)
      if (owner) callbacks.onEvent(ended, owner.metadata, boundary)
    }
    active.clear()
    plans.clear()
    for (const owner of owners.keys()) callbacks.onOwnerClosed(owner)
    owners.clear()
  }
  const unsubscribe = subscribeLivePlayback({
    onEvent(event) {
      const owner = owners.get(event.ownerId)
      if (!owner) return
      mirror(event)
      plans.delete(`${event.noteId}:${event.phase}`)
      if (event.phase === 'attack') active.set(event.noteId, event)
      else active.delete(event.noteId)
      callbacks.onEvent(event, owner.metadata)
    },
    onPlan(events) {
      const next = new Map(events.filter(event => owners.has(event.ownerId))
        .map(event => [`${event.noteId}:${event.phase}`, event]))
      for (const [id, old] of plans) {
        if (!next.has(id) && old.phase === 'attack' && !active.has(old.noteId)) {
          mirror({ ...old, at: callbacks.now() }, 'cancel')
        }
      }
      for (const [id, event] of next) if (plans.get(id)?.at !== event.at) mirror(event)
      plans.clear()
      next.forEach((event, id) => plans.set(id, event))
    },
    onOwnerEnded(ownerId) { owners.delete(ownerId) },
    onError(error) { close(); callbacks.onError(error) },
  })
  function release(ownerId: string) {
    const owner = owners.get(ownerId)
    if (!owner) return false
    owner.held = false
    owner.renderer.release(ownerId)
    return true
  }
  function releaseAll() {
    for (const [ownerId, owner] of owners) if (owner.held) release(ownerId)
  }
  return {
    press(ownerId: string, notes: LiveInputNote[], metadata: T, renderer: LiveRenderer, config: LiveConfig) {
      // Native renderers can emit synchronously from press/configure.
      owners.set(ownerId, { metadata, renderer, held: true })
      renderer.configure(config)
      renderer.press(ownerId, notes)
    },
    release,
    releaseAll,
    configure(config: Partial<LiveConfig>) {
      new Set([...owners.values()].map(owner => owner.renderer)).forEach(renderer => renderer.configure(config))
    },
    isActive: (noteId: string) => active.has(noteId),
    close,
    dispose() { releaseAll(); close(); unsubscribe() },
  }
}
