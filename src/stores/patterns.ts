/**
 * Pattern Store - Pinia Store for Pattern Recording and Management
 * Integrates with PatternService and provides localStorage persistence
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { patternService } from "@/services/patterns";
import type {
  HistoryNote,
  Pattern,
  PatternDetectionConfig,
  PatternSearchOptions,
  PatternStorageStats,
  DEFAULT_PATTERN_CONFIG,
} from "@/types/patterns";
import type { ChromaticNote, MusicalMode, SolfegeData } from "@/types/music";

export const usePatternsStore = defineStore(
  "patterns",
  () => {
    // State - mostly derived from service but stored for reactivity and persistence
    const isInitialized = ref(false);
    const lastPatternDetection = ref<number>(0);
    const sessionStartTime = ref<number>(Date.now());

    // Configuration (persisted)
    const config = ref<PatternDetectionConfig>({
      silenceThreshold: 60000,
      autoPurgeAge: 24 * 60 * 60 * 1000,
      maxHistorySize: 10000,
      minPatternLength: 2,
      maxPatternLength: 50,
      detectOnContextChange: true,
      autoSaveInterestingPatterns: false,
      autoSaveComplexityThreshold: 0.6,
    });

    // Computed getters that pull from service
    const patterns = computed(() => patternService.getPatterns());

    const savedPatterns = computed(() =>
      patternService.getPatterns({
        isSaved: true,
        sortBy: "lastPlayedAt",
        sortDirection: "desc",
      })
    );

    const recentPatterns = computed(() => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      return patternService.getPatterns({
        dateRange: { start: yesterday, end: Date.now() },
        sortBy: "createdAt",
        sortDirection: "desc",
        limit: 10,
      });
    });

    const patternsByKey = computed(() => {
      const byKey: Record<string, Pattern[]> = {};
      const allPatterns = patternService.getPatterns();

      for (const pattern of allPatterns) {
        const key = `${pattern.key} ${pattern.mode}`;
        if (!byKey[key]) byKey[key] = [];
        byKey[key].push(pattern);
      }

      return byKey;
    });

    const patternsByInstrument = computed(() => {
      const byInstrument: Record<string, Pattern[]> = {};
      const allPatterns = patternService.getPatterns();

      for (const pattern of allPatterns) {
        if (!byInstrument[pattern.instrument]) {
          byInstrument[pattern.instrument] = [];
        }
        byInstrument[pattern.instrument].push(pattern);
      }

      return byInstrument;
    });

    const storageStats = computed(() => patternService.getStorageStats());

    const historySize = computed(
      () => patternService.exportData().history.length
    );

    // Actions

    /**
     * Initializes the pattern store and loads persisted data
     */
    async function initialize(): Promise<void> {
      if (isInitialized.value) return;

      console.log("🎵 Initializing Pattern Store...");

      try {
        // Update service configuration
        patternService.updateConfig(config.value);

        // Auto-purge old patterns on initialization
        const purgedCount = patternService.purgeOldPatterns();
        if (purgedCount > 0) {
          console.log(
            `🧹 Auto-purged ${purgedCount} old patterns on initialization`
          );
        }

        // Start new session for this app session
        patternService.startNewSession();
        sessionStartTime.value = Date.now();

        isInitialized.value = true;
        console.log("✅ Pattern Store initialized successfully");
      } catch (error) {
        console.error("❌ Failed to initialize Pattern Store:", error);
        throw error;
      }
    }

    /**
     * Records a note interaction in the pattern history
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

      return patternService.recordNote(noteData);
    }

    /**
     * Updates a note's release timing information
     */
    function updateNoteRelease(noteId: string, releaseTime: number): void {
      patternService.updateNoteRelease(noteId, releaseTime);
    }

    /**
     * Manually triggers pattern detection from current history
     */
    function detectPatterns(): Pattern[] {
      const newPatterns = patternService.detectPatternsFromHistory();
      lastPatternDetection.value = Date.now();

      if (newPatterns.length > 0) {
        console.log(
          `🎯 Pattern detection completed: ${newPatterns.length} new patterns found`
        );
      }

      return newPatterns;
    }

    /**
     * Saves/bookmarks a pattern to prevent auto-deletion
     */
    function savePattern(
      patternId: string,
      name?: string,
      tags?: string[]
    ): boolean {
      const success = patternService.savePattern(patternId, name, tags);
      return success;
    }

    /**
     * Deletes a pattern permanently
     */
    function deletePattern(patternId: string): boolean {
      return patternService.deletePattern(patternId);
    }

    /**
     * Deletes multiple patterns
     */
    function deletePatterns(patternIds: string[]): {
      deleted: number;
      failed: number;
    } {
      let deleted = 0;
      let failed = 0;

      for (const id of patternIds) {
        if (patternService.deletePattern(id)) {
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
     * Manually triggers purge of old unsaved patterns
     */
    function purgeOldPatterns(): number {
      return patternService.purgeOldPatterns();
    }

    /**
     * Searches patterns with filters and sorting
     */
    function searchPatterns(options: PatternSearchOptions): Pattern[] {
      return patternService.getPatterns(options);
    }

    /**
     * Gets a specific pattern by ID
     */
    function getPattern(patternId: string): Pattern | undefined {
      return patternService.getPatterns().find((p) => p.id === patternId);
    }

    /**
     * Updates pattern store configuration
     */
    function updateConfig(newConfig: Partial<PatternDetectionConfig>): void {
      config.value = { ...config.value, ...newConfig };
      patternService.updateConfig(config.value);
      console.log("⚙️ Pattern store config updated:", newConfig);
    }

    /**
     * Starts a new pattern session (resets context)
     */
    function startNewSession(context?: {
      key?: ChromaticNote;
      mode?: MusicalMode;
      instrument?: string;
    }): string {
      const sessionId = patternService.startNewSession(context);
      sessionStartTime.value = Date.now();
      return sessionId;
    }

    /**
     * Exports all pattern data for backup/debugging
     */
    function exportAllData() {
      return patternService.exportData();
    }

    /**
     * Imports pattern data from backup
     */
    function importData(
      data: ReturnType<typeof patternService.exportData>
    ): void {
      patternService.loadData(data);
      console.log("📥 Pattern data imported successfully");
    }

    /**
     * Clears all pattern data (for testing/reset)
     */
    function clearAllData(): void {
      patternService.clearAllData();
      sessionStartTime.value = Date.now();
      lastPatternDetection.value = 0;
      console.log("🧹 All pattern data cleared from store");
    }

    /**
     * Gets patterns for a specific musical key and mode
     */
    function getPatternsForKey(
      key: ChromaticNote,
      mode: MusicalMode
    ): Pattern[] {
      return patternService.getPatterns({
        key,
        mode,
        sortBy: "lastPlayedAt",
        sortDirection: "desc",
      });
    }

    /**
     * Gets patterns for a specific instrument
     */
    function getPatternsForInstrument(instrument: string): Pattern[] {
      return patternService.getPatterns({
        instrument,
        sortBy: "lastPlayedAt",
        sortDirection: "desc",
      });
    }

    /**
     * Gets pattern statistics and insights
     */
    function getPatternInsights(): {
      totalSessions: number;
      averagePatternsPerSession: number;
      mostActiveKey: string;
      mostUsedInstrument: string;
      longestPattern?: Pattern;
      mostComplexPattern?: Pattern;
    } {
      const allPatterns = patternService.getPatterns();
      const stats = storageStats.value;

      // Calculate sessions (simplified - based on session gaps)
      const sessionIds = new Set(
        patternService.exportData().history.map((h) => h.sessionId)
      );
      const totalSessions = sessionIds.size;

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
          current.noteCount > (longest?.noteCount || 0) ? current : longest,
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

    // Return store API
    return {
      // State
      isInitialized,
      config,
      sessionStartTime,
      lastPatternDetection,

      // Computed
      patterns,
      savedPatterns,
      recentPatterns,
      patternsByKey,
      patternsByInstrument,
      storageStats,
      historySize,

      // Actions
      initialize,
      recordNote,
      updateNoteRelease,
      detectPatterns,
      savePattern,
      deletePattern,
      deletePatterns,
      purgeOldPatterns,
      searchPatterns,
      getPattern,
      updateConfig,
      startNewSession,
      exportAllData,
      importData,
      clearAllData,
      getPatternsForKey,
      getPatternsForInstrument,
      getPatternInsights,
    };
  },
  {
    persist: {
      key: "emotitone-patterns",
      storage: localStorage,
      // Only persist configuration and session data, not the full patterns (they're in service)
      pick: ["config", "sessionStartTime", "lastPatternDetection"],
    },
  }
);

// Helper to persist service data (called by the store when patterns change)
export function persistPatternServiceData() {
  try {
    const serviceData = patternService.exportData();
    const serviceDataKey = "emotitone-patterns-service-data";
    localStorage.setItem(serviceDataKey, JSON.stringify(serviceData));
  } catch (error) {
    console.error("❌ Failed to persist pattern service data:", error);
  }
}
