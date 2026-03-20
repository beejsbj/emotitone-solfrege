import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createTestWrapper } from '../../helpers/test-utils'
import App from '@/App.vue'

const appLoadingState = vi.hoisted(() => ({
  isLoading: false,
}))

const musicStore = vi.hoisted(() => ({
  solfegeData: [{ name: 'Do' }, { name: 'Re' }, { name: 'Mi' }],
}))

const patternsStore = vi.hoisted(() => ({
  patternCount: 0,
}))

const useMidiControls = vi.hoisted(() => vi.fn())

const tooltipState = vi.hoisted(() => ({
  tooltipState: { value: { id: 'tip-1' } },
  rotation: { value: 12 },
  translation: { value: { x: 10, y: 24 } },
}))

vi.mock('@/components/LoadingSplash.vue', () => ({
  default: { template: '<div data-testid="loading-splash">Loading...</div>' },
}))

vi.mock('@/components/UnifiedVisualEffects.vue', () => ({
  default: { template: '<div data-testid="unified-visual-effects">Visual Effects</div>' },
}))

vi.mock('@/components/FloatingPopup.vue', () => ({
  default: { template: '<div data-testid="floating-popup">Popup</div>' },
}))

vi.mock('@/components/ConfigPanel.vue', () => ({
  default: { template: '<div data-testid="config-panel">Config</div>' },
}))

vi.mock('@/components/InstrumentSelector.vue', () => ({
  default: {
    props: ['compact', 'floating'],
    template: '<div data-testid="instrument-selector">Instrument</div>',
  },
}))

vi.mock('@/components/TooltipRenderer.vue', () => ({
  default: {
    name: 'TooltipRenderer',
    props: ['tooltipState', 'rotation', 'translation'],
    template: '<div data-testid="tooltip-renderer">Tooltip</div>',
  },
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
  useMusicStore: () => musicStore,
}))

vi.mock('@/stores/patterns', () => ({
  usePatternsStore: () => patternsStore,
}))

vi.mock('@/composables/useMidiControls', () => ({
  useMidiControls,
}))

vi.mock('@/directives/tooltip', () => ({
  globalTooltip: tooltipState,
}))

describe('App.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appLoadingState.isLoading = false
  })

  it('renders the current shell when the app is ready', () => {
    const wrapper = createTestWrapper(App)

    expect(wrapper.find('[data-testid="loading-splash"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="unified-visual-effects"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="floating-popup"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="config-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="instrument-selector"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="drawer-keyboard"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tooltip-renderer"]').exists()).toBe(true)
    expect(wrapper.find('.relative.z-50.min-h-screen.flex.flex-col').exists()).toBe(true)
    expect(useMidiControls).toHaveBeenCalledTimes(1)
  })

  it('hides the interactive shell while loading', async () => {
    appLoadingState.isLoading = true

    const wrapper = createTestWrapper(App)
    await nextTick()

    expect(wrapper.find('[data-testid="loading-splash"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="unified-visual-effects"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="floating-popup"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="config-panel"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="instrument-selector"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="drawer-keyboard"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="tooltip-renderer"]').exists()).toBe(true)
  })

  it('passes the tooltip state through to the renderer', () => {
    const wrapper = createTestWrapper(App)

    const renderer = wrapper.findComponent({ name: 'TooltipRenderer' })
    expect(renderer.exists()).toBe(true)
    expect(renderer.props()).toEqual({
      tooltipState: tooltipState.tooltipState.value,
      rotation: tooltipState.rotation.value,
      translation: tooltipState.translation.value,
    })
  })
})
