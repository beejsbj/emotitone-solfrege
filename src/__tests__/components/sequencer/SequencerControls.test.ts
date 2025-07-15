import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createTestWrapper } from '../../helpers/test-utils'
import SequencerControls from '@/components/SequencerControls.vue'

// Mock child components
vi.mock('@/components/MelodyLibrary.vue', () => ({
  default: { template: '<div data-testid="melody-library">Melody Library</div>' }
}))

vi.mock('@/components/knobs', () => ({
  Knob: {
    template: '<div data-testid="knob" :data-type="type" :data-label="label" @click="$emit(\'click\')" @update:modelValue="$emit(\'update:modelValue\', $event)">{{ label }}</div>',
    props: ['type', 'label', 'modelValue', 'min', 'max', 'icon', 'readyColor', 'activeColor', 'isDisabled', 'isActive', 'formatValue', 'themeColor', 'isDisplay'],
    emits: ['click', 'update:modelValue']
  }
}))

vi.mock('lucide-vue-next', () => ({
  Play: 'PlayIcon',
  Square: 'SquareIcon'
}))

// Mock stores
const mockSequencerStore = {
  sequencers: [],
  config: {
    activeSequencerId: null,
    globalIsPlaying: false,
    tempo: 120,
    steps: 16
  },
  playingSequencers: [],
  activeSequencer: null,
  setTempo: vi.fn(),
  startAllSequencers: vi.fn(),
  stopAllSequencers: vi.fn(),
  startSequencer: vi.fn(),
  stopSequencer: vi.fn(),
  deleteSequencer: vi.fn(),
  initialize: vi.fn()
}

const mockMusicStore = {
  releaseAllNotes: vi.fn()
}

vi.mock('@/stores/sequencer', () => ({
  useSequencerStore: () => mockSequencerStore
}))

vi.mock('@/stores/music', () => ({
  useMusicStore: () => mockMusicStore
}))

// Mock MultiSequencerTransport
const mockMultiTransport = {
  startAll: vi.fn(),
  stopAll: vi.fn(),
  startSequencer: vi.fn(),
  stopSequencer: vi.fn(),
  updateTempo: vi.fn(),
  dispose: vi.fn()
}

vi.mock('@/utils/sequencer/index', () => ({
  MultiSequencerTransport: vi.fn().mockImplementation(() => mockMultiTransport)
}))

// Mock Tone.js
vi.mock('tone', () => ({
  getContext: () => ({
    state: 'running'
  }),
  start: vi.fn().mockResolvedValue(undefined)
}))

// Mock other dependencies
vi.mock('@/data/instruments', () => ({
  AVAILABLE_INSTRUMENTS: []
}))

vi.mock('@/utils/hapticFeedback', () => ({
  triggerUIHaptic: vi.fn()
}))

describe('SequencerControls.vue', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock store state
    mockSequencerStore.sequencers = []
    mockSequencerStore.config = {
      activeSequencerId: null,
      globalIsPlaying: false,
      tempo: 120,
      steps: 16
    }
    mockSequencerStore.playingSequencers = []
    mockSequencerStore.activeSequencer = null
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  it('renders correctly', () => {
    wrapper = createTestWrapper(SequencerControls)
    
    expect(wrapper.find('.bg-gray-900\\/95.backdrop-blur-sm').exists()).toBe(true)
    expect(wrapper.find('[data-testid="melody-library"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="knob"]').length).toBeGreaterThan(0)
  })

  it('displays master play button correctly', () => {
    wrapper = createTestWrapper(SequencerControls)
    
    const masterKnob = wrapper.find('[data-testid="knob"][data-type="button"][data-label="Master"]')
    expect(masterKnob.exists()).toBe(true)
  })

  it('displays tempo control correctly', () => {
    wrapper = createTestWrapper(SequencerControls)
    
    const tempoKnob = wrapper.find('[data-testid="knob"][data-type="range"][data-label="Tempo"]')
    expect(tempoKnob.exists()).toBe(true)
  })

  it('displays current step correctly', () => {
    wrapper = createTestWrapper(SequencerControls)
    
    const stepKnob = wrapper.find('[data-testid="knob"][data-type="range"][data-label="Step"]')
    expect(stepKnob.exists()).toBe(true)
  })

  it('initializes store on mount', async () => {
    wrapper = createTestWrapper(SequencerControls)
    await nextTick()
    
    expect(mockSequencerStore.initialize).toHaveBeenCalled()
  })

  it('handles tempo updates', async () => {
    wrapper = createTestWrapper(SequencerControls)
    
    const tempoKnob = wrapper.find('[data-testid="knob"][data-type="range"][data-label="Tempo"]')
    await tempoKnob.trigger('update:modelValue', 140)
    
    expect(mockSequencerStore.setTempo).toHaveBeenCalledWith(140)
  })

  it('handles global playback toggle when not playing', async () => {
    mockSequencerStore.config.globalIsPlaying = false
    mockSequencerStore.sequencers = [
      { id: 'seq1', beats: [{ id: 'beat1' }] }
    ]
    
    wrapper = createTestWrapper(SequencerControls)
    
    const masterKnob = wrapper.find('[data-testid="knob"][data-type="button"][data-label="Master"]')
    await masterKnob.trigger('click')
    
    expect(mockSequencerStore.startAllSequencers).toHaveBeenCalled()
  })

  it('handles global playback toggle when playing', async () => {
    mockSequencerStore.config.globalIsPlaying = true
    
    wrapper = createTestWrapper(SequencerControls)
    
    const masterKnob = wrapper.find('[data-testid="knob"][data-type="button"][data-label="Master"]')
    await masterKnob.trigger('click')
    
    expect(mockSequencerStore.stopAllSequencers).toHaveBeenCalled()
    expect(mockMusicStore.releaseAllNotes).toHaveBeenCalled()
  })

  it('disables master play button when no beats', () => {
    mockSequencerStore.sequencers = []
    
    wrapper = createTestWrapper(SequencerControls)
    
    const vm = wrapper.vm
    expect(vm.totalBeats).toBe(0)
  })

  it('calculates total beats correctly', () => {
    mockSequencerStore.sequencers = [
      { id: 'seq1', beats: [{ id: 'beat1' }, { id: 'beat2' }] },
      { id: 'seq2', beats: [{ id: 'beat3' }] }
    ]
    
    wrapper = createTestWrapper(SequencerControls)
    
    const vm = wrapper.vm
    expect(vm.totalBeats).toBe(3)
  })

  it('computes current step from playing sequencers', () => {
    mockSequencerStore.playingSequencers = [
      { id: 'seq1', currentStep: 5 },
      { id: 'seq2', currentStep: 3 }
    ]
    
    wrapper = createTestWrapper(SequencerControls)
    
    const vm = wrapper.vm
    expect(vm.currentStep).toBe(5) // First sequencer's step
  })

  it('handles empty playing sequencers', () => {
    mockSequencerStore.playingSequencers = []
    
    wrapper = createTestWrapper(SequencerControls)
    
    const vm = wrapper.vm
    expect(vm.currentStep).toBe(0)
  })

  it('handles sequencer instance playback start', async () => {
    const sequencer = { id: 'seq1', beats: [{ id: 'beat1' }] }
    mockSequencerStore.sequencers = [sequencer]
    
    wrapper = createTestWrapper(SequencerControls)
    
    await wrapper.vm.handleSequencerInstancePlayback('seq1', true)
    
    expect(mockSequencerStore.startSequencer).toHaveBeenCalledWith('seq1')
  })

  it('handles sequencer instance playback stop', async () => {
    const sequencer = { id: 'seq1', beats: [{ id: 'beat1' }] }
    mockSequencerStore.sequencers = [sequencer]
    
    wrapper = createTestWrapper(SequencerControls)
    
    await wrapper.vm.handleSequencerInstancePlayback('seq1', false)
    
    expect(mockSequencerStore.stopSequencer).toHaveBeenCalledWith('seq1')
  })

  it('handles sequencer instance playback for non-existent sequencer', async () => {
    mockSequencerStore.sequencers = []
    
    wrapper = createTestWrapper(SequencerControls)
    
    await wrapper.vm.handleSequencerInstancePlayback('nonexistent', true)
    
    expect(mockSequencerStore.startSequencer).not.toHaveBeenCalled()
  })

  it('handles playback start error gracefully', async () => {
    mockSequencerStore.sequencers = [
      { id: 'seq1', beats: [{ id: 'beat1' }] }
    ]
    mockSequencerStore.startAllSequencers.mockRejectedValue(new Error('Playback error'))
    
    wrapper = createTestWrapper(SequencerControls)
    
    await wrapper.vm.toggleGlobalPlayback()
    
    expect(console.error).toHaveBeenCalledWith('Error starting playback:', expect.any(Error))
    expect(mockSequencerStore.stopAllSequencers).toHaveBeenCalled()
  })

  it('handles sequencer instance playback start error', async () => {
    const sequencer = { id: 'seq1', beats: [{ id: 'beat1' }] }
    mockSequencerStore.sequencers = [sequencer]
    mockSequencerStore.startSequencer.mockImplementation(() => {
      throw new Error('Start error')
    })
    
    wrapper = createTestWrapper(SequencerControls)
    
    await wrapper.vm.handleSequencerInstancePlayback('seq1', true)
    
    expect(console.error).toHaveBeenCalledWith('Error starting sequencer seq1:', expect.any(Error))
    expect(mockSequencerStore.stopSequencer).toHaveBeenCalledWith('seq1')
  })

  it('updates tempo on transport when available', async () => {
    wrapper = createTestWrapper(SequencerControls)
    
    // Start playback to create transport
    mockSequencerStore.config.globalIsPlaying = false
    mockSequencerStore.sequencers = [
      { id: 'seq1', beats: [{ id: 'beat1' }] }
    ]
    await wrapper.vm.toggleGlobalPlayback()
    
    // Now update tempo
    await wrapper.vm.updateTempo(140)
    
    expect(mockSequencerStore.setTempo).toHaveBeenCalledWith(140)
    expect(mockMultiTransport.updateTempo).toHaveBeenCalledWith(140)
  })

  it('handles non-numeric tempo values', async () => {
    wrapper = createTestWrapper(SequencerControls)
    
    await wrapper.vm.updateTempo('150')
    
    expect(mockSequencerStore.setTempo).toHaveBeenCalledWith(150)
  })

  it('handles boolean tempo values', async () => {
    wrapper = createTestWrapper(SequencerControls)
    
    await wrapper.vm.updateTempo(true)
    
    expect(mockSequencerStore.setTempo).toHaveBeenCalledWith(1)
  })

  it('cleans up on unmount', async () => {
    wrapper = createTestWrapper(SequencerControls)
    
    // Start playback to create transport
    mockSequencerStore.config.globalIsPlaying = false
    mockSequencerStore.sequencers = [
      { id: 'seq1', beats: [{ id: 'beat1' }] }
    ]
    await wrapper.vm.toggleGlobalPlayback()
    
    wrapper.unmount()
    
    expect(mockSequencerStore.stopAllSequencers).toHaveBeenCalled()
    expect(mockMusicStore.releaseAllNotes).toHaveBeenCalled()
    expect(mockMultiTransport.dispose).toHaveBeenCalled()
  })

  it('exposes handleSequencerInstancePlayback method', () => {
    wrapper = createTestWrapper(SequencerControls)
    
    expect(wrapper.vm.handleSequencerInstancePlayback).toBeDefined()
    expect(typeof wrapper.vm.handleSequencerInstancePlayback).toBe('function')
  })

  it('handles Tone.js context suspension', async () => {
    const mockTone = {
      getContext: () => ({ state: 'suspended' }),
      start: vi.fn().mockResolvedValue(undefined)
    }
    
    vi.doMock('tone', () => mockTone)
    
    mockSequencerStore.sequencers = [
      { id: 'seq1', beats: [{ id: 'beat1' }] }
    ]
    
    wrapper = createTestWrapper(SequencerControls)
    
    await wrapper.vm.toggleGlobalPlayback()
    
    expect(mockTone.start).toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith('Tone.js context started')
  })

  it('logs playback information', async () => {
    mockSequencerStore.sequencers = [
      { id: 'seq1', beats: [{ id: 'beat1' }] }
    ]
    
    wrapper = createTestWrapper(SequencerControls)
    
    await wrapper.vm.toggleGlobalPlayback()
    
    expect(console.log).toHaveBeenCalledWith('Starting all playback...', {
      totalBeats: 1,
      sequencers: 1
    })
  })

  it('handles no beats scenario', async () => {
    mockSequencerStore.sequencers = []
    
    wrapper = createTestWrapper(SequencerControls)
    
    await wrapper.vm.toggleGlobalPlayback()
    
    expect(console.log).toHaveBeenCalledWith('No beats to play')
    expect(mockSequencerStore.startAllSequencers).not.toHaveBeenCalled()
  })
})