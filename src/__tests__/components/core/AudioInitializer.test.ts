import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createTestWrapper } from '../../helpers/test-utils'
import AudioInitializer from '@/components/AudioInitializer.vue'

// Mock audio service
const mockAudioService = {
  startAudioContext: vi.fn()
}

vi.mock('@/services/audio', () => ({
  audioService: mockAudioService
}))

describe('AudioInitializer.vue', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
    
    // Reset mock implementations
    mockAudioService.startAudioContext.mockResolvedValue(true)
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders audio initializer when audio is not ready', async () => {
    wrapper = createTestWrapper(AudioInitializer)
    
    expect(wrapper.find('.audio-initializer').exists()).toBe(true)
    expect(wrapper.find('.audio-prompt').exists()).toBe(true)
    expect(wrapper.find('.audio-icon').exists()).toBe(true)
    expect(wrapper.find('h3').text()).toBe('Enable Audio')
    expect(wrapper.find('p').text()).toBe('Click to enable audio for the best experience')
    expect(wrapper.find('.enable-audio-btn').exists()).toBe(true)
  })

  it('does not render when audio is ready', async () => {
    mockAudioService.startAudioContext.mockResolvedValue(true)
    
    wrapper = createTestWrapper(AudioInitializer)
    
    // Fast-forward the timeout
    vi.advanceTimersByTime(500)
    await nextTick()
    
    expect(wrapper.find('.audio-initializer').exists()).toBe(false)
  })

  it('handles successful audio initialization on button click', async () => {
    mockAudioService.startAudioContext.mockResolvedValue(true)
    
    wrapper = createTestWrapper(AudioInitializer)
    
    const button = wrapper.find('.enable-audio-btn')
    expect(button.text()).toBe('Enable Audio')
    expect(button.attributes('disabled')).toBeUndefined()
    
    await button.trigger('click')
    
    expect(mockAudioService.startAudioContext).toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith('Audio context successfully initialized')
    
    // Component should hide after successful initialization
    await nextTick()
    expect(wrapper.find('.audio-initializer').exists()).toBe(false)
  })

  it('handles failed audio initialization on button click', async () => {
    mockAudioService.startAudioContext.mockResolvedValue(false)
    
    wrapper = createTestWrapper(AudioInitializer)
    
    const button = wrapper.find('.enable-audio-btn')
    await button.trigger('click')
    
    expect(mockAudioService.startAudioContext).toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalledWith('Failed to initialize audio context')
    
    // Component should still be visible
    await nextTick()
    expect(wrapper.find('.audio-initializer').exists()).toBe(true)
  })

  it('handles audio initialization error', async () => {
    const testError = new Error('Audio context error')
    mockAudioService.startAudioContext.mockRejectedValue(testError)
    
    wrapper = createTestWrapper(AudioInitializer)
    
    const button = wrapper.find('.enable-audio-btn')
    await button.trigger('click')
    
    expect(mockAudioService.startAudioContext).toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith('Error initializing audio:', testError)
    
    // Component should still be visible
    await nextTick()
    expect(wrapper.find('.audio-initializer').exists()).toBe(true)
  })

  it('shows loading state during initialization', async () => {
    let resolvePromise: (value: boolean) => void
    const slowPromise = new Promise<boolean>((resolve) => {
      resolvePromise = resolve
    })
    mockAudioService.startAudioContext.mockReturnValue(slowPromise)
    
    wrapper = createTestWrapper(AudioInitializer)
    
    const button = wrapper.find('.enable-audio-btn')
    expect(button.text()).toBe('Enable Audio')
    expect(button.attributes('disabled')).toBeUndefined()
    
    // Start initialization
    await button.trigger('click')
    await nextTick()
    
    // Should show loading state
    expect(wrapper.find('.enable-audio-btn').text()).toBe('Initializing...')
    expect(wrapper.find('.enable-audio-btn').attributes('disabled')).toBeDefined()
    
    // Complete initialization
    resolvePromise!(true)
    await nextTick()
    
    // Should return to normal state (or hide if successful)
    expect(wrapper.find('.audio-initializer').exists()).toBe(false)
  })

  it('disables button during initialization', async () => {
    let resolvePromise: (value: boolean) => void
    const slowPromise = new Promise<boolean>((resolve) => {
      resolvePromise = resolve
    })
    mockAudioService.startAudioContext.mockReturnValue(slowPromise)
    
    wrapper = createTestWrapper(AudioInitializer)
    
    const button = wrapper.find('.enable-audio-btn')
    await button.trigger('click')
    await nextTick()
    
    expect(button.attributes('disabled')).toBeDefined()
    
    // Complete initialization
    resolvePromise!(false)
    await nextTick()
    
    expect(wrapper.find('.enable-audio-btn').attributes('disabled')).toBeUndefined()
  })

  it('auto-initializes on mount if audio context is available', async () => {
    mockAudioService.startAudioContext.mockResolvedValue(true)
    
    wrapper = createTestWrapper(AudioInitializer)
    
    // Initially visible
    expect(wrapper.find('.audio-initializer').exists()).toBe(true)
    
    // Fast-forward the timeout
    vi.advanceTimersByTime(500)
    await nextTick()
    
    expect(mockAudioService.startAudioContext).toHaveBeenCalled()
    expect(wrapper.find('.audio-initializer').exists()).toBe(false)
  })

  it('handles auto-initialization failure gracefully', async () => {
    mockAudioService.startAudioContext.mockRejectedValue(new Error('No user interaction'))
    
    wrapper = createTestWrapper(AudioInitializer)
    
    // Initially visible
    expect(wrapper.find('.audio-initializer').exists()).toBe(true)
    
    // Fast-forward the timeout
    vi.advanceTimersByTime(500)
    await nextTick()
    
    expect(mockAudioService.startAudioContext).toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith('Audio requires user interaction')
    
    // Component should still be visible
    expect(wrapper.find('.audio-initializer').exists()).toBe(true)
  })

  it('has correct CSS classes and structure', () => {
    wrapper = createTestWrapper(AudioInitializer)
    
    const initializer = wrapper.find('.audio-initializer')
    expect(initializer.classes()).toContain('audio-initializer')
    
    const prompt = wrapper.find('.audio-prompt')
    expect(prompt.classes()).toContain('audio-prompt')
    
    const icon = wrapper.find('.audio-icon')
    expect(icon.classes()).toContain('audio-icon')
    expect(icon.text()).toBe('🔊')
    
    const button = wrapper.find('.enable-audio-btn')
    expect(button.classes()).toContain('enable-audio-btn')
  })

  it('has correct accessibility attributes', () => {
    wrapper = createTestWrapper(AudioInitializer)
    
    const button = wrapper.find('.enable-audio-btn')
    expect(button.element.tagName).toBe('BUTTON')
    
    // Button should be focusable
    expect(button.attributes('tabindex')).not.toBe('-1')
  })

  it('handles multiple rapid clicks gracefully', async () => {
    let resolvePromise: (value: boolean) => void
    const slowPromise = new Promise<boolean>((resolve) => {
      resolvePromise = resolve
    })
    mockAudioService.startAudioContext.mockReturnValue(slowPromise)
    
    wrapper = createTestWrapper(AudioInitializer)
    
    const button = wrapper.find('.enable-audio-btn')
    
    // Click multiple times rapidly
    await button.trigger('click')
    await button.trigger('click')
    await button.trigger('click')
    
    // Should only call service once
    expect(mockAudioService.startAudioContext).toHaveBeenCalledTimes(1)
    
    resolvePromise!(true)
    await nextTick()
  })

  it('resets state correctly after failed initialization', async () => {
    mockAudioService.startAudioContext.mockResolvedValue(false)
    
    wrapper = createTestWrapper(AudioInitializer)
    
    const button = wrapper.find('.enable-audio-btn')
    
    // First attempt fails
    await button.trigger('click')
    await nextTick()
    
    expect(wrapper.find('.audio-initializer').exists()).toBe(true)
    expect(button.text()).toBe('Enable Audio')
    expect(button.attributes('disabled')).toBeUndefined()
    
    // Should be able to try again
    mockAudioService.startAudioContext.mockResolvedValue(true)
    await button.trigger('click')
    await nextTick()
    
    expect(wrapper.find('.audio-initializer').exists()).toBe(false)
  })
})