import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { defineStore } from 'pinia'
import { ref, type App as VueApp } from 'vue'
import { createTestWrapper } from '../helpers/test-utils'
import App from '@/App.vue'
import { LAB_PAGES, isLabRoute } from '@/labRoutes'
import { getAudioContext } from '@/services/audioRuntime'
import legacyVisualConfig from '../fixtures/persistence/visual-config.v0.store-capture.json?raw'

// The lazy page compiles cold on first import: give it longer than vi.waitFor's 1 s default.
const LAZY_PAGE = { timeout: 5000 }

// The Stage needs a canvas; the instrument shell is not under test here.
vi.mock('@/components/UnifiedVisualEffects.vue', () => ({
  default: { template: '<div data-testid="stage" />' },
}))
vi.mock('@/MainApp.vue', () => ({
  default: { template: '<div data-testid="main-app" />' },
}))

/** A store saved like the app's own (pinia-plugin-persistedstate), to see whether anything is saved. */
const useSavedProbe = defineStore('phone-gate-saved-probe', () => ({ value: ref(0) }), {
  persist: { key: 'phone-gate-saved-probe' },
})

async function mountAt(path: string) {
  window.history.replaceState({}, '', path)
  const wrapper = createTestWrapper(App)
  await vi.waitFor(async () => {
    await flushPromises()
    expect(wrapper.find('[data-testid="phone-gate"], [data-testid="main-app"]').exists()).toBe(true)
  }, LAZY_PAGE)
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
    }, LAZY_PAGE)
    const summary = wrapper.find('[data-testid="phone-gate-summary"]').text()
    expect(summary).toContain('EmotiTone phone gate (BJS-494)')
    expect(summary).toContain('Stopped early: The piano is not in the worklet')
    expect(summary).toContain('[NOT RUN] Attacks lost')
    expect(wrapper.find('[data-testid="phone-gate-copy"]').exists()).toBe(true)
    wrapper.unmount()
  })

  /** Boot the production entry at `path`, as a page load does; returns its app. */
  async function bootAt(path: string) {
    vi.resetModules()
    window.history.replaceState({}, '', path)
    document.body.innerHTML = '<div id="app"></div>'
    const root = document.getElementById('app') as HTMLElement & { __vue_app__?: VueApp }
    await import('@/main')
    await vi.waitFor(async () => {
      await flushPromises()
      expect(root.querySelector('[data-testid="phone-gate"], [data-testid="main-app"]')).not.toBeNull()
    }, LAZY_PAGE)
    return { root, app: root.__vue_app__! }
  }

  it('saves nothing to localStorage from the lab page: no edition pick, no persisted store', async () => {
    const setItem = vi.mocked(window.localStorage.setItem)
    const { root, app } = await bootAt('/lab/phone-gate')
    expect(root.querySelector('[data-testid="phone-gate"]')).not.toBeNull()
    // A persisted store used and changed on the lab page, through the entry's own Pinia.
    const probe = app.runWithContext(() => useSavedProbe())
    probe.value++
    await flushPromises()
    expect(setItem).not.toHaveBeenCalled()
    expect(window.localStorage.length).toBe(0)
    // The persistence plugin is not even installed: the probe is not saved in the page's memory either.
    const { persistentStorage } = await import('@/services/safeStorage')
    expect(persistentStorage.getItem('phone-gate-saved-probe')).toBeNull()
    app.unmount()
  })

  it('leaves legacy saved settings byte-identical: no load-time migration writes from the lab page', async () => {
    // A player's v0 visual settings: on the instrument, loading them migrates
    // the format and moves tempo, octave and rows to their own keys.
    window.localStorage.setItem('emotitone-visual-config', legacyVisualConfig)
    const snapshot = () => Object.fromEntries(Array.from({ length: window.localStorage.length },
      (_, index) => window.localStorage.key(index)!).map(key => [key, window.localStorage.getItem(key)]))
    const before = snapshot()
    const setItem = vi.mocked(window.localStorage.setItem)
    setItem.mockClear()
    const { root, app } = await bootAt('/lab/phone-gate')
    expect(root.querySelector('[data-testid="phone-gate"]')).not.toBeNull()
    // Past every debounced save.
    await new Promise(resolve => setTimeout(resolve, 700))
    await flushPromises()
    expect(setItem).not.toHaveBeenCalled()
    expect(snapshot()).toEqual(before)
    app.unmount()
  })

  it('saves the same store on the instrument, so the lab page is the only difference', async () => {
    const { app } = await bootAt('/')
    const probe = app.runWithContext(() => useSavedProbe())
    probe.value++
    await flushPromises()
    expect(window.localStorage.getItem('phone-gate-saved-probe')).toBe(JSON.stringify({ value: 1 }))
    app.unmount()
  })
})
