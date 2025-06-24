<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useInstrumentStore } from "@/stores/instrument";
import { CATEGORY_DISPLAY_NAMES } from "@/data/instruments";
import type { InstrumentConfig } from "@/types/instrument";

const instrumentStore = useInstrumentStore();

// Computed properties
const currentInstrument = computed(() => instrumentStore.currentInstrument);
const currentInstrumentConfig = computed(
  () => instrumentStore.currentInstrumentConfig
);
const isLoading = computed(() => instrumentStore.isLoading);

// Use the unified categorization system
const instrumentsByCategory = computed(() => {
  return instrumentStore.instrumentsByCategory;
});

// Initialize instruments on mount
onMounted(async () => {
  await instrumentStore.initializeInstruments();
});

// Methods
const selectInstrument = (instrumentName: string) => {
  instrumentStore.setInstrument(instrumentName);
};

const getCategoryDisplayName = (category: string): string => {
  return CATEGORY_DISPLAY_NAMES[category] || category;
};

const getInstrumentIcon = (instrumentName: string): string => {
  const instrument = instrumentStore.availableInstruments.find(
    (i) => i.name === instrumentName
  );
  return instrument?.icon || "🎵";
};
</script>

<template>
  <div
    class="bg-white/5 rounded-sm p-1 backdrop-blur-sm border border-white/10 min-w-[300px]"
  >
    <div class="mb-1">
      <h3 class="mb-1 text-white/90 text-base font-semibold">Instrument</h3>
      <div
        class="flex items-center gap-1 p-1 bg-white/10 rounded-sm border border-white/20"
      >
        <span class="text-lg">🎹</span>
        <span class="text-white/90 font-medium">{{
          currentInstrumentConfig?.displayName || "Loading..."
        }}</span>
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <div
        v-for="(instruments, category) in instrumentsByCategory"
        :key="category"
        class="flex flex-col gap-1"
      >
        <h4 class="text-white/70 text-xs font-medium uppercase tracking-wider">
          {{ getCategoryDisplayName(category) }}
        </h4>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="instrument in instruments"
            :key="instrument.name"
            @click="selectInstrument(instrument.name)"
            :class="[
              'flex flex-col items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-sm text-white/80 cursor-pointer transition-all duration-200 text-xs hover:bg-white/10 hover:border-white/30 hover:-translate-y-0.5 flex-1 shrink-0',
              {
                'bg-blue-500/30 border-blue-500/60 text-white':
                  currentInstrument === instrument.name,
              },
            ]"
            :title="instrument.description"
          >
            <span class="text-xl">{{
              getInstrumentIcon(instrument.name)
            }}</span>
            <span class="font-medium text-center leading-tight">{{
              instrument.displayName
            }}</span>
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="isLoading"
      class="flex items-center justify-center gap-1 p-1 text-white/70 text-xs"
    >
      <div
        class="w-5 h-5 border-2 border-white/20 border-t-white/70 rounded-full animate-spin"
      ></div>
      <span>Loading instruments...</span>
    </div>
  </div>
</template>

<style scoped>
/* Responsive design for mobile */
@media (max-width: 768px) {
  .instrument-selector {
    min-width: unset;
    width: 100%;
  }

  .instruments-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }

  .instrument-button {
    padding: 0.75rem 0.5rem;
  }

  .instrument-button .instrument-icon {
    font-size: 1.25rem;
  }
}
</style>
