/**
 * Pattern Store V2 - Reactive Wrapper over PatternEngine
 *
 * This store provides reactive Vue 3 computed properties and delegates all logic
 * to the PatternEngine. It handles persistence and maintains backward compatibility.
 */

import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { PatternEngine, patternEngine } from "@/services/PatternEngine";
import type {
  HistoryNote,
  Pattern,
  PatternDetectionConfig,
  PatternSearchOptions,
  PatternStorageStats,
} from "@/types/patterns";
import type { ChromaticNote, MusicalMode, SolfegeData } from "@/types/music";
import type {
  NoteRecordingData,
  PatternMetadata,
  SessionContext,
} from "@/services/PatternEngine";

// Storage keys for persistence
const STORAGE_KEYS = {
  ENGINE_DATA: "emotitone-pattern-engine-v2",
  // Legacy keys for migration
  LEGACY_HISTORY: "emotitone-history",
  LEGACY_PATTERNS: "emotitone-patterns-service-data",
  LEGACY_STORE: "emotitone-patterns",
} as const;

/**
 * V2 Patterns Store - Thin reactive wrapper over PatternEngine
 */
export const usePatternsStore = defineStore("patterns-v2", () => {
  // ========================================================================
  // STATE
  // ========================================================================

  const isInitialized = ref(false);
  const engine = patternEngine; // Use singleton instance

  // ========================================================================
  // REACTIVE COMPUTED PROPERTIES
  // ========================================================================

  // All patterns (reactive to engine changes)
  const patterns = computed(() => engine.getPatterns());

  // Current pattern being built
  const currentPattern = computed(() => engine.getCurrentPattern());

  // Saved patterns (bookmarked by user)
  const savedPatterns = computed(() =>
    engine.getPatterns({ isSaved: true, isDefault: false })
  );

  // Default patterns from library
  const defaultPatterns = computed(() =>
    engine.getPatterns({ isDefault: true })
  );

  // User-created patterns (auto-detected, not default)
  const userPatterns = computed(() => engine.getPatterns({ isDefault: false }));

  // Recent patterns (last 24 hours)
  const recentPatterns = computed(() => {
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    return engine.getPatterns({
      dateRange: { start: yesterday, end: Date.now() },
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 10,
    });
  });

  // Patterns grouped by key/mode
  const patternsByKey = computed(() => {
    const byKey: Record<string, Pattern[]> = {};
    const allPatterns = engine.getPatterns();

    for (const pattern of allPatterns) {
      const key = `${pattern.key} ${pattern.mode}`;
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(pattern);
    }

    return byKey;
  });

  // Patterns grouped by instrument
  const patternsByInstrument = computed(() => {
    const byInstrument: Record<string, Pattern[]> = {};
    const allPatterns = engine.getPatterns();

    for (const pattern of allPatterns) {
      const instrument = pattern.instrument || "unknown";
      if (!byInstrument[instrument]) {
        byInstrument[instrument] = [];
      }
      byInstrument[instrument].push(pattern);
    }

    return byInstrument;
  });

  // Storage statistics
  const storageStats = computed(() => engine.getStorageStats());

  // History size
  const historySize = computed(() => engine.exportData().history.length);

  // Current session
  const currentSession = computed(() => engine.getCurrentSession());

  // ========================================================================
  // ACTIONS (Delegate to Engine)
  // ========================================================================

  /**
   * Initialize the store and engine
   */
  async function initialize(): Promise<void> {
    if (isInitialized.value) return;

    console.log("🎵 Initializing Pattern Store V2...");

    try {
      // Load persisted data
      await loadPersistedData();

      // Load default patterns
      await engine.loadDefaultPatterns();

      // Set up engine event listeners for reactivity
      setupEngineEventListeners();

      // Auto-purge old data
      const purged = engine.purgeOldData();
      if (purged.patternsRemoved > 0 || purged.notesRemoved > 0) {
        console.log(
          `🧹 Auto-purged ${purged.patternsRemoved} patterns, ${purged.notesRemoved} notes`
        );
      }

      isInitialized.value = true;
      console.log("✅ Pattern Store V2 initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Pattern Store V2:", error);
      throw error;
    }
  }

  /**
   * Record a note interaction
   */
  function recordNote(noteData: {
    note: string;
    key: ChromaticNote;
    mode: MusicalMode;
    scaleDegree: number;
    solfege: SolfegeData;
    solfegeIndex: number;
    octave: number;
    frequency: number;
    instrument: string;
    velocity?: number;
    audioNoteId?: string;
  }): HistoryNote {
    if (!isInitialized.value) {
      console.warn("⚠️ Pattern store not initialized, initializing now...");
      initialize();
    }

    return engine.recordNote(noteData);
  }

  /**
   * Update note release timing
   */
  function updateNoteRelease(noteId: string, releaseTime: number): void {
    engine.updateNoteRelease(noteId, releaseTime);
  }

  /**
   * Remove the last note (backspace functionality)
   */
  function removeLastNote(): HistoryNote | null {
    return engine.removeLastNote();
  }

  /**
   * Save/bookmark a pattern
   */
  function savePattern(
    patternId: string,
    name?: string,
    tags?: string[]
  ): boolean {
    const metadata: PatternMetadata = {};
    if (name) metadata.name = name;
    if (tags) metadata.tags = tags;

    return engine.savePattern(patternId, metadata);
  }

  /**
   * Delete a pattern
   */
  function deletePattern(patternId: string): boolean {
    return engine.deletePattern(patternId);
  }

  /**
   * Delete multiple patterns
   */
  function deletePatterns(patternIds: string[]): {
    deleted: number;
    failed: number;
  } {
    let deleted = 0;
    let failed = 0;

    for (const id of patternIds) {
      if (engine.deletePattern(id)) {
        deleted++;
      } else {
        failed++;
      }
    }

    console.log(
      `🗑️ Bulk delete complete: ${deleted} deleted, ${failed} failed`
    );
    return { deleted, failed };
  }

  /**
   * Search patterns with filters
   */
  function searchPatterns(options: PatternSearchOptions): Pattern[] {
    return engine.getPatterns(options);
  }

  /**
   * Get a specific pattern by ID
   */
  function getPattern(patternId: string): Pattern | undefined {
    return engine.getPatterns().find((p) => p.id === patternId);
  }

  /**
   * Start a new pattern session
   */
  function startNewSession(context?: {
    key?: ChromaticNote;
    mode?: MusicalMode;
    instrument?: string;
  }): string {
    return engine.startNewSession(context);
  }

  /**
   * Get patterns for a specific key/mode
   */
  function getPatternsForKey(key: ChromaticNote, mode: MusicalMode): Pattern[] {
    return engine.getPatterns({
      key,
      mode,
      sortBy: "lastPlayedAt",
      sortDirection: "desc",
    });
  }

  /**
   * Get patterns for a specific instrument
   */
  function getPatternsForInstrument(instrument: string): Pattern[] {
    return engine.getPatterns({
      instrument,
      sortBy: "lastPlayedAt",
      sortDirection: "desc",
    });
  }

  /**
   * Export all data for backup/debugging
   */
  function exportAllData() {
    return engine.exportData();
  }

  /**
   * Import data from backup
   */
  function importData(data: any): void {
    engine.importData(data);
  }

  /**
   * Clear all data (for testing/reset)
   */
  function clearAllData(): void {
    engine.clearAllData();

    // Clear localStorage
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });

    console.log("🧹 All pattern data cleared from store and localStorage");
  }

  /**
   * Manually purge old patterns
   */
  function purgeOldPatterns(): number {
    const result = engine.purgeOldData();
    return result.patternsRemoved;
  }

  /**
   * Get pattern insights and statistics
   */
  function getPatternInsights(): {
    totalSessions: number;
    averagePatternsPerSession: number;
    mostActiveKey: string;
    mostUsedInstrument: string;
    longestPattern?: Pattern;
    mostComplexPattern?: Pattern;
  } {
    const allPatterns = engine.getPatterns();
    const stats = storageStats.value;
    const engineData = engine.exportData();

    // Calculate sessions
    const totalSessions = engineData.sessions.length;

    // Most active key
    const keyStats = patternsByKey.value;
    const mostActiveKey = Object.keys(keyStats).reduce(
      (a, b) => (keyStats[a]?.length > keyStats[b]?.length ? a : b),
      Object.keys(keyStats)[0] || "Unknown"
    );

    // Most used instrument
    const instrumentStats = patternsByInstrument.value;
    const mostUsedInstrument = Object.keys(instrumentStats).reduce(
      (a, b) =>
        instrumentStats[a]?.length > instrumentStats[b]?.length ? a : b,
      Object.keys(instrumentStats)[0] || "Unknown"
    );

    // Longest pattern
    const longestPattern = allPatterns.reduce(
      (longest, current) =>
        (current.noteCount || 0) > (longest?.noteCount || 0)
          ? current
          : longest,
      undefined as Pattern | undefined
    );

    // Most complex pattern
    const mostComplexPattern = allPatterns.reduce(
      (complex, current) =>
        (current.complexityScore || 0) > (complex?.complexityScore || 0)
          ? current
          : complex,
      undefined as Pattern | undefined
    );

    return {
      totalSessions,
      averagePatternsPerSession:
        totalSessions > 0 ? allPatterns.length / totalSessions : 0,
      mostActiveKey,
      mostUsedInstrument,
      longestPattern,
      mostComplexPattern,
    };
  }

  // ========================================================================
  // PERSISTENCE
  // ========================================================================

  /**
   * Load persisted data with migration support
   */
  async function loadPersistedData(): Promise<void> {
    try {
      // Try to load V2 data first
      const v2Data = localStorage.getItem(STORAGE_KEYS.ENGINE_DATA);
      if (v2Data) {
        const parsed = JSON.parse(v2Data);
        engine.importData(parsed);
        console.log("📥 Loaded V2 pattern data");
        return;
      }

      // Migrate from V1 if V2 data doesn't exist
      await migrateFromV1();
    } catch (error) {
      console.error("❌ Failed to load persisted data:", error);
      // Continue with empty state
    }
  }

  /**
   * Migrate data from V1 storage format
   */
  async function migrateFromV1(): Promise<void> {
    console.log("🔄 Migrating from V1 pattern data...");

    try {
      // Load V1 history
      const v1History = localStorage.getItem(STORAGE_KEYS.LEGACY_HISTORY);
      const v1Patterns = localStorage.getItem(STORAGE_KEYS.LEGACY_PATTERNS);

      const migrationData: any = {};

      if (v1History) {
        const historyData = JSON.parse(v1History);
        if (Array.isArray(historyData)) {
          // Only keep recent history (24 hours)
          const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
          migrationData.history = historyData.filter(
            (note: any) => note.pressTime > oneDayAgo
          );
          console.log(
            `📥 Migrated ${migrationData.history.length} history notes from V1`
          );
        }
      }

      if (v1Patterns) {
        const patternsData = JSON.parse(v1Patterns);
        if (patternsData.patterns && Array.isArray(patternsData.patterns)) {
          // Only migrate saved patterns (not auto-detected ones)
          migrationData.patterns = patternsData.patterns.filter(
            (p: any) => p.isSaved && !p.isDefault
          );
          console.log(
            `📥 Migrated ${migrationData.patterns.length} saved patterns from V1`
          );
        }
      }

      if (migrationData.history || migrationData.patterns) {
        engine.importData(migrationData);

        // Clean up old keys after successful migration
        localStorage.removeItem(STORAGE_KEYS.LEGACY_HISTORY);
        localStorage.removeItem(STORAGE_KEYS.LEGACY_PATTERNS);
        localStorage.removeItem(STORAGE_KEYS.LEGACY_STORE);

        console.log("✅ V1 to V2 migration completed successfully");
      }
    } catch (error) {
      console.error("❌ V1 migration failed:", error);
    }
  }

  /**
   * Persist engine data to localStorage
   */
  function persistData(): void {
    try {
      const data = engine.exportData();
      localStorage.setItem(STORAGE_KEYS.ENGINE_DATA, JSON.stringify(data));
    } catch (error) {
      console.error("❌ Failed to persist pattern data:", error);
    }
  }

  /**
   * Set up engine event listeners for reactivity and persistence
   */
  function setupEngineEventListeners(): void {
    // Listen for persist requests from engine
    engine.addEventListener("persist-requested", () => {
      persistData();
    });

    // Note: patterns-changed, history-changed events are automatically
    // handled by Vue's reactivity system through computed properties
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  // Auto-persist on page unload
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", persistData);
  }

  // Return store API (maintains backward compatibility)
  return {
    // State
    isInitialized,

    // Reactive computed properties
    patterns,
    currentPattern,
    savedPatterns,
    defaultPatterns,
    userPatterns,
    recentPatterns,
    patternsByKey,
    patternsByInstrument,
    storageStats,
    historySize,
    currentSession,

    // Actions
    initialize,
    recordNote,
    updateNoteRelease,
    removeLastNote, // NEW: Backspace functionality
    savePattern,
    deletePattern,
    deletePatterns,
    searchPatterns,
    getPattern,
    startNewSession,
    getPatternsForKey,
    getPatternsForInstrument,
    exportAllData,
    importData,
    clearAllData,
    purgeOldPatterns,
    getPatternInsights,

    // Persistence (for manual control if needed)
    persistData,
  };
});

// Helper function for backward compatibility
export function persistPatternServiceData() {
  const store = usePatternsStore();
  store.persistData();
}
