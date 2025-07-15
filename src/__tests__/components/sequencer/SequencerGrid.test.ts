import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createTestWrapper } from '../../helpers/test-utils'
import SequencerGrid from '@/components/SequencerGrid.vue'

// Mock child components
vi.mock('@/components/CircularSequencer.vue', () => ({
  default: { 
    template: '<div data-testid="circular-sequencer" :data-expanded="expanded" :data-sequencer-id="sequencerId">Circular Sequencer</div>',
    props: ['expanded', 'sequencerId']
  }
}))

vi.mock('@/components/SequencerInstanceControls.vue', () => ({
  default: { template: '<div data-testid="sequencer-instance-controls">Instance Controls</div>' }
}))

vi.mock('@/components/sequencer/grid/SequencerGridItem.vue', () => ({
  default: { 
    template: '<div data-testid="sequencer-grid-item" @click="onPressStart(sequencer.id)">Grid Item</div>',
    props: ['sequencer', 'isActive', 'isPressed', 'getThemeColor', 'getSequencerIcon', 'onPressStart', 'onPressEnd']
  }
}))

vi.mock('@/components/sequencer/grid/SequencerGridEmpty.vue', () => ({
  default: { 
    template: '<div data-testid="sequencer-grid-empty" @click="onAdd">Empty Slot</div>',
    props: ['canAdd', 'onAdd']
  }
}))

vi.mock('@/components/sequencer/grid/SequencerGridOverlays.vue', () => ({
  default: { 
    template: '<div data-testid="sequencer-grid-overlays">Overlays</div>',
    props: ['sequencer', 'isActive', 'isPressed', 'getThemeColor']
  }
}))

// Mock composables
const mockSequencerGrid = {
  sequencers: [],
  activeSequencer: null,
  gridSlots: [],
  canAddSequencer: true,
  getThemeColor: vi.fn(() => 'hsl(120, 50%, 50%)'),
  getSequencerIcon: vi.fn(() => 'icon'),
  getSlotKey: vi.fn((slot) => slot.id || 'empty'),
  isActiveSlot: vi.fn(() => false),
  addNewSequencer: vi.fn(() => true)
}

const mockSequencerTransport = {
  handleSequencerPressStart: vi.fn(),
  handleSequencerPressEnd: vi.fn(),
  isPressedState: vi.fn(() => false),
  cleanup: vi.fn()
}

vi.mock('@/composables/sequencer/useSequencerGrid', () => ({
  useSequencerGrid: () => mockSequencerGrid
}))

vi.mock('@/composables/sequencer/useSequencerTransport', () => ({
  useSequencerTransport: () => mockSequencerTransport
}))

// Mock haptic feedback
vi.mock('@/utils/hapticFeedback', () => ({
  triggerUIHaptic: vi.fn()
}))

describe('SequencerGrid.vue', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock state
    mockSequencerGrid.sequencers = []
    mockSequencerGrid.activeSequencer = null
    mockSequencerGrid.gridSlots = [
      { type: 'empty', id: 'empty-1' },
      { type: 'empty', id: 'empty-2' }
    ]
    mockSequencerGrid.canAddSequencer = true
    mockSequencerGrid.isActiveSlot.mockReturnValue(false)
    mockSequencerTransport.isPressedState.mockReturnValue(false)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  it('renders correctly', () => {
    wrapper = createTestWrapper(SequencerGrid)
    
    expect(wrapper.find('.flex.flex-col.h-full.space-y-4').exists()).toBe(true)
    expect(wrapper.find('.grid.grid-cols-4.gap-1.px-1').exists()).toBe(true)
  })

  it('shows expanded sequencer view when active sequencer exists', () => {
    mockSequencerGrid.activeSequencer = { id: 'seq1', name: 'Test Sequencer' }
    
    wrapper = createTestWrapper(SequencerGrid)
    
    const expandedView = wrapper.find('.transition-opacity.duration-300')
    expect(expandedView.classes()).toContain('opacity-100')
    expect(expandedView.classes()).not.toContain('opacity-0')
    expect(expandedView.classes()).not.toContain('pointer-events-none')
  })

  it('hides expanded sequencer view when no active sequencer', () => {
    mockSequencerGrid.activeSequencer = null
    
    wrapper = createTestWrapper(SequencerGrid)
    
    const expandedView = wrapper.find('.transition-opacity.duration-300')
    expect(expandedView.classes()).toContain('opacity-0')
    expect(expandedView.classes()).toContain('pointer-events-none')
  })

  it('renders CircularSequencer with correct props', () => {
    mockSequencerGrid.activeSequencer = { id: 'seq1', name: 'Test Sequencer' }
    
    wrapper = createTestWrapper(SequencerGrid)
    
    const circularSequencer = wrapper.find('[data-testid="circular-sequencer"]')
    expect(circularSequencer.exists()).toBe(true)
    expect(circularSequencer.attributes('data-expanded')).toBe('true')
    expect(circularSequencer.attributes('data-sequencer-id')).toBe('seq1')
  })

  it('renders SequencerInstanceControls', () => {
    mockSequencerGrid.activeSequencer = { id: 'seq1', name: 'Test Sequencer' }
    
    wrapper = createTestWrapper(SequencerGrid)
    
    const instanceControls = wrapper.find('[data-testid="sequencer-instance-controls"]')
    expect(instanceControls.exists()).toBe(true)
  })

  it('renders grid slots correctly', () => {
    mockSequencerGrid.gridSlots = [
      { type: 'sequencer', sequencer: { id: 'seq1', name: 'Test Seq' } },
      { type: 'empty', id: 'empty-1' },
      { type: 'empty', id: 'empty-2' }
    ]
    
    wrapper = createTestWrapper(SequencerGrid)
    
    const gridItems = wrapper.findAll('.grid > div')
    expect(gridItems.length).toBe(3)
    
    expect(wrapper.find('[data-testid="sequencer-grid-item"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="sequencer-grid-empty"]').length).toBe(2)
  })

  it('renders sequencer grid item with correct props', () => {
    const mockSequencer = { id: 'seq1', name: 'Test Seq' }
    mockSequencerGrid.gridSlots = [
      { type: 'sequencer', sequencer: mockSequencer }
    ]
    mockSequencerGrid.isActiveSlot.mockReturnValue(true)
    mockSequencerTransport.isPressedState.mockReturnValue(false)
    
    wrapper = createTestWrapper(SequencerGrid)
    
    const gridItem = wrapper.findComponent({ name: 'SequencerGridItem' })
    expect(gridItem.exists()).toBe(true)
    expect(gridItem.props()).toEqual({
      sequencer: mockSequencer,
      isActive: true,
      isPressed: false,
      getThemeColor: mockSequencerGrid.getThemeColor,
      getSequencerIcon: mockSequencerGrid.getSequencerIcon,
      onPressStart: mockSequencerTransport.handleSequencerPressStart,
      onPressEnd: mockSequencerTransport.handleSequencerPressEnd
    })
  })

  it('renders empty grid slot with correct props', () => {
    mockSequencerGrid.gridSlots = [
      { type: 'empty', id: 'empty-1' }
    ]
    mockSequencerGrid.canAddSequencer = false
    
    wrapper = createTestWrapper(SequencerGrid)
    
    const emptySlot = wrapper.findComponent({ name: 'SequencerGridEmpty' })
    expect(emptySlot.exists()).toBe(true)
    expect(emptySlot.props()).toEqual({
      canAdd: false,
      onAdd: expect.any(Function)
    })
  })

  it('renders overlays for sequencer slots', () => {
    const mockSequencer = { id: 'seq1', name: 'Test Seq' }
    mockSequencerGrid.gridSlots = [
      { type: 'sequencer', sequencer: mockSequencer }
    ]
    
    wrapper = createTestWrapper(SequencerGrid)
    
    const overlays = wrapper.find('[data-testid="sequencer-grid-overlays"]')
    expect(overlays.exists()).toBe(true)
  })

  it('does not render overlays for empty slots', () => {
    mockSequencerGrid.gridSlots = [
      { type: 'empty', id: 'empty-1' }
    ]
    
    wrapper = createTestWrapper(SequencerGrid)
    
    const overlays = wrapper.find('[data-testid="sequencer-grid-overlays"]')
    expect(overlays.exists()).toBe(false)
  })

  it('handles add new sequencer', async () => {
    mockSequencerGrid.gridSlots = [
      { type: 'empty', id: 'empty-1' }
    ]
    mockSequencerGrid.addNewSequencer.mockReturnValue(true)
    
    wrapper = createTestWrapper(SequencerGrid)
    
    const emptySlot = wrapper.find('[data-testid="sequencer-grid-empty"]')
    await emptySlot.trigger('click')
    
    expect(mockSequencerGrid.addNewSequencer).toHaveBeenCalled()
    expect(require('@/utils/hapticFeedback').triggerUIHaptic).toHaveBeenCalled()
  })

  it('handles add new sequencer failure', async () => {
    mockSequencerGrid.gridSlots = [
      { type: 'empty', id: 'empty-1' }
    ]
    mockSequencerGrid.addNewSequencer.mockReturnValue(false)
    
    wrapper = createTestWrapper(SequencerGrid)
    
    const emptySlot = wrapper.find('[data-testid="sequencer-grid-empty"]')
    await emptySlot.trigger('click')
    
    expect(mockSequencerGrid.addNewSequencer).toHaveBeenCalled()
    expect(require('@/utils/hapticFeedback').triggerUIHaptic).not.toHaveBeenCalled()
  })

  it('handles sequencer press start', async () => {
    const mockSequencer = { id: 'seq1', name: 'Test Seq' }
    mockSequencerGrid.gridSlots = [
      { type: 'sequencer', sequencer: mockSequencer }
    ]
    
    wrapper = createTestWrapper(SequencerGrid)
    
    const gridItem = wrapper.find('[data-testid="sequencer-grid-item"]')
    await gridItem.trigger('click')
    
    expect(mockSequencerTransport.handleSequencerPressStart).toHaveBeenCalledWith('seq1')
  })

  it('generates correct slot keys', () => {
    mockSequencerGrid.gridSlots = [
      { type: 'sequencer', sequencer: { id: 'seq1', name: 'Test Seq' } },
      { type: 'empty', id: 'empty-1' }
    ]
    
    mockSequencerGrid.getSlotKey.mockImplementation((slot) => {
      return slot.type === 'sequencer' ? slot.sequencer.id : slot.id
    })
    
    wrapper = createTestWrapper(SequencerGrid)
    
    const gridItems = wrapper.findAll('.grid > div')
    gridItems.forEach((item, index) => {
      expect(mockSequencerGrid.getSlotKey).toHaveBeenCalledWith(mockSequencerGrid.gridSlots[index])
    })
  })

  it('applies correct CSS classes', () => {
    wrapper = createTestWrapper(SequencerGrid)
    
    const container = wrapper.find('.flex.flex-col.h-full.space-y-4')
    expect(container.classes()).toEqual(['flex', 'flex-col', 'h-full', 'space-y-4'])
    
    const expandedView = wrapper.find('.transition-opacity.duration-300')
    expect(expandedView.classes()).toContain('transition-opacity')
    expect(expandedView.classes()).toContain('duration-300')
    
    const grid = wrapper.find('.grid.grid-cols-4.gap-1.px-1')
    expect(grid.classes()).toEqual(['grid', 'grid-cols-4', 'gap-1', 'px-1'])
  })

  it('applies hover and transition classes to grid items', () => {
    mockSequencerGrid.gridSlots = [
      { type: 'empty', id: 'empty-1' }
    ]
    
    wrapper = createTestWrapper(SequencerGrid)
    
    const gridItem = wrapper.find('.grid > div')
    expect(gridItem.classes()).toContain('relative')
    expect(gridItem.classes()).toContain('group')
    expect(gridItem.classes()).toContain('cursor-pointer')
    expect(gridItem.classes()).toContain('transition-all')
    expect(gridItem.classes()).toContain('duration-200')
    expect(gridItem.classes()).toContain('hover:scale-105')
  })

  it('cleans up on unmount', () => {
    wrapper = createTestWrapper(SequencerGrid)
    
    wrapper.unmount()
    
    expect(mockSequencerTransport.cleanup).toHaveBeenCalled()
  })

  it('uses composables correctly', () => {
    wrapper = createTestWrapper(SequencerGrid)
    
    expect(vi.mocked(require('@/composables/sequencer/useSequencerGrid').useSequencerGrid)).toHaveBeenCalled()
    expect(vi.mocked(require('@/composables/sequencer/useSequencerTransport').useSequencerTransport)).toHaveBeenCalled()
  })

  it('handles missing sequencer in grid item', () => {
    mockSequencerGrid.gridSlots = [
      { type: 'sequencer', sequencer: undefined }
    ]
    
    wrapper = createTestWrapper(SequencerGrid)
    
    // Should not crash
    expect(wrapper.find('[data-testid="sequencer-grid-item"]').exists()).toBe(true)
  })

  it('handles multiple sequencers in grid', () => {
    mockSequencerGrid.gridSlots = [
      { type: 'sequencer', sequencer: { id: 'seq1', name: 'Seq 1' } },
      { type: 'sequencer', sequencer: { id: 'seq2', name: 'Seq 2' } },
      { type: 'empty', id: 'empty-1' },
      { type: 'empty', id: 'empty-2' }
    ]
    
    wrapper = createTestWrapper(SequencerGrid)
    
    expect(wrapper.findAll('[data-testid="sequencer-grid-item"]').length).toBe(2)
    expect(wrapper.findAll('[data-testid="sequencer-grid-empty"]').length).toBe(2)
    expect(wrapper.findAll('[data-testid="sequencer-grid-overlays"]').length).toBe(2)
  })

  it('maintains responsive grid layout', () => {
    mockSequencerGrid.gridSlots = Array(16).fill(null).map((_, i) => ({
      type: 'empty',
      id: `empty-${i}`
    }))
    
    wrapper = createTestWrapper(SequencerGrid)
    
    const grid = wrapper.find('.grid.grid-cols-4')
    expect(grid.classes()).toContain('grid-cols-4')
    expect(wrapper.findAll('.grid > div').length).toBe(16)
  })
})