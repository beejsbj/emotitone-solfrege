<template>
  <div class="min-h-screen flex flex-col">
    <!-- Tab Navigation -->
    <div class="bg-gray-900/95 backdrop-blur-lg border-b border-gray-700 sticky top-0 z-50">
      <div class="px-4 py-2">
        <div class="flex space-x-1">
          <button
            @click="activeTab = 'app'"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
              activeTab === 'app'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            ]"
          >
            🎵 App
          </button>
          <button
            @click="activeTab = 'systems'"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
              activeTab === 'systems'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            ]"
          >
            🔧 Systems Check
          </button>
        </div>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="flex-1 relative">
      <!-- App Tab -->
      <div v-show="activeTab === 'app'" class="h-full">
        <slot name="app" />
      </div>

      <!-- Systems Check Tab -->
      <div v-show="activeTab === 'systems'" class="h-full">
        <slot name="systems" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const activeTab = ref<'app' | 'systems'>('app');
</script>

<style scoped>
/* Ensure tabs take full height */
.h-full {
  height: calc(100vh - 3rem); /* Subtract tab bar height */
}
</style>