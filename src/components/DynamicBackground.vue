<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { gsap } from "gsap";
import { useMusicStore } from "@/stores/music";
import type { SolfegeData } from "@/services/music";

const musicStore = useMusicStore();
const canvasRef = ref<HTMLCanvasElement>();
const gradientRef = ref<HTMLDivElement>();
const particlesRef = ref<HTMLDivElement>();

let animationTimeline: gsap.core.Timeline | null = null;
let ambientAnimation: gsap.core.Tween | null = null;

// Watch for mode changes
watch(
  () => musicStore.currentMode,
  (mode) => {
    updateAmbientMode(mode);
  }
);

// Update ambient lighting based on mode
function updateAmbientMode(mode: "major" | "minor") {
  if (!gradientRef.value) return;

  const isMinor = mode === "minor";

  gsap.to(gradientRef.value, {
    opacity: isMinor ? 0.7 : 1,
    filter: isMinor
      ? "brightness(0.6) saturate(0.8)"
      : "brightness(1) saturate(1)",
    duration: 1.5,
    ease: "power2.inOut",
  });
}

// Create animated gradient blob
function createGradientBlob(colors: string[], x: number, y: number) {
  if (!gradientRef.value) return;

  const blob = document.createElement("div");
  blob.className = "gradient-blob";
  blob.style.cssText = `
    position: absolute;
    width: 60vw;
    height: 60vw;
    max-width: 600px;
    max-height: 600px;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0;
    mix-blend-mode: screen;
    background: ${colors};
    left: ${x}%;
    top: ${y}%;
    transform: translate(-50%, -50%);
  `;

  gradientRef.value.appendChild(blob);

  // Animate blob
  const tl = gsap.timeline({
    onComplete: () => {
      blob.remove();
    },
  });

  tl.to(blob, {
    opacity: 0.6,
    scale: 1.2,
    duration: 0.5,
    ease: "power2.out",
  }).to(blob, {
    opacity: 0,
    scale: 1.5,
    duration: 1.5,
    ease: "power2.inOut",
  });
}

// Create particle effect
function createParticles(count: number, color: string) {
  if (!particlesRef.value) return;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";
    particle.style.cssText = `
      position: absolute;
      width: 4px;
      height: 4px;
      background: ${color};
      border-radius: 50%;
      opacity: 0;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      box-shadow: 0 0 10px ${color};
    `;

    particlesRef.value.appendChild(particle);

    // Animate particle
    gsap.fromTo(
      particle,
      {
        opacity: 0,
        scale: 0,
        x: 0,
        y: 0,
      },
      {
        opacity: 1,
        scale: 1 + Math.random(),
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 200,
        duration: 2 + Math.random() * 2,
        ease: "power2.out",
        onComplete: () => {
          particle.remove();
        },
      }
    );
  }
}

// Handle note played event
function handleNotePlayed(event: CustomEvent) {
  const note: SolfegeData = event.detail.note;

  // Create gradient blob at random position
  const x = 30 + Math.random() * 40;
  const y = 30 + Math.random() * 40;
  createGradientBlob([note.colorGradient], x, y);

  // Create particles if note has flecks (check for colorFlecks property)
  if (note.colorFlecks) {
    // Extract first color from gradient for particles
    const gradientMatch = note.colorGradient.match(/#[0-9a-fA-F]{6}/);
    const particleColor = gradientMatch ? gradientMatch[0] : "#ffffff";
    createParticles(15, particleColor);
  }
}

// Setup ambient animation
function setupAmbientAnimation() {
  if (!gradientRef.value) return;

  // Create multiple gradient layers for depth
  const layers = 3;
  for (let i = 0; i < layers; i++) {
    const layer = document.createElement("div");
    layer.className = `ambient-layer layer-${i}`;
    layer.style.cssText = `
      position: absolute;
      inset: -50%;
      width: 200%;
      height: 200%;
      opacity: ${0.3 + i * 0.1};
      background: radial-gradient(
        ellipse at ${50 + i * 10}% ${50 - i * 10}%,
        ${i === 0 ? "#1e3a8a" : i === 1 ? "#7c3aed" : "#ec4899"} 0%,
        transparent 70%
      );
    `;
    gradientRef.value.appendChild(layer);

    // Animate layer
    gsap.to(layer, {
      rotation: 360,
      duration: 60 + i * 20,
      repeat: -1,
      ease: "none",
    });

    gsap.to(layer, {
      scale: 1.1 + i * 0.05,
      duration: 10 + i * 5,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
    });
  }
}

onMounted(() => {
  setupAmbientAnimation();
  updateAmbientMode(musicStore.currentMode);

  // Listen for note played events
  window.addEventListener("note-played", handleNotePlayed as EventListener);
});

onUnmounted(() => {
  window.removeEventListener("note-played", handleNotePlayed as EventListener);

  // Clean up GSAP animations
  if (gradientRef.value) {
    gsap.killTweensOf(gradientRef.value);
  }
  gsap.killTweensOf(".ambient-layer");
  gsap.killTweensOf(".gradient-blob");
  gsap.killTweensOf(".particle");
});
</script>

<template>
  <div class="animated-background">
    <!-- Gradient layers -->
    <div ref="gradientRef" class="gradient-container"></div>

    <!-- Particle container -->
    <div ref="particlesRef" class="particles-container"></div>

    <!-- Noise texture overlay -->
    <!-- <div class="noise-overlay"></div> -->
  </div>
</template>

<style scoped>
.animated-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.gradient-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.particles-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.noise-overlay {
  position: absolute;
  inset: 0;
  opacity: 0.03;
  mix-blend-mode: overlay;
  background-image: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 2px,
      rgba(255, 255, 255, 0.03) 2px,
      rgba(255, 255, 255, 0.03) 4px
    ),
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 2px,
      rgba(255, 255, 255, 0.03) 2px,
      rgba(255, 255, 255, 0.03) 4px
    );
}

:deep(.gradient-blob) {
  will-change: transform, opacity;
}

:deep(.particle) {
  will-change: transform, opacity;
}

:deep(.ambient-layer) {
  will-change: transform;
  transform-origin: center;
}
</style>
