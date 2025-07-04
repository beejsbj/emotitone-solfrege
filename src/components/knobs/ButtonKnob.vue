<template>
  <KnobCircles
    type="button"
    :is-active="isActive && !isLoading"
    :color="currentStrokeColor"
  />

  <!-- Text/Icon -->
  <div
    class="absolute inset-0 flex items-center justify-center pointer-events-none"
    :style="{ color: currentStrokeColor }"
  >
    <component v-if="icon && !isLoading" :is="icon" :size="16" />
    <span
      v-else-if="buttonText && !isLoading"
      class="text-[9px] font-bold text-white"
      >{{ buttonText }}</span
    >
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import KnobCircles from "./KnobCircles.vue";
import useGSAP from "@/composables/useGSAP";
import type { ButtonKnobProps } from "@/types/knob";

const props = withDefaults(defineProps<ButtonKnobProps>(), {
  isDisabled: false,
  isLoading: false,
  isActive: false,
  themeColor: "hsla(158, 100%, 53%, 1)",
  readyColor: "hsla(120, 70%, 50%, 1)",
  activeColor: "hsla(0, 84%, 60%, 1)",
  loadingColor: "hsla(43, 96%, 56%, 1)",
});

// Refs
const spinnerRef = ref<SVGPathElement | null>(null);
const wrapperRef = ref<HTMLElement | null>(null);

// Computed
const currentStrokeColor = computed(() => {
  if (props.isLoading) return props.loadingColor;
  if (props.isActive) return props.activeColor;
  return props.readyColor;
});

const circlePath = computed(() => {
  const radius = 44; // Slightly smaller than the background circle
  return `M ${50 + radius} 50 A ${radius} ${radius} 0 1 1 ${50 - radius} 50`;
});

// GSAP animations
useGSAP(({ gsap }) => {
  // Loading spinner animation
  watch(
    () => props.isLoading,
    (isLoading) => {
      if (!spinnerRef.value) return;

      if (isLoading) {
        gsap.to(spinnerRef.value, {
          rotation: 360,
          transformOrigin: "50% 50%",
          duration: 1,
          ease: "none",
          repeat: -1,
        });
      } else {
        gsap.killTweensOf(spinnerRef.value);
      }
    },
    { immediate: true }
  );

  // Click animation
  watch(
    () => props.isActive,
    (isActive) => {
      if (!wrapperRef.value) return;

      gsap.to(wrapperRef.value, {
        scale: isActive ? 1.05 : 1,
        duration: 0.2,
        ease: "power2.out",
      });
    }
  );
});
</script>

<style scoped>
.knob-wrapper {
  user-select: none;
  touch-action: none;
  cursor: pointer;
}
</style>
