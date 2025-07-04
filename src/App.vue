<template>
  <div id="app" class="min-h-screen">
    <!-- Loading Splash Screen -->
    <LoadingSplash />

    <!-- Vue Sonner Toast Notifications -->
    <!-- <Toaster position="top-right" :duration="4000" theme="dark" richColors /> -->

    <!-- Unified Visual Effects (replaces DynamicBackground and VibratingStrings) -->
    <UnifiedVisualEffects v-if="!isLoading" />

    <!-- Auto Visual Effects Debug Panel (Development Only) -->
    <ConfigPanel v-if="!isLoading" />
    <SystemsCheckButton v-if="!isLoading" />
    <InstrumentSelector />

    <!-- Main Content -->
    <div v-if="!isLoading" class="relative z-10 min-h-screen flex flex-col">
      <!-- Header -->
      <AppHeader />

      <SequencerSection />

      <FloatingPopup />
      <StickyBottom />
    </div>

    <!-- Global Tooltip Renderer -->
    <TooltipRenderer
      :tooltip-state="globalTooltip.tooltipState.value"
      :rotation="globalTooltip.rotation.value"
      :translation="globalTooltip.translation.value"
    />
  </div>
</template>

<script setup lang="ts">
import { useMusicStore } from "@/stores/music";
import { useAppLoading } from "@/composables/useAppLoading";
import { logger } from "@/utils/logger";
import LoadingSplash from "@/components/LoadingSplash.vue";
import FloatingPopup from "@/components/FloatingPopup.vue";
import UnifiedVisualEffects from "@/components/UnifiedVisualEffects.vue";
import AppHeader from "@/components/AppHeader.vue";
import ConfigPanel from "@/components/ConfigPanel.vue";
import InstrumentSelector from "@/components/InstrumentSelector.vue";
import SequencerSection from "@/components/SequencerSection.vue";
import TooltipRenderer from "@/components/TooltipRenderer.vue";
import { globalTooltip } from "@/directives/tooltip";
import StickyBottom from "@/components/StickyBottom.vue";
import SystemsCheckButton from "@/components/SystemsCheckButton.vue";
// Stores and composables
const musicStore = useMusicStore();
const { isLoading } = useAppLoading();

// Debug: Log the number of solfege notes
logger.dev("Number of solfege notes:", musicStore.solfegeData.length);
logger.dev(
  "Solfege data:",
  musicStore.solfegeData.map((s) => s.name)
);

const handleScroll = (direction: number) => {
  const container = document.querySelector(".sticky");
  if (container) {
    container.scrollLeft += window.innerWidth * direction;
  }
};
</script>

<style scoped>
/* Hide the scroller */
/* Hide scrollbars */
.scrollbar-hide {
  -ms-overflow-style: none; /* Internet Explorer 10+ */
  scrollbar-width: none; /* Firefox */
}

.scrollbar-hide::-webkit-scrollbar {
  display: none; /* Safari and Chrome */
}
</style>
