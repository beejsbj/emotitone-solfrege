/**
 * Audio System Adapter
 * Implements AudioSystem interface and provides clean API for audio operations
 */

import type { AudioSystem } from "@/interfaces/systems";
import { audioService } from "@/services/audio";
import { eventBus } from "@/utils";

export class AudioSystemAdapter implements AudioSystem {
  
  async playNote(note: string, duration = "1n"): Promise<void> {
    await audioService.playNote(note, duration);
    
    // Emit event for other systems
    eventBus.emit('note-played', {
      noteName: note,
      solfege: '', // Would need to derive this
      frequency: 440, // Would need to calculate
      octave: 4, // Default
      timestamp: Date.now()
    });
  }

  async attackNote(note: string, noteId?: string): Promise<string> {
    const id = await audioService.attackNote(note, noteId);
    
    if (id) {
      eventBus.emit('note-played', {
        noteName: note,
        solfege: '',
        frequency: 440,
        octave: 4,
        noteId: id,
        timestamp: Date.now()
      });
    }
    
    return id;
  }

  async releaseNote(noteId?: string): Promise<void> {
    await audioService.releaseNote(noteId);
    
    if (noteId) {
      eventBus.emit('note-released', {
        noteId,
        noteName: '' // Would need to track this
      });
    }
  }

  setInstrument(instrumentName: string): void {
    // This would need to integrate with instrument store
    eventBus.emit('instrument-changed', {
      instrument: instrumentName,
      previousInstrument: '' // Would need to track
    });
  }

  getCurrentInstrument(): any {
    // Would delegate to instrument store
    return null;
  }

  isAudioReady(): boolean {
    return audioService.isAudioReady();
  }

  getActiveNotes(): Array<{ note: string; noteId: string }> {
    return audioService.getActiveNotes().map(note => ({
      note: typeof note.note === 'string' ? note.note : note.note.toString(),
      noteId: note.noteId
    }));
  }

  async initialize(): Promise<void> {
    await audioService.initialize();
    eventBus.emit('system-ready', { system: 'audio' });
  }

  async dispose(): Promise<void> {
    await audioService.dispose();
  }
}

// Export singleton instance  
export const audioSystem = new AudioSystemAdapter();