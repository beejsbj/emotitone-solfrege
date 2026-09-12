/**
 * Keyboard Controls Composable
 * Handles keyboard mapping and event handling for solfege note playback
 */

import { ref, computed, onMounted, onUnmounted, watch, type Ref } from "vue";
import { useInstrumentStore } from "@/stores/instrument";
import { useMusicStore } from "@/stores/music";
import { usePatternsStore } from "@/stores/patterns";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { createVoiceGroupLifecycle } from "@/services/inputVoiceGroups";

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

// The physical bottom row has ten printable keys, so it covers the first ten
// degrees two octaves below the main row. The 12-key home row above it retains
// complete chromatic coverage.
const BOTTOM_KEY_ROW = [
  { code: "KeyZ", label: "Z" },
  { code: "KeyX", label: "X" },
  { code: "KeyC", label: "C" },
  { code: "KeyV", label: "V" },
  { code: "KeyB", label: "B" },
  { code: "KeyN", label: "N" },
  { code: "KeyM", label: "M" },
  { code: "Comma", label: "," },
  { code: "Period", label: "." },
  { code: "Slash", label: "/" },
] as const;

/**
 * Composable for handling keyboard controls for solfege notes
 */
export function useKeyboardControls(mainOctave: Ref<number>) {
  const instrumentStore = useInstrumentStore();
  const musicStore = useMusicStore();
  const patternsStore = usePatternsStore();
  const keyboardDrawerStore = useKeyboardDrawerStore();
  const voiceGroups = createVoiceGroupLifecycle((noteId) => musicStore.releaseNote(noteId));

  // Track which keys are currently pressed to prevent key repeat
  const pressedKeys = ref<Set<string>>(new Set());
  // Keys depressed while input is locked must see a physical keyup before
  // they may attack. Otherwise OS key-repeat can start a note after unlock.
  const blockedKeys = ref<Set<string>>(new Set());

  // Track keyboard-triggered notes separately from mouse-triggered notes
  const keyboardNoteIds = ref<Map<string, string>>(new Map());

  const getKeyboardMapping = (): KeyboardMapping => {
    const degreeCount = musicStore.currentScale.degreeCount;
    const mapping: KeyboardMapping = {};

    const addKeyRow = (
      keys: readonly { code: string; label: string }[],
      octave: number,
    ) => {
      if (octave < 1 || octave > 8) {
        return;
      }

      keys.slice(0, degreeCount).forEach((key, index) => {
        mapping[key.code] = {
          solfegeIndex: index,
          octave,
          label: key.label,
        };
      });
    };

    KEY_ROWS.forEach((row) => {
      addKeyRow(row.keys, mainOctave.value + row.octaveOffset);
    });
    addKeyRow(BOTTOM_KEY_ROW, mainOctave.value - 2);

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

    // Get current keyboard mapping
    const keyboardMapping = getKeyboardMapping();
    if (key in keyboardMapping) {
      if (blockedKeys.value.has(key)) {
        event.preventDefault();
        return;
      }

      if (instrumentStore.isInteractionLocked) {
        event.preventDefault();
        blockedKeys.value.add(key);
        return;
      }

      // Ignore if key is already pressed (prevents key repeat)
      if (pressedKeys.value.has(key)) {
        return;
      }

      event.preventDefault();
      pressedKeys.value.add(key);

      const { solfegeIndex, octave, label } =
        keyboardMapping[key as keyof typeof keyboardMapping];

      const ownerId = getKeyboardPressId(key);
      keyboardDrawerStore.addTouch(ownerId, getNoteKey(solfegeIndex, octave));
      window.dispatchEvent(
        new CustomEvent("keyboard-note-pressed", {
          detail: { solfegeIndex, octave, key: label },
        })
      );
      void voiceGroups.attack(ownerId, [
        (isCancelled) => musicStore.attackNoteWithOctave(
          solfegeIndex,
          octave,
          isCancelled,
        ),
      ]).then(([noteId]) => {
        if (
          noteId
          && pressedKeys.value.has(key)
          && !blockedKeys.value.has(key)
          && !instrumentStore.isInteractionLocked
        ) {
          keyboardNoteIds.value.set(key, noteId);
        }
      });
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    const key = event.code;

    if (blockedKeys.value.delete(key)) {
      return;
    }

    if (pressedKeys.value.has(key)) {
      pressedKeys.value.delete(key);

      const ownerId = getKeyboardPressId(key);
      voiceGroups.release(ownerId);
      keyboardNoteIds.value.delete(key);
      window.dispatchEvent(
        new CustomEvent("keyboard-note-released", {
          detail: { key: keyboardMappingLabel(key) },
        })
      );
      keyboardDrawerStore.removeTouch(ownerId);
    }
  };

  const keyboardMappingLabel = (code: string): string => {
    return getKeyboardMapping()[code]?.label ?? code;
  };

  // Handle window blur to release all keyboard notes (safety mechanism)
  const handleWindowBlur = () => {
    // Release all keyboard-triggered notes when window loses focus
    for (const key of pressedKeys.value) {
      keyboardDrawerStore.removeTouch(getKeyboardPressId(key));
    }
    voiceGroups.releaseAll();

    // Clear tracking maps
    pressedKeys.value.clear();
    keyboardNoteIds.value.clear();
    blockedKeys.value.clear();
  };

  watch(
    () => instrumentStore.isInteractionLocked,
    (locked) => {
      if (!locked) return;

      for (const key of pressedKeys.value) {
        blockedKeys.value.add(key);
        keyboardDrawerStore.removeTouch(getKeyboardPressId(key));
      }
      voiceGroups.releaseAll();
      pressedKeys.value.clear();
      keyboardNoteIds.value.clear();
    },
  );

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
    for (const key of pressedKeys.value) {
      keyboardDrawerStore.removeTouch(getKeyboardPressId(key));
    }
    voiceGroups.releaseAll();

    // Clear tracking maps
    pressedKeys.value.clear();
    keyboardNoteIds.value.clear();
    blockedKeys.value.clear();
  };

  // Auto-setup when used in a component
  onMounted(setupKeyboardListeners);
  onUnmounted(cleanupKeyboardListeners);

  return {
    pressedKeys: computed(() => pressedKeys.value),
    keyboardNoteIds: computed(() => keyboardNoteIds.value),
    getKeyboardMapping,
    getKeyboardLetterForNote,
    handleKeyDown,
    handleKeyUp,
    setupKeyboardListeners,
    cleanupKeyboardListeners,
  };
}
