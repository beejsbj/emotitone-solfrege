<script setup lang="ts">
import { ref } from 'vue'
import { playSequence, playChord } from '@/services/audio'
import { useMusicStore } from '@/stores/music'
import { generateScale } from '@/services/music'
import { gsap } from 'gsap'

const musicStore = useMusicStore()
const activePattern = ref<string | null>(null)

// Helper to get note from scale by solfege degree
function getNoteByDegree(degree: number): string {
  const scale = generateScale(musicStore.currentKey, musicStore.currentMode)
  const noteIndex = degree - 1
  const octave = noteIndex >= 7 ? 5 : 4
  return scale[noteIndex % 7] + octave
}

// Convert solfege pattern to notes
function patternToNotes(pattern: number[]): string[] {
  return pattern.map((degree) => getNoteByDegree(degree))
}

// Intervals data
const intervals = [
  { name: 'Unison/Octave', pattern: [1, 8], emotion: 'Unity, completion' },
  { name: 'Minor 2nd', pattern: [1, 2], emotion: 'Dissonance, yearning', isMinor: true },
  { name: 'Major 2nd', pattern: [1, 2], emotion: 'Gentle tension, stepping forward' },
  { name: 'Minor 3rd', pattern: [1, 3], emotion: 'Sadness, introspection', isMinor: true },
  { name: 'Major 3rd', pattern: [1, 3], emotion: 'Joy, brightness' },
  { name: 'Perfect 4th', pattern: [1, 4], emotion: 'Stability, openness' },
  { name: 'Tritone', pattern: [1, 5], emotion: 'Tension, mystery, unrest', special: true },
  { name: 'Perfect 5th', pattern: [1, 5], emotion: 'Power, openness, clarity' },
  { name: 'Minor 6th', pattern: [1, 6], emotion: 'Melancholy, longing', isMinor: true },
  { name: 'Major 6th', pattern: [1, 6], emotion: 'Sweet, nostalgic' },
  { name: 'Minor 7th', pattern: [1, 7], emotion: 'Bluesy, unresolved', isMinor: true },
  { name: 'Major 7th', pattern: [1, 7], emotion: 'Sharp tension, modernist' },
]

// Melodic patterns data
const melodicPatterns = [
  { name: 'Scale Ascent', pattern: [1, 2, 3, 4, 5, 6, 7, 8], emotion: 'Journey upward' },
  { name: 'Scale Descent', pattern: [8, 7, 6, 5, 4, 3, 2, 1], emotion: 'Journey downward' },
  { name: 'Do-Sol-Do', pattern: [1, 5, 8], emotion: 'Perfect fifth leap, triumphant' },
  { name: 'Do-Ti-Do', pattern: [1, 7, 8], emotion: 'Leading tone resolution, urgent' },
  { name: 'Do-La-Sol', pattern: [1, 6, 5], emotion: 'Descending sadness' },
  { name: 'Sol-Ti-Do', pattern: [5, 7, 8], emotion: 'Dominant resolution, satisfying' },
  { name: 'La-Ti-Do', pattern: [6, 7, 8], emotion: 'Longing to resolution' },
  { name: 'Do-Mi-Sol', pattern: [1, 3, 5], emotion: 'Major triad, bright and stable' },
  { name: 'Do-Re-Mi', pattern: [1, 2, 3], emotion: 'Optimistic ascent' },
  { name: 'Mi-Re-Do', pattern: [3, 2, 1], emotion: 'Gentle descent home' },
  { name: 'Fa-Mi', pattern: [4, 3], emotion: 'Tension release, sigh' },
  { name: 'Ti-Do-Ti-Do', pattern: [7, 8, 7, 8], emotion: 'Restless resolution' },
]

// Play an interval (as a chord)
async function playInterval(pattern: number[], name: string) {
  if (activePattern.value === name) return

  activePattern.value = name
  const notes = patternToNotes(pattern)

  try {
    await playChord(notes, '1n')
  } finally {
    setTimeout(() => {
      if (activePattern.value === name) {
        activePattern.value = null
      }
    }, 1000)
  }
}

// Play a melodic pattern
async function playPattern(pattern: number[], name: string) {
  if (activePattern.value === name) return

  activePattern.value = name
  const notes = patternToNotes(pattern)

  try {
    await playSequence(notes, 120)
  } finally {
    if (activePattern.value === name) {
      activePattern.value = null
    }
  }
}

// Animate button on click
function animateButton(event: MouseEvent) {
  const button = event.currentTarget as HTMLButtonElement
  gsap.to(button, {
    scale: 0.95,
    duration: 0.1,
    yoyo: true,
    repeat: 1,
  })
}
</script>

<template>
  <div class="predefined-patterns">
    <!-- Intervals Section -->
    <div class="pattern-section">
      <h3 class="section-title">Emotional Character of Intervals</h3>
      <div class="pattern-grid">
        <button
          v-for="interval in intervals"
          :key="interval.name"
          @click="
            (e) => {
              animateButton(e)
              playInterval(interval.pattern, interval.name)
            }
          "
          class="pattern-button"
          :class="{
            'is-active': activePattern === interval.name,
            'is-minor': interval.isMinor,
            'is-special': interval.special,
          }"
        >
          <div class="pattern-name">{{ interval.name }}</div>
          <div class="pattern-emotion">{{ interval.emotion }}</div>
        </button>
      </div>
    </div>

    <!-- Melodic Patterns Section -->
    <div class="pattern-section mt-8">
      <h3 class="section-title">Common Melodic Patterns</h3>
      <div class="pattern-grid">
        <button
          v-for="pattern in melodicPatterns"
          :key="pattern.name"
          @click="
            (e) => {
              animateButton(e)
              playPattern(pattern.pattern, pattern.name)
            }
          "
          class="pattern-button melodic"
          :class="{ 'is-active': activePattern === pattern.name }"
        >
          <div class="pattern-name">{{ pattern.name }}</div>
          <div class="pattern-emotion">{{ pattern.emotion }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.predefined-patterns {
  @apply space-y-8;
}

.pattern-section {
  @apply space-y-4;
}

.section-title {
  @apply text-xl font-display font-[400] text-center opacity-90;
}

.pattern-grid {
  @apply grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3;
}

.pattern-button {
  @apply p-4 rounded-lg;
  @apply bg-white/10 backdrop-blur;
  @apply border border-white/20;
  @apply text-white;
  @apply transition-all duration-200;
  @apply hover:bg-white/20;
  @apply focus:outline-none focus:ring-2 focus:ring-white/30;
  @apply cursor-pointer;
  @apply text-left;
  @apply space-y-1;
  @apply transform-gpu;
}

.pattern-button.is-active {
  @apply bg-white/25 border-white/40;
  @apply scale-95;
}

.pattern-button.is-minor {
  @apply bg-purple-500/10;
}

.pattern-button.is-special {
  @apply bg-red-500/10;
}

.pattern-button.melodic {
  @apply bg-blue-500/10;
}

.pattern-name {
  @apply font-display font-[500] text-sm md:text-base;
}

.pattern-emotion {
  @apply text-xs opacity-70;
}

/* Hover effects */
.pattern-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(255, 255, 255, 0.1);
}

.pattern-button.is-active {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}
</style>
