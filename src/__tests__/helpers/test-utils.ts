import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { vi } from 'vitest'

// Create a test pinia instance
export function createTestPinia() {
  const pinia = createPinia()
  return pinia
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
  quadraticCurveTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  clip: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
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
