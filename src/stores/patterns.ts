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

// Helper function to create a Pattern from HistoryNotes
function createPatternFromNotes(
  notes: HistoryNote[],
  id: string
): Pattern | null {
  if (notes.length === 0) return null;

  const firstNote = notes[0];
  const lastNote = notes[notes.length - 1];

  // Calculate total duration
  const totalDuration =
    (lastNote.releaseTime || lastNote.pressTime) - firstNote.pressTime;

  // Calculate pattern statistics
  const durations = notes
    .map((n) => n.duration)
    .filter((d): d is number => d !== undefined);

  const averageNoteDuration =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : undefined;

  // Find dominant scale degree
  const scaleDegreeCounts = new Map<number, number>();
  notes.forEach((note) => {
    const current = scaleDegreeCounts.get(note.scaleDegree) || 0;
    scaleDegreeCounts.set(note.scaleDegree, current + 1);
  });

  const dominantScaleDegree = Array.from(scaleDegreeCounts.entries()).reduce(
    (a, b) => (b[1] > a[1] ? b : a)
  )[0];

  // Calculate complexity score
  const uniqueNotes = new Set(notes.map((n) => n.note)).size;
  const pitchVariety = uniqueNotes / notes.length;
  const rhythmVariety =
    durations.length > 0
      ? new Set(durations.map((d) => Math.round(d / 100))).size /
        durations.length
      : 0;
  const complexityScore = (pitchVariety + rhythmVariety) / 2;

  // Detect pattern type
  let patternType: Pattern["patternType"] = "melody";
  if (uniqueNotes === 1) patternType = "rhythm";
  else if (notes.length > 2 && lastNote.pressTime - firstNote.pressTime < 1000)
    patternType = "chord";
  else if (complexityScore > 0.7) patternType = "mixed";

  const pattern: Pattern = {
    id,
    notes: [...notes],
    totalDuration,
    noteCount: notes.length,
    key: firstNote.key,
    mode: firstNote.mode,
    instrument: firstNote.instrument,
    createdAt: firstNote.pressTime,
    lastPlayedAt: Date.now(),
    isSaved: false,
    playCount: 0,
    averageNoteDuration,
    dominantScaleDegree,
    complexityScore,
    patternType,
    detectionConfidence: Math.min(complexityScore + 0.3, 1.0),
  };

  return pattern;
}

export const usePatternsStore = defineStore(
  "patterns",
  () => {
    // State - mostly derived from service but stored for reactivity and persistence
    const isInitialized = ref(false);
    const lastPatternDetection = ref<number>(0);
    const sessionStartTime = ref<number>(Date.now());

    // Configuration (persisted)
    const config = ref<PatternDetectionConfig>({
      silenceThreshold: 30000, // 30 seconds is more reasonable for pattern detection
      autoPurgeAge: 24 * 60 * 60 * 1000,
      maxHistorySize: 10000,
      minPatternLength: 3, // At least 3 notes for a pattern
      maxPatternLength: 50,
      detectOnContextChange: true,
      autoSaveInterestingPatterns: false,
      autoSaveComplexityThreshold: 0.6,
    });

    // History notes - this is what needs persistence!
    const historyNotes = ref<HistoryNote[]>([]);

    // Computed: Automatically convert history to patterns based on silence gaps
    // This updates IMMEDIATELY when historyNotes changes - no delays!
    const patterns = computed(() => {
      // ALWAYS get default patterns first
      const defaultPatterns = patternService.getDefaultPatterns();

      // Get saved patterns (user bookmarked patterns)
      const savedUserPatterns = patternService.getPatterns({
        isSaved: true,
        isDefault: false,
      });

      const detectedPatterns: Pattern[] = [];

      // Process history notes into auto-detected patterns
      // This happens instantly whenever historyNotes.value changes
      if (historyNotes.value.length > 0) {
        let currentGroup: HistoryNote[] = [];
        let lastNote: HistoryNote | null = null;
        let patternId = 0;

        // Group history into patterns based on silence threshold
        // The silence threshold is ONLY for grouping, not for delaying display!
        for (const note of historyNotes.value) {
          if (lastNote) {
            const timeSinceLastNote =
              note.pressTime - (lastNote.releaseTime || lastNote.pressTime);
            const contextChanged =
              lastNote.key !== note.key ||
              lastNote.mode !== note.mode ||
              lastNote.instrument !== note.instrument;

            // Start new pattern if silence threshold exceeded or context changed
            if (
              timeSinceLastNote > config.value.silenceThreshold ||
              (contextChanged && config.value.detectOnContextChange)
            ) {
              // Save current group as a pattern if it has enough notes
              if (currentGroup.length >= config.value.minPatternLength) {
                const pattern = createPatternFromNotes(
                  currentGroup,
                  `auto_${Date.now()}_${patternId++}`
                );
                if (pattern) {
                  detectedPatterns.push(pattern);
                }
              }
              currentGroup = [note];
            } else {
              currentGroup.push(note);
            }
          } else {
            currentGroup = [note];
          }
          lastNote = note;
        }

        // Don't forget the last group (currently being played)
        // This ensures the current pattern shows up immediately
        if (currentGroup.length >= config.value.minPatternLength) {
          const pattern = createPatternFromNotes(
            currentGroup,
            `auto_${Date.now()}_${patternId}`
          );
          if (pattern) {
            detectedPatterns.push(pattern);
          }
        }
      }

      // Combine all pattern sources
      // 1. Default patterns (library patterns)
      // 2. Saved user patterns (bookmarked)
      // 3. Auto-detected patterns from current history
      return [...defaultPatterns, ...savedUserPatterns, ...detectedPatterns];
    });

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
        if (!byKey[key]) {
          byKey[key] = [];
        }
        byKey[key]?.push(pattern);
      }

      return byKey;
    });

    const patternsByInstrument = computed(() => {
      const byInstrument: Record<string, Pattern[]> = {};
      const allPatterns = patternService.getPatterns();

      for (const pattern of allPatterns) {
        const instrument = pattern.instrument ?? "unknown";
        if (!byInstrument[instrument]) {
          byInstrument[instrument] = [];
        }
        byInstrument[instrument].push(pattern);
      }

      return byInstrument;
    });

    const storageStats = computed(() => patternService.getStorageStats());

    const historySize = computed(
      () => patternService.exportData().history.length
    );

    // Computed getters for default/user pattern separation
    const defaultPatterns = computed(() => patternService.getDefaultPatterns());

    const userPatterns = computed(() => patternService.getUserPatterns());

    // Actions

    /**
     * Initializes the pattern store and loads persisted data
     */
    async function initialize(): Promise<void> {
      if (isInitialized.value) return;

      console.log("🎵 Initializing Pattern Store...");

      try {
        // Load persisted history from localStorage
        const savedHistory = localStorage.getItem("emotitone-history");
        if (savedHistory) {
          try {
            const parsed = JSON.parse(savedHistory);
            // Only load notes from the last 24 hours
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
            historyNotes.value = parsed.filter(
              (note: HistoryNote) => note.pressTime > oneDayAgo
            );
            console.log(
              `📥 Loaded ${historyNotes.value.length} history notes from last 24 hours`
            );
          } catch (e) {
            console.error("Failed to parse saved history:", e);
            historyNotes.value = [];
          }
        }

        // Update service configuration
        patternService.updateConfig(config.value);

        // Load default patterns (will skip if already loaded)
        await patternService.loadDefaultPatterns();

        // Load any saved user patterns from service
        const savedServiceData = localStorage.getItem(
          "emotitone-patterns-service-data"
        );
        if (savedServiceData) {
          try {
            const data = JSON.parse(savedServiceData);
            // Only load saved patterns, not history (we handle that separately)
            if (data.patterns) {
              const savedPatterns = data.patterns.filter(
                (p: Pattern) => p.isSaved && !p.isDefault
              );
              patternService.loadData({ patterns: savedPatterns });
              console.log(
                `📥 Loaded ${savedPatterns.length} saved user patterns`
              );
            }
          } catch (e) {
            console.error("Failed to load saved patterns:", e);
          }
        }

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

      // Create the history note
      const historyNote: HistoryNote = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...noteData,
        pressTime: Date.now(),
        sessionId: sessionStartTime.value.toString(),
      };

      // Add to our reactive history array - this triggers immediate pattern update!
      historyNotes.value.push(historyNote);

      // Persist to localStorage immediately
      persistHistory();

      // Clean up old notes (older than 24 hours)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const beforeCleanup = historyNotes.value.length;
      historyNotes.value = historyNotes.value.filter(
        (note) => note.pressTime > oneDayAgo
      );
      if (beforeCleanup > historyNotes.value.length) {
        console.log(
          `🧹 Cleaned ${
            beforeCleanup - historyNotes.value.length
          } old notes (>24h)`
        );
        persistHistory();
      }

      return historyNote;
    }

    /**
     * Updates a note's release timing information
     */
    function updateNoteRelease(noteId: string, releaseTime: number): void {
      // Update in our history array
      const note = historyNotes.value.find(
        (n) => n.audioNoteId === noteId || n.id === noteId
      );
      if (note) {
        note.releaseTime = releaseTime;
        note.duration = releaseTime - note.pressTime;
        // Persist the update
        persistHistory();
      }
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
      return {
        history: [...historyNotes.value],
        patterns: [...patterns.value],
        config: { ...config.value },
        currentSessionId: String(sessionStartTime.value),
        lastNoteTime:
          historyNotes.value.length > 0
            ? Math.max(...historyNotes.value.map((h) => h.pressTime))
            : 0,
      };
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
      historyNotes.value = [];
      patternService.clearAllData();
      sessionStartTime.value = Date.now();
      lastPatternDetection.value = 0;
      localStorage.removeItem("emotitone-history");
      localStorage.removeItem("emotitone-patterns-service-data");
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
     * Persists history to localStorage
     */
    function persistHistory(): void {
      try {
        // Only keep last 24 hours of history
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const recentHistory = historyNotes.value.filter(
          (note) => note.pressTime > oneDayAgo
        );
        localStorage.setItem(
          "emotitone-history",
          JSON.stringify(recentHistory)
        );
      } catch (error) {
        console.error("Failed to persist history:", error);
      }
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
          (current.noteCount ?? 0) > (longest?.noteCount ?? 0)
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

    // Return store API
    return {
      // State
      isInitialized,
      config,
      sessionStartTime,
      lastPatternDetection,
      historyNotes, // Expose for debugging

      // Computed
      patterns,
      savedPatterns,
      recentPatterns,
      defaultPatterns,
      userPatterns,
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
      persistHistory,
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
