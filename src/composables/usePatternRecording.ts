/**
 * Pattern Recording Composable
 * Automatically records note interactions for pattern detection by listening to audio events
 */

import { onMounted, onUnmounted, ref } from 'vue'
import { usePatternsStore, persistPatternServiceData } from '@/stores/patterns'
import type { ChromaticNote, MusicalMode, SolfegeData } from '@/types/music'

interface NotePlayedEventDetail {
  note: SolfegeData
  frequency: number
  noteName: string
  solfegeIndex: number
  octave: number
  noteId?: string
  instrument: string
  instrumentConfig?: any
  velocity?: number
  duration?: string
}

interface NoteReleasedEventDetail {
  note: string  // Solfege name
  noteId: string
  noteName: string
  frequency: number
  octave: number
  instrument: string
}

/**
 * Composable that automatically records musical patterns from note events
 * 
 * This integrates with the existing EmotiTone audio event system to capture
 * every note interaction and build a comprehensive musical history for pattern detection.
 */
export function usePatternRecording() {
  const patternsStore = usePatternsStore()
  
  // State
  const isRecording = ref(false)
  const lastEventTime = ref(0)
  const currentSessionContext = ref<{
    key?: ChromaticNote
    mode?: MusicalMode 
    instrument?: string
  }>({})
  
  // Event listener references for cleanup
  let notePlayedListener: ((event: CustomEvent) => void) | null = null
  let noteReleasedListener: ((event: CustomEvent) => void) | null = null
  let persistTimer: number | null = null

  /**
   * Handles 'note-played' custom events from the music system
   */
  function handleNotePlayedEvent(event: CustomEvent<NotePlayedEventDetail>) {
    if (!isRecording.value) return

    const detail = event.detail
    const now = Date.now()

    try {
      // Extract musical context from event
      const key = extractKeyFromContext() || 'C'
      const mode = extractModeFromContext() || 'major'
      
      // Calculate scale degree from solfege index (1-based)
      const scaleDegree = detail.solfegeIndex + 1

      // Record the note interaction
      const historyNote = patternsStore.recordNote({
        note: detail.noteName,
        key: key as ChromaticNote,
        mode: mode as MusicalMode,
        scaleDegree,
        solfege: detail.note,
        solfegeIndex: detail.solfegeIndex,
        octave: detail.octave,
        frequency: detail.frequency,
        instrument: detail.instrument,
        velocity: detail.velocity,
        audioNoteId: detail.noteId
      })

      // Update session context if it changed
      updateSessionContext(key as ChromaticNote, mode as MusicalMode, detail.instrument)

      lastEventTime.value = now

      console.log(`🎵 Pattern recorded: ${detail.note.name} (${detail.noteName}) in ${key} ${mode}`)
      
      // Schedule persistence (debounced)
      schedulePersistence()
      
    } catch (error) {
      console.error('❌ Error recording note pattern:', error, { detail })
    }
  }

  /**
   * Handles 'note-released' custom events from the music system
   */
  function handleNoteReleasedEvent(event: CustomEvent<NoteReleasedEventDetail>) {
    if (!isRecording.value) return

    const detail = event.detail
    const now = Date.now()

    try {
      // Update the release timing for this note
      if (detail.noteId) {
        patternsStore.updateNoteRelease(detail.noteId, now)
        console.log(`🎵 Note release recorded: ${detail.noteName} (duration updated)`)
      }

      lastEventTime.value = now
      schedulePersistence()
      
      // 🆕 LOG CURRENT PATTERNS AND HISTORY STRUCTURE
      logCurrentPatternState()
      
    } catch (error) {
      console.error('❌ Error recording note release:', error, { detail })
    }
  }

  /**
   * Extracts current musical key from various possible sources
   */
  function extractKeyFromContext(): string | null {
    // Try to get from various potential sources
    
    // 1. Check if we have a music store reference (fallback)
    // Note: Direct import would be better but may cause circular dependencies
    // For now, just use context or fallback

    // 2. Check stored context
    if (currentSessionContext.value.key) {
      return currentSessionContext.value.key
    }

    // 3. Default fallback
    return 'C'
  }

  /**
   * Extracts current musical mode from various possible sources
   */
  function extractModeFromContext(): string | null {
    // Try to get from various potential sources
    
    // 1. Check if we have a music store reference (fallback)
    // Note: Direct import would be better but may cause circular dependencies
    // For now, just use context or fallback

    // 2. Check stored context
    if (currentSessionContext.value.mode) {
      return currentSessionContext.value.mode
    }

    // 3. Default fallback
    return 'major'
  }

  /**
   * Updates the current session context and starts new session if context changed
   */
  function updateSessionContext(key: ChromaticNote, mode: MusicalMode, instrument: string) {
    const previousContext = { ...currentSessionContext.value }
    const newContext = { key, mode, instrument }

    // Check if context has changed significantly
    const contextChanged = (
      previousContext.key !== key ||
      previousContext.mode !== mode ||
      previousContext.instrument !== instrument
    )

    if (contextChanged && (previousContext.key || previousContext.mode || previousContext.instrument)) {
      console.log(`🔄 Musical context changed, starting new pattern session`)
      console.log(`   Previous: ${previousContext.key} ${previousContext.mode} with ${previousContext.instrument}`)
      console.log(`   New: ${key} ${mode} with ${instrument}`)
      
      patternsStore.startNewSession(newContext)
    }

    currentSessionContext.value = newContext
  }

  /**
   * Logs the entire patterns and history arrays for debugging
   */
  function logCurrentPatternState() {
    const exportData = patternsStore.exportAllData()
    const stats = patternsStore.storageStats
    
    console.group('🎵 FULL PATTERN & HISTORY DATA (on note release)')
    
    // Quick summary
    console.log(`📊 Summary: ${exportData.history.length} history notes, ${exportData.patterns.length} patterns, ${stats.savedPatterns} saved`)
    
    // Log entire history array
    console.log('\n📝 ENTIRE HISTORY ARRAY:')
    console.log(exportData.history)
    
    // Log entire patterns array  
    console.log('\n🎯 ENTIRE PATTERNS ARRAY:')
    console.log(exportData.patterns)
    
    console.groupEnd()
  }

  /**
   * Schedules persistence to localStorage (debounced to avoid too frequent writes)
   */
  function schedulePersistence() {
    if (persistTimer) {
      clearTimeout(persistTimer)
    }

    persistTimer = setTimeout(() => {
      persistPatternServiceData()
    }, 2000) as unknown as number // Persist 2 seconds after last activity
  }

  /**
   * Starts pattern recording
   */
  function startRecording() {
    if (isRecording.value) return

    console.log('🎤 Starting pattern recording...')

    // Initialize pattern store
    patternsStore.initialize().catch(error => {
      console.error('❌ Failed to initialize pattern store:', error)
    })

    // Set up event listeners
    notePlayedListener = handleNotePlayedEvent
    noteReleasedListener = handleNoteReleasedEvent

    // Add event listeners to global scope
    if (typeof window !== 'undefined') {
      window.addEventListener('note-played', notePlayedListener as EventListener)
      window.addEventListener('note-released', noteReleasedListener as EventListener)
    }

    isRecording.value = true
    lastEventTime.value = Date.now()

    console.log('✅ Pattern recording started')
  }

  /**
   * Stops pattern recording and cleans up
   */
  function stopRecording() {
    if (!isRecording.value) return

    console.log('🛑 Stopping pattern recording...')

    // Remove event listeners
    if (typeof window !== 'undefined' && notePlayedListener && noteReleasedListener) {
      window.removeEventListener('note-played', notePlayedListener as EventListener)
      window.removeEventListener('note-released', noteReleasedListener as EventListener)
    }

    // Clear timers
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = null
    }

    // Final persistence
    persistPatternServiceData()

    isRecording.value = false
    notePlayedListener = null
    noteReleasedListener = null

    console.log('✅ Pattern recording stopped')
  }

  /**
   * Gets current recording status and statistics
   */
  function getRecordingStatus() {
    return {
      isRecording: isRecording.value,
      lastEventTime: lastEventTime.value,
      timeSinceLastEvent: Date.now() - lastEventTime.value,
      currentContext: currentSessionContext.value,
      historySize: patternsStore.historySize,
      totalPatterns: patternsStore.patterns.length,
      savedPatterns: patternsStore.savedPatterns.length
    }
  }

  /**
   * Manually triggers pattern detection
   */
  function detectPatternsNow() {
    if (!isRecording.value) {
      console.warn('⚠️ Cannot detect patterns - recording not started')
      return []
    }

    console.log('🔍 Manually triggering pattern detection...')
    const newPatterns = patternsStore.detectPatterns()
    
    if (newPatterns.length > 0) {
      persistPatternServiceData() // Persist new patterns immediately
    }
    
    return newPatterns
  }

  // Lifecycle management
  onMounted(() => {
    // Auto-start recording when component mounts
    startRecording()
  })

  onUnmounted(() => {
    // Clean up when component unmounts
    stopRecording()
  })

  // Return composable API
  return {
    // State
    isRecording,
    lastEventTime,
    currentSessionContext,

    // Actions  
    startRecording,
    stopRecording,
    detectPatternsNow,
    getRecordingStatus,

    // Store access
    patterns: patternsStore.patterns,
    savedPatterns: patternsStore.savedPatterns,
    recentPatterns: patternsStore.recentPatterns,
    storageStats: patternsStore.storageStats,

    // Direct store actions
    savePattern: patternsStore.savePattern,
    deletePattern: patternsStore.deletePattern,
    searchPatterns: patternsStore.searchPatterns,
    clearAllData: patternsStore.clearAllData,
    getPatternInsights: patternsStore.getPatternInsights
  }
}
