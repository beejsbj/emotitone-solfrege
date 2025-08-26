<template>
  <button
    ref="keyRef"
    :class="keyClasses"
    :style="keyStyles"
    :aria-label="ariaLabel"
    :aria-pressed="isPressed"
    @touchstart.prevent="handleTouchStart"
    @touchend.prevent="handleTouchEnd"
    @touchcancel.prevent="handleTouchCancel"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
    @focus="isFocused = true"
    @blur="isFocused = false"
  >
    <!-- Labels -->
    <div
      v-if="config.showLabels"
      class="relative z-10 flex flex-col items-center justify-center pointer-events-none"
    >
      <template v-if="isMainOctave">
        <div
          :class="['font-bold leading-[12px]', labelColor]"
          :style="mainLabelStyles"
        >
          {{ solfege.name }}
        </div>
        <div :class="['mt-0.5', labelColor]" :style="subLabelStyles">
          {{ noteName }}
        </div>
      </template>
      <div
        v-else
        :class="['font-bold leading-[0]', labelColor]"
        :style="secondaryLabelStyles"
      >
        {{ noteName }}
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useSolfegeInteraction } from "@/composables/useSolfegeInteraction";
import { useColorSystem } from "@/composables/useColorSystem";
import { useMusicStore } from "@/stores/music";
import { triggerNoteHaptic } from "@/utils/hapticFeedback";
import type { SolfegeData } from "@/types/music";

interface Props {
  solfege: SolfegeData;
  octave: number;
  isMainOctave?: boolean;
  solfegeIndex: number;
}

const props = withDefaults(defineProps<Props>(), {
  isMainOctave: false,
});

// Stores and composables
const store = useKeyboardDrawerStore();
const musicStore = useMusicStore();
const { attackNoteWithOctave, releaseNoteByButtonKey } =
  useSolfegeInteraction();
const { getKeyBackground, getKeyTextColor } = useColorSystem();

// Component state
const keyRef = ref<HTMLElement | null>(null);
const isFocused = ref(false);

// Configuration
const config = computed(() => store.keyboardConfig);

// Note tracking
const noteKey = computed(() => `${props.solfegeIndex}_${props.octave}`);
const noteName = computed(() => {
  // Make sure we're reactive to key and mode changes
  const key = musicStore.currentKey;
  const mode = musicStore.currentMode;
  // Force re-evaluation when key or mode changes
  return musicStore.getNoteName(props.solfegeIndex, props.octave);
});
const isAccidental = computed(() => noteName.value.includes("#"));
const isPressed = computed(() => store.isKeyPressed(noteKey.value));
const currentMode = computed(() => musicStore.currentMode);

// Get background and colors from color system
const keyColors = computed(() => {
  // Make sure we're reactive to key changes (affects color system)
  const key = musicStore.currentKey;
  return getKeyBackground(
    props.solfege.name,
    currentMode.value,
    props.octave,
    config.value.colorMode,
    isAccidental.value,
    {
      keyBrightness: config.value.keyBrightness,
      keySaturation: config.value.keySaturation,
      glassmorphOpacity: config.value.glassmorphOpacity,
    }
  );
});

// Text colors
const labelColor = computed(() =>
  getKeyTextColor(config.value.colorMode, isAccidental.value)
);
const labelColorSecondary = computed(() => {
  const base = getKeyTextColor(config.value.colorMode, isAccidental.value);
  return base.replace("text-", "text-") + "/80";
});

// Font size styles based on keySize multiplier
const mainLabelStyles = computed(() => ({
  fontSize: `${0.875 * config.value.keySize}rem`, // Base 14px (text-sm)
}));

const subLabelStyles = computed(() => ({
  fontSize: `${0.65 * config.value.keySize}rem`, // Base ~10.4px
}));

const secondaryLabelStyles = computed(() => ({
  fontSize: `${0.75 * config.value.keySize}rem`, // Base 12px (text-xs)
}));

// Dynamic key sizing based on font size
const keyStyles = computed(() => {
  const baseHeight = props.isMainOctave ? 3.5 : 2.75; // rem units
  const scaledHeight = baseHeight * config.value.keySize;
  const minHeight = 2.75; // Minimum 44px touch target

  return {
    height: `${Math.max(scaledHeight, minHeight)}rem`,
    minWidth: "2.75rem", // 44px min touch target
    padding: `${0.5 * config.value.keySize}rem ${
      0.75 * config.value.keySize
    }rem`,
  };
});

// Dynamic classes
const keyClasses = computed(() => {
  const baseClasses = [
    // Base styles
    "relative flex items-center justify-center",
    "font-bold transition-all duration-150 ease-out",
    "select-none touch-manipulation",
  ];

  // Dynamic sizing based on font size
  const sizeClasses = props.isMainOctave
    ? "" // Size handled by dynamic styles
    : ""; // Size handled by dynamic styles

  // Border radius class
  const radiusClass = (() => {
    const radius = config.value.keyShape;
    if (radius === 0) return "rounded-none";
    if (radius <= 4) return "rounded-sm";
    if (radius <= 8) return "rounded-md";
    if (radius <= 12) return "rounded-lg";
    if (radius <= 16) return "rounded-xl";
    if (radius <= 20) return "rounded-2xl";
    if (radius <= 50) return "rounded-full";
    return "rounded-2xl";
  })();

  // Color mode specific classes
  const colorModeClasses =
    {
      glassmorphism: "backdrop-blur-md shadow-lg",
      monochrome: "shadow-inner border border-gray-300",
      colored: "shadow-lg",
    }[config.value.colorMode] || "shadow-lg";

  // State classes
  const stateClasses = [];
  if (isPressed.value) stateClasses.push("shadow-inner scale-95");
  if (isFocused.value && !isPressed.value)
    stateClasses.push("ring-2 ring-offset-2 ring-blue-400/30");

  return [
    ...baseClasses,
    sizeClasses,
    radiusClass,
    colorModeClasses,
    ...stateClasses,
  ].filter(Boolean);
});

// Accessibility
const ariaLabel = computed(() => {
  const suffix = props.isMainOctave ? ", main octave" : "";
  return props.isMainOctave
    ? `${props.solfege.name} (${noteName.value})${suffix}`
    : noteName.value;
});

// Event handlers
const handleTouchStart = async (event: TouchEvent) => {
  const touch = event.touches[0];
  const touchId = touch.identifier;

  store.addTouch(touchId, noteKey.value);

  if (config.value.hapticFeedback) {
    triggerNoteHaptic();
  }

  await attackNoteWithOctave(props.solfegeIndex, props.octave, event);
};

const handleTouchEnd = (event: TouchEvent) => {
  for (const touch of Array.from(event.changedTouches)) {
    const touchId = touch.identifier;

    if (store.touch.activeTouches.get(touchId) === noteKey.value) {
      store.removeTouch(touchId);
      releaseNoteByButtonKey(noteKey.value, event);
    }
  }
};

const handleTouchCancel = handleTouchEnd;

const handleMouseDown = async (event: MouseEvent) => {
  store.addTouch(-1, noteKey.value);

  if (config.value.hapticFeedback) {
    triggerNoteHaptic();
  }

  await attackNoteWithOctave(props.solfegeIndex, props.octave, event);
};

const handleMouseUp = (event: MouseEvent) => {
  store.removeTouch(-1);
  releaseNoteByButtonKey(noteKey.value, event);
};

const handleMouseLeave = (event: MouseEvent) => {
  if (store.touch.activeTouches.has(-1)) {
    handleMouseUp(event);
  }
};

// Keyboard event handlers for visual feedback
const handleKeyboardPress = (event: CustomEvent) => {
  const { solfegeIndex, octave } = event.detail;

  if (solfegeIndex === props.solfegeIndex && octave === props.octave) {
    store.touch.pressedKeys.add(noteKey.value);
  }
};

const handleKeyboardRelease = (event: CustomEvent) => {
  if (store.touch.pressedKeys.has(noteKey.value)) {
    store.touch.pressedKeys.delete(noteKey.value);
  }
};

// Lifecycle
onMounted(() => {
  window.addEventListener(
    "keyboard-note-pressed",
    handleKeyboardPress as EventListener
  );
  window.addEventListener(
    "keyboard-note-released",
    handleKeyboardRelease as EventListener
  );
});

onUnmounted(() => {
  store.clearAllTouches();
  window.removeEventListener(
    "keyboard-note-pressed",
    handleKeyboardPress as EventListener
  );
  window.removeEventListener(
    "keyboard-note-released",
    handleKeyboardRelease as EventListener
  );
});

// Expose for parent components
defineExpose({
  noteKey,
  isPressed,
  triggerPress: () => handleMouseDown(new MouseEvent("mousedown")),
  triggerRelease: () => handleMouseUp(new MouseEvent("mouseup")),
});
</script>

<style scoped>
/* Vendor-specific optimizations */
button {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  background: v-bind("keyColors.background");
  border-radius: v-bind('config.keyShape + "px"');
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  button {
    @apply border-2;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  button {
    @apply transition-none;
  }
}
</style>
