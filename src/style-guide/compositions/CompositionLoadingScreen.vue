<script setup lang="ts">
import LoadingScreen from "../../components/compositions/LoadingScreen.vue";
</script>

<template>
  <section class="preview-port preview-port--composition-loading-screen">
    <div class="card">
      <LoadingScreen
        mode="specimen"
        :progress="100"
        :is-complete="true"
        phase="Ready to play"
        message="Everything is tuned. Your first note is waiting."
        :stages="[
          { label: 'Visual stage', complete: true, active: false },
          { label: 'Instrument samples', complete: true, active: false },
          { label: 'Audio system', complete: true, active: false },
          { label: 'Ready to play', complete: true, active: false },
          { label: 'MIDI input', complete: true, active: false, icon: 'midi' },
        ]"
      />

      <div class="caption">
        The accepted startup composition: living Brand Logo, restrained floating Marks, stamped loading
        stages, equalizer meter, twelve chromatic solfège lanes, and the brass Play gate. Production
        `LoadingSplash.vue` owns initialization behavior and feeds state into this source composition.
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}

.preview-port :deep(.loading-screen) {
  height: 720px;
}

.preview-port :deep(.converged-loader__main) {
  width: 100%;
  grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr);
  gap: clamp(18px, 4vw, 46px);
}

.preview-port :deep(.converged-loader__progress-stage) {
  width: min(62%, 720px);
}

.caption {
  margin-top: 14px;
  color: var(--fg-3);
  line-height: 1.55;
}
</style>
