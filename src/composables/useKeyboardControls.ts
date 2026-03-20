/**
 * Keyboard Controls Composable
 * Handles keyboard mapping and event handling for solfege note playback
 */

import { ref, computed, onMounted, onUnmounted, type Ref } from "vue";
import { useMusicStore } from "@/stores/music";
import { usePatternsStore } from "@/stores/patterns";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";

/**
 * Keyboard mapping interface
 */
interface KeyboardMapping {
  [key: string]: {
    solfegeIndex: number;
    octave: number;
    label: string;
  };
}

const KEY_ROWS = [
  {
    octaveOffset: 1,
    keys: [
      { code: "Digit1", label: "1" },
      { code: "Digit2", label: "2" },
      { code: "Digit3", label: "3" },
      { code: "Digit4", label: "4" },
      { code: "Digit5", label: "5" },
      { code: "Digit6", label: "6" },
      { code: "Digit7", label: "7" },
      { code: "Digit8", label: "8" },
      { code: "Digit9", label: "9" },
      { code: "Digit0", label: "0" },
      { code: "Minus", label: "-" },
      { code: "Equal", label: "=" },
    ],
  },
  {
    octaveOffset: 0,
    keys: [
      { code: "KeyQ", label: "Q" },
      { code: "KeyW", label: "W" },
      { code: "KeyE", label: "E" },
      { code: "KeyR", label: "R" },
      { code: "KeyT", label: "T" },
      { code: "KeyY", label: "Y" },
      { code: "KeyU", label: "U" },
      { code: "KeyI", label: "I" },
      { code: "KeyO", label: "O" },
      { code: "KeyP", label: "P" },
      { code: "BracketLeft", label: "[" },
      { code: "BracketRight", label: "]" },
    ],
  },
  {
    octaveOffset: -1,
    keys: [
      { code: "KeyA", label: "A" },
      { code: "KeyS", label: "S" },
      { code: "KeyD", label: "D" },
      { code: "KeyF", label: "F" },
      { code: "KeyG", label: "G" },
      { code: "KeyH", label: "H" },
      { code: "KeyJ", label: "J" },
      { code: "KeyK", label: "K" },
      { code: "KeyL", label: "L" },
      { code: "Semicolon", label: ";" },
      { code: "Quote", label: "'" },
      { code: "Backslash", label: "\\" },
    ],
  },
] as const;

/**
 * Composable for handling keyboard controls for solfege notes
 */
export function useKeyboardControls(mainOctave: Ref<number>) {
  const musicStore = useMusicStore();
  const patternsStore = usePatternsStore();
  const keyboardDrawerStore = useKeyboardDrawerStore();

  // Track which keys are currently pressed to prevent key repeat
  const pressedKeys = ref<Set<string>>(new Set());

  // Track keyboard-triggered notes separately from mouse-triggered notes
  const keyboardNoteIds = ref<Map<string, string>>(new Map());

  const getKeyboardMapping = (): KeyboardMapping => {
    const degreeCount = musicStore.currentScale.degreeCount;
    const mapping: KeyboardMapping = {};

    KEY_ROWS.forEach((row) => {
      const octave = mainOctave.value + row.octaveOffset;
      if (octave < 1 || octave > 8) {
        return;
      }

      row.keys.slice(0, degreeCount).forEach((key, index) => {
        mapping[key.code] = {
          solfegeIndex: index,
          octave,
          label: key.label,
        };
      });
    });

    return mapping;
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
        return noteMapping.label;
      }
    }

    return null; // No keyboard mapping for this note
  };

  const isEditableTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    const tagName = target.tagName;
    return (
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      tagName === "SELECT" ||
      target.isContentEditable
    );
  };

  const getKeyboardPressId = (key: string) => `keyboard:${key}`;
  const getNoteKey = (solfegeIndex: number, octave: number) =>
    `${solfegeIndex}_${octave}`;

  // Keyboard event handlers
  const handleKeyDown = async (event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) {
      return;
    }

    const key = event.code;

    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      patternsStore.removeLastFromCurrentSketch();
      return;
    }

    // Ignore if key is already pressed (prevents key repeat)
    if (pressedKeys.value.has(key)) {
      return;
    }

    // Get current keyboard mapping
    const keyboardMapping = getKeyboardMapping();
    if (key in keyboardMapping) {
      event.preventDefault();
      pressedKeys.value.add(key);

      const { solfegeIndex, octave, label } =
        keyboardMapping[key as keyof typeof keyboardMapping];

      const noteId = await musicStore.attackNoteWithOctave(
        solfegeIndex,
        octave
      );
      if (noteId) {
        keyboardNoteIds.value.set(key, noteId);
        keyboardDrawerStore.addTouch(
          getKeyboardPressId(key),
          getNoteKey(solfegeIndex, octave)
        );

        // Dispatch custom event for visual feedback
        window.dispatchEvent(
          new CustomEvent("keyboard-note-pressed", {
            detail: { solfegeIndex, octave, key: label },
          })
        );
      } else {
        pressedKeys.value.delete(key);
      }
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    const key = event.code;

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
            detail: { key: keyboardMappingLabel(key) },
          })
        );
      }

      keyboardDrawerStore.removeTouch(getKeyboardPressId(key));
    }
  };

  const keyboardMappingLabel = (code: string): string => {
    return getKeyboardMapping()[code]?.label ?? code;
  };

  // Handle window blur to release all keyboard notes (safety mechanism)
  const handleWindowBlur = () => {
    // Release all keyboard-triggered notes when window loses focus
    for (const [key, noteId] of keyboardNoteIds.value.entries()) {
      musicStore.releaseNote(noteId);
      keyboardDrawerStore.removeTouch(getKeyboardPressId(key));
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
    for (const [key, noteId] of keyboardNoteIds.value.entries()) {
      musicStore.releaseNote(noteId);
      keyboardDrawerStore.removeTouch(getKeyboardPressId(key));
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
