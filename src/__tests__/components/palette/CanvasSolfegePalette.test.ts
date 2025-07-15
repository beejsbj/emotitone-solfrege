import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createTestWrapper, mockCanvasContext } from '../../helpers/test-utils'
import CanvasSolfegePalette from '@/components/CanvasSolfegePalette.vue'

// Mock child components
vi.mock('@/components/KeySelector.vue', () => ({
  default: { template: '<div data-testid="key-selector">Key Selector</div>' }
}))

// Mock composables
const mockPalette = {
  paletteState: {
    value: {
      mainOctave: 4,
      height: 240,
      isDragging: false,
      isResizing: false,
      dragStartY: 0
    }
  },
  animationState: {
    value: {
      isAnimating: false
    }
  },
  renderPalette: vi.fn(),
  handlePointerDown: vi.fn(() => true),
  handlePointerUp: vi.fn(),
  handleTouchButtonPress: vi.fn(),
  handleTouchButtonRelease: vi.fn(),
  handleControlPress: vi.fn(),
  handleResizeDrag: vi.fn(),
  handleKeyboardPress: vi.fn(),
  handleKeyboardRelease: vi.fn(),
  hitTestButton: vi.fn(),
  hitTestControl: vi.fn(),
  updateDimensions: vi.fn(),
  updatePosition: vi.fn(),
  setMainOctave: vi.fn(),
  addSequencerListeners: vi.fn(),
  removeSequencerListeners: vi.fn()
}

const mockKeyboardControls = {
  getKeyboardLetterForNote: vi.fn(),
  getKeyboardMapping: vi.fn(() => ({
    'a': { solfegeIndex: 0, octave: 4 },
    's': { solfegeIndex: 1, octave: 4 }
  }))
}

vi.mock('@/composables/palette', () => ({
  usePalette: () => mockPalette
}))

vi.mock('@/composables/useKeyboardControls', () => ({
  useKeyboardControls: () => mockKeyboardControls
}))

// Mock canvas context
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => mockCanvasContext),
  writable: true
})

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16)
  return 1
})

global.cancelAnimationFrame = vi.fn()

describe('CanvasSolfegePalette.vue', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    // Reset mock state
    mockPalette.paletteState.value = {
      mainOctave: 4,
      height: 240,
      isDragging: false,
      isResizing: false,
      dragStartY: 0
    }
    
    mockPalette.animationState.value = {
      isAnimating: false
    }
    
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      writable: true
    })
    
    Object.defineProperty(window, 'innerHeight', {
      value: 768,
      writable: true
    })
    
    // Mock device pixel ratio
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      writable: true
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders correctly', () => {
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    expect(wrapper.find('.canvas-solfege-palette').exists()).toBe(true)
    expect(wrapper.find('.palette-canvas').exists()).toBe(true)
  })

  it('sets up canvas with correct dimensions', () => {
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    const canvas = wrapper.find('.palette-canvas').element as HTMLCanvasElement
    expect(canvas.width).toBe(1024 * 2) // width * devicePixelRatio
    expect(canvas.height).toBe(240 * 2) // height * devicePixelRatio
    expect(canvas.style.width).toBe('1024px')
    expect(canvas.style.height).toBe('240px')
  })

  it('handles mouse down events', async () => {
    mockPalette.handlePointerDown.mockReturnValue(true)
    
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    const canvas = wrapper.find('.palette-canvas')
    const mockEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 50,
      bubbles: true
    })
    
    // Mock getBoundingClientRect
    canvas.element.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 1024,
      height: 240,
      right: 1024,
      bottom: 240,
      x: 0,
      y: 0,
      toJSON: vi.fn()
    }))
    
    await canvas.trigger('mousedown', mockEvent)
    
    expect(mockPalette.handlePointerDown).toHaveBeenCalledWith(100, 50, mockEvent)
  })

  it('handles mouse up events', async () => {
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    const canvas = wrapper.find('.palette-canvas')
    const mockEvent = new MouseEvent('mouseup', {
      clientX: 100,
      clientY: 50,
      bubbles: true
    })
    
    canvas.element.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 1024,
      height: 240,
      right: 1024,
      bottom: 240,
      x: 0,
      y: 0,
      toJSON: vi.fn()
    }))
    
    await canvas.trigger('mouseup', mockEvent)
    
    expect(mockPalette.handlePointerUp).toHaveBeenCalledWith(100, 50, mockEvent)
  })

  it('handles touch start events', async () => {
    mockPalette.hitTestButton.mockReturnValue({ id: 'button1' })
    
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    const canvas = wrapper.find('.palette-canvas')
    const mockTouch = {
      identifier: 1,
      clientX: 100,
      clientY: 50
    }
    
    canvas.element.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 1024,
      height: 240,
      right: 1024,
      bottom: 240,
      x: 0,
      y: 0,
      toJSON: vi.fn()
    }))
    
    const mockEvent = Object.assign(new Event('touchstart'), {
      touches: [mockTouch],
      preventDefault: vi.fn()
    })
    
    await canvas.trigger('touchstart', mockEvent)
    
    expect(mockPalette.handleTouchButtonPress).toHaveBeenCalledWith(
      { id: 'button1' },
      1,
      mockEvent
    )
  })

  it('handles touch end events', async () => {
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    const canvas = wrapper.find('.palette-canvas')
    const mockTouch = {
      identifier: 1,
      clientX: 100,
      clientY: 50
    }
    
    const mockEvent = Object.assign(new Event('touchend'), {
      changedTouches: [mockTouch],
      touches: [],
      preventDefault: vi.fn()
    })
    
    await canvas.trigger('touchend', mockEvent)
    
    expect(mockPalette.handleTouchButtonRelease).toHaveBeenCalledWith(1, mockEvent)
  })

  it('handles resize events', async () => {
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    // Change window size
    Object.defineProperty(window, 'innerWidth', { value: 800 })
    
    // Trigger resize
    window.dispatchEvent(new Event('resize'))
    await nextTick()
    
    expect(mockPalette.updateDimensions).toHaveBeenCalledWith(800, 240)
  })

  it('handles keyboard press events', async () => {
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    const mockEvent = new CustomEvent('keyboard-note-pressed', {
      detail: { solfegeIndex: 0, octave: 4 }
    })
    
    window.dispatchEvent(mockEvent)
    await nextTick()
    
    expect(mockPalette.handleKeyboardPress).toHaveBeenCalledWith(0, 4)
  })

  it('handles keyboard release events', async () => {
    mockKeyboardControls.getKeyboardMapping.mockReturnValue({
      'a': { solfegeIndex: 0, octave: 4 }
    })
    
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    const mockEvent = new CustomEvent('keyboard-note-released', {
      detail: { key: 'a' }
    })
    
    window.dispatchEvent(mockEvent)
    await nextTick()
    
    expect(mockPalette.handleKeyboardRelease).toHaveBeenCalledWith(0, 4)
  })

  it('handles keyboard release with unknown key', async () => {
    mockKeyboardControls.getKeyboardMapping.mockReturnValue({})
    
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    const mockEvent = new CustomEvent('keyboard-note-released', {
      detail: { key: 'z' }
    })
    
    window.dispatchEvent(mockEvent)
    await nextTick()
    
    expect(mockPalette.handleKeyboardRelease).toHaveBeenCalledWith()
  })

  it('handles mouse move for resizing', async () => {
    mockPalette.paletteState.value.isResizing = true
    mockPalette.paletteState.value.dragStartY = 100
    
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    const canvas = wrapper.find('.palette-canvas')
    const mockEvent = new MouseEvent('mousemove', {
      clientX: 100,
      clientY: 150,
      bubbles: true
    })
    
    canvas.element.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 1024,
      height: 240,
      right: 1024,
      bottom: 240,
      x: 0,
      y: 0,
      toJSON: vi.fn()
    }))
    
    await canvas.trigger('mousemove', mockEvent)
    
    expect(mockPalette.handleResizeDrag).toHaveBeenCalledWith(50) // 150 - 100
  })

  it('handles touch move for resizing', async () => {
    mockPalette.paletteState.value.isResizing = true
    mockPalette.paletteState.value.dragStartY = 100
    
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    const canvas = wrapper.find('.palette-canvas')
    const mockEvent = Object.assign(new Event('touchmove'), {
      touches: [{ clientX: 100, clientY: 150 }],
      preventDefault: vi.fn()
    })
    
    canvas.element.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 1024,
      height: 240,
      right: 1024,
      bottom: 240,
      x: 0,
      y: 0,
      toJSON: vi.fn()
    }))
    
    await canvas.trigger('touchmove', mockEvent)
    
    expect(mockPalette.handleResizeDrag).toHaveBeenCalledWith(50)
  })

  it('handles control press during touch', async () => {
    mockPalette.hitTestButton.mockReturnValue(null)
    mockPalette.hitTestControl.mockReturnValue({ type: 'resize' })
    
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    const canvas = wrapper.find('.palette-canvas')
    const mockTouch = {
      identifier: 1,
      clientX: 100,
      clientY: 50
    }
    
    canvas.element.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 1024,
      height: 240,
      right: 1024,
      bottom: 240,
      x: 0,
      y: 0,
      toJSON: vi.fn()
    }))
    
    const mockEvent = Object.assign(new Event('touchstart'), {
      touches: [mockTouch],
      preventDefault: vi.fn()
    })
    
    await canvas.trigger('touchstart', mockEvent)
    
    expect(mockPalette.handleControlPress).toHaveBeenCalledWith(
      { type: 'resize' },
      mockEvent
    )
  })

  it('starts animation loop on mount', async () => {
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    await nextTick()
    
    expect(global.requestAnimationFrame).toHaveBeenCalled()
    expect(mockPalette.updateDimensions).toHaveBeenCalledWith(1024, 240)
    expect(mockPalette.updatePosition).toHaveBeenCalledWith(0, 0)
    expect(mockPalette.addSequencerListeners).toHaveBeenCalled()
  })

  it('cleans up on unmount', async () => {
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    wrapper.unmount()
    
    expect(global.cancelAnimationFrame).toHaveBeenCalled()
    expect(mockPalette.removeSequencerListeners).toHaveBeenCalled()
  })

  it('handles global mouse up events', async () => {
    mockPalette.paletteState.value.isDragging = true
    
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    const mockEvent = new MouseEvent('mouseup', { bubbles: true })
    window.dispatchEvent(mockEvent)
    
    expect(mockPalette.handlePointerUp).toHaveBeenCalledWith(0, 0, mockEvent)
  })

  it('handles global touch end events', async () => {
    mockPalette.paletteState.value.isResizing = true
    
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    const mockEvent = Object.assign(new Event('touchend'), {
      changedTouches: [{ identifier: 1 }],
      touches: []
    })
    
    window.dispatchEvent(mockEvent)
    
    expect(mockPalette.handleTouchButtonRelease).toHaveBeenCalledWith(1, mockEvent)
  })

  it('exposes methods for external control', () => {
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    expect(wrapper.vm.setMainOctave).toBeDefined()
    expect(wrapper.vm.updateHeight).toBeDefined()
    
    // Test setMainOctave
    wrapper.vm.setMainOctave(5)
    expect(mockPalette.setMainOctave).toHaveBeenCalledWith(5)
    
    // Test updateHeight
    wrapper.vm.updateHeight(300)
    expect(mockPalette.updateDimensions).toHaveBeenCalledWith(1024, 300)
  })

  it('watches for palette state changes', async () => {
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    // Change main octave
    mockPalette.paletteState.value.mainOctave = 5
    await nextTick()
    
    // Should trigger redraw
    expect(mockPalette.renderPalette).toHaveBeenCalled()
  })

  it('handles animation rendering', async () => {
    mockPalette.animationState.value.isAnimating = true
    
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    // Fast forward animation frame
    vi.advanceTimersByTime(16)
    await nextTick()
    
    expect(mockPalette.renderPalette).toHaveBeenCalled()
  })

  it('handles high DPI canvas scaling', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 3 })
    
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    const canvas = wrapper.find('.palette-canvas').element as HTMLCanvasElement
    expect(canvas.width).toBe(1024 * 3)
    expect(canvas.height).toBe(240 * 3)
    expect(mockCanvasContext.scale).toHaveBeenCalledWith(3, 3)
  })

  it('handles canvas context setup', () => {
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    expect(mockCanvasContext.scale).toHaveBeenCalled()
    expect(mockCanvasContext.imageSmoothingEnabled).toBe(true)
    expect(mockCanvasContext.imageSmoothingQuality).toBe('high')
  })

  it('handles resize dragging with height updates', async () => {
    mockPalette.paletteState.value.isResizing = true
    mockPalette.paletteState.value.dragStartY = 100
    mockPalette.paletteState.value.height = 300
    
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    const canvas = wrapper.find('.palette-canvas')
    const mockEvent = new MouseEvent('mousemove', {
      clientX: 100,
      clientY: 150,
      bubbles: true
    })
    
    canvas.element.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 1024,
      height: 300,
      right: 1024,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: vi.fn()
    }))
    
    await canvas.trigger('mousemove', mockEvent)
    
    expect(mockPalette.handleResizeDrag).toHaveBeenCalledWith(50)
  })

  it('handles touch end with resize state reset', async () => {
    mockPalette.paletteState.value.isResizing = true
    
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    const canvas = wrapper.find('.palette-canvas')
    const mockEvent = Object.assign(new Event('touchend'), {
      changedTouches: [{ identifier: 1 }],
      touches: [],
      preventDefault: vi.fn()
    })
    
    await canvas.trigger('touchend', mockEvent)
    
    expect(mockPalette.paletteState.value.isResizing).toBe(false)
    expect(mockPalette.paletteState.value.isDragging).toBe(false)
  })

  it('has correct CSS classes', () => {
    wrapper = createTestWrapper(CanvasSolfegePalette)
    
    const container = wrapper.find('.canvas-solfege-palette')
    expect(container.classes()).toContain('canvas-solfege-palette')
    expect(container.classes()).toContain('relative')
    
    const canvas = wrapper.find('.palette-canvas')
    expect(canvas.classes()).toContain('palette-canvas')
    expect(canvas.element.style.display).toBe('block')
    expect(canvas.element.style.touchAction).toBe('none')
    expect(canvas.element.style.pointerEvents).toBe('auto')
    expect(canvas.element.style.backgroundColor).toBe('black')
  })
})