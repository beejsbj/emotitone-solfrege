<template>
  <div
    id="app"
    class="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900"
  >
    <!-- Dynamic Background -->
    <DynamicBackground />

    <!-- Vibrating Strings Canvas Background -->
    <VibratingStrings />

    <!-- Floating Interval Description Popup -->
    <FloatingPopup />

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

      <!-- Footer -->
      <AppFooter />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMusicStore } from "@/stores/music";
import KeySelector from "@/components/KeySelector.vue";
import FloatingPopup from "@/components/FloatingPopup.vue";
import VibratingStrings from "@/components/VibratingStrings.vue";
import DynamicBackground from "@/components/DynamicBackground.vue";
import SolfegePalette from "@/components/SolfegePalette.vue";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";

const musicStore = useMusicStore();

// Debug: Log the number of solfege notes
console.log("Number of solfege notes:", musicStore.solfegeData.length);
console.log(
  "Solfege data:",
  musicStore.solfegeData.map((s) => s.name)
);
</script>
