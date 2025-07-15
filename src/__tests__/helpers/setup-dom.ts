import { vi } from 'vitest'

// Setup DOM environment before any other imports
if (typeof global !== 'undefined' && !global.document) {
  // Create a minimal document mock
  const documentMock = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    createElement: vi.fn((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          getContext: vi.fn(() => ({
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
          })),
          width: 300,
          height: 150,
          style: {},
        }
      }
      return {
        style: {},
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }
    }),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      style: {},
    },
    head: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    },
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    getElementById: vi.fn(),
    getElementsByClassName: vi.fn(() => []),
    getElementsByTagName: vi.fn(() => []),
  }

  ;(global as any).document = documentMock
  ;(global as any).window = {
    document: documentMock,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    requestAnimationFrame: vi.fn((cb) => setTimeout(cb, 16)),
    cancelAnimationFrame: vi.fn(),
    performance: {
      now: () => Date.now(),
      memory: {
        usedJSHeapSize: 0,
      },
    },
    AudioContext: vi.fn(() => ({
      state: 'running',
      resume: vi.fn().mockResolvedValue(undefined),
      suspend: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      createOscillator: vi.fn(),
      createGain: vi.fn(),
      destination: {},
    })),
    TouchEvent: class TouchEvent extends Event {
      touches: any[]
      targetTouches: any[]
      changedTouches: any[]
      
      constructor(type: string, options: any = {}) {
        super(type, options)
        this.touches = options.touches || []
        this.targetTouches = options.targetTouches || []
        this.changedTouches = options.changedTouches || []
      }
    },
    innerWidth: 1024,
    innerHeight: 768,
    localStorage: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
  }

  // Define HTMLCanvasElement if it doesn't exist
  if (typeof HTMLCanvasElement === 'undefined') {
    ;(global as any).HTMLCanvasElement = class HTMLCanvasElement {
      getContext = vi.fn(() => documentMock.createElement('canvas').getContext())
    }
  }
}