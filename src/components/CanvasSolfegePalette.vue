<template>
  <div class="canvas-solfege-palette relative">
    <!-- Dedicated palette canvas -->
    <canvas
      ref="paletteCanvasRef"
      class="palette-canvas"
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @mousemove="handleMouseMove"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
      @touchmove="handleTouchMove"
    />

    <!-- Floating popup -->
    <FloatingPopup />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { usePalette } from "@/composables/palette";
import { useKeyboardControls } from "@/composables/useKeyboardControls";
import FloatingPopup from "./FloatingPopup.vue";

// Canvas setup
const paletteCanvasRef = ref<HTMLCanvasElement | null>(null);
const paletteWidth = ref(window.innerWidth);
const paletteHeight = ref(240); // Height for controls (20px) + 3 octave rows (80+56+56 = 192px) + padding

// High-DPI support
const devicePixelRatio = window.devicePixelRatio || 1;

// Animation frame
let animationId: number | null = null;
let needsRedraw = ref(true);

// Create a temporary ref for main octave to initialize keyboard controls
const tempMainOctave = ref(4);

// Setup keyboard controls with visual feedback integration
const keyboardControls = useKeyboardControls(tempMainOctave);

// Palette system (now modular) - pass keyboard letter function to avoid duplicate instances
const palette = usePalette(keyboardControls.getKeyboardLetterForNote);

// Expose palette state for external control (like keyboard controls)
const mainOctave = computed({
  get: () => palette.paletteState.value.mainOctave,
  set: (value: number) => {
    palette.setMainOctave(value);
    needsRedraw.value = true;
  },
});

// Update the temp ref to sync with palette state
watch(
  mainOctave,
  (newValue) => {
    tempMainOctave.value = newValue;
  },
  { immediate: true }
);

// Connect keyboard events to palette visual feedback
const handleKeyboardPress = (event: CustomEvent) => {
  const { solfegeIndex, octave } = event.detail;
  palette.handleKeyboardPress(solfegeIndex, octave);
  needsRedraw.value = true;
};

const handleKeyboardRelease = (event: CustomEvent) => {
  const { key } = event.detail;

  // Get the keyboard mapping to find which note this key corresponds to
  const mapping = keyboardControls.getKeyboardMapping();
  const noteMapping = mapping[key];

  if (noteMapping) {
    // Release the specific button for this key
    palette.handleKeyboardRelease(noteMapping.solfegeIndex, noteMapping.octave);
  } else {
    // Fallback: release all if we can't determine the specific key
    palette.handleKeyboardRelease();
  }

  needsRedraw.value = true;
};

/**
 * Setup canvas for high-DPI displays
 */
const setupHighDPICanvas = () => {
  if (!paletteCanvasRef.value) return;

  const canvas = paletteCanvasRef.value;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Get the display size (CSS pixels)
  const displayWidth = paletteWidth.value;
  const displayHeight = paletteHeight.value;

  // Set the actual canvas size in memory (scaled up for high-DPI)
  canvas.width = displayWidth * devicePixelRatio;
  canvas.height = displayHeight * devicePixelRatio;

  // Scale the canvas back down using CSS
  canvas.style.width = displayWidth + "px";
  canvas.style.height = displayHeight + "px";

  // Scale the drawing context so everything draws at the correct size
  ctx.scale(devicePixelRatio, devicePixelRatio);

  // Enable high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
};

/**
 * Render palette with animation support
 */
const renderPalette = (currentTime?: number) => {
  if (!paletteCanvasRef.value) return;

  const ctx = paletteCanvasRef.value.getContext("2d");
  if (!ctx) return;

  // Clear canvas using logical dimensions (the context is already scaled)
  ctx.clearRect(0, 0, paletteWidth.value, paletteHeight.value);

  // Render palette with current time for animations
  palette.renderPalette(ctx, currentTime);

  // Check if we need to continue animating
  const isAnimating = palette.animationState.value.isAnimating;
  if (isAnimating || needsRedraw.value) {
    needsRedraw.value = false;
  }
};

/**
 * Animation loop (always running for smooth animations)
 */
const animate = (currentTime: number) => {
  renderPalette(currentTime);
  animationId = requestAnimationFrame(animate);
};

/**
 * Get palette canvas coordinates from event
 */
const getPaletteCoordinates = (
  event: MouseEvent | TouchEvent
): { x: number; y: number } => {
  if (!paletteCanvasRef.value) return { x: 0, y: 0 };

  const rect = paletteCanvasRef.value.getBoundingClientRect();

  if (event instanceof MouseEvent) {
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  } else {
    const touch = event.touches[0] || event.changedTouches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }
};

/**
 * Get palette canvas coordinates from a specific touch
 */
const getTouchCoordinates = (touch: Touch): { x: number; y: number } => {
  if (!paletteCanvasRef.value) return { x: 0, y: 0 };

  const rect = paletteCanvasRef.value.getBoundingClientRect();
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  };
};

/**
 * Mouse event handlers
 */
const handleMouseDown = (event: MouseEvent) => {
  const { x, y } = getPaletteCoordinates(event);
  const handled = palette.handlePointerDown(x, y, event);
  if (handled) {
    needsRedraw.value = true;
  }
};

const handleMouseUp = (event: MouseEvent) => {
  const { x, y } = getPaletteCoordinates(event);
  palette.handlePointerUp(x, y, event);
  needsRedraw.value = true;
};

// Global mouse up handler to catch releases outside canvas
const handleGlobalMouseUp = (event: MouseEvent) => {
  if (
    palette.paletteState.value.isDragging ||
    palette.paletteState.value.isResizing
  ) {
    palette.handlePointerUp(0, 0, event);
    needsRedraw.value = true;
  }
};

const handleMouseMove = (event: MouseEvent) => {
  if (palette.paletteState.value.isResizing) {
    const { y } = getPaletteCoordinates(event);
    const deltaY = y - palette.paletteState.value.dragStartY; // Fixed: drag up = negative, drag down = positive
    palette.handleResizeDrag(deltaY);

    // Update canvas height to match palette height
    paletteHeight.value = palette.paletteState.value.height;
    setupHighDPICanvas(); // Re-setup canvas for new height
    needsRedraw.value = true;
  }
};

/**
 * Touch event handlers
 */
const handleTouchStart = (event: TouchEvent) => {
  event.preventDefault();

  // Process all new touches
  for (let i = 0; i < event.touches.length; i++) {
    const touch = event.touches[i];
    const { x, y } = getTouchCoordinates(touch);

    // Check if this is a button hit
    const buttonHit = palette.hitTestButton(x, y);
    if (buttonHit) {
      palette.handleTouchButtonPress(buttonHit, touch.identifier, event);
      needsRedraw.value = true;
    } else {
      // Check for control hits (for resizing, etc.)
      const controlHit = palette.hitTestControl(x, y);
      if (controlHit) {
        // Store initial position for dragging/resizing
        palette.paletteState.value.dragStartY = y;
        palette.handleControlPress(controlHit, event);
        needsRedraw.value = true;
      }
    }
  }
};

const handleTouchEnd = (event: TouchEvent) => {
  event.preventDefault();

  // Process all ended touches
  for (let i = 0; i < event.changedTouches.length; i++) {
    const touch = event.changedTouches[i];
    palette.handleTouchButtonRelease(touch.identifier, event);
  }

  // Handle resize end if no more touches
  if (event.touches.length === 0 && palette.paletteState.value.isResizing) {
    palette.paletteState.value.isResizing = false;
    palette.paletteState.value.isDragging = false;
  }

  needsRedraw.value = true;
};

// Global touch end handler to catch releases outside canvas
const handleGlobalTouchEnd = (event: TouchEvent) => {
  // Process all ended touches
  for (let i = 0; i < event.changedTouches.length; i++) {
    const touch = event.changedTouches[i];
    palette.handleTouchButtonRelease(touch.identifier, event);
  }

  // Handle resize/drag end if no more touches
  if (event.touches.length === 0) {
    if (
      palette.paletteState.value.isResizing ||
      palette.paletteState.value.isDragging
    ) {
      palette.paletteState.value.isResizing = false;
      palette.paletteState.value.isDragging = false;
      needsRedraw.value = true;
    }
  }
};

const handleTouchMove = (event: TouchEvent) => {
  event.preventDefault();
  if (palette.paletteState.value.isResizing) {
    const { y } = getPaletteCoordinates(event);
    const deltaY = y - palette.paletteState.value.dragStartY; // Fixed: drag up = negative, drag down = positive
    palette.handleResizeDrag(deltaY);

    // Update canvas height to match palette height
    paletteHeight.value = palette.paletteState.value.height;
    setupHighDPICanvas(); // Re-setup canvas for new height
    needsRedraw.value = true;
  }
};

/**
 * Handle window resize
 */
const handleResize = () => {
  paletteWidth.value = window.innerWidth;
  setupHighDPICanvas(); // Re-setup canvas for new dimensions
  palette.updateDimensions(paletteWidth.value, paletteHeight.value);
  needsRedraw.value = true;
};

/**
 * Watch for changes that require redraw
 */
watch(
  () => [
    palette.paletteState.value.mainOctave,
    palette.paletteState.value.height,
  ],
  () => {
    needsRedraw.value = true;
  },
  { deep: true }
);

/**
 * Initialize
 */
onMounted(() => {
  // Setup high-DPI canvas first
  setupHighDPICanvas();

  // Set palette to full width and position at origin (canvas fills its container)
  palette.updateDimensions(paletteWidth.value, paletteHeight.value);
  palette.updatePosition(0, 0); // Canvas coordinates start at (0,0) within the canvas element

  // Add resize listener
  window.addEventListener("resize", handleResize);

  // Add global mouse/touch up listeners to catch releases outside canvas
  window.addEventListener("mouseup", handleGlobalMouseUp);
  window.addEventListener("touchend", handleGlobalTouchEnd);

  // Add keyboard visual feedback listeners
  window.addEventListener(
    "keyboard-note-pressed",
    handleKeyboardPress as EventListener
  );
  window.addEventListener(
    "keyboard-note-released",
    handleKeyboardRelease as EventListener
  );

  // Start animation loop with requestAnimationFrame
  animationId = requestAnimationFrame(animate);

  // Initial render
  needsRedraw.value = true;
});

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  window.removeEventListener("resize", handleResize);
  window.removeEventListener("mouseup", handleGlobalMouseUp);
  window.removeEventListener("touchend", handleGlobalTouchEnd);
  window.removeEventListener(
    "keyboard-note-pressed",
    handleKeyboardPress as EventListener
  );
  window.removeEventListener(
    "keyboard-note-released",
    handleKeyboardRelease as EventListener
  );
});

// Expose methods for external control
defineExpose({
  setMainOctave: (octave: number) => {
    palette.setMainOctave(octave);
    needsRedraw.value = true;
  },
  updateHeight: (height: number) => {
    paletteHeight.value = height;
    setupHighDPICanvas(); // Re-setup canvas for new height
    palette.updateDimensions(paletteWidth.value, height);
    needsRedraw.value = true;
  },
});
</script>

<style scoped>
.canvas-solfege-palette {
  position: relative;
  z-index: 50; /* Ensure palette renders above other elements */
  overflow: hidden; /* Contain the floating popup */
}

.palette-canvas {
  display: block;
  touch-action: none;
  pointer-events: auto;
  background-color: black;
  position: relative;
  z-index: 51; /* Canvas above the container */
}
</style>
