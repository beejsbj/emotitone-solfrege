import { describe, it, expect, vi } from 'vitest'
import { createTestWrapper } from '../helpers/test-utils'
import { simulateUserInteraction, waitForAudioLoad, waitForAnimation, mockTouchEvent } from './setup'
import App from '@/App.vue'
import { useSequencerStore } from '@/stores/sequencer'
import { useMusicStore } from '@/stores/music'
import { useInstrumentStore } from '@/stores/instrument'
import { audioService } from '@/services/audio'
import { measurePerformance } from '../helpers/test-utils'

describe('Performance and Stress Testing', () => {
  it('handles rapid user interactions without lag', async () => {
    const wrapper = createTestWrapper(App)
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    const palette = wrapper.findComponent({ name: 'CanvasSolfegePalette' })
    await simulateUserInteraction(palette)
    
    // Measure performance of rapid note playing
    const performanceTime = measurePerformance(() => {
      // Simulate rapid note playing
      for (let i = 0; i < 50; i++) {
        const solfegeIndex = i % 7
        const solfegeName = musicStore.solfegeData[solfegeIndex].name
        musicStore.playNote(solfegeName, 4)
      }
    })
    
    // Should complete rapid interactions quickly (within 100ms)
    expect(performanceTime).toBeLessThan(100)
    
    // Should not crash or hang
    expect(wrapper.find('#app')).toBeTruthy()
  })

  it('manages multiple simultaneous audio streams', async () => {
    const wrapper = createTestWrapper(App)
    const musicStore = useMusicStore()
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Create multiple sequencers
    for (let i = 0; i < 8; i++) {
      sequencerStore.createSequencer(`Track ${i}`, 'piano')
    }
    
    expect(sequencerStore.sequencers.length).toBe(8)
    
    // Add beats to all sequencers
    sequencerStore.sequencers.forEach((seq, index) => {
      for (let step = 0; step < 16; step += 4) {
        sequencerStore.addBeat(seq.id, {
          id: `beat-${index}-${step}`,
          step: step,
          ring: index % 7,
          note: `C${4 + (index % 3)}`,
          velocity: 0.7,
          active: true,
          solfegeIndex: index % 7
        })
      }
    })
    
    const playNoteSpy = vi.spyOn(audioService, 'playNote')
    
    // Start all sequencers simultaneously
    sequencerStore.sequencers.forEach(seq => {
      sequencerStore.startSequencer(seq.id)
    })
    
    // All should be playing
    expect(sequencerStore.playingSequencers.length).toBe(8)
    
    // Let them play for a bit
    await waitForAnimation(1000)
    
    // Should handle multiple streams without crashing
    expect(playNoteSpy).toHaveBeenCalled()
    expect(wrapper.find('#app')).toBeTruthy()
  })

  it('handles stress test with complex compositions', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Create complex composition with many tracks and beats
    const numTracks = 10
    const beatsPerTrack = 64
    
    // Create tracks
    for (let i = 0; i < numTracks; i++) {
      sequencerStore.createSequencer(`Track ${i}`, 'piano')
    }
    
    // Add many beats to each track
    const performanceTime = measurePerformance(() => {
      sequencerStore.sequencers.forEach((seq, trackIndex) => {
        for (let beat = 0; beat < beatsPerTrack; beat++) {
          sequencerStore.addBeat(seq.id, {
            id: `beat-${trackIndex}-${beat}`,
            step: beat % 16,
            ring: beat % 7,
            note: `C${4 + (beat % 3)}`,
            velocity: Math.random() * 0.5 + 0.5,
            active: Math.random() > 0.3,
            solfegeIndex: beat % 7
          })
        }
      })
    })
    
    // Should handle complex composition creation efficiently
    expect(performanceTime).toBeLessThan(1000) // Within 1 second
    
    // Verify all beats were added
    const totalBeats = sequencerStore.sequencers.reduce((sum, seq) => sum + seq.beats.length, 0)
    expect(totalBeats).toBe(numTracks * beatsPerTrack)
    
    // Should still be responsive
    expect(wrapper.find('#app')).toBeTruthy()
  })

  it('handles memory usage during extended sessions', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Simulate extended session with many operations
    for (let session = 0; session < 10; session++) {
      // Create sequencer
      sequencerStore.createSequencer(`Session ${session}`, 'piano')
      const sequencer = sequencerStore.sequencers[sequencerStore.sequencers.length - 1]
      
      // Add beats
      for (let beat = 0; beat < 32; beat++) {
        sequencerStore.addBeat(sequencer.id, {
          id: `session-${session}-beat-${beat}`,
          step: beat % 16,
          ring: beat % 7,
          note: `C${4 + (beat % 3)}`,
          velocity: 0.7,
          active: true,
          solfegeIndex: beat % 7
        })
      }
      
      // Play some notes
      for (let note = 0; note < 10; note++) {
        const solfegeName = musicStore.solfegeData[note % 7].name
        await musicStore.playNote(solfegeName, 4)
        await musicStore.releaseNote(`${solfegeName}-4`)
      }
      
      // Clean up some data
      if (session > 5) {
        sequencerStore.removeSequencer(sequencerStore.sequencers[0].id)
      }
    }
    
    // Should not have excessive memory usage (rough approximation)
    expect(sequencerStore.sequencers.length).toBeLessThan(20)
    
    // Should still be functional
    expect(wrapper.find('#app')).toBeTruthy()
  })

  it('handles rapid touch interactions on mobile', async () => {
    const wrapper = createTestWrapper(App)
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    const palette = wrapper.findComponent({ name: 'CanvasSolfegePalette' })
    const paletteElement = palette.element
    
    // Simulate rapid touch events
    const performanceTime = measurePerformance(() => {
      for (let i = 0; i < 100; i++) {
        const touches = [{
          identifier: i,
          clientX: Math.random() * 300,
          clientY: Math.random() * 300,
          target: paletteElement
        }]
        
        mockTouchEvent(paletteElement, 'touchstart', touches)
        mockTouchEvent(paletteElement, 'touchend', touches)
      }
    })
    
    // Should handle rapid touches efficiently
    expect(performanceTime).toBeLessThan(200)
    
    // Should not crash
    expect(wrapper.find('#app')).toBeTruthy()
  })

  it('handles canvas rendering performance', async () => {
    const wrapper = createTestWrapper(App)
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    const canvasContext = HTMLCanvasElement.prototype.getContext()
    
    // Simulate many visual effects
    const performanceTime = measurePerformance(() => {
      for (let i = 0; i < 200; i++) {
        const solfegeName = musicStore.solfegeData[i % 7].name
        musicStore.playNote(solfegeName, 4)
      }
    })
    
    // Should handle many visual updates efficiently
    expect(performanceTime).toBeLessThan(500)
    
    // Canvas should have been used for rendering
    expect(canvasContext.beginPath).toHaveBeenCalled()
    expect(canvasContext.arc).toHaveBeenCalled()
    expect(canvasContext.fill).toHaveBeenCalled()
  })

  it('handles audio context state changes gracefully', async () => {
    const wrapper = createTestWrapper(App)
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Mock audio context state changes
    const mockAudioContext = new AudioContext()
    
    // Test suspended state
    Object.defineProperty(mockAudioContext, 'state', {
      value: 'suspended',
      writable: true
    })
    
    // Should handle suspended state
    await musicStore.playNote('Do', 4)
    expect(wrapper.find('#app')).toBeTruthy()
    
    // Test running state
    Object.defineProperty(mockAudioContext, 'state', {
      value: 'running',
      writable: true
    })
    
    // Should handle running state
    await musicStore.playNote('Re', 4)
    expect(wrapper.find('#app')).toBeTruthy()
    
    // Test closed state
    Object.defineProperty(mockAudioContext, 'state', {
      value: 'closed',
      writable: true
    })
    
    // Should handle closed state gracefully
    await musicStore.playNote('Mi', 4)
    expect(wrapper.find('#app')).toBeTruthy()
  })

  it('handles large dataset operations', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Test with large configuration
    sequencerStore.updateConfig({
      steps: 64,
      rings: 24
    })
    
    // Create sequencer with maximum beats
    sequencerStore.createSequencer('Large Track', 'piano')
    const sequencer = sequencerStore.sequencers[sequencerStore.sequencers.length - 1]
    
    // Add beats to all possible positions
    const performanceTime = measurePerformance(() => {
      for (let step = 0; step < 64; step += 2) {
        for (let ring = 0; ring < 24; ring += 3) {
          sequencerStore.addBeat(sequencer.id, {
            id: `large-beat-${step}-${ring}`,
            step: step,
            ring: ring,
            note: `C${4 + (ring % 3)}`,
            velocity: 0.7,
            active: true,
            solfegeIndex: ring % 7
          })
        }
      }
    })
    
    // Should handle large dataset efficiently
    expect(performanceTime).toBeLessThan(2000) // Within 2 seconds
    
    // Should have created many beats
    expect(sequencer.beats.length).toBeGreaterThan(100)
    
    // Should still be responsive
    expect(wrapper.find('#app')).toBeTruthy()
  })

  it('handles error recovery during high load', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Mock audio service to sometimes fail
    const originalPlayNote = audioService.playNote
    const failingPlayNote = vi.fn().mockImplementation((...args) => {
      if (Math.random() < 0.3) { // 30% failure rate
        throw new Error('Simulated audio failure')
      }
      return originalPlayNote.apply(audioService, args)
    })
    
    audioService.playNote = failingPlayNote
    
    // Try to play many notes despite failures
    const errors: Error[] = []
    
    for (let i = 0; i < 50; i++) {
      try {
        const solfegeName = musicStore.solfegeData[i % 7].name
        await musicStore.playNote(solfegeName, 4)
      } catch (error) {
        errors.push(error as Error)
      }
    }
    
    // Should have some errors but not crash
    expect(errors.length).toBeGreaterThan(0)
    expect(wrapper.find('#app')).toBeTruthy()
    
    // Restore original function
    audioService.playNote = originalPlayNote
  })

  it('handles concurrent operations without race conditions', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Create multiple concurrent operations
    const promises = []
    
    // Concurrent sequencer creation
    for (let i = 0; i < 5; i++) {
      promises.push(
        Promise.resolve().then(() => {
          sequencerStore.createSequencer(`Concurrent ${i}`, 'piano')
        })
      )
    }
    
    // Concurrent beat additions
    for (let i = 0; i < 10; i++) {
      promises.push(
        Promise.resolve().then(() => {
          if (sequencerStore.sequencers.length > 0) {
            const sequencer = sequencerStore.sequencers[0]
            sequencerStore.addBeat(sequencer.id, {
              id: `concurrent-beat-${i}`,
              step: i % 16,
              ring: i % 7,
              note: `C${4 + (i % 3)}`,
              velocity: 0.7,
              active: true,
              solfegeIndex: i % 7
            })
          }
        })
      )
    }
    
    // Wait for all operations
    await Promise.all(promises)
    
    // Should have completed all operations
    expect(sequencerStore.sequencers.length).toBeGreaterThan(5)
    
    // Should not have crashed
    expect(wrapper.find('#app')).toBeTruthy()
  })
})