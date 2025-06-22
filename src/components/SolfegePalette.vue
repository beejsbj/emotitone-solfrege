<script setup lang="ts">
import { computed } from 'vue'
import { useMusicStore } from '@/stores/music'
import SolfegeButton from './SolfegeButton.vue'
import type { SolfegeNote } from '@/services/music'

const musicStore = useMusicStore()

// Get current scale notes from store
const scaleNotes = computed(() => musicStore.scaleNotes)

// Handle note click from child button
function handleNoteClick(note: SolfegeNote) {
  // Emit background animation event
  const event = new CustomEvent('note-played', {
    detail: { note },
  })
  window.dispatchEvent(event)
}
</script>

<template>
  <div class="solfege-palette">
    <!-- Main solfege buttons grid -->
    <div class="grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-4 max-w-6xl mx-auto">
      <SolfegeButton
        v-for="(note, index) in scaleNotes"
        :key="`${note.name}-${note.degree}`"
        :note="note"
        :index="index"
        @note-clicked="handleNoteClick"
      />
    </div>

    <!-- Scale display -->
    <div class="mt-8 text-center">
      <h3 class="text-lg font-display font-[400] opacity-80 mb-2">
        Current Scale: {{ musicStore.currentKey }} {{ musicStore.currentMode }}
      </h3>
      <div class="flex flex-wrap justify-center gap-2">
        <span
          v-for="(note, index) in scaleNotes"
          :key="`scale-${index}`"
          class="px-3 py-1 rounded-full text-sm font-[300] bg-white/10 backdrop-blur"
        >
          {{ note.degree }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.solfege-palette {
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
