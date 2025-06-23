<template>
  <div class="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
    <h2 class="text-2xl text-white mb-4 text-center font-weight-oscillate-lg">
      Solfege Palette
    </h2>
    <p class="text-gray-300 mb-6 text-center font-weight-oscillate-md">
      Tap the solfege degrees to hear their emotional character in
      {{ musicStore.currentKeyDisplay }}
    </p>

    <!-- Solfege Buttons -->
    <div class="grid grid-cols-8 gap-[1px]">
      <button
        v-for="(solfege, index) in musicStore.solfegeData"
        :key="solfege.name"
        class="btn-solfege bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all duration-150 backdrop-blur-sm border border-white/30 min-h-[4rem] aspect-[9/20] select-none active:scale-95"
        @mousedown="(e) => attackNote(index, e)"
        @mouseup="(e) => releaseNote(e)"
        @mouseleave="(e) => releaseNote(e)"
        @touchstart.prevent="(e) => attackNote(index, e)"
        @touchend.prevent="(e) => releaseNote(e)"
        @contextmenu.prevent
        @dragstart.prevent
        :style="{
          background:
            musicStore.currentNote === solfege.name
              ? getReactiveGradient(solfege.name)
              : undefined,
          transform:
            musicStore.currentNote === solfege.name ? 'scale(0.98)' : undefined,
          boxShadow:
            musicStore.currentNote === solfege.name
              ? '0 8px 25px rgba(255, 255, 255, 0.25)'
              : undefined,
        }"
      >
        <div class="text-lg font-weight-oscillate-lg">
          {{ solfege.name }}
        </div>
        <div class="text-xs opacity-75 font-weight-oscillate-md">
          {{ musicStore.currentScaleNotes[index] }}
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";
import { useColorSystem } from "@/composables/useColorSystem";

const musicStore = useMusicStore();
const { getGradient, isDynamicColorsEnabled } = useColorSystem();

// Create a reactive animation frame counter to trigger re-renders for dynamic colors
const animationFrame = ref(0);
let animationId: number | null = null;

// Start animation loop when dynamic colors are enabled
const startAnimation = () => {
  if (animationId) return;

  const animate = () => {
    animationFrame.value++;
    animationId = requestAnimationFrame(animate);
  };

  animate();
};

// Stop animation loop
const stopAnimation = () => {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
};

// Create a reactive computed property that updates with animation frames
const getReactiveGradient = computed(() => {
  return (noteName: string) => {
    // Force reactivity by accessing animation frame when dynamic colors are enabled
    if (isDynamicColorsEnabled.value) {
      animationFrame.value; // This triggers re-computation on every frame
    }
    return getGradient(noteName, musicStore.currentMode);
  };
});

// Watch for dynamic colors being enabled/disabled
const shouldAnimate = computed(() => isDynamicColorsEnabled.value);

// Lifecycle hooks
onMounted(() => {
  if (shouldAnimate.value) {
    startAnimation();
  }
});

onUnmounted(() => {
  stopAnimation();
});

// Watch for changes in dynamic colors setting
import { watch } from "vue";
watch(shouldAnimate, (newValue) => {
  if (newValue) {
    startAnimation();
  } else {
    stopAnimation();
  }
});

// Function for attacking notes (hold to sustain)
const attackNote = (solfegeIndex: number, event?: Event) => {
  // Prevent context menu and other unwanted behaviors
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  musicStore.attackNote(solfegeIndex);
};

// Function for releasing notes
const releaseNote = (event?: Event) => {
  // Prevent unwanted behaviors
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  musicStore.releaseNote();
};
</script>

<style scoped>
/* Component-specific styles */
.btn-solfege {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-drag: none;
  -khtml-user-drag: none;
  -moz-user-drag: none;
  -o-user-drag: none;
  touch-action: manipulation;
}

.btn-solfege:active {
  transform: scale(0.95);
}

.btn-solfege:hover {
  box-shadow: 0 8px 25px rgba(255, 255, 255, 0.15);
}

/* Prevent text selection and context menus on mobile */
.btn-solfege * {
  pointer-events: none;
}
</style>
