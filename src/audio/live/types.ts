import type { LiveConfig, LiveExpressionOwner, LiveInputNote, LiveRenderer, LiveVoiceEvent } from '../liveRenderer'
export type { LiveConfig, LiveInputNote, LiveVoiceEvent } from '../liveRenderer'

export interface LiveEnvelope {
  gain: number
  attack: number
  decay: number
  sustain: number
  release: number
}

/** Shape-tab envelope edits; an omitted stage keeps the prepared articulation. */
export interface LiveEnvelopeOverride {
  attack?: number
  release?: number
}

export interface LiveSampleZone {
  id: string
  rootMidi: number
  lowMidi?: number
  highMidi?: number
  sampleRate: number
  channels: Float32Array[]
  /** Optional low-pass pyramid; each successive level halves the source rate. */
  mipmaps?: Float32Array[][]
  loopStartFrame?: number
  loopEndFrame?: number
}

export type PreparedLiveInstrument = LiveEnvelope & { instrumentId: string } & (
  | { kind: 'sample-bank'; zoneSelection: 'first-range' | 'nearest-root'; zones: LiveSampleZone[] }
  | { kind: 'oscillator'; waveform: 'sine' | 'triangle' | 'sawtooth' | 'square' }
)

export type LiveCommand =
  | { type: 'prepare'; requestId: number; instrument: PreparedLiveInstrument }
  | { type: 'forget'; requestId: number; instrumentId: string; instant: boolean }
  | { type: 'press'; ownerId: string; notes: LiveInputNote[] }
  | { type: 'pitch-bend'; ownerId: string; cents: number }
  | { type: 'gain-expression'; ownerId: string; gain: number }
  | { type: 'release'; ownerId: string }
  | { type: 'configure'; config: Partial<LiveConfig> }
  | { type: 'shape'; envelope: LiveEnvelopeOverride }
  | { type: 'clear' }

export type LiveResponse =
  | { type: 'prepared'; requestId: number }
  | { type: 'forgotten'; requestId: number }
  | { type: 'owner-ended'; ownerId: string }
  | ({ type: 'expression-owner' } & LiveExpressionOwner)
  | { type: 'event'; event: LiveVoiceEvent }
  | { type: 'plan'; events: LiveVoiceEvent[] }

export interface LiveWorklet extends LiveRenderer {
  prepare(instrument: PreparedLiveInstrument): Promise<void>
  shape(envelope: LiveEnvelopeOverride): void
}
