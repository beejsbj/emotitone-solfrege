/**
 * Music System Adapter
 * Implements MusicSystem interface and provides clean API for music theory operations
 */

import type { MusicSystem } from "@/interfaces/systems";
import { musicTheory } from "@/services/music";
import { eventBus } from "@/utils";
import type { ChromaticNote, MusicalMode } from "@/types/music";

export class MusicSystemAdapter implements MusicSystem {
  
  setCurrentKey(key: string): void {
    const previousKey = musicTheory.getCurrentKey();
    musicTheory.setCurrentKey(key as ChromaticNote);
    
    eventBus.emit('key-changed', {
      key,
      previousKey
    });
  }

  setCurrentMode(mode: string): void {
    const previousMode = musicTheory.getCurrentMode();
    musicTheory.setCurrentMode(mode as MusicalMode);
    
    eventBus.emit('mode-changed', {
      mode,
      previousMode
    });
  }

  getCurrentScaleNotes(): string[] {
    return musicTheory.getCurrentScaleNotes();
  }

  getNoteFrequency(solfegeIndex: number, octave = 4): number {
    return musicTheory.getNoteFrequency(solfegeIndex, octave);
  }

  getNoteName(solfegeIndex: number, octave = 4): string {
    return musicTheory.getNoteName(solfegeIndex, octave);
  }

  getCurrentScale(): any {
    return musicTheory.getCurrentScale();
  }

  getMelodicPatterns(): any[] {
    return musicTheory.getMelodicPatterns();
  }

  searchMelodies(query: string): any[] {
    return musicTheory.searchMelodies(query);
  }

  // Additional helper methods
  getCurrentKey(): string {
    return musicTheory.getCurrentKey();
  }

  getCurrentMode(): string {
    return musicTheory.getCurrentMode();
  }

  getSolfegeData(): any[] {
    return musicTheory.getCurrentScale().solfege;
  }
}

// Export singleton instance
export const musicSystem = new MusicSystemAdapter();