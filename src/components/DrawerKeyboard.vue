<template>
  <div ref="drawerRef" :class="drawerClasses" :style="drawerStyles">
    <!-- Action bar with controls -->
    <div class="absolute top-0 -translate-y-full left-0 right-0 grid min-w-0">
      <PatternList />
      <CodeStripActions
        :is-playing="isPlaying"
        :play-disabled="!hasPlayableCode"
        haptic
        @toggle-playback="toggleSketchPlayback"
        @backspace="patternsStore.removeLastFromCurrentSketch()"
        @return="patternsStore.sendCurrentPattern()"
      />
      <ControlBar
        :key-value="musicStore.currentKey"
        :mode-value="musicStore.currentMode"
        :bpm="visualConfigStore.config.codeStrip.bpm"
        :octave="store.keyboardConfig.mainOctave"
        :rows="store.keyboardConfig.rowCount"
        :drawer-open="store.drawer.isOpen"
        @update:key-value="musicStore.setKey"
        @update:mode-value="updateMode"
        @update:bpm="updateBpm"
        @update:octave="store.setMainOctave"
        @update:rows="store.setRowCount"
        @update:drawer-open="updateDrawerOpen"
      />
    </div>

    <Keyboard class="relative flex-1" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { usePatternsStore } from "@/stores/patterns";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { useKeyboardDrawer } from "@/composables/useKeyboardDrawer";
import { useCodeStripStrudel } from "@/composables/useCodeStripStrudel";
import CodeStripActions from "@/components/compounds/CodeStripActions.vue";
import ControlBar from "@/components/compounds/ControlBar.vue";
import PatternList from "@/components/patterns/PatternList.vue";
import Keyboard from "@/components/compounds/Keyboard.vue";
import type { MusicalMode } from "@/types/music";

// Component refs
const drawerRef = ref<HTMLElement | null>(null);

// Store
const store = useKeyboardDrawerStore();
const musicStore = useMusicStore();
const patternsStore = usePatternsStore();
const visualConfigStore = useVisualConfigStore();
const { toggle, isPlaying, hasPlayableCode } = useCodeStripStrudel();

async function toggleSketchPlayback() {
  if (!hasPlayableCode.value) return;
  await toggle();
}

function updateMode(mode: string) {
  musicStore.setMode(mode as MusicalMode);
}

function updateBpm(bpm: number) {
  visualConfigStore.updateConfig("codeStrip", { bpm });
}

function updateDrawerOpen(isOpen: boolean) {
  if (isOpen) store.openDrawer();
  else store.closeDrawer();
}

// Drawer behavior composable
const { animateDrawer } = useKeyboardDrawer(drawerRef) as any;

// Styling computations
const drawerClasses = computed(() => {
  const baseClasses = [
    // Visual styling
    "bg-black/90 backdrop-blur-xl",
    "border-t border-white/10 shadow-2xl",
    // Performance optimizations
    "contain-layout will-change-transform",
  ];

  const stateClasses = [];
  if (store.drawer.isOpen) {
    // GSAP will handle the actual animation
    stateClasses.push("drawer-open");
  }

  return [...baseClasses, ...stateClasses];
});

const drawerStyles = computed(() => ({
  // Height is natural based on keys/rows; we still expose key-size var
  "--key-size": store.keyboardConfig.keySize,
}));

// Initialize drawer with default state on mount
onMounted(() => {
  // Ensure the drawer reflects current store state immediately
  animateDrawer && animateDrawer(true);
});

// Expose methods for external control if needed
defineExpose({
  openDrawer: store.openDrawer,
  closeDrawer: store.closeDrawer,
  toggleDrawer: store.toggleDrawer,
  store,
});
</script>

<style scoped>
/* Vendor-specific optimizations */

/* Touch optimizations */
div[ref="drawerRef"] {
  touch-action: manipulation;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

/* The handle is visual only now */
div[ref="drawerRef"] > div:first-child {
  touch-action: manipulation;
}

/* Webkit-specific scrolling optimization */
.overflow-y-auto {
  -webkit-overflow-scrolling: touch;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  div[ref="drawerRef"] {
    max-height: 85vh !important;
  }
}

@media (orientation: landscape) and (max-height: 500px) {
  div[ref="drawerRef"] {
    max-height: 90vh !important;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .scroll-smooth {
    scroll-behavior: auto !important;
  }
}

/* Focus visible improvements for accessibility */
div[ref="drawerRef"]:focus-within {
  outline: 2px solid rgba(96, 165, 250, 0.3);
  outline-offset: 2px;
}

/* Print styles */
@media print {
  div[ref="drawerRef"] {
    display: none !important;
  }
}
</style>
