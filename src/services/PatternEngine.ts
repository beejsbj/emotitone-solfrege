/**
 * Pattern Engine V2 - Core Service
 *
 * The central engine that owns all pattern logic, recording, grouping, and persistence.
 * This replaces the distributed logic across multiple files in V1.
 */

import type {
  HistoryNote,
  Pattern,
  PatternDetectionConfig,
  PatternSearchOptions,
  PatternStorageStats,
  PatternSession,
  DEFAULT_PATTERN_CONFIG,
} from "@/types/patterns";
import type { ChromaticNote, MusicalMode, SolfegeData } from "@/types/music";

// Engine-specific types
export interface NoteRecordingData {
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
}

export interface PatternMetadata {
  name?: string;
  tags?: string[];
  color?: string;
}

export interface SessionContext {
  key?: ChromaticNote;
  mode?: MusicalMode;
  instrument?: string;
}

export interface PatternEngineData {
  history: HistoryNote[];
  patterns: Pattern[];
  sessions: PatternSession[];
  config: PatternDetectionConfig;
  currentSessionId: string;
  version: string;
}

export interface PatternEngineEvents {
  "patterns-changed": Pattern[];
  "history-changed": HistoryNote[];
  "pattern-created": Pattern;
  "pattern-saved": Pattern;
  "session-started": PatternSession;
}

/**
 * Core Pattern Engine - Single source of truth for all pattern logic
 */
export class PatternEngine extends EventTarget {
  private history: HistoryNote[] = [];
  private patterns: Map<string, Pattern> = new Map();
  private sessions: Map<string, PatternSession> = new Map();
  private config: PatternDetectionConfig;
  private currentSessionId: string;
  private defaultPatternsLoaded = false;
  private lastPersistTime = 0;
  private persistDebounceMs = 2000;

  // De-duplication tracking fields
  private lastRecordSig: string | null = null;
  private lastRecordTime = 0;

  constructor(config?: Partial<PatternDetectionConfig>) {
    super();

    this.config = {
      silenceThreshold: 30000, // 30 seconds for musical grouping
      autoPurgeAge: 24 * 60 * 60 * 1000, // 24 hours
      maxHistorySize: 10000,
      minPatternLength: 2, // Minimum 2 notes for a pattern
      maxPatternLength: 50,
      detectOnContextChange: true,
      autoSaveInterestingPatterns: false,
      autoSaveComplexityThreshold: 0.6,
      ...config,
    };

    this.currentSessionId = this.generateId();
    this.startNewSession();

    console.log("🎵 PatternEngine V2 initialized");
  }

  // ============================================================================
  // CORE RECORDING API
  // ============================================================================

  /**
   * Records a new note interaction and immediately updates patterns
   */
  recordNote(noteData: NoteRecordingData): HistoryNote {
    // Compute signature for de-duplication
    const sig = `${noteData.audioNoteId || ""}|${noteData.note}|${
      noteData.key
    }|${noteData.mode}|${noteData.instrument}`;
    const now = Date.now();

    // Check for duplicate within 35ms window
    if (this.lastRecordSig === sig && now - this.lastRecordTime <= 35) {
      // Find the most recent matching HistoryNote
      const lastHistoryNote = this.history[this.history.length - 1];

      if (import.meta.env.DEV) {
        const delta = now - this.lastRecordTime;
        console.log(
          `🔁 Suppressed duplicate note record ${noteData.note} (${noteData.instrument}), dt=${delta}ms`
        );
      }

      // Return the last recorded HistoryNote if it matches, otherwise fall back to current behavior
      if (
        lastHistoryNote &&
        lastHistoryNote.note === noteData.note &&
        lastHistoryNote.key === noteData.key &&
        lastHistoryNote.mode === noteData.mode &&
        lastHistoryNote.instrument === noteData.instrument
      ) {
        return lastHistoryNote;
      }
    }

    const historyNote: HistoryNote = {
      id: this.generateId(),
      ...noteData,
      pressTime: now,
      sessionId: this.currentSessionId,
    };

    // Add to history
    this.history.push(historyNote);

    // Update de-duplication tracking
    this.lastRecordSig = sig;
    this.lastRecordTime = now;

    // Trim history if too large
    this.trimHistoryIfNeeded();

    // Immediately update patterns (this is key for instant UI updates)
    this.updatePatternsFromHistory();

    // Emit events
    this.emit("history-changed", [...this.history]);

    // Debounced persistence
    this.schedulePersistence();

    console.log(
      `🎵 Note recorded: ${noteData.note} (${noteData.solfege.name})`
    );
    return historyNote;
  }

  /**
   * Updates note release timing
   */
  updateNoteRelease(noteId: string, releaseTime: number): void {
    const note = this.history.find(
      (n) => n.audioNoteId === noteId || n.id === noteId
    );
    if (note) {
      note.releaseTime = releaseTime;
      note.duration = releaseTime - note.pressTime;

      // Re-calculate patterns since durations changed
      this.updatePatternsFromHistory();
      this.emit("history-changed", [...this.history]);
      this.schedulePersistence();
    }
  }

  /**
   * NEW: Remove the last note from history (backspace functionality)
   */
  removeLastNote(): HistoryNote | null {
    if (this.history.length === 0) return null;

    const removedNote = this.history.pop()!;

    // Update patterns after removal
    this.updatePatternsFromHistory();
    this.emit("history-changed", [...this.history]);
    this.schedulePersistence();

    console.log(`🎵 Removed last note: ${removedNote.note}`);
    return removedNote;
  }

  // ============================================================================
  // PATTERN MANAGEMENT API
  // ============================================================================

  /**
   * Get all patterns with optional filtering and sorting
   */
  getPatterns(options?: PatternSearchOptions): Pattern[] {
    let patterns = Array.from(this.patterns.values());

    if (!options) return patterns;

    // Apply filters
    if (options.key) {
      patterns = patterns.filter((p) => p.key === options.key);
    }
    if (options.mode) {
      patterns = patterns.filter((p) => p.mode === options.mode);
    }
    if (options.instrument) {
      patterns = patterns.filter((p) => p.instrument === options.instrument);
    }
    if (options.patternType) {
      patterns = patterns.filter((p) => p.patternType === options.patternType);
    }
    if (options.isSaved !== undefined) {
      patterns = patterns.filter((p) => p.isSaved === options.isSaved);
    }
    if (options.isDefault !== undefined) {
      patterns = patterns.filter((p) => p.isDefault === options.isDefault);
    }
    if (options.minPlayCount) {
      patterns = patterns.filter((p) => p.playCount >= options.minPlayCount!);
    }
    if (options.dateRange) {
      patterns = patterns.filter(
        (p) =>
          p.createdAt >= options.dateRange!.start &&
          p.createdAt <= options.dateRange!.end
      );
    }
    if (options.searchText) {
      const search = options.searchText.toLowerCase();
      patterns = patterns.filter(
        (p) =>
          p.name?.toLowerCase().includes(search) ||
          p.tags?.some((tag) => tag.toLowerCase().includes(search))
      );
    }

    // Apply sorting
    if (options.sortBy) {
      const direction = options.sortDirection === "asc" ? 1 : -1;
      patterns.sort((a, b) => {
        const field = options.sortBy!;
        const aVal = a[field] as number;
        const bVal = b[field] as number;
        return (aVal - bVal) * direction;
      });
    }

    // Apply limit
    if (options.limit) {
      patterns = patterns.slice(0, options.limit);
    }

    return patterns;
  }

  /**
   * Get the current pattern being built (last auto-detected pattern)
   */
  getCurrentPattern(): Pattern | null {
    const autoPatterns = this.getPatterns({ isDefault: false, isSaved: false });
    return autoPatterns.length > 0
      ? autoPatterns[autoPatterns.length - 1]
      : null;
  }

  /**
   * Save/bookmark a pattern to prevent auto-deletion
   */
  savePattern(patternId: string, metadata?: PatternMetadata): boolean {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      console.warn(`⚠️ Pattern not found: ${patternId}`);
      return false;
    }

    pattern.isSaved = true;
    pattern.lastPlayedAt = Date.now();
    if (metadata?.name) pattern.name = metadata.name;
    if (metadata?.tags) pattern.tags = metadata.tags;
    if (metadata?.color) pattern.color = metadata.color;

    this.emit("pattern-saved", pattern);
    this.schedulePersistence();

    console.log(
      `💾 Pattern saved: ${patternId} ${
        metadata?.name ? `"${metadata.name}"` : ""
      }`
    );
    return true;
  }

  /**
   * Delete a pattern permanently
   */
  deletePattern(patternId: string): boolean {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      console.warn(`⚠️ Pattern not found for deletion: ${patternId}`);
      return false;
    }

    // Don't allow deletion of default patterns
    if (pattern.isDefault) {
      console.warn(`⚠️ Cannot delete default pattern: ${patternId}`);
      return false;
    }

    const deleted = this.patterns.delete(patternId);
    if (deleted) {
      this.emit("patterns-changed", this.getPatterns());
      this.schedulePersistence();
      console.log(`🗑️ Pattern deleted: ${patternId}`);
    }

    return deleted;
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * Start a new pattern session
   */
  startNewSession(context?: SessionContext): string {
    const previousSessionId = this.currentSessionId;
    this.currentSessionId = this.generateId();

    const session: PatternSession = {
      id: this.currentSessionId,
      startTime: Date.now(),
      initialKey: context?.key || "C",
      initialMode: context?.mode || "major",
      initialInstrument: context?.instrument || "piano",
      noteCount: 0,
      patternIds: [],
    };

    this.sessions.set(this.currentSessionId, session);

    // Finalize previous session if it exists
    if (previousSessionId && this.sessions.has(previousSessionId)) {
      const prevSession = this.sessions.get(previousSessionId)!;
      prevSession.endTime = Date.now();
    }

    this.emit("session-started", session);
    console.log(`📍 New session started: ${this.currentSessionId}`);

    return this.currentSessionId;
  }

  /**
   * Get current session
   */
  getCurrentSession(): PatternSession | null {
    return this.sessions.get(this.currentSessionId) || null;
  }

  // ============================================================================
  // DEFAULT PATTERNS
  // ============================================================================

  /**
   * Load default patterns from the library
   */
  async loadDefaultPatterns(): Promise<void> {
    if (this.defaultPatternsLoaded) {
      console.log("🎵 Default patterns already loaded");
      return;
    }

    try {
      const { defaultPatterns } = await import("@/data/defaultPatterns");

      console.log(`📚 Loading ${defaultPatterns.length} default patterns...`);

      let loadedCount = 0;
      for (const pattern of defaultPatterns) {
        // Create deterministic ID to prevent duplicates
        const deterministicId = `default_${
          pattern.name?.toLowerCase().replace(/\s+/g, "_") || "unnamed"
        }`;

        if (!this.patterns.has(deterministicId)) {
          const patternWithId = {
            ...pattern,
            id: deterministicId,
            createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 1 week ago
            lastPlayedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
            isDefault: true,
            isSaved: true, // Default patterns are always saved
          };
          this.patterns.set(deterministicId, patternWithId);
          loadedCount++;
        }
      }

      this.defaultPatternsLoaded = true;
      this.emit("patterns-changed", this.getPatterns());

      console.log(`📚 Loaded ${loadedCount} default patterns`);
    } catch (error) {
      console.error("❌ Failed to load default patterns:", error);
    }
  }

  // ============================================================================
  // PERSISTENCE & DATA MANAGEMENT
  // ============================================================================

  /**
   * Export all engine data for persistence
   */
  exportData(): PatternEngineData {
    return {
      history: [...this.history],
      patterns: Array.from(this.patterns.values()),
      sessions: Array.from(this.sessions.values()),
      config: { ...this.config },
      currentSessionId: this.currentSessionId,
      version: "2.0.0",
    };
  }

  /**
   * Import data from persistence (with migration support)
   */
  importData(data: Partial<PatternEngineData>): void {
    if (data.history) {
      // Only keep recent history (24 hours)
      const oneDayAgo = Date.now() - this.config.autoPurgeAge;
      this.history = data.history.filter((note) => note.pressTime > oneDayAgo);
      console.log(`📥 Imported ${this.history.length} recent history notes`);
    }

    if (data.patterns) {
      // Import saved patterns and auto-detected patterns
      const importedPatterns = data.patterns.filter(
        (p) => p.isSaved || !p.isDefault
      );
      for (const pattern of importedPatterns) {
        this.patterns.set(pattern.id, pattern);
      }
      console.log(`📥 Imported ${importedPatterns.length} patterns`);
    }

    if (data.sessions) {
      for (const session of data.sessions) {
        this.sessions.set(session.id, session);
      }
    }

    if (data.config) {
      this.config = { ...this.config, ...data.config };
    }

    if (data.currentSessionId) {
      this.currentSessionId = data.currentSessionId;
    }

    // Re-generate patterns from history
    this.updatePatternsFromHistory();

    // Load default patterns
    this.loadDefaultPatterns();
  }

  /**
   * Purge old data according to policy
   */
  purgeOldData(): { patternsRemoved: number; notesRemoved: number } {
    const cutoffTime = Date.now() - this.config.autoPurgeAge;
    let patternsRemoved = 0;
    let notesRemoved = 0;

    // Remove old unsaved patterns
    for (const [id, pattern] of this.patterns) {
      if (
        !pattern.isSaved &&
        !pattern.isDefault &&
        pattern.createdAt < cutoffTime
      ) {
        this.patterns.delete(id);
        patternsRemoved++;
      }
    }

    // Remove old history notes
    const beforeCount = this.history.length;
    this.history = this.history.filter((note) => note.pressTime > cutoffTime);
    notesRemoved = beforeCount - this.history.length;

    if (patternsRemoved > 0 || notesRemoved > 0) {
      console.log(
        `🧹 Purged ${patternsRemoved} old patterns, ${notesRemoved} old notes`
      );
      this.emit("patterns-changed", this.getPatterns());
      this.emit("history-changed", [...this.history]);
    }

    return { patternsRemoved, notesRemoved };
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): PatternStorageStats {
    const patterns = Array.from(this.patterns.values());
    const savedPatterns = patterns.filter((p) => p.isSaved);

    // Estimate storage usage
    const storageUsage = JSON.stringify(this.exportData()).length * 2; // UTF-16 estimate

    return {
      totalPatterns: patterns.length,
      savedPatterns: savedPatterns.length,
      historySize: this.history.length,
      storageUsage,
      oldestPattern:
        patterns.length > 0
          ? Math.min(...patterns.map((p) => p.createdAt))
          : undefined,
      newestPattern:
        patterns.length > 0
          ? Math.max(...patterns.map((p) => p.createdAt))
          : undefined,
      mostPlayedPattern: patterns.reduce(
        (max, p) => (p.playCount > (max?.playCount || 0) ? p : max),
        undefined as Pattern | undefined
      ),
      averagePatternLength:
        patterns.length > 0
          ? patterns.reduce((sum, p) => sum + (p.noteCount || 0), 0) /
            patterns.length
          : 0,
    };
  }

  /**
   * Clear all data (for testing/reset)
   */
  clearAllData(): void {
    this.history = [];
    this.patterns.clear();
    this.sessions.clear();
    this.currentSessionId = this.generateId();
    this.defaultPatternsLoaded = false;

    this.emit("patterns-changed", []);
    this.emit("history-changed", []);

    console.log("🧹 All pattern data cleared");
  }

  // ============================================================================
  // PRIVATE IMPLEMENTATION
  // ============================================================================

  /**
   * Core pattern detection logic - groups history into patterns
   */
  private updatePatternsFromHistory(): void {
    // Remove old auto-detected patterns (keep saved and default)
    for (const [id, pattern] of this.patterns) {
      if (!pattern.isSaved && !pattern.isDefault) {
        this.patterns.delete(id);
      }
    }

    if (this.history.length < this.config.minPatternLength) {
      this.emit("patterns-changed", this.getPatterns());
      return;
    }

    // Group notes into patterns
    const patternGroups = this.groupNotesIntoPatterns();

    for (const group of patternGroups) {
      if (group.length >= this.config.minPatternLength) {
        const pattern = this.createPatternFromNotes(group);
        if (pattern) {
          this.patterns.set(pattern.id, pattern);
          this.emit("pattern-created", pattern);
        }
      }
    }

    this.emit("patterns-changed", this.getPatterns());
  }

  /**
   * Group history notes into potential patterns
   */
  private groupNotesIntoPatterns(): HistoryNote[][] {
    if (this.history.length === 0) return [];

    const groups: HistoryNote[][] = [];
    let currentGroup: HistoryNote[] = [];
    let lastNote: HistoryNote | null = null;

    for (const note of this.history) {
      if (lastNote) {
        const timeSinceLastNote =
          note.pressTime - (lastNote.releaseTime || lastNote.pressTime);
        const contextChanged = this.hasContextChanged(lastNote, note);

        // Start new pattern if silence threshold exceeded or context changed
        if (
          timeSinceLastNote > this.config.silenceThreshold ||
          (contextChanged && this.config.detectOnContextChange)
        ) {
          if (currentGroup.length > 0) {
            groups.push([...currentGroup]);
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

    // Don't forget the last group
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups.filter(
      (group) => group.length >= this.config.minPatternLength
    );
  }

  /**
   * Check if musical context changed between notes
   */
  private hasContextChanged(note1: HistoryNote, note2: HistoryNote): boolean {
    return (
      note1.key !== note2.key ||
      note1.mode !== note2.mode ||
      note1.instrument !== note2.instrument
    );
  }

  /**
   * Create a Pattern from a group of HistoryNotes
   */
  private createPatternFromNotes(notes: HistoryNote[]): Pattern | null {
    if (notes.length === 0) return null;

    const firstNote = notes[0];
    const lastNote = notes[notes.length - 1];

    // Calculate pattern statistics
    const totalDuration =
      (lastNote.releaseTime || lastNote.pressTime) - firstNote.pressTime;
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

    // Classify pattern type
    const patternType = this.classifyPattern(notes, complexityScore);

    const pattern: Pattern = {
      id: this.generateId(),
      notes: [...notes],
      totalDuration,
      noteCount: notes.length,
      key: firstNote.key,
      mode: firstNote.mode,
      instrument: firstNote.instrument,
      createdAt: Date.now(),
      lastPlayedAt: Date.now(),
      isSaved: false,
      isDefault: false,
      playCount: 0,
      averageNoteDuration,
      dominantScaleDegree,
      complexityScore,
      patternType,
      detectionConfidence: Math.min(complexityScore + 0.3, 1.0),
    };

    return pattern;
  }

  /**
   * Classify pattern type based on characteristics
   */
  private classifyPattern(
    notes: HistoryNote[],
    complexityScore: number
  ): Pattern["patternType"] {
    if (notes.length === 1) return "rhythm";

    const uniquePitches = new Set(notes.map((n) => n.note)).size;

    if (uniquePitches === 1) return "rhythm";
    if (this.isChordLike(notes)) return "chord";
    if (this.isScaleLike(notes)) return "scale";
    if (this.isArpeggioLike(notes)) return "arpeggio";
    if (complexityScore > 0.7) return "mixed";

    return "melody";
  }

  private isChordLike(notes: HistoryNote[]): boolean {
    if (notes.length < 3) return false;
    const maxTimeSpan = 1000; // 1 second
    const firstTime = notes[0].pressTime;
    const lastTime = notes[notes.length - 1].pressTime;
    return lastTime - firstTime < maxTimeSpan;
  }

  private isScaleLike(notes: HistoryNote[]): boolean {
    if (notes.length < 4) return false;
    // Check for mostly stepwise motion
    let stepwiseCount = 0;
    for (let i = 1; i < notes.length; i++) {
      const interval = Math.abs(
        notes[i].scaleDegree - notes[i - 1].scaleDegree
      );
      if (interval <= 2) stepwiseCount++;
    }
    return stepwiseCount / (notes.length - 1) > 0.7;
  }

  private isArpeggioLike(notes: HistoryNote[]): boolean {
    if (notes.length < 3) return false;
    // Check for skips (intervals > 2)
    let skipCount = 0;
    for (let i = 1; i < notes.length; i++) {
      const interval = Math.abs(
        notes[i].scaleDegree - notes[i - 1].scaleDegree
      );
      if (interval > 2) skipCount++;
    }
    return skipCount / (notes.length - 1) > 0.5;
  }

  /**
   * Trim history if it exceeds max size
   */
  private trimHistoryIfNeeded(): void {
    if (this.history.length > this.config.maxHistorySize) {
      const excessNotes = this.history.length - this.config.maxHistorySize;
      this.history.splice(0, excessNotes);
      console.log(`📝 Trimmed ${excessNotes} old history notes`);
    }
  }

  /**
   * Schedule debounced persistence
   */
  private schedulePersistence(): void {
    const now = Date.now();
    if (now - this.lastPersistTime > this.persistDebounceMs) {
      this.lastPersistTime = now;
      // Emit event for store to handle persistence
      this.dispatchEvent(new CustomEvent("persist-requested"));
    }
  }

  /**
   * Emit typed events
   */
  private emit<K extends keyof PatternEngineEvents>(
    type: K,
    data: PatternEngineEvents[K]
  ): void {
    this.dispatchEvent(new CustomEvent(type, { detail: data }));
  }

  /**
   * Generate unique IDs
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const patternEngine = new PatternEngine();
