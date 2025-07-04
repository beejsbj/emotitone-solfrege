// Unified Music Service for Emotitone Solfege
// Bridges sequencer functionality with advanced music theory features

import { musicTheory as advancedMusicTheory } from "./musicTheoryAdvanced";
import { sequencerService } from "./sequencer";
import { musicTheory as simpleMusicTheory } from "./music";
import type {
  Note,
  MusicalMode,
  Melody,
  ChromaticNote,
  MelodyCategory,
  CategorizedMelody,
  EnhancedMelody,
} from "@/types/music";
import { 
  getPatternsByInterval, 
  getPatternsByTension,
  analyzeAllPatterns 
} from "@/utils/patternAnalysis";
import { logger } from "@/utils/logger";

/**
 * Unified Music Service that provides both sequencer functionality 
 * and advanced music theory features through a single interface
 */
export class UnifiedMusicService {
  constructor() {
    logger.info("UnifiedMusicService initialized - bridging sequencer and theory");
  }

  // ========== Core Key/Scale Management ==========
  // Delegates to advanced service for enhanced functionality
  
  getCurrentKey(): string {
    return advancedMusicTheory.getCurrentKey();
  }

  setCurrentKey(key: ChromaticNote): void {
    // Update both services to maintain sync
    advancedMusicTheory.setCurrentKey(key);
    simpleMusicTheory.setCurrentKey(key);
  }

  getCurrentMode(): MusicalMode {
    return advancedMusicTheory.getCurrentMode();
  }

  setCurrentMode(mode: MusicalMode): void {
    // Update both services to maintain sync
    advancedMusicTheory.setCurrentMode(mode);
    simpleMusicTheory.setCurrentMode(mode);
  }

  getCurrentScale() {
    return advancedMusicTheory.getCurrentScale();
  }

  getCurrentScaleNotes(): string[] {
    return advancedMusicTheory.getCurrentScaleNotes();
  }

  // ========== Note Operations ==========
  
  getNoteFrequency(solfegeIndex: number, octave: number = 4): number {
    return advancedMusicTheory.getNoteFrequency(solfegeIndex, octave);
  }

  getNoteName(solfegeIndex: number, octave: number = 4): string {
    return advancedMusicTheory.getNoteName(solfegeIndex, octave);
  }

  getSolfegeData(degree: number) {
    return advancedMusicTheory.getSolfegeData(degree);
  }

  // ========== Advanced Music Theory Features ==========
  // These were lost in the merge and are now restored

  /**
   * Analyze a set of notes and detect the chord
   */
  analyzeChord(notes: string[]): { name: string; symbol: string; quality: string } | null {
    logger.dev(`Analyzing chord from notes: ${notes.join(", ")}`);
    return advancedMusicTheory.analyzeChord(notes);
  }

  /**
   * Generate a chord from a scale degree
   */
  getChordFromDegree(degree: number, chordType: string = "triad"): string[] {
    logger.dev(`Generating ${chordType} chord from degree ${degree}`);
    return advancedMusicTheory.getChordFromDegree(degree, chordType);
  }

  /**
   * Detect the key from a set of notes with confidence score
   */
  detectKey(notes: string[]): { key: string; mode: string; confidence: number } | null {
    logger.dev(`Detecting key from ${notes.length} notes`);
    return advancedMusicTheory.detectKey(notes);
  }

  /**
   * Get all modes of the current scale
   */
  getScaleModes(scaleType: string = "major"): Array<{ name: string; notes: string[] }> {
    return advancedMusicTheory.getScaleModes(scaleType);
  }

  /**
   * Analyze a chord progression for harmonic functions
   */
  analyzeProgression(chords: string[]): Array<{ chord: string; degree: number; function: string }> {
    logger.dev(`Analyzing progression: ${chords.join(" - ")}`);
    return advancedMusicTheory.analyzeProgression(chords);
  }

  // ========== Sequencer/Pattern Management ==========
  // Delegates to sequencer service

  getAllMelodies(): CategorizedMelody[] {
    return sequencerService.getAllMelodies();
  }

  getMelodiesByCategory(category: MelodyCategory): CategorizedMelody[] {
    return sequencerService.getMelodiesByCategory(category);
  }

  getMelodiesByEmotion(emotion: string): CategorizedMelody[] {
    return sequencerService.getMelodiesByEmotion(emotion);
  }

  searchMelodies(query: string): CategorizedMelody[] {
    return sequencerService.searchMelodies(query);
  }

  addUserMelody(melody: Omit<Melody, "category">): CategorizedMelody {
    return sequencerService.addUserMelody(melody);
  }

  removeUserMelody(melodyName: string): void {
    sequencerService.removeUserMelody(melodyName);
  }

  getPatternSuggestions(context: {
    emotion?: string;
    category?: MelodyCategory;
    maxResults?: number;
  }): CategorizedMelody[] {
    return sequencerService.getPatternSuggestions(context);
  }

  // ========== Backward Compatibility ==========
  // Methods that exist in the simple service

  getMelodicPatterns(): Melody[] {
    // Use sequencer service for consistency
    return sequencerService.getAllMelodies();
  }

  getMelodicPatternsByCategory(category: "intervals" | "patterns"): Melody[] {
    // Map old category names to new ones
    const mappedCategory: MelodyCategory = category === "intervals" ? "intervals" : "patterns";
    return sequencerService.getMelodiesByCategory(mappedCategory);
  }

  // ========== Pattern Analysis Features ==========
  // Restored from refactor branch

  /**
   * Get patterns by interval consonance type
   */
  getPatternsByInterval(type: "consonant" | "dissonant"): EnhancedMelody[] {
    const allPatterns = sequencerService.getAllMelodies();
    return getPatternsByInterval(allPatterns, type);
  }

  /**
   * Get patterns by tension level
   */
  getPatternsByTension(minTension: number, maxTension: number): EnhancedMelody[] {
    const allPatterns = sequencerService.getAllMelodies();
    return getPatternsByTension(allPatterns, minTension, maxTension);
  }

  /**
   * Analyze all patterns with tonal characteristics
   */
  analyzeAllPatterns(): EnhancedMelody[] {
    const allPatterns = sequencerService.getAllMelodies();
    return analyzeAllPatterns(allPatterns);
  }

  // ========== Enhanced Features ==========
  // New methods that combine both services

  /**
   * Get chord suggestions for a melody
   */
  getChordSuggestionsForMelody(melodyNotes: string[]): Array<{
    chord: string;
    compatibility: number;
  }> {
    const keyInfo = this.detectKey(melodyNotes);
    if (!keyInfo) return [];

    // Generate chords for each scale degree
    const suggestions: Array<{ chord: string; compatibility: number }> = [];
    
    for (let degree = 1; degree <= 7; degree++) {
      const chordNotes = this.getChordFromDegree(degree);
      if (chordNotes.length > 0) {
        const chordInfo = this.analyzeChord(chordNotes);
        if (chordInfo) {
          suggestions.push({
            chord: chordInfo.symbol,
            compatibility: degree === 1 || degree === 5 ? 1.0 : 0.7
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.compatibility - a.compatibility);
  }

  /**
   * Generate a melody based on a chord progression
   */
  generateMelodyFromProgression(chords: string[]): number[] {
    const analysis = this.analyzeProgression(chords);
    const melodyNotes: number[] = [];

    // Simple melody generation - use chord tones
    analysis.forEach((chordInfo) => {
      // Add root note of each chord as melody
      const degree = chordInfo.degree || 1;
      melodyNotes.push(degree - 1); // Convert to 0-based index
    });

    return melodyNotes;
  }
}

// Export singleton instance
export const unifiedMusicService = new UnifiedMusicService();