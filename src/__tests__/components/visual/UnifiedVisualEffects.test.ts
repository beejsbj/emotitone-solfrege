import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createTestWrapper, mockCanvasContext } from '../../helpers/test-utils'
import UnifiedVisualEffects from '@/components/UnifiedVisualEffects.vue'

const mockMusicStore = vi.hoisted(() => ({
  currentKey: 'C',
  currentMode: 'major',
  getActiveNotes: vi.fn(() => []),
}))

const mockVisualConfigStore = vi.hoisted(() => ({
  visualsEnabled: true,
}))

const mockUnifiedCanvas = vi.hoisted(() => ({
  canvasWidth: 1024,
  canvasHeight: 768,
  initializeCanvas: vi.fn(),
  handleResize: vi.fn(),
  handleNotePlayed: vi.fn(),
  handleNoteReleased: vi.fn(),
  startAnimation: vi.fn(),
  stopAnimation: vi.fn(),
  isAnimating: false,
  cleanup: vi.fn(),
}))

vi.mock('@/stores/music', () => ({
  useMusicStore: () => mockMusicStore,
}))

vi.mock('@/stores/visualConfig', () => ({
  useVisualConfigStore: () => mockVisualConfigStore,
}))

vi.mock('@/composables/canvas/useUnifiedCanvas', () => ({
  useUnifiedCanvas: vi.fn(() => mockUnifiedCanvas),
}))

vi.mock('@/components/BeatingShapes.vue', () => ({
  default: {
    name: 'BeatingShapes',
    template: '<div data-testid="beating-shapes"></div>',
  },
}))

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => mockCanvasContext),
  writable: true,
})

describe('UnifiedVisualEffects.vue', () => {
  let wrapper: ReturnType<typeof createTestWrapper> | null = null
  let eventListeners: Record<string, EventListener>

  beforeEach(() => {
    vi.clearAllMocks()
    mockVisualConfigStore.visualsEnabled = true
    eventListeners = {}

    vi.spyOn(window, 'addEventListener').mockImplementation(((type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') {
        eventListeners[type] = listener
      }
    }) as typeof window.addEventListener)

    vi.spyOn(window, 'removeEventListener').mockImplementation((() => undefined) as typeof window.removeEventListener)
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.restoreAllMocks()
  })

  it('renders the canvas shell when visuals are enabled', () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)

    expect(wrapper.find('.unified-visual-effects').exists()).toBe(true)
    expect(wrapper.find('[data-testid="beating-shapes"]').exists()).toBe(true)
    expect(wrapper.find('.unified-canvas').exists()).toBe(true)
  })

  it('hides itself when visuals are disabled', () => {
    mockVisualConfigStore.visualsEnabled = false
    wrapper = createTestWrapper(UnifiedVisualEffects)

    expect(wrapper.find('.unified-visual-effects').exists()).toBe(false)
    expect(wrapper.find('.unified-canvas').exists()).toBe(false)
  })

  it('initializes the canvas and animation lifecycle on mount', async () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)
    await nextTick()

    expect(mockUnifiedCanvas.initializeCanvas).toHaveBeenCalledTimes(1)
    expect(mockUnifiedCanvas.startAnimation).toHaveBeenCalledTimes(1)
    expect(eventListeners.resize).toBeDefined()
    expect(eventListeners['note-played']).toBeDefined()
    expect(eventListeners['note-released']).toBeDefined()
  })

  it('does not start animation when visuals are disabled', async () => {
    mockVisualConfigStore.visualsEnabled = false
    wrapper = createTestWrapper(UnifiedVisualEffects)
    await nextTick()

    expect(mockUnifiedCanvas.initializeCanvas).toHaveBeenCalledTimes(1)
    expect(mockUnifiedCanvas.startAnimation).not.toHaveBeenCalled()
  })

  it('forwards note-played events with mode and key snapshots', async () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)
    await nextTick()

    eventListeners['note-played']?.(
      new CustomEvent('note-played', {
        detail: {
          note: { name: 'Do', frequency: 261.63 },
          frequency: 261.63,
          noteId: 'note-1',
          octave: 4,
          noteName: 'C4',
          mode: 'major',
          key: 'C',
        },
      })
    )

    expect(mockUnifiedCanvas.handleNotePlayed).toHaveBeenCalledWith(
      { name: 'Do', frequency: 261.63 },
      261.63,
      'note-1',
      4,
      'C4',
      'major',
      'C'
    )
  })

  it('forwards note-released events only when a note name is present', async () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)
    await nextTick()

    eventListeners['note-released']?.(
      new CustomEvent('note-released', {
        detail: {
          note: 'C4',
          noteId: 'note-1',
        },
      })
    )

    eventListeners['note-released']?.(
      new CustomEvent('note-released', {
        detail: {
          noteId: 'missing-note',
        },
      })
    )

    expect(mockUnifiedCanvas.handleNoteReleased).toHaveBeenCalledTimes(1)
    expect(mockUnifiedCanvas.handleNoteReleased).toHaveBeenCalledWith('C4', 'note-1')
  })

  it('cleans up animation and listeners on unmount', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    wrapper = createTestWrapper(UnifiedVisualEffects)
    await nextTick()
    wrapper.unmount()
    wrapper = null

    expect(mockUnifiedCanvas.stopAnimation).toHaveBeenCalledTimes(1)
    expect(mockUnifiedCanvas.cleanup).toHaveBeenCalledTimes(1)
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('note-played', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('note-released', expect.any(Function))
  })

  it('binds the configured canvas dimensions', () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)

    const canvas = wrapper.find('.unified-canvas')
    expect(canvas.attributes('width')).toBe('1024')
    expect(canvas.attributes('height')).toBe('768')
  })
})
