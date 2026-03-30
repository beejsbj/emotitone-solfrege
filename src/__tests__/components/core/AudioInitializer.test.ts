import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { createTestWrapper } from '../../helpers/test-utils'
import AudioInitializer from '@/components/AudioInitializer.vue'

const initSuperdoughAudio = vi.hoisted(() => vi.fn())

vi.mock('@/services/superdoughAudio', () => ({
  initSuperdoughAudio,
}))

describe('AudioInitializer.vue', () => {
  let wrapper: ReturnType<typeof createTestWrapper> | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    initSuperdoughAudio.mockResolvedValue(undefined)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders the enable-audio prompt by default', () => {
    wrapper = createTestWrapper(AudioInitializer)

    expect(wrapper.find('.audio-initializer').exists()).toBe(true)
    expect(wrapper.find('h3').text()).toBe('Enable Audio')
    expect(wrapper.find('.enable-audio-btn').text()).toBe('Enable Audio')
  })

  it('auto-initializes on mount and hides the prompt when setup succeeds', async () => {
    wrapper = createTestWrapper(AudioInitializer)

    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()

    expect(initSuperdoughAudio).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.audio-initializer').exists()).toBe(false)
  })

  it('keeps the prompt visible after a mount-time initialization failure', async () => {
    initSuperdoughAudio.mockRejectedValueOnce(new Error('user gesture required'))

    wrapper = createTestWrapper(AudioInitializer)

    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()

    expect(initSuperdoughAudio).toHaveBeenCalledTimes(1)
    expect(console.error).not.toHaveBeenCalled()
    expect(wrapper.find('.audio-initializer').exists()).toBe(true)
  })

  it('hides the prompt after a successful click initialization', async () => {
    wrapper = createTestWrapper(AudioInitializer)

    await wrapper.find('.enable-audio-btn').trigger('click')
    await flushPromises()

    expect(initSuperdoughAudio).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.audio-initializer').exists()).toBe(false)
  })

  it('logs click-time failures and keeps the prompt visible', async () => {
    const error = new Error('audio init failed')
    initSuperdoughAudio.mockRejectedValueOnce(error)

    wrapper = createTestWrapper(AudioInitializer)

    await wrapper.find('.enable-audio-btn').trigger('click')
    await flushPromises()

    expect(initSuperdoughAudio).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith('Error initializing audio:', error)
    expect(wrapper.find('.audio-initializer').exists()).toBe(true)
  })

  it('shows the initializing state while a click is in flight', async () => {
    let resolveInit: (() => void) | undefined
    initSuperdoughAudio.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveInit = resolve
        })
    )

    wrapper = createTestWrapper(AudioInitializer)
    const button = wrapper.find('.enable-audio-btn')

    const triggerPromise = button.trigger('click')
    await nextTick()

    expect(button.text()).toBe('Initializing...')
    expect(button.attributes('disabled')).toBeDefined()

    resolveInit?.()
    await triggerPromise
    await flushPromises()

    expect(wrapper.find('.audio-initializer').exists()).toBe(false)
  })
})
