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

            <InstrumentSelector />

            <!-- Pattern Player -->

            <!-- Sticky horizontal scroller -->
            <div class="sticky bottom-0">
              <!-- Floating Interval Description Popup -->
              <KeySelector />

              <FloatingPopup />
              <div
                class="flex items-end overflow-x-auto snap-x snap-mandatory scroll-smooth gap-1 scrollbar-hide"
              >
                <div class="snap-start shrink-0 w-screen grid">
                  <button
                    @click="handleScroll(1)"
                    class="bg-gray-500 px-1 py-[1px] justify-self-end"
                  >
                    patterns
                  </button>
                  <!-- DOM Palette (for comparison) -->
                  <!-- <SolfegePalette /> -->
                  <CanvasSolfegePalette />
                </div>
                <div class="snap-start shrink-0 w-screen">
                  <button
                    @click="handleScroll(-1)"
                    class="bg-gray-500 px-1 py-[1px]"
                  >
                    Keys
                  </button>
                  <PatternPlayer />
                </div>
              </div>
            </div>

            <!-- Canvas Palette (new implementation) -->
          </div>
        </div>
      </main>
    </div>
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
import PatternPlayer from "@/components/PatternPlayer.vue";
import InstrumentSelector from "@/components/InstrumentSelector.vue";
import { Toaster } from "vue-sonner";

// Check if we're in development mode
const isDev = import.meta.env.DEV;

// Stores and composables
const musicStore = useMusicStore();
const { isLoading } = useAppLoading();

// Debug: Log the number of solfege notes
console.log("Number of solfege notes:", musicStore.solfegeData.length);
console.log(
  "Solfege data:",
  musicStore.solfegeData.map((s: any) => s.name)
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
