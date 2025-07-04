<template>
  <div id="app" class="min-h-screen">
    <!-- Loading Splash Screen -->
    <LoadingSplash />

    <!-- Main Tabs Interface -->
    <TabsContainer v-if="!isLoading">
      <!-- App Tab Content -->
      <template #app>
        <!-- Unified Visual Effects (replaces DynamicBackground and VibratingStrings) -->
        <UnifiedVisualEffects />

        <!-- Auto Visual Effects Debug Panel (Development Only) -->
        <ConfigPanel />
        <InstrumentSelector />

        <!-- Main Content -->
        <div class="relative z-10 min-h-screen flex flex-col">
          <!-- Header -->
          <AppHeader />

          <SequencerSection />

          <FloatingPopup />
          <StickyBottom />
        </div>
      </template>

      <!-- Systems Check Tab Content -->
      <template #systems>
        <SystemsCheck />
      </template>
    </TabsContainer>

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
import TabsContainer from "@/components/TabsContainer.vue";
import SystemsCheck from "@/components/SystemsCheck.vue";
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
