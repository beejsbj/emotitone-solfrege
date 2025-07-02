<template>
  <div id="app" class="min-h-screen">
    <!-- Loading Splash Screen -->
    <LoadingSplash />

    <!-- Vue Sonner Toast Notifications -->
    <!-- <Toaster position="top-right" :duration="4000" theme="dark" richColors /> -->

    <!-- Unified Visual Effects (replaces DynamicBackground and VibratingStrings) -->
    <UnifiedVisualEffects v-if="!isLoading" />

    <!-- Auto Visual Effects Debug Panel (Development Only) -->
    <AutoDebugPanel v-if="!isLoading" />
    <InstrumentSelector />

    <!-- Main Content -->
    <div v-if="!isLoading" class="relative z-10 min-h-screen flex flex-col">
      <!-- Header -->
      <AppHeader />

      <!-- Main App Content -->
      <main class="flex-1">
        <div class="max-w-6xl mx-auto">
          <div class="grid grid-cols-1 gap-6">
            <!-- Key Selector -->
            <div class="lg:col-span-1 h-screen">
              <!-- <KeySelector /> -->
            </div>

            <!-- Multi-Sequencer Section -->
            <SequencerSection class="pb-50" />

            <!-- Main Content Area - Add bottom padding for the bottom tab bar -->
            <div class="">
              <!-- Generous padding to account for bottom tab bar -->
              <!-- Floating Interval Description Popup -->
              <FloatingPopup />
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Bottom Tab Bar - Always visible when app is loaded -->
    <BottomTabBar v-if="!isLoading" class="pt-20">
      <template #palette>
        <CanvasSolfegePalette />
      </template>

      <template #sequencer>
        <SequencerControls />
      </template>
    </BottomTabBar>
  </div>
</template>

<script setup lang="ts">
import { useMusicStore } from "@/stores/music";
import { useAppLoading } from "@/composables/useAppLoading";
import LoadingSplash from "@/components/LoadingSplash.vue";
import KeySelector from "@/components/KeySelector.vue";
import FloatingPopup from "@/components/FloatingPopup.vue";
import UnifiedVisualEffects from "@/components/UnifiedVisualEffects.vue";
import CanvasSolfegePalette from "@/components/CanvasSolfegePalette.vue";
import AppHeader from "@/components/AppHeader.vue";
import AutoDebugPanel from "@/components/AutoDebugPanel.vue";
import InstrumentSelector from "@/components/InstrumentSelector.vue";
import SequencerSection from "@/components/SequencerSection.vue";
import SequencerControls from "@/components/SequencerControls.vue";
import BottomTabBar from "@/components/BottomTabBar.vue";

// Stores and composables
const musicStore = useMusicStore();
const { isLoading } = useAppLoading();

// Debug: Log the number of solfege notes
console.log("Number of solfege notes:", musicStore.solfegeData.length);
console.log(
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
