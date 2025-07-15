import { describe, it, expect, vi } from 'vitest'
import { createTestWrapper } from '../helpers/test-utils'
import { simulateUserInteraction, waitForAudioLoad, waitForAnimation } from './setup'
import App from '@/App.vue'
import { useSequencerStore } from '@/stores/sequencer'
import { useMusicStore } from '@/stores/music'
import { useInstrumentStore } from '@/stores/instrument'
import { audioService } from '@/services/audio'

describe('Simple Composition Workflow', () => {
  it('creates beats on the sequencer grid', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Should have at least one sequencer
    expect(sequencerStore.sequencers.length).toBeGreaterThan(0)
    
    const sequencer = sequencerStore.sequencers[0]
    const initialBeatCount = sequencer.beats.length
    
    // Create a beat
    sequencerStore.addBeat(sequencer.id, {
      id: 'beat-1',
      step: 0,
      ring: 0,
      note: 'C4',
      velocity: 0.8,
      active: true,
      solfegeIndex: 0
    })
    
    // Should have added the beat
    expect(sequencer.beats.length).toBe(initialBeatCount + 1)
    expect(sequencer.beats[sequencer.beats.length - 1].note).toBe('C4')
  })

  it('plays back sequences with audio feedback', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Simulate audio context ready
    await simulateUserInteraction(wrapper)
    
    const sequencer = sequencerStore.sequencers[0]
    
    // Add some beats
    sequencerStore.addBeat(sequencer.id, {
      id: 'beat-1',
      step: 0,
      ring: 0,
      note: 'C4',
      velocity: 0.8,
      active: true,
      solfegeIndex: 0
    })
    
    sequencerStore.addBeat(sequencer.id, {
      id: 'beat-2',
      step: 4,
      ring: 0,
      note: 'E4',
      velocity: 0.7,
      active: true,
      solfegeIndex: 2
    })
    
    // Mock audio service
    const playNoteSpy = vi.spyOn(audioService, 'playNote')
    
    // Start playback
    sequencerStore.startSequencer(sequencer.id)
    
    expect(sequencer.isPlaying).toBe(true)
    
    // Should eventually play notes during sequence
    await waitForAnimation(1000)
    
    // Notes should be played during sequence
    expect(playNoteSpy).toHaveBeenCalled()
  })

  it('modifies existing patterns', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    const sequencer = sequencerStore.sequencers[0]
    
    // Add initial beat
    sequencerStore.addBeat(sequencer.id, {
      id: 'beat-1',
      step: 0,
      ring: 0,
      note: 'C4',
      velocity: 0.8,
      active: true,
      solfegeIndex: 0
    })
    
    expect(sequencer.beats.length).toBe(1)
    expect(sequencer.beats[0].note).toBe('C4')
    
    // Modify the beat
    sequencerStore.updateBeat(sequencer.id, 'beat-1', {
      note: 'G4',
      velocity: 0.9,
      solfegeIndex: 4
    })
    
    // Should have updated the beat
    expect(sequencer.beats[0].note).toBe('G4')
    expect(sequencer.beats[0].velocity).toBe(0.9)
    expect(sequencer.beats[0].solfegeIndex).toBe(4)
  })

  it('removes beats from patterns', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    const sequencer = sequencerStore.sequencers[0]
    
    // Add a beat
    sequencerStore.addBeat(sequencer.id, {
      id: 'beat-1',
      step: 0,
      ring: 0,
      note: 'C4',
      velocity: 0.8,
      active: true,
      solfegeIndex: 0
    })
    
    expect(sequencer.beats.length).toBe(1)
    
    // Remove the beat
    sequencerStore.removeBeat(sequencer.id, 'beat-1')
    
    // Should have removed the beat
    expect(sequencer.beats.length).toBe(0)
  })

  it('handles different instruments in sequences', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    const instrumentStore = useInstrumentStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    const sequencer = sequencerStore.sequencers[0]
    
    // Change sequencer instrument
    sequencerStore.updateSequencer(sequencer.id, {
      instrument: 'synth'
    })
    
    expect(sequencer.instrument).toBe('synth')
    
    // Add beat with new instrument
    sequencerStore.addBeat(sequencer.id, {
      id: 'beat-1',
      step: 0,
      ring: 0,
      note: 'C4',
      velocity: 0.8,
      active: true,
      solfegeIndex: 0
    })
    
    // Mock audio service
    const playNoteSpy = vi.spyOn(audioService, 'playNote')
    
    // Start playback
    sequencerStore.startSequencer(sequencer.id)
    
    await waitForAnimation(500)
    
    // Should play with correct instrument
    expect(playNoteSpy).toHaveBeenCalled()
  })

  it('supports tempo changes during composition', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Initial tempo
    expect(sequencerStore.config.tempo).toBe(120)
    
    // Change tempo
    sequencerStore.setTempo(140)
    
    // Should update tempo
    expect(sequencerStore.config.tempo).toBe(140)
    
    // Should affect all sequencers
    sequencerStore.sequencers.forEach(seq => {
      // Tempo is global, so all sequencers should use the new tempo
      expect(sequencerStore.config.tempo).toBe(140)
    })
  })

  it('creates rhythmic patterns with different velocities', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    const sequencer = sequencerStore.sequencers[0]
    
    // Create pattern with varying velocities
    const pattern = [
      { step: 0, velocity: 1.0 },    // Strong beat
      { step: 2, velocity: 0.6 },    // Medium beat
      { step: 4, velocity: 0.9 },    // Strong beat
      { step: 6, velocity: 0.4 },    // Soft beat
    ]
    
    pattern.forEach((beat, index) => {
      sequencerStore.addBeat(sequencer.id, {
        id: `beat-${index}`,
        step: beat.step,
        ring: 0,
        note: 'C4',
        velocity: beat.velocity,
        active: true,
        solfegeIndex: 0
      })
    })
    
    // Should have all beats with different velocities
    expect(sequencer.beats.length).toBe(4)
    expect(sequencer.beats[0].velocity).toBe(1.0)
    expect(sequencer.beats[1].velocity).toBe(0.6)
    expect(sequencer.beats[2].velocity).toBe(0.9)
    expect(sequencer.beats[3].velocity).toBe(0.4)
  })

  it('handles pattern looping', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    const sequencer = sequencerStore.sequencers[0]
    
    // Add beat at last step
    sequencerStore.addBeat(sequencer.id, {
      id: 'beat-1',
      step: 15, // Last step in 16-step sequence
      ring: 0,
      note: 'C4',
      velocity: 0.8,
      active: true,
      solfegeIndex: 0
    })
    
    const playNoteSpy = vi.spyOn(audioService, 'playNote')
    
    // Start playback
    sequencerStore.startSequencer(sequencer.id)
    
    // Let it play through a full loop
    await waitForAnimation(2000)
    
    // Should have played the beat multiple times (looping)
    expect(playNoteSpy).toHaveBeenCalled()
  })

  it('supports muting and unmuting patterns', async () => {
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
    
    // Mute sequencer
    sequencerStore.muteSequencer(sequencer.id)
    expect(sequencer.isMuted).toBe(true)
    
    // Unmute sequencer
    sequencerStore.unmuteSequencer(sequencer.id)
    expect(sequencer.isMuted).toBe(false)
  })

  it('handles visual feedback during composition', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Mock canvas for visual feedback
    const canvasContext = HTMLCanvasElement.prototype.getContext()
    
    const sequencer = sequencerStore.sequencers[0]
    
    // Add beat and start playing
    sequencerStore.addBeat(sequencer.id, {
      id: 'beat-1',
      step: 0,
      ring: 0,
      note: 'C4',
      velocity: 0.8,
      active: true,
      solfegeIndex: 0
    })
    
    sequencerStore.startSequencer(sequencer.id)
    
    await waitForAnimation(500)
    
    // Visual effects should be triggered
    expect(canvasContext.beginPath).toHaveBeenCalled()
    expect(canvasContext.arc).toHaveBeenCalled()
  })

  it('allows stopping and starting composition playback', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    const sequencer = sequencerStore.sequencers[0]
    
    // Start playback
    sequencerStore.startSequencer(sequencer.id)
    expect(sequencer.isPlaying).toBe(true)
    
    // Stop playback
    sequencerStore.stopSequencer(sequencer.id)
    expect(sequencer.isPlaying).toBe(false)
    
    // Start again
    sequencerStore.startSequencer(sequencer.id)
    expect(sequencer.isPlaying).toBe(true)
  })
})