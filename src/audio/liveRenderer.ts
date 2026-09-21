import type { PlayStyle, PlayStyleRate } from '@/services/playStyles'

export interface LiveInputNote { pitch: number; instrumentId: string }
export interface LiveConfig { style: PlayStyle; bpm: number; rate: PlayStyleRate }
export interface LiveVoiceEvent extends LiveInputNote {
  phase: 'attack' | 'release'
  noteId: string
  ownerId: string
  style: PlayStyle
  /** Absolute AudioContext time, in seconds. */
  at: number
}
export interface LiveRendererCallbacks {
  onEvent(event: LiveVoiceEvent): void
  onPlan?(events: LiveVoiceEvent[]): void
  onError?(error: Error): void
  onOwnerEnded?(ownerId: string): void
}
/** Prepared renderers accept input synchronously; loading belongs to the manager. */
export interface LiveRenderer {
  forget(instrumentId: string): Promise<void>
  press(ownerId: string, notes: LiveInputNote[]): void
  /** Bounded, per-owner live pitch expression in cents. */
  setPitchBend?(ownerId: string, cents: number): void
  release(ownerId: string): void
  configure(config: Partial<LiveConfig>): void
  clear(): void
  dispose(): void
}
