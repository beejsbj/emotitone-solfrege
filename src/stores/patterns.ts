import { defineStore } from "pinia";
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";
import { useInstrumentStore } from "@/stores/instrument";
import { defaultPatterns } from "@/data/patterns";
import type {
  LogNote,
  PatternConfig,
  Pattern,
  PatternNote,
} from "@/types/patterns";
import type { ChromaticNote, MusicalMode, SolfegeData } from "@/types/music";

// Default configuration
const DEFAULT_CONFIG: PatternConfig = {
  silenceGapThreshold: 30000, // 30 seconds
  maxRetentionTime: 24 * 60 * 60 * 1000, // 24 hours
};

export const usePatternsStore = defineStore(
  "patterns",
  () => {
    // Get stores for current musical context
    const musicStore = useMusicStore();
    const instrumentStore = useInstrumentStore();

    // State
    const loggedNotes = ref<LogNote[]>([]);
    const currentSessionId = ref<string>(generateSessionId());
    const isLoggingEnabled = ref<boolean>(true);
    const config = ref<PatternConfig>({ ...DEFAULT_CONFIG });

    // Track pending notes (pressed but not yet released)
    const pendingNotes = ref<Map<string, Partial<LogNote>>>(new Map());

    // Pattern variables
    const savedPatterns = ref<Pattern[]>([]);

    // Getters
    const noteCount = computed(() => loggedNotes.value.length);
    const sessionNotes = computed(() =>
      loggedNotes.value.filter(
        (note) => note.sessionId === currentSessionId.value
      )
    );

    // Extract dynamic patterns from logged notes using isStartingNewPattern
    const dynamicPatterns = computed(() => {
      const patterns: Pattern[] = [];
      let currentPatternNotes: LogNote[] = [];

      for (const note of loggedNotes.value) {
        if (note.isStartingNewPattern && currentPatternNotes.length > 0) {
          // Only create pattern if it has more than 2 notes
          if (currentPatternNotes.length > 2) {
            const pattern = createPatternFromNotes(currentPatternNotes);
            patterns.push(pattern);
          }
          currentPatternNotes = [note];
        } else {
          currentPatternNotes.push(note);
        }
      }

      // Add the last pattern if there are remaining notes and it has more than 2 notes
      if (currentPatternNotes.length > 2) {
        const pattern = createPatternFromNotes(currentPatternNotes);
        patterns.push(pattern);
      }

      return patterns;
    });

    // Combined patterns: default + saved + dynamic
    const patterns = computed(() => [
      ...defaultPatterns,
      ...savedPatterns.value,
      ...dynamicPatterns.value,
    ]);

    // Helper functions
    function generateSessionId(): string {
      return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    function generateNoteId(): string {
      return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    function calculateScaleDegree(solfegeIndex: number): number {
      return solfegeIndex + 1; // Scale degree is 1-based
    }

    function calculateScaleIndex(solfegeIndex: number): number {
      return solfegeIndex; // Scale index is 0-based
    }

    // Pattern detection helpers
    function shouldStartNewPattern(
      currentNote: Partial<LogNote>,
      previousNote?: LogNote
    ): boolean {
      // First note always starts a new pattern
      if (!previousNote) {
        return true;
      }

      // Check silence gap - if current note's press time is >= silence gap threshold
      // after the previous note's release time
      const silenceGap = currentNote.pressTime! - previousNote.releaseTime;
      if (silenceGap >= config.value.silenceGapThreshold) {
        return true;
      }

      // Check if key changed
      if (currentNote.key !== previousNote.key) {
        return true;
      }

      // Check if mode changed
      if (currentNote.mode !== previousNote.mode) {
        return true;
      }

      // Check if instrument changed
      if (currentNote.instrument !== previousNote.instrument) {
        return true;
      }

      return false;
    }

    // State for manually forcing next note to start new pattern
    const forceNextPatternStart = ref<boolean>(false);

    // Helper to manually set next note as starting a new pattern
    function setNextNoteAsNewPattern(): void {
      forceNextPatternStart.value = true;
    }

    // Helper to create a Pattern from LogNote array
    function createPatternFromNotes(notes: LogNote[]): Pattern {
      if (notes.length === 0) {
        throw new Error("Cannot create pattern from empty notes array");
      }

      const firstNote = notes[0];
      const lastNote = notes[notes.length - 1];

      // Convert LogNote to PatternNote
      const patternNotes: PatternNote[] = notes.map((note) => ({
        id: note.id,
        note: note.note,
        scaleDegree: note.scaleDegree,
        scaleIndex: note.scaleIndex,
        octave: note.octave,
        frequency: note.frequency,
        velocity: note.velocity,
        pressTime: note.pressTime,
        releaseTime: note.releaseTime,
        duration: note.duration,
      }));

      return {
        id: `dynamic-pattern-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        name: `Pattern ${new Date().toLocaleDateString()}`,
        notes: patternNotes,
        duration: lastNote.releaseTime - firstNote.pressTime,
        noteCount: notes.length,
        key: firstNote.key,
        mode: firstNote.mode,
        instrument: firstNote.instrument,
        createdAt: Date.now(),
        isDefault: false,
        isSaved: false,
      };
    }

    // Purge old notes (older than 24 hours)
    function purgeOldNotes(): void {
      const now = Date.now();
      const cutoffTime = now - config.value.maxRetentionTime;

      const initialCount = loggedNotes.value.length;
      loggedNotes.value = loggedNotes.value.filter(
        (note) => note.pressTime >= cutoffTime
      );

      const purgedCount = initialCount - loggedNotes.value.length;
      if (purgedCount > 0) {
        console.log(`Purged ${purgedCount} old notes from pattern log`);
      }
    }

    // Event handlers
    function handleNotePressed(event: CustomEvent): void {
      if (!isLoggingEnabled.value) return;

      const {
        note,
        frequency,
        noteName,
        solfegeIndex,
        octave,
        noteId,
        instrument,
      } = event.detail;

      // Use noteId directly as the tracking key
      if (!noteId) {
        console.warn("Note played event missing noteId, skipping logging");
        return;
      }

      // Create partial log note for this press
      const partialLogNote: Partial<LogNote> = {
        id: generateNoteId(),
        note: noteName,
        key: musicStore.currentKey as ChromaticNote,
        mode: musicStore.currentMode as MusicalMode,
        scaleDegree: calculateScaleDegree(solfegeIndex),
        scaleIndex: calculateScaleIndex(solfegeIndex),
        solfege: note as SolfegeData,
        octave,
        frequency,
        instrument: instrumentStore.currentInstrument,
        pressTime: Date.now(),
        sessionId: currentSessionId.value,
      };

      // Store as pending until release using noteId
      pendingNotes.value.set(noteId, partialLogNote);
    }

    function handleNoteReleased(event: CustomEvent): void {
      if (!isLoggingEnabled.value) return;

      const { noteId } = event.detail;
      const releaseTime = Date.now();

      // Use noteId directly to find matching pending note
      if (!noteId || !pendingNotes.value.has(noteId)) {
        console.warn(
          "Note released event missing noteId or no matching pending note"
        );
        return;
      }

      const partialNote = pendingNotes.value.get(noteId)!;

      // Get the previous note for pattern detection
      const previousNote =
        loggedNotes.value.length > 0
          ? loggedNotes.value[loggedNotes.value.length - 1]
          : undefined;

      // Determine if this note should start a new pattern
      const isStartingNewPattern =
        forceNextPatternStart.value ||
        shouldStartNewPattern(partialNote, previousNote);

      // Complete the log note
      const completedLogNote: LogNote = {
        ...partialNote,
        releaseTime,
        duration: releaseTime - partialNote.pressTime!,
        isStartingNewPattern,
      } as LogNote;

      // Add to logged notes
      loggedNotes.value.push(completedLogNote);

      // Reset the force flag after using it
      if (forceNextPatternStart.value) {
        forceNextPatternStart.value = false;
      }

      // Remove from pending
      pendingNotes.value.delete(noteId);

      // Purge old notes after adding new one
      purgeOldNotes();

      console.log(loggedNotes.value);
      console.log(patterns.value);
    }

    // Actions
    function enableLogging(): void {
      isLoggingEnabled.value = true;
    }

    function disableLogging(): void {
      isLoggingEnabled.value = false;
    }

    function toggleLogging(): void {
      isLoggingEnabled.value = !isLoggingEnabled.value;
    }

    function startNewSession(): void {
      currentSessionId.value = generateSessionId();
      console.log(
        `Started new pattern logging session: ${currentSessionId.value}`
      );
    }

    function clearAllNotes(): void {
      loggedNotes.value = [];
      pendingNotes.value.clear();
      console.log("Cleared all logged notes");
    }

    function clearCurrentSession(): void {
      loggedNotes.value = loggedNotes.value.filter(
        (note) => note.sessionId !== currentSessionId.value
      );
      console.log(`Cleared notes for session: ${currentSessionId.value}`);
    }

    function updateConfig(newConfig: Partial<PatternConfig>): void {
      config.value = { ...config.value, ...newConfig };
    }

    function resetConfigToDefaults(): void {
      config.value = { ...DEFAULT_CONFIG };
    }

    function exportNotes(): LogNote[] {
      return [...loggedNotes.value];
    }

    function importNotes(notes: LogNote[]): void {
      // Validate and add imported notes
      const validNotes = notes.filter(
        (note) => note.id && note.pressTime && note.releaseTime && note.duration
      );
      loggedNotes.value.push(...validNotes);
      purgeOldNotes();
    }

    // Event listener setup
    let notePlayedListener: EventListener;
    let noteReleasedListener: EventListener;

    function setupEventListeners(): void {
      notePlayedListener = (event: Event) =>
        handleNotePressed(event as CustomEvent);
      noteReleasedListener = (event: Event) =>
        handleNoteReleased(event as CustomEvent);

      window.addEventListener("note-played", notePlayedListener);
      window.addEventListener("note-released", noteReleasedListener);
    }

    function removeEventListeners(): void {
      if (notePlayedListener) {
        window.removeEventListener("note-played", notePlayedListener);
      }
      if (noteReleasedListener) {
        window.removeEventListener("note-released", noteReleasedListener);
      }
    }

    // Initialize event listeners when store is created
    setupEventListeners();

    return {
      // State (raw refs for persistence)
      loggedNotes,
      currentSessionId,
      isLoggingEnabled,
      config,
      savedPatterns,

      // Getters
      noteCount,
      sessionNotes,
      dynamicPatterns,
      patterns,

      // Actions
      enableLogging,
      disableLogging,
      toggleLogging,
      startNewSession,
      clearAllNotes,
      clearCurrentSession,
      updateConfig,
      resetConfigToDefaults,
      exportNotes,
      importNotes,
      purgeOldNotes,

      // Pattern control
      setNextNoteAsNewPattern,

      // Internal methods (exposed for testing/debugging)
      setupEventListeners,
      removeEventListeners,
    };
  },
  {
    persist: true,
  }
);
