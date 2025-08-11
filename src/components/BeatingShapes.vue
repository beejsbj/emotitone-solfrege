<template>
  <div 
    v-if="beatingShapesConfig.isEnabled" 
    class="beating-shapes"
    :style="rootStyles"
  >
    <!-- Shapes with different beat durations -->
    <div
      v-if="beatingShapesConfig.beatTypes.common"
      class="dancer shape square common-beat"
      :class="{ 'enable-rotation': beatingShapesConfig.enableRotation }"
    />

    <div
      v-if="beatingShapesConfig.beatTypes.quarter"
      class="dancer shape line quarter-beat"
      :class="{ 'enable-rotation': beatingShapesConfig.enableRotation }"
    />
    
    <div
      v-if="beatingShapesConfig.beatTypes.third"
      class="dancer shape triangle third-beat"
      :class="{ 'enable-rotation': beatingShapesConfig.enableRotation }"
    />
    
    <div
      v-if="beatingShapesConfig.beatTypes.half"
      class="dancer shape rectangle half-beat"
      :class="{ 'enable-rotation': beatingShapesConfig.enableRotation }"
    />

    <div
      v-if="beatingShapesConfig.beatTypes.double"
      class="dancer shape circle double-beat"
      :class="{ 'enable-rotation': beatingShapesConfig.enableRotation }"
    />
    
    <div
      v-if="beatingShapesConfig.beatTypes.triple"
      class="dancer shape hexagon triple-beat"
      :class="{ 'enable-rotation': beatingShapesConfig.enableRotation }"
    />
    
    <div
      v-if="beatingShapesConfig.beatTypes.quadruple"
      class="dancer shape octagon quadruple-beat"
      :class="{ 'enable-rotation': beatingShapesConfig.enableRotation }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, ref } from "vue";
import { useSequencerStore } from "@/stores/sequencer";
import { useVisualConfig } from "@/composables/useVisualConfig";

// Extend window interface for our color interval
declare global {
  interface Window {
    beatingShapesColorInterval?: number;
  }
}

const sequencerStore = useSequencerStore();
const { beatingShapesConfig } = useVisualConfig();

// Calculate CSS custom properties for beat timing
const rootStyles = computed(() => {
  const bpm = sequencerStore.config.tempo;
  const hue = beatingShapesConfig.value.hueOffset;
  const scale = beatingShapesConfig.value.scale;
  const opacity = beatingShapesConfig.value.opacity;
  
  return {
    '--bpm': bpm,
    '--hue': hue,
    '--scale': scale,
    '--shape-opacity': opacity,
    '--common-time-beat': `calc(60s / var(--bpm))`,
    '--quarter-time-beat': `calc(var(--common-time-beat) * 4)`,
    '--third-time-beat': `calc(var(--common-time-beat) * 3)`,
    '--half-time-beat': `calc(var(--common-time-beat) * 2)`,
    '--double-time-beat': `calc(var(--common-time-beat) / 2)`,
    '--triple-time-beat': `calc(var(--common-time-beat) / 3)`,
    '--quadruple-time-beat': `calc(var(--common-time-beat) / 4)`,
    '--color': `hsla(var(--hue), 100%, 60%, 1)`,
    '--highlight': `hsla(calc(var(--hue) + 180), 100%, 60%, 1)`,
    '--accent': `hsla(calc(var(--hue) - 60), 100%, 60%, 1)`,
  };
});

// Start color shifting animation when sequencer is playing
const startColorShifting = () => {
  const beatDuration = 60 / sequencerStore.config.tempo;
  const shiftSpeed = beatingShapesConfig.value.colorShiftSpeed;
  
  // Clear any existing color shift interval
  if (window.beatingShapesColorInterval) {
    clearInterval(window.beatingShapesColorInterval);
  }
  
  window.beatingShapesColorInterval = setInterval(() => {
    const currentHue = beatingShapesConfig.value.hueOffset;
    const newHue = (currentHue + 36) % 360;
    // This would update the store - for now just use the base hue
    // In a real implementation you might want to emit an event or update a reactive ref
  }, (beatDuration * 4 * 1000) / shiftSpeed);
};

// Watch for sequencer play state changes
watch(
  () => sequencerStore.config.globalIsPlaying,
  (isPlaying) => {
    if (isPlaying) {
      startColorShifting();
      // Start animations
      document.querySelectorAll('.dancer').forEach((dancer) => {
        (dancer as HTMLElement).style.animation = 
          'var(--beat-time) var(--action, beat) infinite forwards';
      });
    } else {
      // Stop color shifting
      if (window.beatingShapesColorInterval) {
        clearInterval(window.beatingShapesColorInterval);
        window.beatingShapesColorInterval = undefined;
      }
      // Stop animations
      document.querySelectorAll('.dancer').forEach((dancer) => {
        (dancer as HTMLElement).style.animation = 'none';
      });
    }
  }
);

onUnmounted(() => {
  // Clean up interval on component unmount
  if (window.beatingShapesColorInterval) {
    clearInterval(window.beatingShapesColorInterval);
    window.beatingShapesColorInterval = undefined;
  }
});
</script>

<style scoped>
.beating-shapes {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  height: 100vh;
  max-height: 100vh;
  max-width: 100vw;
  pointer-events: none;
}

.shape {
  background: hsla(0, 0%, 0%, var(--shape-opacity, 0.8));
  position: absolute;
  transform: scale(var(--scale, 1));
}

.line {
  width: calc(50vmax * var(--scale, 1));
  height: 1px;
  rotate: 40deg;
  top: 20%;
  left: 0;
}

.rectangle {
  width: calc(50vw * var(--scale, 1));
  height: calc(50px * var(--scale, 1));
  rotate: -100deg;
  bottom: 50%;
  right: 1%;
}

.triangle {
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  width: calc(10vw * var(--scale, 1));
  top: -5%;
  left: 50%;
  aspect-ratio: 1;
  rotate: 20deg;
}

.square {
  bottom: -10%;
  left: -5%;
  rotate: 45deg;
  width: calc(70vmin * var(--scale, 1));
  aspect-ratio: 1;
}

.hexagon {
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
  bottom: -10%;
  right: -5%;
  width: calc(30vmax * var(--scale, 1));
  aspect-ratio: 1;
}

.octagon {
  clip-path: polygon(
    30% 0%,
    70% 0%,
    100% 30%,
    100% 70%,
    70% 100%,
    30% 100%,
    0% 70%,
    0% 30%
  );
  top: 10%;
  left: 5%;
  width: calc(5vmax * var(--scale, 1));
  aspect-ratio: 1;
}

.circle {
  border-radius: 50%;
  bottom: unset;
  left: unset;
  right: -5%;
  top: -5%;
  width: calc(20vmax * var(--scale, 1));
  aspect-ratio: 1;
}

/* Beat timing classes */
.common-beat {
  --beat-time: var(--common-time-beat);
  --action: beat;
}

.quarter-beat {
  --beat-time: var(--quarter-time-beat);
  --action: beat;
}

.third-beat {
  --beat-time: var(--third-time-beat);
  --action: beat;
}

.half-beat {
  --beat-time: var(--half-time-beat);
  --action: beat;
}

.double-beat {
  --beat-time: var(--double-time-beat);
  --action: beat;
}

.triple-beat {
  --beat-time: var(--triple-time-beat);
  --action: beat;
}

.quadruple-beat {
  --beat-time: var(--quadruple-time-beat);
  --action: beat;
}

/* Enable rotation for shapes */
.enable-rotation {
  --action: rotate;
}

/* Keyframe animations */
@keyframes beat {
  0% {
    scale: 0.8;
  }
  14% {
    scale: 1.1;
    box-shadow: -5px -5px var(--color), -10px -10px var(--accent);
  }
  96% {
    scale: 1;
  }
  100% {
    scale: 0.8;
  }
}

@keyframes rotate {
  0% {
    transform: scale(var(--scale, 1)) rotate(-5deg);
  }
  14% {
    transform: scale(var(--scale, 1)) rotate(3deg);
    box-shadow: -5px -5px var(--color), -10px -10px var(--highlight);
  }
  96% {
    transform: scale(var(--scale, 1)) rotate(0deg);
  }
  100% {
    transform: scale(var(--scale, 1)) rotate(10deg);
  }
}

@keyframes shiftColors {
  100% {
    --hue: calc(var(--hue) + 36);
  }
}
</style>