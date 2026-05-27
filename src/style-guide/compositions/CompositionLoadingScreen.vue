<script setup lang="ts">
import LoadingScreen from "../../components/compositions/LoadingScreen.vue";
</script>

<template>
  <section class="preview-port preview-port--composition-loading-screen">
    <div class="card">
      <LoadingScreen
        mode="specimen"
        :progress="57"
        phase-label="Tuning the room..."
        step-message="Loading samples, wiring transport, tuning the room."
        :checks="[
          { label: 'Audio system', complete: true },
          { label: 'All instruments', complete: false },
          { label: 'Visual engine', complete: true },
        ]"
      />

      <div class="caption">
        The hero composition repurposed as a loading state. The chromatic tape doubles as the progress
        meter — segments light from <em>Do</em> through <em>Ti</em> as samples wire up, the lit portion pulsing
        on the beat. The room is awake before the music starts. App `LoadingSplash.vue` owns behavior and
        feeds state into this source composition.
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}

.caption {
  margin-top: 14px;
  color: var(--fg-3);
  line-height: 1.55;
}
</style>
