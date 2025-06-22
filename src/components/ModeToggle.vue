<script setup lang="ts">
import { computed } from 'vue'
import { useMusicStore } from '@/stores/music'

const musicStore = useMusicStore()

const isMajor = computed(() => musicStore.currentMode === 'major')

function toggleMode() {
  musicStore.setMode(isMajor.value ? 'minor' : 'major')
}
</script>

<template>
  <div class="mode-toggle">
    <label class="block text-sm font-display font-[400] opacity-80 mb-1"> Mode </label>
    <button @click="toggleMode" class="toggle-button" :class="{ 'is-minor': !isMajor }">
      <span class="toggle-track">
        <span class="toggle-thumb"></span>
      </span>
      <span class="toggle-label">
        {{ isMajor ? 'Major' : 'Minor' }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.mode-toggle {
  @apply inline-block;
}

.toggle-button {
  @apply flex items-center gap-3;
  @apply px-4 py-2 rounded-lg;
  @apply bg-white/10 backdrop-blur;
  @apply border border-white/20;
  @apply text-white;
  @apply font-display font-[300];
  @apply cursor-pointer;
  @apply transition-all duration-200;
  @apply hover:bg-white/20;
  @apply focus:outline-none focus:ring-2 focus:ring-white/30;
}

.toggle-track {
  @apply relative inline-block;
  @apply w-12 h-6;
  @apply bg-white/20 rounded-full;
  @apply transition-all duration-300;
}

.toggle-thumb {
  @apply absolute top-0.5 left-0.5;
  @apply w-5 h-5;
  @apply bg-white rounded-full;
  @apply transition-transform duration-300;
  @apply transform translateX-0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-button.is-minor .toggle-thumb {
  @apply translate-x-6;
}

.toggle-button.is-minor .toggle-track {
  @apply bg-purple-500/30;
}

.toggle-label {
  min-width: 50px;
  text-align: left;
}
</style>
