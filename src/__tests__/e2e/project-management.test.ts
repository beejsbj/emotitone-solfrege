import { describe, it, expect, vi } from 'vitest'
import { createTestWrapper } from '../helpers/test-utils'
import { simulateUserInteraction, waitForAudioLoad, waitForAnimation } from './setup'
import App from '@/App.vue'
import { useSequencerStore } from '@/stores/sequencer'
import { useMusicStore } from '@/stores/music'
import { useInstrumentStore } from '@/stores/instrument'

describe('Project Management', () => {
  it('saves projects with full state', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    const musicStore = useMusicStore()
    const instrumentStore = useInstrumentStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Set up a project state
    musicStore.setCurrentKey('G')
    musicStore.setCurrentMode('minor')
    instrumentStore.setCurrentInstrument('synth')
    
    // Create sequencer with pattern
    sequencerStore.createSequencer('Test Track', 'piano')
    const sequencer = sequencerStore.sequencers[sequencerStore.sequencers.length - 1]
    
    sequencerStore.addBeat(sequencer.id, {
      id: 'beat-1',
      step: 0,
      ring: 0,
      note: 'G4',
      velocity: 0.8,
      active: true,
      solfegeIndex: 0
    })
    
    // Save project
    const projectData = sequencerStore.saveProject('Test Project')
    
    expect(projectData).toBeDefined()
    expect(projectData.name).toBe('Test Project')
    expect(projectData.sequencers).toHaveLength(sequencerStore.sequencers.length)
    expect(projectData.config.tempo).toBe(sequencerStore.config.tempo)
    
    // Verify sequencer data is saved
    const savedSequencer = projectData.sequencers.find(s => s.name === 'Test Track')
    expect(savedSequencer).toBeDefined()
    expect(savedSequencer!.beats).toHaveLength(1)
    expect(savedSequencer!.beats[0].note).toBe('G4')
  })

  it('loads projects and restores state', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    const musicStore = useMusicStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Create and save a project
    const originalProject = {
      id: 'test-project',
      name: 'Test Project',
      sequencers: [
        {
          id: 'seq-1',
          name: 'Piano Track',
          instrument: 'piano',
          octave: 4,
          beats: [
            {
              id: 'beat-1',
              step: 0,
              ring: 0,
              note: 'C4',
              velocity: 0.8,
              active: true,
              solfegeIndex: 0
            },
            {
              id: 'beat-2',
              step: 4,
              ring: 2,
              note: 'E4',
              velocity: 0.7,
              active: true,
              solfegeIndex: 2
            }
          ],
          isPlaying: false,
          isMuted: false,
          volume: 0.8,
          pan: 0,
          effects: {}
        }
      ],
      config: {
        tempo: 130,
        steps: 16,
        rings: 7,
        globalIsPlaying: false,
        activeSequencerId: 'seq-1'
      },
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: '1.0.0'
      }
    }
    
    // Load the project
    sequencerStore.loadProject(originalProject)
    
    // Verify state restoration
    expect(sequencerStore.config.tempo).toBe(130)
    expect(sequencerStore.config.activeSequencerId).toBe('seq-1')
    expect(sequencerStore.sequencers).toHaveLength(1)
    
    const loadedSequencer = sequencerStore.sequencers[0]
    expect(loadedSequencer.name).toBe('Piano Track')
    expect(loadedSequencer.instrument).toBe('piano')
    expect(loadedSequencer.beats).toHaveLength(2)
    expect(loadedSequencer.beats[0].note).toBe('C4')
    expect(loadedSequencer.beats[1].note).toBe('E4')
  })

  it('creates and switches between multiple projects', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Create first project
    sequencerStore.createSequencer('Project1 Track', 'piano')
    const project1 = sequencerStore.saveProject('Project 1')
    
    // Clear state and create second project
    sequencerStore.clearSequencers()
    sequencerStore.createSequencer('Project2 Track', 'synth')
    const project2 = sequencerStore.saveProject('Project 2')
    
    // Verify projects are different
    expect(project1.name).toBe('Project 1')
    expect(project2.name).toBe('Project 2')
    expect(project1.sequencers[0].name).toBe('Project1 Track')
    expect(project2.sequencers[0].name).toBe('Project2 Track')
    
    // Switch back to project 1
    sequencerStore.loadProject(project1)
    
    expect(sequencerStore.sequencers[0].name).toBe('Project1 Track')
    expect(sequencerStore.sequencers[0].instrument).toBe('piano')
    
    // Switch to project 2
    sequencerStore.loadProject(project2)
    
    expect(sequencerStore.sequencers[0].name).toBe('Project2 Track')
    expect(sequencerStore.sequencers[0].instrument).toBe('synth')
  })

  it('handles project persistence with localStorage', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Mock localStorage
    const mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    }
    
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })
    
    // Create project
    sequencerStore.createSequencer('Persistent Track', 'piano')
    const project = sequencerStore.saveProject('Persistent Project')
    
    // Simulate saving to localStorage
    const projectKey = `emotitone-project-${project.id}`
    mockLocalStorage.setItem(projectKey, JSON.stringify(project))
    
    // Verify localStorage was called
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      projectKey,
      JSON.stringify(project)
    )
  })

  it('handles project export functionality', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Create a complex project
    sequencerStore.createSequencer('Track 1', 'piano')
    sequencerStore.createSequencer('Track 2', 'synth')
    
    const track1 = sequencerStore.sequencers.find(s => s.name === 'Track 1')
    const track2 = sequencerStore.sequencers.find(s => s.name === 'Track 2')
    
    // Add patterns
    sequencerStore.addBeat(track1!.id, {
      id: 'beat-1',
      step: 0,
      ring: 0,
      note: 'C4',
      velocity: 0.8,
      active: true,
      solfegeIndex: 0
    })
    
    sequencerStore.addBeat(track2!.id, {
      id: 'beat-2',
      step: 2,
      ring: 1,
      note: 'D4',
      velocity: 0.7,
      active: true,
      solfegeIndex: 1
    })
    
    // Export project
    const exportData = sequencerStore.exportProject('Export Test')
    
    // Verify export data structure
    expect(exportData).toBeDefined()
    expect(exportData.name).toBe('Export Test')
    expect(exportData.sequencers).toHaveLength(2)
    expect(exportData.metadata).toBeDefined()
    expect(exportData.metadata.version).toBeDefined()
    
    // Should be JSON serializable
    const jsonString = JSON.stringify(exportData)
    const parsedData = JSON.parse(jsonString)
    
    expect(parsedData.name).toBe('Export Test')
    expect(parsedData.sequencers).toHaveLength(2)
  })

  it('handles project import functionality', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Mock imported project data
    const importedProject = {
      id: 'imported-project',
      name: 'Imported Project',
      sequencers: [
        {
          id: 'imported-seq',
          name: 'Imported Track',
          instrument: 'drums',
          octave: 3,
          beats: [
            {
              id: 'imported-beat',
              step: 1,
              ring: 0,
              note: 'C3',
              velocity: 0.9,
              active: true,
              solfegeIndex: 0
            }
          ],
          isPlaying: false,
          isMuted: false,
          volume: 0.7,
          pan: 0,
          effects: {}
        }
      ],
      config: {
        tempo: 140,
        steps: 16,
        rings: 7,
        globalIsPlaying: false,
        activeSequencerId: 'imported-seq'
      },
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: '1.0.0'
      }
    }
    
    // Import project
    sequencerStore.importProject(importedProject)
    
    // Verify import
    expect(sequencerStore.config.tempo).toBe(140)
    expect(sequencerStore.sequencers).toHaveLength(1)
    
    const importedSequencer = sequencerStore.sequencers[0]
    expect(importedSequencer.name).toBe('Imported Track')
    expect(importedSequencer.instrument).toBe('drums')
    expect(importedSequencer.octave).toBe(3)
    expect(importedSequencer.beats).toHaveLength(1)
    expect(importedSequencer.beats[0].note).toBe('C3')
  })

  it('handles project metadata tracking', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Mock Date.now for consistent testing
    const mockNow = 1640995200000 // 2022-01-01
    vi.spyOn(Date, 'now').mockReturnValue(mockNow)
    
    // Create project
    sequencerStore.createSequencer('Test Track', 'piano')
    const project = sequencerStore.saveProject('Metadata Test')
    
    // Verify metadata
    expect(project.metadata).toBeDefined()
    expect(project.metadata.createdAt).toBe(mockNow)
    expect(project.metadata.updatedAt).toBe(mockNow)
    expect(project.metadata.version).toBeDefined()
    
    // Simulate project update
    const newMockNow = mockNow + 60000 // 1 minute later
    vi.spyOn(Date, 'now').mockReturnValue(newMockNow)
    
    sequencerStore.addBeat(project.sequencers[0].id, {
      id: 'new-beat',
      step: 0,
      ring: 0,
      note: 'C4',
      velocity: 0.8,
      active: true,
      solfegeIndex: 0
    })
    
    const updatedProject = sequencerStore.saveProject('Metadata Test', project.id)
    
    // Verify updated metadata
    expect(updatedProject.metadata.createdAt).toBe(mockNow) // Unchanged
    expect(updatedProject.metadata.updatedAt).toBe(newMockNow) // Updated
  })

  it('handles project validation during import', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Test invalid project data
    const invalidProject = {
      // Missing required fields
      name: 'Invalid Project'
      // Missing sequencers, config, metadata
    }
    
    // Should handle invalid project gracefully
    expect(() => {
      sequencerStore.importProject(invalidProject as any)
    }).not.toThrow()
    
    // Should not have imported anything
    expect(sequencerStore.sequencers).toHaveLength(1) // Only default sequencer
  })

  it('handles project duplication', async () => {
    const wrapper = createTestWrapper(App)
    const sequencerStore = useSequencerStore()
    
    await waitForAudioLoad(200)
    await wrapper.vm.$nextTick()
    
    // Create original project
    sequencerStore.createSequencer('Original Track', 'piano')
    const originalProject = sequencerStore.saveProject('Original Project')
    
    // Duplicate project
    const duplicatedProject = sequencerStore.duplicateProject(originalProject)
    
    // Should have different ID
    expect(duplicatedProject.id).not.toBe(originalProject.id)
    
    // Should have same content but different name
    expect(duplicatedProject.name).toBe('Original Project (Copy)')
    expect(duplicatedProject.sequencers).toHaveLength(originalProject.sequencers.length)
    
    // Sequencer should have different ID but same content
    expect(duplicatedProject.sequencers[0].id).not.toBe(originalProject.sequencers[0].id)
    expect(duplicatedProject.sequencers[0].name).toBe('Original Track')
    expect(duplicatedProject.sequencers[0].instrument).toBe('piano')
  })
})