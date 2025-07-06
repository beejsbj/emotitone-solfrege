<template>
  <div id="app" class="min-h-screen">
    <!-- Loading Splash Screen -->
    <LoadingSplash />

    <!-- Vue Sonner Toast Notifications -->
    <!-- <Toaster position="top-right" :duration="4000" theme="dark" richColors /> -->

    <!-- Unified Visual Effects (replaces DynamicBackground and VibratingStrings) -->
    <UnifiedVisualEffects v-if="!isLoading" />

    <!-- Configuration Panel (Development Only) -->
    <ConfigPanel v-if="!isLoading" />
    <InstrumentSelector />

    <!-- Main Content with Tabs -->
    <div v-if="!isLoading" class="relative z-10 min-h-screen flex flex-col">
      <Tabs v-model="activeTab" default-value="app" class="flex flex-col h-screen">
        <TabsList class="app-tabs-list">
          <TabsTrigger value="app" class="app-tab-trigger">
            🎵 EmotiTone Solfège
          </TabsTrigger>
          <TabsTrigger value="systemcheck" class="app-tab-trigger">
            🔬 System Check
          </TabsTrigger>
        </TabsList>

        <!-- Main Application Tab -->
        <TabsContent value="app" class="app-tab-content flex-1">
          <!-- Header -->
          <AppHeader />

          <SequencerSection />

          <FloatingPopup />
          <StickyBottom />
        </TabsContent>

        <!-- System Check Tab -->
        <TabsContent value="systemcheck" class="app-tab-content flex-1">
          <SystemCheck />
        </TabsContent>
      </Tabs>
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
import { ref } from "vue";
import { useMusicStore } from "@/stores/music";
import { useAppLoading } from "@/composables/useAppLoading";
import LoadingSplash from "@/components/LoadingSplash.vue";
import FloatingPopup from "@/components/FloatingPopup.vue";
import UnifiedVisualEffects from "@/components/UnifiedVisualEffects.vue";
import AppHeader from "@/components/AppHeader.vue";
import ConfigPanel from "@/components/ConfigPanel.vue";
import InstrumentSelector from "@/components/InstrumentSelector.vue";
import SequencerSection from "@/components/SequencerSection.vue";
import TooltipRenderer from "@/components/TooltipRenderer.vue";
import SystemCheck from "@/components/SystemCheck.vue";
import Tabs from "@/components/ui/Tabs.vue";
import TabsList from "@/components/ui/TabsList.vue";
import TabsTrigger from "@/components/ui/TabsTrigger.vue";
import TabsContent from "@/components/ui/TabsContent.vue";
import { globalTooltip } from "@/directives/tooltip";
import StickyBottom from "@/components/StickyBottom.vue";
import { logger } from "@/utils";

// Stores and composables
const musicStore = useMusicStore();
const { isLoading } = useAppLoading();

// Tab state
const activeTab = ref("app");

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

/* App-level tab styling */
.app-tabs-list {
  background: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px;
  z-index: 20;
}

.app-tab-trigger {
  padding: 12px 24px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.2s ease;
  color: rgba(255, 255, 255, 0.7);
}

.app-tab-trigger:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.app-tab-trigger[data-state="active"] {
  background: rgba(16, 185, 129, 0.2);
  color: rgb(16, 185, 129);
  border-color: rgba(16, 185, 129, 0.3);
}

.app-tab-content {
  overflow-y: auto;
  position: relative;
}
</style>
