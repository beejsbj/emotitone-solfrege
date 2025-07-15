import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { vi } from 'vitest'
import type { App } from 'vue'

// Create a test pinia instance
export function createTestPinia() {
  const pinia = createPinia()
  return pinia
}

// Mock audio context for testing
export const mockAudioContext = {
  state: 'running',
  resume: vi.fn(),
  suspend: vi.fn(),
  close: vi.fn(),
  createOscillator: vi.fn(),
  createGain: vi.fn(),
  destination: {},
}

// Mock canvas context
export const mockCanvasContext = {
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
}

// Test wrapper for Vue components with all necessary providers
export function createTestWrapper<T extends Record<string, any>>(
  component: any,
  options?: {
    props?: T
    global?: {
      plugins?: any[]
      mocks?: Record<string, any>
      stubs?: Record<string, any>
    }
  }
) {
  const pinia = createTestPinia()
  
  return mount(component, {
    props: options?.props,
    global: {
      plugins: [pinia, ...(options?.global?.plugins || [])],
      mocks: options?.global?.mocks || {},
      stubs: options?.global?.stubs || {},
    },
  })
}

// Helper to create mock touch events
export function createMockTouchEvent(type: string, touches: any[] = []) {
  return new TouchEvent(type, {
    touches,
    targetTouches: touches,
    changedTouches: touches,
  })
}

// Helper to create mock note data
export function createMockNote(overrides: Partial<any> = {}) {
  return {
    id: 'test-note-1',
    name: 'C',
    frequency: 261.63,
    solfege: 'Do',
    octave: 4,
    ...overrides,
  }
}

// Helper to create mock scale data
export function createMockScale(overrides: Partial<any> = {}) {
  return {
    name: 'C Major',
    tonic: 'C',
    mode: 'major',
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    ...overrides,
  }
}

// Helper to wait for Vue's nextTick and any async operations
export async function waitForUpdates() {
  await new Promise(resolve => setTimeout(resolve, 0))
}

// Helper to trigger resize events
export function triggerResize(width = 1024, height = 768) {
  Object.defineProperty(window, 'innerWidth', { value: width })
  Object.defineProperty(window, 'innerHeight', { value: height })
  window.dispatchEvent(new Event('resize'))
}

// Helper for testing performance
export function measurePerformance(fn: () => void) {
  const start = performance.now()
  fn()
  const end = performance.now()
  return end - start
}