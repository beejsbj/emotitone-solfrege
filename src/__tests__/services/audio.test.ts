import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AudioService } from '@/services/audio'
import * as Tone from 'tone'

// Enhanced mock instrument for testing
const mockInstrument = {
  triggerAttack: vi.fn().mockReturnValue(undefined),
  triggerRelease: vi.fn().mockReturnValue(undefined),
  triggerAttackRelease: vi.fn().mockReturnValue(undefined),
  releaseAll: vi.fn().mockReturnValue(undefined),
  dispose: vi.fn().mockReturnValue(undefined),
  toDestination: vi.fn().mockReturnThis(),
}

// Mock the instrument store
const mockInstrumentStore = {
  getCurrentInstrument: vi.fn(() => mockInstrument),
  initializeInstruments: vi.fn().mockResolvedValue(undefined),
  dispose: vi.fn().mockReturnValue(undefined),
}

// Mock the store import - must be at top level for hoisting
vi.mock('@/stores/instrument', () => ({
  useInstrumentStore: () => mockInstrumentStore,
}))

describe('AudioService', () => {
  let audioService: AudioService
  let mockContext: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Create fresh mock context
    mockContext = {
      state: 'running',
      resume: vi.fn().mockResolvedValue(undefined),
      suspend: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      createOscillator: vi.fn(),
      createGain: vi.fn(),
    }
    
    // Set up default mock returns
    vi.mocked(Tone.getContext).mockReturnValue(mockContext)
    vi.mocked(Tone.start).mockResolvedValue(undefined)
    
    // Create fresh service instance
    audioService = new AudioService()
    
    // Mock document event listeners
    Object.defineProperty(document, 'addEventListener', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    })
    
    Object.defineProperty(document, 'removeEventListener', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Constructor and Initialization', () => {
    it('should initialize with default values', () => {
      expect(audioService.isAudioReady()).toBe(false)
      expect(audioService.getAudioState()).toBe('running')
      expect(audioService.getActiveNotes()).toEqual([])
    })

    it('should set up user interaction listeners', () => {
      new AudioService()
      expect(document.addEventListener).toHaveBeenCalledWith('click', expect.any(Function))
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(document.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function))
    })

    it('should initialize audio context when user interaction is received', async () => {
      const result = await audioService.startAudioContext()
      expect(result).toBe(true)
      expect(audioService.isAudioReady()).toBe(true)
    })

    it('should handle audio context start failure', async () => {
      vi.mocked(Tone.start).mockRejectedValue(new Error('Audio context failed'))
      
      const result = await audioService.startAudioContext()
      expect(result).toBe(false)
    })

    it('should handle suspended audio context', async () => {
      mockContext.state = 'suspended'
      
      await audioService.startAudioContext()
      expect(Tone.start).toHaveBeenCalled()
    })

    it('should not start audio context if already running', async () => {
      mockContext.state = 'running'
      
      await audioService.startAudioContext()
      expect(Tone.start).not.toHaveBeenCalled()
    })
  })

  describe('Audio State Management', () => {
    it('should return correct audio state', () => {
      mockContext.state = 'suspended'
      expect(audioService.getAudioState()).toBe('suspended')
    })

    it('should return correct audio ready state', async () => {
      expect(audioService.isAudioReady()).toBe(false)
      
      await audioService.startAudioContext()
      expect(audioService.isAudioReady()).toBe(true)
    })

    it('should handle audio context state changes during operations', async () => {
      mockContext.state = 'running'
      await audioService.startAudioContext()
      
      // Change to suspended during note play
      mockContext.state = 'suspended'
      await audioService.playNote('C4')
      
      expect(Tone.start).toHaveBeenCalled()
    })
  })

  describe('Note Playing', () => {
    beforeEach(async () => {
      await audioService.startAudioContext()
    })

    it('should play a note with string notation', async () => {
      await audioService.playNote('C4', '4n')
      expect(mockInstrument.triggerAttackRelease).toHaveBeenCalledWith('C4', '4n')
    })

    it('should play a note with frequency notation', async () => {
      await audioService.playNote(440, '4n')
      expect(mockInstrument.triggerAttackRelease).toHaveBeenCalledWith(440, '4n')
    })

    it('should use default duration if not specified', async () => {
      await audioService.playNote('C4')
      expect(mockInstrument.triggerAttackRelease).toHaveBeenCalledWith('C4', '1n')
    })

    it('should handle playNote when audio context is suspended', async () => {
      mockContext.state = 'suspended'
      await audioService.playNote('C4')
      
      expect(Tone.start).toHaveBeenCalled()
    })

    it('should handle playNote when no instrument is available', async () => {
      mockInstrumentStore.getCurrentInstrument.mockReturnValue(null)
      
      await audioService.playNote('C4')
      expect(mockInstrument.triggerAttackRelease).not.toHaveBeenCalled()
    })

    it('should handle instrument trigger errors gracefully', async () => {
      mockInstrument.triggerAttackRelease.mockImplementation(() => {
        throw new Error('Instrument error')
      })
      
      await expect(audioService.playNote('C4')).resolves.not.toThrow()
    })
  })

  describe('Note Playing with Duration', () => {
    beforeEach(async () => {
      await audioService.startAudioContext()
    })

    it('should play note with duration and return note ID', async () => {
      const noteId = await audioService.playNoteWithDuration('C4', '4n')
      
      expect(noteId).toBeTruthy()
      expect(noteId).toMatch(/^note_C4_\d+_\d+/)
      expect(mockInstrument.triggerAttackRelease).toHaveBeenCalledWith('C4', '4n')
    })

    it('should schedule note for future playback', async () => {
      const noteId = await audioService.playNoteWithDuration('C4', '4n', 1)
      
      expect(noteId).toBeTruthy()
      expect(mockInstrument.triggerAttackRelease).toHaveBeenCalledWith('C4', '4n', 1)
    })

    it('should handle frequency input', async () => {
      const noteId = await audioService.playNoteWithDuration(440, '4n')
      
      expect(noteId).toBeTruthy()
      expect(mockInstrument.triggerAttackRelease).toHaveBeenCalledWith(440, '4n')
    })

    it('should return empty string on error', async () => {
      mockInstrument.triggerAttackRelease.mockImplementation(() => {
        throw new Error('Trigger error')
      })
      
      const noteId = await audioService.playNoteWithDuration('C4', '4n')
      expect(noteId).toBe('')
    })
  })

  describe('Attack and Release', () => {
    beforeEach(async () => {
      await audioService.startAudioContext()
    })

    it('should attack a note and return note ID', async () => {
      const noteId = await audioService.attackNote('C4')
      
      expect(noteId).toBeTruthy()
      expect(noteId).toMatch(/^note_C4_\d+/)
      expect(mockInstrument.triggerAttack).toHaveBeenCalledWith('C4')
      expect(audioService.getActiveNotes()).toHaveLength(1)
      expect(audioService.isNoteActive(noteId)).toBe(true)
    })

    it('should attack a note with custom note ID', async () => {
      const customId = 'custom-note-id'
      const noteId = await audioService.attackNote('C4', customId)
      
      expect(noteId).toBe(customId)
      expect(audioService.isNoteActive(customId)).toBe(true)
    })

    it('should attack a note with frequency and frequency parameter', async () => {
      const noteId = await audioService.attackNote(440, undefined, 440)
      
      expect(noteId).toBeTruthy()
      expect(mockInstrument.triggerAttack).toHaveBeenCalledWith(440)
      
      const activeNotes = audioService.getActiveNotes()
      expect(activeNotes[0].frequency).toBe(440)
    })

    it('should release a specific note', async () => {
      const noteId = await audioService.attackNote('C4')
      await audioService.releaseNote(noteId)
      
      expect(mockInstrument.triggerRelease).toHaveBeenCalledWith('C4')
      expect(audioService.getActiveNotes()).toHaveLength(0)
      expect(audioService.isNoteActive(noteId)).toBe(false)
    })

    it('should release all notes when no note ID provided', async () => {
      await audioService.attackNote('C4')
      await audioService.attackNote('D4')
      await audioService.releaseNote()
      
      expect(mockInstrument.releaseAll).toHaveBeenCalled()
      expect(audioService.getActiveNotes()).toHaveLength(0)
    })

    it('should handle release errors gracefully', async () => {
      const noteId = await audioService.attackNote('C4')
      mockInstrument.triggerRelease.mockImplementation(() => {
        throw new Error('Release error')
      })
      
      await audioService.releaseNote(noteId)
      // Should still remove from active notes even if release fails
      expect(audioService.getActiveNotes()).toHaveLength(0)
    })

    it('should handle attack when no instrument available', async () => {
      mockInstrumentStore.getCurrentInstrument.mockReturnValue(null)
      
      const noteId = await audioService.attackNote('C4')
      expect(noteId).toBe('')
    })

    it('should handle attack when instrument lacks triggerAttack method', async () => {
      mockInstrumentStore.getCurrentInstrument.mockReturnValue({ 
        triggerAttackRelease: vi.fn() 
      })
      
      const noteId = await audioService.attackNote('C4')
      expect(noteId).toBe('')
    })
  })

  describe('Release by Frequency', () => {
    beforeEach(async () => {
      await audioService.startAudioContext()
    })

    it('should release note by frequency', async () => {
      await audioService.attackNote(440, undefined, 440)
      await audioService.releaseNoteByFrequency(440)
      
      expect(mockInstrument.triggerRelease).toHaveBeenCalledWith(440)
      expect(audioService.getActiveNotes()).toHaveLength(0)
    })

    it('should handle release by frequency errors', async () => {
      mockInstrument.triggerRelease.mockImplementation(() => {
        throw new Error('Release error')
      })
      
      await audioService.attackNote(440, undefined, 440)
      await audioService.releaseNoteByFrequency(440)
      
      // Should not throw, just log error
      expect(audioService.getActiveNotes()).toHaveLength(0)
    })

    it('should handle release by frequency when no instrument', async () => {
      mockInstrumentStore.getCurrentInstrument.mockReturnValue(null)
      
      await expect(audioService.releaseNoteByFrequency(440)).resolves.not.toThrow()
    })
  })

  describe('Note by Name', () => {
    beforeEach(async () => {
      await audioService.startAudioContext()
    })

    it('should play note by name with default octave', async () => {
      await audioService.playNoteByName('C')
      expect(mockInstrument.triggerAttackRelease).toHaveBeenCalledWith('C4', '1n')
    })

    it('should play note by name with custom octave and duration', async () => {
      await audioService.playNoteByName('C', 5, '8n')
      expect(mockInstrument.triggerAttackRelease).toHaveBeenCalledWith('C5', '8n')
    })

    it('should handle errors when playing note by name', async () => {
      mockInstrument.triggerAttackRelease.mockImplementation(() => {
        throw new Error('Note error')
      })
      
      await expect(audioService.playNoteByName('C')).resolves.not.toThrow()
    })
  })

  describe('Sequence Playing', () => {
    beforeEach(async () => {
      await audioService.startAudioContext()
    })

    it('should play a sequence of notes', async () => {
      const notes = ['C4', 'D4', 'E4']
      const tempo = 140
      
      // Mock Tone.Sequence and Transport
      const mockSequence = {
        start: vi.fn(),
        stop: vi.fn(),
        dispose: vi.fn(),
      }
      
      const mockTransport = {
        bpm: { value: 120 },
        start: vi.fn(),
        stop: vi.fn(),
      }
      
      vi.mocked(Tone.Sequence as any).mockReturnValue(mockSequence)
      vi.mocked(Tone.getTransport).mockReturnValue(mockTransport as any)
      
      await audioService.playSequence(notes, tempo)
      
      expect(mockTransport.bpm.value).toBe(tempo)
      expect(mockSequence.start).toHaveBeenCalledWith(0)
      expect(mockTransport.start).toHaveBeenCalled()
    })

    it('should handle sequence playing errors', async () => {
      mockInstrumentStore.getCurrentInstrument.mockReturnValue(null)
      
      await expect(audioService.playSequence(['C4', 'D4'])).resolves.not.toThrow()
    })

    it('should use default tempo if not provided', async () => {
      const mockTransport = {
        bpm: { value: 120 },
        start: vi.fn(),
        stop: vi.fn(),
      }
      
      vi.mocked(Tone.getTransport).mockReturnValue(mockTransport as any)
      vi.mocked(Tone.Sequence as any).mockReturnValue({
        start: vi.fn(),
        stop: vi.fn(),
        dispose: vi.fn(),
      })
      
      await audioService.playSequence(['C4'])
      
      expect(mockTransport.bpm.value).toBe(120)
    })
  })

  describe('Stop and Dispose', () => {
    beforeEach(async () => {
      await audioService.startAudioContext()
    })

    it('should stop all notes and clear active notes', async () => {
      await audioService.attackNote('C4')
      await audioService.attackNote('D4')
      await audioService.stop()
      
      expect(mockInstrument.releaseAll).toHaveBeenCalled()
      expect(audioService.getActiveNotes()).toHaveLength(0)
    })

    it('should handle stop errors gracefully', async () => {
      mockInstrument.releaseAll.mockImplementation(() => {
        throw new Error('Stop error')
      })
      
      await audioService.attackNote('C4')
      await audioService.stop()
      
      // Should still clear active notes
      expect(audioService.getActiveNotes()).toHaveLength(0)
    })

    it('should handle stop when no instrument available', async () => {
      mockInstrumentStore.getCurrentInstrument.mockReturnValue(null)
      
      await expect(audioService.stop()).resolves.not.toThrow()
    })

    it('should dispose instrument store', async () => {
      await audioService.dispose()
      expect(mockInstrumentStore.dispose).toHaveBeenCalled()
    })

    it('should handle dispose errors gracefully', async () => {
      mockInstrumentStore.dispose.mockImplementation(() => {
        throw new Error('Dispose error')
      })
      
      await expect(audioService.dispose()).resolves.not.toThrow()
    })
  })

  describe('Instrument Store Integration', () => {
    it('should initialize instrument store lazily', async () => {
      await audioService.startAudioContext()
      await audioService.playNote('C4')
      
      expect(mockInstrumentStore.initializeInstruments).toHaveBeenCalled()
      expect(mockInstrumentStore.getCurrentInstrument).toHaveBeenCalled()
    })

    it('should handle instrument store initialization failure', async () => {
      mockInstrumentStore.initializeInstruments.mockRejectedValue(new Error('Store failed'))
      
      await expect(audioService.playNote('C4')).resolves.not.toThrow()
    })

    it('should handle store unavailability gracefully', async () => {
      // Test error handling when store completely fails
      vi.doMock('@/stores/instrument', () => {
        throw new Error('Store not available')
      })
      
      await expect(audioService.playNote('C4')).resolves.not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle initialization errors', async () => {
      vi.mocked(Tone.start).mockRejectedValue(new Error('Init error'))
      
      await audioService.initialize()
      expect(audioService.isAudioReady()).toBe(false)
    })

    it('should handle missing user interaction gracefully', async () => {
      // Create service without user interaction
      const newService = new AudioService()
      
      await newService.playNote('C4')
      
      // Should not throw, just log and continue
      expect(mockInstrument.triggerAttackRelease).toHaveBeenCalled()
    })

    it('should handle context state changes during operations', async () => {
      mockContext.state = 'running'
      await audioService.startAudioContext()
      
      // Change to suspended during note play
      mockContext.state = 'suspended'
      await audioService.playNote('C4')
      
      expect(Tone.start).toHaveBeenCalled()
    })
  })

  describe('Active Notes Management', () => {
    beforeEach(async () => {
      await audioService.startAudioContext()
    })

    it('should track active notes correctly', async () => {
      const noteId1 = await audioService.attackNote('C4')
      const noteId2 = await audioService.attackNote('D4')
      
      expect(audioService.getActiveNotes()).toHaveLength(2)
      expect(audioService.isNoteActive(noteId1)).toBe(true)
      expect(audioService.isNoteActive(noteId2)).toBe(true)
    })

    it('should remove notes from active list when released', async () => {
      const noteId = await audioService.attackNote('C4')
      await audioService.releaseNote(noteId)
      
      expect(audioService.getActiveNotes()).toHaveLength(0)
      expect(audioService.isNoteActive(noteId)).toBe(false)
    })

    it('should handle checking non-existent note ID', () => {
      expect(audioService.isNoteActive('non-existent')).toBe(false)
    })
  })
})