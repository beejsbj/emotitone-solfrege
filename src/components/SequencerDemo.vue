<template>
  <div class="max-w-7xl mx-auto space-y-8 p-4">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-white mb-2">
        🎵 Refactored Sequencer Architecture
      </h1>
      <p class="text-white/80 text-lg">
        Clean, modular components working in perfect harmony
      </p>
    </div>

    <!-- Demo Section 1: Independent Controls -->
    <div
      class="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg p-6 border border-white/20"
    >
      <h2 class="text-xl font-bold text-white mb-4">
        ✨ Independent Sequencer Controls
      </h2>
      <p class="text-white/80 mb-4">
        These controls work with any sequencer implementation:
      </p>
      <SequencerControls
        :on-toggle-playback="demoTogglePlayback"
        :on-clear-sequencer="demoClearSequencer"
      />
    </div>

    <!-- Demo Section 2: Standalone Melody Library -->
    <div
      class="bg-gradient-to-r from-green-500/20 to-teal-500/20 rounded-lg p-6 border border-white/20"
    >
      <h2 class="text-xl font-bold text-white mb-4">
        📚 Unified Melody Library
      </h2>
      <p class="text-white/80 mb-4">
        All patterns, intervals, and melodies in one searchable component:
      </p>
      <div class="max-w-md">
        <MelodyLibrary />
      </div>
    </div>

    <!-- Demo Section 3: Pure Visual Component -->
    <div
      class="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg p-6 border border-white/20"
    >
      <h2 class="text-xl font-bold text-white mb-4">
        🎯 Pure Circular Sequencer Visual
      </h2>
      <p class="text-white/80 mb-4">
        Just the visual interaction, no controls or external dependencies:
      </p>
      <div class="max-w-md mx-auto">
        <CircularSequencerVisual />
      </div>
    </div>

    <!-- Demo Section 4: Full Integration -->
    <div
      class="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-6 border border-white/20"
    >
      <h2 class="text-xl font-bold text-white mb-4">🔥 Complete Integration</h2>
      <p class="text-white/80 mb-4">
        All three components working together as intended:
      </p>
      <RefactoredSequencer />
    </div>

    <!-- Architecture Benefits -->
    <div class="bg-white/5 rounded-lg p-6 border border-white/20">
      <h2 class="text-xl font-bold text-white mb-4">🏗 Architecture Benefits</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-white/80">
        <div class="space-y-2">
          <h3 class="font-bold text-green-400">✅ Separation of Concerns</h3>
          <ul class="text-sm space-y-1">
            <li>• Visual logic isolated</li>
            <li>• Controls are reusable</li>
            <li>• Data management centralized</li>
          </ul>
        </div>
        <div class="space-y-2">
          <h3 class="font-bold text-blue-400">🔄 Reusability</h3>
          <ul class="text-sm space-y-1">
            <li>• Components work independently</li>
            <li>• Easy to test in isolation</li>
            <li>• Mix and match as needed</li>
          </ul>
        </div>
        <div class="space-y-2">
          <h3 class="font-bold text-purple-400">⚡ Maintainability</h3>
          <ul class="text-sm space-y-1">
            <li>• No code duplication</li>
            <li>• Clear responsibilities</li>
            <li>• Easy to extend</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMusicStore } from "@/stores/music";
import CircularSequencerVisual from "./CircularSequencerVisual.vue";
import SequencerControls from "./SequencerControls.vue";
import MelodyLibrary from "./MelodyLibrary.vue";
import RefactoredSequencer from "./RefactoredSequencer.vue";

const musicStore = useMusicStore();

// Demo control functions (these would be replaced with actual sequencer logic in real use)
const demoTogglePlayback = () => {
  console.log("Demo: Toggle playback called!");
  // In a real implementation, this would control the sequencer
};

const demoClearSequencer = () => {
  console.log("Demo: Clear sequencer called!");
  // In a real implementation, this would clear the sequencer
  musicStore.clearSequencerBeats();
};
</script>

<style scoped>
/* Demo-specific styles */
</style>
