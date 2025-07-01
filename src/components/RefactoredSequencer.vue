<template>
  <div class="refactored-sequencer-container">
    <!-- Sequencer Controls at Top -->

    <!-- Main Content: Sequencer and Library Side by Side -->
    <div class="main-content">
      <!-- Circular Sequencer -->
      <div class="sequencer-section">
        <h2 class="section-title">Circular Sequencer</h2>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SequencerControls from "./SequencerControls.vue";
import CircularSequencerVisual from "./CircularSequencerVisual.vue";

// That's it! SequencerControls now handles all its own logic
</script>

<style scoped>
.refactored-sequencer-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 100vh;
  padding: 20px;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  flex: 1;
}

.sequencer-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: white;
  text-align: center;
}

/* Mobile-first responsive design */
@media (min-width: 1024px) {
  .main-content {
    grid-template-columns: 1fr auto;
    align-items: start;
  }

  .sequencer-section {
    min-width: 0; /* Prevent overflow */
  }
}

/* Ensure proper spacing on mobile */
@media (max-width: 768px) {
  .refactored-sequencer-container {
    padding: 10px;
    gap: 15px;
  }

  .section-title {
    font-size: 16px;
  }
}
</style>
