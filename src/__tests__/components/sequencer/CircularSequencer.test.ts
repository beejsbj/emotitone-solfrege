import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createTestWrapper } from '../../helpers/test-utils'
import CircularSequencer from '@/components/CircularSequencer.vue'
import { createMockTouchEvent } from '../../helpers/test-utils'

// Mock child components
vi.mock('@/components/sequencer/circular/CircularGrid.vue', () => ({
  default: { 
    template: '<g data-testid="circular-grid"></g>',
    props: ['centerX', 'centerY', 'tracks', 'styles', 'steps', 'getGridMarkerEnd', 'getStepPosition', 'trackSpacing', 'compact']
  }
}))

vi.mock('@/components/sequencer/circular/CircularTracks.vue', () => ({
  default: { 
    template: '<g data-testid="circular-tracks" @click="onTrackClick"></g>',
    props: ['centerX', 'centerY', 'tracks', 'styles', 'compact', 'onTrackHover', 'onTrackClick']
  }
}))

vi.mock('@/components/sequencer/circular/CircularIndicators.vue', () => ({
  default: { 
    template: '<g data-testid="circular-indicators"></g>',
    props: ['indicators', 'styles', 'selectedIndicatorId', 'createIndicatorPath', 'getIndicatorColor', 'onIndicatorStart', 'onIndicatorHover']
  }
}))

vi.mock('@/components/sequencer/circular/CircularPlayhead.vue', () => ({
  default: { 
    template: '<g data-testid="circular-playhead"></g>',
    props: ['centerX', 'centerY', 'outerRadius', 'tracks', 'isPlaying', 'currentStep', 'styles', 'trackSpacing', 'getStepPosition', 'compact']
  }
}))

vi.mock('@/components/sequencer/circular/CircularLabels.vue', () => ({
  default: { 
    template: '<g data-testid="circular-labels"></g>',
    props: ['centerX', 'centerY', 'tracks', 'styles', 'trackSpacing', 'compact']
  }
}))

// Mock store
const mockSequencerStore = {
  setActiveSequencer: vi.fn(),
  addBeatToSequencer: vi.fn(),
  removeBeatFromSequencer: vi.fn(),
  updateBeatInSequencer: vi.fn()
}

vi.mock('@/stores/sequencer', () => ({
  useSequencerStore: () => mockSequencerStore
}))

// Mock composables
const mockCircularSequencer = {
  styles: {
    dimensions: { viewBox: '0 0 400 400' },
    container: {
      background: 'rgba(0,0,0,0.1)',
      border: {
        width: '2px',
        style: 'solid',
        colorDefault: 'rgba(255,255,255,0.2)',
        colorCompact: 'rgba(255,255,255,0.1)'
      },
      shadow: 'rgba(0,0,0,0.3)'
    },
    trackCircles: {
      baseStrokeWidthRatio: 0.8
    }
  },
  tracks: [],
  indicators: [],
  currentSequencer: null,
  trackSpacing: 20,
  centerX: 200,
  centerY: 200,
  outerRadius: 180,
  innerRadius: 40,
  isPlaying: false,
  currentStep: 0,
  steps: 16,
  angleSteps: 22.5,
  getGridMarkerEnd: vi.fn(),
  getAngleFromEvent: vi.fn(),
  snapToStep: vi.fn(),
  constrainAngles: vi.fn(),
  getStepPosition: vi.fn(),
  createIndicatorPath: vi.fn(),
  getIndicatorColor: vi.fn(),
  handleTrackHover: vi.fn(),
  handleTrackDoubleClick: vi.fn()
}

const mockSequencerInteraction = {
  isDragging: { value: false },
  selectedIndicator: { value: null },
  startDrag: vi.fn(),
  handleMove: vi.fn(),
  handleEnd: vi.fn(),
  cleanup: vi.fn()
}

vi.mock('@/composables/sequencer/useCircularSequencer', () => ({
  useCircularSequencer: () => mockCircularSequencer
}))

vi.mock('@/composables/sequencer/useSequencerInteraction', () => ({
  useSequencerInteraction: () => mockSequencerInteraction
}))

// Mock haptic feedback
vi.mock('@/utils/hapticFeedback', () => ({
  triggerUIHaptic: vi.fn()
}))

describe('CircularSequencer.vue', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock state
    mockSequencerInteraction.isDragging.value = false
    mockSequencerInteraction.selectedIndicator.value = null
    mockCircularSequencer.isPlaying = false
    mockCircularSequencer.currentStep = 0
    mockCircularSequencer.indicators = []
    mockCircularSequencer.tracks = []
    
    // Reset mock functions
    mockCircularSequencer.handleTrackDoubleClick.mockReturnValue(true)
    mockCircularSequencer.constrainAngles.mockReturnValue({
      startAngle: 0,
      endAngle: 22.5
    })
    mockSequencerInteraction.handleMove.mockReturnValue({
      deltaX: 0,
      deltaY: 0,
      moved: false,
      horizontalSensitivity: 0.1,
      durationSensitivity: 0.05
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  it('renders correctly', () => {
    wrapper = createTestWrapper(CircularSequencer, {
      props: { sequencerId: 'test-seq' }
    })
    
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('[data-testid="circular-grid"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="circular-tracks"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="circular-indicators"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="circular-playhead"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="circular-labels"]').exists()).toBe(true)
  })

  it('renders with correct props', () => {
    wrapper = createTestWrapper(CircularSequencer, {
      props: { 
        sequencerId: 'test-seq',
        compact: true,
        expanded: false
      }
    })
    
    const svg = wrapper.find('svg')
    expect(svg.attributes('viewBox')).toBe('0 0 400 400')
    expect(svg.classes()).toContain('cursor-pointer')
  })

  it('renders in expanded mode', () => {
    wrapper = createTestWrapper(CircularSequencer, {
      props: { 
        sequencerId: 'test-seq',
        expanded: true
      }
    })
    
    const svg = wrapper.find('svg')
    expect(svg.classes()).toContain('cursor-crosshair')
  })

  it('renders in compact mode', () => {
    wrapper = createTestWrapper(CircularSequencer, {
      props: { 
        sequencerId: 'test-seq',
        compact: true
      }
    })
    
    const svg = wrapper.find('svg')
    expect(svg.classes()).toContain('cursor-pointer')
    
    const container = wrapper.find('.relative')
    expect(container.classes()).toContain('p-0')
  })

  it('handles container click in compact mode', async () => {
    wrapper = createTestWrapper(CircularSequencer, {
      props: { 
        sequencerId: 'test-seq',
        compact: true
      }
    })
    
    const svg = wrapper.find('svg')
    await svg.trigger('click')
    
    expect(mockSequencerStore.setActiveSequencer).toHaveBeenCalledWith('test-seq')
    expect(require('@/utils/hapticFeedback').triggerUIHaptic).toHaveBeenCalled()
  })

  it('does not handle container click in expanded mode', async () => {
    wrapper = createTestWrapper(CircularSequencer, {
      props: { 
        sequencerId: 'test-seq',
        expanded: true
      }
    })
    
    const svg = wrapper.find('svg')
    await svg.trigger('click')
    
    expect(mockSequencerStore.setActiveSequencer).not.toHaveBeenCalled()
  })

  it('handles track click to add beat', async () => {
    const mockTrack = { id: 'track1', solfege: 'Do' }
    const mockBeat = { id: 'beat1', step: 0, solfege: 'Do' }
    
    mockCircularSequencer.handleTrackDoubleClick.mockImplementation((e, track, svgEl, callback) => {
      callback(mockBeat)
      return true
    })
    
    wrapper = createTestWrapper(CircularSequencer, {
      props: { sequencerId: 'test-seq' }
    })
    
    const vm = wrapper.vm
    const mockEvent = new MouseEvent('click', { bubbles: true })
    
    await vm.handleTrackClick(mockEvent, mockTrack)
    
    expect(mockSequencerStore.addBeatToSequencer).toHaveBeenCalledWith('test-seq', mockBeat)
    expect(require('@/utils/hapticFeedback').triggerUIHaptic).toHaveBeenCalled()
  })

  it('does not handle track click when dragging', async () => {
    mockSequencerInteraction.isDragging.value = true
    
    wrapper = createTestWrapper(CircularSequencer, {
      props: { sequencerId: 'test-seq' }
    })
    
    const vm = wrapper.vm
    const mockEvent = new MouseEvent('click', { bubbles: true })
    const mockTrack = { id: 'track1', solfege: 'Do' }
    
    await vm.handleTrackClick(mockEvent, mockTrack)
    
    expect(mockCircularSequencer.handleTrackDoubleClick).not.toHaveBeenCalled()
  })

  it('does not handle track click in compact mode', async () => {
    wrapper = createTestWrapper(CircularSequencer, {
      props: { sequencerId: 'test-seq', compact: true }
    })
    
    const vm = wrapper.vm
    const mockEvent = new MouseEvent('click', { bubbles: true })
    const mockTrack = { id: 'track1', solfege: 'Do' }
    
    await vm.handleTrackClick(mockEvent, mockTrack)
    
    expect(mockCircularSequencer.handleTrackDoubleClick).not.toHaveBeenCalled()
  })

  it('handles indicator start drag', async () => {
    wrapper = createTestWrapper(CircularSequencer, {
      props: { sequencerId: 'test-seq' }
    })
    
    const vm = wrapper.vm
    const mockIndicator = { id: 'indicator1', startAngle: 0, endAngle: 22.5 }
    const mockEvent = new MouseEvent('mousedown', { bubbles: true })
    
    await vm.handleIndicatorStart(mockEvent, mockIndicator)
    
    expect(mockSequencerInteraction.startDrag).toHaveBeenCalledWith(
      mockEvent, 
      mockIndicator, 
      expect.any(Function)
    )
  })

  it('does not handle indicator start in compact mode', async () => {
    wrapper = createTestWrapper(CircularSequencer, {
      props: { sequencerId: 'test-seq', compact: true }
    })
    
    const vm = wrapper.vm
    const mockIndicator = { id: 'indicator1', startAngle: 0, endAngle: 22.5 }
    const mockEvent = new MouseEvent('mousedown', { bubbles: true })
    
    await vm.handleIndicatorStart(mockEvent, mockIndicator)
    
    expect(mockSequencerInteraction.startDrag).not.toHaveBeenCalled()
  })

  it('handles indicator removal', async () => {
    wrapper = createTestWrapper(CircularSequencer, {
      props: { sequencerId: 'test-seq' }
    })
    
    const vm = wrapper.vm
    await vm.removeIndicator('indicator1')
    
    expect(mockSequencerStore.removeBeatFromSequencer).toHaveBeenCalledWith('test-seq', 'indicator1')
    expect(require('@/utils/hapticFeedback').triggerUIHaptic).toHaveBeenCalled()
  })

  it('handles custom move for horizontal movement', async () => {
    mockSequencerInteraction.selectedIndicator.value = {
      id: 'indicator1',
      startAngle: 0,
      endAngle: 22.5
    }
    
    mockSequencerInteraction.handleMove.mockReturnValue({
      deltaX: 10,
      deltaY: 2,
      moved: true,
      horizontalSensitivity: 0.1,
      durationSensitivity: 0.05
    })
    
    wrapper = createTestWrapper(CircularSequencer, {
      props: { sequencerId: 'test-seq' }
    })
    
    const vm = wrapper.vm
    const mockEvent = new MouseEvent('mousemove', { bubbles: true })
    
    await vm.handleCustomMove(mockEvent)
    
    expect(mockSequencerStore.updateBeatInSequencer).toHaveBeenCalledWith(
      'test-seq',
      'indicator1',
      { step: expect.any(Number) }
    )
  })

  it('handles custom move for vertical movement', async () => {
    mockSequencerInteraction.selectedIndicator.value = {
      id: 'indicator1',
      startAngle: 0,
      endAngle: 22.5
    }
    
    mockSequencerInteraction.handleMove.mockReturnValue({
      deltaX: 2,
      deltaY: -10,
      moved: true,
      horizontalSensitivity: 0.1,
      durationSensitivity: 0.05
    })
    
    wrapper = createTestWrapper(CircularSequencer, {
      props: { sequencerId: 'test-seq' }
    })
    
    const vm = wrapper.vm
    const mockEvent = new MouseEvent('mousemove', { bubbles: true })
    
    await vm.handleCustomMove(mockEvent)
    
    expect(mockSequencerStore.updateBeatInSequencer).toHaveBeenCalledWith(
      'test-seq',
      'indicator1',
      { duration: expect.any(Number) }
    )
  })

  it('handles touch events for indicator start', async () => {
    wrapper = createTestWrapper(CircularSequencer, {
      props: { sequencerId: 'test-seq' }
    })
    
    const vm = wrapper.vm
    const mockIndicator = { id: 'indicator1', startAngle: 0, endAngle: 22.5 }
    const mockTouchEvent = createMockTouchEvent('touchstart', [
      { clientX: 100, clientY: 100 }
    ])
    
    await vm.handleIndicatorStart(mockTouchEvent, mockIndicator)
    
    expect(mockSequencerInteraction.startDrag).toHaveBeenCalledWith(
      mockTouchEvent, 
      mockIndicator, 
      expect.any(Function)
    )
  })

  it('passes correct props to child components', () => {
    mockCircularSequencer.tracks = [{ id: 'track1', solfege: 'Do' }]
    mockCircularSequencer.indicators = [{ id: 'indicator1' }]
    
    wrapper = createTestWrapper(CircularSequencer, {
      props: { sequencerId: 'test-seq', compact: true }
    })
    
    const gridComponent = wrapper.findComponent({ name: 'CircularGrid' })
    expect(gridComponent.props()).toEqual({
      centerX: 200,
      centerY: 200,
      tracks: mockCircularSequencer.tracks,
      styles: mockCircularSequencer.styles,
      steps: 16,
      getGridMarkerEnd: mockCircularSequencer.getGridMarkerEnd,
      getStepPosition: mockCircularSequencer.getStepPosition,
      trackSpacing: 20,
      compact: true
    })
    
    const indicatorsComponent = wrapper.findComponent({ name: 'CircularIndicators' })
    expect(indicatorsComponent.props()).toEqual({
      indicators: mockCircularSequencer.indicators,
      styles: mockCircularSequencer.styles,
      selectedIndicatorId: null,
      createIndicatorPath: mockCircularSequencer.createIndicatorPath,
      getIndicatorColor: mockCircularSequencer.getIndicatorColor,
      onIndicatorStart: expect.any(Function),
      onIndicatorHover: expect.any(Function)
    })
  })

  it('applies correct styles based on mode', () => {
    wrapper = createTestWrapper(CircularSequencer, {
      props: { sequencerId: 'test-seq', compact: true }
    })
    
    const svg = wrapper.find('svg')
    const style = svg.attributes('style')
    
    expect(style).toContain('background: transparent')
    expect(style).toContain('border-width: 0px')
    expect(style).toContain('box-shadow: none')
  })

  it('applies correct styles in expanded mode', () => {
    wrapper = createTestWrapper(CircularSequencer, {
      props: { sequencerId: 'test-seq', expanded: true }
    })
    
    const svg = wrapper.find('svg')
    const style = svg.attributes('style')
    
    expect(style).toContain('background: rgba(0,0,0,0.1)')
    expect(style).toContain('border-width: 2px')
    expect(style).toContain('box-shadow: 0 0 20px rgba(0,0,0,0.3)')
  })

  it('cleans up on unmount', () => {
    wrapper = createTestWrapper(CircularSequencer, {
      props: { sequencerId: 'test-seq' }
    })
    
    wrapper.unmount()
    
    expect(mockSequencerInteraction.cleanup).toHaveBeenCalled()
  })

  it('handles haptic feedback for step snapping', async () => {
    mockSequencerInteraction.selectedIndicator.value = {
      id: 'indicator1',
      startAngle: 0,
      endAngle: 22.5
    }
    
    mockSequencerInteraction.handleMove.mockReturnValue({
      deltaX: 10,
      deltaY: 2,
      moved: true,
      horizontalSensitivity: 0.1,
      durationSensitivity: 0.05
    })
    
    wrapper = createTestWrapper(CircularSequencer, {
      props: { sequencerId: 'test-seq' }
    })
    
    const vm = wrapper.vm
    const mockEvent = new MouseEvent('mousemove', { bubbles: true })
    
    // First move should trigger haptic
    await vm.handleCustomMove(mockEvent)
    expect(require('@/utils/hapticFeedback').triggerUIHaptic).toHaveBeenCalled()
    
    // Reset mock
    vi.clearAllMocks()
    
    // Same move should not trigger haptic again
    await vm.handleCustomMove(mockEvent)
    expect(require('@/utils/hapticFeedback').triggerUIHaptic).not.toHaveBeenCalled()
  })

  it('handles minimum duration constraint', async () => {
    mockSequencerInteraction.selectedIndicator.value = {
      id: 'indicator1',
      startAngle: 0,
      endAngle: 22.5
    }
    
    mockSequencerInteraction.handleMove.mockReturnValue({
      deltaX: 2,
      deltaY: 100, // Large positive value to reduce duration
      moved: true,
      horizontalSensitivity: 0.1,
      durationSensitivity: 0.05
    })
    
    wrapper = createTestWrapper(CircularSequencer, {
      props: { sequencerId: 'test-seq' }
    })
    
    const vm = wrapper.vm
    const mockEvent = new MouseEvent('mousemove', { bubbles: true })
    
    await vm.handleCustomMove(mockEvent)
    
    expect(mockSequencerStore.updateBeatInSequencer).toHaveBeenCalledWith(
      'test-seq',
      'indicator1',
      { duration: 1 } // Should be minimum 1
    )
  })

  it('handles missing sequencerId gracefully', async () => {
    wrapper = createTestWrapper(CircularSequencer, {
      props: { sequencerId: undefined }
    })
    
    const vm = wrapper.vm
    const mockEvent = new MouseEvent('click', { bubbles: true })
    const mockTrack = { id: 'track1', solfege: 'Do' }
    
    await vm.handleTrackClick(mockEvent, mockTrack)
    
    expect(mockSequencerStore.addBeatToSequencer).not.toHaveBeenCalled()
  })
})