<template>
  <div
    id="app"
    class="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 font-weight-oscillate-full"
  >
    <!-- Unified Visual Effects (replaces DynamicBackground and VibratingStrings) -->
    <UnifiedVisualEffects />

    <!-- Floating Interval Description Popup -->
    <FloatingPopup />

    <!-- Visual Effects Debug Panel (Development Only) -->
    <VisualEffectsDebugPanel v-if="isDev" />

    <!-- Main Content -->
    <div class="relative z-10 min-h-screen flex flex-col">
      <!-- Header -->
      <AppHeader />

      <!-- Main App Content -->
      <main class="flex-1 p-4">
        <div class="max-w-6xl mx-auto">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Key Selector -->
            <div class="lg:col-span-1">
              <KeySelector />
            </div>

            <!-- Solfege Palette -->
            <div class="lg:col-span-2">
              <SolfegePalette />
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
import VisualEffectsDebugPanel from "@/components/VisualEffectsDebugPanel.vue";

// Check if we're in development mode
const isDev = import.meta.env.DEV;

const musicStore = useMusicStore();

// Debug: Log the number of solfege notes
console.log("Number of solfege notes:", musicStore.solfegeData.length);
console.log(
  "Solfege data:",
  musicStore.solfegeData.map((s) => s.name)
);
</script>
