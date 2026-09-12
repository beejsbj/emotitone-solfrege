import { setActivePinia, createPinia } from 'pinia'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useVisualConfigStore } from '@/stores/visualConfig'
import { DEFAULT_CONFIG } from '@/data/visual-config-metadata'
import { createTestPinia } from '../helpers/test-utils'
import type { VisualEffectsConfig } from '@/types/visual'

// localStorage is now mocked in test setup
const mockDefaultConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as VisualEffectsConfig

describe('Visual Config Store', () => {
  let visualConfigStore: ReturnType<typeof useVisualConfigStore>

  const createFreshStore = () => {
    setActivePinia(createTestPinia())
    return useVisualConfigStore()
  }

  beforeEach(() => {
    const mockLocalStorage = (window as any).localStorage
    vi.restoreAllMocks()
    const storage = new Map<string, string>()
    mockLocalStorage.getItem.mockReset()
    mockLocalStorage.setItem.mockReset()
    mockLocalStorage.removeItem.mockReset()
    mockLocalStorage.getItem.mockImplementation((key: string) => storage.get(key) || null)
    mockLocalStorage.setItem.mockImplementation((key: string, value: string) => {
      storage.set(key, value)
    })
    mockLocalStorage.removeItem.mockImplementation((key: string) => {
      storage.delete(key)
    })
    visualConfigStore = createFreshStore()
  })

  afterEach(() => {
    vi.clearAllTimers?.()
  })

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      expect(visualConfigStore.config.blobs.isEnabled).toBe(true)
      expect(visualConfigStore.config.ambient.isEnabled).toBe(true)
      expect(visualConfigStore.config.particles.isEnabled).toBe(true)
      expect(visualConfigStore.config.strings.isEnabled).toBe(true)
      expect(visualConfigStore.visualsEnabled).toBe(true)
      expect(visualConfigStore.savedConfigs).toEqual([])
      expect(visualConfigStore.isLoading).toBe(false)
      expect(visualConfigStore.lastSaved).toBe(null)
    })

    it('supports an isolated specimen state without writing production storage', () => {
      vi.useFakeTimers()
      const mockLocalStorage = (window as any).localStorage
      mockLocalStorage.setItem.mockClear()

      try {
        visualConfigStore.useEphemeralDefaults()
        visualConfigStore.updateValue('blobs', 'isEnabled', false)
        visualConfigStore.setVisualsEnabled(false)
        const saved = visualConfigStore.saveConfigAs('Guide draft')
        visualConfigStore.deleteSavedConfig(saved.id)
        visualConfigStore.resetToDefaults()
        visualConfigStore.saveToStorage()
        vi.runAllTimers()

        expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
        expect(visualConfigStore.config.blobs.isEnabled).toBe(true)
        expect(visualConfigStore.visualsEnabled).toBe(true)
        expect(visualConfigStore.savedConfigs).toEqual([])
      } finally {
        vi.useRealTimers()
      }
    })

    it('should load configuration from localStorage on initialization', () => {
      const storedConfig = {
        config: {
          blobs: { isEnabled: false },
          ambient: { isEnabled: false }
        },
        visualsEnabled: false
      }
      
      const mockLocalStorage = (window as any).localStorage
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedConfig))
      
      // Create new store instance to trigger initialization
      const newStore = createFreshStore()
      
      expect(newStore.config.blobs.isEnabled).toBe(false)
      expect(newStore.config.ambient.isEnabled).toBe(false)
      expect(newStore.visualsEnabled).toBe(false)
    })

    it('should migrate legacy color keys from localStorage on initialization', () => {
      const storedConfig = {
        config: {
          dynamicColors: { chromaticMapping: true },
          keyboard: { colorMode: 'glassmorphism' }
        }
      }

      const mockLocalStorage = (window as any).localStorage
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'emotitone-visual-config') {
          return JSON.stringify(storedConfig)
        }
        return null
      })

      const newStore = createFreshStore()

      expect(newStore.config.dynamicColors.musicColorMode).toBe('fixed')
      expect(newStore.config.keyboard.surfaceStyle).toBe('colored')
    })

    it('migrates legacy HSL color intent into the versioned OKLCH recipe', () => {
      localStorage.setItem('emotitone-visual-config', JSON.stringify({
        config: {
          dynamicColors: {
            musicColorMode: 'movable',
            hueAnimationAmplitude: 0,
            animationSpeed: 1.4,
            saturation: 0.4,
            baseLightness: 0.6,
            lightnessRange: 0.35,
          },
        },
      }))

      const store = createFreshStore()

      expect(store.config.dynamicColors).toMatchObject({
        recipeVersion: 1,
        musicColorMode: 'movable-ordinal',
        hueMotionEnabled: false,
        animationSpeed: 1.4,
        lightnessSpan: 0.3,
      })
      expect(store.config.dynamicColors.chroma).toBeCloseTo(0.09)
      expect(store.config.dynamicColors.lightnessCenter).toBeCloseTo(0.675)
      expect(store.config.dynamicColors).not.toHaveProperty('saturation')
      expect(store.config.dynamicColors).not.toHaveProperty('baseLightness')
      expect(store.config.dynamicColors).not.toHaveProperty('lightnessRange')
      expect(store.config.dynamicColors).not.toHaveProperty('hueAnimationAmplitude')
    })

    it('keeps canonical Music Color migration idempotent and bounded', () => {
      const canonical = {
        recipeVersion: 1,
        musicColorMode: 'movable-relative',
        hueMotionEnabled: true,
        animationSpeed: 0.8,
        chroma: 0.22,
        lightnessCenter: 0.6,
        lightnessSpan: 0.4,
      }
      localStorage.setItem('emotitone-visual-config', JSON.stringify({
        config: { dynamicColors: canonical },
      }))

      const store = createFreshStore()
      const once = { ...store.config.dynamicColors }
      store.loadConfigSnapshot(store.getConfigSnapshot())

      expect(store.config.dynamicColors).toEqual(once)
      expect(store.config.dynamicColors).toMatchObject(canonical)
    })

    it('preserves independently configured lightness controls across reload', () => {
      const canonical = {
        recipeVersion: 1,
        musicColorMode: 'fixed',
        hueMotionEnabled: true,
        animationSpeed: 1,
        chroma: 0.18,
        lightnessCenter: 0.2,
        lightnessSpan: 0.6,
      }
      localStorage.setItem('emotitone-visual-config', JSON.stringify({
        config: { dynamicColors: canonical },
      }))

      const store = createFreshStore()

      expect(store.config.dynamicColors).toMatchObject(canonical)
    })

    it('migrates the legacy harmonic section into Blob relationships', () => {
      const mockLocalStorage = (window as any).localStorage
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'emotitone-visual-config') {
          return JSON.stringify({
            config: {
              floatingPopup: {
                isEnabled: true,
                opacity: 0.35,
                accumulationWindow: 120,
                hideDelay: 240,
                animationDuration: 999,
              },
            },
          })
        }
        return null
      })

      const newStore = createFreshStore()

      expect(newStore.config.blobs.connectionMode).toBe('merge')
      expect(newStore.config.blobs.webOpacity).toBe(0.35)
      expect(newStore.config.blobs.labelOpacity).toBe(0.35)
      expect(newStore.config.blobs.analysisHoldTime).toBe(360)
      expect(newStore.config).not.toHaveProperty('floatingPopup')
    })

    it('maps retired harmonic geometry modes onto the two supported modes', () => {
      localStorage.setItem('emotitone-visual-config', JSON.stringify({
        config: {
          floatingPopup: { isEnabled: true, geometryMode: 'outline' }
        }
      }))
      localStorage.setItem('emotitone-saved-configs', JSON.stringify([
        {
          id: 'legacy-center',
          name: 'Legacy Center',
          config: {
            floatingPopup: { isEnabled: true, geometryMode: 'center-only' }
          }
        }
      ]))

      const store = createFreshStore()

      expect(store.config.blobs.connectionMode).toBe('merge')
      expect(store.savedConfigs[0].config.blobs.connectionMode).toBe('web')
      expect(store.importConfig(JSON.stringify({
        config: {
          floatingPopup: { isEnabled: true, geometryMode: 'center-only' }
        }
      }))).toBe(true)
      expect(store.config.blobs.connectionMode).toBe('web')
    })

    it('prefers canonical Blob relationship fields over legacy values', () => {
      localStorage.setItem('emotitone-visual-config', JSON.stringify({
        config: {
          blobs: {
            connectionMode: 'web',
            fusionStrength: 0.8,
            labelOpacity: 0.2,
          },
          floatingPopup: {
            isEnabled: true,
            geometryMode: 'outline',
            glassmorphOpacity: 0.1,
            opacity: 0.65,
          },
        },
      }))

      const store = createFreshStore()

      expect(store.config.blobs.connectionMode).toBe('web')
      expect(store.config.blobs.fusionStrength).toBe(0.8)
      expect(store.config.blobs.labelOpacity).toBe(0.2)
      expect(store.config.blobs.webOpacity).toBe(0.65)
    })

    it('migrates obsolete keyboard presentation controls from saved and imported configs', () => {
      const legacyKeyboard = {
        surfaceStyle: 'glassmorphism', glassmorphOpacity: 0.6,
        keyShape: 14, angledStyle: false, keyboardPadding: true,
      }
      localStorage.setItem('emotitone-visual-config', JSON.stringify({ config: { keyboard: legacyKeyboard } }))
      localStorage.setItem('emotitone-saved-configs', JSON.stringify([
        { id: 'legacy', name: 'Legacy', config: { keyboard: legacyKeyboard } }
      ]))
      const store = createFreshStore()
      const assertMigrated = (keyboard: Record<string, unknown>) => {
        expect(keyboard.surfaceStyle).toBe('colored')
        expect(keyboard.keyboardPadding).toBe(true)
        expect(keyboard).not.toHaveProperty('glassmorphOpacity')
        expect(keyboard).not.toHaveProperty('keyShape')
        expect(keyboard).not.toHaveProperty('angledStyle')
      }
      assertMigrated(store.config.keyboard as unknown as Record<string, unknown>)
      assertMigrated(store.savedConfigs[0].config.keyboard as unknown as Record<string, unknown>)
      expect(store.importConfig(JSON.stringify({ config: { keyboard: legacyKeyboard } }))).toBe(true)
      assertMigrated(store.config.keyboard as unknown as Record<string, unknown>)
      expect(JSON.parse(store.exportConfig()).config.keyboard).not.toHaveProperty('keyShape')
    })

    it('should migrate the legacy liveStrip section into CodeStrip', () => {
      const storedConfig = {
        config: {
          liveStrip: { bpm: 144, notation: 'degree', showRests: false }
        }
      }

      const mockLocalStorage = (window as any).localStorage
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'emotitone-visual-config') {
          return JSON.stringify(storedConfig)
        }
        return null
      })

      const newStore = createFreshStore()

      expect(newStore.config.codeStrip).toMatchObject({
        bpm: 144,
        notation: 'degree',
        showRests: false
      })
      expect('liveStrip' in newStore.config).toBe(false)
    })

    it('migrates only the legacy Beating Shapes enable choice into UIBeat', () => {
      localStorage.setItem('emotitone-visual-config', JSON.stringify({
        config: {
          uiBeat: {},
          beatingShapes: {
            isEnabled: false,
            opacity: 0.92,
            scale: 1.4,
            shapeCount: 9,
            saturation: 100,
            useGlassmorphism: true,
          },
        },
      }))
      localStorage.setItem('emotitone-saved-configs', JSON.stringify([
        {
          id: 'canonical-wins',
          name: 'Canonical UIBeat',
          config: {
            uiBeat: { isEnabled: true },
            beatingShapes: { isEnabled: false },
          },
        },
      ]))

      const store = createFreshStore()

      expect(store.config.uiBeat).toEqual({ isEnabled: false })
      expect(store.config).not.toHaveProperty('beatingShapes')
      expect(store.savedConfigs[0].config.uiBeat).toEqual({ isEnabled: true })
      expect(store.savedConfigs[0].config).not.toHaveProperty('beatingShapes')
      expect(store.importConfig(JSON.stringify({
        config: { beatingShapes: { isEnabled: false, opacity: 0.1 } },
      }))).toBe(true)
      expect(store.config.uiBeat).toEqual({ isEnabled: false })
      expect(JSON.parse(store.exportConfig()).config).not.toHaveProperty('beatingShapes')
      store.resetSection('uiBeat')
      expect(store.config.uiBeat).toEqual({ isEnabled: true })
    })

    it('should drop removed Hilbert keys and default new Hilbert controls', () => {
      const storedConfig = {
        config: {
          hilbertScope: {
            isEnabled: true,
            sizeRatio: 1.2,
            lineWidth: 9,
            minSize: 600,
            maxSize: 1200
          }
        }
      }

      const mockLocalStorage = (window as any).localStorage
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'emotitone-visual-config') {
          return JSON.stringify(storedConfig)
        }
        return null
      })

      const newStore = createFreshStore()
      const hilbertScope = newStore.config.hilbertScope as Record<string, unknown>

      expect(newStore.config.hilbertScope.sizeRatio).toBe(1.2)
      expect(newStore.config.hilbertScope.thickness).toBe(DEFAULT_CONFIG.hilbertScope.thickness)
      expect(newStore.config.hilbertScope.history).toBe(DEFAULT_CONFIG.hilbertScope.history)
      expect(newStore.config.hilbertScope.smear).toBe(DEFAULT_CONFIG.hilbertScope.smear)
      expect('lineWidth' in hilbertScope).toBe(false)
      expect('minSize' in hilbertScope).toBe(false)
      expect('maxSize' in hilbertScope).toBe(false)
    })

    it('should handle malformed localStorage data gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockLocalStorage = (window as any).localStorage
      mockLocalStorage.getItem.mockReturnValue('invalid json')
      
      const newStore = createFreshStore()
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load visual config from localStorage:', expect.any(Error))
      expect(newStore.config.blobs.isEnabled).toBe(true) // Should fallback to defaults
      
      consoleSpy.mockRestore()
    })
  })

  describe('Configuration Updates', () => {
    it('should update specific configuration section', () => {
      visualConfigStore.updateConfig('blobs', {
        isEnabled: false,
        opacity: 0.5
      })
      
      expect(visualConfigStore.config.blobs.isEnabled).toBe(false)
      expect(visualConfigStore.config.blobs.opacity).toBe(0.5)
      expect(visualConfigStore.config.blobs.baseSizeRatio).toBe(mockDefaultConfig.blobs.baseSizeRatio) // Should preserve other values
    })

    it('should update specific value in section', () => {
      visualConfigStore.updateValue('particles', 'count', 50)
      
      expect(visualConfigStore.config.particles.count).toBe(50)
    })

    it('should handle invalid section in updateValue', () => {
      visualConfigStore.updateValue('invalidSection', 'someKey', 'someValue')
      
      // Should not throw error or affect other sections
      expect(visualConfigStore.config.blobs.isEnabled).toBe(true)
    })
  })

  describe('Reset Functionality', () => {
    it('should reset configuration to defaults', () => {
      visualConfigStore.updateConfig('blobs', { isEnabled: false })
      visualConfigStore.updateConfig('keyboard', { rowCount: 7 })
      visualConfigStore.setVisualsEnabled(false)
      
      visualConfigStore.resetToDefaults()
      
      expect(visualConfigStore.config.blobs.isEnabled).toBe(true)
      expect(visualConfigStore.config.keyboard.rowCount).toBe(7)
      expect(visualConfigStore.visualsEnabled).toBe(true)
    })

    it('should reset specific section to defaults', () => {
      visualConfigStore.updateConfig('particles', {
        count: 100,
        speed: 200
      })
      
      visualConfigStore.resetSection('particles')
      
      expect(visualConfigStore.config.particles.count).toBe(mockDefaultConfig.particles.count)
      expect(visualConfigStore.config.particles.speed).toBe(mockDefaultConfig.particles.speed)
    })

    it('keeps Drawer-owned row count when resetting the keyboard section', () => {
      visualConfigStore.updateConfig('keyboard', { rowCount: 7, showLabels: false })

      visualConfigStore.resetSection('keyboard')

      expect(visualConfigStore.config.keyboard.rowCount).toBe(7)
      expect(visualConfigStore.config.keyboard.showLabels).toBe(mockDefaultConfig.keyboard.showLabels)
    })
  })

  describe('Saved Configurations', () => {
    it('should save current config with a name', () => {
      visualConfigStore.updateConfig('blobs', { isEnabled: false })
      
      const savedConfig = visualConfigStore.saveConfigAs('Test Config')
      
      expect(savedConfig.name).toBe('Test Config')
      expect(savedConfig.config.blobs.isEnabled).toBe(false)
      expect(savedConfig.id).toBeDefined()
      expect(savedConfig.createdAt).toBeDefined()
      expect(savedConfig.updatedAt).toBeDefined()
      expect(visualConfigStore.savedConfigs).toContainEqual(savedConfig)
    })

    it('should load saved config', () => {
      const savedConfig = visualConfigStore.saveConfigAs('Test Config')
      
      // Change current config
      visualConfigStore.updateConfig('blobs', { isEnabled: false })
      visualConfigStore.updateConfig('keyboard', { rowCount: 7 })
      
      // Load saved config
      visualConfigStore.loadSavedConfig(savedConfig.id)
      
      expect(visualConfigStore.config.blobs.isEnabled).toBe(true)
      expect(visualConfigStore.config.keyboard.rowCount).toBe(7)
    })

    it('should delete saved config', () => {
      const savedConfig = visualConfigStore.saveConfigAs('Test Config')
      
      expect(visualConfigStore.savedConfigs).toHaveLength(1)
      
      visualConfigStore.deleteSavedConfig(savedConfig.id)
      
      expect(visualConfigStore.savedConfigs).toHaveLength(0)
    })

    it('should handle loading non-existent saved config', () => {
      const originalConfig = visualConfigStore.getConfigSnapshot()
      
      visualConfigStore.loadSavedConfig('non-existent-id')
      
      // Should not change current config
      expect(visualConfigStore.config).toEqual(originalConfig)
    })

    it('should handle deleting non-existent saved config', () => {
      const savedConfig = visualConfigStore.saveConfigAs('Test Config')
      
      visualConfigStore.deleteSavedConfig('non-existent-id')
      
      // Should not affect existing configs
      expect(visualConfigStore.savedConfigs).toHaveLength(1)
      expect(visualConfigStore.savedConfigs[0]).toEqual(savedConfig)
    })
  })

  describe('Visuals Toggle', () => {
    it('should toggle all visuals', () => {
      expect(visualConfigStore.visualsEnabled).toBe(true)
      
      visualConfigStore.toggleAllVisuals()
      expect(visualConfigStore.visualsEnabled).toBe(false)
      
      visualConfigStore.toggleAllVisuals()
      expect(visualConfigStore.visualsEnabled).toBe(true)
    })

    it('should set visuals enabled state', () => {
      visualConfigStore.setVisualsEnabled(false)
      expect(visualConfigStore.visualsEnabled).toBe(false)
      
      visualConfigStore.setVisualsEnabled(true)
      expect(visualConfigStore.visualsEnabled).toBe(true)
    })
  })

  describe('Configuration Snapshots', () => {
    it('should get configuration snapshot', () => {
      const snapshot = visualConfigStore.getConfigSnapshot()
      
      expect(snapshot).toEqual(visualConfigStore.config)
      expect(snapshot).not.toBe(visualConfigStore.config) // Should be a copy
    })

    it('should load configuration from snapshot', () => {
      const originalSnapshot = visualConfigStore.getConfigSnapshot()
      
      visualConfigStore.updateConfig('blobs', { isEnabled: false })
      visualConfigStore.updateConfig('keyboard', { rowCount: 7 })
      
      visualConfigStore.loadConfigSnapshot(originalSnapshot)
      
      expect(visualConfigStore.config.blobs.isEnabled).toBe(true)
      expect(visualConfigStore.config.keyboard.rowCount).toBe(7)
    })
  })

  describe('Import/Export', () => {
    it('should export configuration as JSON', () => {
      const exported = visualConfigStore.exportConfig()
      const parsed = JSON.parse(exported)
      
      expect(parsed.config).toEqual(visualConfigStore.config)
      expect(parsed.visualsEnabled).toBe(visualConfigStore.visualsEnabled)
      expect(parsed.exportedAt).toBeDefined()
      expect(parsed.version).toBe('2.0.0')
    })

    it('should import configuration from JSON', () => {
      const configData = {
        config: {
          ...mockDefaultConfig,
          blobs: { ...mockDefaultConfig.blobs, isEnabled: false },
          keyboard: { ...mockDefaultConfig.keyboard, rowCount: 2 },
        },
        visualsEnabled: false,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      }
      
      const success = visualConfigStore.importConfig(JSON.stringify(configData))
      
      expect(success).toBe(true)
      expect(visualConfigStore.config.blobs.isEnabled).toBe(false)
      expect(visualConfigStore.config.keyboard.rowCount).toBe(mockDefaultConfig.keyboard.rowCount)
      expect(visualConfigStore.visualsEnabled).toBe(false)
    })

    it('should import legacy configuration keys from JSON', () => {
      const configData = {
        config: {
          dynamicColors: { chromaticMapping: true },
          keyboard: { colorMode: 'glassmorphism' }
        },
        visualsEnabled: false,
        exportedAt: new Date().toISOString(),
        version: '0.9.0'
      }

      const success = visualConfigStore.importConfig(JSON.stringify(configData))

      expect(success).toBe(true)
      expect(visualConfigStore.config.dynamicColors.musicColorMode).toBe('fixed')
      expect(visualConfigStore.config.keyboard.surfaceStyle).toBe('colored')
      expect(visualConfigStore.visualsEnabled).toBe(false)
    })

    it('should handle invalid JSON in import', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const success = visualConfigStore.importConfig('invalid json')
      
      expect(success).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to import config:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should handle malformed config in import', () => {
      const success = visualConfigStore.importConfig('{"invalidData": true}')
      
      expect(success).toBe(false)
    })
  })

  describe('Persistence', () => {
    it('should save to localStorage on config changes', async () => {
      vi.useFakeTimers()
      
      visualConfigStore.updateConfig('blobs', { isEnabled: false })
      await nextTick()
      
      // Wait for debounced save
      vi.advanceTimersByTime(500)
      
      const mockLocalStorage = (window as any).localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'emotitone-visual-config',
        expect.stringContaining('"isEnabled":false')
      )
      
      vi.useRealTimers()
    })

    it('should save to localStorage on visuals enabled changes', () => {
      vi.useFakeTimers()
      
      visualConfigStore.setVisualsEnabled(false)
      
      // Wait for debounced save
      vi.advanceTimersByTime(500)
      
      const mockLocalStorage = (window as any).localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'emotitone-visual-config',
        expect.stringContaining('"visualsEnabled":false')
      )
      
      vi.useRealTimers()
    })

    it('should handle localStorage save errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockLocalStorage = (window as any).localStorage
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full')
      })
      
      visualConfigStore.saveToStorage()
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save visual config to localStorage:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should save saved configs to localStorage', () => {
      visualConfigStore.saveConfigAs('Test Config')
      
      const mockLocalStorage = (window as any).localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'emotitone-saved-configs',
        expect.stringContaining('Test Config')
      )
    })

    it('should load saved configs from localStorage', () => {
      const savedConfigs = [
        {
          id: '1',
          name: 'Test Config',
          config: visualConfigStore.config,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
      
      const mockLocalStorage = (window as any).localStorage
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'emotitone-saved-configs') {
          return JSON.stringify(savedConfigs)
        }
        return null
      })
      
      const newStore = createFreshStore()
      
      expect(newStore.savedConfigs).toHaveLength(1)
      expect(newStore.savedConfigs[0].name).toBe('Test Config')
    })

    it('should migrate legacy saved configs from localStorage', () => {
      const savedConfigs = [
        {
          id: '1',
          name: 'Legacy Config',
          config: {
            dynamicColors: { chromaticMapping: true },
            keyboard: { colorMode: 'monochrome' }
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]

      const mockLocalStorage = (window as any).localStorage
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'emotitone-saved-configs') {
          return JSON.stringify(savedConfigs)
        }
        return null
      })

      const newStore = createFreshStore()

      expect(newStore.savedConfigs[0].config.dynamicColors.musicColorMode).toBe('fixed')
      expect(newStore.savedConfigs[0].config.keyboard.surfaceStyle).toBe('monochrome')
    })
  })

  describe('Reactivity', () => {
    it('should trigger reactivity on config updates', () => {
      const configRef = visualConfigStore.config
      let triggered = false
      
      // Simulate watcher
      const stopWatching = vi.fn(() => {
        triggered = true
      })
      
      visualConfigStore.updateConfig('blobs', { isEnabled: false })
      
      expect(configRef.blobs.isEnabled).toBe(false)
    })

    it('should maintain object references for reactive updates', () => {
      const blobsRef = visualConfigStore.config.blobs
      
      visualConfigStore.updateConfig('blobs', { opacity: 0.8 })
      
      expect(visualConfigStore.config.blobs).toBe(blobsRef) // Should be same object
      expect(blobsRef.opacity).toBe(0.8)
    })
  })

  describe('Configuration Validation', () => {
    it('should handle missing configuration sections gracefully', () => {
      const partialConfig = {
        blobs: { isEnabled: false }
        // Missing other sections
      }
      
      const mockLocalStorage = (window as any).localStorage
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ config: partialConfig }))
      
      const newStore = createFreshStore()
      
      expect(newStore.config.blobs.isEnabled).toBe(false)
      expect(newStore.config.particles.isEnabled).toBe(true) // Should use defaults
    })

    it('should preserve type safety in configuration updates', () => {
      // Should not allow invalid types
      visualConfigStore.updateConfig('blobs', {
        isEnabled: false,
        opacity: 0.5
      })
      
      expect(typeof visualConfigStore.config.blobs.isEnabled).toBe('boolean')
      expect(typeof visualConfigStore.config.blobs.opacity).toBe('number')
    })
  })

  describe('Stage appearance', () => {
    it('opts fresh installs into one transient launch Look', () => {
      expect(visualConfigStore.newLookOnLaunch).toBe(true)
      expect(visualConfigStore.transientStageLook).not.toBeNull()
      expect(visualConfigStore.config).toEqual(mockDefaultConfig)
    })

    it('keeps existing users out unless an explicit preference opts in', () => {
      localStorage.setItem('emotitone-visual-config', JSON.stringify({
        config: { hilbertScope: { history: 0.41, smear: 0.67 } },
      }))

      const existingStore = createFreshStore()
      expect(existingStore.newLookOnLaunch).toBe(false)
      expect(existingStore.transientStageLook).toBeNull()
      expect(existingStore.config.hilbertScope).toMatchObject({ history: 0.41, smear: 0.67 })

      localStorage.setItem('emotitone-visual-config', JSON.stringify({
        config: mockDefaultConfig,
        stagePreferences: { newLookOnLaunch: true },
      }))
      const optedInStore = createFreshStore()
      expect(optedInStore.newLookOnLaunch).toBe(true)
      expect(optedInStore.transientStageLook).not.toBeNull()
    })

    it('generates a fresh transient seed on every opted-in reload', () => {
      localStorage.setItem('emotitone-visual-config', JSON.stringify({
        config: mockDefaultConfig,
        stagePreferences: { newLookOnLaunch: true },
      }))
      vi.spyOn(globalThis.crypto, 'randomUUID')
        .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
        .mockReturnValueOnce('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')

      const firstReload = createFreshStore()
      const secondReload = createFreshStore()

      expect(firstReload.transientStageLook?.seed)
        .toBe('11111111-1111-4111-8111-111111111111')
      expect(secondReload.transientStageLook?.seed)
        .toBe('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')
      expect(secondReload.transientStageLook?.patch)
        .not.toEqual(firstReload.transientStageLook?.patch)
      expect(secondReload.config).toEqual(mockDefaultConfig)
    })

    it('does not persist Shuffle output, even after the config debounce', async () => {
      vi.useFakeTimers()
      const mockLocalStorage = (window as any).localStorage
      mockLocalStorage.setItem.mockClear()
      const snapshot = visualConfigStore.getConfigSnapshot()

      visualConfigStore.shuffleStageLook('transient-only')
      await nextTick()
      vi.advanceTimersByTime(500)

      expect(visualConfigStore.config).toEqual(snapshot)
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
      vi.useRealTimers()
    })

    it('keeps manual edits transient until Keep This Look', () => {
      visualConfigStore.clearStageLook()
      const persistedOpacity = visualConfigStore.config.hilbertScope.opacity
      visualConfigStore.shuffleStageLook('editable-look')
      visualConfigStore.updateStageControl('scopeStrength', 0.23)

      expect(visualConfigStore.config.hilbertScope.opacity).toBe(persistedOpacity)
      expect(visualConfigStore.effectiveConfig.hilbertScope.opacity).toBe(0.23)
      expect(visualConfigStore.transientStageLook?.name).toContain('Edited')
    })

    it('materializes only Stage fields when a Look is kept and survives reload', () => {
      visualConfigStore.setNewLookOnLaunch(false)
      const musicColor = { ...visualConfigStore.config.dynamicColors }
      const uiBeat = { ...visualConfigStore.config.uiBeat }
      const keyboard = { ...visualConfigStore.config.keyboard }
      const codeStrip = { ...visualConfigStore.config.codeStrip }

      visualConfigStore.shuffleStageLook('keep-this')
      const expectedOpacity = visualConfigStore.effectiveConfig.hilbertScope.opacity
      expect(visualConfigStore.keepStageLook()).toBe(true)
      expect(visualConfigStore.transientStageLook).toBeNull()
      expect(visualConfigStore.config.hilbertScope.opacity).toBe(expectedOpacity)
      expect(visualConfigStore.config.dynamicColors).toEqual(musicColor)
      expect(visualConfigStore.config.uiBeat).toEqual(uiBeat)
      expect(visualConfigStore.config.keyboard).toEqual(keyboard)
      expect(visualConfigStore.config.codeStrip).toEqual(codeStrip)

      const reloaded = createFreshStore()
      expect(reloaded.transientStageLook).toBeNull()
      expect(reloaded.config.hilbertScope.opacity).toBe(expectedOpacity)
    })

    it('saves the composed Look rather than Stage master suppression', () => {
      visualConfigStore.clearStageLook()
      visualConfigStore.updateStageControl('bodiesVisible', true)
      visualConfigStore.updateStageControl('atmosphereStrength', 0.7)
      visualConfigStore.updateStageControl('stringPresence', 0.8)
      visualConfigStore.updateStageControl('fleckAmount', 12)
      visualConfigStore.updateStageControl('stageEnabled', false)

      expect(visualConfigStore.effectiveConfig.blobs.isEnabled).toBe(false)
      expect(visualConfigStore.effectiveConfig.ambient.isEnabled).toBe(false)
      expect(visualConfigStore.effectiveConfig.strings.isEnabled).toBe(false)
      expect(visualConfigStore.effectiveConfig.particles.isEnabled).toBe(false)

      const saved = visualConfigStore.saveStageLookAs('Stage-off save')
      expect(saved.patch.blobs?.isEnabled).toBe(true)
      expect(saved.patch.ambient?.isEnabled).toBe(true)
      expect(saved.patch.strings?.isEnabled).toBe(true)
      expect(saved.patch.particles?.isEnabled).toBe(true)

      visualConfigStore.updateStageControl('stageEnabled', true)
      visualConfigStore.updateStageControl('bodiesVisible', false)
      visualConfigStore.loadSavedStageLook(saved.id)

      expect(visualConfigStore.effectiveConfig.blobs.isEnabled).toBe(true)
      expect(visualConfigStore.effectiveConfig.ambient.isEnabled).toBe(true)
      expect(visualConfigStore.effectiveConfig.strings.isEnabled).toBe(true)
      expect(visualConfigStore.effectiveConfig.particles.isEnabled).toBe(true)
    })

    it('resets Stage without touching separate systems or legacy saved configs', () => {
      visualConfigStore.updateConfig('dynamicColors', { musicColorMode: 'fixed' })
      visualConfigStore.updateConfig('uiBeat', { isEnabled: false })
      visualConfigStore.updateConfig('keyboard', { mainOctave: 6 })
      const legacy = visualConfigStore.saveConfigAs('Legacy full config')
      visualConfigStore.updateStageControl('scopeStrength', 0.13)

      visualConfigStore.resetStage()

      expect(visualConfigStore.config.hilbertScope.opacity).toBe(DEFAULT_CONFIG.hilbertScope.opacity)
      expect(visualConfigStore.config.dynamicColors.musicColorMode).toBe('fixed')
      expect(visualConfigStore.config.uiBeat.isEnabled).toBe(false)
      expect(visualConfigStore.config.keyboard.mainOctave).toBe(6)
      expect(visualConfigStore.savedConfigs).toContainEqual(legacy)
    })
  })

  describe('Error Handling', () => {
    it('should handle localStorage errors during saved config operations', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockLocalStorage = (window as any).localStorage
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      
      const savedConfig = visualConfigStore.saveConfigAs('Test Config')
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save config to localStorage:', expect.any(Error))
      expect(savedConfig).toBeDefined() // Should still return config object
      
      consoleSpy.mockRestore()
    })

    it('should handle localStorage errors during saved config deletion', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const savedConfig = visualConfigStore.saveConfigAs('Test Config')
      
      const mockLocalStorage = (window as any).localStorage
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      
      visualConfigStore.deleteSavedConfig(savedConfig.id)
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to update saved configs in localStorage:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('Store Persistence', () => {
    it('should have correct store ID', () => {
      expect(visualConfigStore.$id).toBe('visualConfig')
    })

    it('should maintain state across store instances', () => {
      visualConfigStore.updateConfig('blobs', { isEnabled: false })
      
      const newStore = useVisualConfigStore()
      
      expect(newStore.config.blobs.isEnabled).toBe(false)
    })
  })

  describe('Performance Considerations', () => {
    it('should debounce localStorage saves', async () => {
      vi.useFakeTimers()
      const mockLocalStorage = (window as any).localStorage
      
      visualConfigStore.updateConfig('blobs', { isEnabled: false })
      visualConfigStore.updateConfig('particles', { count: 50 })
      await nextTick()
      
      // Should not save immediately
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
      
      // Should save after debounce period
      vi.advanceTimersByTime(500)
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1)
      
      vi.useRealTimers()
    })

    it('should create deep copies for snapshots', () => {
      const snapshot = visualConfigStore.getConfigSnapshot()
      
      visualConfigStore.updateConfig('blobs', { isEnabled: false })
      
      expect(snapshot.blobs.isEnabled).toBe(true) // Should not be affected
    })
  })
})
