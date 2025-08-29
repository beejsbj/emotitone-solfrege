/**
 * Pattern Debug Utilities
 * Development helpers for monitoring and debugging the pattern recording system
 */

import { patternEngine } from "@/services/PatternEngine";
import { usePatternsStore } from "@/stores/patterns";
import type {
  Pattern,
  HistoryNote,
  PatternStorageStats,
} from "@/types/patterns";

/**
 * Logs a newly detected pattern with formatted output
 */
export function logPatternDetected(pattern: Pattern) {
  console.group(`🎯 New Pattern Detected: ${pattern.id}`);
  console.log(`📊 Basic Info:`);
  console.log(`   Notes: ${pattern.noteCount}`);
  console.log(
    `   Duration: ${((pattern.totalDuration || 0) / 1000).toFixed(1)}s`
  );
  console.log(`   Key: ${pattern.key} ${pattern.mode}`);
  console.log(`   Instrument: ${pattern.instrument}`);
  console.log(`   Type: ${pattern.patternType}`);
  console.log(`   Complexity: ${(pattern.complexityScore || 0).toFixed(2)}`);

  console.log(`\n🎵 Note Sequence:`);
  const noteSequence = pattern.notes
    .map((note) => `${note.solfege.name}(${note.note})`)
    .join(" → ");
  console.log(`   ${noteSequence}`);

  console.log(`\n⏱️ Timing:`);
  console.log(
    `   Created: ${new Date(pattern.createdAt).toLocaleTimeString()}`
  );
  console.log(
    `   Average note duration: ${pattern.averageNoteDuration?.toFixed(0)}ms`
  );

  if (pattern.dominantScaleDegree) {
    console.log(`\n📈 Analysis:`);
    console.log(`   Dominant scale degree: ${pattern.dominantScaleDegree}`);
    console.log(
      `   Detection confidence: ${(pattern.detectionConfidence || 0).toFixed(
        2
      )}`
    );
  }

  console.groupEnd();
}

/**
 * Logs the current state of the history buffer
 */
export function logHistoryState() {
  const data = patternEngine.exportData();
  const stats = patternEngine.getStorageStats();

  console.group("📝 Pattern History State");
  console.log(`📊 Statistics:`);
  console.log(`   History notes: ${data.history.length}`);
  console.log(`   Total patterns: ${stats.totalPatterns}`);
  console.log(`   Saved patterns: ${stats.savedPatterns}`);
  console.log(`   Storage usage: ${(stats.storageUsage / 1024).toFixed(1)} KB`);

  console.log(`\n🎵 Recent History (last 10 notes):`);
  const recentNotes = data.history.slice(-10);
  recentNotes.forEach((note, index) => {
    const timeAgo = Date.now() - note.pressTime;
    console.log(
      `   ${index + 1}. ${note.solfege.name}(${note.note}) - ${
        timeAgo < 60000
          ? Math.floor(timeAgo / 1000) + "s"
          : Math.floor(timeAgo / 60000) + "m"
      } ago`
    );
  });

  if (stats.oldestPattern && stats.newestPattern) {
    console.log(`\n📅 Pattern Age Range:`);
    console.log(`   Oldest: ${new Date(stats.oldestPattern).toLocaleString()}`);
    console.log(`   Newest: ${new Date(stats.newestPattern).toLocaleString()}`);
  }

  console.log(`\n🔄 Current Session:`);
  console.log(`   Session ID: ${data.currentSessionId}`);
  console.log(`   History length: ${data.history.length} notes`);

  console.groupEnd();
}

/**
 * Exports all pattern data as JSON for debugging/backup
 */
export function exportPatternsToJSON(includeHistory = true): string {
  const data = patternEngine.exportData();
  const exportObject = {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    stats: patternEngine.getStorageStats(),
    patterns: data.patterns,
    config: data.config,
    ...(includeHistory && { history: data.history }),
  };

  const jsonString = JSON.stringify(exportObject, null, 2);
  console.log("📥 Pattern data exported to JSON (copy from console)");
  console.log(jsonString);

  return jsonString;
}

/**
 * Imports pattern data from JSON
 */
export function importPatternsFromJSON(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);

    if (!data.patterns || !Array.isArray(data.patterns)) {
      console.error("❌ Invalid JSON format - missing patterns array");
      return false;
    }

    patternEngine.importData({
      patterns: data.patterns,
      history: data.history || [],
      config: data.config,
      currentSessionId: data.currentSessionId,
    });

    // Persist to localStorage via store
    const store = usePatternsStore();
    store.persistData();

    console.log(`✅ Imported ${data.patterns.length} patterns successfully`);
    return true;
  } catch (error) {
    console.error("❌ Failed to import pattern data:", error);
    return false;
  }
}

/**
 * Development utility to clear all pattern data
 */
export function clearAllPatterns(): void {
  const stats = patternEngine.getStorageStats();

  if (
    confirm(
      `⚠️ Clear all pattern data?\n\nThis will delete:\n- ${stats.totalPatterns} patterns\n- ${stats.historySize} history notes\n- All localStorage data\n\nThis action cannot be undone.`
    )
  ) {
    // Use store's clearAllData which handles both engine and localStorage
    const store = usePatternsStore();
    store.clearAllData();

    console.log("🧹 All pattern data cleared");
  } else {
    console.log("❌ Clear operation cancelled");
  }
}

/**
 * Shows pattern insights and analysis
 */
export function showPatternInsights() {
  const patterns = patternEngine.getPatterns();
  const stats = patternEngine.getStorageStats();

  if (patterns.length === 0) {
    console.log("📊 No patterns to analyze yet");
    return;
  }

  console.group("📊 Pattern Analysis & Insights");

  // Basic stats
  console.log(`📈 Overview:`);
  console.log(`   Total patterns: ${stats.totalPatterns}`);
  console.log(`   Saved patterns: ${stats.savedPatterns}`);
  console.log(
    `   Average length: ${stats.averagePatternLength.toFixed(1)} notes`
  );

  // By key analysis
  const byKey = patterns.reduce((acc, pattern) => {
    const key = `${pattern.key} ${pattern.mode}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`\n🎼 Most Active Keys:`);
  Object.entries(byKey)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .forEach(([key, count]) => {
      console.log(`   ${key}: ${count} patterns`);
    });

  // By instrument analysis
  const byInstrument = patterns.reduce((acc, pattern) => {
    const instrument = pattern.instrument || "unknown";
    acc[instrument] = (acc[instrument] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`\n🎹 Instrument Usage:`);
  Object.entries(byInstrument)
    .sort(([, a], [, b]) => b - a)
    .forEach(([instrument, count]) => {
      console.log(`   ${instrument}: ${count} patterns`);
    });

  // Pattern types
  const byType = patterns.reduce((acc, pattern) => {
    acc[pattern.patternType] = (acc[pattern.patternType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`\n🎯 Pattern Types:`);
  Object.entries(byType)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`   ${type}: ${count} patterns`);
    });

  // Complexity analysis
  const complexities = patterns
    .map((p) => p.complexityScore || 0)
    .filter((c) => c > 0);

  if (complexities.length > 0) {
    const avgComplexity =
      complexities.reduce((a, b) => a + b, 0) / complexities.length;
    console.log(`\n🧠 Complexity Analysis:`);
    console.log(`   Average complexity: ${avgComplexity.toFixed(2)}`);
    console.log(`   Most complex: ${Math.max(...complexities).toFixed(2)}`);
    console.log(`   Least complex: ${Math.min(...complexities).toFixed(2)}`);
  }

  // Recent activity
  const recent = patterns.filter(
    (p) => Date.now() - p.createdAt < 24 * 60 * 60 * 1000
  );

  console.log(`\n⏰ Recent Activity (24h):`);
  console.log(`   New patterns: ${recent.length}`);

  if (stats.mostPlayedPattern) {
    console.log(`\n🏆 Most Played Pattern:`);
    console.log(`   ID: ${stats.mostPlayedPattern.id}`);
    console.log(`   Notes: ${stats.mostPlayedPattern.noteCount}`);
    console.log(
      `   Key: ${stats.mostPlayedPattern.key} ${stats.mostPlayedPattern.mode}`
    );
    console.log(`   Play count: ${stats.mostPlayedPattern.playCount}`);
  }

  console.groupEnd();
}

/**
 * Simulates pattern detection for testing
 */
export function triggerPatternDetection(): Pattern[] {
  console.log("🔍 Manually triggering pattern detection...");
  console.log(
    "ℹ️ Note: V2 PatternEngine auto-detects patterns on note recording"
  );
  console.log("📊 Current patterns available:");

  const patterns = patternEngine.getPatterns({
    isDefault: false,
    isSaved: false,
  });
  patterns.forEach((pattern) => logPatternDetected(pattern));

  return patterns;
}

/**
 * Shows current pattern recording configuration
 */
export function showConfig() {
  const data = patternEngine.exportData();

  console.group("⚙️ Pattern Recording Configuration");
  console.log(`🔇 Silence threshold: ${data.config.silenceThreshold}ms`);
  console.log(
    `🧹 Auto-purge age: ${data.config.autoPurgeAge / (60 * 60 * 1000)}h`
  );
  console.log(`📝 Max history size: ${data.config.maxHistorySize}`);
  console.log(`📏 Min pattern length: ${data.config.minPatternLength} notes`);
  console.log(`📏 Max pattern length: ${data.config.maxPatternLength} notes`);
  console.log(
    `🔄 Detect on context change: ${data.config.detectOnContextChange}`
  );
  console.log(
    `💾 Auto-save interesting: ${data.config.autoSaveInterestingPatterns}`
  );
  console.log(
    `🧠 Auto-save threshold: ${data.config.autoSaveComplexityThreshold}`
  );
  console.groupEnd();
}

/**
 * Updates pattern recording configuration
 */
export function updateConfig(
  newConfig: Partial<import("@/types/patterns").PatternDetectionConfig>
) {
  console.log("⚙️ Note: PatternEngine V2 config is set at initialization");
  console.log("⚙️ Config changes should be made through visual config store");
  console.log("⚙️ Current config:", newConfig);
  showConfig();
}

// Development-only window bindings
if (import.meta.env.DEV && typeof window !== "undefined") {
  console.log("🛠️ Pattern debug utilities available on window.patternDebug");
  (window as any).patternDebug = {
    logPatternDetected,
    logHistoryState,
    exportPatternsToJSON,
    importPatternsFromJSON,
    clearAllPatterns,
    showPatternInsights,
    triggerPatternDetection,
    showConfig,
    updateConfig,

    // Quick access helpers
    status: () => logHistoryState(),
    insights: () => showPatternInsights(),
    detect: () => triggerPatternDetection(),
    config: () => showConfig(),
    export: () => exportPatternsToJSON(),
    clear: () => clearAllPatterns(),

    // Engine access
    engine: patternEngine,
    stats: () => patternEngine.getStorageStats(),
    store: () => usePatternsStore(),
  };
}
