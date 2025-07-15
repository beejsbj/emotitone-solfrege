import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createTestWrapper } from '../../helpers/test-utils'
import InstrumentSelector from '@/components/InstrumentSelector.vue'

// Mock child components
vi.mock('@/components/FloatingDropdown.vue', () => ({
  default: {
    template: `
      <div data-testid="floating-dropdown">
        <div data-testid="trigger" @click="$emit('trigger-click')">
          <slot name="trigger" :toggle="() => $emit('trigger-click')" />
        </div>
        <div data-testid="panel">
          <slot name="panel" :close="() => $emit('panel-close')" :toggle="() => $emit('panel-toggle')" :position="position" />
        </div>
      </div>
    `,
    props: ['position', 'maxHeight', 'floating'],
    emits: ['trigger-click', 'panel-close', 'panel-toggle']
  }
}))

// Mock Lucide icons
vi.mock('lucide-vue-next', () => ({
  ChevronDown: { template: '<svg data-testid="chevron-down-icon"></svg>' },
  Music: { template: '<svg data-testid="music-icon"></svg>' }
}))

// Mock store
const mockInstrumentStore = {
  currentInstrument: 'piano',
  availableInstruments: [
    { name: 'piano', displayName: 'Piano', icon: '🎹', description: 'Acoustic Piano', category: 'keyboard' },
    { name: 'guitar', displayName: 'Guitar', icon: '🎸', description: 'Electric Guitar', category: 'string' },
    { name: 'drums', displayName: 'Drums', icon: '🥁', description: 'Drum Kit', category: 'percussion' }
  ],
  instrumentsByCategory: {
    keyboard: [
      { name: 'piano', displayName: 'Piano', icon: '🎹', description: 'Acoustic Piano', category: 'keyboard' }
    ],
    string: [
      { name: 'guitar', displayName: 'Guitar', icon: '🎸', description: 'Electric Guitar', category: 'string' }
    ],
    percussion: [
      { name: 'drums', displayName: 'Drums', icon: '🥁', description: 'Drum Kit', category: 'percussion' }
    ]
  },
  isLoading: false,
  initializeInstruments: vi.fn().mockResolvedValue(undefined),
  setInstrument: vi.fn()
}

vi.mock('@/stores/instrument', () => ({
  useInstrumentStore: () => mockInstrumentStore
}))

// Mock category display names
vi.mock('@/data/instruments', () => ({
  CATEGORY_DISPLAY_NAMES: {
    keyboard: 'Keyboards',
    string: 'Strings',
    percussion: 'Percussion'
  }
}))

describe('InstrumentSelector.vue', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock store state
    mockInstrumentStore.currentInstrument = 'piano'
    mockInstrumentStore.isLoading = false
    mockInstrumentStore.initializeInstruments.mockResolvedValue(undefined)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  it('renders correctly', () => {
    wrapper = createTestWrapper(InstrumentSelector)
    
    expect(wrapper.find('[data-testid="floating-dropdown"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="trigger"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="panel"]').exists()).toBe(true)
  })

  it('renders with default props', () => {
    wrapper = createTestWrapper(InstrumentSelector)
    
    expect(wrapper.props().compact).toBe(false)
    expect(wrapper.props().currentInstrument).toBeUndefined()
    expect(wrapper.props().onSelectInstrument).toBeUndefined()
    expect(wrapper.props().onClose).toBeUndefined()
  })

  it('renders with custom props', () => {
    const mockSelectInstrument = vi.fn()
    const mockClose = vi.fn()
    
    wrapper = createTestWrapper(InstrumentSelector, {
      props: {
        compact: true,
        currentInstrument: 'guitar',
        onSelectInstrument: mockSelectInstrument,
        onClose: mockClose
      }
    })
    
    expect(wrapper.props().compact).toBe(true)
    expect(wrapper.props().currentInstrument).toBe('guitar')
    expect(wrapper.props().onSelectInstrument).toBe(mockSelectInstrument)
    expect(wrapper.props().onClose).toBe(mockClose)
  })

  it('initializes instruments on mount', async () => {
    wrapper = createTestWrapper(InstrumentSelector)
    
    await nextTick()
    
    expect(mockInstrumentStore.initializeInstruments).toHaveBeenCalled()
  })

  it('displays current instrument from store', () => {
    mockInstrumentStore.currentInstrument = 'piano'
    
    wrapper = createTestWrapper(InstrumentSelector)
    
    const triggerButton = wrapper.find('button')
    expect(triggerButton.text()).toContain('🎹')
    expect(triggerButton.text()).toContain('Piano')
  })

  it('displays current instrument from props', () => {
    wrapper = createTestWrapper(InstrumentSelector, {
      props: { currentInstrument: 'guitar' }
    })
    
    const triggerButton = wrapper.find('button')
    expect(triggerButton.text()).toContain('🎸')
    expect(triggerButton.text()).toContain('Guitar')
  })

  it('shows loading state when instruments are loading', () => {
    mockInstrumentStore.isLoading = true
    
    wrapper = createTestWrapper(InstrumentSelector)
    
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading instruments...')
  })

  it('displays instruments by category', () => {
    wrapper = createTestWrapper(InstrumentSelector)
    
    expect(wrapper.text()).toContain('Keyboards')
    expect(wrapper.text()).toContain('Strings')
    expect(wrapper.text()).toContain('Percussion')
    
    expect(wrapper.text()).toContain('Piano')
    expect(wrapper.text()).toContain('Guitar')
    expect(wrapper.text()).toContain('Drums')
  })

  it('handles instrument selection in global mode', async () => {
    wrapper = createTestWrapper(InstrumentSelector)
    
    const instrumentButton = wrapper.find('button[title="Electric Guitar"]')
    await instrumentButton.trigger('click')
    
    expect(mockInstrumentStore.setInstrument).toHaveBeenCalledWith('guitar')
    expect(wrapper.emitted('select-instrument')).toEqual([['guitar']])
    expect(wrapper.emitted('close')).toEqual([[]])
  })

  it('handles instrument selection in per-sequencer mode', async () => {
    const mockSelectInstrument = vi.fn()
    const mockClose = vi.fn()
    
    wrapper = createTestWrapper(InstrumentSelector, {
      props: {
        onSelectInstrument: mockSelectInstrument,
        onClose: mockClose
      }
    })
    
    const instrumentButton = wrapper.find('button[title="Electric Guitar"]')
    await instrumentButton.trigger('click')
    
    expect(mockSelectInstrument).toHaveBeenCalledWith('guitar')
    expect(mockClose).toHaveBeenCalled()
    expect(wrapper.emitted('select-instrument')).toEqual([['guitar']])
    expect(wrapper.emitted('close')).toEqual([[]])
  })

  it('highlights currently selected instrument', () => {
    mockInstrumentStore.currentInstrument = 'piano'
    
    wrapper = createTestWrapper(InstrumentSelector)
    
    const pianoButton = wrapper.find('button[title="Acoustic Piano"]')
    expect(pianoButton.classes()).toContain('bg-[#00ff88]/20')
    expect(pianoButton.classes()).toContain('border-[#00ff88]/50')
    expect(pianoButton.classes()).toContain('text-[#00ff88]')
  })

  it('applies compact styles when compact prop is true', () => {
    wrapper = createTestWrapper(InstrumentSelector, {
      props: { compact: true }
    })
    
    const triggerButton = wrapper.find('button')
    expect(triggerButton.classes()).toContain('px-2')
    expect(triggerButton.classes()).toContain('py-1')
    expect(triggerButton.classes()).toContain('text-[10px]')
    expect(triggerButton.classes()).toContain('max-w-[150px]')
  })

  it('applies full styles when compact prop is false', () => {
    wrapper = createTestWrapper(InstrumentSelector, {
      props: { compact: false }
    })
    
    const triggerButton = wrapper.find('button')
    expect(triggerButton.classes()).not.toContain('px-2')
    expect(triggerButton.classes()).not.toContain('py-1')
    expect(triggerButton.classes()).toContain('max-w-[200px]')
  })

  it('gets correct category display name', () => {
    wrapper = createTestWrapper(InstrumentSelector)
    
    const vm = wrapper.vm
    expect(vm.getCategoryDisplayName('keyboard')).toBe('Keyboards')
    expect(vm.getCategoryDisplayName('string')).toBe('Strings')
    expect(vm.getCategoryDisplayName('unknown')).toBe('unknown')
  })

  it('gets correct instrument icon', () => {
    wrapper = createTestWrapper(InstrumentSelector)
    
    const vm = wrapper.vm
    expect(vm.getInstrumentIcon('piano')).toBe('🎹')
    expect(vm.getInstrumentIcon('guitar')).toBe('🎸')
    expect(vm.getInstrumentIcon('unknown')).toBe('🎵')
  })

  it('handles missing instrument configuration', () => {
    mockInstrumentStore.currentInstrument = 'nonexistent'
    
    wrapper = createTestWrapper(InstrumentSelector)
    
    const triggerButton = wrapper.find('button')
    expect(triggerButton.text()).toContain('Loading...')
  })

  it('passes correct props to FloatingDropdown', () => {
    wrapper = createTestWrapper(InstrumentSelector, {
      props: { compact: true }
    })
    
    const dropdown = wrapper.findComponent({ name: 'FloatingDropdown' })
    expect(dropdown.props()).toEqual({
      position: 'top-left',
      maxHeight: '80vh',
      floating: false // !compact
    })
  })

  it('passes correct props to FloatingDropdown when not compact', () => {
    wrapper = createTestWrapper(InstrumentSelector, {
      props: { compact: false }
    })
    
    const dropdown = wrapper.findComponent({ name: 'FloatingDropdown' })
    expect(dropdown.props()).toEqual({
      position: 'top-left',
      maxHeight: '80vh',
      floating: true // !compact
    })
  })

  it('renders header with correct icons', () => {
    wrapper = createTestWrapper(InstrumentSelector)
    
    expect(wrapper.find('[data-testid="music-icon"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="chevron-down-icon"]').exists()).toBe(true)
  })

  it('displays current selection in panel', () => {
    mockInstrumentStore.currentInstrument = 'piano'
    
    wrapper = createTestWrapper(InstrumentSelector)
    
    const currentSelection = wrapper.find('.bg-\\[\\#00ff88\\]\\/10')
    expect(currentSelection.exists()).toBe(true)
    expect(currentSelection.text()).toContain('🎹')
    expect(currentSelection.text()).toContain('Piano')
  })

  it('handles empty instrument categories', () => {
    mockInstrumentStore.instrumentsByCategory = {}
    
    wrapper = createTestWrapper(InstrumentSelector)
    
    // Should not crash and should render empty state
    expect(wrapper.find('.flex.flex-col.gap-4').exists()).toBe(true)
    expect(wrapper.findAll('button[title]').length).toBe(0)
  })

  it('handles instrument selection with close callback', async () => {
    const mockClose = vi.fn()
    
    wrapper = createTestWrapper(InstrumentSelector)
    
    // Mock the close function passed to the slot
    const vm = wrapper.vm
    await vm.selectInstrument('guitar', mockClose)
    
    expect(mockClose).toHaveBeenCalled()
    expect(mockInstrumentStore.setInstrument).toHaveBeenCalledWith('guitar')
  })

  it('truncates long instrument names', () => {
    wrapper = createTestWrapper(InstrumentSelector)
    
    const triggerButton = wrapper.find('button')
    const nameSpan = triggerButton.find('.truncate')
    expect(nameSpan.exists()).toBe(true)
    expect(nameSpan.classes()).toContain('max-w-[120px]')
  })

  it('truncates long instrument names in compact mode', () => {
    wrapper = createTestWrapper(InstrumentSelector, {
      props: { compact: true }
    })
    
    const triggerButton = wrapper.find('button')
    const nameSpan = triggerButton.find('.truncate')
    expect(nameSpan.exists()).toBe(true)
    expect(nameSpan.classes()).toContain('max-w-[70px]')
  })
})