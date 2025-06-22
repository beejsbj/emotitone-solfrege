<script setup lang="ts">
import { useMusicStore } from '@/stores/music'
import { KEYS } from '@/services/music'

const musicStore = useMusicStore()

function handleKeyChange(event: Event) {
  const target = event.target as HTMLSelectElement
  musicStore.setKey(target.value)
}
</script>

<template>
  <div class="key-selector">
    <label class="block text-sm font-display font-[400] opacity-80 mb-1"> Key </label>
    <select :value="musicStore.currentKey" @change="handleKeyChange" class="select-input">
      <option v-for="key in KEYS" :key="key" :value="key">
        {{ key }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.key-selector {
  @apply inline-block;
}

.select-input {
  @apply px-4 py-2 rounded-lg;
  @apply bg-white/10 backdrop-blur;
  @apply border border-white/20;
  @apply text-white;
  @apply font-display font-[300];
  @apply cursor-pointer;
  @apply transition-all duration-200;
  @apply hover:bg-white/20;
  @apply focus:outline-none focus:ring-2 focus:ring-white/30;
  min-width: 80px;
}

.select-input option {
  @apply bg-gray-800;
}
</style>
