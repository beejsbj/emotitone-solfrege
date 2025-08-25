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
    @focus="handleFocus"
    @blur="handleBlur"
  >
    <!-- Labels -->
    <div v-if="config.showLabels" :class="labelContainerClasses">
      <template v-if="isMainOctave">
        <div :class="mainSolfegeLabelClasses">{{ solfege.name }}</div>
        <div :class="mainNoteLabelClasses">{{ noteName }}</div>
      </template>
      <template v-else>
        <div :class="noteOnlyLabelClasses">{{ noteName }}</div>
      </template>
    </div>

    <!-- Visual feedback overlay -->
    <div ref="overlayRef" :class="overlayClasses" />
  </button>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useSolfegeInteraction } from "@/composables/useSolfegeInteraction";
import { useColorSystem } from "@/composables/useColorSystem";
import useGSAP from "@/composables/useGSAP";
import { triggerNoteHaptic } from "@/utils/hapticFeedback";
import type { SolfegeData } from "@/types/music";
import { useMusicStore } from "@/stores/music";

/**
 * Component props
 */
interface Props {
  /** Solfège data for this key */
  solfege: SolfegeData;
  /** Octave number for this key */
  octave: number;
  /** Whether this is the main octave */
  isMainOctave?: boolean;
  /** Solfège index (0-6) */
  solfegeIndex: number;
}

const props = withDefaults(defineProps<Props>(), {
  isMainOctave: false,
});

// Store and composables
const store = useKeyboardDrawerStore();
const musicStore = useMusicStore();
const { attackNoteWithOctave, releaseNoteByButtonKey } =
  useSolfegeInteraction();
const { getPrimaryColor, createGlassmorphBackground } = useColorSystem();

// Component refs
const keyRef = ref<HTMLElement | null>(null);
const overlayRef = ref<HTMLElement | null>(null);

// Key configuration from store
const config = computed(() => store.keyboardConfig);

// Note key for tracking
const noteKey = computed(() => `${props.solfegeIndex}_${props.octave}`);

// Computed actual note name (e.g., C#5) - reactive to current key/mode
const noteName = computed(() => {
  // Ensure reactivity to music store changes
  const currentKey = musicStore.currentKey;
  const currentMode = musicStore.currentMode;
  return musicStore.getNoteName(props.solfegeIndex, props.octave);
});

// Whether this note is an accidental (#)
const isAccidental = computed(() => {
  return noteName.value.includes("#");
});

// Press state
const isPressed = computed(() => store.isKeyPressed(noteKey.value));
const isFocused = ref(false);

// Color system - get current mode
const currentMode = computed(() => {
  return store.solfegeData[0] ? "major" : "minor";
});

// Styling computations
const keyClasses = computed(() => {
  const baseClasses = [
    // Base button styles
    "relative flex items-center justify-center",
    "font-bold transition-all duration-150 ease-out",
    "select-none touch-manipulation",
    // Performance optimizations
    "will-change-transform contain-layout",
  ];

  // Shape classes - using numeric border radius
  const shapeClasses = `rounded-[${config.value.keyShape}px]`;

  // Gap classes
  const gapClasses =
    {
      none: "m-0",
      small: "m-0.5",
      medium: "m-1",
    }[config.value.keyGaps] || "m-0.5";

  // Color mode classes
  let colorClasses;
  if (config.value.colorMode === "glassmorphism") {
    colorClasses = "backdrop-blur-md shadow-lg";
  } else if (config.value.colorMode === "monochrome") {
    colorClasses = "shadow-inner border border-gray-300";
  } else {
    colorClasses = "shadow-lg";
  }

  // State classes
  const stateClasses = [];
  if (props.isMainOctave) stateClasses.push("");
  if (isPressed.value) stateClasses.push("shadow-inner scale-95");
  if (isFocused.value && !isPressed.value) stateClasses.push("");

  return [
    ...baseClasses,
    shapeClasses,
    gapClasses,
    colorClasses,
    ...stateClasses,
  ];
});

const labelContainerClasses = computed(() => [
  "z-10 relative select-none pointer-events-none",
  "flex flex-col items-center justify-center",
]);

const mainSolfegeLabelClasses = computed(() => {
  let color;
  if (config.value.colorMode === "colored") {
    color = isAccidental.value ? "text-black" : "text-white";
  } else if (config.value.colorMode === "monochrome") {
    // Monochrome: accidentals are white keys with black text, naturals are black keys with white text
    color = isAccidental.value ? "text-black" : "text-white";
  } else if (config.value.colorMode === "glassmorphism") {
    color = isAccidental.value ? "text-black" : "text-white";
  } else {
    color = "text-white"; // fallback
  }
  return ["text-sm font-bold leading-tight", color];
});

const mainNoteLabelClasses = computed(() => {
  let color;
  if (config.value.colorMode === "colored") {
    color = isAccidental.value ? "text-black/80" : "text-white/90";
  } else if (config.value.colorMode === "monochrome") {
    // Monochrome: accidentals are white keys with black text, naturals are black keys with white text
    color = isAccidental.value ? "text-black/80" : "text-white/80";
  } else if (config.value.colorMode === "glassmorphism") {
    color = isAccidental.value ? "text-black/80" : "text-white/90";
  } else {
    color = "text-white/90"; // fallback
  }
  return ["text-[0.65rem] mt-0.5", color];
});

const noteOnlyLabelClasses = computed(() => {
  let color;
  if (config.value.colorMode === "colored") {
    color = isAccidental.value ? "text-black" : "text-white";
  } else if (config.value.colorMode === "monochrome") {
    // Monochrome: accidentals are white keys with black text, naturals are black keys with white text
    color = isAccidental.value ? "text-black" : "text-white";
  } else if (config.value.colorMode === "glassmorphism") {
    color = isAccidental.value ? "text-black" : "text-white";
  } else {
    color = "text-white"; // fallback
  }
  return ["text-xs font-bold", color];
});

const overlayClasses = computed(() => {
  const baseClasses = [
    "absolute inset-0 z-0 pointer-events-none",
    "transition-opacity duration-150",
    `rounded-[${config.value.keyShape}px]`,
  ];

  const stateClasses = [];
  if (isPressed.value) {
    stateClasses.push("bg-white/20");
  } else if (isFocused.value) {
    stateClasses.push("bg-white/10");
  } else {
    stateClasses.push("opacity-0");
  }

  return [...baseClasses, ...stateClasses];
});

const keyStyles = computed(() => {
  const size = config.value.keySize;

  const styles: Record<string, any> = {
    // Size scaling
    "--key-size": `${size}`,

    // Dynamic styles
    height: props.isMainOctave ? `${56 * size}px` : `${44 * size}px`,
    minWidth: `${44 * size}px`,

    // Touch target size (always maintain minimum)
    minHeight: "44px",
  };

  // Background styling based on color mode
  if (config.value.colorMode === "colored") {
    try {
      const primaryColor = getPrimaryColor(
        props.solfege.name,
        currentMode.value,
        props.octave
      );

      if (primaryColor) {
        // Apply brightness and saturation adjustments
        const adjustedPrimary = adjustColorForConfig(
          primaryColor,
          config.value.keyBrightness,
          config.value.keySaturation
        );

        styles.background = adjustedPrimary;
        styles.backgroundColor = adjustedPrimary;
        styles["--key-primary"] = adjustedPrimary;
      } else {
        // Fallback to default color if color system fails
        styles.background = "hsla(200, 70%, 50%, 1)";
        styles.backgroundColor = "hsla(200, 70%, 50%, 1)";
        styles["--key-primary"] = "hsla(200, 70%, 50%, 1)";
      }
    } catch (error) {
      console.error("Error in colored mode:", error);
      // Fallback
      styles.background = "hsla(200, 70%, 50%, 1)";
      styles.backgroundColor = "hsla(200, 70%, 50%, 1)";
    }
  } else if (config.value.colorMode === "glassmorphism") {
    try {
      const primaryColor = getPrimaryColor(
        props.solfege.name,
        currentMode.value,
        props.octave
      );

      if (primaryColor && createGlassmorphBackground) {
        const glassmorphBg = createGlassmorphBackground(
          primaryColor,
          config.value.glassmorphOpacity
        );

        if (glassmorphBg) {
          styles.background = glassmorphBg;
          styles["--key-primary"] = primaryColor;
        } else {
          // Fallback: use primary color with opacity
          const fallbackBg = primaryColor.replace(
            /,[^,]*\)$/,
            `, ${config.value.glassmorphOpacity})`
          );
          styles.background = fallbackBg;
          styles["--key-primary"] = primaryColor;
        }
      } else {
        // Fallback to semi-transparent color
        styles.background = `hsla(200, 70%, 50%, ${config.value.glassmorphOpacity})`;
        styles["--key-primary"] = "hsla(200, 70%, 50%, 1)";
      }
    } catch (error) {
      console.error("Error in glassmorphism mode:", error);
      // Fallback
      styles.background = `hsla(200, 70%, 50%, ${config.value.glassmorphOpacity})`;
    }
  } else {
    // Monochrome mode: white for accidentals, black for naturals
    const backgroundColor = isAccidental.value
      ? "hsla(0, 0%, 100%, 1)"
      : "hsla(0, 0%, 10%, 1)";
    const adjustedColor = adjustColorForConfig(
      backgroundColor,
      config.value.keyBrightness,
      config.value.keySaturation
    );

    styles.backgroundColor = adjustedColor;
    styles.background = adjustedColor;
    styles["--key-primary"] = adjustedColor;
  }

  return styles;
});

// Accessibility label
const ariaLabel = computed(() => {
  const mainSuffix = props.isMainOctave ? ", main octave" : "";
  return props.isMainOctave
    ? `${props.solfege.name} (${noteName.value})${mainSuffix}`
    : `${noteName.value}`;
});

// Color adjustment utility
function adjustColorForConfig(
  color: string,
  brightness: number,
  saturation: number
): string {
  // Parse HSLA color
  const hslaMatch = color.match(
    /hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)/
  );
  if (!hslaMatch) return color;

  const [, h, s, l, a = "1"] = hslaMatch;
  const adjustedS = Math.max(0, Math.min(100, parseFloat(s) * saturation));
  const adjustedL = Math.max(0, Math.min(100, parseFloat(l) * brightness));

  return `hsla(${h}, ${adjustedS}%, ${adjustedL}%, ${a})`;
}

// Animation functions
let animatePress: (() => void) | null = null;
let animateRelease: (() => void) | null = null;

// GSAP animations setup
useGSAP(({ gsap }) => {
  if (!keyRef.value || !overlayRef.value) return;

  // Set initial state
  gsap.set(overlayRef.value, {
    scale: 1,
    opacity: 0,
  });

  animatePress = () => {
    if (!keyRef.value || !overlayRef.value) return;

    // Scale and brighten on press
    gsap.to(keyRef.value, {
      scale: 0.95,
      duration: 0.1,
      ease: "power2.out",
    });

    gsap.to(overlayRef.value, {
      opacity: 0.3,
      scale: 0.9,
      duration: 0.1,
      ease: "power2.out",
    });
  };

  animateRelease = () => {
    if (!keyRef.value || !overlayRef.value) return;

    // Return to normal state
    gsap.to(keyRef.value, {
      scale: 1,
      duration: 0.2,
      ease: "back.out(1.2)",
    });

    gsap.to(overlayRef.value, {
      opacity: 0,
      scale: 1,
      duration: 0.2,
      ease: "power2.out",
    });
  };
});

// Touch and mouse event handlers
const handleTouchStart = async (event: TouchEvent) => {
  if (!config.value.hapticFeedback) {
    event.preventDefault();
  }

  const touch = event.touches[0];
  const touchId = touch.identifier;

  // Add to store tracking
  store.addTouch(touchId, noteKey.value);

  // Trigger haptic feedback
  if (config.value.hapticFeedback) {
    triggerNoteHaptic();
  }

  // Trigger audio
  await attackNoteWithOctave(props.solfegeIndex, props.octave, event);

  // Animate press
  animatePress?.();
};

const handleTouchEnd = (event: TouchEvent) => {
  event.preventDefault();

  for (const touch of Array.from(event.changedTouches)) {
    const touchId = touch.identifier;

    // Check if this touch was tracking our key
    if (store.touch.activeTouches.get(touchId) === noteKey.value) {
      // Remove from store tracking
      store.removeTouch(touchId);

      // Release audio
      releaseNoteByButtonKey(noteKey.value, event);

      // Animate release
      animateRelease?.();
    }
  }
};

const handleTouchCancel = (event: TouchEvent) => {
  // Handle like touch end
  handleTouchEnd(event);
};

const handleMouseDown = async (event: MouseEvent) => {
  // Add tracking (use negative number for mouse to distinguish from touches)
  store.addTouch(-1, noteKey.value);

  // Trigger haptic feedback
  if (config.value.hapticFeedback) {
    triggerNoteHaptic();
  }

  // Trigger audio
  await attackNoteWithOctave(props.solfegeIndex, props.octave, event);

  // Animate press
  animatePress?.();
};

const handleMouseUp = (event: MouseEvent) => {
  // Remove tracking
  store.removeTouch(-1);

  // Release audio
  releaseNoteByButtonKey(noteKey.value, event);

  // Animate release
  animateRelease?.();
};

const handleMouseLeave = (event: MouseEvent) => {
  // Handle like mouse up to prevent stuck notes
  if (store.touch.activeTouches.has(-1)) {
    handleMouseUp(event);
  }
};

const handleFocus = () => {
  isFocused.value = true;
};

const handleBlur = () => {
  isFocused.value = false;
};

// Keyboard event listeners for physical keyboard integration
const handleKeyboardPress = (event: CustomEvent) => {
  const { solfegeIndex, octave } = event.detail;

  // Check if this matches our key
  if (solfegeIndex === props.solfegeIndex && octave === props.octave) {
    // Add visual feedback without triggering audio (keyboard controls handle that)
    store.touch.pressedKeys.add(noteKey.value);

    // Animate press
    animatePress?.();
  }
};

const handleKeyboardRelease = (event: CustomEvent) => {
  const { key } = event.detail;

  // For keyboard releases, we need to determine which key was released
  // This is handled by the keyboard controls composable
  if (store.touch.pressedKeys.has(noteKey.value)) {
    store.touch.pressedKeys.delete(noteKey.value);

    // Animate release
    animateRelease?.();
  }
};

// Setup and cleanup
onMounted(() => {
  // Listen for keyboard events for visual feedback
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
  // Clean up any active touches
  store.clearAllTouches();

  // Remove event listeners
  window.removeEventListener(
    "keyboard-note-pressed",
    handleKeyboardPress as EventListener
  );
  window.removeEventListener(
    "keyboard-note-released",
    handleKeyboardRelease as EventListener
  );
});

// For programmatic access (e.g., from parent components)
defineExpose({
  noteKey,
  isPressed,
  triggerPress: () => handleMouseDown(new MouseEvent("mousedown")),
  triggerRelease: () => handleMouseUp(new MouseEvent("mouseup")),
});
</script>

<style scoped>
/* Vendor-specific optimizations that can't be done with Tailwind */
button {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
}

/* Responsive text size adjustments */
@media (max-width: 480px) {
  button {
    font-size: 0.875rem;
    line-height: 1.25rem;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  button {
    border-width: 2px;
    border-color: #374151;
  }

  button.text-gray-800 {
    background-color: white;
    color: black;
    border-color: black;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  button {
    transition: none;
  }
}
</style>
