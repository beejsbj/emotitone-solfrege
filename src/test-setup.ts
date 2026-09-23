// Browser-only shims and external-effect mocks. Pure logic tests use no setup.
import { vi } from 'vitest'

// Mock GSAP
vi.mock('gsap', () => ({
  default: {
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      play: vi.fn(),
      pause: vi.fn(),
      kill: vi.fn(),
    })),
    to: vi.fn(),
    from: vi.fn(),
    set: vi.fn(),
    killTweensOf: vi.fn(),
  },
}))

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  clip: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
}))

// Mock Web Audio API
class MockBaseAudioContext {}

const MockAudioContext = vi.fn(() => ({
  state: 'running',
  resume: vi.fn(),
  suspend: vi.fn(),
  close: vi.fn(),
  createOscillator: vi.fn(),
  createGain: vi.fn(),
  destination: {},
}))

Object.defineProperty(globalThis, 'BaseAudioContext', {
  value: MockBaseAudioContext,
  writable: true,
  configurable: true,
})

Object.defineProperty(window, 'BaseAudioContext', {
  value: MockBaseAudioContext,
  writable: true,
  configurable: true,
})

Object.defineProperty(globalThis, 'AudioContext', {
  value: MockAudioContext,
  writable: true,
  configurable: true,
})

Object.defineProperty(window, 'AudioContext', {
  value: MockAudioContext,
  writable: true,
  configurable: true,
})

// Mock Touch Events
Object.defineProperty(window, 'TouchEvent', {
  value: class TouchEvent extends Event {
    constructor(type: string, options: any = {}) {
      super(type, options)
      this.touches = options.touches || []
      this.targetTouches = options.targetTouches || []
      this.changedTouches = options.changedTouches || []
    }
  },
})

// Mock localStorage with realistic behavior
const localStorageMock = {
  store: new Map<string, string>(),
  getItem: vi.fn((key: string) => localStorageMock.store.get(key) || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    localStorageMock.store.delete(key);
  }),
  clear: vi.fn(() => {
    localStorageMock.store.clear();
  }),
  length: 0,
  key: vi.fn((index: number) => {
    const keys = Array.from(localStorageMock.store.keys());
    return keys[index] || null;
  }),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// Also add to global for environments that don't have window
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// Mock performance
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    timing: {},
  },
  writable: true,
  configurable: true,
})

// Mock toast notifications
vi.mock('vue-sonner', () => ({
  toast: {
    loading: vi.fn().mockReturnValue('loading-toast-id'),
    dismiss: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }
}))

vi.mock('@/services/superdoughAudio', () => ({
  initSuperdoughAudio: vi.fn().mockResolvedValue(undefined),
  prewarmSoundSamples: vi.fn().mockResolvedValue(undefined),
  isPrewarmed: vi.fn().mockReturnValue(true),
  attackNote: vi.fn().mockResolvedValue(undefined),
  releaseNote: vi.fn(),
  stopNote: vi.fn(),
  playNoteWithDuration: vi.fn().mockResolvedValue(undefined),
  releaseAll: vi.fn(),
  getAudioContext: vi.fn(() => ({
    currentTime: 0,
    state: 'running',
    resume: vi.fn().mockResolvedValue(undefined),
  })),
  getSuperdoughMasterGain: vi.fn().mockReturnValue(null),
  getRegisteredSounds: vi.fn().mockReturnValue(['piano', 'triangle']),
  stopStrudelVisuals: vi.fn(),
  emotitoneStrudelOutput: vi.fn().mockResolvedValue(undefined),
  playStrudelCode: vi.fn().mockResolvedValue(undefined),
  stopStrudelPlayback: vi.fn(),
}))
