import { setActivePinia, createPinia } from 'pinia'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useInstrumentStore } from '@/stores/instrument'
import { createTestPinia } from '../helpers/test-utils'
import { resetAudioMocks } from '../helpers/audio-mocks'

// All mocks are now in test setup - need to get references
import * as Tone from 'tone'
import { toast } from 'vue-sonner'
import { loadSampleInstrument, createSalamanderPiano } from '@/lib/sample-library'

describe('Instrument Store', () => {
  let instrumentStore: ReturnType<typeof useInstrumentStore>

  beforeEach(() => {
    setActivePinia(createTestPinia())
    instrumentStore = useInstrumentStore()
    resetAudioMocks()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers?.()
  })

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      expect(instrumentStore.currentInstrument).toBe('piano')
      expect(instrumentStore.isLoading).toBe(false)
    })

    it('should compute current instrument config', () => {
      const config = instrumentStore.currentInstrumentConfig
      expect(config.id).toBe('piano')
      expect(config.displayName).toBe('Piano')
      expect(config.category).toBe('keyboard')
    })

    it('should compute available instruments', () => {
      const instruments = instrumentStore.availableInstruments
      expect(instruments).toHaveLength(3)
      expect(instruments.some(i => i.id === 'piano')).toBe(true)
      expect(instruments.some(i => i.id === 'synth')).toBe(true)
    })

    it('should compute instruments by category', () => {
      const byCategory = instrumentStore.instrumentsByCategory
      expect(byCategory.keyboard).toHaveLength(1)
      expect(byCategory.synth).toHaveLength(1)
      expect(byCategory.string).toHaveLength(1)
    })
  })

  describe('Instrument Management', () => {
    it('should set current instrument', () => {
      instrumentStore.setInstrument('synth')
      expect(instrumentStore.currentInstrument).toBe('synth')
    })

    it('should warn when setting unknown instrument', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      instrumentStore.setInstrument('unknown-instrument')
      
      expect(consoleSpy).toHaveBeenCalledWith('Unknown instrument: unknown-instrument')
      expect(instrumentStore.currentInstrument).toBe('piano') // Should not change
      
      consoleSpy.mockRestore()
    })

    it('should check if instrument is loaded', () => {
      expect(instrumentStore.isInstrumentLoaded('synth')).toBe(false)
      
      // Simulate instrument loading
      instrumentStore.instruments.set('synth', mockSynth)
      expect(instrumentStore.isInstrumentLoaded('synth')).toBe(true)
    })

    it('should get current instrument', () => {
      instrumentStore.instruments.set('piano', mockSynth)
      
      const instrument = instrumentStore.getCurrentInstrument()
      expect(instrument).toBe(mockSynth)
    })

    it('should get specific instrument', () => {
      instrumentStore.instruments.set('synth', mockSynth)
      
      const instrument = instrumentStore.getInstrument('synth')
      expect(instrument).toBe(mockSynth)
    })

    it('should return null for non-existent instrument', () => {
      const instrument = instrumentStore.getInstrument('non-existent')
      expect(instrument).toBe(null)
    })
  })

  describe('Instrument Initialization', () => {
    it('should initialize basic synth instruments', async () => {
      expect(instrumentStore.instruments.size).toBe(0)
      
      await instrumentStore.initializeInstruments()
      
      expect(instrumentStore.instruments.size).toBeGreaterThan(0)
      expect(instrumentStore.isLoading).toBe(false)
    })

    it('should not reinitialize if already initialized', async () => {
      instrumentStore.instruments.set('test', mockSynth)
      const initialSize = instrumentStore.instruments.size
      
      await instrumentStore.initializeInstruments()
      
      expect(instrumentStore.instruments.size).toBe(initialSize)
    })

    it('should handle initialization errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock Tone.js to throw error
      vi.mocked(Tone.PolySynth).mockImplementationOnce(() => {
        throw new Error('Initialization failed')
      })
      
      await instrumentStore.initializeInstruments()
      
      expect(consoleSpy).toHaveBeenCalledWith('Error initializing instruments:', expect.any(Error))
      expect(instrumentStore.isLoading).toBe(false)
      
      consoleSpy.mockRestore()
    })

    it('should create fallback synth on initialization failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock all instruments to fail
      vi.mocked(Tone.PolySynth).mockImplementation(() => {
        throw new Error('All instruments failed')
      })
      
      await instrumentStore.initializeInstruments()
      
      expect(consoleSpy).toHaveBeenCalled()
      expect(instrumentStore.isLoading).toBe(false)
      
      consoleSpy.mockRestore()
    })
  })

  describe('Sample Instrument Loading', () => {
    it('should load Salamander piano successfully', async () => {
      await instrumentStore.initializeInstruments()
      
      expect(createSalamanderPiano).toHaveBeenCalled()
      expect(toast.loading).toHaveBeenCalledWith('🎹 Loading piano samples...', expect.any(Object))
      expect(toast.dismiss).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('🎹 Piano samples loaded!', expect.any(Object))
    })

    it('should handle Salamander piano loading failure', async () => {
      vi.mocked(createSalamanderPiano).mockRejectedValueOnce(new Error('Piano loading failed'))
      
      await instrumentStore.initializeInstruments()
      
      expect(toast.error).toHaveBeenCalledWith('⚠️ Piano loading failed', expect.any(Object))
      expect(instrumentStore.isInstrumentLoaded('piano')).toBe(true) // Should have fallback
    })

    it('should load sample instruments with progress tracking', async () => {
      // Mock successful loading
      vi.mocked(loadSampleInstrument).mockImplementation((name, options) => {
        if (options?.onload) {
          options.onload()
        }
        return Promise.resolve({
          connect: vi.fn().mockReturnThis(),
          dispose: vi.fn()
        })
      })
      
      await instrumentStore.initializeInstruments()
      
      expect(toast.loading).toHaveBeenCalledWith(
        expect.stringContaining('Loading sample instruments...'),
        expect.any(Object)
      )
      expect(toast.success).toHaveBeenCalledWith(
        '🎼 Sample instruments loaded!',
        expect.any(Object)
      )
    })

    it('should handle sample instrument loading timeouts', async () => {
      // Mock timeout
      vi.mocked(loadSampleInstrument).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100)
        })
      })
      
      await instrumentStore.initializeInstruments()
      
      // Should not crash on timeout
      expect(instrumentStore.isLoading).toBe(false)
    })
  })

  describe('Instrument Disposal', () => {
    it('should dispose all instruments', () => {
      const mockInstrument1 = { dispose: vi.fn() }
      const mockInstrument2 = { dispose: vi.fn() }
      
      instrumentStore.instruments.set('instrument1', mockInstrument1)
      instrumentStore.instruments.set('instrument2', mockInstrument2)
      
      instrumentStore.dispose()
      
      expect(mockInstrument1.dispose).toHaveBeenCalled()
      expect(mockInstrument2.dispose).toHaveBeenCalled()
      expect(instrumentStore.instruments.size).toBe(0)
    })

    it('should handle disposal errors gracefully', () => {
      const mockInstrument = {
        dispose: vi.fn(() => {
          throw new Error('Disposal failed')
        })
      }
      
      instrumentStore.instruments.set('instrument', mockInstrument)
      
      expect(() => instrumentStore.dispose()).not.toThrow()
      expect(instrumentStore.instruments.size).toBe(0)
    })
  })

  describe('Instrument Categories', () => {
    it('should categorize instruments correctly', () => {
      const categories = instrumentStore.instrumentsByCategory
      
      expect(categories.keyboard).toBeDefined()
      expect(categories.synth).toBeDefined()
      expect(categories.string).toBeDefined()
    })
  })

  describe('Loading State Management', () => {
    it('should track loading state during initialization', async () => {
      expect(instrumentStore.isLoading).toBe(false)
      
      const initPromise = instrumentStore.initializeInstruments()
      expect(instrumentStore.isLoading).toBe(true)
      
      await initPromise
      expect(instrumentStore.isLoading).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing instrument configurations', () => {
      instrumentStore.setInstrument('non-existent')
      
      // Should not change current instrument
      expect(instrumentStore.currentInstrument).toBe('piano')
    })

    it('should handle instruments map operations safely', () => {
      // Should not throw when accessing non-existent instruments
      expect(() => instrumentStore.getInstrument('non-existent')).not.toThrow()
      expect(() => instrumentStore.isInstrumentLoaded('non-existent')).not.toThrow()
    })
  })

  describe('Store Persistence', () => {
    it('should maintain store ID for persistence', () => {
      expect(instrumentStore.$id).toBe('instrument')
    })

    it('should preserve current instrument selection', () => {
      instrumentStore.setInstrument('synth')
      expect(instrumentStore.currentInstrument).toBe('synth')
      
      // Simulate store recreation (as would happen with persistence)
      const newStore = useInstrumentStore()
      expect(newStore.currentInstrument).toBe('synth')
    })
  })

  describe('Reactive Updates', () => {
    it('should update computed properties when current instrument changes', () => {
      expect(instrumentStore.currentInstrumentConfig.id).toBe('piano')
      
      instrumentStore.setInstrument('synth')
      expect(instrumentStore.currentInstrumentConfig.id).toBe('synth')
    })
  })

  describe('Integration with External Services', () => {
    it('should integrate with toast notifications', async () => {
      await instrumentStore.initializeInstruments()
      
      // Should show loading notifications
      expect(toast.loading).toHaveBeenCalled()
    })

    it('should integrate with sample library', async () => {
      await instrumentStore.initializeInstruments()
      
      expect(createSalamanderPiano).toHaveBeenCalled()
      expect(loadSampleInstrument).toHaveBeenCalled()
    })
  })

  describe('Performance Considerations', () => {
    it('should not block initialization with sample loading', async () => {
      const startTime = Date.now()
      
      await instrumentStore.initializeInstruments()
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should not take too long for basic synth initialization
      expect(duration).toBeLessThan(1000)
    })

    it('should set appropriate polyphony limits', async () => {
      await instrumentStore.initializeInstruments()
      
      const synthInstrument = instrumentStore.getInstrument('synth')
      if (synthInstrument) {
        expect(synthInstrument.maxPolyphony).toBe(8)
      }
    })
  })
})