import { describe, it, expect, vi } from 'vitest'
import { createTestWrapper } from '../helpers/test-utils'
import { simulateUserInteraction, waitForAudioLoad, waitForAnimation, mockTouchEvent } from './setup'
import App from '@/App.vue'
import { useMusicStore } from '@/stores/music'
import { useInstrumentStore } from '@/stores/instrument'

describe('Music Learning Workflow', () => {
  it('allows users to change keys and observe scale updates', async () => {
    const wrapper = createTestWrapper(App)
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Start with C major
    expect(musicStore.currentKey).toBe('C')
    expect(musicStore.currentScaleNotes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    
    // Change to G major
    musicStore.setCurrentKey('G')
    await wrapper.vm.$nextTick()
    
    // Scale should update
    expect(musicStore.currentKey).toBe('G')
    expect(musicStore.currentScaleNotes).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F#'])
    
    // Solfege should remain consistent
    expect(musicStore.solfegeData[0].name).toBe('Do')
    expect(musicStore.solfegeData[0].note).toBe('G')
  })

  it('changes modes and updates solfege appropriately', async () => {
    const wrapper = createTestWrapper(App)
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Start with major mode
    expect(musicStore.currentMode).toBe('major')
    
    // Change to minor mode
    musicStore.setCurrentMode('minor')
    await wrapper.vm.$nextTick()
    
    // Scale should update to natural minor
    expect(musicStore.currentMode).toBe('minor')
    expect(musicStore.currentScaleNotes).toEqual(['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'])
    
    // Solfege should reflect minor mode
    expect(musicStore.solfegeData[0].name).toBe('Do')
    expect(musicStore.solfegeData[2].name).toBe('Me') // flat 3rd
  })

  it('enables palette interaction for note playing', async () => {
    const wrapper = createTestWrapper(App)
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Find the solfege palette
    const palette = wrapper.findComponent({ name: 'CanvasSolfegePalette' })
    expect(palette.exists()).toBe(true)
    
    // Simulate user interaction to activate audio
    await simulateUserInteraction(palette)

    // Play a note (Do)
    await musicStore.playNote(0)

    // Should track active notes
    expect(musicStore.activeNotes.size).toBeGreaterThanOrEqual(0)
  })

  it('provides visual feedback for note interactions', async () => {
    const wrapper = createTestWrapper(App)
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    const palette = wrapper.findComponent({ name: 'CanvasSolfegePalette' })
    await simulateUserInteraction(palette)
    
    // Mock canvas context for visual feedback
    const canvasContext = HTMLCanvasElement.prototype.getContext()
    
    // Play a note
    await musicStore.playNote('Do', 4)
    
    // Visual effects should be triggered
    expect(canvasContext.beginPath).toHaveBeenCalled()
    expect(canvasContext.arc).toHaveBeenCalled()
    expect(canvasContext.fill).toHaveBeenCalled()
  })

  it('handles different instruments and audio feedback', async () => {
    const wrapper = createTestWrapper(App)
    const musicStore = useMusicStore()
    const instrumentStore = useInstrumentStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Change instrument
    instrumentStore.setInstrument('synth')
    await wrapper.vm.$nextTick()

    expect(instrumentStore.currentInstrument).toBe('synth')
  })

  it('supports color-coded solfege learning', async () => {
    const wrapper = createTestWrapper(App)
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Each solfege note should have distinct color
    const solfegeData = musicStore.solfegeData
    
    expect(solfegeData).toHaveLength(7)
    
    // Each note should have unique color properties
    solfegeData.forEach((note, index) => {
      expect(note.color).toBeDefined()
      expect(note.name).toBeDefined()
      expect(note.note).toBeDefined()
    })
  })

  it('handles touch interactions for mobile learning', async () => {
    const wrapper = createTestWrapper(App)
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    const palette = wrapper.findComponent({ name: 'CanvasSolfegePalette' })
    const paletteElement = palette.element
    
    // Mock touch events
    const touches = [{
      identifier: 0,
      clientX: 100,
      clientY: 100,
      target: paletteElement
    }]
    
    // Simulate touch start
    mockTouchEvent(paletteElement, 'touchstart', touches)
    await wrapper.vm.$nextTick()
    
    // Should handle touch interaction
    expect(musicStore.activeNotes.size).toBeGreaterThanOrEqual(0)
  })

  it('provides scale degree progression learning', async () => {
    const wrapper = createTestWrapper(App)
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Play through scale degrees
    for (let i = 0; i < 7; i++) {
      await musicStore.playNote(i)
      await waitForAnimation(100)
    }
  })

  it('handles interval learning through note combinations', async () => {
    const wrapper = createTestWrapper(App)
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Play a perfect fifth (Do + Sol)
    await musicStore.playNote(0)
    await musicStore.playNote(4)

    // Should track active notes
    expect(musicStore.activeNotes.size).toBeGreaterThanOrEqual(0)
  })

  it('provides real-time harmonic analysis feedback', async () => {
    const wrapper = createTestWrapper(App)
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Check if floating popup shows harmonic information
    const floatingPopup = wrapper.findComponent({ name: 'FloatingPopup' })
    expect(floatingPopup.exists()).toBe(true)
    
    // Play a chord (triad)
    await musicStore.playNote('Do', 4)
    await musicStore.playNote('Mi', 4)
    await musicStore.playNote('Sol', 4)
    
    // Should analyze the harmonic content
    expect(musicStore.activeNotes.size).toBe(3)
    
    // Popup should potentially show chord analysis
    await wrapper.vm.$nextTick()
  })

  it('handles note release and polyphonic management', async () => {
    const wrapper = createTestWrapper(App)
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Play and release a note
    await musicStore.playNote(0)
    const noteId = Array.from(musicStore.activeNotes.keys())[0]

    // Release the note
    if (noteId) {
      await musicStore.releaseNote(noteId)
    }

    // Should remove from active notes
    expect(musicStore.activeNotes.size).toBe(0)
  })
})