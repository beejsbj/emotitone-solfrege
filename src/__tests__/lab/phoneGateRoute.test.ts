import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createTestWrapper } from '../helpers/test-utils'
import App from '@/App.vue'
import mainSource from '@/main.ts?raw'
import { LAB_PAGES, isLabRoute } from '@/labRoutes'
import { getAudioContext } from '@/services/superdoughAudio'

// The Stage needs a canvas; the instrument shell is not under test here.
vi.mock('@/components/UnifiedVisualEffects.vue', () => ({
  default: { template: '<div data-testid="stage" />' },
}))
vi.mock('@/MainApp.vue', () => ({
  default: { template: '<div data-testid="main-app" />' },
}))

async function mountAt(path: string) {
  window.history.replaceState({}, '', path)
  const wrapper = createTestWrapper(App)
  await vi.waitFor(async () => {
    await flushPromises()
    expect(wrapper.find('[data-testid="phone-gate"], [data-testid="main-app"]').exists()).toBe(true)
  })
  return wrapper
}

describe('the phone gate route (BJS-494)', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => window.history.replaceState({}, '', '/'))

  it('renders the gate, over the Stage, from its preview path, instead of the instrument', async () => {
    const wrapper = await mountAt('/lab/phone-gate')
    expect(wrapper.find('[data-testid="phone-gate"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="main-app"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="stage"]').exists()).toBe(true)
    // The Run key is the Button primitive, not a bespoke button.
    expect(wrapper.find('[data-testid="phone-gate-run"]').classes()).toContain('paper-button')
    expect(wrapper.text()).toContain('Run the phone gate')
    wrapper.unmount()
  })

  it('keeps the instrument on every other path', async () => {
    const wrapper = await mountAt('/lab/unknown')
    expect(wrapper.find('[data-testid="main-app"]').exists()).toBe(true)
    expect(isLabRoute('/lab/phone-gate')).toBe(true)
    expect(LAB_PAGES['/lab/phone-gate']).toBe('phone-gate')
    expect(isLabRoute('/')).toBe(false)
    wrapper.unmount()
  })

  it('starts audio on the Run tap, and still summarises a run that could not load the piano', async () => {
    const wrapper = await mountAt('/lab/phone-gate')
    await wrapper.find('[data-testid="phone-gate-run"]').trigger('click')
    // The tap is the unlock gesture: the app's context is asked to run inside it.
    expect(getAudioContext).toHaveBeenCalled()
    // This test context has no AudioWorklet, so the piano cannot enter the worklet.
    await vi.waitFor(async () => {
      await flushPromises()
      expect(wrapper.find('[data-testid="phone-gate-summary"]').exists()).toBe(true)
    })
    const summary = wrapper.find('[data-testid="phone-gate-summary"]').text()
    expect(summary).toContain('EmotiTone phone gate (BJS-494)')
    expect(summary).toContain('Stopped early: The piano is not in the worklet')
    expect(summary).toContain('[NOT RUN] Attacks lost')
    expect(wrapper.find('[data-testid="phone-gate-copy"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('keeps production bootstrap (editions, saved data) off lab pages', () => {
    // Routing contract: main.ts reads the same lab route list App.vue routes by.
    expect(mainSource).toContain('from "./labRoutes"')
  })
})
