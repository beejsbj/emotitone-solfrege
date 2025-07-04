<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useInstrumentStore } from "@/stores/instrument";
import { CATEGORY_DISPLAY_NAMES } from "@/data/instruments";
import type { InstrumentConfig } from "@/types/instrument";
import { ChevronDown, Music } from "lucide-vue-next";
import FloatingDropdown from "./FloatingDropdown.vue";

interface Props {
  // For per-sequencer usage
  currentInstrument?: string;
  onSelectInstrument?: (instrumentId: string) => void;
  onClose?: () => void;
  // For styling
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
});

const emit = defineEmits<{
  "select-instrument": [instrumentId: string];
  close: [];
}>();

const instrumentStore = useInstrumentStore();

// Computed properties - use props if provided, otherwise use global store
const currentInstrumentId = computed(
  () => props.currentInstrument || instrumentStore.currentInstrument
);

const currentInstrumentConfig = computed(() => {
  const instruments = instrumentStore.availableInstruments;
  return instruments.find((i) => i.name === currentInstrumentId.value);
});

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
const selectInstrument = (instrumentName: string, closePanel: () => void) => {
  if (props.onSelectInstrument) {
    // Per-sequencer mode
    props.onSelectInstrument(instrumentName);
  } else {
    // Global mode
    instrumentStore.setInstrument(instrumentName);
  }

  emit("select-instrument", instrumentName);

  // Close panel after selection
  closePanel();

  if (props.onClose) {
    props.onClose();
  }
  emit("close");
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
  <FloatingDropdown position="top-left" max-height="80vh" :floating="!compact">
    <!-- Trigger Button -->
    <template #trigger="{ toggle }">
      <button
        @click="toggle"
        :class="[
          'flex items-center gap-2 px-3 py-2 bg-black/80 border border-neutral-700 rounded-md cursor-pointer text-xs transition-all duration-200 backdrop-blur-lg min-w-0 justify-center hover:bg-black/90 hover:border-neutral-500 hover:scale-105',
          compact
            ? 'px-2 py-1 text-[10px] gap-1 max-w-[150px] rounded'
            : 'max-w-[200px]',
        ]"
      >
        <span :class="['leading-none', compact ? 'text-sm' : 'text-base']">
          {{ getInstrumentIcon(currentInstrumentId) }}
        </span>
        <span
          :class="[
            'font-medium truncate',
            compact ? 'max-w-[70px] text-[10px]' : 'max-w-[120px]',
          ]"
        >
          {{ currentInstrumentConfig?.displayName || "Loading..." }}
        </span>
        <ChevronDown :size="compact ? 12 : 14" />
      </button>
    </template>

    <!-- Dropdown Panel -->
    <template #panel="{ close, toggle, position }">
      <div
        :class="['flex flex-col min-h-0 flex-1', compact ? 'text-[11px]' : '']"
      >
        <!-- Header -->
        <div
          :class="[
            'sticky top-0 flex items-center justify-between border-b border-neutral-700 bg-black/95 backdrop-blur-lg z-10',
            compact ? 'p-2' : 'p-3',
            position === 'top-left' ? 'flex-row-reverse' : '',
          ]"
        >
          <h3
            :class="[
              'm-0 text-[#00ff88] flex items-center gap-1.5 font-semibold',
              compact ? 'text-xs' : 'text-sm',
            ]"
          >
            <Music :size="compact ? 14 : 16" />
            Instruments
          </h3>
          <button
            @click="toggle"
            class="p-1 text-[#ff6b6b] rounded hover:bg-[#ff6b6b]/20 hover:rotate-180 transition-all duration-200"
            title="Close Panel"
          >
            <ChevronDown :size="compact ? 16 : 18" />
          </button>
        </div>

        <div :class="['overflow-y-auto flex-1', compact ? 'p-2.5' : 'p-4']">
          <!-- Current Selection Display -->
          <div
            :class="[
              'border-b border-neutral-700',
              compact ? 'mb-2.5 pb-2.5' : 'mb-4 pb-4',
            ]"
          >
            <div
              :class="[
                'flex items-center gap-2 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-md',
                compact ? 'p-1.5 gap-1.5 rounded' : 'p-2',
              ]"
            >
              <span :class="compact ? 'text-base' : 'text-lg'">
                {{ getInstrumentIcon(currentInstrumentId) }}
              </span>
              <span class="font-semibold text-[#00ff88] text-xs">
                {{ currentInstrumentConfig?.displayName || "Loading..." }}
              </span>
            </div>
          </div>

          <!-- Instrument Categories -->
          <div :class="['flex flex-col', compact ? 'gap-2.5' : 'gap-4']">
            <div
              v-for="(instruments, category) in instrumentsByCategory"
              :key="category"
              :class="['flex flex-col', compact ? 'gap-1.5' : 'gap-2']"
            >
              <h4
                class="m-0 text-[#ffd93d] uppercase tracking-wider font-semibold text-[10px]"
              >
                {{ getCategoryDisplayName(category) }}
              </h4>
              <div
                :class="[
                  'grid gap-1.5',
                  compact
                    ? 'grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-1'
                    : 'grid-cols-[repeat(auto-fill,minmax(90px,1fr))]',
                ]"
              >
                <button
                  v-for="instrument in instruments"
                  :key="instrument.name"
                  @click="selectInstrument(instrument.name, close)"
                  :class="[
                    'flex flex-col items-center gap-1 p-2 bg-white/5 border border-white/10 rounded-md text-white/80 cursor-pointer transition-all duration-200 text-[10px] justify-center hover:bg-white/10 hover:border-white/30 hover:-translate-y-0.5 hover:text-white',
                    currentInstrumentId === instrument.name
                      ? 'bg-[#00ff88]/20 border-[#00ff88]/50 text-[#00ff88]'
                      : '',
                    compact
                      ? 'gap-0.5 p-1.5 rounded min-h-[45px] text-[9px]'
                      : 'min-h-[60px]',
                  ]"
                  :title="instrument.description"
                >
                  <span
                    :class="['leading-none', compact ? 'text-sm' : 'text-lg']"
                  >
                    {{ getInstrumentIcon(instrument.name) }}
                  </span>
                  <span
                    class="font-medium text-center break-words max-w-full leading-tight"
                  >
                    {{ instrument.displayName }}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <!-- Loading State -->
          <div
            v-if="isLoading"
            class="flex items-center justify-center gap-2 p-4 text-white/70 text-xs"
          >
            <div
              class="w-4 h-4 border-2 border-white/20 border-t-[#00ff88] rounded-full animate-spin"
            ></div>
            <span>Loading instruments...</span>
          </div>
        </div>
      </div>
    </template>
  </FloatingDropdown>
</template>
