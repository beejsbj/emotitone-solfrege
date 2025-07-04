<template>
  <Teleport to="body">
    <div
      v-if="tooltipState.isVisible"
      ref="tooltipRef"
      :style="{
        position: 'fixed',
        left: `${tooltipState.position.x}px`,
        top: `${tooltipState.position.y}px`,
        transform: `translate(-50%, -100%) translateX(${translation}px) rotate(${rotation}deg)`,
        zIndex: 9999,
        pointerEvents: 'none',
      }"
      class="flex flex-col items-center justify-center whitespace-nowrap rounded-md bg-black px-4 py-2 text-xs shadow-xl"
    >
      <div
        class="absolute right-1/2 translate-x-1/2 -bottom-px z-30 h-px w-2/5 me-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
      />
      <div
        class="absolute left-1/2 -translate-x-1/2 -bottom-px z-30 h-px w-2/5 ms-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent"
      />
      <div class="relative z-30 text-base font-bold text-white">
        {{ tooltipState.content }}
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import type { TooltipState } from "@/composables/useTooltip";
import useGSAP from "@/composables/useGSAP";

const props = defineProps<{
  tooltipState: TooltipState;
  rotation: number;
  translation: number;
}>();

const tooltipRef = ref<HTMLElement>();

// Initialize GSAP with our composable
useGSAP(({ gsap }) => {
  // Handle tooltip animations
  watch(
    () => props.tooltipState.isVisible,
    async (isVisible) => {
      if (!tooltipRef.value) return;

      if (isVisible) {
        await nextTick();
        // Initial state - more dramatic for that bounce effect
        gsap.set(tooltipRef.value, {
          opacity: 0,
          y: 30,
          scale: 0.3,
          rotation: 10,
        });

        // Animate in with bouncy spring effect
        gsap.to(tooltipRef.value, {
          opacity: 1,
          y: 0,
          scale: 1,
          rotation: 0,
          duration: 0.6,
          ease: "elastic.out(1, 0.5)", // More bouncy!
        });
      } else {
        // Animate out quickly
        gsap.to(tooltipRef.value, {
          opacity: 0,
          y: 15,
          scale: 0.8,
          duration: 0.15,
          ease: "power2.in",
        });
      }
    },
    { immediate: true }
  );
});
</script>
