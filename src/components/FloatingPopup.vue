<template>
  <div
    ref="floatingPopup"
    v-if="musicStore.currentNote"
    class="fixed top-0 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-out"
    :class="musicStore.currentNote ? 'translate-y-0' : '-translate-y-full'"
    :style="{
      background:
        getCurrentSolfegeData()?.colorGradient || 'rgba(0, 0, 0, 0.8)',
      transform: `translateX(-50%) translateY(${
        musicStore.currentNote ? '0' : '-100%'
      })`,
    }"
  >
    <div
      class="floating-popup bg-black/40 backdrop-blur-sm rounded-b-2xl px-6 py-4 border-b border-white/20 shadow-2xl min-w-[300px] max-w-[90vw]"
    >
      <div class="text-center">
        <h3
          class="text-2xl text-white mb-2 drop-shadow-lg font-weight-oscillate-lg"
        >
          {{ musicStore.currentNote }}
        </h3>
        <p
          class="text-white/90 text-sm mb-1 drop-shadow font-weight-oscillate-md"
        >
          {{ getCurrentSolfegeData()?.emotion }}
        </p>
        <p class="text-white/70 text-xs drop-shadow font-weight-oscillate-sm">
          {{ getCurrentSolfegeData()?.description }}
        </p>
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
import { ref, watch, nextTick } from "vue";
import { useMusicStore } from "@/stores/music";
import { gsap } from "gsap";

const musicStore = useMusicStore();
const floatingPopup = ref<HTMLElement | null>(null);

// Get current solfege data for display
const getCurrentSolfegeData = () => {
  if (!musicStore.currentNote) return null;
  return musicStore.getSolfegeByName(musicStore.currentNote);
};

// Watch for changes in currentNote to animate the floating popup
watch(
  () => musicStore.currentNote,
  async (newNote, oldNote) => {
    if (!floatingPopup.value) return;

    if (newNote && !oldNote) {
      // Note started - animate in from top
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
    } else if (!newNote && oldNote) {
      // Note ended - animate out to top
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
