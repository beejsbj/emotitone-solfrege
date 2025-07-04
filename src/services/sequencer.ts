// Sequencer Service for Emotitone Solfege
// Handles melody patterns, categories, and user-created melodies

import {
  getAllMelodicPatterns,
  getPatternsByEmotion,
  getIntervalPatterns,
  getMelodicPatterns,
  getCompleteMelodies,
} from "@/data";
import type {
  Melody,
  MelodyCategory,
  CategorizedMelody,
} from "@/types/music";
import { logger } from "@/utils/logger";

export class SequencerService {
  private melodyCache: Map<string, CategorizedMelody[]> = new Map();

  constructor() {
    this.initializeMelodyCache();
    logger.dev("SequencerService initialized with melody cache");
  }

  private initializeMelodyCache(): void {
    // Initialize melody cache with categorized melodies
    const allMelodies = this.categorizeMelodies();
    this.melodyCache.set("all", allMelodies);

    // Cache by category
    const categories: MelodyCategory[] = [
      "intervals",
      "patterns", 
      "complete",
      "userCreated",
    ];
    categories.forEach((category) => {
      this.melodyCache.set(
        category,
        allMelodies.filter((m) => m.category === category)
      );
    });
  }

  private categorizeMelodies(): CategorizedMelody[] {
    const melodies: CategorizedMelody[] = [];

    // Categorize interval patterns
    const intervals = getIntervalPatterns().map((melody) => ({
      ...melody,
      category: "intervals" as MelodyCategory,
    }));

    // Categorize melodic patterns
    const patterns = getMelodicPatterns().map((melody) => ({
      ...melody,
      category: "patterns" as MelodyCategory,
    }));

    // Categorize complete melodies
    const complete = getCompleteMelodies().map((melody) => ({
      ...melody,
      category: "complete" as MelodyCategory,
    }));

    return [...intervals, ...patterns, ...complete];
  }

  // Get all melodies with categories
  getAllMelodies(): CategorizedMelody[] {
    return this.melodyCache.get("all") || this.categorizeMelodies();
  }

  // Get melodies by category
  getMelodiesByCategory(category: MelodyCategory): CategorizedMelody[] {
    return this.melodyCache.get(category) || [];
  }

  // Get melodies by emotion
  getMelodiesByEmotion(emotion: string): CategorizedMelody[] {
    const allMelodies = this.getAllMelodies();
    return allMelodies.filter((melody) =>
      melody.emotion?.toLowerCase().includes(emotion.toLowerCase())
    );
  }

  // Search melodies by text
  searchMelodies(query: string): CategorizedMelody[] {
    const searchTerm = query.toLowerCase();
    return this.getAllMelodies().filter(
      (melody) =>
        melody.name.toLowerCase().includes(searchTerm) ||
        melody.description?.toLowerCase().includes(searchTerm) ||
        melody.emotion?.toLowerCase().includes(searchTerm)
    );
  }

  // Add a user-created melody
  addUserMelody(melody: Omit<Melody, "category">): CategorizedMelody {
    const categorizedMelody: CategorizedMelody = {
      ...melody,
      category: "userCreated",
    };

    // Update cache
    const allMelodies = this.getAllMelodies();
    allMelodies.push(categorizedMelody);
    this.melodyCache.set("all", allMelodies);

    const userMelodies = this.getMelodiesByCategory("userCreated");
    userMelodies.push(categorizedMelody);
    this.melodyCache.set("userCreated", userMelodies);

    logger.dev(`Added user melody: ${melody.name}`);
    return categorizedMelody;
  }

  // Remove a user-created melody
  removeUserMelody(melodyName: string): void {
    const allMelodies = this.getAllMelodies().filter(
      (m) => m.name !== melodyName
    );
    this.melodyCache.set("all", allMelodies);

    const userMelodies = this.getMelodiesByCategory("userCreated").filter(
      (m) => m.name !== melodyName
    );
    this.melodyCache.set("userCreated", userMelodies);

    logger.dev(`Removed user melody: ${melodyName}`);
  }

  // Get pattern suggestions based on current context
  getPatternSuggestions(context: {
    emotion?: string;
    category?: MelodyCategory;
    maxResults?: number;
  }): CategorizedMelody[] {
    let suggestions = this.getAllMelodies();

    if (context.emotion) {
      suggestions = this.getMelodiesByEmotion(context.emotion);
    }

    if (context.category) {
      suggestions = suggestions.filter(m => m.category === context.category);
    }

    if (context.maxResults) {
      suggestions = suggestions.slice(0, context.maxResults);
    }

    return suggestions;
  }
}

// Export singleton instance
export const sequencerService = new SequencerService();