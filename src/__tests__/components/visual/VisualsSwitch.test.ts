import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import MainApp from '@/MainApp.vue'
import { useVisualConfigStore } from '@/stores/visualConfig'

// Everything except the Stage and the store is a stand-in: the behaviour under
// test is the Visuals switch reaching the real Stage and its animation loop.
vi.mock('@/components/LoadingSplash.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/ConfigPanel.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/InstrumentSelector.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/PerformanceDeck.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/composables/useMidiControls', () => ({ useMidiControls: vi.fn() }))
vi.mock('@/composables/useAppLoading', () => ({ useAppLoading: () => ({ isLoading: false }) }))

describe('Visuals switch', () => {
  let pending: Map<number, FrameRequestCallback>
  let nextId: number
  let pinia: ReturnType<typeof createPinia>
  let scheduled: number

  /** Run every frame that is currently queued, as the browser would. */
  const runFrames = (timestamp: number) => {
    const queued = [...pending.entries()]
    pending.clear()
    queued.forEach(([, callback]) => callback(timestamp))
  }

  beforeEach(() => {
    pending = new Map()
    nextId = 0
    scheduled = 0
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      scheduled += 1
      pending.set(++nextId, callback)
      return nextId
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      pending.delete(id)
    })
    pinia = createPinia()
    setActivePinia(pinia)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('unmounts the Stage and ends its animation loop when Visuals is switched off, and restores it when switched on', async () => {
    const store = useVisualConfigStore()
    store.setVisualsEnabled(true)
    const wrapper = mount(MainApp, { global: { plugins: [pinia] } })
    await nextTick()

    // Stage is up and its loop is running: each frame schedules the next one.
    expect(wrapper.find('canvas.unified-canvas').exists()).toBe(true)
    runFrames(16)
    const runningBefore = scheduled
    runFrames(32)
    expect(scheduled).toBeGreaterThan(runningBefore)

    store.setVisualsEnabled(false)
    await nextTick()

    expect(wrapper.find('.unified-visual-effects').exists()).toBe(false)
    expect(wrapper.find('canvas.unified-canvas').exists()).toBe(false)
    // The loop is over: nothing is queued, and running frames schedules nothing.
    expect(pending.size).toBe(0)
    const scheduledAtOff = scheduled
    runFrames(48)
    runFrames(64)
    expect(scheduled).toBe(scheduledAtOff)

    store.setVisualsEnabled(true)
    await nextTick()

    expect(wrapper.find('canvas.unified-canvas').exists()).toBe(true)
    expect(pending.size).toBeGreaterThan(0)

    wrapper.unmount()
    expect(pending.size).toBe(0)
  })
})
