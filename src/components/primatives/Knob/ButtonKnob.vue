<template>
  <KnobFace
    role="button"
    :is-active="isActive && !isLoading"
    :color="currentStrokeColor"
    :visual="visual"
    :tone="tone"
  />

  <!-- Text/Icon -->
  <div
    class="knob-button__content"
    :style="{ color: currentStrokeColor }"
  >
    <component
      v-if="icon && !isLoading"
      :is="icon"
      :size="20"
      class="knob-button__icon"
    />
    <span
      v-else-if="buttonText && !isLoading"
      class="knob-button__text"
      >{{ buttonText }}</span
    >
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import KnobFace from "./KnobFace.vue";
import useGSAP from "@/composables/useGSAP";
import type { ButtonKnobProps } from "./types";

const props = withDefaults(defineProps<ButtonKnobProps>(), {
  isDisabled: false,
  isLoading: false,
  isActive: false,
  themeColor: "hsla(0, 0%, 82%, 1)",
  visual: "arc",
  tone: "ivory",
  readyColor: "hsla(0, 0%, 72%, 1)",
  activeColor: "hsla(0, 0%, 96%, 1)",
  loadingColor: "hsla(0, 0%, 58%, 1)",
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

.knob-button__content {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.knob-button__icon {
  inline-size: 31cqi;
  block-size: 31cqi;
}

.knob-button__text {
  max-inline-size: 58cqi;
  overflow: hidden;
  font-size: clamp(0.625rem, 22cqi, 1rem);
  font-weight: 700;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
