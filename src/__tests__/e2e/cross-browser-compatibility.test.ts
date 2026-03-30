import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestWrapper } from '../helpers/test-utils'
import App from '@/App.vue'

const appLoadingState = vi.hoisted(() => ({
  isLoading: false,
}))

const tooltipState = vi.hoisted(() => ({
  tooltipState: { value: null },
  rotation: { value: 0 },
  translation: { value: { x: 0, y: 0 } },
}))

const useMidiControls = vi.hoisted(() => vi.fn())

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
  useMidiControls,
}))

vi.mock('@/directives/tooltip', () => ({
  globalTooltip: tooltipState,
}))

describe('Cross-Browser Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appLoadingState.isLoading = false
  })

  it('renders the current shell across common viewport sizes', () => {
    const wrapper = createTestWrapper(App)
    const viewports = [
      { width: 375, height: 667 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]

    for (const viewport of viewports) {
      Object.defineProperty(window, 'innerWidth', { value: viewport.width, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: viewport.height, writable: true })
      expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow()
      expect(wrapper.find('#app').exists()).toBe(true)
      expect(wrapper.find('[data-testid="drawer-keyboard"]').exists()).toBe(true)
    }
  })

  it('tolerates vendor-prefixed audio constructor surfaces', () => {
    const wrapper = createTestWrapper(App)
    const vendorContext = vi.fn()

    Object.defineProperty(globalThis, 'webkitAudioContext', {
      value: vendorContext,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'mozAudioContext', {
      value: vendorContext,
      writable: true,
      configurable: true,
    })

    expect(wrapper.find('#app').exists()).toBe(true)
    expect(useMidiControls).toHaveBeenCalledTimes(1)
  })

  it('keeps the shell mounted across repeated resize events', () => {
    const wrapper = createTestWrapper(App)

    for (let index = 0; index < 5; index += 1) {
      Object.defineProperty(window, 'innerWidth', { value: 640 + index * 100, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 480 + index * 40, writable: true })
      window.dispatchEvent(new Event('resize'))
    }

    expect(wrapper.find('[data-testid="unified-visual-effects"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tooltip-renderer"]').exists()).toBe(true)
  })
})
