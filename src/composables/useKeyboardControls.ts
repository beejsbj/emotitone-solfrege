/**
 * Keyboard Controls Composable
 * Handles keyboard mapping and event handling for solfege note playback
 */

import { ref, computed, onMounted, onUnmounted, type Ref } from "vue";
import { useMusicStore } from "@/stores/music";

/**
 * Keyboard mapping interface
 */
interface KeyboardMapping {
  [key: string]: {
    solfegeIndex: number;
    octave: number;
  };
}

/**
 * Composable for handling keyboard controls for solfege notes
 */
export function useKeyboardControls(mainOctave: Ref<number>) {
  const musicStore = useMusicStore();

  // Track which keys are currently pressed to prevent key repeat
  const pressedKeys = ref<Set<string>>(new Set());

  // Track keyboard-triggered notes separately from mouse-triggered notes
  const keyboardNoteIds = ref<Map<string, string>>(new Map());

  // Dynamic keyboard mapping for solfege notes across 3 octaves
  // Top row (qwertyu) -> Above main octave
  // Middle row (asdfghj) -> Main octave
  // Bottom row (zxcvbnm) -> Below main octave
  const getKeyboardMapping = (): KeyboardMapping => {
    return {
      // Above main octave - Top row
      q: { solfegeIndex: 0, octave: mainOctave.value + 1 },
      w: { solfegeIndex: 1, octave: mainOctave.value + 1 },
      e: { solfegeIndex: 2, octave: mainOctave.value + 1 },
      r: { solfegeIndex: 3, octave: mainOctave.value + 1 },
      t: { solfegeIndex: 4, octave: mainOctave.value + 1 },
      y: { solfegeIndex: 5, octave: mainOctave.value + 1 },
      u: { solfegeIndex: 6, octave: mainOctave.value + 1 },

      // Main octave - Middle row
      a: { solfegeIndex: 0, octave: mainOctave.value },
      s: { solfegeIndex: 1, octave: mainOctave.value },
      d: { solfegeIndex: 2, octave: mainOctave.value },
      f: { solfegeIndex: 3, octave: mainOctave.value },
      g: { solfegeIndex: 4, octave: mainOctave.value },
      h: { solfegeIndex: 5, octave: mainOctave.value },
      j: { solfegeIndex: 6, octave: mainOctave.value },

      // Below main octave - Bottom row
      z: { solfegeIndex: 0, octave: mainOctave.value - 1 },
      x: { solfegeIndex: 1, octave: mainOctave.value - 1 },
      c: { solfegeIndex: 2, octave: mainOctave.value - 1 },
      v: { solfegeIndex: 3, octave: mainOctave.value - 1 },
      b: { solfegeIndex: 4, octave: mainOctave.value - 1 },
      n: { solfegeIndex: 5, octave: mainOctave.value - 1 },
      m: { solfegeIndex: 6, octave: mainOctave.value - 1 },
    };
  };

  /**
   * Get the keyboard letter for a given solfege index and octave
   * Returns the key that would trigger this note, or null if not mapped
   */
  const getKeyboardLetterForNote = (
    solfegeIndex: number,
    octave: number
  ): string | null => {
    const mapping = getKeyboardMapping();

    // Find the key that maps to this solfege index and octave
    for (const [key, noteMapping] of Object.entries(mapping)) {
      if (
        noteMapping.solfegeIndex === solfegeIndex &&
        noteMapping.octave === octave
      ) {
        return key.toUpperCase(); // Return uppercase for display
      }
    }

    return null; // No keyboard mapping for this note
  };

  // Keyboard event handlers
  const handleKeyDown = async (event: KeyboardEvent) => {
    const key = event.key; // Don't convert to lowercase to preserve shift state

    // Ignore if key is already pressed (prevents key repeat)
    if (pressedKeys.value.has(key)) {
      return;
    }

    // Get current keyboard mapping
    const keyboardMapping = getKeyboardMapping();

    // Check if this key is mapped to a solfege note
    if (key in keyboardMapping) {
      event.preventDefault();
      pressedKeys.value.add(key);

      const { solfegeIndex, octave } =
        keyboardMapping[key as keyof typeof keyboardMapping];

      // Attack the note and track the note ID for this specific key
      const noteId = await musicStore.attackNoteWithOctave(
        solfegeIndex,
        octave
      );
      if (noteId) {
        keyboardNoteIds.value.set(key, noteId);

        // Dispatch custom event for visual feedback
        window.dispatchEvent(
          new CustomEvent("keyboard-note-pressed", {
            detail: { solfegeIndex, octave, key },
          })
        );
      }
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    const key = event.key; // Don't convert to lowercase to preserve shift state

    if (pressedKeys.value.has(key)) {
      pressedKeys.value.delete(key);

      // Release the specific note associated with this key
      const noteId = keyboardNoteIds.value.get(key);
      if (noteId) {
        musicStore.releaseNote(noteId);
        keyboardNoteIds.value.delete(key);

        // Dispatch custom event for visual feedback
        window.dispatchEvent(
          new CustomEvent("keyboard-note-released", {
            detail: { key },
          })
        );
      }
    }
  };

  // Handle window blur to release all keyboard notes (safety mechanism)
  const handleWindowBlur = () => {
    // Release all keyboard-triggered notes when window loses focus
    for (const noteId of keyboardNoteIds.value.values()) {
      musicStore.releaseNote(noteId);
    }

    // Clear tracking maps
    pressedKeys.value.clear();
    keyboardNoteIds.value.clear();
  };

  // Setup and cleanup
  const setupKeyboardListeners = () => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
  };

  const cleanupKeyboardListeners = () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("blur", handleWindowBlur);

    // Release any keyboard-triggered notes that are still active
    for (const noteId of keyboardNoteIds.value.values()) {
      musicStore.releaseNote(noteId);
    }

    // Clear tracking maps
    pressedKeys.value.clear();
    keyboardNoteIds.value.clear();
  };

  // Auto-setup when used in a component
  onMounted(setupKeyboardListeners);
  onUnmounted(cleanupKeyboardListeners);

  return {
    pressedKeys: computed(() => pressedKeys.value),
    keyboardNoteIds: computed(() => keyboardNoteIds.value),
    getKeyboardMapping,
    getKeyboardLetterForNote,
    setupKeyboardListeners,
    cleanupKeyboardListeners,
  };
}
