<template>
  <div id="app" class="min-h-screen">
    <!-- Unified Visual Effects (replaces DynamicBackground and VibratingStrings) -->
    <UnifiedVisualEffects />

    <!-- Floating Interval Description Popup -->
    <FloatingPopup />

    <!-- Auto Visual Effects Debug Panel (Development Only) -->
    <AutoDebugPanel />

    <!-- Main Content -->
    <div class="relative z-10 min-h-screen flex flex-col">
      <!-- Header -->
      <AppHeader />

      <!-- Main App Content -->
      <main class="flex-1">
        <div class="max-w-6xl mx-auto">
          <div class="grid grid-cols-1 gap-6">
            <!-- Key Selector -->
            <div class="lg:col-span-1">
              <KeySelector />
            </div>

            <!-- Piano Loading Indicator -->
            <PianoLoadingIndicator />
            <InstrumentSelector />

            <!-- Pattern Player -->

            <!-- Sticky horizontal scroller -->
            <div
              class="sticky bottom-0 flex items-end overflow-x-auto snap-x snap-mandatory scroll-smooth gap-1"
            >
              <div class="snap-start shrink-0 w-screen">
                <button>patterns</button>
                <SolfegePalette />
              </div>
              <div class="snap-start shrink-0 w-screen">
                <button>Keys</button>
                <PatternPlayer />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMusicStore } from "@/stores/music";
import KeySelector from "@/components/KeySelector.vue";
import FloatingPopup from "@/components/FloatingPopup.vue";
import UnifiedVisualEffects from "@/components/UnifiedVisualEffects.vue";
import SolfegePalette from "@/components/SolfegePalette.vue";
import AppHeader from "@/components/AppHeader.vue";
import AutoDebugPanel from "@/components/AutoDebugPanel.vue";
import DynamicColorPreview from "@/components/DynamicColorPreview.vue";
import PatternPlayer from "@/components/PatternPlayer.vue";
import InstrumentSelector from "@/components/InstrumentSelector.vue";
import PianoLoadingIndicator from "@/components/PianoLoadingIndicator.vue";
import { useInstrumentStore } from "@/stores/instrument";

// Check if we're in development mode
const isDev = import.meta.env.DEV;

const musicStore = useMusicStore();

// Debug: Log the number of solfege notes
console.log("Number of solfege notes:", musicStore.solfegeData.length);
console.log(
  "Solfege data:",
  musicStore.solfegeData.map((s: any) => s.name)
);
</script>
