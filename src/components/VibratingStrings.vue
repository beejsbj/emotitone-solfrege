<template>
  <canvas
    ref="stringsCanvas"
    class="fixed inset-0 z-5 pointer-events-none"
    :width="canvasWidth"
    :height="canvasHeight"
  ></canvas>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";
import { gsap } from "gsap";

const musicStore = useMusicStore();
const stringsCanvas = ref<HTMLCanvasElement | null>(null);
const canvasWidth = ref(window.innerWidth);
const canvasHeight = ref(window.innerHeight);

// String vibration animation system
interface StringLine {
  x: number;
  baseY: number;
  amplitude: number;
  frequency: number;
  phase: number;
  color: string;
  opacity: number;
  isActive: boolean;
  noteIndex: number;
}

const strings = ref<StringLine[]>([]);
let animationId: number | null = null;
let startTime = 0;

// Initialize strings based on solfege notes
const initializeStrings = () => {
  if (!stringsCanvas.value) return;

  const canvas = stringsCanvas.value;
  const numStrings = 8; // One for each solfege note
  strings.value = [];

  for (let i = 0; i < numStrings; i++) {
    const string: StringLine = {
      x: (canvas.width / (numStrings + 1)) * (i + 1),
      baseY: canvas.height / 2,
      amplitude: 0,
      frequency: 0.5 + i * 0.1, // Different frequencies for each string
      phase: Math.random() * Math.PI * 2,
      color: musicStore.solfegeData[i]?.colorGradient || "#ffffff",
      opacity: 0.3,
      isActive: false,
      noteIndex: i,
    };
    strings.value.push(string);
  }
};

// Extract color from gradient for string rendering
const extractColorFromGradient = (gradient: string): string => {
  // Extract the first hex color from the gradient
  const match = gradient.match(/#[a-fA-F0-9]{6}/);
  return match ? match[0] : "#ffffff";
};

// Convert hex color to rgba with alpha
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Animate strings
const animateStrings = (timestamp: number) => {
  if (!stringsCanvas.value) return;

  if (!startTime) startTime = timestamp;
  const elapsed = (timestamp - startTime) / 1000;

  const canvas = stringsCanvas.value;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Clear canvas with black background color
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "hsla(0, 50%, 0%, 0.8)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw each string
  strings.value.forEach((string, index) => {
    const solfege = musicStore.solfegeData[index];
    if (!solfege) return;

    // Update string properties based on current note
    if (musicStore.currentNote === solfege.name) {
      string.isActive = true;
      string.amplitude = gsap.utils.interpolate(string.amplitude, 15, 0.15); // Reduced amplitude
      string.opacity = gsap.utils.interpolate(string.opacity, 0.9, 0.1);
      string.color = solfege.colorGradient; // Store the full gradient for color extraction

      // Get the actual musical frequency for this note and scale it for visual vibration
      const noteFrequency = musicStore.getNoteFrequency(index, 4); // Get frequency in Hz
      string.frequency = noteFrequency / 100; // Scale down for visual vibration (e.g., 440Hz -> 4.4 visual Hz)
    } else {
      string.isActive = false;
      string.amplitude = gsap.utils.interpolate(string.amplitude, 0, 0.08);
      string.opacity = gsap.utils.interpolate(string.opacity, 0.15, 0.05);
      // Keep a subtle base frequency when inactive
      const noteFrequency = musicStore.getNoteFrequency(index, 4);
      string.frequency = noteFrequency / 400; // Much slower when inactive
    }

    // Draw the vibrating string with gradient effect
    const baseColor = extractColorFromGradient(string.color);
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, hexToRgba(baseColor, 0.3)); // Semi-transparent at top
    gradient.addColorStop(0.5, baseColor); // Full color in middle
    gradient.addColorStop(1, hexToRgba(baseColor, 0.3)); // Semi-transparent at bottom

    ctx.beginPath();
    ctx.strokeStyle = string.isActive ? gradient : hexToRgba(baseColor, 0.4);
    ctx.globalAlpha = string.opacity;
    ctx.lineWidth = string.isActive ? 4 : 1.5;
    ctx.lineCap = "round";

    // Create vibrating line with realistic frequency-based movement
    const segments = 100;
    for (let i = 0; i <= segments; i++) {
      const y = i * (canvas.height / segments);
      const normalizedY = y / canvas.height;

      // Primary vibration based on actual note frequency
      const vibration1 =
        Math.sin(
          elapsed * string.frequency * 2 * Math.PI + string.phase + y * 0.005
        ) * string.amplitude;

      // Subtle harmonics for visual richness (much more subtle)
      const vibration2 =
        Math.sin(
          elapsed * string.frequency * 4 * Math.PI +
            string.phase * 1.2 +
            y * 0.008
        ) *
        string.amplitude *
        0.15;

      const vibration3 =
        Math.sin(
          elapsed * string.frequency * 6 * Math.PI +
            string.phase * 1.8 +
            y * 0.012
        ) *
        string.amplitude *
        0.05;

      // Damping effect towards the ends (like a real string fixed at both ends)
      const damping = Math.sin(normalizedY * Math.PI);
      const totalVibration = (vibration1 + vibration2 + vibration3) * damping;

      const x = string.x + totalVibration;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Add glow effect for active strings
    if (string.isActive && string.amplitude > 5) {
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;
  });

  animationId = requestAnimationFrame(animateStrings);
};

// Handle window resize
const handleResize = () => {
  canvasWidth.value = window.innerWidth;
  canvasHeight.value = window.innerHeight;
  nextTick(() => {
    initializeStrings();
  });
};

// Lifecycle hooks
onMounted(() => {
  window.addEventListener("resize", handleResize);
  nextTick(() => {
    initializeStrings();
    animationId = requestAnimationFrame(animateStrings);
  });
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
});
</script>
