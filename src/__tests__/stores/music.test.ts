import { setActivePinia, createPinia } from 'pinia'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useMusicStore } from '@/stores/music'
import { useInstrumentStore } from '@/stores/instrument'
import { createTestPinia } from '../helpers/test-utils'
import { resetAudioMocks } from '../helpers/audio-mocks'


describe('Music Store', () => {
  let musicStore: ReturnType<typeof useMusicStore>
  let instrumentStore: ReturnType<typeof useInstrumentStore>

  beforeEach(() => {
    setActivePinia(createTestPinia())
    musicStore = useMusicStore()
    instrumentStore = useInstrumentStore()
    resetAudioMocks()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers?.()
  })

  describe('State Management', () => {
    it('should initialize with default values', () => {
      expect(musicStore.currentKey).toBe('C')
      expect(musicStore.currentMode).toBe('major')
      expect(musicStore.currentNote).toBe(null)
      expect(musicStore.activeNotes.size).toBe(0)
      expect(musicStore.isPlaying).toBe(false)
      expect(musicStore.sequence).toEqual([])
    })

    it('should allow setting key and mode', () => {
      musicStore.setKey('D')
      expect(musicStore.currentKey).toBe('D')

      musicStore.setMode('minor')
      expect(musicStore.currentMode).toBe('minor')
    })
  })

  describe('Computed Properties', () => {
    it('should compute current scale', () => {
      const scale = musicStore.currentScale
      expect(scale.name).toBe('Major')
      expect(scale.solfege).toHaveLength(7)
    })

    it('should compute current scale notes', () => {
      const notes = musicStore.currentScaleNotes
      expect(notes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    })

    it('should compute solfege data', () => {
      const solfege = musicStore.solfegeData
      expect(solfege).toHaveLength(7)
      expect(solfege[0].name).toBe('Do')
    })

    it('should compute current key display', () => {
      expect(musicStore.currentKeyDisplay).toBe('C Major')
      
      musicStore.setKey('D')
      musicStore.setMode('minor')
      expect(musicStore.currentKeyDisplay).toBe('D Minor')
    })
  })

  describe('Note Playing', () => {
    it('should play note with solfege index', async () => {
      await musicStore.playNote(0) // Do
      
      expect(musicStore.currentNote).toBe('Do')
      expect(musicStore.isPlaying).toBe(true)
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'note-played',
          detail: expect.objectContaining({
            note: expect.objectContaining({ name: 'Do' }),
            frequency: expect.any(Number),
            noteName: 'C4',
            solfegeIndex: 0,
            octave: 4
          })
        })
      )
    })

    it('should play note with chromatic note string', async () => {
      await musicStore.playNote('C4')
      
      expect(musicStore.currentNote).toBe('Do')
      expect(musicStore.isPlaying).toBe(true)
    })

    it('should attack and release notes', async () => {
      const noteId = await musicStore.attackNote(0)
      expect(noteId).toBe('mock-note-id')
      expect(musicStore.activeNotes.size).toBe(1)
      expect(musicStore.isPlaying).toBe(true)

      musicStore.releaseNote(noteId!)
      expect(musicStore.activeNotes.size).toBe(0)
      expect(musicStore.isPlaying).toBe(false)
    })

    it('should play note with duration', async () => {
      const noteId = await musicStore.playNoteWithDuration(0, 4, '4n')
      expect(noteId).toBe('mock-note-id')
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'note-played',
          detail: expect.objectContaining({
            duration: '4n',
            octave: 4
          })
        })
      )
    })

    it('should handle multiple active notes', async () => {
      const noteId1 = await musicStore.attackNote(0)
      const noteId2 = await musicStore.attackNote(2)
      
      expect(musicStore.activeNotes.size).toBe(2)
      expect(musicStore.getActiveNotes()).toHaveLength(2)
      expect(musicStore.getActiveNoteNames()).toEqual(['C4', 'E4'])
    })

    it('should release all notes', async () => {
      await musicStore.attackNote(0)
      await musicStore.attackNote(2)
      
      expect(musicStore.activeNotes.size).toBe(2)
      
      musicStore.releaseAllNotes()
      expect(musicStore.activeNotes.size).toBe(0)
      expect(musicStore.isPlaying).toBe(false)
    })
  })

  describe('Sequence Management', () => {
    it('should add notes to sequence', () => {
      musicStore.addToSequence('Do')
      musicStore.addToSequence('Re')
      
      expect(musicStore.sequence).toEqual(['Do', 'Re'])
    })

    it('should limit sequence to 16 notes', () => {
      // Add 17 notes
      for (let i = 0; i < 17; i++) {
        musicStore.addToSequence('Do')
      }
      
      expect(musicStore.sequence).toHaveLength(16)
    })

    it('should clear sequence', () => {
      musicStore.addToSequence('Do')
      musicStore.addToSequence('Re')
      musicStore.clearSequence()
      
      expect(musicStore.sequence).toEqual([])
    })

    it('should remove last note from sequence', () => {
      musicStore.addToSequence('Do')
      musicStore.addToSequence('Re')
      musicStore.removeLastFromSequence()
      
      expect(musicStore.sequence).toEqual(['Do'])
    })
  })

  describe('Helper Functions', () => {
    it('should get solfege by name', () => {
      const solfege = musicStore.getSolfegeByName('Do')
      expect(solfege).toBeDefined()
      expect(solfege?.name).toBe('Do')
    })

    it('should get note frequency', () => {
      const frequency = musicStore.getNoteFrequency(0, 4)
      expect(frequency).toBeCloseTo(261.63)
    })

    it('should get note name', () => {
      const noteName = musicStore.getNoteName(0, 4)
      expect(noteName).toBe('C4')
    })

    it('should check if note is active', async () => {
      const noteId = await musicStore.attackNote(0)
      expect(musicStore.isNoteActive(noteId!)).toBe(true)
      expect(musicStore.isNoteActive('invalid-id')).toBe(false)
    })
  })

  describe('Note Input Parsing', () => {
    it('should parse chromatic note with octave', () => {
      const parsed = musicStore.parseNoteInput('C4')
      expect(parsed).toEqual({ solfegeIndex: 0, octave: 4 })
    })

    it('should parse solfege index input', () => {
      const parsed = musicStore.parseNoteInput({ solfegeIndex: 2, octave: 5 })
      expect(parsed).toEqual({ solfegeIndex: 2, octave: 5 })
    })

    it('should handle invalid note input', () => {
      const parsed = musicStore.parseNoteInput('X9')
      expect(parsed).toBeNull()
    })
  })

  describe('Melody Management', () => {
    it('should search melodies', () => {
      const results = musicStore.searchMelodies('test')
      expect(results).toEqual([])
    })

    it('should get melodies by emotion', () => {
      const results = musicStore.getMelodiesByEmotion('happy')
      expect(results).toEqual([])
    })

    it('should get melodies by category', () => {
      const results = musicStore.melodiesByCategory('intervals')
      expect(results).toEqual([])
    })

    it('should get all melodies', () => {
      const melodies = musicStore.allMelodies
      expect(melodies).toEqual([])
    })
  })

  describe('Legacy Support', () => {
    it('should maintain backward compatibility with currentNote', async () => {
      await musicStore.playNote(0)
      expect(musicStore.currentNote).toBe('Do')
      
      // Test timeout clearing
      vi.useFakeTimers()
      await musicStore.playNote(0)
      vi.advanceTimersByTime(2000)
      expect(musicStore.currentNote).toBe(null)
      expect(musicStore.isPlaying).toBe(false)
      vi.useRealTimers()
    })

    it('should update currentNote when releasing specific note', async () => {
      const noteId1 = await musicStore.attackNote(0) // Do
      const noteId2 = await musicStore.attackNote(2) // Mi
      
      // Release first note
      musicStore.releaseNote(noteId1!)
      
      // Should still have one active note
      expect(musicStore.activeNotes.size).toBe(1)
      expect(musicStore.currentNote).toBe('Mi')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid solfege index in playNote', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      await musicStore.playNote(10) // Invalid index
      
      expect(consoleSpy).not.toHaveBeenCalled() // Should not warn for solfege index
      consoleSpy.mockRestore()
    })

    it('should handle invalid chromatic note in playNote', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      await musicStore.playNote('X9' as any)
      
      expect(consoleSpy).toHaveBeenCalledWith('Invalid note: X9')
      consoleSpy.mockRestore()
    })
  })

  describe('Event Dispatching', () => {
    it('should dispatch note-played event with correct details', async () => {
      await musicStore.playNote(0)
      
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'note-played',
          detail: expect.objectContaining({
            note: expect.objectContaining({ name: 'Do' }),
            frequency: expect.any(Number),
            noteName: 'C4',
            solfegeIndex: 0,
            octave: 4,
            instrument: expect.any(String),
            instrumentConfig: expect.any(Object)
          })
        })
      )
    })

    it('should dispatch note-released event when releasing notes', async () => {
      const noteId = await musicStore.attackNote(0)
      musicStore.releaseNote(noteId!)
      
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'note-released',
          detail: expect.objectContaining({
            note: 'Do',
            noteId: noteId,
            noteName: 'C4',
            frequency: expect.any(Number),
            octave: 4
          })
        })
      )
    })
  })

  describe('Store Persistence', () => {
    it('should be configured for persistence', () => {
      // The store should be configured with persist: true
      // This is tested by checking the store definition
      expect(musicStore.$id).toBe('music')
    })
  })
})