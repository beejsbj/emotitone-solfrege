/**
 * Pattern Recording Composable V2
 *
 * Simplified composable that integrates with the V2 PatternEngine via the store.
 * Handles audio event integration and provides reactive access to patterns.
 */

import { onMounted, onUnmounted, ref, computed } from "vue";
import { usePatternsStore } from "@/stores/patterns";
import type { ChromaticNote, MusicalMode, SolfegeData } from "@/types/music";

interface NotePlayedEventDetail {
  note: SolfegeData;
  frequency: number;
  noteName: string;
  solfegeIndex: number;
  octave: number;
  noteId?: string;
  instrument: string;
  instrumentConfig?: any;
  velocity?: number;
  duration?: string;
}

interface NoteReleasedEventDetail {
  note: string; // Solfege name
  noteId: string;
  noteName: string;
  frequency: number;
  octave: number;
  instrument: string;
}

/**
 * Composable for automatic pattern recording from audio events
 *
 * V2 Changes:
 * - Simplified to delegate all logic to PatternEngine via store
 * - Removed duplicated pattern detection logic
 * - Added backspace functionality
 * - Improved session context management
 * - Debounced persistence handled by engine
 */
export function usePatternRecording() {
  const patternsStore = usePatternsStore();

  // ========================================================================
  // STATE
  // ========================================================================

  const isRecording = ref(false);
  const lastEventTime = ref(0);
  const currentSessionContext = ref<{
    key?: ChromaticNote;
    mode?: MusicalMode;
    instrument?: string;
  }>({});

  // Event listener references for cleanup
  let notePlayedListener: ((event: CustomEvent) => void) | null = null;
  let noteReleasedListener: ((event: CustomEvent) => void) | null = null;

  // ========================================================================
  // REACTIVE COMPUTED PROPERTIES
  // ========================================================================

  // Expose store's reactive properties
  const patterns = computed(() => patternsStore.patterns);
  const currentPattern = computed(() => patternsStore.currentPattern);
  const savedPatterns = computed(() => patternsStore.savedPatterns);
  const defaultPatterns = computed(() => patternsStore.defaultPatterns);
  const storageStats = computed(() => patternsStore.storageStats);
  const currentSession = computed(() => patternsStore.currentSession);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  /**
   * Handle 'note-played' events from the audio system
   */
  function handleNotePlayedEvent(event: CustomEvent<NotePlayedEventDetail>) {
    if (!isRecording.value) return;

    const detail = event.detail;
    const now = Date.now();

    try {
      // Extract musical context
      const key = extractKeyFromContext() || "C";
      const mode = extractModeFromContext() || "major";

      // Calculate scale degree (1-based)
      const scaleDegree = detail.solfegeIndex + 1;

      // Record the note via store (which delegates to engine)
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
        audioNoteId: detail.noteId,
      });

      // Update session context if changed
      updateSessionContext(
        key as ChromaticNote,
        mode as MusicalMode,
        detail.instrument
      );

      lastEventTime.value = now;

      console.log(
        `🎵 Pattern recorded: ${detail.note.name} (${detail.noteName}) in ${key} ${mode}`
      );
    } catch (error) {
      console.error("❌ Error recording note pattern:", error, { detail });
    }
  }

  /**
   * Handle 'note-released' events from the audio system
   */
  function handleNoteReleasedEvent(
    event: CustomEvent<NoteReleasedEventDetail>
  ) {
    if (!isRecording.value) return;

    const detail = event.detail;
    const now = Date.now();

    try {
      // Update release timing via store
      if (detail.noteId) {
        patternsStore.updateNoteRelease(detail.noteId, now);
        console.log(`🎵 Note release recorded: ${detail.noteName}`);
      }

      lastEventTime.value = now;
    } catch (error) {
      console.error("❌ Error recording note release:", error, { detail });
    }
  }

  // ========================================================================
  // CONTEXT MANAGEMENT
  // ========================================================================

  /**
   * Extract current musical key from context
   * TODO: This could be improved by directly accessing music store
   */
  function extractKeyFromContext(): string | null {
    // Check stored context first
    if (currentSessionContext.value.key) {
      return currentSessionContext.value.key;
    }

    // Default fallback
    return "C";
  }

  /**
   * Extract current musical mode from context
   * TODO: This could be improved by directly accessing music store
   */
  function extractModeFromContext(): string | null {
    // Check stored context first
    if (currentSessionContext.value.mode) {
      return currentSessionContext.value.mode;
    }

    // Default fallback
    return "major";
  }

  /**
   * Update session context and start new session if context changed
   */
  function updateSessionContext(
    key: ChromaticNote,
    mode: MusicalMode,
    instrument: string
  ) {
    const previousContext = { ...currentSessionContext.value };
    const newContext = { key, mode, instrument };

    // Check if context changed significantly
    const contextChanged =
      previousContext.key !== key ||
      previousContext.mode !== mode ||
      previousContext.instrument !== instrument;

    if (
      contextChanged &&
      (previousContext.key ||
        previousContext.mode ||
        previousContext.instrument)
    ) {
      console.log(`🔄 Musical context changed, starting new pattern session`);
      console.log(
        `   Previous: ${previousContext.key} ${previousContext.mode} with ${previousContext.instrument}`
      );
      console.log(`   New: ${key} ${mode} with ${instrument}`);

      // Start new session via store
      patternsStore.startNewSession(newContext);
    }

    currentSessionContext.value = newContext;
  }

  // ========================================================================
  // ACTIONS
  // ========================================================================

  /**
   * Start pattern recording
   */
  function startRecording() {
    if (isRecording.value) return;

    console.log("🎤 Starting pattern recording V2...");

    // Initialize store
    patternsStore.initialize().catch((error) => {
      console.error("❌ Failed to initialize pattern store:", error);
    });

    // Set up event listeners
    notePlayedListener = handleNotePlayedEvent;
    noteReleasedListener = handleNoteReleasedEvent;

    // Add event listeners to global scope
    if (typeof window !== "undefined") {
      window.addEventListener(
        "note-played",
        notePlayedListener as EventListener
      );
      window.addEventListener(
        "note-released",
        noteReleasedListener as EventListener
      );
    }

    isRecording.value = true;
    lastEventTime.value = Date.now();

    console.log("✅ Pattern recording V2 started");
  }

  /**
   * Stop pattern recording
   */
  function stopRecording() {
    if (!isRecording.value) return;

    console.log("🛑 Stopping pattern recording V2...");

    // Remove event listeners
    if (
      typeof window !== "undefined" &&
      notePlayedListener &&
      noteReleasedListener
    ) {
      window.removeEventListener(
        "note-played",
        notePlayedListener as EventListener
      );
      window.removeEventListener(
        "note-released",
        noteReleasedListener as EventListener
      );
    }

    // Final persistence is handled automatically by the engine

    isRecording.value = false;
    notePlayedListener = null;
    noteReleasedListener = null;

    console.log("✅ Pattern recording V2 stopped");
  }

  /**
   * Remove the last note (backspace functionality)
   */
  function removeLastNote(): boolean {
    if (!isRecording.value) {
      console.warn("⚠️ Cannot remove note - recording not active");
      return false;
    }

    const removedNote = patternsStore.removeLastNote();
    if (removedNote) {
      console.log(`🎵 Removed last note: ${removedNote.note}`);
      return true;
    }

    return false;
  }

  /**
   * Save/bookmark a pattern
   */
  function savePattern(
    patternId: string,
    name?: string,
    tags?: string[]
  ): boolean {
    return patternsStore.savePattern(patternId, name, tags);
  }

  /**
   * Delete a pattern
   */
  function deletePattern(patternId: string): boolean {
    return patternsStore.deletePattern(patternId);
  }

  /**
   * Search patterns
   */
  function searchPatterns(options: any) {
    return patternsStore.searchPatterns(options);
  }

  /**
   * Clear all pattern data
   */
  function clearAllData(): void {
    patternsStore.clearAllData();
  }

  /**
   * Get recording status and statistics
   */
  function getRecordingStatus() {
    return {
      isRecording: isRecording.value,
      lastEventTime: lastEventTime.value,
      timeSinceLastEvent: Date.now() - lastEventTime.value,
      currentContext: currentSessionContext.value,
      historySize: patternsStore.historySize,
      totalPatterns: patternsStore.patterns.length,
      savedPatterns: patternsStore.savedPatterns.length,
      currentPattern: patternsStore.currentPattern,
      currentSession: patternsStore.currentSession,
    };
  }

  /**
   * Get pattern insights
   */
  function getPatternInsights() {
    return patternsStore.getPatternInsights();
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  onMounted(() => {
    // Auto-start recording when component mounts
    startRecording();
  });

  onUnmounted(() => {
    // Clean up when component unmounts
    stopRecording();
  });

  // ========================================================================
  // RETURN API
  // ========================================================================

  return {
    // State
    isRecording,
    lastEventTime,
    currentSessionContext,

    // Reactive computed properties
    patterns,
    currentPattern,
    savedPatterns,
    defaultPatterns,
    storageStats,
    currentSession,

    // Actions
    startRecording,
    stopRecording,
    removeLastNote, // NEW: Backspace functionality
    savePattern,
    deletePattern,
    searchPatterns,
    clearAllData,
    getRecordingStatus,
    getPatternInsights,

    // Context management
    updateSessionContext,
  };
}
