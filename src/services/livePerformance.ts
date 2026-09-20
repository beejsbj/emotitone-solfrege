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
  const owners = new Map<string, { ownerId: string; metadata: T; renderer: LiveRenderer; held: boolean }>()
  const currentOwners = new Map<string, string>()
  let ownerSerial = 0
  let closed = false
  const active = new Map<string, LiveVoiceEvent>()
  const plans = new Map<string, LiveVoiceEvent>()
  // A plan is already a MIDI submission. Keep its receipt until the matching
  // audio lifecycle arrives, even as newer plan snapshots drop elapsed edges.
  const mirrored = new Map<string, LiveVoiceEvent>()
  const key = (event: LiveVoiceEvent) => `${event.noteId}:${event.phase}`
  const same = (a: LiveVoiceEvent | undefined, b: LiveVoiceEvent) => a?.at === b.at && a.pitch === b.pitch
    && a.instrumentId === b.instrumentId && a.ownerId === b.ownerId && a.style === b.style
  function mirror(event: LiveVoiceEvent, phase = event.phase as 'attack' | 'release' | 'cancel') {
    const owner = owners.get(event.ownerId)
    if (owner) callbacks.onMirror({ ...event, ownerId: owner.ownerId }, owner.metadata, phase)
  }
  function cancel(event: LiveVoiceEvent, at = callbacks.now()) {
    mirror({ ...event, at }, 'cancel')
    mirrored.delete(`${event.noteId}:attack`)
    mirrored.delete(`${event.noteId}:release`)
  }
  function submit(event: LiveVoiceEvent) {
    if (same(mirrored.get(key(event)), event)) return
    mirror(event)
    mirrored.set(key(event), event)
  }
  function close(boundary?: LiveClockBoundary) {
    closed = true
    const at = boundary?.audioTime ?? callbacks.now()
    const cancelled = new Set<string>()
    for (const event of [...plans.values(), ...active.values()]) {
      if (!cancelled.has(event.noteId)) cancel(event, at)
      cancelled.add(event.noteId)
    }
    for (const event of active.values()) {
      const ended = { ...event, phase: 'release' as const, at }
      const owner = owners.get(event.ownerId)
      if (owner) callbacks.onEvent({ ...ended, ownerId: owner.ownerId }, owner.metadata, boundary)
    }
    active.clear()
    plans.clear()
    mirrored.clear()
    for (const ownerId of currentOwners.keys()) callbacks.onOwnerClosed(ownerId)
    currentOwners.clear()
    owners.clear()
  }
  const unsubscribe = subscribeLivePlayback({
    onEvent(event) {
      const owner = owners.get(event.ownerId)
      if (!owner) return
      submit(event)
      plans.delete(key(event))
      if (event.phase === 'attack') active.set(event.noteId, event)
      else {
        active.delete(event.noteId)
        mirrored.delete(`${event.noteId}:attack`)
        mirrored.delete(`${event.noteId}:release`)
      }
      callbacks.onEvent({ ...event, ownerId: owner.ownerId }, owner.metadata)
    },
    onPlan(events) {
      const next = new Map(events.filter(event => owners.has(event.ownerId))
        .map(event => [key(event), event]))
      for (const [id, old] of plans) {
        // Both renderers deliver elapsed lifecycle before the snapshot that
        // drops it (the worklet uses one FIFO port). A missing, still-inactive
        // attack therefore represents cancellation, even after a UI stall.
        if (old.phase === 'attack' && !active.has(old.noteId) && (!next.has(id) || !same(old, next.get(id)!))) {
          cancel(old)
        }
      }
      for (const event of next.values()) submit(event)
      plans.clear()
      next.forEach((event, id) => plans.set(id, event))
    },
    onOwnerEnded(rendererOwnerId) {
      const owner = owners.get(rendererOwnerId)
      if (!owner) return
      owners.delete(rendererOwnerId)
      if (currentOwners.get(owner.ownerId) === rendererOwnerId) currentOwners.delete(owner.ownerId)
      for (const [id, event] of mirrored) if (event.ownerId === rendererOwnerId) mirrored.delete(id)
    },
    onError(error) { close(); callbacks.onError(error) },
  })
  function release(ownerId: string) {
    const rendererOwnerId = currentOwners.get(ownerId)
    const owner = rendererOwnerId === undefined ? undefined : owners.get(rendererOwnerId)
    if (!owner) return false
    owner.held = false
    owner.renderer.release(rendererOwnerId!)
    return true
  }
  function releaseAll() {
    for (const owner of owners.values()) if (owner.held) release(owner.ownerId)
  }
  return {
    press(ownerId: string, notes: LiveInputNote[], metadata: T, renderer: LiveRenderer, config: LiveConfig) {
      // A reused physical owner can still have delayed events from its last
      // press. Keep that lifetime and metadata separate from its successor.
      const previous = currentOwners.get(ownerId)
      const rendererOwnerId = closed || previous !== undefined || owners.has(ownerId) ? `${ownerId}:performance-${++ownerSerial}` : ownerId
      if (previous !== undefined && owners.get(previous)?.held) release(ownerId)
      // Native renderers can emit synchronously from press/configure.
      owners.set(rendererOwnerId, { ownerId, metadata, renderer, held: true })
      currentOwners.set(ownerId, rendererOwnerId)
      renderer.configure(config)
      renderer.press(rendererOwnerId, notes)
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
