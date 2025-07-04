<script setup lang="ts">
import { ref } from 'vue';
import { CheckCircle } from 'lucide-vue-next';
import SystemsCheckModal from './SystemsCheckModal.vue';

const showSystemsCheck = ref(false);
</script>

<template>
  <div>
    <!-- Floating Button -->
    <button
      @click="showSystemsCheck = true"
      class="fixed top-4 right-20 z-40 flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-purple-600/80 border border-purple-500 rounded backdrop-blur-lg transition-all hover:bg-purple-600/90 shadow-lg"
      title="Systems Check - Test restored functionality"
    >
      <CheckCircle :size="16" />
      <span class="hidden sm:inline">Systems Check</span>
    </button>
    
    <!-- Systems Check Modal -->
    <SystemsCheckModal :is-open="showSystemsCheck" @close="showSystemsCheck = false" />
  </div>
</template>