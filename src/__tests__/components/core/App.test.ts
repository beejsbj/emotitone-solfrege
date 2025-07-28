import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createTestWrapper } from '../../helpers/test-utils'
import App from '@/App.vue'

// Mock all child components
vi.mock('@/components/LoadingSplash.vue', () => ({
  default: { template: '<div data-testid="loading-splash">Loading...</div>' }
}))

vi.mock('@/components/UnifiedVisualEffects.vue', () => ({
  default: { template: '<div data-testid="unified-visual-effects">Visual Effects</div>' }
}))

vi.mock('@/components/AppHeader.vue', () => ({
  default: { template: '<div data-testid="app-header">Header</div>' }
}))

vi.mock('@/components/SequencerSection.vue', () => ({
  default: { template: '<div data-testid="sequencer-section">Sequencer</div>' }
}))

vi.mock('@/components/FloatingPopup.vue', () => ({
  default: { template: '<div data-testid="floating-popup">Popup</div>' }
}))

vi.mock('@/components/InstrumentSelector.vue', () => ({
  default: { template: '<div data-testid="instrument-selector">Instrument</div>' }
}))

vi.mock('@/components/TooltipRenderer.vue', () => ({
  default: { 
    template: '<div data-testid="tooltip-renderer">Tooltip</div>',
    props: ['tooltipState', 'rotation', 'translation']
  }
}))

vi.mock('@/components/ConfigPanel.vue', () => ({
  default: { template: '<div data-testid="config-panel">Config</div>' }
}))

vi.mock('@/components/StickyBottom.vue', () => ({
  default: { template: '<div data-testid="sticky-bottom">Sticky</div>' }
}))

// Mock composables
vi.mock('@/composables/useAppLoading', () => ({
  useAppLoading: () => ({
    isLoading: vi.fn(() => false)
  })
}))

vi.mock('@/stores/music', () => ({
  useMusicStore: () => ({
    solfegeData: [
      { name: 'Do' },
      { name: 'Re' },
      { name: 'Mi' },
      { name: 'Fa' },
      { name: 'Sol' },
      { name: 'La' },
      { name: 'Ti' }
    ]
  })
}))

vi.mock('@/directives/tooltip', () => ({
  globalTooltip: {
    tooltipState: { value: null },
    rotation: { value: 0 },
    translation: { value: { x: 0, y: 0 } }
  }
}))

describe('App.vue', () => {
  let wrapper: any
  let mockUseAppLoading: any
  let mockUseMusicStore: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Mock console.log to prevent test output noise
    vi.spyOn(console, 'log').mockImplementation(() => {})
    
    // Set up mock returns
    mockUseAppLoading = {
      isLoading: vi.fn(() => false)
    }
    
    mockUseMusicStore = {
      solfegeData: [
        { name: 'Do' },
        { name: 'Re' },
        { name: 'Mi' },
        { name: 'Fa' },
        { name: 'Sol' },
        { name: 'La' },
        { name: 'Ti' }
      ]
    }
    
    // Update mocks
    vi.mocked(require('@/composables/useAppLoading').useAppLoading).mockReturnValue(mockUseAppLoading)
    vi.mocked(require('@/stores/music').useMusicStore).mockReturnValue(mockUseMusicStore)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  it('renders correctly when not loading', () => {
    mockUseAppLoading.isLoading.mockReturnValue(false)
    
    wrapper = createTestWrapper(App)
    
    expect(wrapper.find('[data-testid="loading-splash"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="unified-visual-effects"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-header"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="sequencer-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="floating-popup"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="instrument-selector"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tooltip-renderer"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="auto-debug-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="sticky-bottom"]').exists()).toBe(true)
  })

  it('hides main content when loading', async () => {
    mockUseAppLoading.isLoading.mockReturnValue(true)
    
    wrapper = createTestWrapper(App)
    await nextTick()
    
    expect(wrapper.find('[data-testid="loading-splash"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="unified-visual-effects"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="auto-debug-panel"]').exists()).toBe(false)
    
    // Main content should not be visible
    const mainContent = wrapper.find('.relative.z-10.min-h-screen.flex.flex-col')
    expect(mainContent.exists()).toBe(false)
  })

  it('shows main content when not loading', async () => {
    mockUseAppLoading.isLoading.mockReturnValue(false)
    
    wrapper = createTestWrapper(App)
    await nextTick()
    
    expect(wrapper.find('[data-testid="unified-visual-effects"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="auto-debug-panel"]').exists()).toBe(true)
    
    // Main content should be visible
    const mainContent = wrapper.find('.relative.z-10.min-h-screen.flex.flex-col')
    expect(mainContent.exists()).toBe(true)
  })

  it('has correct app structure', () => {
    wrapper = createTestWrapper(App)
    
    const appDiv = wrapper.find('#app')
    expect(appDiv.exists()).toBe(true)
    expect(appDiv.classes()).toContain('min-h-screen')
  })

  it('initializes music store and logs solfege data', () => {
    wrapper = createTestWrapper(App)
    
    expect(console.log).toHaveBeenCalledWith('Number of solfege notes:', 7)
    expect(console.log).toHaveBeenCalledWith('Solfege data:', ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'])
  })

  it('passes correct props to TooltipRenderer', () => {
    wrapper = createTestWrapper(App)
    
    const tooltipRenderer = wrapper.findComponent({ name: 'TooltipRenderer' })
    expect(tooltipRenderer.exists()).toBe(true)
    expect(tooltipRenderer.props()).toEqual({
      tooltipState: null,
      rotation: 0,
      translation: { x: 0, y: 0 }
    })
  })

  it('handles handleScroll function', () => {
    wrapper = createTestWrapper(App)
    
    // Mock querySelector
    const mockContainer = {
      scrollLeft: 0
    }
    const mockQuerySelector = vi.spyOn(document, 'querySelector').mockReturnValue(mockContainer as any)
    
    // Access the component instance
    const component = wrapper.vm
    
    // Call handleScroll
    component.handleScroll(1)
    
    expect(mockQuerySelector).toHaveBeenCalledWith('.sticky')
    expect(mockContainer.scrollLeft).toBe(window.innerWidth)
    
    mockQuerySelector.mockRestore()
  })

  it('handles handleScroll with no container', () => {
    wrapper = createTestWrapper(App)
    
    // Mock querySelector to return null
    const mockQuerySelector = vi.spyOn(document, 'querySelector').mockReturnValue(null)
    
    // Access the component instance
    const component = wrapper.vm
    
    // Should not throw error
    expect(() => {
      component.handleScroll(1)
    }).not.toThrow()
    
    mockQuerySelector.mockRestore()
  })

  it('reactively updates when loading state changes', async () => {
    const loadingRef = vi.fn(() => false)
    mockUseAppLoading.isLoading = loadingRef
    
    wrapper = createTestWrapper(App)
    
    // Initially not loading
    expect(wrapper.find('[data-testid="unified-visual-effects"]').exists()).toBe(true)
    
    // Change to loading
    loadingRef.mockReturnValue(true)
    await nextTick()
    
    // Should hide visual effects
    expect(wrapper.find('[data-testid="unified-visual-effects"]').exists()).toBe(false)
  })

  it('applies correct CSS classes', () => {
    wrapper = createTestWrapper(App)
    
    const appDiv = wrapper.find('#app')
    expect(appDiv.classes()).toContain('min-h-screen')
    
    const mainContent = wrapper.find('.relative.z-10.min-h-screen.flex.flex-col')
    expect(mainContent.classes()).toEqual(['relative', 'z-10', 'min-h-screen', 'flex', 'flex-col'])
  })
})