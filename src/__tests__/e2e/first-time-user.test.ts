import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestWrapper } from '../helpers/test-utils'
import App from '@/App.vue'

const appLoadingState = vi.hoisted(() => ({
  isLoading: true,
}))

const tooltipState = vi.hoisted(() => ({
  tooltipState: { value: null },
  rotation: { value: 0 },
  translation: { value: { x: 0, y: 0 } },
}))

vi.mock('@/components/LoadingSplash.vue', () => ({
  default: { template: '<div data-testid="loading-splash">Loading...</div>' },
}))

vi.mock('@/components/UnifiedVisualEffects.vue', () => ({
  default: { template: '<div data-testid="unified-visual-effects">Visuals</div>' },
}))

vi.mock('@/components/FloatingPopup.vue', () => ({
  default: { template: '<div data-testid="floating-popup">Popup</div>' },
}))

vi.mock('@/components/ConfigPanel.vue', () => ({
  default: { template: '<div data-testid="config-panel">Config</div>' },
}))

vi.mock('@/components/InstrumentSelector.vue', () => ({
  default: { template: '<div data-testid="instrument-selector">Instrument</div>' },
}))

vi.mock('@/components/TooltipRenderer.vue', () => ({
  default: { template: '<div data-testid="tooltip-renderer">Tooltip</div>' },
}))

vi.mock('@/components/DrawerKeyboard.vue', () => ({
  default: { template: '<div data-testid="drawer-keyboard">Keyboard</div>' },
}))

vi.mock('@/composables/useAppLoading', () => ({
  useAppLoading: () => ({
    isLoading: appLoadingState.isLoading,
  }),
}))

vi.mock('@/stores/music', () => ({
  useMusicStore: () => ({
    solfegeData: [{ name: 'Do' }],
  }),
}))

vi.mock('@/stores/patterns', () => ({
  usePatternsStore: () => ({
    noteCount: 0,
  }),
}))

vi.mock('@/composables/useMidiControls', () => ({
  useMidiControls: vi.fn(),
}))

vi.mock('@/directives/tooltip', () => ({
  globalTooltip: tooltipState,
}))

describe('First-Time User Experience', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the loading splash while the app is still booting', () => {
    appLoadingState.isLoading = true
    const wrapper = createTestWrapper(App)

    expect(wrapper.find('[data-testid="loading-splash"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="unified-visual-effects"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="drawer-keyboard"]').exists()).toBe(false)
  })

  it('shows the current interactive shell once loading is complete', () => {
    appLoadingState.isLoading = false
    const wrapper = createTestWrapper(App)

    expect(wrapper.find('[data-testid="loading-splash"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="unified-visual-effects"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="config-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="instrument-selector"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="drawer-keyboard"]').exists()).toBe(true)
  })

  it('keeps the tooltip renderer available in both loading states', () => {
    appLoadingState.isLoading = true
    const loadingWrapper = createTestWrapper(App)
    expect(loadingWrapper.find('[data-testid="tooltip-renderer"]').exists()).toBe(true)
    loadingWrapper.unmount()

    appLoadingState.isLoading = false
    const readyWrapper = createTestWrapper(App)
    expect(readyWrapper.find('[data-testid="tooltip-renderer"]').exists()).toBe(true)
  })
})
