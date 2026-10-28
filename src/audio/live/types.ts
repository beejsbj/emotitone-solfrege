import type { LiveShaping } from '../liveShaping'
import type { LiveConfig, LiveExpressionOwner, LiveInputNote, LiveRenderer, LiveVoiceEvent } from '../liveRenderer'
import type { TransportCommand, TransportResponse } from './transport'
import type { RenderCostCommand, RenderCostResponse, RenderCostSnapshot } from './renderCost'
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
  | { type: 'release'; ownerId: string; cancel?: boolean }
  | { type: 'configure'; config: Partial<LiveConfig> }
  | { type: 'effects'; shaping: LiveShaping }
  | { type: 'shape'; envelope: LiveEnvelopeOverride }
  | { type: 'clear' }
  | TransportCommand

export type LiveResponse =
  | { type: 'disposed' }
  | { type: 'prepared'; requestId: number }
  | { type: 'forgotten'; requestId: number }
  | { type: 'owner-ended'; ownerId: string }
  | ({ type: 'expression-owner' } & LiveExpressionOwner)
  | { type: 'event'; event: LiveVoiceEvent }
  | { type: 'plan'; events: LiveVoiceEvent[] }
  | TransportResponse
  | RenderCostResponse

/** Terminal processor command: release its banks and stop rendering. A render-cost read never reaches the core. */
export type LiveProcessorCommand = LiveCommand | { type: 'dispose' } | RenderCostCommand

export interface LiveWorklet extends LiveRenderer {
  prepare(instrument: PreparedLiveInstrument): Promise<void>
  shape(envelope: LiveEnvelopeOverride): void
  effects(shaping: LiveShaping): void
  /** Pattern transport commands; responses arrive through `onTransport`. */
  transport(command: TransportCommand): void
  /** Read the processor's render cost per quantum (starts measuring on the first read); `reset` starts a new window. */
  renderCost(reset?: boolean): Promise<RenderCostSnapshot>
}
