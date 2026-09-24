import type { PlayStyle, PlayStyleRate } from '@/services/playStyles'
import type { LiveArticulation } from '@/services/liveArticulation'

export interface LiveInputNote { pitch: number; instrumentId: string }
export interface LiveConfig { style: PlayStyle; bpm: number; rate: PlayStyleRate }
export interface LiveVoiceEvent extends LiveInputNote {
  phase: 'attack' | 'release'
  noteId: string
  ownerId: string
  style: PlayStyle
  /** Actual voice envelope, including any release override. */
  articulation?: LiveArticulation
  /** Absolute AudioContext time, in seconds. */
  at: number
}
export interface LiveExpressionOwner {
  noteId: string
  ownerId: string
  at: number
  cents: number
  gain: number
}
export interface LiveRendererCallbacks {
  onEvent(event: LiveVoiceEvent): void
  onPlan?(events: LiveVoiceEvent[]): void
  onExpressionOwner?(change: LiveExpressionOwner): void
  onError?(error: Error): void
  onOwnerEnded?(ownerId: string): void
}
/** Prepared renderers accept input synchronously; loading belongs to the manager. */
export interface LiveRenderer {
  forget(instrumentId: string): Promise<void>
  press(ownerId: string, notes: LiveInputNote[]): void
  /** Bounded, per-owner live pitch expression in cents. */
  setPitchBend?(ownerId: string, cents: number): void
  /** Bounded, per-owner live gain expression (1 is neutral). */
  setGain?(ownerId: string, gain: number): void
  release(ownerId: string): void
  configure(config: Partial<LiveConfig>): void
  clear(): void
  dispose(): void
}
