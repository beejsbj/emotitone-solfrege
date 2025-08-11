import { setActivePinia, createPinia } from 'pinia'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useVisualConfigStore } from '@/stores/visualConfig'
import { createTestPinia } from '../helpers/test-utils'
import type { VisualEffectsConfig } from '@/types/visual'

// localStorage is now mocked in test setup

describe('Visual Config Store', () => {
  let visualConfigStore: ReturnType<typeof useVisualConfigStore>

  beforeEach(() => {
    setActivePinia(createTestPinia())
    visualConfigStore = useVisualConfigStore()
    vi.clearAllMocks()
    
    // Reset localStorage mock
    const mockLocalStorage = (window as any).localStorage
    mockLocalStorage.getItem.mockReturnValue(null)
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
      expect(visualConfigStore.config.beatingShapes.isEnabled).toBe(true)
      expect(visualConfigStore.visualsEnabled).toBe(true)
      expect(visualConfigStore.savedConfigs).toEqual([])
      expect(visualConfigStore.isLoading).toBe(false)
      expect(visualConfigStore.lastSaved).toBe(null)
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
      const newStore = useVisualConfigStore()
      
      expect(newStore.config.blobs.isEnabled).toBe(false)
      expect(newStore.config.ambient.isEnabled).toBe(false)
      expect(newStore.visualsEnabled).toBe(false)
    })

    it('should handle malformed localStorage data gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockLocalStorage = (window as any).localStorage
      mockLocalStorage.getItem.mockReturnValue('invalid json')
      
      const newStore = useVisualConfigStore()
      
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
      expect(visualConfigStore.config.blobs.baseSizeRatio).toBe(0.15) // Should preserve other values
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
      visualConfigStore.setVisualsEnabled(false)
      
      visualConfigStore.resetToDefaults()
      
      expect(visualConfigStore.config.blobs.isEnabled).toBe(true)
      expect(visualConfigStore.visualsEnabled).toBe(true)
    })

    it('should reset specific section to defaults', () => {
      visualConfigStore.updateConfig('particles', {
        count: 100,
        speed: 200
      })
      
      visualConfigStore.resetSection('particles')
      
      expect(visualConfigStore.config.particles.count).toBe(20)
      expect(visualConfigStore.config.particles.speed).toBe(100)
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
      expect(visualConfigStore.savedConfigs).toContain(savedConfig)
    })

    it('should load saved config', () => {
      const savedConfig = visualConfigStore.saveConfigAs('Test Config')
      
      // Change current config
      visualConfigStore.updateConfig('blobs', { isEnabled: false })
      
      // Load saved config
      visualConfigStore.loadSavedConfig(savedConfig.id)
      
      expect(visualConfigStore.config.blobs.isEnabled).toBe(true)
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
      expect(visualConfigStore.savedConfigs[0]).toBe(savedConfig)
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
      
      visualConfigStore.loadConfigSnapshot(originalSnapshot)
      
      expect(visualConfigStore.config.blobs.isEnabled).toBe(true)
    })
  })

  describe('Import/Export', () => {
    it('should export configuration as JSON', () => {
      const exported = visualConfigStore.exportConfig()
      const parsed = JSON.parse(exported)
      
      expect(parsed.config).toEqual(visualConfigStore.config)
      expect(parsed.visualsEnabled).toBe(visualConfigStore.visualsEnabled)
      expect(parsed.exportedAt).toBeDefined()
      expect(parsed.version).toBe('1.0.0')
    })

    it('should import configuration from JSON', () => {
      const configData = {
        config: {
          ...mockDefaultConfig,
          blobs: { ...mockDefaultConfig.blobs, isEnabled: false }
        },
        visualsEnabled: false,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      }
      
      const success = visualConfigStore.importConfig(JSON.stringify(configData))
      
      expect(success).toBe(true)
      expect(visualConfigStore.config.blobs.isEnabled).toBe(false)
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
    it('should save to localStorage on config changes', () => {
      vi.useFakeTimers()
      
      visualConfigStore.updateConfig('blobs', { isEnabled: false })
      
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
      
      const newStore = useVisualConfigStore()
      
      expect(newStore.savedConfigs).toHaveLength(1)
      expect(newStore.savedConfigs[0].name).toBe('Test Config')
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
      
      const newStore = useVisualConfigStore()
      
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
    it('should debounce localStorage saves', () => {
      vi.useFakeTimers()
      
      visualConfigStore.updateConfig('blobs', { isEnabled: false })
      visualConfigStore.updateConfig('particles', { count: 50 })
      
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