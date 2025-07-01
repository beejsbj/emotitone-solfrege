/**
 * Solfege Interaction Composable
 * Handles user interactions with solfege notes
 */

import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useMusicStore } from "@/stores/music";
import { useColorSystem } from "@/composables/useColorSystem";
import type { MusicalMode } from "@/types";
import { logger } from "@/utils/logger";

/**
 * Composable for handling solfege note interactions
 */
export function useSolfegeInteraction() {
  const musicStore = useMusicStore();
  const { getGradient, isDynamicColorsEnabled } = useColorSystem();

  // Track active note IDs for each button press
  const activeNoteIds = ref<Map<string, string>>(new Map());

  // Create a reactive animation frame counter to trigger re-renders for dynamic colors
  const animationFrame = ref(0);
  let animationId: number | null = null;

  // Start animation loop when dynamic colors are enabled
  const startAnimation = () => {
    if (animationId) return;

    const animate = () => {
      animationFrame.value++;
      animationId = requestAnimationFrame(animate);
    };

    animate();
  };

  // Stop animation loop
  const stopAnimation = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  };

  // Create a reactive computed property that updates with animation frames
  const getReactiveGradient = computed(() => {
    return (noteName: string, mode: MusicalMode) => {
      // Force reactivity by accessing animation frame when dynamic colors are enabled
      if (isDynamicColorsEnabled.value) {
        animationFrame.value; // This triggers re-computation on every frame
      }
      return getGradient(noteName, mode);
    };
  });

  // Watch for dynamic colors being enabled/disabled
  const shouldAnimate = computed(() => isDynamicColorsEnabled.value);

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

  // Setup and cleanup
  onMounted(() => {
    if (shouldAnimate.value) {
      startAnimation();
    }
  });

  onUnmounted(() => {
    stopAnimation();
  });

  // Watch for changes in dynamic colors setting
  watch(shouldAnimate, (newValue) => {
    if (newValue) {
      startAnimation();
    } else {
      stopAnimation();
    }
  });

  return {
    activeNoteIds: computed(() => activeNoteIds.value),
    getReactiveGradient,
    attackNoteWithOctave,
    releaseActiveNote,
    releaseNoteByButtonKey,
    isNoteActiveForSolfege,
    attackNote,
    releaseNote,
    startAnimation,
    stopAnimation,
  };
}
