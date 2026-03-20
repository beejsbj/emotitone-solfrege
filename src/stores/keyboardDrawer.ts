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

export interface MidiState {
  /** Whether the browser exposes the Web MIDI API */
  isSupported: boolean;
  /** Whether a MIDI connection request is in flight */
  isConnecting: boolean;
  /** Whether the app has active MIDI access and is listening for inputs */
  isListening: boolean;
  /** Names of currently connected MIDI inputs */
  connectedInputs: string[];
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

    const midi = reactive<MidiState>({
      isSupported: isMidiSupported(),
      isConnecting: false,
      isListening: false,
      connectedInputs: [],
      lastError: null,
    });

    // Defensive: ensure correct types after persisted hydration or HMR
    if (!(touch.activeTouches instanceof Map)) {
      touch.activeTouches = new Map();
    }
    if (!(touch.pressedKeys instanceof Set)) {
      touch.pressedKeys = new Set();
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

    const isKeyPressed = (noteKey: string): boolean => {
      const pk: any = touch.pressedKeys as any;
      if (!(pk instanceof Set) || typeof pk.has !== "function") {
        // Rehydrate to a proper Set if hydration corrupted it
        touch.pressedKeys = new Set<string>(Array.isArray(pk) ? pk : []);
      }
      return touch.pressedKeys.has(noteKey);
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
      }
    };

    const setMidiInputs = (inputs: string[]) => {
      midi.connectedInputs = inputs;
    };

    const setMidiError = (message: string | null) => {
      midi.lastError = message;
    };

    return {
      // State
      drawer,
      touch,
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
      isKeyPressed,

      // Configuration actions (layout only)
      updateKeyboardConfig,
      setMainOctave,
      setRowCount,
      refreshMidiSupport,
      setMidiConnecting,
      setMidiListening,
      setMidiInputs,
      setMidiError,
    };
  },
  {
    persist: {
      key: "emotitone-keyboard-drawer",
      storage: localStorage,
    },
  }
);
