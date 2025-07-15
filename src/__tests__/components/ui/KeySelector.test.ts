import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createTestWrapper } from '../../helpers/test-utils'
import KeySelector from '@/components/KeySelector.vue'

// Mock store
const mockMusicStore = {
  currentKey: 'C',
  currentMode: 'major',
  setKey: vi.fn(),
  setMode: vi.fn()
}

vi.mock('@/stores/music', () => ({
  useMusicStore: () => mockMusicStore
}))

// Mock haptic feedback
vi.mock('@/utils/hapticFeedback', () => ({
  triggerUIHaptic: vi.fn()
}))

describe('KeySelector.vue', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock store state
    mockMusicStore.currentKey = 'C'
    mockMusicStore.currentMode = 'major'
    
    // Mock touch events
    global.TouchEvent = vi.fn().mockImplementation((type, options) => ({
      type,
      ...options,
      touches: options?.touches || [],
      changedTouches: options?.changedTouches || [],
      preventDefault: vi.fn()
    }))
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  it('renders correctly', () => {
    wrapper = createTestWrapper(KeySelector)
    
    expect(wrapper.find('.key-selector').exists()).toBe(true)
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('circle').exists()).toBe(true)
  })

  it('displays circle of fifths', () => {
    wrapper = createTestWrapper(KeySelector)
    
    const vm = wrapper.vm
    expect(vm.circleOfFifths).toEqual([
      'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'Ab', 'Eb', 'Bb', 'F'
    ])
  })

  it('displays relative minors', () => {
    wrapper = createTestWrapper(KeySelector)
    
    const vm = wrapper.vm
    expect(vm.relativeMinors).toEqual([
      'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m', 'Fm', 'Cm', 'Gm', 'Dm'
    ])
  })

  it('highlights selected major key', () => {
    mockMusicStore.currentKey = 'G'
    mockMusicStore.currentMode = 'major'
    
    wrapper = createTestWrapper(KeySelector)
    
    const vm = wrapper.vm
    expect(vm.selectedKey).toBe('G')
    expect(vm.selectedMinorKey).toBe('Em')
  })

  it('highlights selected minor key', () => {
    mockMusicStore.currentKey = 'Am'
    mockMusicStore.currentMode = 'minor'
    
    wrapper = createTestWrapper(KeySelector)
    
    const vm = wrapper.vm
    expect(vm.selectedKey).toBe('C')
    expect(vm.selectedMinorKey).toBe('Am')
  })

  it('handles mouse drag start', async () => {
    wrapper = createTestWrapper(KeySelector)
    
    const svg = wrapper.find('svg')
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100
    })
    
    await svg.trigger('mousedown', mouseEvent)
    
    expect(wrapper.vm.isDragging).toBe(true)
  })

  it('handles touch drag start', async () => {
    wrapper = createTestWrapper(KeySelector)
    
    const svg = wrapper.find('svg')
    const touchEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 }]
    })
    
    await svg.trigger('touchstart', touchEvent)
    
    expect(wrapper.vm.isDragging).toBe(true)
  })

  it('handles mouse drag', async () => {
    wrapper = createTestWrapper(KeySelector)
    
    const svg = wrapper.find('svg')
    
    // Start drag
    const mouseStart = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100
    })
    await svg.trigger('mousedown', mouseStart)
    
    // Move mouse
    const mouseMove = new MouseEvent('mousemove', {
      clientX: 150,
      clientY: 150
    })
    await svg.trigger('mousemove', mouseMove)
    
    expect(wrapper.vm.isDragging).toBe(true)
  })

  it('handles touch drag', async () => {
    wrapper = createTestWrapper(KeySelector)
    
    const svg = wrapper.find('svg')
    
    // Start drag
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 }]
    })
    await svg.trigger('touchstart', touchStart)
    
    // Move touch
    const touchMove = new TouchEvent('touchmove', {
      touches: [{ clientX: 150, clientY: 150 }]
    })
    await svg.trigger('touchmove', touchMove)
    
    expect(wrapper.vm.isDragging).toBe(true)
  })

  it('handles drag end', async () => {
    wrapper = createTestWrapper(KeySelector)
    
    const svg = wrapper.find('svg')
    
    // Start drag
    const mouseStart = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100
    })
    await svg.trigger('mousedown', mouseStart)
    
    // End drag
    const mouseEnd = new MouseEvent('mouseup', {
      clientX: 150,
      clientY: 150
    })
    await svg.trigger('mouseup', mouseEnd)
    
    expect(wrapper.vm.isDragging).toBe(false)
  })

  it('handles mouse leave to end drag', async () => {
    wrapper = createTestWrapper(KeySelector)
    
    const svg = wrapper.find('svg')
    
    // Start drag
    const mouseStart = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100
    })
    await svg.trigger('mousedown', mouseStart)
    
    // Mouse leave
    const mouseLeave = new MouseEvent('mouseleave')
    await svg.trigger('mouseleave', mouseLeave)
    
    expect(wrapper.vm.isDragging).toBe(false)
  })

  it('applies dragging cursor when dragging', async () => {
    wrapper = createTestWrapper(KeySelector)
    
    const svg = wrapper.find('svg')
    
    // Initially not dragging
    expect(svg.classes()).toContain('cursor-grab')
    expect(svg.classes()).not.toContain('cursor-grabbing')
    
    // Start drag
    const mouseStart = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100
    })
    await svg.trigger('mousedown', mouseStart)
    await nextTick()
    
    // Should show dragging cursor
    expect(svg.classes()).toContain('cursor-grabbing')
  })

  it('renders background circles', () => {
    wrapper = createTestWrapper(KeySelector)
    
    const circles = wrapper.findAll('circle')
    expect(circles.length).toBeGreaterThan(2) // Background circles + key circles
    
    // Check outer background circle
    const outerCircle = circles.find(circle => 
      circle.attributes('r') === '140'
    )
    expect(outerCircle).toBeTruthy()
    
    // Check inner background circle
    const innerCircle = circles.find(circle => 
      circle.attributes('r') === '100'
    )
    expect(innerCircle).toBeTruthy()
  })

  it('renders top indicator', () => {
    wrapper = createTestWrapper(KeySelector)
    
    const polygon = wrapper.find('polygon')
    expect(polygon.exists()).toBe(true)
    expect(polygon.attributes('points')).toBe('160,20 150,35 170,35')
  })

  it('renders major key circles', () => {
    wrapper = createTestWrapper(KeySelector)
    
    const circles = wrapper.findAll('circle')
    
    // Should have circles for all major keys
    const majorKeyCircles = circles.filter(circle => 
      circle.attributes('r') === '20'
    )
    expect(majorKeyCircles.length).toBe(12)
  })

  it('renders minor key circles', () => {
    wrapper = createTestWrapper(KeySelector)
    
    const circles = wrapper.findAll('circle')
    
    // Should have circles for all minor keys
    const minorKeyCircles = circles.filter(circle => 
      circle.attributes('r') === '16'
    )
    expect(minorKeyCircles.length).toBe(12)
  })

  it('renders key labels', () => {
    wrapper = createTestWrapper(KeySelector)
    
    const textElements = wrapper.findAll('text')
    expect(textElements.length).toBe(24) // 12 major + 12 minor
    
    // Check for some key labels
    const textContent = textElements.map(el => el.text()).join(' ')
    expect(textContent).toContain('C')
    expect(textContent).toContain('G')
    expect(textContent).toContain('Am')
    expect(textContent).toContain('Em')
  })

  it('applies correct rotation transform', () => {
    wrapper = createTestWrapper(KeySelector)
    
    const vm = wrapper.vm
    vm.rotationAngle = 30
    
    const transformGroups = wrapper.findAll('g[transform]')
    expect(transformGroups.length).toBeGreaterThan(0)
    
    // Check that rotation is applied
    const transforms = transformGroups.map(group => group.attributes('transform'))
    expect(transforms.some(transform => transform.includes('rotate(-30 160 160)'))).toBe(true)
  })

  it('handles key selection with major mode', () => {
    mockMusicStore.currentKey = 'G'
    mockMusicStore.currentMode = 'major'
    
    wrapper = createTestWrapper(KeySelector)
    
    const vm = wrapper.vm
    expect(vm.selectedKey).toBe('G')
    expect(vm.selectedMinorKey).toBe('Em')
  })

  it('handles key selection with minor mode', () => {
    mockMusicStore.currentKey = 'Am'
    mockMusicStore.currentMode = 'minor'
    
    wrapper = createTestWrapper(KeySelector)
    
    const vm = wrapper.vm
    expect(vm.selectedKey).toBe('C')
    expect(vm.selectedMinorKey).toBe('Am')
  })

  it('applies different styles for major and minor selected keys', () => {
    mockMusicStore.currentKey = 'C'
    mockMusicStore.currentMode = 'major'
    
    wrapper = createTestWrapper(KeySelector)
    
    const circles = wrapper.findAll('circle')
    
    // Major key should be highlighted
    const majorCircle = circles.find(circle => 
      circle.attributes('r') === '20' && 
      circle.attributes('fill') === 'rgba(251, 191, 36, 0.8)'
    )
    expect(majorCircle).toBeTruthy()
    
    // Minor key should not be highlighted
    const minorCircle = circles.find(circle => 
      circle.attributes('r') === '16' && 
      circle.attributes('fill') === 'rgba(168, 85, 247, 0.8)'
    )
    expect(minorCircle).toBeFalsy()
  })

  it('applies different styles for minor selected keys', () => {
    mockMusicStore.currentKey = 'Am'
    mockMusicStore.currentMode = 'minor'
    
    wrapper = createTestWrapper(KeySelector)
    
    const circles = wrapper.findAll('circle')
    
    // Minor key should be highlighted
    const minorCircle = circles.find(circle => 
      circle.attributes('r') === '16' && 
      circle.attributes('fill') === 'rgba(168, 85, 247, 0.8)'
    )
    expect(minorCircle).toBeTruthy()
    
    // Major key should not be highlighted
    const majorCircle = circles.find(circle => 
      circle.attributes('r') === '20' && 
      circle.attributes('fill') === 'rgba(251, 191, 36, 0.8)'
    )
    expect(majorCircle).toBeFalsy()
  })

  it('has correct SVG dimensions and viewBox', () => {
    wrapper = createTestWrapper(KeySelector)
    
    const svg = wrapper.find('svg')
    expect(svg.attributes('viewBox')).toBe('0 0 320 320')
    expect(svg.classes()).toContain('w-full')
    expect(svg.classes()).toContain('h-full')
  })

  it('has correct container structure', () => {
    wrapper = createTestWrapper(KeySelector)
    
    const container = wrapper.find('.key-selector')
    expect(container.exists()).toBe(true)
    
    const circleContainer = wrapper.find('.relative.w-80.h-80.mx-auto')
    expect(circleContainer.exists()).toBe(true)
  })

  it('handles drag state correctly', () => {
    wrapper = createTestWrapper(KeySelector)
    
    const vm = wrapper.vm
    
    // Initially not dragging
    expect(vm.isDragging).toBe(false)
    
    // Start drag
    vm.startDrag(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }))
    expect(vm.isDragging).toBe(true)
    
    // End drag
    vm.endDrag()
    expect(vm.isDragging).toBe(false)
  })

  it('calculates correct positions for major keys', () => {
    wrapper = createTestWrapper(KeySelector)
    
    const vm = wrapper.vm
    
    // Check that major keys are positioned correctly
    const circles = wrapper.findAll('circle[r="20"]')
    expect(circles.length).toBe(12)
    
    // Each major key should have unique position
    const positions = circles.map(circle => ({
      cx: circle.attributes('cx'),
      cy: circle.attributes('cy')
    }))
    
    const uniquePositions = new Set(positions.map(pos => `${pos.cx},${pos.cy}`))
    expect(uniquePositions.size).toBe(12)
  })

  it('calculates correct positions for minor keys', () => {
    wrapper = createTestWrapper(KeySelector)
    
    const vm = wrapper.vm
    
    // Check that minor keys are positioned correctly
    const circles = wrapper.findAll('circle[r="16"]')
    expect(circles.length).toBe(12)
    
    // Each minor key should have unique position
    const positions = circles.map(circle => ({
      cx: circle.attributes('cx'),
      cy: circle.attributes('cy')
    }))
    
    const uniquePositions = new Set(positions.map(pos => `${pos.cx},${pos.cy}`))
    expect(uniquePositions.size).toBe(12)
  })
})