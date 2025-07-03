<template>
  <div ref="wrapperRef">
    <div class="w-12 h-12 mx-auto">
      <KnobCircles
        type="boolean"
        :is-active="modelValue && !isLoading"
        :color="currentStrokeColor"
      />
      <!-- Additional loading path for spinner -->
      <svg
        class="absolute inset-0 w-full h-full transform -rotate-90"
        viewBox="0 0 100 100"
        v-if="isLoading"
      >
        <path
          ref="spinnerRef"
          :d="circlePath"
          fill="none"
          :stroke="loadingColor"
          stroke-width="6"
          stroke-linecap="round"
        />
      </svg>
    </div>

    <!-- Text/Icon -->
    <div
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <component v-if="icon && !isLoading" :is="icon" :size="16" />
      <span v-else class="text-[9px] font-bold text-white">{{
        displayText
      }}</span>
    </div>

    <!-- Label -->
    <span class="text-gray-300 text-xs mt-1 block select-none">{{
      labelText
    }}</span>
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
  themeColor: "hsla(158, 100%, 53%, 1)",
  readyColor: "hsla(120, 70%, 50%, 1)",
  activeColor: "hsla(0, 84%, 60%, 1)",
  loadingColor: "hsla(43, 96%, 56%, 1)",
});

// Refs for spinner
const spinnerRef = ref<SVGPathElement | null>(null);

// Stroke colors depending on state
const currentStrokeColor = computed(() => {
  if (props.isLoading) return props.loadingColor;
  if (props.modelValue) return props.activeColor;
  return props.readyColor;
});

// Display text
const displayText = computed(() => {
  if (props.isLoading) return "...";
  if (props.modelValue && props.activeText) return props.activeText;
  if (props.modelValue) return "STOP";
  return props.buttonText || "PLAY";
});

// Loading spinner path (full circle)
const circlePath = "M 50 6 A 44 44 0 1 1 49.999 6";

// GSAP animation for spinner only
useGSAP(({ gsap }: { gsap: any }) => {
  // Loading spinner rotation
  watch(
    () => props.isLoading,
    (loading) => {
      if (!spinnerRef.value) return;
      if (loading) {
        gsap.to(spinnerRef.value, {
          rotation: 360,
          repeat: -1,
          ease: "none",
          duration: 1,
        });
      } else {
        gsap.killTweensOf(spinnerRef.value);
        gsap.set(spinnerRef.value, { rotation: 0 });
      }
    },
    { immediate: true }
  );
});

const labelText = computed(() => props.label || props.paramName);
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
