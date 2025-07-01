<template>
  <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 p-4">
    <!-- Original Sequencer -->
    <div class="space-y-4">
      <div class="bg-red-500/20 border border-red-500/30 rounded-sm p-3">
        <h2 class="text-red-200 font-bold mb-2">⚠️ Original Sequencer (Issues)</h2>
        <ul class="text-red-300 text-sm space-y-1">
          <li>• Complex canvas interaction</li>
          <li>• Inconsistent hit detection</li>
          <li>• Poor touch experience</li>
          <li>• No haptic feedback</li>
          <li>• Fragmented interaction models</li>
        </ul>
      </div>
      <CircularSequencer />
    </div>

    <!-- Improved Sequencer -->
    <div class="space-y-4">
      <div class="bg-green-500/20 border border-green-500/30 rounded-sm p-3">
        <h2 class="text-green-200 font-bold mb-2">✅ Improved Sequencer (Knob-like UX)</h2>
        <ul class="text-green-300 text-sm space-y-1">
          <li>• Unified drag interaction pattern</li>
          <li>• Consistent event handling (from Knob)</li>
          <li>• Excellent touch support</li>
          <li>• Haptic feedback on all interactions</li>
          <li>• Visual state management</li>
          <li>• Snap-to-step system</li>
        </ul>
      </div>
      <ImprovedCircularSequencer />
    </div>
  </div>
</template>

<script setup lang="ts">
import CircularSequencer from "./CircularSequencer.vue";
import ImprovedCircularSequencer from "./ImprovedCircularSequencer.vue";
</script>

<style scoped>
/* Add any comparison-specific styles here */
</style>