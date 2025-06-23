<template>
  <div
    ref="floatingPopup"
    v-if="hasActiveNotes"
    class="fixed top-0 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-out"
    :class="hasActiveNotes ? 'translate-y-0' : '-translate-y-full'"
    :style="{
      background: primaryActiveNote
        ? getGradient(primaryActiveNote.solfege.name, musicStore.currentMode)
        : 'rgba(0, 0, 0, 0.8)',
      transform: `translateX(-50%) translateY(${
        hasActiveNotes ? '0' : '-100%'
      })`,
    }"
  >
    <div
      class="floating-popup bg-black/40 backdrop-blur-sm rounded-b-2xl px-6 py-4 border-b border-white/20 shadow-2xl min-w-[300px] max-w-[90vw]"
    >
      <div class="text-center">
        <!-- Multiple Notes Display -->
        <div v-if="activeNotes.length > 1" class="mb-3">
          <h3
            class="text-lg text-white mb-2 drop-shadow-lg font-weight-oscillate-lg"
          >
            Playing {{ activeNotes.length }} Notes
          </h3>
          <div class="flex flex-wrap justify-center gap-2 mb-2">
            <span
              v-for="note in activeNotes"
              :key="note.noteId"
              class="px-2 py-1 bg-white/20 rounded-lg text-sm text-white font-weight-oscillate-md"
            >
              {{ note.noteName }}
            </span>
          </div>
          <p
            class="text-white/90 text-sm mb-1 drop-shadow font-weight-oscillate-md"
          >
            {{ getPolyphonicDescription() }}
          </p>
        </div>

        <!-- Single Note Display -->
        <div v-else-if="primaryActiveNote" class="mb-3">
          <h3
            class="text-2xl text-white mb-2 drop-shadow-lg font-weight-oscillate-lg"
          >
            {{ primaryActiveNote.solfege.name }}
          </h3>
          <p
            class="text-white/80 text-lg mb-2 drop-shadow font-weight-oscillate-md"
          >
            {{ primaryActiveNote.noteName }}
          </p>
          <p
            class="text-white/90 text-sm mb-1 drop-shadow font-weight-oscillate-md"
          >
            {{ primaryActiveNote.solfege.emotion }}
          </p>
          <p class="text-white/70 text-xs drop-shadow font-weight-oscillate-sm">
            {{ primaryActiveNote.solfege.description }}
          </p>
        </div>
      </div>

      <!-- Subtle peek indicator -->
      <div
        class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full"
      >
        <div
          class="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white/20"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from "vue";
import { useMusicStore } from "@/stores/music";
import { useColorSystem } from "@/composables/useColorSystem";
import { gsap } from "gsap";

const musicStore = useMusicStore();
const { getGradient } = useColorSystem();
const floatingPopup = ref<HTMLElement | null>(null);

// Computed properties for polyphonic display
const activeNotes = computed(() => musicStore.getActiveNotes());
const hasActiveNotes = computed(() => activeNotes.value.length > 0);
const primaryActiveNote = computed(() => activeNotes.value[0] || null);

// Get current solfege data for display (legacy support)
const getCurrentSolfegeData = () => {
  if (!musicStore.currentNote) return null;
  return musicStore.getSolfegeByName(musicStore.currentNote);
};

// Generate description for polyphonic notes
const getPolyphonicDescription = () => {
  const notes = activeNotes.value;
  if (notes.length === 0) return "";
  if (notes.length === 1) return notes[0].solfege.emotion;

  // For multiple notes, create a combined description
  const emotions = notes.map((note) => note.solfege.emotion);
  const uniqueEmotions = [...new Set(emotions)];

  if (uniqueEmotions.length === 1) {
    return `${uniqueEmotions[0]} (harmony)`;
  } else if (uniqueEmotions.length === 2) {
    return `${uniqueEmotions[0]} & ${uniqueEmotions[1]}`;
  } else {
    return "Complex harmonic blend";
  }
};

// Watch for changes in active notes to animate the floating popup
watch(
  () => hasActiveNotes.value,
  async (hasNotes, hadNotes) => {
    if (!floatingPopup.value) return;

    if (hasNotes && !hadNotes) {
      // Notes started - animate in from top
      await nextTick();
      gsap.fromTo(
        floatingPopup.value,
        {
          y: -100,
          opacity: 0,
          scale: 0.8,
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.4,
          ease: "back.out(1.7)",
        }
      );
    } else if (!hasNotes && hadNotes) {
      // Notes ended - animate out to top
      gsap.to(floatingPopup.value, {
        y: -100,
        opacity: 0,
        scale: 0.8,
        duration: 0.3,
        ease: "back.in(1.7)",
      });
    }
  }
);

// Also watch for changes in the number of active notes for subtle animations
watch(
  () => activeNotes.value.length,
  async (newCount, oldCount) => {
    if (!floatingPopup.value || newCount === 0 || oldCount === 0) return;

    // Subtle pulse animation when notes are added or removed
    await nextTick();
    gsap.to(floatingPopup.value, {
      scale: 1.05,
      duration: 0.1,
      ease: "power2.out",
      yoyo: true,
      repeat: 1,
    });
  }
);
</script>

<style scoped>
/* Floating popup styles */
.floating-popup {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

/* Enhanced drop shadows for better readability */
.drop-shadow-lg {
  filter: drop-shadow(0 10px 8px rgb(0 0 0 / 0.04))
    drop-shadow(0 4px 3px rgb(0 0 0 / 0.1));
}

.drop-shadow {
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.1))
    drop-shadow(0 1px 1px rgb(0 0 0 / 0.06));
}

/* Responsive adjustments for mobile */
@media (max-width: 640px) {
  .floating-popup {
    min-width: 280px;
    max-width: 95vw;
  }
}
</style>
