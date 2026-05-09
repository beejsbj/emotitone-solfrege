<template>
  <div class="drawer-shell">
    <div ref="drawerRef" :class="drawerClasses" :style="drawerStyles">
      <div class="drawer-shell__toggle">
        <IconButton
          data-testid="drawer-toggle"
          size="xs"
          tone="cream"
          :active="store.drawer.isOpen"
          :title="store.drawer.isOpen ? 'Close keyboard drawer' : 'Open keyboard drawer'"
          :aria-label="store.drawer.isOpen ? 'Close keyboard drawer' : 'Open keyboard drawer'"
          @click="store.toggleDrawer()"
        >
          <ChevronDown v-if="store.drawer.isOpen" :size="13" />
          <ChevronUp v-else :size="13" />
        </IconButton>
      </div>

      <!-- Action bar with controls -->
      <div class="absolute top-0 -translate-y-full left-0 right-0 grid min-w-0 gap-1">
        <PatternList />
        <LiveCard />
        <KeyboardActionBar />
      </div>

      <!-- Keyboard grid -->
      <div :class="keyboardGridClasses" :style="keyboardGridStyles">
        <!-- Inner wrapper for padding -->
        <div :class="keyboardWrapperClasses">
          <!-- Solfège keys organized in octave rows -->
          <div
            v-for="octave in store.visibleOctaves"
            :key="`octave-${octave}`"
            :class="octaveRowClasses(octave)"
          >
            <template
              v-for="(solfege, index) in store.solfegeData"
              :key="`${solfege.intervalName ?? solfege.name}-${index}-${octave}`"
            >
              <KeyboardKey
                :solfege="solfege"
                :octave="octave"
                :solfege-index="index"
                :is-main-octave="octave === store.keyboardConfig.mainOctave"
                class="flex-1 min-w-0"
              />
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useKeyboardDrawer } from "@/composables/useKeyboardDrawer";
import { useKeyboardControls } from "@/composables/useKeyboardControls";
import KeyboardActionBar from "./keyboard/KeyboardActionBar.vue";
import LiveCard from "@/components/patterns/LiveCard.vue";
import PatternList from "@/components/patterns/PatternList.vue";
import KeyboardKey from "./keyboard/KeyboardKey.vue";
import { IconButton } from "@/components/ui";
import { ChevronDown, ChevronUp } from "lucide-vue-next";

// Component refs
const drawerRef = ref<HTMLElement | null>(null);

// Store
const store = useKeyboardDrawerStore();

// Drawer behavior composable
const { animateDrawer } = useKeyboardDrawer(drawerRef) as any;

// Physical keyboard controls integration
useKeyboardControls(computed(() => store.keyboardConfig.mainOctave));

// Styling computations
const drawerClasses = computed(() => {
  const baseClasses = [
    // Visual styling
    "relative pointer-events-auto bg-black/90 backdrop-blur-xl",
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

const keyboardGridClasses = computed(() => [
  // Layout
  "flex flex-col flex-1",
  // Position so we can slide the whole keys section
  "relative",
  // Overflow
  "overflow-y-auto overflow-x-hidden",
  // Scroll behavior
  "scroll-smooth",
]);

const keyboardWrapperClasses = computed(() => [
  // Layout
  "flex flex-col flex-1",
  // Padding if enabled
  store.keyboardConfig.keyboardPadding ? "p-1" : "",
]);

const keyboardGridStyles = computed(() => {
  const config = store.keyboardConfig;
  const gapMap = {
    none: "0",
    small: "0.125rem",
    medium: "0.25rem",
  };

  return {
    gap: gapMap[config.keyGaps] || "0.125rem",
  };
});

const octaveRowClasses = (octave: number) => {
  const baseClasses = [
    // Layout
    "flex justify-center items-stretch",
    // Sizing
    "flex-shrink-0",
  ];

  const gapClasses =
    {
      none: "gap-0",
      small: "gap-0.5",
      medium: "gap-1",
    }[store.keyboardConfig.keyGaps] || "gap-0.5";

  return [...baseClasses, gapClasses];
};

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
.drawer-shell {
  pointer-events: none;
}

.drawer-shell__toggle {
  position: absolute;
  right: max(0.75rem, env(safe-area-inset-right));
  top: 0;
  transform: translateY(calc(-100% - 0.3rem));
  z-index: 80;
  pointer-events: auto;
}

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
