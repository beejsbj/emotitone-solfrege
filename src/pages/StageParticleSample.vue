<template>
  <div class="particle-sample">
    <canvas ref="canvasRef" aria-hidden="true"></canvas>
    <button type="button" @click="releaseBurst">
      Release flecks
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useParticleSystem } from "@/composables/canvas/useParticleSystem";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { getScaleForMode } from "@/data/scales";
import type { ParticleConfig } from "@/types/visual";

const props = withDefaults(
  defineProps<{
    scale?: number;
    burstCount?: number;
  }>(),
  {
    scale: 1,
    burstCount: 10,
  },
);

const canvasRef = ref<HTMLCanvasElement | null>(null);
const particleSystem = useParticleSystem();
const particleNotes = getScaleForMode("major").solfege.filter((note) =>
  ["circle", "star", "diamond", "sparkle", "mist"].includes(note.fleckShape),
);
const particleConfig: ParticleConfig = {
  ...DEFAULT_CONFIG.particles,
  sizeMin: DEFAULT_CONFIG.particles.sizeMin * props.scale,
  sizeMax: DEFAULT_CONFIG.particles.sizeMax * props.scale,
};

let context: CanvasRenderingContext2D | null = null;
let animationFrame = 0;
let burstTimer = 0;
let resizeObserver: ResizeObserver | null = null;
let noteIndex = 0;

function fitCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const bounds = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(bounds.width));
  canvas.height = Math.max(1, Math.round(bounds.height));
}

function releaseBurst() {
  const canvas = canvasRef.value;
  const note = particleNotes[noteIndex % particleNotes.length];
  if (!canvas || !note) return;

  particleSystem.createParticles(
    note,
    particleConfig,
    canvas.width,
    canvas.height,
    "major",
    "C",
    props.burstCount,
  );
  noteIndex += 1;
}

function renderFrame(elapsed: number) {
  const canvas = canvasRef.value;
  if (canvas && context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    particleSystem.renderParticles(context, elapsed, particleConfig);
  }
  animationFrame = requestAnimationFrame(renderFrame);
}

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  context = canvas.getContext("2d");
  fitCanvas();
  resizeObserver = new ResizeObserver(fitCanvas);
  resizeObserver.observe(canvas);
  releaseBurst();
  burstTimer = window.setInterval(releaseBurst, 900);
  animationFrame = requestAnimationFrame(renderFrame);
});

onUnmounted(() => {
  window.clearInterval(burstTimer);
  cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
  particleSystem.clearAllParticles();
});
</script>

<style scoped>
.particle-sample {
  position: relative;
  min-height: 220px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 0.035), transparent 48%),
    var(--ink);
}

canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

button {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 1;
  min-height: 32px;
  padding: 7px 11px;
  border: 0;
  border-radius: var(--r-xs);
  background: var(--ivory);
  color: var(--ink);
  font: 700 10px/1 var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}

button:focus-visible {
  outline: 2px solid var(--brass);
  outline-offset: 3px;
}
</style>
