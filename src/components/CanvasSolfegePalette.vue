<template>
  <div class="canvas-solfege-palette">
    <!-- Dedicated palette canvas -->
    <canvas
      ref="paletteCanvasRef"
      :width="paletteWidth"
      :height="paletteHeight"
      class="palette-canvas"
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @mousemove="handleMouseMove"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
      @touchmove="handleTouchMove"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { usePalette } from "@/composables/palette";
import { useKeyboardControls } from "@/composables/useKeyboardControls";

// Canvas setup
const paletteCanvasRef = ref<HTMLCanvasElement | null>(null);
const paletteWidth = ref(window.innerWidth);
const paletteHeight = ref(240); // Height for controls (20px) + 3 octave rows (80+56+56 = 192px) + padding

// Palette system (now modular)
const palette = usePalette();

// Animation frame
let animationId: number | null = null;
let needsRedraw = ref(true);

// Expose palette state for external control (like keyboard controls)
const mainOctave = computed({
  get: () => palette.paletteState.value.mainOctave,
  set: (value: number) => {
    palette.setMainOctave(value);
    needsRedraw.value = true;
  },
});

// Setup keyboard controls with visual feedback integration
const keyboardControls = useKeyboardControls(mainOctave);

// Connect keyboard events to palette visual feedback
const handleKeyboardPress = (event: CustomEvent) => {
  const { solfegeIndex, octave } = event.detail;
  palette.handleKeyboardPress(solfegeIndex, octave);
  needsRedraw.value = true;
};

const handleKeyboardRelease = () => {
  palette.handleKeyboardRelease();
  needsRedraw.value = true;
};

/**
 * Render palette with animation support
 */
const renderPalette = (currentTime?: number) => {
  if (!paletteCanvasRef.value) return;

  const ctx = paletteCanvasRef.value.getContext("2d");
  if (!ctx) return;

  // Clear canvas
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
    needsRedraw.value = true;
  }
};

/**
 * Touch event handlers
 */
const handleTouchStart = (event: TouchEvent) => {
  event.preventDefault();
  const { x, y } = getPaletteCoordinates(event);
  const handled = palette.handlePointerDown(x, y, event);
  if (handled) {
    needsRedraw.value = true;
  }
};

const handleTouchEnd = (event: TouchEvent) => {
  event.preventDefault();
  const { x, y } = getPaletteCoordinates(event);
  palette.handlePointerUp(x, y, event);
  needsRedraw.value = true;
};

// Global touch end handler to catch releases outside canvas
const handleGlobalTouchEnd = (event: TouchEvent) => {
  if (
    palette.paletteState.value.isDragging ||
    palette.paletteState.value.isResizing
  ) {
    palette.handlePointerUp(0, 0, event);
    needsRedraw.value = true;
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
    needsRedraw.value = true;
  }
};

/**
 * Handle window resize
 */
const handleResize = () => {
  paletteWidth.value = window.innerWidth;
  palette.updateDimensions(paletteWidth.value, paletteHeight.value);
  needsRedraw.value = true;
};

/**
 * Watch for changes that require redraw
 */
watch(
  () => [
    palette.paletteState.value.mainOctave,
    palette.paletteState.value.showLastSolfege,
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
  toggleLastSolfege: () => {
    palette.toggleLastSolfege();
    needsRedraw.value = true;
  },
  updateHeight: (height: number) => {
    paletteHeight.value = height;
    palette.updateDimensions(paletteWidth.value, height);
    needsRedraw.value = true;
  },
});
</script>

<style scoped>
.canvas-solfege-palette {
  position: relative;
  z-index: 50; /* Ensure palette renders above other elements */
}

.palette-canvas {
  display: block;
  touch-action: none;
  pointer-events: auto;
  width: 100%;
  background-color: black;
  position: relative;
  z-index: 51; /* Canvas above the container */
}
</style>
