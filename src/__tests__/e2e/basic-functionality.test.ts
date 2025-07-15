import { describe, it, expect, vi } from 'vitest'
import { createTestWrapper } from '../helpers/test-utils'
import { useMusicStore } from '@/stores/music'
import { useSequencerStore } from '@/stores/sequencer'
import { useInstrumentStore } from '@/stores/instrument'

// Simple test component
const TestComponent = {
  name: 'TestComponent',
  template: '<div id="test">Test Component</div>',
  setup() {
    return {}
  }
}

describe('Basic E2E Functionality', () => {
  it('can create test wrapper', () => {
    const wrapper = createTestWrapper(TestComponent)
    expect(wrapper.find('#test')).toBeTruthy()
  })

  it('can initialize music store', () => {
    const wrapper = createTestWrapper(TestComponent)
    const musicStore = useMusicStore()
    
    expect(musicStore.currentKey).toBe('C')
    expect(musicStore.currentMode).toBe('major')
    expect(musicStore.solfegeData).toBeDefined()
  })

  it('can initialize sequencer store', () => {
    const wrapper = createTestWrapper(TestComponent)
    const sequencerStore = useSequencerStore()
    
    expect(sequencerStore.config.tempo).toBe(120)
    expect(sequencerStore.config.steps).toBe(16)
    expect(sequencerStore.sequencers).toBeDefined()
  })

  it('can initialize instrument store', () => {
    const wrapper = createTestWrapper(TestComponent)
    const instrumentStore = useInstrumentStore()
    
    expect(instrumentStore.currentInstrument).toBe('piano')
    expect(instrumentStore.availableInstruments).toBeDefined()
  })

  it('can mock audio service calls', async () => {
    const wrapper = createTestWrapper(TestComponent)
    const musicStore = useMusicStore()
    
    // This should not throw and should use mocked audio service
    await musicStore.playNote(0) // Use solfege index instead of name
    expect(musicStore.activeNotes.size).toBe(1)
  })

  it('can handle sequencer operations', () => {
    const wrapper = createTestWrapper(TestComponent)
    const sequencerStore = useSequencerStore()
    
    // Create a sequencer
    sequencerStore.createSequencer('Test', 'piano')
    expect(sequencerStore.sequencers.length).toBeGreaterThan(0)
    
    // Add a beat
    const sequencer = sequencerStore.sequencers[0]
    sequencerStore.addBeatToSequencer(sequencer.id, {
      id: 'test-beat',
      step: 0,
      ring: 0,
      note: 'C4',
      velocity: 0.8,
      active: true,
      solfegeIndex: 0
    })
    
    expect(sequencer.beats.length).toBe(1)
  })

  it('can handle key and mode changes', () => {
    const wrapper = createTestWrapper(TestComponent)
    const musicStore = useMusicStore()
    
    // Change key
    musicStore.setKey('G')
    expect(musicStore.currentKey).toBe('G')
    
    // Change mode
    musicStore.setMode('minor')
    expect(musicStore.currentMode).toBe('minor')
  })

  it('can handle instrument changes', () => {
    const wrapper = createTestWrapper(TestComponent)
    const instrumentStore = useInstrumentStore()
    
    // Change instrument
    instrumentStore.setInstrument('synth')
    expect(instrumentStore.currentInstrument).toBe('synth')
  })

  it('can handle multiple note interactions', async () => {
    const wrapper = createTestWrapper(TestComponent)
    const musicStore = useMusicStore()
    
    // Play multiple notes
    await musicStore.playNote(0) // Do
    await musicStore.playNote(2) // Mi
    await musicStore.playNote(4) // Sol
    
    expect(musicStore.activeNotes.size).toBe(3)
    
    // Release notes
    const noteIds = Array.from(musicStore.activeNotes.keys())
    for (const noteId of noteIds) {
      await musicStore.releaseNote(noteId)
    }
    
    expect(musicStore.activeNotes.size).toBe(0)
  })

  it('can handle sequencer playback controls', () => {
    const wrapper = createTestWrapper(TestComponent)
    const sequencerStore = useSequencerStore()
    
    // Create sequencer with beats
    sequencerStore.createSequencer('Test', 'piano')
    const sequencer = sequencerStore.sequencers[0]
    
    sequencerStore.addBeatToSequencer(sequencer.id, {
      id: 'test-beat',
      step: 0,
      ring: 0,
      note: 'C4',
      velocity: 0.8,
      active: true,
      solfegeIndex: 0
    })
    
    // Start playback
    sequencerStore.startSequencer(sequencer.id)
    expect(sequencer.isPlaying).toBe(true)
    
    // Stop playback
    sequencerStore.stopSequencer(sequencer.id)
    expect(sequencer.isPlaying).toBe(false)
  })
})