import type { PlayStyle, PlayStyleRate } from '../../services/playStyles'

export interface LiveEnvelope {
  gain: number
  attack: number
  decay: number
  sustain: number
  release: number
}

export interface LiveSampleZone {
  id: string
  rootMidi: number
  lowMidi?: number
  highMidi?: number
  sampleRate: number
  channels: Float32Array[]
  loopStartFrame?: number
  loopEndFrame?: number
}

export type PreparedLiveInstrument = LiveEnvelope & { instrumentId: string } & (
  | { kind: 'sample-bank'; zoneSelection: 'first-range' | 'nearest-root'; zones: LiveSampleZone[] }
  | { kind: 'oscillator'; waveform: 'sine' | 'triangle' | 'sawtooth' | 'square' }
)

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

export type LiveCommand =
  | { type: 'prepare'; requestId: number; instrument: PreparedLiveInstrument }
  | { type: 'forget'; instrumentId: string }
  | { type: 'press'; ownerId: string; notes: LiveInputNote[] }
  | { type: 'release'; ownerId: string }
  | { type: 'configure'; config: Partial<LiveConfig> }
  | { type: 'clear' }

export type LiveResponse =
  | { type: 'prepared'; requestId: number }
  | { type: 'owner-ended'; ownerId: string }
  | { type: 'event'; event: LiveVoiceEvent }
  | { type: 'plan'; events: LiveVoiceEvent[] }

export interface LiveWorklet {
  prepare(instrument: PreparedLiveInstrument): Promise<void>
  forget(instrumentId: string): void
  press(ownerId: string, notes: LiveInputNote[]): void
  release(ownerId: string): void
  configure(config: Partial<LiveConfig>): void
  clear(): void
  dispose(): void
}
