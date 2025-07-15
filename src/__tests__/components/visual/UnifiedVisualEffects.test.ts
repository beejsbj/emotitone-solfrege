import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createTestWrapper, mockCanvasContext } from '../../helpers/test-utils'
import UnifiedVisualEffects from '@/components/UnifiedVisualEffects.vue'

// Mock stores
const mockMusicStore = {
  solfegeData: [
    { name: 'Do', frequency: 261.63 },
    { name: 'Re', frequency: 293.66 }
  ]
}

const mockVisualConfigStore = {
  visualsEnabled: true
}

vi.mock('@/stores/music', () => ({
  useMusicStore: () => mockMusicStore
}))

vi.mock('@/stores/visualConfig', () => ({
  useVisualConfigStore: () => mockVisualConfigStore
}))

// Mock composable
const mockUnifiedCanvas = {
  canvasWidth: 1024,
  canvasHeight: 768,
  initializeCanvas: vi.fn(),
  handleResize: vi.fn(),
  handleNotePlayed: vi.fn(),
  handleNoteReleased: vi.fn(),
  startAnimation: vi.fn(),
  stopAnimation: vi.fn(),
  isAnimating: false,
  cleanup: vi.fn()
}

vi.mock('@/composables/canvas/useUnifiedCanvas', () => ({
  useUnifiedCanvas: () => mockUnifiedCanvas
}))

// Mock canvas context
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => mockCanvasContext),
  writable: true
})

describe('UnifiedVisualEffects.vue', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock state
    mockVisualConfigStore.visualsEnabled = true
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  it('renders when visuals are enabled', () => {
    mockVisualConfigStore.visualsEnabled = true
    
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    expect(wrapper.find('.unified-visual-effects').exists()).toBe(true)
    expect(wrapper.find('.unified-canvas').exists()).toBe(true)
  })

  it('does not render when visuals are disabled', () => {
    mockVisualConfigStore.visualsEnabled = false
    
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    expect(wrapper.find('.unified-visual-effects').exists()).toBe(false)
    expect(wrapper.find('.unified-canvas').exists()).toBe(false)
  })

  it('initializes canvas on mount', async () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    await nextTick()
    
    expect(mockUnifiedCanvas.initializeCanvas).toHaveBeenCalled()
    expect(mockUnifiedCanvas.startAnimation).toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith('🚀 Mounting UnifiedVisualEffects...')
    expect(console.log).toHaveBeenCalledWith('▶️ Starting animation...')
    expect(console.log).toHaveBeenCalledWith('✅ UnifiedVisualEffects mounted and ready')
  })

  it('does not start animation when visuals are disabled', async () => {
    mockVisualConfigStore.visualsEnabled = false
    
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    await nextTick()
    
    expect(mockUnifiedCanvas.initializeCanvas).toHaveBeenCalled()
    expect(mockUnifiedCanvas.startAnimation).not.toHaveBeenCalled()
  })

  it('sets up window event listeners on mount', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    await nextTick()
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', mockUnifiedCanvas.handleResize)
    expect(addEventListenerSpy).toHaveBeenCalledWith('note-played', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('note-released', expect.any(Function))
  })

  it('cleans up on unmount', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    await nextTick()
    
    wrapper.unmount()
    
    expect(mockUnifiedCanvas.stopAnimation).toHaveBeenCalled()
    expect(mockUnifiedCanvas.cleanup).toHaveBeenCalled()
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', mockUnifiedCanvas.handleResize)
    expect(removeEventListenerSpy).toHaveBeenCalledWith('note-played', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('note-released', expect.any(Function))
  })

  it('handles note played events', async () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    await nextTick()
    
    const noteEvent = new CustomEvent('note-played', {
      detail: {
        note: { name: 'Do', frequency: 261.63 },
        frequency: 261.63,
        noteId: 'note-1',
        octave: 4,
        noteName: 'C4'
      }
    })
    
    window.dispatchEvent(noteEvent)
    
    expect(mockUnifiedCanvas.handleNotePlayed).toHaveBeenCalledWith(
      { name: 'Do', frequency: 261.63 },
      261.63,
      'note-1',
      4,
      'C4'
    )
  })

  it('handles note released events', async () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    await nextTick()
    
    const noteEvent = new CustomEvent('note-released', {
      detail: {
        note: 'C4',
        noteId: 'note-1'
      }
    })
    
    window.dispatchEvent(noteEvent)
    
    expect(mockUnifiedCanvas.handleNoteReleased).toHaveBeenCalledWith('C4', 'note-1')
  })

  it('handles note released events without noteId', async () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    await nextTick()
    
    const noteEvent = new CustomEvent('note-released', {
      detail: {
        note: 'C4'
      }
    })
    
    window.dispatchEvent(noteEvent)
    
    expect(mockUnifiedCanvas.handleNoteReleased).toHaveBeenCalledWith('C4', undefined)
  })

  it('ignores note released events without note name', async () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    await nextTick()
    
    const noteEvent = new CustomEvent('note-released', {
      detail: {
        noteId: 'note-1'
      }
    })
    
    window.dispatchEvent(noteEvent)
    
    expect(mockUnifiedCanvas.handleNoteReleased).not.toHaveBeenCalled()
  })

  it('handles resize events', async () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    await nextTick()
    
    window.dispatchEvent(new Event('resize'))
    
    expect(mockUnifiedCanvas.handleResize).toHaveBeenCalled()
  })

  it('sets correct canvas dimensions', () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    const canvas = wrapper.find('.unified-canvas')
    expect(canvas.attributes('width')).toBe('1024')
    expect(canvas.attributes('height')).toBe('768')
  })

  it('has correct CSS classes and styles', () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    const container = wrapper.find('.unified-visual-effects')
    expect(container.classes()).toContain('unified-visual-effects')
    
    const canvas = wrapper.find('.unified-canvas')
    expect(canvas.classes()).toContain('unified-canvas')
  })

  it('handles note played events with minimal data', async () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    await nextTick()
    
    const noteEvent = new CustomEvent('note-played', {
      detail: {
        note: { name: 'Do', frequency: 261.63 },
        frequency: 261.63
      }
    })
    
    window.dispatchEvent(noteEvent)
    
    expect(mockUnifiedCanvas.handleNotePlayed).toHaveBeenCalledWith(
      { name: 'Do', frequency: 261.63 },
      261.63,
      undefined,
      undefined,
      undefined
    )
  })

  it('handles note played events with complete data', async () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    await nextTick()
    
    const noteEvent = new CustomEvent('note-played', {
      detail: {
        note: { name: 'Re', frequency: 293.66, solfege: 'Re' },
        frequency: 293.66,
        noteId: 'note-2',
        octave: 5,
        noteName: 'D5'
      }
    })
    
    window.dispatchEvent(noteEvent)
    
    expect(mockUnifiedCanvas.handleNotePlayed).toHaveBeenCalledWith(
      { name: 'Re', frequency: 293.66, solfege: 'Re' },
      293.66,
      'note-2',
      5,
      'D5'
    )
  })

  it('uses unified canvas composable correctly', () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    expect(vi.mocked(require('@/composables/canvas/useUnifiedCanvas').useUnifiedCanvas)).toHaveBeenCalledWith(
      expect.objectContaining({
        value: expect.any(HTMLCanvasElement)
      })
    )
  })

  it('accesses stores correctly', () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    expect(vi.mocked(require('@/stores/music').useMusicStore)).toHaveBeenCalled()
    expect(vi.mocked(require('@/stores/visualConfig').useVisualConfigStore)).toHaveBeenCalled()
  })

  it('handles canvas ref correctly', () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    const canvas = wrapper.find('.unified-canvas')
    expect(canvas.element).toBeInstanceOf(HTMLCanvasElement)
    expect(canvas.element.tagName).toBe('CANVAS')
  })

  it('conditionally renders based on visualsEnabled reactivity', async () => {
    mockVisualConfigStore.visualsEnabled = true
    
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    expect(wrapper.find('.unified-visual-effects').exists()).toBe(true)
    
    // Change visualsEnabled (in a real app this would be reactive)
    mockVisualConfigStore.visualsEnabled = false
    await nextTick()
    
    // Note: This test would need a more sophisticated mock to test reactivity
    // The actual component would reactively hide/show based on the store value
  })

  it('handles edge case note events gracefully', async () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    await nextTick()
    
    // Empty note played event
    const emptyNoteEvent = new CustomEvent('note-played', {
      detail: {}
    })
    
    window.dispatchEvent(emptyNoteEvent)
    
    expect(mockUnifiedCanvas.handleNotePlayed).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    )
    
    // Empty note released event
    const emptyReleaseEvent = new CustomEvent('note-released', {
      detail: {}
    })
    
    window.dispatchEvent(emptyReleaseEvent)
    
    expect(mockUnifiedCanvas.handleNoteReleased).not.toHaveBeenCalled()
  })

  it('maintains proper event listener cleanup', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    
    wrapper = createTestWrapper(UnifiedVisualEffects)
    
    await nextTick()
    
    // Get the actual event listener functions
    const vm = wrapper.vm
    const onNotePlayed = vm.onNotePlayed
    const onNoteReleased = vm.onNoteReleased
    const handleResize = mockUnifiedCanvas.handleResize
    
    wrapper.unmount()
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', handleResize)
    expect(removeEventListenerSpy).toHaveBeenCalledWith('note-played', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('note-released', expect.any(Function))
  })
})