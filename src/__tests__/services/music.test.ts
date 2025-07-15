import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MusicTheoryService } from '@/services/music'
import { CHROMATIC_NOTES, MAJOR_SCALE, MINOR_SCALE } from '@/data'
import type { ChromaticNote, MusicalMode, MelodyCategory } from '@/types/music'

// Mock melody data - must be declared before the mock
const mockIntervalPatterns = [
  {
    name: 'Perfect Fifth',
    description: 'A perfect fifth interval',
    emotion: 'stable',
    sequence: [
      { note: 'Do', duration: '4n' },
      { note: 'Sol', duration: '4n' }
    ],
    intervals: [7],
  },
  {
    name: 'Major Third',
    description: 'A major third interval',
    emotion: 'happy',
    sequence: [
      { note: 'Do', duration: '4n' },
      { note: 'Mi', duration: '4n' }
    ],
    intervals: [4],
  },
]

const mockPatternMelodies = [
  {
    name: 'Scale Run',
    description: 'Ascending scale pattern',
    emotion: 'energetic',
    sequence: [
      { note: 'Do', duration: '8n' },
      { note: 'Re', duration: '8n' },
      { note: 'Mi', duration: '8n' },
      { note: 'Fa', duration: '8n' },
      { note: 'Sol', duration: '8n' },
    ],
  },
]

const mockCompleteMelodies = [
  {
    name: 'Twinkle Twinkle',
    description: 'Classic children\'s song',
    emotion: 'playful',
    sequence: [
      { note: 'Do', duration: '4n' },
      { note: 'Do', duration: '4n' },
      { note: 'Sol', duration: '4n' },
      { note: 'Sol', duration: '4n' },
    ],
    defaultBpm: 120,
    defaultKey: 'C',
  },
]

const mockMelodicPatterns = [
  ...mockIntervalPatterns,
  ...mockPatternMelodies,
  ...mockCompleteMelodies,
]

// Mock the data imports
vi.mock('@/data', async () => {
  const actual = await vi.importActual('@/data')
  return {
    ...actual,
    getAllMelodicPatterns: vi.fn(() => mockMelodicPatterns),
    getPatternsByEmotion: vi.fn(() => mockMelodicPatterns.filter(p => p.emotion?.includes('happy'))),
    getIntervalPatterns: vi.fn(() => mockIntervalPatterns),
    getMelodicPatterns: vi.fn(() => mockPatternMelodies),
    getCompleteMelodies: vi.fn(() => mockCompleteMelodies),
  }
})

// Mock Tonal.js
vi.mock('@tonaljs/tonal', () => ({
  Note: {
    get: vi.fn((note: string) => {
      const noteMap: Record<string, { freq?: number; pc?: string }> = {
        'C4': { freq: 261.63, pc: 'C' },
        'C#4': { freq: 277.18, pc: 'C#' },
        'D4': { freq: 293.66, pc: 'D' },
        'D#4': { freq: 311.13, pc: 'D#' },
        'E4': { freq: 329.63, pc: 'E' },
        'F4': { freq: 349.23, pc: 'F' },
        'F#4': { freq: 369.99, pc: 'F#' },
        'G4': { freq: 392.00, pc: 'G' },
        'G#4': { freq: 415.30, pc: 'G#' },
        'A4': { freq: 440.00, pc: 'A' },
        'A#4': { freq: 466.16, pc: 'A#' },
        'B4': { freq: 493.88, pc: 'B' },
        'C5': { freq: 523.25, pc: 'C' },
        'Db4': { freq: 277.18, pc: 'Db' },
        'Eb4': { freq: 311.13, pc: 'Eb' },
        'Gb4': { freq: 369.99, pc: 'Gb' },
        'Ab4': { freq: 415.30, pc: 'Ab' },
        'Bb4': { freq: 466.16, pc: 'Bb' },
      }
      return noteMap[note] || { freq: undefined, pc: undefined }
    }),
  },
  Scale: {
    get: vi.fn((scaleName: string) => {
      const scaleMap: Record<string, { notes: string[] }> = {
        'C major': { notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
        'C minor': { notes: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'] },
        'D major': { notes: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'] },
        'D minor': { notes: ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'] },
        'E major': { notes: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'] },
        'F# major': { notes: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'] },
        'Gb major': { notes: ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'] },
      }
      return scaleMap[scaleName] || { notes: [] }
    }),
  },
}))

describe('MusicTheoryService', () => {
  let musicService: MusicTheoryService

  beforeEach(() => {
    vi.clearAllMocks()
    musicService = new MusicTheoryService()
  })

  describe('Constructor and Initialization', () => {
    it('should initialize with default values', () => {
      expect(musicService.getCurrentKey()).toBe('C')
      expect(musicService.getCurrentMode()).toBe('major')
      expect(musicService.getCurrentScale()).toBe(MAJOR_SCALE)
    })

    it('should initialize melody cache', () => {
      const allMelodies = musicService.getAllMelodies()
      expect(allMelodies.length).toBeGreaterThan(0)
      expect(allMelodies.every(m => m.category)).toBe(true)
    })

    it('should categorize melodies correctly', () => {
      const intervals = musicService.getMelodiesByCategory('intervals')
      const patterns = musicService.getMelodiesByCategory('patterns')
      const complete = musicService.getMelodiesByCategory('complete')

      expect(intervals.every(m => m.category === 'intervals')).toBe(true)
      expect(patterns.every(m => m.category === 'patterns')).toBe(true)
      expect(complete.every(m => m.category === 'complete')).toBe(true)
    })
  })

  describe('Key and Mode Management', () => {
    it('should set and get current key', () => {
      musicService.setCurrentKey('D')
      expect(musicService.getCurrentKey()).toBe('D')
    })

    it('should throw error for invalid key', () => {
      expect(() => musicService.setCurrentKey('Invalid' as ChromaticNote)).toThrow('Invalid key: Invalid')
    })

    it('should set and get current mode', () => {
      musicService.setCurrentMode('minor')
      expect(musicService.getCurrentMode()).toBe('minor')
    })

    it('should return correct scale for mode', () => {
      expect(musicService.getCurrentScale()).toBe(MAJOR_SCALE)
      
      musicService.setCurrentMode('minor')
      expect(musicService.getCurrentScale()).toBe(MINOR_SCALE)
    })
  })

  describe('Scale Notes Calculation', () => {
    it('should return correct scale notes for C major', () => {
      const notes = musicService.getCurrentScaleNotes()
      expect(notes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    })

    it('should return correct scale notes for C minor', () => {
      musicService.setCurrentMode('minor')
      const notes = musicService.getCurrentScaleNotes()
      expect(notes).toEqual(['C', 'D', 'D#', 'F', 'G', 'G#', 'A#'])
    })

    it('should return correct scale notes for D major', () => {
      musicService.setCurrentKey('D')
      const notes = musicService.getCurrentScaleNotes()
      expect(notes).toEqual(['D', 'E', 'F#', 'G', 'A', 'B', 'C#'])
    })

    it('should normalize flat notes to sharp notes', () => {
      musicService.setCurrentKey('D')
      musicService.setCurrentMode('minor')
      const notes = musicService.getCurrentScaleNotes()
      
      // Should convert any flats to sharps
      expect(notes.every(note => !note.includes('b'))).toBe(true)
    })

    it('should handle edge cases in note normalization', () => {
      // Test with key that produces edge case notes
      musicService.setCurrentKey('F#')
      const notes = musicService.getCurrentScaleNotes()
      
      expect(notes).toContain('F#')
      expect(notes.length).toBe(7)
    })
  })

  describe('Frequency Calculation', () => {
    it('should calculate correct frequency for scale degrees', () => {
      const doFreq = musicService.getNoteFrequency(0, 4) // Do in C major
      expect(doFreq).toBe(261.63)

      const miFreq = musicService.getNoteFrequency(2, 4) // Mi in C major
      expect(miFreq).toBe(329.63)
    })

    it('should calculate correct frequency for octave note (Do\')', () => {
      const doOctaveFreq = musicService.getNoteFrequency(7, 4) // Do' (octave)
      expect(doOctaveFreq).toBe(523.25) // C5
    })

    it('should handle different octaves', () => {
      const doFreq3 = musicService.getNoteFrequency(0, 3) // Do in octave 3
      const doFreq5 = musicService.getNoteFrequency(0, 5) // Do in octave 5
      
      expect(doFreq5).toBeGreaterThan(doFreq3)
    })

    it('should calculate correct octave for ascending scale', () => {
      musicService.setCurrentKey('B')
      const doFreq = musicService.getNoteFrequency(0, 4) // B4
      const reFreq = musicService.getNoteFrequency(1, 4) // C#5 (next octave)
      
      expect(reFreq).toBeGreaterThan(doFreq)
    })

    it('should fallback to manual calculation if Tonal.js fails', () => {
      // Mock Tonal.js to return no frequency
      vi.mocked(require('@tonaljs/tonal').Note.get).mockReturnValue({ freq: undefined })
      
      const freq = musicService.getNoteFrequency(0, 4)
      expect(freq).toBeGreaterThan(0)
      expect(freq).toBeCloseTo(261.63, 1)
    })
  })

  describe('Note Name Calculation', () => {
    it('should return correct note names for scale degrees', () => {
      expect(musicService.getNoteName(0, 4)).toBe('C4') // Do
      expect(musicService.getNoteName(2, 4)).toBe('E4') // Mi
      expect(musicService.getNoteName(4, 4)).toBe('G4') // Sol
    })

    it('should return correct note name for octave note', () => {
      expect(musicService.getNoteName(7, 4)).toBe('C5') // Do'
    })

    it('should handle different keys', () => {
      musicService.setCurrentKey('G')
      expect(musicService.getNoteName(0, 4)).toBe('G4') // Do in G major
      expect(musicService.getNoteName(2, 4)).toBe('B4') // Mi in G major
    })

    it('should handle octave wrapping correctly', () => {
      musicService.setCurrentKey('B')
      const doName = musicService.getNoteName(0, 4) // B4
      const reName = musicService.getNoteName(1, 4) // Should be C#5
      
      expect(doName).toBe('B4')
      expect(reName).toBe('C#5')
    })
  })

  describe('Solfege Data', () => {
    it('should return correct solfege data for scale degrees', () => {
      const doData = musicService.getSolfegeData(0)
      expect(doData).toBeDefined()
      expect(doData?.name).toBe('Do')
      expect(doData?.number).toBe(1)

      const miData = musicService.getSolfegeData(2)
      expect(miData).toBeDefined()
      expect(miData?.name).toBe('Mi')
      expect(miData?.number).toBe(3)
    })

    it('should return null for invalid scale degrees', () => {
      const invalidData = musicService.getSolfegeData(10)
      expect(invalidData).toBeNull()
    })

    it('should return different solfege data for different modes', () => {
      const majorData = musicService.getSolfegeData(2)
      
      musicService.setCurrentMode('minor')
      const minorData = musicService.getSolfegeData(2)
      
      expect(majorData?.name).toBe('Mi')
      expect(minorData?.name).toBe('Me')
    })
  })

  describe('Melody Management', () => {
    it('should return all melodies', () => {
      const allMelodies = musicService.getAllMelodies()
      expect(allMelodies.length).toBe(mockMelodicPatterns.length)
      expect(allMelodies.every(m => m.category)).toBe(true)
    })

    it('should return melodies by category', () => {
      const intervals = musicService.getMelodiesByCategory('intervals')
      const patterns = musicService.getMelodiesByCategory('patterns')
      const complete = musicService.getMelodiesByCategory('complete')

      expect(intervals.length).toBe(mockIntervalPatterns.length)
      expect(patterns.length).toBe(mockPatternMelodies.length)
      expect(complete.length).toBe(mockCompleteMelodies.length)
    })

    it('should return melodies by emotion', () => {
      const happyMelodies = musicService.getMelodiesByEmotion('happy')
      expect(happyMelodies.length).toBeGreaterThan(0)
      expect(happyMelodies.every(m => m.emotion?.toLowerCase().includes('happy'))).toBe(true)
    })

    it('should search melodies by text', () => {
      const twinkleResults = musicService.searchMelodies('twinkle')
      expect(twinkleResults.length).toBeGreaterThan(0)
      expect(twinkleResults.some(m => m.name.toLowerCase().includes('twinkle'))).toBe(true)

      const playfulResults = musicService.searchMelodies('playful')
      expect(playfulResults.length).toBeGreaterThan(0)
      expect(playfulResults.some(m => m.emotion?.toLowerCase().includes('playful'))).toBe(true)
    })

    it('should search melodies case-insensitively', () => {
      const upperResults = musicService.searchMelodies('TWINKLE')
      const lowerResults = musicService.searchMelodies('twinkle')
      
      expect(upperResults.length).toBe(lowerResults.length)
    })

    it('should return empty array for non-existent category', () => {
      const nonExistentCategory = musicService.getMelodiesByCategory('nonexistent' as MelodyCategory)
      expect(nonExistentCategory).toEqual([])
    })
  })

  describe('User Melody Management', () => {
    const mockUserMelody = {
      name: 'My Custom Melody',
      description: 'A user-created melody',
      emotion: 'creative',
      sequence: [
        { note: 'Do', duration: '4n' },
        { note: 'Re', duration: '4n' },
        { note: 'Mi', duration: '4n' },
      ],
    }

    it('should add user melody', () => {
      const addedMelody = musicService.addUserMelody(mockUserMelody)
      
      expect(addedMelody.category).toBe('userCreated')
      expect(addedMelody.name).toBe(mockUserMelody.name)
      
      const userMelodies = musicService.getMelodiesByCategory('userCreated')
      expect(userMelodies).toContain(addedMelody)
      
      const allMelodies = musicService.getAllMelodies()
      expect(allMelodies).toContain(addedMelody)
    })

    it('should remove user melody', () => {
      const addedMelody = musicService.addUserMelody(mockUserMelody)
      
      musicService.removeUserMelody(addedMelody.name)
      
      const userMelodies = musicService.getMelodiesByCategory('userCreated')
      expect(userMelodies.find(m => m.name === addedMelody.name)).toBeUndefined()
      
      const allMelodies = musicService.getAllMelodies()
      expect(allMelodies.find(m => m.name === addedMelody.name)).toBeUndefined()
    })

    it('should not affect other categories when removing user melody', () => {
      const originalIntervalsCount = musicService.getMelodiesByCategory('intervals').length
      
      musicService.addUserMelody(mockUserMelody)
      musicService.removeUserMelody(mockUserMelody.name)
      
      const finalIntervalsCount = musicService.getMelodiesByCategory('intervals').length
      expect(finalIntervalsCount).toBe(originalIntervalsCount)
    })
  })

  describe('Legacy Methods', () => {
    it('should return all melodic patterns', () => {
      const patterns = musicService.getMelodicPatterns()
      expect(patterns.length).toBe(mockMelodicPatterns.length)
    })

    it('should return melodic patterns by category', () => {
      const intervals = musicService.getMelodicPatternsByCategory('intervals')
      const patterns = musicService.getMelodicPatternsByCategory('patterns')
      
      expect(intervals.length).toBeGreaterThan(0)
      expect(patterns.length).toBeGreaterThan(0)
    })

    it('should filter intervals correctly', () => {
      const intervals = musicService.getMelodicPatternsByCategory('intervals')
      
      // All intervals should have exactly one interval in their intervals array
      expect(intervals.every(pattern => 
        pattern.intervals && pattern.intervals.length === 1
      )).toBe(true)
    })

    it('should filter patterns correctly', () => {
      const patterns = musicService.getMelodicPatternsByCategory('patterns')
      
      // All patterns should either have no intervals or more than one interval
      expect(patterns.every(pattern => 
        !pattern.intervals || pattern.intervals.length !== 1
      )).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle Tonal.js errors gracefully', () => {
      vi.mocked(require('@tonaljs/tonal').Scale.get).mockImplementation(() => {
        throw new Error('Tonal.js error')
      })
      
      expect(() => musicService.getCurrentScaleNotes()).toThrow()
    })

    it('should handle invalid note conversion', () => {
      vi.mocked(require('@tonaljs/tonal').Note.get).mockReturnValue({ freq: undefined, pc: undefined })
      
      // Should fallback to manual calculation
      const freq = musicService.getNoteFrequency(0, 4)
      expect(freq).toBeGreaterThan(0)
    })

    it('should handle empty scale from Tonal.js', () => {
      vi.mocked(require('@tonaljs/tonal').Scale.get).mockReturnValue({ notes: [] })
      
      expect(() => musicService.getCurrentScaleNotes()).toThrow()
    })
  })

  describe('Note Normalization', () => {
    it('should normalize flat notes to sharp equivalents', () => {
      // Test direct normalization through the private method via public interface
      musicService.setCurrentKey('D')
      musicService.setCurrentMode('minor')
      
      const notes = musicService.getCurrentScaleNotes()
      // Should contain sharp notes, not flat notes
      expect(notes).not.toContain('Bb')
      expect(notes).toContain('A#')
    })

    it('should handle double accidentals', () => {
      // Mock a scale that might produce double accidentals
      vi.mocked(require('@tonaljs/tonal').Scale.get).mockReturnValue({
        notes: ['F##', 'C##', 'Gbb', 'Dbb']
      })
      
      const notes = musicService.getCurrentScaleNotes()
      expect(notes).toContain('G') // F## -> G
      expect(notes).toContain('D') // C## -> D
      expect(notes).toContain('F') // Gbb -> F
      expect(notes).toContain('C') // Dbb -> C
    })

    it('should handle edge case enharmonic equivalents', () => {
      vi.mocked(require('@tonaljs/tonal').Scale.get).mockReturnValue({
        notes: ['E#', 'B#', 'Fb', 'Cb']
      })
      
      const notes = musicService.getCurrentScaleNotes()
      expect(notes).toContain('F')  // E# -> F
      expect(notes).toContain('C')  // B# -> C
      expect(notes).toContain('E')  // Fb -> E
      expect(notes).toContain('B')  // Cb -> B
    })

    it('should throw error for truly invalid notes', () => {
      vi.mocked(require('@tonaljs/tonal').Scale.get).mockReturnValue({
        notes: ['InvalidNote']
      })
      vi.mocked(require('@tonaljs/tonal').Note.get).mockReturnValue({ pc: undefined })
      
      expect(() => musicService.getCurrentScaleNotes()).toThrow()
    })
  })
})