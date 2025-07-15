// Setup DOM before anything else
import './__tests__/helpers/setup-dom'
import { vi } from 'vitest'

// Mock Tone.js
vi.mock('tone', () => ({
  start: vi.fn(),
  Synth: vi.fn(() => ({
    toDestination: vi.fn().mockReturnThis(),
    triggerAttack: vi.fn(),
    triggerRelease: vi.fn(),
    triggerAttackRelease: vi.fn(),
    releaseAll: vi.fn(),
    dispose: vi.fn(),
  })),
  PolySynth: vi.fn(() => ({
    toDestination: vi.fn().mockReturnThis(),
    triggerAttack: vi.fn(),
    triggerRelease: vi.fn(),
    triggerAttackRelease: vi.fn(),
    releaseAll: vi.fn(),
    dispose: vi.fn(),
  })),
  Player: vi.fn(() => ({
    toDestination: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
  })),
  Sequence: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
  })),
  Transport: {
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    cancel: vi.fn(),
    bpm: { value: 120 },
  },
  getTransport: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    cancel: vi.fn(),
    bpm: { value: 120 },
  })),
  context: {
    state: 'running',
    resume: vi.fn(),
  },
  getContext: vi.fn(() => ({
    state: 'running',
    resume: vi.fn(),
  })),
}))

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
Object.defineProperty(window, 'AudioContext', {
  value: vi.fn(() => ({
    state: 'running',
    resume: vi.fn(),
    suspend: vi.fn(),
    close: vi.fn(),
    createOscillator: vi.fn(),
    createGain: vi.fn(),
    destination: {},
  })),
})

// Mock requestAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
  value: vi.fn(cb => setTimeout(cb, 16)),
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

// Mock document
Object.defineProperty(global, 'document', {
  value: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(),
    getElementById: vi.fn(),
    createElement: vi.fn(),
    createEvent: vi.fn(),
    body: {},
    head: {},
  },
})

// Mock performance
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    timing: {},
  },
})

// Mock Audio Service to prevent DOM access during module loading
vi.mock('@/services/audio', () => ({
  AudioService: vi.fn().mockImplementation(() => ({
    playNote: vi.fn().mockResolvedValue('mock-note-id'),
    attackNote: vi.fn().mockResolvedValue('mock-note-id'),
    releaseNote: vi.fn(),
    playNoteWithDuration: vi.fn().mockResolvedValue('mock-note-id'),
    startAudioContext: vi.fn().mockResolvedValue(true),
    isAudioReady: vi.fn().mockReturnValue(true),
    getAudioState: vi.fn().mockReturnValue('running'),
    getActiveNotes: vi.fn().mockReturnValue([]),
    isNoteActive: vi.fn().mockReturnValue(false),
    stop: vi.fn(),
    dispose: vi.fn()
  })),
  audioService: {
    playNote: vi.fn().mockResolvedValue('mock-note-id'),
    attackNote: vi.fn().mockResolvedValue('mock-note-id'),
    releaseNote: vi.fn(),
    playNoteWithDuration: vi.fn().mockResolvedValue('mock-note-id'),
    startAudioContext: vi.fn().mockResolvedValue(true),
    isAudioReady: vi.fn().mockReturnValue(true),
    getAudioState: vi.fn().mockReturnValue('running'),
    getActiveNotes: vi.fn().mockReturnValue([]),
    isNoteActive: vi.fn().mockReturnValue(false),
    stop: vi.fn(),
    dispose: vi.fn()
  }
}))

// Mock Music Service  
vi.mock('@/services/music', () => ({
  musicTheory: {
    getCurrentScale: vi.fn(() => ({
      name: 'Major',
      intervals: [0, 2, 4, 5, 7, 9, 11],
      solfege: [
        { name: 'Do', number: 1, emotion: 'stable', description: 'home', fleckShape: 'circle', texture: 'smooth' },
        { name: 'Re', number: 2, emotion: 'longing', description: 'movement', fleckShape: 'star', texture: 'rough' },
        { name: 'Mi', number: 3, emotion: 'hopeful', description: 'bright', fleckShape: 'diamond', texture: 'crystalline' },
        { name: 'Fa', number: 4, emotion: 'restless', description: 'pull', fleckShape: 'sparkle', texture: 'jagged' },
        { name: 'Sol', number: 5, emotion: 'confident', description: 'dominant', fleckShape: 'circle', texture: 'smooth' },
        { name: 'La', number: 6, emotion: 'yearning', description: 'melancholy', fleckShape: 'star', texture: 'flowing' },
        { name: 'Ti', number: 7, emotion: 'urgent', description: 'leading', fleckShape: 'diamond', texture: 'sharp' }
      ]
    })),
    getCurrentScaleNotes: vi.fn(() => ['C', 'D', 'E', 'F', 'G', 'A', 'B']),
    setCurrentKey: vi.fn(),
    setCurrentMode: vi.fn(),
    getNoteFrequency: vi.fn((index, octave) => 261.63 * Math.pow(2, (index + (octave - 4) * 12) / 12)),
    getNoteName: vi.fn((index, octave) => `${['C', 'D', 'E', 'F', 'G', 'A', 'B'][index]}${octave}`),
    getAllMelodies: vi.fn(() => []),
    getMelodiesByCategory: vi.fn(() => []),
    getMelodicPatterns: vi.fn(() => []),
    searchMelodies: vi.fn(() => []),
    getMelodiesByEmotion: vi.fn(() => []),
    addUserMelody: vi.fn(),
    removeUserMelody: vi.fn()
  },
  CHROMATIC_NOTES: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
}))

// Mock data files
vi.mock('@/data', () => ({
  SEQUENCER_ICONS: ['music', 'piano', 'guitar', 'violin', 'drums', 'trumpet', 'microphone'],
  MAJOR_SOLFEGE: [
    { name: 'Do', number: 1, emotion: 'stable', description: 'home', fleckShape: 'circle', texture: 'smooth' },
    { name: 'Re', number: 2, emotion: 'longing', description: 'movement', fleckShape: 'star', texture: 'rough' }
  ],
  MINOR_SOLFEGE: [
    { name: 'Do', number: 1, emotion: 'stable', description: 'home', fleckShape: 'circle', texture: 'smooth' },
    { name: 'Re', number: 2, emotion: 'longing', description: 'movement', fleckShape: 'star', texture: 'rough' }
  ],
  getAllMelodicPatterns: vi.fn(() => [])
}))

// Mock instrument configurations
vi.mock('@/data/instruments', () => ({
  AVAILABLE_INSTRUMENTS: {
    'piano': {
      id: 'piano',
      displayName: 'Piano',
      category: 'keyboard',
      type: 'sample',
      minify: false
    },
    'synth': {
      id: 'synth',
      displayName: 'Synth',
      category: 'synth',
      type: 'synth'
    }
  },
  DEFAULT_INSTRUMENT: 'piano',
  MAX_POLYPHONY: 8,
  PIANO_ENVELOPE: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.5,
    release: 0.3
  },
  STANDARD_COMPRESSOR: {
    threshold: -24,
    ratio: 4,
    attack: 0.003,
    release: 0.01
  },
  SYNTH_CONFIGS: {
    basic: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.3 }
    }
  },
  getInstrumentsByCategory: vi.fn(() => ({
    keyboard: [{ id: 'piano', displayName: 'Piano' }],
    synth: [{ id: 'synth', displayName: 'Synth' }]
  })),
  getInstrumentConfig: vi.fn(() => ({
    id: 'piano',
    displayName: 'Piano',
    category: 'keyboard'
  }))
}))

// Mock sample library
vi.mock('@/lib/sample-library', () => ({
  loadSampleInstrument: vi.fn().mockResolvedValue({
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn()
  }),
  createSalamanderPiano: vi.fn().mockResolvedValue({
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn()
  })
}))

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

// Mock visual config composable
vi.mock('@/composables/useVisualConfig', () => ({
  DEFAULT_CONFIG: {
    blobs: {
      isEnabled: true,
      baseSizeRatio: 0.15,
      minSize: 50,
      maxSize: 300,
      opacity: 0.3,
      blurRadius: 20,
      oscillationAmplitude: 0.1,
      fadeOutDuration: 2,
      scaleInDuration: 0.5,
      scaleOutDuration: 1,
      driftSpeed: 30,
      vibrationFrequencyDivisor: 4,
      edgeSegments: 12,
      vibrationAmplitude: 0.05,
      glowEnabled: true,
      glowIntensity: 15
    },
    ambient: {
      isEnabled: true,
      opacityMajor: 0.2,
      opacityMinor: 0.15,
      brightnessMajor: 1.2,
      brightnessMinor: 0.8,
      saturationMajor: 0.7,
      saturationMinor: 0.5
    },
    particles: {
      isEnabled: true,
      count: 20,
      sizeMin: 2,
      sizeMax: 8,
      lifetimeMin: 1000,
      lifetimeMax: 3000,
      speed: 100,
      gravity: 0.5,
      airResistance: 0.1
    },
    strings: {
      isEnabled: true,
      count: 7,
      baseOpacity: 0.1,
      activeOpacity: 0.8,
      maxAmplitude: 20,
      dampingFactor: 0.95,
      interpolationSpeed: 0.1,
      opacityInterpolationSpeed: 0.05
    },
    fontOscillation: {
      isEnabled: true,
      sm: { amplitude: 100, baseWeight: 400 },
      md: { amplitude: 200, baseWeight: 500 },
      lg: { amplitude: 300, baseWeight: 600 },
      full: { amplitude: 400, baseWeight: 700 }
    },
    animation: {
      visualFrequencyDivisor: 10,
      frameRate: 60,
      smoothingFactor: 0.1
    },
    frequencyMapping: {
      minFreq: 100,
      maxFreq: 2000,
      minValue: 0,
      maxValue: 1
    },
    dynamicColors: {
      isEnabled: false,
      chromaticMapping: false,
      hueAnimationAmplitude: 30,
      animationSpeed: 1,
      saturation: 0.7,
      baseLightness: 0.5,
      lightnessRange: 0.3
    },
    palette: {
      isEnabled: true,
      gradientDirection: 45,
      useGlassmorphism: true,
      glassmorphOpacity: 0.2
    },
    floatingPopup: {
      isEnabled: true,
      accumulationWindow: 100,
      hideDelay: 2000,
      maxNotes: 5,
      showChord: true,
      showIntervals: true,
      showEmotionalDescription: true,
      backdropBlur: 10,
      glassmorphOpacity: 0.15,
      animationDuration: 300
    }
  }
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
})

// Mock DOM methods needed by audio service
Object.defineProperty(document, 'addEventListener', {
  value: vi.fn(),
  writable: true,
  configurable: true,
})

Object.defineProperty(document, 'removeEventListener', {
  value: vi.fn(),
  writable: true,
  configurable: true,
})

Object.defineProperty(window, 'dispatchEvent', {
  value: vi.fn(),
  writable: true
})