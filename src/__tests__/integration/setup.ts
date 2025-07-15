/**
 * Integration Test Setup
 * 
 * This file provides common setup and utilities for integration tests.
 * It handles the complex initialization of stores and components while
 * avoiding circular dependency issues.
 */

import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { vi } from 'vitest'
import { resetAudioMocks } from '../helpers/audio-mocks'

// Store types
export interface IntegrationTestContext {
  pinia: Pinia
  stores: {
    music?: any
    sequencer?: any
    instrument?: any
    visualConfig?: any
  }
  components: {
    UnifiedVisualEffects?: any
    CanvasSolfegePalette?: any
    SequencerGrid?: any
    KeySelector?: any
    InstrumentSelector?: any
    SequencerSection?: any
    App?: any
  }
  services: {
    audioService?: any
    musicTheory?: any
  }
}

/**
 * Sets up the test context for integration tests
 * Handles dynamic imports to avoid circular dependencies
 */
export async function setupIntegrationTest(): Promise<IntegrationTestContext> {
  // Create and activate pinia
  const pinia = createPinia()
  setActivePinia(pinia)
  
  // Reset mocks
  resetAudioMocks()
  vi.clearAllMocks()
  
  // Initialize context
  const context: IntegrationTestContext = {
    pinia,
    stores: {},
    components: {},
    services: {},
  }
  
  // Dynamic imports for stores
  try {
    const musicModule = await import('@/stores/music')
    context.stores.music = musicModule.useMusicStore()
  } catch (e) {
    console.warn('Failed to load music store:', e)
  }
  
  try {
    const sequencerModule = await import('@/stores/sequencer')
    context.stores.sequencer = sequencerModule.useSequencerStore()
  } catch (e) {
    console.warn('Failed to load sequencer store:', e)
  }
  
  try {
    const instrumentModule = await import('@/stores/instrument')
    context.stores.instrument = instrumentModule.useInstrumentStore()
  } catch (e) {
    console.warn('Failed to load instrument store:', e)
  }
  
  try {
    const visualConfigModule = await import('@/stores/visualConfig')
    context.stores.visualConfig = visualConfigModule.useVisualConfigStore()
  } catch (e) {
    console.warn('Failed to load visual config store:', e)
  }
  
  return context
}

/**
 * Loads components dynamically as needed
 */
export async function loadComponent(name: string) {
  const componentMap: Record<string, string> = {
    UnifiedVisualEffects: '@/components/UnifiedVisualEffects.vue',
    CanvasSolfegePalette: '@/components/CanvasSolfegePalette.vue',
    SequencerGrid: '@/components/SequencerGrid.vue',
    KeySelector: '@/components/KeySelector.vue',
    InstrumentSelector: '@/components/InstrumentSelector.vue',
    SequencerSection: '@/components/SequencerSection.vue',
    App: '@/App.vue',
  }
  
  const path = componentMap[name]
  if (!path) {
    throw new Error(`Unknown component: ${name}`)
  }
  
  try {
    const module = await import(path)
    return module.default || module
  } catch (e) {
    console.error(`Failed to load component ${name}:`, e)
    throw e
  }
}

/**
 * Loads services dynamically
 */
export async function loadService(name: string) {
  const serviceMap: Record<string, string> = {
    audioService: '@/services/audio',
    musicTheory: '@/services/music',
  }
  
  const path = serviceMap[name]
  if (!path) {
    throw new Error(`Unknown service: ${name}`)
  }
  
  try {
    const module = await import(path)
    return module[name]
  } catch (e) {
    console.error(`Failed to load service ${name}:`, e)
    throw e
  }
}

/**
 * Cleanup function for after each test
 */
export function cleanupIntegrationTest() {
  vi.clearAllMocks()
  resetAudioMocks()
  
  // Clear any custom event listeners
  const events = ['note-played', 'note-released', 'scale-changed', 'color-system-updated']
  events.forEach(event => {
    window.removeEventListener(event, () => {})
  })
}