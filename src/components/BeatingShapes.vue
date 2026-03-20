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

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from "vue";
import { useColorSystem } from "@/composables/useColorSystem";
import { useVisualConfig } from "@/composables/useVisualConfig";
import { useLiveStrudelMirror } from "@/composables/useLiveStrudelMirror";

const { createGlassmorphBackground } = useColorSystem();
const { beatingShapesConfig, liveStripConfig } = useVisualConfig();
const { isPlaying: isStrudelPlaying } = useLiveStrudelMirror();

const currentBpm = ref(100);
const isAnimating = ref(false);
const colorShiftInterval = ref<number | null>(null);
const currentHue = ref(80);

const beatVisualizer = ref<HTMLElement | null>(null);

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
  return allShapes.slice(
    0,
    Math.min(Math.max(0, beatingShapesConfig.value.shapeCount), allShapes.length)
  );
});

// Computed properties to determine if we should be animating and what BPM to use
const shouldAnimate = computed(() => {
  return beatingShapesConfig.value.isEnabled && isStrudelPlaying.value;
});

const effectiveBpm = computed(() => {
  const bpm = liveStripConfig.value.bpm;
  return typeof bpm === "number" && Number.isFinite(bpm) && bpm > 0
    ? bpm
    : currentBpm.value;
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
const getShapeStyles = (shape: string, index: number) => {
  const opacity = shouldAnimate.value ? beatingShapesConfig.value.opacity : 0;
  return {
    opacity: opacity,
    transform: `scale(${beatingShapesConfig.value.scale})`,
  };
};

const getShapeElements = (): HTMLElement[] => {
  if (!beatVisualizer.value) {
    return [];
  }

  return Array.from(beatVisualizer.value.querySelectorAll<HTMLElement>(".shape"));
};

const applyAnimationTimings = () => {
  const safeBpm =
    typeof currentBpm.value === "number" &&
    Number.isFinite(currentBpm.value) &&
    currentBpm.value > 0
      ? currentBpm.value
      : 120;
  const quarterNote = 60 / safeBpm;
  const wholeNote = quarterNote * 4;
  const halfNote = quarterNote * 2;
  const third = quarterNote / 3;
  const eighthNote = quarterNote / 2;
  const sixteenthNote = quarterNote / 4;
  const thirtySecondNote = quarterNote / 8;

  getShapeElements().forEach((shape) => {
    shape.classList.remove("beat-scale", "beat-rotate");

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

const updateBpm = (bpm: number) => {
  currentBpm.value =
    typeof bpm === "number" && Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
  if (isAnimating.value) {
    applyAnimationTimings();
    restartColorShifting();
  }
};

const startAnimation = () => {
  if (isAnimating.value) {
    applyAnimationTimings();
    restartColorShifting();
    return;
  }

  isAnimating.value = true;
  applyAnimationTimings();
  startColorShifting();
};

const stopAnimation = () => {
  if (!isAnimating.value) {
    return;
  }

  isAnimating.value = false;
  getShapeElements().forEach((shape) => {
    shape.classList.remove("beat-scale", "beat-rotate");
    shape.style.animationDuration = "";
  });
  stopColorShifting();
};

const toggleAnimation = () => {
  if (isAnimating.value) {
    stopAnimation();
    return;
  }

  startAnimation();
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

watch(shouldAnimate, (nextValue) => {
  baseColor.value;
  highlightColor.value;
  accentColor.value;

  if (nextValue) {
    updateBpm(effectiveBpm.value);
    startAnimation();
    return;
  }

  stopAnimation();
});

watch(effectiveBpm, (newBpm) => {
  if (isAnimating.value && newBpm !== currentBpm.value) {
    updateBpm(newBpm);
  }
});

watch(
  () => visibleShapes.value.length,
  async () => {
    await nextTick();
    if (isAnimating.value) {
      applyAnimationTimings();
    }
  }
);

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

  if (shouldAnimate.value) {
    updateBpm(effectiveBpm.value);
    startAnimation();
  }
});

onUnmounted(() => {
  stopAnimation();
});

// Expose functions for external usage
defineExpose({
  currentBpm,
  isAnimating,
  updateBpm,
  toggleAnimation,
  startAnimation,
  stopAnimation,
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
