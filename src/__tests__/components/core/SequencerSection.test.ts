import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createTestWrapper } from '../../helpers/test-utils'
import SequencerSection from '@/components/SequencerSection.vue'

// Mock child components
vi.mock('@/components/SequencerGrid.vue', () => ({
  default: { template: '<div data-testid="sequencer-grid">Sequencer Grid</div>' }
}))

// Mock store
const mockSequencerStore = {
  activeSequencer: null,
  config: {
    activeSequencerId: null
  }
}

vi.mock('@/stores/sequencer', () => ({
  useSequencerStore: () => mockSequencerStore
}))

describe('SequencerSection.vue', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock store state
    mockSequencerStore.activeSequencer = null
    mockSequencerStore.config.activeSequencerId = null
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  it('renders correctly', () => {
    wrapper = createTestWrapper(SequencerSection)
    
    expect(wrapper.find('[data-testid="sequencer-grid"]').exists()).toBe(true)
  })

  it('has correct structure and classes', () => {
    wrapper = createTestWrapper(SequencerSection)
    
    const container = wrapper.find('.space-y-4')
    expect(container.exists()).toBe(true)
    
    const gridContainer = wrapper.find('.flex.justify-center')
    expect(gridContainer.exists()).toBe(true)
    
    const gridWrapper = wrapper.find('.w-full.max-w-4xl')
    expect(gridWrapper.exists()).toBe(true)
    expect(gridWrapper.classes()).toContain('w-full')
    expect(gridWrapper.classes()).toContain('max-w-4xl')
  })

  it('renders SequencerGrid component', () => {
    wrapper = createTestWrapper(SequencerSection)
    
    const sequencerGrid = wrapper.findComponent({ name: 'SequencerGrid' })
    expect(sequencerGrid.exists()).toBe(true)
  })

  it('computes activeSequencer correctly', async () => {
    const mockActiveSequencer = {
      id: 'test-sequencer',
      name: 'Test Sequencer',
      tracks: []
    }
    
    mockSequencerStore.activeSequencer = mockActiveSequencer
    
    wrapper = createTestWrapper(SequencerSection)
    await nextTick()
    
    const vm = wrapper.vm
    expect(vm.activeSequencer).toEqual(mockActiveSequencer)
  })

  it('computes activeSequencerId correctly', async () => {
    const testId = 'test-sequencer-id'
    mockSequencerStore.config.activeSequencerId = testId
    
    wrapper = createTestWrapper(SequencerSection)
    await nextTick()
    
    const vm = wrapper.vm
    expect(vm.activeSequencerId).toBe(testId)
  })

  it('updates when store activeSequencer changes', async () => {
    wrapper = createTestWrapper(SequencerSection)
    
    // Initially null
    expect(wrapper.vm.activeSequencer).toBeNull()
    
    // Change store value
    const newActiveSequencer = {
      id: 'new-sequencer',
      name: 'New Sequencer',
      tracks: []
    }
    mockSequencerStore.activeSequencer = newActiveSequencer
    
    await nextTick()
    expect(wrapper.vm.activeSequencer).toEqual(newActiveSequencer)
  })

  it('updates when store activeSequencerId changes', async () => {
    wrapper = createTestWrapper(SequencerSection)
    
    // Initially null
    expect(wrapper.vm.activeSequencerId).toBeNull()
    
    // Change store value
    const newId = 'new-sequencer-id'
    mockSequencerStore.config.activeSequencerId = newId
    
    await nextTick()
    expect(wrapper.vm.activeSequencerId).toBe(newId)
  })

  it('uses useSequencerStore correctly', () => {
    wrapper = createTestWrapper(SequencerSection)
    
    // Verify store is being used
    expect(vi.mocked(require('@/stores/sequencer').useSequencerStore)).toHaveBeenCalled()
  })

  it('has responsive design classes', () => {
    wrapper = createTestWrapper(SequencerSection)
    
    const container = wrapper.find('.space-y-4')
    expect(container.classes()).toContain('space-y-4')
    
    const centerContainer = wrapper.find('.flex.justify-center')
    expect(centerContainer.classes()).toContain('flex')
    expect(centerContainer.classes()).toContain('justify-center')
    
    const gridWrapper = wrapper.find('.w-full.max-w-4xl')
    expect(gridWrapper.classes()).toContain('w-full')
    expect(gridWrapper.classes()).toContain('max-w-4xl')
  })

  it('handles undefined activeSequencer gracefully', () => {
    mockSequencerStore.activeSequencer = undefined
    
    wrapper = createTestWrapper(SequencerSection)
    
    expect(() => wrapper.vm.activeSequencer).not.toThrow()
    expect(wrapper.vm.activeSequencer).toBeUndefined()
  })

  it('handles undefined activeSequencerId gracefully', () => {
    mockSequencerStore.config.activeSequencerId = undefined
    
    wrapper = createTestWrapper(SequencerSection)
    
    expect(() => wrapper.vm.activeSequencerId).not.toThrow()
    expect(wrapper.vm.activeSequencerId).toBeUndefined()
  })
})