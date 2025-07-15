import { beforeEach, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { createTestWrapper } from '../helpers/test-utils'
import { mockAudioContextMethods, resetAudioMocks } from '../helpers/audio-mocks'
import '../helpers/setup-dom'

// Global setup for E2E tests
beforeAll(() => {
  // Mock Web Audio API
  global.AudioContext = vi.fn().mockImplementation(() => ({
    ...mockAudioContextMethods,
    state: 'suspended',
    sampleRate: 44100,
    currentTime: 0,
    listener: {},
    destination: {
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
    },
  }))

  // Mock Canvas API
  global.HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
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
    strokeText: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    canvas: {
      width: 800,
      height: 600,
    },
  })

  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn((callback) => {
    callback(0)
    return 0
  })

  // Mock cancelAnimationFrame
  global.cancelAnimationFrame = vi.fn()

  // Mock resize observer
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))

  // Mock intersection observer
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))

  // Mock performance API
  global.performance = {
    ...global.performance,
    now: vi.fn(() => Date.now()),
  }

  // Mock navigator.vibrate for haptic feedback
  Object.defineProperty(navigator, 'vibrate', {
    value: vi.fn(),
    writable: true,
  })

  // Set up viewport dimensions
  Object.defineProperty(window, 'innerWidth', {
    value: 375,
    writable: true,
  })
  Object.defineProperty(window, 'innerHeight', {
    value: 667,
    writable: true,
  })
})

beforeEach(() => {
  resetAudioMocks()
  vi.clearAllTimers()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.clearAllMocks()
})

afterAll(() => {
  vi.restoreAllMocks()
})

// Helper functions for E2E tests
export async function simulateUserInteraction(wrapper: any) {
  // Simulate user gesture to activate audio context
  const audioContext = new AudioContext()
  Object.defineProperty(audioContext, 'state', {
    value: 'running',
    writable: true,
  })
  
  // Simulate a click or touch event
  await wrapper.trigger('click')
  await wrapper.vm.$nextTick()
}

export async function waitForAudioLoad(ms = 100) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

export async function waitForAnimation(ms = 500) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

export function mockTouchEvent(element: HTMLElement, type: string, touches: any[]) {
  const event = new TouchEvent(type, {
    touches,
    targetTouches: touches,
    changedTouches: touches,
    bubbles: true,
    cancelable: true,
  })
  element.dispatchEvent(event)
}

export function mockMouseEvent(element: HTMLElement, type: string, options: any = {}) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: options.clientX || 0,
    clientY: options.clientY || 0,
    ...options,
  })
  element.dispatchEvent(event)
}