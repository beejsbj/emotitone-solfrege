<template>
  <canvas
    ref="stringsCanvas"
    class="fixed inset-0 z-5 pointer-events-none"
    :width="canvasWidth"
    :height="canvasHeight"
  ></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";
import { useVibratingAnimation } from "@/composables";

const musicStore = useMusicStore();
const stringsCanvas = ref<HTMLCanvasElement | null>(null);

// Use the vibrating animation composable
const { canvasWidth, canvasHeight, initializeStrings, handleResize } =
  useVibratingAnimation(stringsCanvas, 8);

// Lifecycle hooks
onMounted(() => {
  window.addEventListener("resize", handleResize);
  initializeStrings();
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});
</script>

<style scoped>
/* Component-specific styles */
canvas {
  background-color: hsla(0, 100%, 0%, 0.6);
}
</style>
