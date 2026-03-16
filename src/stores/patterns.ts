import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
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

    // Focused pattern (used by LiveStrip + ActionBar)
    const focusedPatternId = ref<string | null>(null);

    // Working buffer — base notes loaded from a tapped pattern
    const loadedBaseNotes = ref<PatternNote[]>([]);
    const loadedBaseMeta = ref<{
      mode: MusicalMode;
      key: ChromaticNote;
      instrument: string;
    } | null>(null);

    // True immediately after Send, until first new note arrives
    const isStripCleared = ref(false);

    // Getters
    const noteCount = computed(() => loggedNotes.value.length);
    const sessionNotes = computed(() =>
      loggedNotes.value.filter(
        (note) => note.sessionId === currentSessionId.value
      )
    );

    // Current working notes: loggedNotes since last isStartingNewPattern boundary
    const currentWorkingNotes = computed(() => {
      const notes = loggedNotes.value;
      let lastBreak = 0;
      for (let i = notes.length - 1; i >= 0; i--) {
        if (notes[i].isStartingNewPattern) {
          lastBreak = i;
          break;
        }
      }
      return notes.slice(lastBreak);
    });

    const currentSketchMeta = computed(() => {
      return (
        loadedBaseMeta.value ?? {
          mode: musicStore.currentMode as MusicalMode,
          key: musicStore.currentKey as ChromaticNote,
          instrument: instrumentStore.currentInstrument,
        }
      );
    });

    // The active sketch is whatever is currently loaded on the desk plus any
    // newly played notes since that pattern was loaded.
    const currentSketchNotes = computed<PatternNote[]>(() => {
      const liveNotes = currentWorkingNotes.value.map(toPatternNote);
      return [...loadedBaseNotes.value, ...liveNotes];
    });

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

    // Focused pattern derived from id
    const focusedPattern = computed<Pattern | null>(
      () => patterns.value.find((p) => p.id === focusedPatternId.value) ?? null
    );

    // Action to set focused pattern
    function setFocusedPattern(id: string | null): void {
      focusedPatternId.value = id;
    }

    // Auto-focus newest pattern when a new dynamic one arrives
    watch(
      () => dynamicPatterns.value.length,
      () => {
        const last = patterns.value[patterns.value.length - 1];
        if (last) focusedPatternId.value = last.id;
      }
    );

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

    // Convert a LogNote to PatternNote
    function toPatternNote(note: LogNote): PatternNote {
      return {
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
      };
    }

    // Create a Pattern from PatternNote[] + explicit meta
    function createPatternFromNoteSet(
      notes: PatternNote[],
      meta: { mode: MusicalMode; key: ChromaticNote; instrument: string }
    ): Pattern {
      if (notes.length === 0) {
        throw new Error("Cannot create pattern from empty notes array");
      }
      const firstNote = notes[0];
      const lastNote = notes[notes.length - 1];
      return {
        id: `saved-pattern-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        name: `Pattern ${new Date().toLocaleDateString()}`,
        notes,
        duration: lastNote.releaseTime - firstNote.pressTime,
        noteCount: notes.length,
        key: meta.key,
        mode: meta.mode,
        instrument: meta.instrument,
        createdAt: Date.now(),
        isDefault: false,
        isSaved: true,
      };
    }

    // Load a saved pattern as the working base (typewriter desk model)
    function loadPatternAsBase(patternId: string): void {
      const pattern = patterns.value.find((p) => p.id === patternId);
      if (!pattern) return;

      loadedBaseNotes.value = [...pattern.notes];
      loadedBaseMeta.value = {
        mode: pattern.mode,
        key: pattern.key,
        instrument: pattern.instrument,
      };
      isStripCleared.value = false;
      focusedPatternId.value = patternId;

      // Sync the desk to the pattern's musical context
      musicStore.setKey(pattern.key);
      musicStore.setMode(pattern.mode as MusicalMode);
      instrumentStore.setInstrument(pattern.instrument);

      // Create fresh boundary so new live notes start clean after the base
      setNextNoteAsNewPattern();
    }

    // Send the current working buffer as a new saved pattern, then clear the desk
    function sendCurrentPattern(): void {
      const allNotes = currentSketchNotes.value;

      if (allNotes.length > 2) {
        const newPattern = createPatternFromNoteSet(allNotes, currentSketchMeta.value);
        savedPatterns.value.push(newPattern);
        focusedPatternId.value = newPattern.id;
      }

      loadedBaseNotes.value = [];
      loadedBaseMeta.value = null;
      isStripCleared.value = true;
      // Clear logged notes so dynamicPatterns doesn't duplicate saved content
      loggedNotes.value = [];
      forceNextPatternStart.value = false;
    }

    function removeLastFromCurrentSketch(): void {
      if (currentWorkingNotes.value.length > 0) {
        loggedNotes.value = loggedNotes.value.slice(0, -1);
        return;
      }

      if (loadedBaseNotes.value.length > 0) {
        loadedBaseNotes.value = loadedBaseNotes.value.slice(0, -1);
      }
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
        // old notes purged
      }
    }

    // Event handlers
    function handleNotePressed(event: CustomEvent): void {
      if (!isLoggingEnabled.value) return;
      if (event.detail?.source === "strudel-playback") return;

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
      if (event.detail?.source === "strudel-playback") return;

      const { noteId } = event.detail;
      const releaseTime = Date.now();

      // Use noteId directly to find matching pending note
      if (!noteId || !pendingNotes.value.has(noteId)) {
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

      // Clear the strip-cleared flag now that a note has arrived
      isStripCleared.value = false;

      // Reset the force flag after using it
      if (forceNextPatternStart.value) {
        forceNextPatternStart.value = false;
      }

      // Remove from pending
      pendingNotes.value.delete(noteId);

      // Purge old notes after adding new one
      purgeOldNotes();
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
    }

    function clearAllNotes(): void {
      loggedNotes.value = [];
      pendingNotes.value.clear();
    }

    function clearCurrentSession(): void {
      loggedNotes.value = loggedNotes.value.filter(
        (note) => note.sessionId !== currentSessionId.value
      );
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

      // Working buffer state
      loadedBaseNotes,
      loadedBaseMeta,
      isStripCleared,

      // Getters
      noteCount,
      sessionNotes,
      dynamicPatterns,
      patterns,
      currentWorkingNotes,
      currentSketchNotes,
      currentSketchMeta,

      // Focused pattern
      focusedPatternId,
      focusedPattern,
      setFocusedPattern,

      // Working buffer actions
      loadPatternAsBase,
      sendCurrentPattern,
      removeLastFromCurrentSketch,

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
