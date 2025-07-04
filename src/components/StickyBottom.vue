<script setup lang="ts">
import { ref, watch } from "vue";
import { ChevronDown } from "lucide-vue-next";
import SequencerControls from "@/components/SequencerControls.vue";
import KeySelector from "@/components/KeySelector.vue";
import CanvasSolfegePalette from "@/components/CanvasSolfegePalette.vue";
import useGSAP from "@/composables/useGSAP";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

// State for component visibility
const isKeyWheelMinimized = ref(true);
const isMinimized = ref(false);

// Refs for animation targets
const keyWheelRef = ref<HTMLElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);

// GSAP animations setup
useGSAP(({ gsap }) => {
  // Watch for minimize state changes

  gsap.set(keyWheelRef.value, { yPercent: 100 });

  watch(isMinimized, (minimized) => {
    if (!containerRef.value) return;

    gsap.to(containerRef.value, {
      yPercent: minimized ? 85 : 0,
      duration: 0.4,
      ease: "back.out(1.2)",
    });
  });

  watch(isKeyWheelMinimized, (minimized) => {
    gsap.to(keyWheelRef.value, {
      duration: 0.6,
      yPercent: minimized ? 100 : 40,
      ease: "power2.inOut",
    });
  });
});

const toggleKeySelector = (event: Event) => {
  event.preventDefault();
  event.stopPropagation();

  triggerUIHaptic();
  isKeyWheelMinimized.value = !isKeyWheelMinimized.value;
};

const toggleMinimize = () => {
  triggerUIHaptic();
  isMinimized.value = !isMinimized.value;
};
</script>

<template>
  <!-- Bottom Tab Bar - Always visible when app is loaded -->
  <div
    ref="containerRef"
    class="grid sticky bottom-0 w-full z-50 bg-black/80 backdrop-blur-lg"
  >
    <!-- Key Selector Toggle Button -->
    <button
      @click="toggleKeySelector"
      class="absolute top-2 left-4 transform -translate-y-full px-4 z-10 bg-gradient-to-b from-gray-700/80 to-black p-2 hover:bg-white/40 transition-colors duration-200 group rounded-lg flex items-center gap-2"
    >
      Keys
      <ChevronDown
        :size="16"
        class="text-white/80 transition-transform duration-300"
        :class="{ 'rotate-180': isKeyWheelMinimized }"
      />
    </button>

    <!-- Minimize Button -->
    <button
      @click="toggleMinimize"
      class="absolute top-2 right-4 transform -translate-y-full px-4 z-10 bg-gradient-to-b from-gray-700/80 to-black p-2 hover:bg-white/40 transition-colors duration-200 group rounded-lg flex items-center gap-2"
    >
      <ChevronDown
        :size="16"
        class="text-white/80 transition-transform duration-300"
        :class="{ 'rotate-180': isMinimized }"
      />
    </button>

    <div
      ref="keyWheelRef"
      class="absolute bottom-full left-0 w-full transform-gpu"
    >
      <KeySelector />
    </div>
    <SequencerControls />
    <CanvasSolfegePalette />
  </div>
</template>
