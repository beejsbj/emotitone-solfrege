import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createTestWrapper } from '../../helpers/test-utils'
import App from '@/App.vue'
import appSource from '@/App.vue?raw'
import mainAppSource from '@/MainApp.vue?raw'
import mainSource from '@/main.ts?raw'
import { STYLE_GUIDE_PAGES, isStyleGuideRoute } from '@/styleGuideRoutes'

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

vi.mock('@/stores/looper', () => ({
  useLooperStore: () => ({ stageSource: undefined }),
}));
vi.mock('@/components/LoadingSplash.vue', () => ({
  default: { template: '<div data-testid="loading-splash">Loading...</div>' },
}))

vi.mock('@/components/UnifiedVisualEffects.vue', () => ({
  default: { template: '<div data-testid="unified-visual-effects">Visual Effects</div>' },
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

vi.mock('@/components/PerformanceDeck.vue', () => ({
  default: { template: '<div data-testid="performance-deck">Keyboard</div>' },
}))

vi.mock('@/composables/useAppLoading', () => ({
  useAppLoading: () => ({
    isLoading: appLoadingState.isLoading,
  }),
}))

vi.mock('@/stores/music', () => ({
  useMusicStore: () => musicStore,
}))

vi.mock('@/stores/phrases', () => ({
  usePhrasesStore: () => patternsStore,
}))

vi.mock('@/composables/useMidiControls', () => ({
  useMidiControls,
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
    expect(wrapper.find('[data-testid="config-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="instrument-selector"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="performance-deck"]').exists()).toBe(true)
    expect(wrapper.find('.relative.z-50.min-h-screen.flex.flex-col').exists()).toBe(true)
    expect(useMidiControls).toHaveBeenCalledTimes(1)
  })

  it('hides the interactive shell while loading', async () => {
    appLoadingState.isLoading = true

    const wrapper = createTestWrapper(App)
    await nextTick()

    expect(wrapper.find('[data-testid="loading-splash"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="unified-visual-effects"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="config-panel"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="instrument-selector"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="performance-deck"]').exists()).toBe(false)
  })

  it('mounts no tooltip layer: the retired v-tooltip stack had no consumer', () => {
    expect(mainAppSource).not.toContain('TooltipRenderer')
    expect(mainSource).not.toContain('tooltipPlugin')
  })

  it('guards lazy StyleGuide import and guide CSS gating in production App entry', () => {
    // Structural guard: lazy-load boundary contract protecting style guide exclusion from entry graph
    expect(appSource).toContain('defineAsyncComponent')
    expect(appSource).toContain('import("./style-guide/StyleGuide.vue")')
    expect(appSource).toContain('import("./style-guide/guide-defaults.css")')
    expect(appSource).toContain('from "./styleGuideRoutes"')
    expect(STYLE_GUIDE_PAGES['/style-guide/config-menu']).toBe('config-menu')
    expect(STYLE_GUIDE_PAGES['/style-guide/performance-deck']).toBe('performance-deck')
    expect(appSource).not.toContain('TabsLab')
    expect(appSource).not.toContain('InstrumentPickerLab')
    expect(appSource).not.toContain('TabsPage')
    expect(appSource).not.toContain('InstrumentPickerPage')
    expect(appSource).not.toContain('ConfigMenuPage')
    expect(appSource).not.toContain(
      'import StyleGuide from "./style-guide/StyleGuide.vue"',
    )
    expect(appSource).toContain('beginJoystickPageEdition()')
    expect(appSource.indexOf('beginJoystickPageEdition()'))
      .toBeGreaterThan(appSource.indexOf('} else {'))
    expect(appSource).not.toContain('MarksBeatParticlesPage')
    expect(appSource).not.toContain('isRoughPage')
  })

  it('routes and bootstraps the guide from one shared route list', () => {
    // App.vue and main.ts once kept separate copies, and main.ts drifted
    // behind (the six layer pages ran production bootstrap).
    expect(mainSource).toContain('from "./styleGuideRoutes"')
    expect(mainSource).toContain('const isDesignRoute = isStyleGuideRoute(pathname);')
    expect(mainSource).not.toMatch(/"\/style-guide\/(tokens|primitives|tabs)"/)
    expect(appSource).not.toMatch(/"\/style-guide\/(tokens|primitives|tabs)"/)
    for (const page of ['tokens', 'primitives', 'compounds', 'uniques', 'compositions', 'systems']) {
      expect(isStyleGuideRoute(`/style-guide/${page}`)).toBe(true)
    }
    expect(isStyleGuideRoute('/')).toBe(false)
    expect(isStyleGuideRoute('/style-guide/unknown')).toBe(false)
  })

  it('pins the bootstrap routing wiring: two persistence-free guide routes and sole main.ts tab-edition call', () => {
    // Structural guard: guards the entry-graph routing contract that beginsTabsPageEdition
    // is called once in main.ts only for non-design routes
    expect(mainSource).toMatch(
      /const isPersistenceFreeDesignRoute = \[\s*"\/style-guide\/performance-deck",\s*"\/style-guide\/stage",\s*\]\.includes\(pathname\);/,
    )
    expect(mainSource).toMatch(
      /if \(!isPersistenceFreeDesignRoute\) \{\s*beginTabsPageEdition\(\);\s*\}/,
    )
  })

  it('bans the named retired FloatingPopup mount and requires UnifiedVisualEffects in MainApp', () => {
    // Structural guard: migration contract protecting the named component removal seam
    expect(mainAppSource).not.toContain('FloatingPopup')
    expect(mainAppSource).toContain('UnifiedVisualEffects')
  })
})
