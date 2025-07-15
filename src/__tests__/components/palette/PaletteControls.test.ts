import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createTestWrapper, createMockTouchEvent } from '../../helpers/test-utils'
import PaletteControls from '@/components/pallete/PaletteControls.vue'

// Mock haptic feedback
vi.mock('@/utils/hapticFeedback', () => ({
  triggerControlHaptic: vi.fn(),
  triggerUIHaptic: vi.fn()
}))

describe('PaletteControls.vue', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    // Mock Date.now for consistent timing tests
    vi.spyOn(Date, 'now').mockReturnValue(1000)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders correctly', () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4 }
    })
    
    expect(wrapper.find('.bg-gray-800.h-5').exists()).toBe(true)
    expect(wrapper.find('.grid.grid-cols-5.h-full').exists()).toBe(true)
    expect(wrapper.findAll('.cursor-grab').length).toBe(2) // Left and right flick areas
    expect(wrapper.find('.cursor-ns-resize').exists()).toBe(true)
  })

  it('renders with default props', () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4 }
    })
    
    expect(wrapper.props().mainOctave).toBe(4)
    expect(wrapper.props().paletteHeight).toBeUndefined()
    expect(wrapper.props().showLastSolfege).toBe(false)
  })

  it('renders with all props', () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: {
        mainOctave: 5,
        paletteHeight: 300,
        showLastSolfege: true
      }
    })
    
    expect(wrapper.props().mainOctave).toBe(5)
    expect(wrapper.props().paletteHeight).toBe(300)
    expect(wrapper.props().showLastSolfege).toBe(true)
  })

  it('handles wheel scroll up (increase octave)', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4 }
    })
    
    const leftFlick = wrapper.find('.cursor-grab')
    const wheelEvent = new WheelEvent('wheel', { deltaY: -100 })
    
    await leftFlick.trigger('wheel', wheelEvent)
    
    expect(wrapper.emitted('update:mainOctave')).toEqual([[5]])
    expect(require('@/utils/hapticFeedback').triggerControlHaptic).toHaveBeenCalled()
  })

  it('handles wheel scroll down (decrease octave)', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4 }
    })
    
    const leftFlick = wrapper.find('.cursor-grab')
    const wheelEvent = new WheelEvent('wheel', { deltaY: 100 })
    
    await leftFlick.trigger('wheel', wheelEvent)
    
    expect(wrapper.emitted('update:mainOctave')).toEqual([[3]])
    expect(require('@/utils/hapticFeedback').triggerControlHaptic).toHaveBeenCalled()
  })

  it('clamps octave at maximum (7)', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 7 }
    })
    
    const leftFlick = wrapper.find('.cursor-grab')
    const wheelEvent = new WheelEvent('wheel', { deltaY: -100 })
    
    await leftFlick.trigger('wheel', wheelEvent)
    
    expect(wrapper.emitted('update:mainOctave')).toBeUndefined()
    expect(require('@/utils/hapticFeedback').triggerControlHaptic).not.toHaveBeenCalled()
  })

  it('clamps octave at minimum (3)', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 3 }
    })
    
    const leftFlick = wrapper.find('.cursor-grab')
    const wheelEvent = new WheelEvent('wheel', { deltaY: 100 })
    
    await leftFlick.trigger('wheel', wheelEvent)
    
    expect(wrapper.emitted('update:mainOctave')).toBeUndefined()
    expect(require('@/utils/hapticFeedback').triggerControlHaptic).not.toHaveBeenCalled()
  })

  it('handles touch flick gestures', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4 }
    })
    
    const leftFlick = wrapper.find('.cursor-grab')
    
    // Start touch
    const touchStart = createMockTouchEvent('touchstart', [{ clientY: 100 }])
    await leftFlick.trigger('touchstart', touchStart)
    
    // Move touch (should be prevented)
    const touchMove = createMockTouchEvent('touchmove', [{ clientY: 90 }])
    await leftFlick.trigger('touchmove', touchMove)
    
    // End touch with flick up (decrease octave)
    vi.spyOn(Date, 'now').mockReturnValue(1200) // 200ms later
    const touchEnd = createMockTouchEvent('touchend', [])
    touchEnd.changedTouches = [{ clientY: 50 }] // 50px up from start
    await leftFlick.trigger('touchend', touchEnd)
    
    expect(wrapper.emitted('update:mainOctave')).toEqual([[3]])
    expect(require('@/utils/hapticFeedback').triggerControlHaptic).toHaveBeenCalled()
  })

  it('handles mouse flick gestures', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4 }
    })
    
    const leftFlick = wrapper.find('.cursor-grab')
    
    // Start mouse down
    const mouseDown = new MouseEvent('mousedown', { clientY: 100 })
    await leftFlick.trigger('mousedown', mouseDown)
    
    // Move mouse (should be prevented)
    const mouseMove = new MouseEvent('mousemove', { clientY: 90 })
    await leftFlick.trigger('mousemove', mouseMove)
    
    // End mouse with flick down (increase octave)
    vi.spyOn(Date, 'now').mockReturnValue(1200)
    const mouseUp = new MouseEvent('mouseup', { clientY: 150 }) // 50px down from start
    await leftFlick.trigger('mouseup', mouseUp)
    
    expect(wrapper.emitted('update:mainOctave')).toEqual([[5]])
    expect(require('@/utils/hapticFeedback').triggerControlHaptic).toHaveBeenCalled()
  })

  it('ignores short flick gestures', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4 }
    })
    
    const leftFlick = wrapper.find('.cursor-grab')
    
    // Start touch
    const touchStart = createMockTouchEvent('touchstart', [{ clientY: 100 }])
    await leftFlick.trigger('touchstart', touchStart)
    
    // End touch with short movement (< 30px)
    vi.spyOn(Date, 'now').mockReturnValue(1200)
    const touchEnd = createMockTouchEvent('touchend', [])
    touchEnd.changedTouches = [{ clientY: 80 }] // Only 20px movement
    await leftFlick.trigger('touchend', touchEnd)
    
    expect(wrapper.emitted('update:mainOctave')).toBeUndefined()
    expect(require('@/utils/hapticFeedback').triggerControlHaptic).not.toHaveBeenCalled()
  })

  it('ignores slow flick gestures', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4 }
    })
    
    const leftFlick = wrapper.find('.cursor-grab')
    
    // Start touch
    const touchStart = createMockTouchEvent('touchstart', [{ clientY: 100 }])
    await leftFlick.trigger('touchstart', touchStart)
    
    // End touch with slow movement (low velocity)
    vi.spyOn(Date, 'now').mockReturnValue(1500) // 500ms later (slow)
    const touchEnd = createMockTouchEvent('touchend', [])
    touchEnd.changedTouches = [{ clientY: 50 }] // 50px movement but slow
    await leftFlick.trigger('touchend', touchEnd)
    
    expect(wrapper.emitted('update:mainOctave')).toBeUndefined()
    expect(require('@/utils/hapticFeedback').triggerControlHaptic).not.toHaveBeenCalled()
  })

  it('handles resize start with mouse', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4, paletteHeight: 240 }
    })
    
    const resizeHandle = wrapper.find('.cursor-ns-resize')
    const mouseDown = new MouseEvent('mousedown', { clientY: 100 })
    
    await resizeHandle.trigger('mousedown', mouseDown)
    
    expect(require('@/utils/hapticFeedback').triggerUIHaptic).toHaveBeenCalled()
  })

  it('handles resize start with touch', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4, paletteHeight: 240 }
    })
    
    const resizeHandle = wrapper.find('.cursor-ns-resize')
    const touchStart = createMockTouchEvent('touchstart', [{ clientY: 100 }])
    
    await resizeHandle.trigger('touchstart', touchStart)
    
    expect(require('@/utils/hapticFeedback').triggerUIHaptic).toHaveBeenCalled()
  })

  it('handles sustained notes display', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4 }
    })
    
    // Add sustained note
    const sustainedNote = {
      solfegeIndex: 0,
      octave: 4,
      noteId: 'note-1'
    }
    
    wrapper.vm.addSustainedNote(sustainedNote)
    await nextTick()
    
    expect(wrapper.find('.bg-gray-900\\/80').exists()).toBe(true)
    expect(wrapper.find('.bg-yellow-400').exists()).toBe(true)
    expect(wrapper.emitted('sustainNote')).toEqual([[sustainedNote]])
  })

  it('handles sustained note release', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4 }
    })
    
    // Add sustained note
    const sustainedNote = {
      solfegeIndex: 0,
      octave: 4,
      noteId: 'note-1'
    }
    
    wrapper.vm.addSustainedNote(sustainedNote)
    await nextTick()
    
    // Release sustained note
    const sustainedNoteElement = wrapper.find('.bg-yellow-400')
    await sustainedNoteElement.trigger('click')
    
    expect(wrapper.emitted('releaseSustainedNote')).toEqual([['note-1']])
    expect(wrapper.find('.bg-yellow-400').exists()).toBe(false)
  })

  it('prevents duplicate sustained notes', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4 }
    })
    
    const sustainedNote = {
      solfegeIndex: 0,
      octave: 4,
      noteId: 'note-1'
    }
    
    // Add same note twice
    wrapper.vm.addSustainedNote(sustainedNote)
    wrapper.vm.addSustainedNote(sustainedNote)
    
    await nextTick()
    
    expect(wrapper.findAll('.bg-yellow-400').length).toBe(1)
    expect(wrapper.emitted('sustainNote')).toEqual([[sustainedNote]])
  })

  it('handles mouse leave to end flick', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4 }
    })
    
    const leftFlick = wrapper.find('.cursor-grab')
    
    // Start mouse down
    const mouseDown = new MouseEvent('mousedown', { clientY: 100 })
    await leftFlick.trigger('mousedown', mouseDown)
    
    // Mouse leave should end drag
    const mouseLeave = new MouseEvent('mouseleave', { clientY: 50 })
    await leftFlick.trigger('mouseleave', mouseLeave)
    
    expect(wrapper.emitted('update:mainOctave')).toEqual([[3]])
  })

  it('exposes methods for parent component', () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4 }
    })
    
    expect(wrapper.vm.addSustainedNote).toBeDefined()
    expect(wrapper.vm.releaseSustainedNote).toBeDefined()
    expect(wrapper.vm.sustainedNotes).toBeDefined()
    expect(typeof wrapper.vm.addSustainedNote).toBe('function')
    expect(typeof wrapper.vm.releaseSustainedNote).toBe('function')
  })

  it('handles resize with default height', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4 } // No paletteHeight prop
    })
    
    const resizeHandle = wrapper.find('.cursor-ns-resize')
    const mouseDown = new MouseEvent('mousedown', { clientY: 100 })
    
    await resizeHandle.trigger('mousedown', mouseDown)
    
    // Component should use default height of 192
    expect(wrapper.vm.resizeStartHeight).toBe(192)
  })

  it('clamps resize height within bounds', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4, paletteHeight: 240 }
    })
    
    const resizeHandle = wrapper.find('.cursor-ns-resize')
    
    // Start resize
    const mouseDown = new MouseEvent('mousedown', { clientY: 100 })
    await resizeHandle.trigger('mousedown', mouseDown)
    
    // Simulate resize move that would exceed maximum
    const vm = wrapper.vm
    const largeDeltaEvent = new MouseEvent('mousemove', { clientY: -400 }) // Very large upward movement
    vm.handleResizeMove(largeDeltaEvent)
    
    expect(wrapper.emitted('update:paletteHeight')).toEqual([[400]]) // Clamped to max
  })

  it('clamps resize height to minimum', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4, paletteHeight: 240 }
    })
    
    const resizeHandle = wrapper.find('.cursor-ns-resize')
    
    // Start resize
    const mouseDown = new MouseEvent('mousedown', { clientY: 100 })
    await resizeHandle.trigger('mousedown', mouseDown)
    
    // Simulate resize move that would go below minimum
    const vm = wrapper.vm
    const largeDeltaEvent = new MouseEvent('mousemove', { clientY: 500 }) // Very large downward movement
    vm.handleResizeMove(largeDeltaEvent)
    
    expect(wrapper.emitted('update:paletteHeight')).toEqual([[128]]) // Clamped to min
  })

  it('cleans up resize listeners on unmount', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4 }
    })
    
    const resizeHandle = wrapper.find('.cursor-ns-resize')
    const mouseDown = new MouseEvent('mousedown', { clientY: 100 })
    
    await resizeHandle.trigger('mousedown', mouseDown)
    
    // Spy on removeEventListener
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
    
    wrapper.unmount()
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))
  })

  it('handles both left and right flick areas', async () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4 }
    })
    
    const flickAreas = wrapper.findAll('.cursor-grab')
    expect(flickAreas.length).toBe(2)
    
    // Both should handle wheel events
    const wheelEvent = new WheelEvent('wheel', { deltaY: -100 })
    
    await flickAreas[0].trigger('wheel', wheelEvent)
    await flickAreas[1].trigger('wheel', wheelEvent)
    
    expect(wrapper.emitted('update:mainOctave')).toEqual([[5], [6]])
  })

  it('has correct CSS classes and structure', () => {
    wrapper = createTestWrapper(PaletteControls, {
      props: { mainOctave: 4 }
    })
    
    const container = wrapper.find('.bg-gray-800.h-5')
    expect(container.classes()).toContain('bg-gray-800')
    expect(container.classes()).toContain('h-5')
    
    const grid = wrapper.find('.grid.grid-cols-5.h-full')
    expect(grid.classes()).toContain('grid')
    expect(grid.classes()).toContain('grid-cols-5')
    expect(grid.classes()).toContain('h-full')
    
    const flickAreas = wrapper.findAll('.cursor-grab')
    flickAreas.forEach(area => {
      expect(area.classes()).toContain('cursor-grab')
      expect(area.classes()).toContain('active:cursor-grabbing')
      expect(area.classes()).toContain('select-none')
    })
    
    const resizeHandle = wrapper.find('.cursor-ns-resize')
    expect(resizeHandle.classes()).toContain('cursor-ns-resize')
    expect(resizeHandle.classes()).toContain('col-span-2')
  })
})