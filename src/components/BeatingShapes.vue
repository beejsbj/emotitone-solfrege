<template>
  <div
    v-if="beatingShapesConfig.isEnabled"
    class="beat-visualizer"
    ref="beatVisualizer"
    :style="visualizerStyles"
  >
    <div class="parent">
      <div
        v-for="(shape, index) in visibleShapes"
        :key="`${shape}-${index}`"
        :class="['shape', shape]"
        :style="getShapeStyles(shape, index)"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useSequencerStore } from "@/stores/sequencer";
import { useColorSystem } from "@/composables/useColorSystem";
import { useVisualConfig } from "@/composables/useVisualConfig";

const { createGlassmorphBackground } = useColorSystem();
const { beatingShapesConfig } = useVisualConfig();

const sequencerStore = useSequencerStore();

const currentBpm = ref(100);
const isAnimating = ref(false);
const colorShiftInterval = ref(null);
const currentHue = ref(80);

const beatVisualizer = ref(null);

// Available shape types
const allShapes = [
  "square",
  "line",
  "triangle",
  "rectangle",
  "circle",
  "hexagon",
  "octagon",
];

// Computed properties to determine visible shapes based on config
const visibleShapes = computed(() => {
  return allShapes.slice(0, beatingShapesConfig.value.shapeCount);
});

// Computed properties to determine if we should be animating and what BPM to use
const shouldAnimate = computed(() => {
  // Check if global playback is active or any individual sequencer is playing
  return (
    sequencerStore.config.globalIsPlaying ||
    sequencerStore.playingSequencers.length > 0
  );
});

const effectiveBpm = computed(() => {
  // Use global BPM when global playback is active
  if (sequencerStore.config.globalIsPlaying) {
    return sequencerStore.config.tempo;
  }

  // Use BPM from the first playing sequencer if only individual sequencers are playing
  // (Note: all sequencers share the same global tempo, so this is the same as global tempo)
  if (sequencerStore.playingSequencers.length > 0) {
    return sequencerStore.config.tempo;
  }

  // Fallback to current BPM if nothing is playing (shouldn't happen when shouldAnimate is true)
  return currentBpm.value;
});

// Computed styles for the visualizer container
const visualizerStyles = computed(() => {
  return {
    "--config-scale": beatingShapesConfig.value.scale,
    "--config-opacity": beatingShapesConfig.value.opacity,
    "--config-saturation": beatingShapesConfig.value.saturation,
  };
});

// Function to get shape-specific styles
const getShapeStyles = (shape, index) => {
  const opacity = shouldAnimate.value ? beatingShapesConfig.value.opacity : 0;
  return {
    opacity: opacity,
    transform: `scale(${beatingShapesConfig.value.scale})`,
  };
};

// Computed color values
const baseColor = computed(() => {
  const saturation = beatingShapesConfig.value.saturation;
  const opacity = shouldAnimate.value ? beatingShapesConfig.value.opacity : 0;

  const color = `hsla(${currentHue.value}, ${saturation}%, 60%, ${opacity})`;

  let finalColor = color;
  if (beatingShapesConfig.value.useGlassmorphism) {
    finalColor = createGlassmorphBackground(color);
  }

  if (beatVisualizer.value) {
    beatVisualizer.value.style.setProperty("--color", finalColor);
  }

  return finalColor;
});

const highlightColor = computed(() => {
  const highlightHue = (currentHue.value + 180) % 360;
  const saturation = beatingShapesConfig.value.saturation;
  const opacity = shouldAnimate.value ? beatingShapesConfig.value.opacity : 0;

  const highlight = `hsla(${highlightHue}, ${saturation}%, 60%, ${opacity})`;

  let finalHighlight = highlight;
  if (beatingShapesConfig.value.useGlassmorphism) {
    finalHighlight = createGlassmorphBackground(highlight);
  }

  if (beatVisualizer.value) {
    beatVisualizer.value.style.setProperty("--highlight", finalHighlight);
  }

  return finalHighlight;
});

const accentColor = computed(() => {
  const accentHue = (currentHue.value - 60 + 360) % 360; // Add 360 to handle negative values
  const saturation = beatingShapesConfig.value.saturation;
  const opacity = shouldAnimate.value ? beatingShapesConfig.value.opacity : 0;

  const accent = `hsla(${accentHue}, ${saturation}%, 60%, ${opacity})`;

  let finalAccent = accent;
  if (beatingShapesConfig.value.useGlassmorphism) {
    finalAccent = createGlassmorphBackground(accent);
  }

  if (beatVisualizer.value) {
    beatVisualizer.value.style.setProperty("--accent", finalAccent);
  }

  return finalAccent;
});

const updateBpm = (bpm) => {
  currentBpm.value = bpm;
  if (isAnimating.value) {
    restartColorShifting();
  }
};

const toggleAnimation = () => {
  isAnimating.value = !isAnimating.value;
  const shapes = document.querySelectorAll(".shape");

  if (isAnimating.value) {
    const quarterNote = 60 / currentBpm.value; // 1 beat
    const wholeNote = quarterNote * 4; // 4 beats
    const dottedHalfNote = quarterNote * 3; // 3 beats
    const halfNote = quarterNote * 2; // 2 beats
    const third = quarterNote / 3;
    const eighthNote = quarterNote / 2; // 1/2 beat
    const sixteenthNote = quarterNote / 4; // 1/4 beat
    const thirtySecondNote = quarterNote / 8; // 1/8 beat

    shapes.forEach((shape) => {
      // Add animation classes and set custom duration
      if (shape.classList.contains("square")) {
        shape.classList.add("beat-scale");
        shape.style.animationDuration = `${quarterNote}s`;
      } else if (shape.classList.contains("line")) {
        shape.classList.add("beat-rotate");
        shape.style.animationDuration = `${wholeNote}s`;
      } else if (shape.classList.contains("triangle")) {
        shape.classList.add("beat-rotate");
        shape.style.animationDuration = `${third}s`;
      } else if (shape.classList.contains("rectangle")) {
        shape.classList.add("beat-rotate");
        shape.style.animationDuration = `${halfNote}s`;
      } else if (shape.classList.contains("circle")) {
        shape.classList.add("beat-scale");
        shape.style.animationDuration = `${eighthNote}s`;
      } else if (shape.classList.contains("hexagon")) {
        shape.classList.add("beat-rotate");
        shape.style.animationDuration = `${sixteenthNote}s`;
      } else if (shape.classList.contains("octagon")) {
        shape.classList.add("beat-scale");
        shape.style.animationDuration = `${thirtySecondNote}s`;
      }
    });
    startColorShifting();
  } else {
    shapes.forEach((shape) => {
      // Remove animation classes and reset duration
      shape.classList.remove("beat-scale", "beat-rotate");
      shape.style.animationDuration = "";
    });
    stopColorShifting();
  }
};

const startColorShifting = () => {
  const beatDuration = 60 / currentBpm.value;
  colorShiftInterval.value = setInterval(() => {
    currentHue.value = (currentHue.value + 36) % 360;
  }, beatDuration * 4 * 1000);
};

const restartColorShifting = () => {
  stopColorShifting();
  if (isAnimating.value) {
    startColorShifting();
  }
};

const stopColorShifting = () => {
  if (colorShiftInterval.value) {
    clearInterval(colorShiftInterval.value);
    colorShiftInterval.value = null;
  }
};

// Watch for changes in sequencer state and BPM
watch(shouldAnimate, (newValue) => {
  // Force color computeds to re-evaluate when shouldAnimate changes
  baseColor.value;
  highlightColor.value;
  accentColor.value;

  if (newValue && !isAnimating.value) {
    // Start animation when sequencers start playing
    currentBpm.value = effectiveBpm.value;
    toggleAnimation();
  } else if (!newValue && isAnimating.value) {
    // Stop animation when no sequencers are playing
    toggleAnimation();
  }
});

watch(effectiveBpm, (newBpm) => {
  if (isAnimating.value && newBpm !== currentBpm.value) {
    // Update BPM if it changes while animating
    updateBpm(newBpm);
  }
});

// Watch for hue changes and force color updates
watch(currentHue, () => {
  baseColor.value;
  highlightColor.value;
  accentColor.value;
});

// Watch for config changes and update colors
watch(
  [
    () => beatingShapesConfig.value.saturation,
    () => beatingShapesConfig.value.opacity,
    () => beatingShapesConfig.value.useGlassmorphism,
  ],
  () => {
    baseColor.value;
    highlightColor.value;
    accentColor.value;
  },
  { deep: true }
);

onMounted(() => {
  // Initialize CSS variables by triggering computed properties
  baseColor.value;
  highlightColor.value;
  accentColor.value;

  // Start animation if sequencers are already playing on mount
  if (shouldAnimate.value) {
    currentBpm.value = effectiveBpm.value;
    toggleAnimation();
  }
});

onUnmounted(() => {
  stopColorShifting();
});

// Expose functions for external usage
defineExpose({
  currentBpm,
  isAnimating,
  updateBpm,
  toggleAnimation,
  shouldAnimate,
  effectiveBpm,
  currentHue,
  baseColor,
  highlightColor,
  accentColor,
  beatingShapesConfig,
});
</script>

<style scoped>
.beat-visualizer {
  --color: hsla(80, 100%, 60%, 0);
  --highlight: hsla(260, 100%, 60%, 0);
  --accent: hsla(20, 100%, 60%, 0);
  --config-scale: 1;
  --config-opacity: 0.8;
  --config-saturation: 100;
  width: 100%;
  height: 100vh;
  font-family: "Futura", sans-serif;
}

.parent {
  overflow: hidden;
  height: 100%;
  max-height: 100vh;
  max-width: 100vw;
  position: relative;
}

.shape {
  background: var(--color);
  position: absolute;
  transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
  transform: scale(var(--config-scale));
}

.line {
  width: 100vmax;
  height: 1px;
  rotate: 40deg;
  top: 30%;
}

.rectangle {
  width: 50vw;
  height: 50px;
  rotate: -100deg;
  bottom: 50%;
  right: 25%;
}

.triangle {
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  width: 10vw;
  top: -1%;
  left: 50%;
  aspect-ratio: 1;
  rotate: 20deg;
}

.square {
  bottom: 10%;
  left: -20%;
  rotate: 45deg;
  width: 70vmin;
  aspect-ratio: 1;
}

.hexagon {
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
  bottom: 40%;
  right: -5%;
  /* rotate: 30deg; */
  width: 15vmax;
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
  width: 5vmax;
  aspect-ratio: 1;
}

.circle {
  border-radius: 50%;
  bottom: unset;
  left: unset;
  right: -5%;
  top: -5%;
  width: 20vmax;
  aspect-ratio: 1;
}

@keyframes beat {
  0% {
    scale: calc(0.8 * var(--config-scale));
  }
  14% {
    scale: calc(1.1 * var(--config-scale));
    box-shadow: -5px -5px var(--color), -10px -10px var(--accent);
  }
  96% {
    scale: calc(1 * var(--config-scale));
  }
  100% {
    scale: calc(0.8 * var(--config-scale));
  }
}

@keyframes rotate {
  0% {
    transform: rotate(-5deg) scale(var(--config-scale));
  }
  14% {
    transform: rotate(3deg) scale(var(--config-scale));
    box-shadow: -5px -5px var(--color), -10px -10px var(--highlight);
  }
  96% {
    transform: rotate(0deg) scale(var(--config-scale));
  }
  100% {
    transform: rotate(10deg) scale(var(--config-scale));
  }
}

/* Animation classes */
.beat-scale {
  animation: beat infinite forwards;
}

.beat-rotate {
  animation: rotate infinite forwards;
}
</style>
