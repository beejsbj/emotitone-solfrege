import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createTestWrapper } from '../../helpers/test-utils'
import UnifiedVisualEffects from '@/components/UnifiedVisualEffects.vue'

const visualConfigStore = vi.hoisted(() => ({
  visualsEnabled: true,
}))

const unifiedCanvasMocks = vi.hoisted(() => ({
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

const useUnifiedCanvas = vi.hoisted(() => vi.fn(() => unifiedCanvasMocks))

vi.mock('@/stores/music', () => ({
  useMusicStore: () => ({
    solfegeData: [{ name: 'Do', frequency: 261.63 }],
  }),
}))

vi.mock('@/stores/visualConfig', () => ({
  useVisualConfigStore: () => visualConfigStore,
}))

vi.mock('@/composables/canvas/useUnifiedCanvas', () => ({
  useUnifiedCanvas,
}))

vi.mock('@/components/BeatingShapes.vue', () => ({
  default: {
    name: 'BeatingShapes',
    template: '<div data-testid="beating-shapes">Beating Shapes</div>',
  },
}))

describe('UnifiedVisualEffects.vue', () => {
  let wrapper: ReturnType<typeof createTestWrapper> | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    visualConfigStore.visualsEnabled = true
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('renders the canvas layer when visuals are enabled', () => {
    wrapper = createTestWrapper(UnifiedVisualEffects)

    expect(wrapper.find('.unified-visual-effects').exists()).toBe(true)
    expect(wrapper.find('[data-testid="beating-shapes"]').exists()).toBe(true)
    expect(wrapper.find('.unified-canvas').attributes('width')).toBe('1024')
    expect(wrapper.find('.unified-canvas').attributes('height')).toBe('768')
  })

  it('does not render the visual layer when visuals are disabled', () => {
    visualConfigStore.visualsEnabled = false

    wrapper = createTestWrapper(UnifiedVisualEffects)

    expect(wrapper.find('.unified-visual-effects').exists()).toBe(false)
    expect(wrapper.find('.unified-canvas').exists()).toBe(false)
  })

  it('initializes the unified canvas and starts animation on mount', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

    wrapper = createTestWrapper(UnifiedVisualEffects)
    await nextTick()

    expect(useUnifiedCanvas).toHaveBeenCalledTimes(1)
    expect(unifiedCanvasMocks.initializeCanvas).toHaveBeenCalledTimes(1)
    expect(unifiedCanvasMocks.startAnimation).toHaveBeenCalledTimes(1)
    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', unifiedCanvasMocks.handleResize)
    expect(addEventListenerSpy).toHaveBeenCalledWith('note-played', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('note-released', expect.any(Function))
  })

  it('skips animation startup when visuals are disabled', async () => {
    visualConfigStore.visualsEnabled = false

    wrapper = createTestWrapper(UnifiedVisualEffects)
    await nextTick()

    expect(unifiedCanvasMocks.initializeCanvas).toHaveBeenCalledTimes(1)
    expect(unifiedCanvasMocks.startAnimation).not.toHaveBeenCalled()
  })

  it('forwards note events to the unified canvas handlers', async () => {
    const listeners = new Map<string, EventListener>()
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
      listeners.set(type, listener as EventListener)
    })

    wrapper = createTestWrapper(UnifiedVisualEffects)
    await nextTick()

    listeners.get('note-played')?.(
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

    listeners.get('note-released')?.(
      new CustomEvent('note-released', {
        detail: {
          note: 'C4',
          noteId: 'note-1',
        },
      })
    )

    expect(unifiedCanvasMocks.handleNotePlayed).toHaveBeenCalledWith(
      { name: 'Do', frequency: 261.63 },
      261.63,
      'note-1',
      4,
      'C4',
      'major',
      'C'
    )
    expect(unifiedCanvasMocks.handleNoteReleased).toHaveBeenCalledWith('C4', 'note-1')
  })

  it('stops animation and removes listeners on unmount', async () => {
    const listeners = new Map<string, EventListener>()
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
      listeners.set(type, listener as EventListener)
    })

    wrapper = createTestWrapper(UnifiedVisualEffects)
    await nextTick()

    wrapper.unmount()
    wrapper = null

    expect(unifiedCanvasMocks.stopAnimation).toHaveBeenCalledTimes(1)
    expect(unifiedCanvasMocks.cleanup).toHaveBeenCalledTimes(1)
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', unifiedCanvasMocks.handleResize)
    expect(removeEventListenerSpy).toHaveBeenCalledWith('note-played', listeners.get('note-played'))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('note-released', listeners.get('note-released'))
  })
})
