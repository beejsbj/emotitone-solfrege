import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { createTestWrapper } from '../../helpers/test-utils'
import InstrumentSelector from '@/components/InstrumentSelector.vue'

const instrumentStore = vi.hoisted(() => ({
  currentInstrument: 'piano',
  initializeInstruments: vi.fn().mockResolvedValue(undefined),
  setInstrument: vi.fn(),
}))

const getRegisteredSounds = vi.hoisted(() => vi.fn(() => ['triangle', 'gm_trumpet', 'vibraphone', 'piano']))

vi.mock('@/stores/instrument', () => ({
  useInstrumentStore: () => instrumentStore,
}))

vi.mock('@/services/superdoughAudio', () => ({
  getRegisteredSounds,
}))

vi.mock('@/components/ui', () => ({
  Tabs: {
    props: ['value'],
    emits: ['update:value'],
    template: '<div data-testid="mock-tabs"><slot /></div>',
  },
  TabsList: {
    template: '<div data-testid="mock-tabs-list"><slot /></div>',
  },
  TabsTrigger: {
    props: ['value'],
    template: '<button data-testid="mock-tabs-trigger" :data-value="value"><slot /></button>',
  },
}))

vi.mock('./../../components/OverlayPanelShell.vue', () => ({
  default: {
    props: ['width', 'height', 'maxHeight', 'bodyClass'],
    template: `
      <section data-testid="overlay-panel-shell">
        <header data-testid="overlay-panel-header"><slot name="header" /></header>
        <div data-testid="overlay-panel-toolbar"><slot name="toolbar" /></div>
        <div data-testid="overlay-panel-body"><slot /></div>
        <footer data-testid="overlay-panel-footer"><slot name="footer" /></footer>
      </section>
    `,
  },
}))

vi.mock('@/components/OverlayPanelShell.vue', () => ({
  default: {
    props: ['width', 'height', 'maxHeight', 'bodyClass'],
    template: `
      <section data-testid="overlay-panel-shell">
        <header data-testid="overlay-panel-header"><slot name="header" /></header>
        <div data-testid="overlay-panel-toolbar"><slot name="toolbar" /></div>
        <div data-testid="overlay-panel-body"><slot /></div>
        <footer data-testid="overlay-panel-footer"><slot name="footer" /></footer>
      </section>
    `,
  },
}))

vi.mock('@/components/TopDrawer.vue', () => ({
  default: {
    props: ['anchor', 'handleLabel', 'handleTestId', 'ariaLabel'],
    template: `
      <div data-testid="top-drawer">
        <div data-testid="top-drawer-trigger">
          <button :data-testid="handleTestId" :aria-label="ariaLabel"><slot name="icon" />{{ handleLabel }}</button>
        </div>
        <div data-testid="top-drawer-panel">
          <slot name="panel" :close="close" :open="open" :toggle="open" :is-open="true" />
        </div>
      </div>
    `,
    setup() {
      return {
        open: () => undefined,
        close: () => undefined,
      }
    },
  },
}))

vi.mock('lucide-vue-next', () => ({
  Piano: { template: '<svg data-testid="piano-icon"></svg>' },
  Guitar: { template: '<svg data-testid="guitar-icon"></svg>' },
  Drum: { template: '<svg data-testid="drum-icon"></svg>' },
  Search: { template: '<svg data-testid="search-icon"></svg>' },
  X: { template: '<svg data-testid="close-icon"></svg>' },
}))

async function mountSelector(props: Record<string, unknown> = {}) {
  const wrapper = createTestWrapper(InstrumentSelector, { props })
  await flushPromises()
  await nextTick()
  return wrapper
}

describe('InstrumentSelector.vue', () => {
  let wrapper: ReturnType<typeof createTestWrapper> | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    instrumentStore.currentInstrument = 'piano'
    instrumentStore.initializeInstruments.mockResolvedValue(undefined)
    getRegisteredSounds.mockReturnValue(['triangle', 'gm_trumpet', 'vibraphone', 'piano'])
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('updates handle identity with selection and falls back to the name for unsupported sounds', async () => {
    wrapper = await mountSelector({ currentInstrument: 'piano' })
    const handle = () => wrapper!.get('[data-testid="instrument-selector-trigger"]')
    expect(handle().find('[data-testid="piano-icon"]').exists()).toBe(true)

    await wrapper.setProps({ currentInstrument: 'gm_acoustic_guitar_nylon' })
    expect(handle().find('[data-testid="guitar-icon"]').exists()).toBe(true)
    expect(handle().find('[data-testid="piano-icon"]').exists()).toBe(false)

    await wrapper.setProps({ currentInstrument: 'gm_taiko_drum' })
    expect(handle().find('[data-testid="drum-icon"]').exists()).toBe(true)

    for (const instrument of ['gm_violin', 'gm_bassoon', 'gm_synth_bass_1', 'triangle', 'custom_sample']) {
      await wrapper.setProps({ currentInstrument: instrument })
      expect(handle().find('svg').exists()).toBe(false)
      expect(handle().text()).toBe(instrument.replace(/^gm_/, ''))
    }

    await wrapper.setProps({ currentInstrument: 'gm_epiano1' })
    expect(handle().find('[data-testid="piano-icon"]').exists()).toBe(true)
  })

  it('loads registered sounds and renders grouped sound banks', async () => {
    wrapper = await mountSelector()

    expect(instrumentStore.initializeInstruments).toHaveBeenCalledTimes(1)
    expect(getRegisteredSounds).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="instrument-search"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="instrument-selector-trigger"]').text()).toContain('piano')
    expect(wrapper.text()).toContain('Keyboards')
    expect(wrapper.text()).toContain('Mallets')
    expect(wrapper.text()).toContain('Synths')
    expect(wrapper.text()).toContain('GM Soundfonts')
    expect(wrapper.text()).toContain('trumpet')
    expect(wrapper.text()).toContain('All Sounds')
  })

  it('filters sounds by search query and shows an empty state when nothing matches', async () => {
    wrapper = await mountSelector()

    const search = wrapper.find('[data-testid="instrument-search"]')
    await search.setValue('vib')
    await nextTick()

    expect(wrapper.find('[data-testid="instrument-option-vibraphone"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="instrument-option-piano"]').exists()).toBe(false)

    await search.setValue('zzz')
    await nextTick()

    expect(wrapper.text()).toContain('no matches for "zzz"')
  })

  it('selects a sound through the store in global mode', async () => {
    wrapper = await mountSelector()

    await wrapper.find('[data-testid="instrument-option-vibraphone"]').trigger('click')

    expect(instrumentStore.setInstrument).toHaveBeenCalledWith('vibraphone')
    expect(wrapper.emitted('select-instrument')).toEqual([['vibraphone']])
    expect(wrapper.emitted('close')).toEqual([[]])
  })

  it('uses callback props for per-surface selection flows', async () => {
    const onSelectInstrument = vi.fn()
    const onClose = vi.fn()

    wrapper = await mountSelector({
      currentInstrument: 'triangle',
      onSelectInstrument,
      onClose,
    })

    await wrapper.find('[data-testid="instrument-option-triangle"]').trigger('click')

    expect(onSelectInstrument).toHaveBeenCalledWith('triangle')
    expect(onClose).toHaveBeenCalledTimes(2)
    expect(instrumentStore.setInstrument).not.toHaveBeenCalled()
    expect(wrapper.emitted('select-instrument')).toEqual([['triangle']])
    expect(wrapper.emitted('close')).toEqual([[]])
  })

  it('preserves instrument identity on the handle and highlights the selected sound', async () => {
    wrapper = await mountSelector({
      compact: true,
      currentInstrument: 'triangle',
    })

    const trigger = wrapper.find('[data-testid="instrument-selector-trigger"]')
    const selected = wrapper.find('[data-testid="instrument-option-triangle"]')

    expect(trigger.attributes('aria-label')).toBe('Instrument')
    expect(trigger.text()).toContain('triangle')
    expect(selected.classes()).toContain('border-[#8b8b8b]')
    expect(selected.classes()).toContain('bg-[#242424]')
  })

  it('renders footer bank tabs with the shared panel aesthetic structure', async () => {
    wrapper = await mountSelector()

    expect(wrapper.find('[data-testid="overlay-panel-footer"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="instrument-tab-all"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="instrument-tab-keyboards"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="instrument-tab-gm"]').exists()).toBe(true)
  })
})
