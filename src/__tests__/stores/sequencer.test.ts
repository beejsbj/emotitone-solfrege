import { setActivePinia, createPinia } from 'pinia'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useSequencerStore } from '@/stores/sequencer'
import { createTestPinia } from '../helpers/test-utils'
import type { 
  SequencerBeat, 
  SequencerInstance, 
  MultiSequencerProject 
} from '@/types/music'

// SEQUENCER_ICONS are now mocked in test setup

describe('Sequencer Store', () => {
  let sequencerStore: ReturnType<typeof useSequencerStore>

  beforeEach(() => {
    setActivePinia(createTestPinia())
    sequencerStore = useSequencerStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers?.()
  })

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      expect(sequencerStore.sequencers).toEqual([])
      expect(sequencerStore.config.tempo).toBe(120)
      expect(sequencerStore.config.steps).toBe(16)
      expect(sequencerStore.config.rings).toBe(7)
      expect(sequencerStore.config.globalIsPlaying).toBe(false)
      expect(sequencerStore.config.activeSequencerId).toBe(null)
      expect(sequencerStore.hasInitialized).toBe(false)
    })

    it('should create default sequencer when initialized', () => {
      sequencerStore.initialize()
      
      expect(sequencerStore.sequencers).toHaveLength(1)
      expect(sequencerStore.hasInitialized).toBe(true)
      expect(sequencerStore.config.activeSequencerId).toBe(sequencerStore.sequencers[0].id)
    })
  })

  describe('Sequencer Management', () => {
    it('should create a new sequencer', () => {
      const sequencer = sequencerStore.createSequencer('Test Sequencer', 'piano')
      
      expect(sequencer).toBeDefined()
      expect(sequencer.name).toBe('Test Sequencer')
      expect(sequencer.instrument).toBe('piano')
      expect(sequencer.octave).toBe(4)
      expect(sequencer.beats).toEqual([])
      expect(sequencer.isPlaying).toBe(false)
      expect(sequencer.currentStep).toBe(0)
      expect(sequencer.isMuted).toBe(false)
      expect(sequencer.volume).toBe(1)
      expect(sequencer.icon).toBe('music')
      expect(sequencerStore.config.activeSequencerId).toBe(sequencer.id)
    })

    it('should create sequencer with default values', () => {
      const sequencer = sequencerStore.createSequencer()
      
      expect(sequencer.name).toBe('')
      expect(sequencer.instrument).toBe('piano')
    })

    it('should delete a sequencer', () => {
      const sequencer1 = sequencerStore.createSequencer('Test 1')
      const sequencer2 = sequencerStore.createSequencer('Test 2')
      
      expect(sequencerStore.sequencers).toHaveLength(2)
      
      sequencerStore.deleteSequencer(sequencer1.id)
      
      expect(sequencerStore.sequencers).toHaveLength(1)
      expect(sequencerStore.sequencers[0].id).toBe(sequencer2.id)
    })

    it('should update active sequencer when deleting active sequencer', () => {
      const sequencer1 = sequencerStore.createSequencer('Test 1')
      const sequencer2 = sequencerStore.createSequencer('Test 2')
      
      sequencerStore.setActiveSequencer(sequencer1.id)
      expect(sequencerStore.config.activeSequencerId).toBe(sequencer1.id)
      
      sequencerStore.deleteSequencer(sequencer1.id)
      expect(sequencerStore.config.activeSequencerId).toBe(sequencer2.id)
    })

    it('should update sequencer properties', () => {
      const sequencer = sequencerStore.createSequencer('Test')
      
      sequencerStore.updateSequencer(sequencer.id, {
        name: 'Updated Name',
        instrument: 'guitar',
        octave: 5,
        volume: 0.8
      })
      
      const updated = sequencerStore.sequencers.find(s => s.id === sequencer.id)!
      expect(updated.name).toBe('Updated Name')
      expect(updated.instrument).toBe('guitar')
      expect(updated.octave).toBe(5)
      expect(updated.volume).toBe(0.8)
    })

    it('should set active sequencer', () => {
      const sequencer = sequencerStore.createSequencer('Test')
      
      sequencerStore.setActiveSequencer(sequencer.id)
      expect(sequencerStore.config.activeSequencerId).toBe(sequencer.id)
    })

    it('should clear active sequencer', () => {
      const sequencer = sequencerStore.createSequencer('Test')
      sequencerStore.setActiveSequencer(sequencer.id)
      
      sequencerStore.setActiveSequencer('')
      expect(sequencerStore.config.activeSequencerId).toBe(null)
    })

    it('should duplicate a sequencer', () => {
      const original = sequencerStore.createSequencer('Original', 'piano')
      const testBeat: SequencerBeat = {
        id: 'beat-1',
        ring: 0,
        step: 0,
        duration: 1,
        solfegeName: 'Do',
        solfegeIndex: 0,
        octave: 4
      }
      
      sequencerStore.updateSequencer(original.id, {
        octave: 5,
        beats: [testBeat],
        volume: 0.7
      })
      
      const duplicate = sequencerStore.duplicateSequencer(original.id)
      
      expect(duplicate).toBeDefined()
      expect(duplicate!.name).toBe('Original Copy')
      expect(duplicate!.instrument).toBe('piano')
      expect(duplicate!.octave).toBe(5)
      expect(duplicate!.beats).toHaveLength(1)
      expect(duplicate!.beats[0].id).not.toBe(testBeat.id) // Should have new ID
      expect(duplicate!.volume).toBe(0.7)
    })
  })

  describe('Computed Properties', () => {
    it('should compute active sequencer', () => {
      const sequencer = sequencerStore.createSequencer('Test')
      
      expect(sequencerStore.activeSequencer).toBe(sequencer)
      
      sequencerStore.setActiveSequencer('')
      expect(sequencerStore.activeSequencer).toBe(null)
    })

    it('should compute playing sequencers', () => {
      const seq1 = sequencerStore.createSequencer('Test 1')
      const seq2 = sequencerStore.createSequencer('Test 2')
      
      sequencerStore.updateSequencer(seq1.id, { isPlaying: true })
      sequencerStore.updateSequencer(seq2.id, { isPlaying: true, isMuted: true })
      
      const playingSequencers = sequencerStore.playingSequencers
      expect(playingSequencers).toHaveLength(1)
      expect(playingSequencers[0].id).toBe(seq1.id)
    })

    it('should compute unmuted sequencers', () => {
      const seq1 = sequencerStore.createSequencer('Test 1')
      const seq2 = sequencerStore.createSequencer('Test 2')
      
      sequencerStore.updateSequencer(seq2.id, { isMuted: true })
      
      const unmutedSequencers = sequencerStore.unmutedSequencers
      expect(unmutedSequencers).toHaveLength(1)
      expect(unmutedSequencers[0].id).toBe(seq1.id)
    })
  })

  describe('Beat Management', () => {
    let sequencer: SequencerInstance
    let testBeat: SequencerBeat

    beforeEach(() => {
      sequencer = sequencerStore.createSequencer('Test')
      testBeat = {
        id: 'beat-1',
        ring: 0,
        step: 0,
        duration: 1,
        solfegeName: 'Do',
        solfegeIndex: 0,
        octave: 4
      }
    })

    it('should add beat to sequencer', () => {
      sequencerStore.addBeatToSequencer(sequencer.id, testBeat)
      
      const updated = sequencerStore.sequencers.find(s => s.id === sequencer.id)!
      expect(updated.beats).toHaveLength(1)
      expect(updated.beats[0]).toEqual(testBeat)
    })

    it('should remove beat from sequencer', () => {
      sequencerStore.addBeatToSequencer(sequencer.id, testBeat)
      sequencerStore.removeBeatFromSequencer(sequencer.id, testBeat.id)
      
      const updated = sequencerStore.sequencers.find(s => s.id === sequencer.id)!
      expect(updated.beats).toHaveLength(0)
    })

    it('should update beat in sequencer', () => {
      sequencerStore.addBeatToSequencer(sequencer.id, testBeat)
      sequencerStore.updateBeatInSequencer(sequencer.id, testBeat.id, {
        solfegeName: 'Re',
        solfegeIndex: 1,
        octave: 5
      })
      
      const updated = sequencerStore.sequencers.find(s => s.id === sequencer.id)!
      expect(updated.beats[0].solfegeName).toBe('Re')
      expect(updated.beats[0].solfegeIndex).toBe(1)
      expect(updated.beats[0].octave).toBe(5)
    })

    it('should clear all beats in sequencer', () => {
      sequencerStore.addBeatToSequencer(sequencer.id, testBeat)
      sequencerStore.addBeatToSequencer(sequencer.id, { ...testBeat, id: 'beat-2' })
      
      sequencerStore.clearBeatsInSequencer(sequencer.id)
      
      const updated = sequencerStore.sequencers.find(s => s.id === sequencer.id)!
      expect(updated.beats).toHaveLength(0)
    })

    it('should handle invalid sequencer ID in beat operations', () => {
      sequencerStore.addBeatToSequencer('invalid-id', testBeat)
      // Should not throw error, just silently ignore
      expect(sequencerStore.sequencers[0].beats).toHaveLength(0)
    })
  })

  describe('Global Configuration', () => {
    it('should set tempo', () => {
      sequencerStore.setTempo(140)
      expect(sequencerStore.config.tempo).toBe(140)
    })

    it('should set steps', () => {
      sequencerStore.setSteps(32)
      expect(sequencerStore.config.steps).toBe(32)
    })
  })

  describe('Playback Control', () => {
    it('should start all sequencers', async () => {
      const seq1 = sequencerStore.createSequencer('Test 1')
      const seq2 = sequencerStore.createSequencer('Test 2')
      
      // Add beats to sequencers
      const testBeat: SequencerBeat = {
        id: 'beat-1',
        ring: 0,
        step: 0,
        duration: 1,
        solfegeName: 'Do',
        solfegeIndex: 0,
        octave: 4
      }
      
      sequencerStore.addBeatToSequencer(seq1.id, testBeat)
      sequencerStore.addBeatToSequencer(seq2.id, testBeat)
      
      await sequencerStore.startAllSequencers()
      
      expect(sequencerStore.config.globalIsPlaying).toBe(true)
      expect(sequencerStore.sequencers[0].isPlaying).toBe(true)
      expect(sequencerStore.sequencers[1].isPlaying).toBe(true)
    })

    it('should not start muted sequencers', async () => {
      const seq1 = sequencerStore.createSequencer('Test 1')
      const seq2 = sequencerStore.createSequencer('Test 2')
      
      const testBeat: SequencerBeat = {
        id: 'beat-1',
        ring: 0,
        step: 0,
        duration: 1,
        solfegeName: 'Do',
        solfegeIndex: 0,
        octave: 4
      }
      
      sequencerStore.addBeatToSequencer(seq1.id, testBeat)
      sequencerStore.addBeatToSequencer(seq2.id, testBeat)
      sequencerStore.updateSequencer(seq2.id, { isMuted: true })
      
      await sequencerStore.startAllSequencers()
      
      expect(sequencerStore.sequencers[0].isPlaying).toBe(true)
      expect(sequencerStore.sequencers[1].isPlaying).toBe(false)
    })

    it('should stop all sequencers', () => {
      const seq1 = sequencerStore.createSequencer('Test 1')
      const seq2 = sequencerStore.createSequencer('Test 2')
      
      sequencerStore.updateSequencer(seq1.id, { isPlaying: true, currentStep: 5 })
      sequencerStore.updateSequencer(seq2.id, { isPlaying: true, currentStep: 3 })
      
      sequencerStore.stopAllSequencers()
      
      expect(sequencerStore.config.globalIsPlaying).toBe(false)
      expect(sequencerStore.sequencers[0].isPlaying).toBe(false)
      expect(sequencerStore.sequencers[0].currentStep).toBe(0)
      expect(sequencerStore.sequencers[1].isPlaying).toBe(false)
      expect(sequencerStore.sequencers[1].currentStep).toBe(0)
    })

    it('should start individual sequencer', () => {
      const sequencer = sequencerStore.createSequencer('Test')
      const testBeat: SequencerBeat = {
        id: 'beat-1',
        ring: 0,
        step: 0,
        duration: 1,
        solfegeName: 'Do',
        solfegeIndex: 0,
        octave: 4
      }
      
      sequencerStore.addBeatToSequencer(sequencer.id, testBeat)
      sequencerStore.startSequencer(sequencer.id)
      
      expect(sequencer.isPlaying).toBe(true)
      expect(sequencer.currentStep).toBe(0)
    })

    it('should stop individual sequencer', () => {
      const sequencer = sequencerStore.createSequencer('Test')
      sequencerStore.updateSequencer(sequencer.id, { isPlaying: true, currentStep: 5 })
      
      sequencerStore.stopSequencer(sequencer.id)
      
      expect(sequencer.isPlaying).toBe(false)
      expect(sequencer.currentStep).toBe(0)
    })

    it('should toggle sequencer mute', () => {
      const sequencer = sequencerStore.createSequencer('Test')
      
      sequencerStore.toggleSequencerMute(sequencer.id)
      expect(sequencer.isMuted).toBe(true)
      
      sequencerStore.toggleSequencerMute(sequencer.id)
      expect(sequencer.isMuted).toBe(false)
    })

    it('should stop playing sequencer when muted', () => {
      const sequencer = sequencerStore.createSequencer('Test')
      sequencerStore.updateSequencer(sequencer.id, { isPlaying: true })
      
      sequencerStore.toggleSequencerMute(sequencer.id)
      
      expect(sequencer.isMuted).toBe(true)
      expect(sequencer.isPlaying).toBe(false)
    })

    it('should set sequencer volume', () => {
      const sequencer = sequencerStore.createSequencer('Test')
      
      sequencerStore.setSequencerVolume(sequencer.id, 0.5)
      expect(sequencer.volume).toBe(0.5)
      
      // Test bounds
      sequencerStore.setSequencerVolume(sequencer.id, 1.5)
      expect(sequencer.volume).toBe(1)
      
      sequencerStore.setSequencerVolume(sequencer.id, -0.5)
      expect(sequencer.volume).toBe(0)
    })

    it('should update sequencer step', () => {
      const sequencer = sequencerStore.createSequencer('Test')
      
      sequencerStore.updateSequencerStep(sequencer.id, 8)
      expect(sequencer.currentStep).toBe(8)
    })
  })

  describe('Project Management', () => {
    it('should save project', () => {
      const sequencer = sequencerStore.createSequencer('Test Sequencer')
      const testBeat: SequencerBeat = {
        id: 'beat-1',
        ring: 0,
        step: 0,
        duration: 1,
        solfegeName: 'Do',
        solfegeIndex: 0,
        octave: 4
      }
      
      sequencerStore.addBeatToSequencer(sequencer.id, testBeat)
      sequencerStore.setTempo(140)
      
      const project = sequencerStore.saveProject('Test Project', 'A test project', 'happy')
      
      expect(project.name).toBe('Test Project')
      expect(project.description).toBe('A test project')
      expect(project.emotion).toBe('happy')
      expect(project.sequencers).toHaveLength(1)
      expect(project.sequencers[0].name).toBe('Test Sequencer')
      expect(project.sequencers[0].beats).toHaveLength(1)
      expect(project.config.tempo).toBe(140)
      expect(project.createdAt).toBeInstanceOf(Date)
    })

    it('should load project', () => {
      const testProject: MultiSequencerProject = {
        id: 'project-1',
        name: 'Test Project',
        description: 'A test project',
        emotion: 'happy',
        sequencers: [
          {
            id: 'seq-1',
            name: 'Test Sequencer',
            instrument: 'piano',
            octave: 4,
            beats: [],
            isPlaying: false,
            currentStep: 0,
            isMuted: false,
            volume: 1,
            icon: 'music',
            color: undefined
          }
        ],
        config: {
          tempo: 140,
          steps: 16,
          rings: 7,
          globalIsPlaying: false,
          activeSequencerId: 'seq-1'
        },
        createdAt: new Date(),
        modifiedAt: new Date()
      }
      
      sequencerStore.loadProject(testProject)
      
      expect(sequencerStore.sequencers).toHaveLength(1)
      expect(sequencerStore.sequencers[0].name).toBe('Test Sequencer')
      expect(sequencerStore.sequencers[0].isPlaying).toBe(false) // Should reset playing state
      expect(sequencerStore.config.tempo).toBe(140)
      expect(sequencerStore.config.globalIsPlaying).toBe(false) // Should reset global playing state
      expect(sequencerStore.config.activeSequencerId).toBe('seq-1')
    })

    it('should set first sequencer as active when loading project with no active sequencer', () => {
      const testProject: MultiSequencerProject = {
        id: 'project-1',
        name: 'Test Project',
        description: 'A test project',
        emotion: 'happy',
        sequencers: [
          {
            id: 'seq-1',
            name: 'Test Sequencer',
            instrument: 'piano',
            octave: 4,
            beats: [],
            isPlaying: false,
            currentStep: 0,
            isMuted: false,
            volume: 1,
            icon: 'music',
            color: undefined
          }
        ],
        config: {
          tempo: 140,
          steps: 16,
          rings: 7,
          globalIsPlaying: false,
          activeSequencerId: null
        },
        createdAt: new Date(),
        modifiedAt: new Date()
      }
      
      sequencerStore.loadProject(testProject)
      
      expect(sequencerStore.config.activeSequencerId).toBe('seq-1')
    })
  })

  describe('Migration', () => {
    it('should migrate from single sequencer', () => {
      const testBeats: SequencerBeat[] = [
        {
          id: 'beat-1',
          ring: 0,
          step: 0,
          duration: 1,
          solfegeName: 'Do',
          solfegeIndex: 0,
          octave: 4
        }
      ]
      
      sequencerStore.migrateFromSingleSequencer(testBeats, 140, 5)
      
      expect(sequencerStore.sequencers).toHaveLength(1)
      expect(sequencerStore.sequencers[0].name).toBe('Migrated Sequencer')
      expect(sequencerStore.sequencers[0].instrument).toBe('synth')
      expect(sequencerStore.sequencers[0].octave).toBe(5)
      expect(sequencerStore.sequencers[0].beats).toHaveLength(1)
      expect(sequencerStore.config.tempo).toBe(140)
    })
  })

  describe('Utility Functions', () => {
    it('should initialize store', () => {
      expect(sequencerStore.hasInitialized).toBe(false)
      expect(sequencerStore.sequencers).toHaveLength(0)
      
      sequencerStore.initialize()
      
      expect(sequencerStore.hasInitialized).toBe(true)
      expect(sequencerStore.sequencers).toHaveLength(1)
    })

    it('should not create default sequencer if already initialized', () => {
      sequencerStore.initialize()
      const initialCount = sequencerStore.sequencers.length
      
      sequencerStore.initialize()
      
      expect(sequencerStore.sequencers).toHaveLength(initialCount)
    })

    it('should reset store', () => {
      const sequencer = sequencerStore.createSequencer('Test')
      sequencerStore.setTempo(140)
      sequencerStore.updateSequencer(sequencer.id, { isPlaying: true })
      
      sequencerStore.reset()
      
      expect(sequencerStore.config.tempo).toBe(120)
      expect(sequencerStore.config.globalIsPlaying).toBe(false)
      expect(sequencerStore.sequencers).toHaveLength(1) // Should create new default sequencer
      expect(sequencerStore.sequencers[0].isPlaying).toBe(false)
      expect(sequencerStore.hasInitialized).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle operations on non-existent sequencer', () => {
      const invalidId = 'invalid-id'
      
      // Should not throw errors
      sequencerStore.deleteSequencer(invalidId)
      sequencerStore.updateSequencer(invalidId, { name: 'Updated' })
      sequencerStore.startSequencer(invalidId)
      sequencerStore.stopSequencer(invalidId)
      sequencerStore.toggleSequencerMute(invalidId)
      sequencerStore.setSequencerVolume(invalidId, 0.5)
      sequencerStore.updateSequencerStep(invalidId, 5)
      
      expect(sequencerStore.sequencers).toHaveLength(0)
    })

    it('should handle operations on non-existent beat', () => {
      const sequencer = sequencerStore.createSequencer('Test')
      
      // Should not throw errors
      sequencerStore.removeBeatFromSequencer(sequencer.id, 'invalid-beat-id')
      sequencerStore.updateBeatInSequencer(sequencer.id, 'invalid-beat-id', { octave: 5 })
      
      expect(sequencer.beats).toHaveLength(0)
    })
  })

  describe('Store Persistence', () => {
    it('should be configured for persistence', () => {
      expect(sequencerStore.$id).toBe('sequencer')
    })
  })
})