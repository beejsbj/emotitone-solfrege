import { describe, it, expect, vi } from 'vitest'
import { createTestWrapper } from '../helpers/test-utils'
import { simulateUserInteraction, waitForAudioLoad, waitForAnimation } from './setup'
import App from '@/App.vue'
import { useSequencerStore } from '@/stores/sequencer'
import { useMusicStore } from '@/stores/music'
import { useInstrumentStore } from '@/stores/instrument'
import { audioService } from '@/services/audio'

describe('Advanced Sequencer Usage', () => {
  it('adds and removes multiple sequencer tracks', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    const initialCount = sequencerStore.sequencers.length
    
    // Add new sequencer
    sequencerStore.createSequencer('Drums', 'drums')
    
    expect(sequencerStore.sequencers.length).toBe(initialCount + 1)
    
    const newSequencer = sequencerStore.sequencers[sequencerStore.sequencers.length - 1]
    expect(newSequencer.name).toBe('Drums')
    expect(newSequencer.instrument).toBe('drums')
    
    // Remove sequencer
    sequencerStore.removeSequencer(newSequencer.id)
    
    expect(sequencerStore.sequencers.length).toBe(initialCount)
  })

  it('manages different instruments per track', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Create multiple sequencers with different instruments
    sequencerStore.createSequencer('Piano', 'piano')
    sequencerStore.createSequencer('Synth', 'synth')
    sequencerStore.createSequencer('Drums', 'drums')
    
    expect(sequencerStore.sequencers.length).toBeGreaterThanOrEqual(3)
    
    // Find each sequencer and verify instruments
    const pianoSeq = sequencerStore.sequencers.find(s => s.name === 'Piano')
    const synthSeq = sequencerStore.sequencers.find(s => s.name === 'Synth')
    const drumSeq = sequencerStore.sequencers.find(s => s.name === 'Drums')
    
    expect(pianoSeq?.instrument).toBe('piano')
    expect(synthSeq?.instrument).toBe('synth')
    expect(drumSeq?.instrument).toBe('drums')
  })

  it('creates complex polyrhythmic patterns', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Create two sequencers with different patterns
    sequencerStore.createSequencer('Kick', 'drums')
    sequencerStore.createSequencer('Snare', 'drums')
    
    const kickSeq = sequencerStore.sequencers.find(s => s.name === 'Kick')
    const snareSeq = sequencerStore.sequencers.find(s => s.name === 'Snare')
    
    expect(kickSeq).toBeDefined()
    expect(snareSeq).toBeDefined()
    
    // Create kick pattern (every 4 beats)
    for (let i = 0; i < 16; i += 4) {
      sequencerStore.addBeat(kickSeq!.id, {
        id: `kick-${i}`,
        step: i,
        ring: 0,
        note: 'C2',
        velocity: 0.9,
        active: true,
        solfegeIndex: 0
      })
    }
    
    // Create snare pattern (beats 2 and 6, 10, 14)
    for (let i = 2; i < 16; i += 4) {
      sequencerStore.addBeat(snareSeq!.id, {
        id: `snare-${i}`,
        step: i,
        ring: 0,
        note: 'D2',
        velocity: 0.8,
        active: true,
        solfegeIndex: 1
      })
    }
    
    // Verify patterns
    expect(kickSeq!.beats.length).toBe(4)
    expect(snareSeq!.beats.length).toBe(4)
    
    // Different step positions
    expect(kickSeq!.beats[0].step).toBe(0)
    expect(snareSeq!.beats[0].step).toBe(2)
  })

  it('uses transport controls effectively', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Create sequencer with pattern
    sequencerStore.createSequencer('Test', 'piano')
    const sequencer = sequencerStore.sequencers[sequencerStore.sequencers.length - 1]
    
    sequencerStore.addBeat(sequencer.id, {
      id: 'beat-1',
      step: 0,
      ring: 0,
      note: 'C4',
      velocity: 0.8,
      active: true,
      solfegeIndex: 0
    })
    
    // Test global transport controls
    expect(sequencerStore.config.globalIsPlaying).toBe(false)
    
    // Start global playback
    sequencerStore.startGlobalPlayback()
    expect(sequencerStore.config.globalIsPlaying).toBe(true)
    
    // Stop global playback
    sequencerStore.stopGlobalPlayback()
    expect(sequencerStore.config.globalIsPlaying).toBe(false)
    
    // Pause global playback
    sequencerStore.pauseGlobalPlayback()
    expect(sequencerStore.config.globalIsPlaying).toBe(false)
  })

  it('handles complex multi-ring patterns', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    const sequencer = sequencerStore.sequencers[0]
    
    // Create pattern across multiple rings (scale degrees)
    const scalePattern = [
      { ring: 0, note: 'C4', solfege: 0 }, // Do
      { ring: 1, note: 'D4', solfege: 1 }, // Re
      { ring: 2, note: 'E4', solfege: 2 }, // Mi
      { ring: 3, note: 'F4', solfege: 3 }, // Fa
      { ring: 4, note: 'G4', solfege: 4 }, // Sol
      { ring: 5, note: 'A4', solfege: 5 }, // La
      { ring: 6, note: 'B4', solfege: 6 }, // Ti
    ]
    
    scalePattern.forEach((beat, index) => {
      sequencerStore.addBeat(sequencer.id, {
        id: `scale-${index}`,
        step: index * 2, // Every other step
        ring: beat.ring,
        note: beat.note,
        velocity: 0.7,
        active: true,
        solfegeIndex: beat.solfege
      })
    })
    
    // Should have all 7 beats across different rings
    expect(sequencer.beats.length).toBe(7)
    
    // Each beat should be on a different ring
    const uniqueRings = new Set(sequencer.beats.map(b => b.ring))
    expect(uniqueRings.size).toBe(7)
  })

  it('handles sequencer properties and settings', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    const sequencer = sequencerStore.sequencers[0]
    
    // Update sequencer properties
    sequencerStore.updateSequencer(sequencer.id, {
      name: 'Updated Name',
      instrument: 'synth',
      octave: 5,
      volume: 0.8,
      pan: 0.2
    })
    
    // Properties should be updated
    expect(sequencer.name).toBe('Updated Name')
    expect(sequencer.instrument).toBe('synth')
    expect(sequencer.octave).toBe(5)
    expect(sequencer.volume).toBe(0.8)
    expect(sequencer.pan).toBe(0.2)
  })

  it('handles active sequencer switching', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Create multiple sequencers
    sequencerStore.createSequencer('First', 'piano')
    sequencerStore.createSequencer('Second', 'synth')
    
    const firstSeq = sequencerStore.sequencers.find(s => s.name === 'First')
    const secondSeq = sequencerStore.sequencers.find(s => s.name === 'Second')
    
    expect(firstSeq).toBeDefined()
    expect(secondSeq).toBeDefined()
    
    // Set active sequencer
    sequencerStore.setActiveSequencer(firstSeq!.id)
    expect(sequencerStore.config.activeSequencerId).toBe(firstSeq!.id)
    expect(sequencerStore.activeSequencer?.id).toBe(firstSeq!.id)
    
    // Switch to second sequencer
    sequencerStore.setActiveSequencer(secondSeq!.id)
    expect(sequencerStore.config.activeSequencerId).toBe(secondSeq!.id)
    expect(sequencerStore.activeSequencer?.id).toBe(secondSeq!.id)
  })

  it('handles simultaneous multi-track playback', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Create multiple tracks
    sequencerStore.createSequencer('Track1', 'piano')
    sequencerStore.createSequencer('Track2', 'synth')
    
    const track1 = sequencerStore.sequencers.find(s => s.name === 'Track1')
    const track2 = sequencerStore.sequencers.find(s => s.name === 'Track2')
    
    expect(track1).toBeDefined()
    expect(track2).toBeDefined()
    
    // Add beats to both tracks
    sequencerStore.addBeat(track1!.id, {
      id: 'track1-beat1',
      step: 0,
      ring: 0,
      note: 'C4',
      velocity: 0.8,
      active: true,
      solfegeIndex: 0
    })
    
    sequencerStore.addBeat(track2!.id, {
      id: 'track2-beat1',
      step: 2,
      ring: 0,
      note: 'G4',
      velocity: 0.7,
      active: true,
      solfegeIndex: 4
    })
    
    const playNoteSpy = vi.spyOn(audioService, 'playNote')
    
    // Start both tracks
    sequencerStore.startSequencer(track1!.id)
    sequencerStore.startSequencer(track2!.id)
    
    expect(track1!.isPlaying).toBe(true)
    expect(track2!.isPlaying).toBe(true)
    
    // Both should be in playing sequencers
    expect(sequencerStore.playingSequencers.length).toBe(2)
    
    await waitForAnimation(1000)
    
    // Should have played notes from both tracks
    expect(playNoteSpy).toHaveBeenCalled()
  })

  it('handles step count and ring configuration', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Default configuration
    expect(sequencerStore.config.steps).toBe(16)
    expect(sequencerStore.config.rings).toBe(7)
    
    // Update configuration
    sequencerStore.updateConfig({
      steps: 32,
      rings: 12
    })
    
    expect(sequencerStore.config.steps).toBe(32)
    expect(sequencerStore.config.rings).toBe(12)
    
    // Should affect all sequencers
    const sequencer = sequencerStore.sequencers[0]
    
    // Can now add beats up to step 31
    sequencerStore.addBeat(sequencer.id, {
      id: 'last-beat',
      step: 31,
      ring: 11,
      note: 'C4',
      velocity: 0.8,
      active: true,
      solfegeIndex: 0
    })
    
    expect(sequencer.beats.length).toBe(1)
    expect(sequencer.beats[0].step).toBe(31)
    expect(sequencer.beats[0].ring).toBe(11)
  })

  it('handles beat activation and deactivation', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    const sequencer = sequencerStore.sequencers[0]
    
    // Add beat
    sequencerStore.addBeat(sequencer.id, {
      id: 'beat-1',
      step: 0,
      ring: 0,
      note: 'C4',
      velocity: 0.8,
      active: true,
      solfegeIndex: 0
    })
    
    expect(sequencer.beats[0].active).toBe(true)
    
    // Deactivate beat
    sequencerStore.updateBeat(sequencer.id, 'beat-1', {
      active: false
    })
    
    expect(sequencer.beats[0].active).toBe(false)
    
    // Reactivate beat
    sequencerStore.updateBeat(sequencer.id, 'beat-1', {
      active: true
    })
    
    expect(sequencer.beats[0].active).toBe(true)
  })
})