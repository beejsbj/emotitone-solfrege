<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMusicStore } from '@/stores/music'
import { playSequence, stopAllSounds } from '@/services/audio'
import { gsap } from 'gsap'
import type { SolfegeNote } from '@/services/music'

const musicStore = useMusicStore()
const sequencerRef = ref<HTMLDivElement>()
const playButtonRef = ref<HTMLButtonElement>()

// Computed properties
const sequence = computed(() => musicStore.sequence)
const hasNotes = computed(() => sequence.value.length > 0)
const isPlaying = computed(() => musicStore.isPlaying)

// Group sequence into sections of 4
const sequenceSections = computed(() => {
  const sections = []
  for (let i = 0; i < 16; i += 4) {
    sections.push({
      index: i / 4,
      notes: sequence.value.slice(i, i + 4),
      slots: Array(4)
        .fill(null)
        .map((_, j) => ({
          index: i + j,
          note: sequence.value[i + j] || null,
        })),
    })
  }
  return sections
})

// Play the sequence
async function playSequenceHandler() {
  if (isPlaying.value || !hasNotes.value) return

  musicStore.setIsPlaying(true)

  // Get note degrees for playback
  const noteDegrees = sequence.value.map((note) => note.degree)

  // Animate play button
  if (playButtonRef.value) {
    gsap.to(playButtonRef.value, {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
    })
  }

  try {
    await playSequence(noteDegrees, 120)
  } finally {
    musicStore.setIsPlaying(false)
  }
}

// Stop playback
function stopPlayback() {
  stopAllSounds()
  musicStore.setIsPlaying(false)
}

// Clear the sequence
function clearSequence() {
  musicStore.clearSequence()

  // Animate clear
  if (sequencerRef.value) {
    gsap.to(sequencerRef.value, {
      scale: 0.98,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
    })
  }
}

// Remove a note from sequence
function removeNote(index: number) {
  musicStore.removeFromSequence(index)
}

// Get gradient for note
function getNoteGradient(note: SolfegeNote) {
  return `linear-gradient(135deg, ${note.colorGradient.join(', ')})`
}
</script>

<template>
  <div ref="sequencerRef" class="sequencer">
    <!-- Controls -->
    <div class="flex justify-center gap-4 mb-6">
      <button
        ref="playButtonRef"
        @click="playSequenceHandler"
        :disabled="!hasNotes || isPlaying"
        class="control-button play-button"
        :class="{ 'is-playing': isPlaying }"
      >
        <span v-if="!isPlaying">▶ Play</span>
        <span v-else>Playing...</span>
      </button>

      <button @click="stopPlayback" :disabled="!isPlaying" class="control-button stop-button">
        ◼ Stop
      </button>

      <button
        @click="clearSequence"
        :disabled="!hasNotes || isPlaying"
        class="control-button clear-button"
      >
        ✕ Clear
      </button>
    </div>

    <!-- Sequence Grid -->
    <div class="sequence-grid">
      <div v-for="section in sequenceSections" :key="section.index" class="sequence-section">
        <div class="section-label">
          {{ section.index + 1 }}
        </div>

        <div class="section-slots">
          <div
            v-for="slot in section.slots"
            :key="slot.index"
            class="sequence-slot"
            :class="{ 'has-note': slot.note }"
          >
            <div
              v-if="slot.note"
              class="sequence-note"
              :style="{ background: getNoteGradient(slot.note) }"
              @click="removeNote(slot.index)"
            >
              <span class="note-name">{{ slot.note.name }}</span>
              <span class="note-degree">{{ slot.note.degree }}</span>
              <button class="remove-btn">×</button>
            </div>
            <div v-else class="empty-slot">
              <span class="slot-number">{{ slot.index + 1 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Instructions -->
    <div class="text-center mt-6 text-sm opacity-60">
      <p>Tap solfege buttons to add notes • Click notes to remove • Max 16 notes</p>
    </div>
  </div>
</template>

<style scoped>
.sequencer {
  @apply p-6 rounded-2xl;
  @apply bg-white/5 backdrop-blur;
  @apply border border-white/10;
}

.control-button {
  @apply px-6 py-3 rounded-lg;
  @apply bg-white/10 backdrop-blur;
  @apply border border-white/20;
  @apply text-white font-display font-[400];
  @apply transition-all duration-200;
  @apply hover:bg-white/20;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
  @apply focus:outline-none focus:ring-2 focus:ring-white/30;
}

.play-button.is-playing {
  @apply bg-green-500/20 border-green-400/40;
  animation: pulse 2s ease-in-out infinite;
}

.sequence-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
}

.sequence-section {
  @apply space-y-2;
}

.section-label {
  @apply text-center text-xs opacity-60 font-display font-[600];
}

.section-slots {
  @apply grid grid-cols-4 gap-2;
}

.sequence-slot {
  @apply aspect-square rounded-lg;
  @apply bg-white/5 border border-white/10;
  @apply transition-all duration-200;
  @apply relative overflow-hidden;
}

.sequence-slot.has-note {
  @apply border-transparent;
}

.sequence-note {
  @apply w-full h-full;
  @apply flex flex-col items-center justify-center;
  @apply text-white p-2;
  @apply cursor-pointer relative;
  @apply hover:brightness-110;
  @apply transition-all duration-200;
}

.note-name {
  @apply text-lg font-display font-[300];
}

.note-degree {
  @apply text-xs opacity-80;
}

.remove-btn {
  @apply absolute top-1 right-1;
  @apply w-5 h-5 rounded-full;
  @apply bg-black/30 backdrop-blur;
  @apply text-white text-sm;
  @apply opacity-0 transition-opacity;
  @apply hover:bg-black/50;
}

.sequence-note:hover .remove-btn {
  @apply opacity-100;
}

.empty-slot {
  @apply w-full h-full;
  @apply flex items-center justify-center;
  @apply text-white/20 text-xs;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
