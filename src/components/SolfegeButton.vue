<script setup lang="ts">
import { ref, computed } from 'vue'
import { gsap } from 'gsap'
import type { SolfegeNote } from '@/services/music'
import { playNote } from '@/services/audio'
import { useMusicStore } from '@/stores/music'

interface Props {
  note: SolfegeNote
  index: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  noteClicked: [note: SolfegeNote]
}>()

const musicStore = useMusicStore()
const buttonRef = ref<HTMLButtonElement>()
const isActive = ref(false)

// Create gradient background from color array
const backgroundGradient = computed(() => {
  const colors = props.note.colorGradient
  return `radial-gradient(circle at center, ${colors.join(', ')})`
})

// Handle button click
async function handleClick() {
  // Play the note
  await playNote(props.note.degree)

  // Emit event for parent components
  emit('noteClicked', props.note)

  // Add to sequence if in sequencer mode
  if (musicStore.sequence.length < 16) {
    musicStore.addToSequence(props.note)
  }

  // Trigger animation
  animateButton()
}

// Button press animation
function animateButton() {
  if (!buttonRef.value) return

  isActive.value = true

  // Create timeline for complex animation
  const tl = gsap.timeline({
    onComplete: () => {
      isActive.value = false
    },
  })

  tl.to(buttonRef.value, {
    scale: 0.95,
    duration: 0.1,
    ease: 'power2.in',
  })
    .to(buttonRef.value, {
      scale: 1.05,
      duration: 0.3,
      ease: 'elastic.out(1, 0.5)',
    })
    .to(buttonRef.value, {
      scale: 1,
      duration: 0.2,
      ease: 'power2.out',
    })

  // Glow effect
  gsap.to(buttonRef.value, {
    boxShadow: `0 0 40px ${props.note.colorGradient[0]}`,
    duration: 0.3,
    yoyo: true,
    repeat: 1,
  })
}
</script>

<template>
  <button
    ref="buttonRef"
    @click="handleClick"
    class="solfege-button relative overflow-hidden transition-all"
    :class="{ 'is-active': isActive }"
    :style="{
      '--gradient': backgroundGradient,
      '--primary-color': note.colorGradient[0],
      '--animation-delay': `${index * 50}ms`,
    }"
  >
    <!-- Background layers -->
    <div class="absolute inset-0 bg-gradient opacity-60"></div>
    <div class="absolute inset-0 bg-black/20"></div>

    <!-- Content -->
    <div class="relative z-10 flex flex-col items-center justify-center p-4">
      <!-- Solfege name -->
      <div class="text-3xl md:text-4xl font-display font-[300] mb-1">
        {{ note.name }}
      </div>

      <!-- Note degree -->
      <div class="text-sm md:text-base opacity-80 font-[400]">
        {{ note.degree }}
      </div>

      <!-- Emotion indicator -->
      <div class="mt-2 text-xs opacity-60 text-center line-clamp-2">
        {{ note.emotion }}
      </div>
    </div>

    <!-- Flecks/texture overlay -->
    <div
      v-if="note.flecks"
      class="absolute inset-0 pointer-events-none opacity-30"
      :class="`flecks-${note.name.toLowerCase()}`"
    ></div>
  </button>
</template>

<style scoped>
.solfege-button {
  @apply rounded-2xl;
  @apply min-h-[120px] md:min-h-[140px];
  @apply transform-gpu;
  @apply cursor-pointer;
  @apply select-none;
  @apply relative;
  @apply hover:scale-105;
  @apply active:scale-95;
  animation: fadeIn 0.5s ease-out var(--animation-delay) both;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.solfege-button:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
}

.bg-gradient {
  background: var(--gradient);
  filter: blur(20px);
}

.solfege-button.is-active .bg-gradient {
  filter: blur(30px);
  transform: scale(1.2);
}

/* Flecks textures */
.flecks-do::after,
.flecks-re::after,
.flecks-mi::after,
.flecks-la::after,
.flecks-ti::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, white 1px, transparent 1px);
  background-size: 20px 20px;
  opacity: 0.1;
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shimmer {
  0%,
  100% {
    opacity: 0.1;
  }
  50% {
    opacity: 0.3;
  }
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
