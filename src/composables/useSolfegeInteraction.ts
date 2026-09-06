/**
 * Solfege Interaction Composable
 * Handles note attack/release logic and active note tracking for solfege buttons
 */

import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useMusicStore } from "@/stores/music";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useColorSystem } from "@/composables/useColorSystem";
import { createHeldNotes, type HeldNotePress } from "@/composables/heldNotes";
import type { MusicalMode, ChromaticNote } from "@/types/music";

interface SolfegeHeldPress extends HeldNotePress {
  noteKey: string;
  solfegeIndex: number;
  octave: number;
}

/**
 * Composable for handling solfege note interactions
 */
export function useSolfegeInteraction() {
  const musicStore = useMusicStore();
  const keyboardDrawerStore = useKeyboardDrawerStore();
  const { getGradient, isDynamicColorsEnabled } = useColorSystem();

  const heldNotes = createHeldNotes<SolfegeHeldPress>({
    attack: ({ solfegeIndex, octave }) =>
      musicStore.attackNoteWithOctave(solfegeIndex, octave),
    release: (noteId) => {
      void musicStore.releaseNote(noteId);
    },
    onPressed: ({ pressId, noteKey }) => {
      keyboardDrawerStore.addTouch(pressId, noteKey);
    },
    onUnpressed: ({ pressId }) => {
      keyboardDrawerStore.removeTouch(pressId);
    },
  });

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
      return getGradient(
        noteName,
        mode,
        3,
        45,
        musicStore.currentKey as ChromaticNote
      );
    };
  });

  // Watch for dynamic colors being enabled/disabled
  const shouldAnimate = computed(() => isDynamicColorsEnabled.value);

  const attackNoteForPress = (
    pressId: string,
    solfegeIndex: number,
    octave: number,
    event?: Event
  ) => {
    // Prevent context menu and other unwanted behaviors
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    return heldNotes.press({
      pressId,
      noteKey: `${solfegeIndex}_${octave}`,
      solfegeIndex,
      octave,
    });
  };

  // Legacy pitch-owned activation. Production input adapters pass distinct IDs
  // through attackNoteForPress so same-pitch presses remain independent.
  const attackNoteWithOctave = (
    solfegeIndex: number,
    octave: number,
    event?: Event
  ) => attackNoteForPress(`${solfegeIndex}_${octave}`, solfegeIndex, octave, event);

  // Function for releasing the currently active note from this button
  const releaseActiveNote = (event?: Event) => {
    // Prevent unwanted behaviors
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    heldNotes.releaseAll();
  };

  const releaseNoteForPress = (pressId: string, event?: Event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    heldNotes.release(pressId);
  };

  // Function for releasing a specific note by button key
  const releaseNoteByButtonKey = (buttonKey: string, event?: Event) => {
    // Prevent unwanted behaviors
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    heldNotes.releaseWhere((press) => press.noteKey === buttonKey);
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
  onMounted(async () => {
    if (shouldAnimate.value) {
      startAnimation();
    }
  });

  onUnmounted(() => {
    stopAnimation();
    heldNotes.releaseAll();
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
    activeNoteIds: computed(() => heldNotes.getActiveNoteIds()),
    getReactiveGradient,
    attackNoteForPress,
    attackNoteWithOctave,
    releaseActiveNote,
    releaseNoteForPress,
    releaseNoteByButtonKey,
    isNoteActiveForSolfege,
    attackNote,
    releaseNote,
    startAnimation,
    stopAnimation,
  };
}
