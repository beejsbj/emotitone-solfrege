<script setup lang="ts">
import LiveStrip from "@/components/patterns/LiveStrip.vue";
import { useLiveStrudelMirror } from "@/composables/useLiveStrudelMirror";

const { isPlaying } = useLiveStrudelMirror();
</script>

<template>
  <div class="live-card" :class="{ 'live-card--playing': isPlaying }">
    <div class="live-card__body">
      <LiveStrip />
    </div>
  </div>
</template>

<style scoped>
.live-card {
  background-color: hsla(0, 0%, 0%, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid hsla(0, 0%, 100%, 0.1);
  user-select: none;
  contain: layout style;
  transition: border-bottom-color 0.3s ease, box-shadow 0.3s ease;
  overflow-x: hidden;
  min-width: 0;
}

.live-card--playing {
  border-bottom-color: hsla(0, 0%, 76%, 0.2);
  box-shadow: 0 0 16px hsla(0, 0%, 100%, 0.04);
}

.live-card__body {
  padding: 0.2rem 0.25rem 0.24rem;
  overflow: hidden;
}

@media (max-width: 480px) {
  .live-card__body {
    padding: 0.16rem 0.18rem 0.2rem;
  }
}
</style>
