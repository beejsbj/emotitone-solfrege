import { vi } from 'vitest'

// Mock Tone.js instruments
export const mockSynth = {
  toDestination: vi.fn().mockReturnThis(),
  triggerAttack: vi.fn(),
  triggerRelease: vi.fn(),
  dispose: vi.fn(),
}

export const mockPolySynth = {
  toDestination: vi.fn().mockReturnThis(),
  triggerAttack: vi.fn(),
  triggerRelease: vi.fn(),
  dispose: vi.fn(),
}

export const mockPlayer = {
  toDestination: vi.fn().mockReturnThis(),
  start: vi.fn(),
  stop: vi.fn(),
  dispose: vi.fn(),
  loaded: true,
}

export const mockTransport = {
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  cancel: vi.fn(),
  bpm: { value: 120 },
  position: '0:0:0',
  state: 'stopped',
}

// Mock audio context
export const mockAudioContextMethods = {
  resume: vi.fn().mockResolvedValue(undefined),
  suspend: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  createOscillator: vi.fn(),
  createGain: vi.fn(),
  createAnalyser: vi.fn(),
  createBiquadFilter: vi.fn(),
  createBuffer: vi.fn(),
  createBufferSource: vi.fn(),
  createChannelMerger: vi.fn(),
  createChannelSplitter: vi.fn(),
  createConvolver: vi.fn(),
  createDelay: vi.fn(),
  createDynamicsCompressor: vi.fn(),
  createScriptProcessor: vi.fn(),
  createWaveShaper: vi.fn(),
  decodeAudioData: vi.fn(),
}

// Helper to reset all audio mocks
export function resetAudioMocks() {
  vi.clearAllMocks()
  mockTransport.bpm.value = 120
  mockTransport.position = '0:0:0'
  mockTransport.state = 'stopped'
}

// Helper to simulate audio context state changes
export function setAudioContextState(state: 'suspended' | 'running' | 'closed') {
  Object.defineProperty(mockAudioContextMethods, 'state', {
    value: state,
    configurable: true,
  })
}

// Helper to simulate instrument loading
export function simulateInstrumentLoad(instrument: any, delay = 0) {
  return new Promise(resolve => {
    setTimeout(() => {
      instrument.loaded = true
      resolve(instrument)
    }, delay)
  })
}