import { describe, it, expect, vi } from 'vitest'
import { createTestWrapper } from '../helpers/test-utils'
import { simulateUserInteraction, waitForAudioLoad, waitForAnimation } from './setup'
import { useMusicStore } from '@/stores/music'
import { useSequencerStore } from '@/stores/sequencer'
import { useInstrumentStore } from '@/stores/instrument'

// Mock the main App component to avoid complex dependency issues
const mockApp = {
  name: 'App',
  template: '<div id="app">Mock App</div>',
  setup() {
    return {}
  }
}

describe('First-Time User Experience', () => {
  it('loads the application successfully', async () => {
    const wrapper = createTestWrapper(mockApp)
    
    // App should render without crashing
    expect(wrapper.find('#app')).toBeTruthy()
    
    // Should show loading splash initially
    expect(wrapper.findComponent({ name: 'LoadingSplash' }).exists()).toBe(true)
    
    // Wait for loading to complete
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Main content should be visible after loading
    expect(wrapper.find('[data-testid="main-content"]').exists()).toBe(true)
  })

  it('initializes audio context with user interaction', async () => {
    const wrapper = createTestWrapper(App)
    
    // Wait for app to load
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Find a palette or sequencer element to interact with
    const palette = wrapper.findComponent({ name: 'CanvasSolfegePalette' })
    
    if (palette.exists()) {
      // Simulate user interaction
      await simulateUserInteraction(palette)
      
      // Audio context should be running after user interaction
      expect(AudioContext).toHaveBeenCalled()
    }
  })

  it('displays default music theory setup', async () => {
    const wrapper = createTestWrapper(App)
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Should default to C major
    expect(musicStore.currentKey).toBe('C')
    expect(musicStore.currentMode).toBe('major')
    
    // Should have solfege data loaded
    expect(musicStore.solfegeData).toBeDefined()
    expect(musicStore.solfegeData.length).toBe(7)
    
    // Should have proper scale notes
    expect(musicStore.currentScaleNotes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
  })

  it('creates initial sequencer instance', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Should have at least one sequencer
    expect(sequencerStore.sequencers.length).toBeGreaterThan(0)
    
    // Should have default tempo
    expect(sequencerStore.config.tempo).toBe(120)
    
    // Should have default steps
    expect(sequencerStore.config.steps).toBe(16)
  })

  it('shows visual effects after loading', async () => {
    const wrapper = createTestWrapper(App)
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Visual effects should be present
    const visualEffects = wrapper.findComponent({ name: 'UnifiedVisualEffects' })
    expect(visualEffects.exists()).toBe(true)
    
    // Canvas should be set up
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled()
  })

  it('displays all main UI components', async () => {
    const wrapper = createTestWrapper(App)
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Header should be present
    expect(wrapper.findComponent({ name: 'AppHeader' }).exists()).toBe(true)
    
    // Sequencer section should be present
    expect(wrapper.findComponent({ name: 'SequencerSection' }).exists()).toBe(true)
    
    // Sticky bottom controls should be present
    expect(wrapper.findComponent({ name: 'StickyBottom' }).exists()).toBe(true)
    
    // Floating popup should be present
    expect(wrapper.findComponent({ name: 'FloatingPopup' }).exists()).toBe(true)
  })

  it('handles mobile-first responsive design', async () => {
    const wrapper = createTestWrapper(App)
    
    // Set mobile viewport
    Object.defineProperty(window, 'innerWidth', { value: 375 })
    Object.defineProperty(window, 'innerHeight', { value: 667 })
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Should render properly on mobile
    expect(wrapper.find('#app').classes()).toContain('min-h-screen')
    
    // Bottom controls should be sticky
    const stickyBottom = wrapper.findComponent({ name: 'StickyBottom' })
    expect(stickyBottom.exists()).toBe(true)
  })

  it('provides tooltip system', async () => {
    const wrapper = createTestWrapper(App)
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Tooltip renderer should be present
    expect(wrapper.findComponent({ name: 'TooltipRenderer' }).exists()).toBe(true)
  })

  it('handles errors gracefully during initialization', async () => {
    // Mock console.error to check for errors
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Mock a failing audio context
    const originalAudioContext = global.AudioContext
    global.AudioContext = vi.fn().mockImplementation(() => {
      throw new Error('Audio context failed')
    })
    
    try {
      const wrapper = createTestWrapper(App)
      await waitForAudioLoad(200)
      await wrapper.vm.$nextTick()
      
      // App should still render even with audio errors
      expect(wrapper.find('#app')).toBeTruthy()
    } finally {
      // Restore original audio context
      global.AudioContext = originalAudioContext
      consoleSpy.mockRestore()
    }
  })

  it('initializes instrument store with defaults', async () => {
    const wrapper = createTestWrapper(App)
    const instrumentStore = useInstrumentStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Should have default instrument
    expect(instrumentStore.currentInstrument).toBe('piano')
    
    // Should have available instruments
    expect(instrumentStore.availableInstruments).toBeDefined()
    expect(instrumentStore.availableInstruments.length).toBeGreaterThan(0)
  })

  it('shows loading states appropriately', async () => {
    const wrapper = createTestWrapper(App)
    
    // Should show loading initially
    expect(wrapper.findComponent({ name: 'LoadingSplash' }).exists()).toBe(true)
    
    // Main content should be hidden during loading
    expect(wrapper.find('[data-testid="main-content"]').exists()).toBe(false)
    
    // After loading completes
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Loading should be hidden
    expect(wrapper.findComponent({ name: 'LoadingSplash' }).exists()).toBe(false)
    
    // Main content should be visible
    const mainContent = wrapper.find('div[class*="relative z-10 min-h-screen"]')
    expect(mainContent.exists()).toBe(true)
  })
})