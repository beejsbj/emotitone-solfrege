/**
 * Pattern Detection Service
 * Handles automatic pattern detection, history recording, and pattern management
 */

import type {
  HistoryNote,
  Pattern,
  PatternDetectionConfig,
  PatternSearchOptions,
  PatternStorageStats,
  PatternSession,
  DEFAULT_PATTERN_CONFIG
} from '@/types/patterns'
import type { ChromaticNote, MusicalMode, SolfegeData } from '@/types/music'

/**
 * Generates unique IDs for patterns and notes
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Manages recording and analyzing musical patterns from user interactions
 */
export class PatternService {
  private history: HistoryNote[] = []
  private patterns: Map<string, Pattern> = new Map()
  private config: PatternDetectionConfig
  private currentSessionId: string = generateId()
  private lastNoteTime: number = 0
  private silenceTimer: number | null = null

  constructor(config?: Partial<PatternDetectionConfig>) {
    // Import default config - handle async import safely
    this.config = {
      silenceThreshold: 30000, // 30 seconds - much more musical
      autoPurgeAge: 24 * 60 * 60 * 1000,
      maxHistorySize: 10000,
      minPatternLength: 3, // Minimum 3 notes
      maxPatternLength: 50,
      detectOnContextChange: true,
      autoSaveInterestingPatterns: false, // Disabled by default
      autoSaveComplexityThreshold: 0.6,
      ...config
    }

    console.log('🎵 Pattern Service initialized with config:', this.config)
  }

  /**
   * Records a new note interaction in the history
   */
  recordNote(noteData: {
    note: string
    key: ChromaticNote
    mode: MusicalMode
    scaleDegree: number
    solfege: SolfegeData
    solfegeIndex: number
    octave: number
    frequency: number
    instrument: string
    velocity?: number
    audioNoteId?: string
  }): HistoryNote {
    const now = Date.now()
    
    const historyNote: HistoryNote = {
      id: generateId(),
      ...noteData,
      pressTime: now,
      sessionId: this.currentSessionId,
    }

    // Add to history
    this.history.push(historyNote)
    this.lastNoteTime = now

    // Trim history if it's getting too large
    if (this.history.length > this.config.maxHistorySize) {
      const excessNotes = this.history.length - this.config.maxHistorySize
      this.history.splice(0, excessNotes)
      console.log(`📝 Trimmed ${excessNotes} old history notes (max: ${this.config.maxHistorySize})`)
    }

    console.log(`🎵 Recorded note: ${noteData.note} (${noteData.solfege.name}) in ${noteData.key} ${noteData.mode}`)

    // Reset silence timer
    this.resetSilenceTimer()

    return historyNote
  }

  /**
   * Updates a history note with release information
   */
  updateNoteRelease(noteId: string, releaseTime: number): void {
    const note = this.history.find(n => n.audioNoteId === noteId || n.id === noteId)
    if (note) {
      note.releaseTime = releaseTime
      note.duration = releaseTime - note.pressTime
      console.log(`🎵 Updated note release: ${note.note} (duration: ${note.duration}ms)`)
    }
  }

  /**
   * Starts a new session (resets session ID)
   */
  startNewSession(context?: {
    key?: ChromaticNote
    mode?: MusicalMode
    instrument?: string
  }): string {
    const oldSessionId = this.currentSessionId
    this.currentSessionId = generateId()
    
    console.log(`📍 New session started: ${this.currentSessionId}`)
    console.log(`📍 Previous session: ${oldSessionId}`)
    
    if (context) {
      console.log(`📍 Session context: ${context.key} ${context.mode} with ${context.instrument}`)
    }

    // Trigger pattern detection for any remaining notes from previous session
    if (this.shouldDetectPatterns()) {
      this.detectPatternsFromHistory()
    }

    return this.currentSessionId
  }

  /**
   * Main pattern detection logic
   */
  detectPatternsFromHistory(): Pattern[] {
    const newPatterns: Pattern[] = []

    if (this.history.length < this.config.minPatternLength) {
      console.log(`📊 History too short for pattern detection (${this.history.length} < ${this.config.minPatternLength})`)
      return newPatterns
    }

    // Group notes into potential patterns based on silence gaps and context changes
    const patternGroups = this.groupNotesIntoPatterns()

    console.log(`📊 Detected ${patternGroups.length} potential pattern groups`)

    for (const group of patternGroups) {
      if (group.length >= this.config.minPatternLength) {
        const pattern = this.createPatternFromNotes(group)
        if (pattern) {
          this.patterns.set(pattern.id, pattern)
          newPatterns.push(pattern)
          
          console.log(`🎯 New pattern detected:`)
          console.log(`   ID: ${pattern.id}`)
          console.log(`   Notes: ${pattern.noteCount}`)
          console.log(`   Duration: ${(pattern.totalDuration / 1000).toFixed(1)}s`)
          console.log(`   Key: ${pattern.key} ${pattern.mode}`)
          console.log(`   Instrument: ${pattern.instrument}`)
          console.log(`   Type: ${pattern.patternType}`)
          console.log(`   Notes: ${group.map(n => `${n.solfege.name}(${n.note})`).join(' → ')}`)
        }
      }
    }

    return newPatterns
  }

  /**
   * Groups history notes into potential patterns based on silence and context changes
   */
  private groupNotesIntoPatterns(): HistoryNote[][] {
    if (this.history.length === 0) return []

    const groups: HistoryNote[][] = []
    let currentGroup: HistoryNote[] = []
    let lastNote: HistoryNote | null = null

    for (const note of this.history) {
      if (lastNote) {
        const timeSinceLastNote = note.pressTime - (lastNote.releaseTime || lastNote.pressTime)
        const contextChanged = this.hasContextChanged(lastNote, note)

        // Start new pattern if silence threshold exceeded or context changed
        if (timeSinceLastNote > this.config.silenceThreshold || 
            (contextChanged && this.config.detectOnContextChange)) {
          
          if (currentGroup.length > 0) {
            groups.push([...currentGroup])
            console.log(`📊 Pattern boundary detected: ${contextChanged ? 'context change' : 'silence'} (${timeSinceLastNote}ms gap)`)
          }
          currentGroup = [note]
        } else {
          currentGroup.push(note)
        }
      } else {
        currentGroup = [note]
      }

      lastNote = note
    }

    // Don't forget the last group
    if (currentGroup.length > 0) {
      groups.push(currentGroup)
    }

    return groups.filter(group => group.length >= this.config.minPatternLength)
  }

  /**
   * Checks if musical context has changed between two notes
   */
  private hasContextChanged(note1: HistoryNote, note2: HistoryNote): boolean {
    return note1.key !== note2.key ||
           note1.mode !== note2.mode ||
           note1.instrument !== note2.instrument
  }

  /**
   * Creates a Pattern object from a group of HistoryNotes
   */
  private createPatternFromNotes(notes: HistoryNote[]): Pattern | null {
    if (notes.length === 0) return null

    const firstNote = notes[0]
    const lastNote = notes[notes.length - 1]
    
    // Calculate total duration
    const totalDuration = (lastNote.releaseTime || lastNote.pressTime) - firstNote.pressTime

    // Calculate pattern statistics
    const durations = notes
      .map(n => n.duration)
      .filter((d): d is number => d !== undefined)
    
    const averageNoteDuration = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : undefined

    // Find dominant scale degree
    const scaleDegreeCounts = new Map<number, number>()
    notes.forEach(note => {
      const current = scaleDegreeCounts.get(note.scaleDegree) || 0
      scaleDegreeCounts.set(note.scaleDegree, current + 1)
    })
    
    const dominantScaleDegree = Array.from(scaleDegreeCounts.entries())
      .reduce((a, b) => b[1] > a[1] ? b : a)[0]

    // Calculate complexity score (simplified)
    const uniqueNotes = new Set(notes.map(n => n.note)).size
    const pitchVariety = uniqueNotes / notes.length
    const rhythmVariety = durations.length > 0 
      ? new Set(durations.map(d => Math.round(d / 100))).size / durations.length 
      : 0
    const complexityScore = (pitchVariety + rhythmVariety) / 2

    // Detect pattern type (simplified classification)
    const patternType = this.classifyPattern(notes, complexityScore)

    const pattern: Pattern = {
      id: generateId(),
      notes: [...notes],
      totalDuration,
      noteCount: notes.length,
      key: firstNote.key,
      mode: firstNote.mode,
      instrument: firstNote.instrument,
      createdAt: Date.now(),
      lastPlayedAt: Date.now(),
      isSaved: false,
      playCount: 0,
      averageNoteDuration,
      dominantScaleDegree,
      complexityScore,
      patternType,
      detectionConfidence: Math.min(complexityScore + 0.3, 1.0) // Simple confidence metric
    }

    return pattern
  }

  /**
   * Simple pattern classification based on note characteristics
   */
  private classifyPattern(notes: HistoryNote[], complexityScore: number): Pattern['patternType'] {
    if (notes.length === 1) return 'rhythm'

    const uniquePitches = new Set(notes.map(n => n.note)).size
    const isMonotonic = this.isMonotonicSequence(notes)
    
    // Simple heuristics
    if (uniquePitches === 1) return 'rhythm'
    if (uniquePitches === notes.length && isMonotonic) return 'scale'
    if (this.isArpeggioLike(notes)) return 'arpeggio'
    if (this.isChordLike(notes)) return 'chord'
    if (complexityScore > 0.7) return 'mixed'
    
    return 'melody'
  }

  private isMonotonicSequence(notes: HistoryNote[]): boolean {
    for (let i = 1; i < notes.length; i++) {
      if (notes[i].scaleDegree < notes[i-1].scaleDegree) return false
    }
    return true
  }

  private isArpeggioLike(notes: HistoryNote[]): boolean {
    // Simple check for alternating up/down or consistent direction
    if (notes.length < 3) return false
    
    const intervals = []
    for (let i = 1; i < notes.length; i++) {
      intervals.push(notes[i].scaleDegree - notes[i-1].scaleDegree)
    }
    
    // Check for alternating pattern or consistent skips
    const hasSkips = intervals.some(interval => Math.abs(interval) > 2)
    return hasSkips
  }

  private isChordLike(notes: HistoryNote[]): boolean {
    // Check if notes were played very close together (chord-like)
    if (notes.length < 3) return false
    
    const maxTimeSpan = 1000 // 1 second
    const firstTime = notes[0].pressTime
    const lastTime = notes[notes.length - 1].pressTime
    
    return (lastTime - firstTime) < maxTimeSpan
  }

  /**
   * Sets up silence detection timer
   */
  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
    }

    this.silenceTimer = setTimeout(() => {
      console.log(`🔇 Silence detected (${this.config.silenceThreshold}ms) - detecting patterns`)
      this.detectPatternsFromHistory()
    }, this.config.silenceThreshold) as unknown as number
  }

  /**
   * Determines if pattern detection should be triggered
   */
  private shouldDetectPatterns(): boolean {
    return this.history.length >= this.config.minPatternLength
  }

  /**
   * Saves a pattern (marks it as saved)
   */
  savePattern(patternId: string, name?: string, tags?: string[]): boolean {
    const pattern = this.patterns.get(patternId)
    if (!pattern) {
      console.warn(`⚠️ Pattern not found: ${patternId}`)
      return false
    }

    pattern.isSaved = true
    pattern.lastPlayedAt = Date.now()
    if (name) pattern.name = name
    if (tags) pattern.tags = tags

    console.log(`💾 Pattern saved: ${patternId} ${name ? `"${name}"` : ''}`)
    return true
  }

  /**
   * Deletes a pattern
   */
  deletePattern(patternId: string): boolean {
    const deleted = this.patterns.delete(patternId)
    if (deleted) {
      console.log(`🗑️ Pattern deleted: ${patternId}`)
    } else {
      console.warn(`⚠️ Pattern not found for deletion: ${patternId}`)
    }
    return deleted
  }

  /**
   * Gets all patterns with optional filtering
   */
  getPatterns(options?: PatternSearchOptions): Pattern[] {
    let patterns = Array.from(this.patterns.values())

    if (!options) return patterns

    // Apply filters
    if (options.key) {
      patterns = patterns.filter(p => p.key === options.key)
    }
    if (options.mode) {
      patterns = patterns.filter(p => p.mode === options.mode)
    }
    if (options.instrument) {
      patterns = patterns.filter(p => p.instrument === options.instrument)
    }
    if (options.patternType) {
      patterns = patterns.filter(p => p.patternType === options.patternType)
    }
    if (options.isSaved !== undefined) {
      patterns = patterns.filter(p => p.isSaved === options.isSaved)
    }
    if (options.minPlayCount) {
      patterns = patterns.filter(p => p.playCount >= options.minPlayCount!)
    }
    if (options.dateRange) {
      patterns = patterns.filter(p => 
        p.createdAt >= options.dateRange!.start && 
        p.createdAt <= options.dateRange!.end
      )
    }
    if (options.searchText) {
      const search = options.searchText.toLowerCase()
      patterns = patterns.filter(p => 
        p.name?.toLowerCase().includes(search) ||
        p.tags?.some(tag => tag.toLowerCase().includes(search))
      )
    }

    // Apply sorting
    if (options.sortBy) {
      const direction = options.sortDirection === 'asc' ? 1 : -1
      patterns.sort((a, b) => {
        const field = options.sortBy!
        const aVal = a[field] as number
        const bVal = b[field] as number
        return (aVal - bVal) * direction
      })
    }

    // Apply limit
    if (options.limit) {
      patterns = patterns.slice(0, options.limit)
    }

    return patterns
  }

  /**
   * Purges old patterns that aren't saved
   */
  purgeOldPatterns(): number {
    const cutoffTime = Date.now() - this.config.autoPurgeAge
    let purgedCount = 0

    for (const [id, pattern] of this.patterns) {
      if (!pattern.isSaved && pattern.createdAt < cutoffTime) {
        this.patterns.delete(id)
        purgedCount++
      }
    }

    if (purgedCount > 0) {
      console.log(`🧹 Purged ${purgedCount} old patterns (older than ${this.config.autoPurgeAge / (60 * 60 * 1000)} hours)`)
    }

    return purgedCount
  }

  /**
   * Gets storage statistics
   */
  getStorageStats(): PatternStorageStats {
    const patterns = Array.from(this.patterns.values())
    const savedPatterns = patterns.filter(p => p.isSaved)
    
    // Estimate storage usage (rough calculation)
    const storageUsage = JSON.stringify({
      history: this.history,
      patterns: patterns
    }).length * 2 // Rough estimate of bytes (UTF-16)

    return {
      totalPatterns: patterns.length,
      savedPatterns: savedPatterns.length,
      historySize: this.history.length,
      storageUsage,
      oldestPattern: patterns.length > 0 ? Math.min(...patterns.map(p => p.createdAt)) : undefined,
      newestPattern: patterns.length > 0 ? Math.max(...patterns.map(p => p.createdAt)) : undefined,
      mostPlayedPattern: patterns.reduce((max, p) => p.playCount > (max?.playCount || 0) ? p : max, undefined as Pattern | undefined),
      averagePatternLength: patterns.length > 0 ? patterns.reduce((sum, p) => sum + p.noteCount, 0) / patterns.length : 0
    }
  }

  /**
   * Loads data from serialized format (for persistence)
   */
  loadData(data: {
    history?: HistoryNote[]
    patterns?: Pattern[]
    config?: Partial<PatternDetectionConfig>
    currentSessionId?: string
  }): void {
    if (data.history) {
      this.history = data.history
      console.log(`📥 Loaded ${data.history.length} history notes`)
    }
    
    if (data.patterns) {
      this.patterns = new Map(data.patterns.map(p => [p.id, p]))
      console.log(`📥 Loaded ${data.patterns.length} patterns`)
    }
    
    if (data.config) {
      this.config = { ...this.config, ...data.config }
      console.log(`📥 Loaded pattern config`)
    }
    
    if (data.currentSessionId) {
      this.currentSessionId = data.currentSessionId
    }

    // Auto-purge on load
    this.purgeOldPatterns()
  }

  /**
   * Exports data for serialization (for persistence)
   */
  exportData() {
    return {
      history: this.history,
      patterns: Array.from(this.patterns.values()),
      config: this.config,
      currentSessionId: this.currentSessionId,
      lastNoteTime: this.lastNoteTime
    }
  }

  /**
   * Clears all data (for testing/reset)
   */
  clearAllData(): void {
    this.history = []
    this.patterns.clear()
    this.currentSessionId = generateId()
    this.lastNoteTime = 0
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }
    console.log(`🧹 All pattern data cleared`)
  }

  /**
   * Updates pattern configuration
   */
  updateConfig(newConfig: Partial<PatternDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log(`⚙️ Pattern config updated:`, newConfig)
  }
}

// Export singleton instance
export const patternService = new PatternService()
