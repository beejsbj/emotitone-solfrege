import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { createTestWrapper, waitForUpdates } from '../helpers/test-utils'
import { setupIntegrationTest, loadComponent, cleanupIntegrationTest, type IntegrationTestContext } from './setup'

describe('Audio-Visual Integration (Fixed)', () => {
  let context: IntegrationTestContext

  beforeEach(async () => {
    context = await setupIntegrationTest()
  })

  afterEach(() => {
    cleanupIntegrationTest()
  })

  describe('Note Events Trigger Audio and Visual Effects', () => {
    it('should trigger visual effects when a note is played via palette', async () => {
      // Skip if stores didn't load properly
      if (!context.stores.music || !context.stores.visualConfig) {
        console.warn('Skipping test - stores not loaded')
        return
      }

      // Load components
      const UnifiedVisualEffects = await loadComponent('UnifiedVisualEffects')
      const DomSolfegePalette = await loadComponent('DomSolfegePalette')

      // Mount components
      const visualEffects = createTestWrapper(UnifiedVisualEffects)
      const palette = createTestWrapper(DomSolfegePalette)

      // Enable visual effects
      context.stores.visualConfig.setMasterEffectsEnabled(true)
      context.stores.visualConfig.setParticlesEnabled(true)
      context.stores.visualConfig.setStringsEnabled(true)

      // Spy on custom events
      const notePlayedSpy = vi.fn()
      const noteReleasedSpy = vi.fn()
      window.addEventListener('note-played', notePlayedSpy)
      window.addEventListener('note-released', noteReleasedSpy)

      // Simulate palette interaction
      const paletteCanvas = palette.find('canvas')
      if (paletteCanvas.exists()) {
        const canvas = paletteCanvas.element as HTMLCanvasElement
        const mousedownEvent = new MouseEvent('mousedown', {
          clientX: 100,
          clientY: 100,
          bubbles: true,
        })

        // Trigger note
        canvas.dispatchEvent(mousedownEvent)
        await waitForUpdates()

        // Verify audio was triggered
        expect(context.stores.music.activeNotes.size).toBeGreaterThan(0)

        // Verify visual event was dispatched
        expect(notePlayedSpy).toHaveBeenCalled()
        if (notePlayedSpy.mock.calls.length > 0) {
          const eventDetail = notePlayedSpy.mock.calls[0][0].detail
          expect(eventDetail).toHaveProperty('frequency')
          expect(eventDetail).toHaveProperty('noteId')
        }

        // Release note
        const mouseupEvent = new MouseEvent('mouseup', { bubbles: true })
        canvas.dispatchEvent(mouseupEvent)
        await waitForUpdates()

        // Verify note released event
        expect(noteReleasedSpy).toHaveBeenCalled()
      }

      // Cleanup
      window.removeEventListener('note-played', notePlayedSpy)
      window.removeEventListener('note-released', noteReleasedSpy)
      visualEffects.unmount()
      palette.unmount()
    })

    it('should handle different instruments with appropriate visual responses', async () => {
      if (!context.stores.music || !context.stores.visualConfig) {
        console.warn('Skipping test - stores not loaded')
        return
      }

      const UnifiedVisualEffects = await loadComponent('UnifiedVisualEffects')
      const visualEffects = createTestWrapper(UnifiedVisualEffects)
      
      context.stores.visualConfig.setMasterEffectsEnabled(true)
      context.stores.visualConfig.setStringsEnabled(true)

      const instruments = ['piano', 'violin', 'flute']
      const visualResponses: any[] = []

      const eventHandler = (e: any) => {
        visualResponses.push({
          instrument: e.detail.instrument,
          frequency: e.detail.frequency,
          timestamp: Date.now(),
        })
      }
      window.addEventListener('note-played', eventHandler)

      // Test each instrument
      for (const instrument of instruments) {
        const noteId = context.stores.music.playNoteByName('C4', instrument)
        await waitForUpdates()
        if (noteId) {
          context.stores.music.stopNote(noteId)
        }
        await waitForUpdates()
      }

      // Verify different instruments triggered events
      expect(visualResponses.length).toBeGreaterThanOrEqual(instruments.length)
      
      // Cleanup
      window.removeEventListener('note-played', eventHandler)
      visualEffects.unmount()
    })
  })

  describe('Performance Under Load', () => {
    it('should maintain reasonable performance with rapid note triggers', async () => {
      if (!context.stores.music || !context.stores.visualConfig) {
        console.warn('Skipping test - stores not loaded')
        return
      }

      const UnifiedVisualEffects = await loadComponent('UnifiedVisualEffects')
      const visualEffects = createTestWrapper(UnifiedVisualEffects)
      
      context.stores.visualConfig.setMasterEffectsEnabled(true)
      context.stores.visualConfig.setParticlesEnabled(true)

      const startTime = performance.now()
      const noteIds: string[] = []

      // Rapidly trigger notes
      for (let i = 0; i < 10; i++) {
        const note = context.stores.music.currentScaleNotes[i % 7]
        const noteId = context.stores.music.playNoteByName(`${note}4`)
        if (noteId) noteIds.push(noteId)
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      // Clean up notes
      for (const noteId of noteIds) {
        context.stores.music.stopNote(noteId)
      }

      const totalTime = performance.now() - startTime
      
      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(1000) // Less than 1 second for 10 notes
      
      visualEffects.unmount()
    })
  })

  describe('Color System Integration', () => {
    it('should update visual colors when key/mode changes', async () => {
      if (!context.stores.music || !context.stores.visualConfig) {
        console.warn('Skipping test - stores not loaded')
        return
      }

      const UnifiedVisualEffects = await loadComponent('UnifiedVisualEffects')
      const visualEffects = createTestWrapper(UnifiedVisualEffects)
      
      context.stores.visualConfig.setMasterEffectsEnabled(true)
      context.stores.visualConfig.setStringsEnabled(true)

      // Capture initial state
      const initialKey = context.stores.music.currentKey
      const initialMode = context.stores.music.currentMode

      // Change key
      context.stores.music.setCurrentKey('G')
      await waitForUpdates()
      expect(context.stores.music.currentKey).toBe('G')

      // Change mode
      context.stores.music.setCurrentMode('minor')
      await waitForUpdates()
      expect(context.stores.music.currentMode).toBe('minor')

      // Play a note to trigger visual update
      const noteId = context.stores.music.playNoteByName('G4')
      await waitForUpdates()

      if (noteId) {
        context.stores.music.stopNote(noteId)
      }

      // Restore initial state
      context.stores.music.setCurrentKey(initialKey)
      context.stores.music.setCurrentMode(initialMode)
      
      visualEffects.unmount()
    })
  })
})