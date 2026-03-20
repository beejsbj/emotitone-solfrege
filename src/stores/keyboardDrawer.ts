import { defineStore } from "pinia";
import { ref, reactive, computed } from "vue";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { useMusicStore } from "@/stores/music";

export type KeyboardPressId = string;

/**
 * Drawer state management
 */
export interface DrawerState {
  /** Whether drawer is open */
  isOpen: boolean;
}

/**
 * Touch interaction state
 */
export interface TouchState {
  /** Active press points for touch, mouse, keyboard, and MIDI input */
  activeTouches: Map<KeyboardPressId, string>;
  /** Pressed key states for visual feedback */
  pressedKeys: Set<string>;
  /** Last touch timestamp for gesture recognition */
  lastTouchTime: number;
  /** Touch start position for swipe detection */
  touchStartY: number;
}

export interface VisualActivationState {
  /** Active playback/event activations by activation id */
  activeActivations: Map<string, string>;
  /** Ref-counted active note keys for event-driven highlights */
  noteKeyCounts: Map<string, number>;
}

export interface MidiState {
  /** Whether the browser exposes the Web MIDI API */
  isSupported: boolean;
  /** Whether a MIDI connection request is in flight */
  isConnecting: boolean;
  /** Whether the app has active MIDI access and is listening for inputs */
  isListening: boolean;
  /** Names of currently connected MIDI inputs */
  connectedInputs: string[];
  /** Names of currently connected MIDI outputs */
  connectedOutputs: string[];
  /** Preferred ROLI/LUMI output currently used for live sync */
  syncedOutput: string | null;
  /** Last connection or permission error */
  lastError: string | null;
}

function isMidiSupported() {
  return (
    typeof navigator !== "undefined"
    && typeof navigator.requestMIDIAccess === "function"
  );
}

/**
 * Keyboard drawer store for managing drawer state and keyboard interactions
 */
export const useKeyboardDrawerStore = defineStore(
  "keyboardDrawer",
  () => {
    // Get related stores
    const visualConfigStore = useVisualConfigStore();
    const musicStore = useMusicStore();

    // Drawer state
    const drawer = reactive<DrawerState>({
      isOpen: true, // Default to open so users can access controls
    });

    // Touch interaction state
    const touch = reactive<TouchState>({
      activeTouches: new Map(),
      pressedKeys: new Set(),
      lastTouchTime: 0,
      touchStartY: 0,
    });

    const visual = reactive<VisualActivationState>({
      activeActivations: new Map(),
      noteKeyCounts: new Map(),
    });

    const midi = reactive<MidiState>({
      isSupported: isMidiSupported(),
      isConnecting: false,
      isListening: false,
      connectedInputs: [],
      connectedOutputs: [],
      syncedOutput: null,
      lastError: null,
    });

    // Defensive: ensure correct types after persisted hydration or HMR
    if (!(touch.activeTouches instanceof Map)) {
      touch.activeTouches = new Map();
    }
    if (!(touch.pressedKeys instanceof Set)) {
      touch.pressedKeys = new Set();
    }
    if (!(visual.activeActivations instanceof Map)) {
      visual.activeActivations = new Map();
    }
    if (!(visual.noteKeyCounts instanceof Map)) {
      visual.noteKeyCounts = new Map();
    }

    // Helper to rehydrate non-serializable collections safely when needed
    function ensureTouchCollections() {
      if (!(touch.activeTouches instanceof Map)) {
        // Attempt to rehydrate from plain object if present
        const obj = touch.activeTouches as unknown as
          | Record<string, string>
          | undefined;
        const entries =
          obj && typeof obj === "object"
            ? Object.entries(obj)
            : [];
        touch.activeTouches = new Map<KeyboardPressId, string>(entries);
      }
      if (!(touch.pressedKeys instanceof Set)) {
        const pk = touch.pressedKeys as unknown as string[] | undefined;
        touch.pressedKeys = new Set<string>(Array.isArray(pk) ? pk : []);
      }
    }

    function ensureVisualCollections() {
      if (!(visual.activeActivations instanceof Map)) {
        const activations = visual.activeActivations as unknown as
          | Record<string, string>
          | undefined;
        visual.activeActivations = new Map<KeyboardPressId, string>(
          activations && typeof activations === "object"
            ? Object.entries(activations)
            : []
        );
      }

      if (!(visual.noteKeyCounts instanceof Map)) {
        const noteKeyCounts = visual.noteKeyCounts as unknown as
          | Record<string, number>
          | undefined;
        visual.noteKeyCounts = new Map<string, number>(
          noteKeyCounts && typeof noteKeyCounts === "object"
            ? Object.entries(noteKeyCounts).map(([noteKey, count]) => [
                noteKey,
                Number(count) || 0,
              ])
            : []
        );
      }
    }

    // Keyboard layout computed properties from visual config
    const keyboardConfig = computed(() => visualConfigStore.config.keyboard);

    // Current visible octaves based on main octave and row count
    const visibleOctaves = computed(() => {
      const { mainOctave, rowCount } = keyboardConfig.value;
      const octaves = [];
      const halfRows = Math.floor(rowCount / 2);

      // Generate octaves centered around main octave
      for (let i = -halfRows; i <= halfRows; i++) {
        const octave = mainOctave + i;
        if (octave >= 1 && octave <= 8) {
          octaves.push(octave);
        }
      }

      return octaves.sort((a, b) => b - a); // Highest to lowest for visual stacking
    });

    // Current solfège data from music store
    const solfegeData = computed(() => musicStore.solfegeData);

    // Actions for drawer control
    const openDrawer = () => {
      drawer.isOpen = true;
    };

    const closeDrawer = () => {
      drawer.isOpen = false;
    };

    const toggleDrawer = () => {
      drawer.isOpen = !drawer.isOpen;
    };





    // Actions for touch interactions
    const addTouch = (touchId: KeyboardPressId, noteKey: string) => {
      ensureTouchCollections();
      touch.activeTouches.set(touchId, noteKey);
      touch.pressedKeys.add(noteKey);
    };

    const removeTouch = (touchId: KeyboardPressId) => {
      ensureTouchCollections();
      const noteKey = touch.activeTouches.get(touchId);
      if (noteKey) {
        touch.activeTouches.delete(touchId);

        // Only remove from pressed keys if no other touches are holding the same key
        const isStillPressed = Array.from(
          touch.activeTouches.values()
        ).includes(noteKey);
        if (!isStillPressed) {
          touch.pressedKeys.delete(noteKey);
        }
      }
    };

    const clearAllTouches = () => {
      ensureTouchCollections();
      touch.activeTouches.clear();
      touch.pressedKeys.clear();
    };

    const clearTouchesForNoteKey = (noteKey: string) => {
      ensureTouchCollections();

      const touchesToRemove: KeyboardPressId[] = [];
      touch.activeTouches.forEach((activeNoteKey, touchId) => {
        if (activeNoteKey === noteKey) {
          touchesToRemove.push(touchId);
        }
      });

      touchesToRemove.forEach((touchId) => {
        removeTouch(touchId);
      });
    };

    const isKeyPressed = (noteKey: string): boolean => {
      const pk: any = touch.pressedKeys as any;
      if (!(pk instanceof Set) || typeof pk.has !== "function") {
        // Rehydrate to a proper Set if hydration corrupted it
        touch.pressedKeys = new Set<string>(Array.isArray(pk) ? pk : []);
      }
      return touch.pressedKeys.has(noteKey);
    };

    const hasActiveTouch = (touchId: KeyboardPressId): boolean => {
      ensureTouchCollections();
      return touch.activeTouches.has(touchId);
    };

    const activateVisualNote = (
      activationId: KeyboardPressId,
      noteKey: string
    ) => {
      ensureVisualCollections();

      const existingNoteKey = visual.activeActivations.get(activationId);
      if (existingNoteKey === noteKey) {
        return;
      }

      if (existingNoteKey) {
        releaseVisualNote(activationId);
      }

      visual.activeActivations.set(activationId, noteKey);
      visual.noteKeyCounts.set(noteKey, (visual.noteKeyCounts.get(noteKey) || 0) + 1);
    };

    const releaseVisualNote = (activationId: KeyboardPressId) => {
      ensureVisualCollections();

      const noteKey = visual.activeActivations.get(activationId);
      if (!noteKey) {
        return;
      }

      visual.activeActivations.delete(activationId);

      const nextCount = (visual.noteKeyCounts.get(noteKey) || 0) - 1;
      if (nextCount > 0) {
        visual.noteKeyCounts.set(noteKey, nextCount);
      } else {
        visual.noteKeyCounts.delete(noteKey);
      }
    };

    const clearVisualNotes = () => {
      ensureVisualCollections();
      visual.activeActivations.clear();
      visual.noteKeyCounts.clear();
    };

    const isVisualNoteActive = (noteKey: string): boolean => {
      ensureVisualCollections();
      return (visual.noteKeyCounts.get(noteKey) || 0) > 0;
    };

    const isKeyVisuallyActive = (noteKey: string): boolean => {
      const activeNoteFromStore = musicStore.getActiveNotes().some(
        (note) => `${note.solfegeIndex}_${note.octave}` === noteKey
      );

      return (
        isKeyPressed(noteKey)
        || isVisualNoteActive(noteKey)
        || activeNoteFromStore
      );
    };

    // Actions for keyboard configuration (layout only - styling via visual config)
    const updateKeyboardConfig = (
      updates: Partial<typeof keyboardConfig.value>
    ) => {
      visualConfigStore.updateConfig("keyboard", updates);
    };

    const setMainOctave = (octave: number) => {
      const clampedOctave = Math.max(1, Math.min(8, octave));
      updateKeyboardConfig({ mainOctave: clampedOctave });

      // Also update music store for backward compatibility
      musicStore.setKey(musicStore.currentKey);
    };

    const setRowCount = (count: number) => {
      const clampedCount = Math.max(1, Math.min(8, count));
      updateKeyboardConfig({ rowCount: clampedCount });
    };

    const refreshMidiSupport = () => {
      midi.isSupported = isMidiSupported();

      if (!midi.isSupported) {
        midi.isConnecting = false;
        midi.isListening = false;
        midi.connectedInputs = [];
        midi.connectedOutputs = [];
        midi.syncedOutput = null;
        midi.lastError = null;
      }
    };

    const setMidiConnecting = (isConnecting: boolean) => {
      midi.isConnecting = isConnecting;
    };

    const setMidiListening = (isListening: boolean) => {
      midi.isListening = isListening;

      if (!isListening) {
        midi.connectedInputs = [];
        midi.connectedOutputs = [];
        midi.syncedOutput = null;
      }
    };

    const setMidiInputs = (inputs: string[]) => {
      midi.connectedInputs = inputs;
    };

    const setMidiOutputs = (outputs: string[]) => {
      midi.connectedOutputs = outputs;
    };

    const setMidiSyncedOutput = (output: string | null) => {
      midi.syncedOutput = output;
    };

    const setMidiError = (message: string | null) => {
      midi.lastError = message;
    };

    return {
      // State
      drawer,
      touch,
      visual,
      midi,

      // Computed
      keyboardConfig,
      visibleOctaves,
      solfegeData,

      // Drawer actions
      openDrawer,
      closeDrawer,
      toggleDrawer,

      // Touch actions
      addTouch,
      removeTouch,
      clearAllTouches,
      clearTouchesForNoteKey,
      hasActiveTouch,
      isKeyPressed,
      activateVisualNote,
      releaseVisualNote,
      clearVisualNotes,
      isVisualNoteActive,
      isKeyVisuallyActive,

      // Configuration actions (layout only)
      updateKeyboardConfig,
      setMainOctave,
      setRowCount,
      refreshMidiSupport,
      setMidiConnecting,
      setMidiListening,
      setMidiInputs,
      setMidiOutputs,
      setMidiSyncedOutput,
      setMidiError,
    };
  },
  {
    persist: {
      key: "emotitone-keyboard-drawer",
      storage: localStorage,
      pick: ["drawer.isOpen"],
    },
  }
);
