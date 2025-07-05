/**
 * Solfege Interaction Composable
 * Handles note attack/release logic and active note tracking for solfege buttons
 */

import { ref, computed } from "vue";
import { useMusicStore } from "@/stores/music";
import { getNoteColor } from "@/utils";
import type { MusicalMode } from "@/types/music";

/**
 * Composable for handling solfege note interactions
 */
export function useSolfegeInteraction() {
  const musicStore = useMusicStore();
  // Simplified color system - no complex animations needed

  // Track active note IDs for each button press
  const activeNoteIds = ref<Map<string, string>>(new Map());

  // Simple color getter - no animations needed
  const getNoteColorForSolfege = (noteName: string) => {
    return getNoteColor(noteName, 4); // Default to octave 4
  };

  // Watch for dynamic colors being enabled/disabled
  // Removed complex animation system

  // Function for attacking notes with octave support
  const attackNoteWithOctave = async (
    solfegeIndex: number,
    octave: number,
    event?: Event
  ) => {
    // Prevent context menu and other unwanted behaviors
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const buttonKey = `${solfegeIndex}_${octave}`;

    // Don't attack if this button is already pressed
    if (activeNoteIds.value.has(buttonKey)) {
      return;
    }

    const noteId = await musicStore.attackNoteWithOctave(solfegeIndex, octave);
    if (noteId) {
      activeNoteIds.value.set(buttonKey, noteId);
    }
  };

  // Function for releasing the currently active note from this button
  const releaseActiveNote = (event?: Event) => {
    // Prevent unwanted behaviors
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Find the button that triggered this release and release its note
    const target = event?.target as HTMLElement;
    if (target) {
      // Get the button's data attributes or find the note ID another way
      // For now, we'll release all notes (can be refined later)
      musicStore.releaseAllNotes();
      activeNoteIds.value.clear();
    }
  };

  // Function for releasing a specific note by button key
  const releaseNoteByButtonKey = (buttonKey: string, event?: Event) => {
    // Prevent unwanted behaviors
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const noteId = activeNoteIds.value.get(buttonKey);
    if (noteId) {
      musicStore.releaseNote(noteId);
      activeNoteIds.value.delete(buttonKey);
    }
  };

  // Check if any note is active for a given solfege name
  const isNoteActiveForSolfege = (
    solfegeName: string,
    octave: number
  ): boolean => {
    const activeNotes = musicStore.getActiveNotes();
    return activeNotes.some(
      (note) => note.solfege.name === solfegeName && note.octave === octave
    );
  };

  // Legacy functions for backward compatibility
  const attackNote = (solfegeIndex: number, event?: Event) => {
    attackNoteWithOctave(solfegeIndex, 4, event);
  };

  const releaseNote = (event?: Event) => {
    releaseActiveNote(event);
  };

  // No complex animation setup needed

  return {
    activeNoteIds: computed(() => activeNoteIds.value),
    getNoteColorForSolfege,
    attackNoteWithOctave,
    releaseActiveNote,
    releaseNoteByButtonKey,
    isNoteActiveForSolfege,
    attackNote,
    releaseNote,
  };
}
