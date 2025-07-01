<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useInstrumentStore } from "@/stores/instrument";
import { CATEGORY_DISPLAY_NAMES } from "@/data/instruments";
import type { InstrumentConfig } from "@/types/instrument";
import { ChevronDown, Music } from "lucide-vue-next";
import FloatingDropdown from "./FloatingDropdown.vue";

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
const selectInstrument = (instrumentName: string, closePanel: () => void) => {
  instrumentStore.setInstrument(instrumentName);
  closePanel(); // Close panel after selection
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
  <FloatingDropdown position="top-left" max-height="80vh">
    <!-- Trigger Button -->
    <template #trigger="{ toggle }">
      <button @click="toggle" class="instrument-toggle">
        <span class="current-icon">{{
          getInstrumentIcon(currentInstrument)
        }}</span>
        <span class="current-name">{{
          currentInstrumentConfig?.displayName || "Loading..."
        }}</span>
        <ChevronDown :size="14" />
      </button>
    </template>

    <!-- Dropdown Panel -->
    <template #panel="{ close, toggle, position }">
      <div class="instrument-panel">
        <!-- Header -->
        <div
          class="instrument-header"
          :class="{ 'flex-row-reverse': position === 'top-left' }"
        >
          <h3>
            <Music :size="16" />
            Instruments
          </h3>
          <button @click="toggle" class="close-btn" title="Close Panel">
            <ChevronDown :size="18" />
          </button>
        </div>

        <div class="instrument-content">
          <!-- Current Selection Display -->
          <div class="current-selection">
            <div class="current-instrument">
              <span class="text-lg">{{
                getInstrumentIcon(currentInstrument)
              }}</span>
              <span class="instrument-name">{{
                currentInstrumentConfig?.displayName || "Loading..."
              }}</span>
            </div>
          </div>

          <!-- Instrument Categories -->
          <div class="categories-container">
            <div
              v-for="(instruments, category) in instrumentsByCategory"
              :key="category"
              class="instrument-category"
            >
              <h4 class="category-title">
                {{ getCategoryDisplayName(category) }}
              </h4>
              <div class="instruments-grid">
                <button
                  v-for="instrument in instruments"
                  :key="instrument.name"
                  @click="selectInstrument(instrument.name, close)"
                  :class="[
                    'instrument-btn',
                    {
                      active: currentInstrument === instrument.name,
                    },
                  ]"
                  :title="instrument.description"
                >
                  <span class="instrument-icon">{{
                    getInstrumentIcon(instrument.name)
                  }}</span>
                  <span class="instrument-label">{{
                    instrument.displayName
                  }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="isLoading" class="loading-state">
            <div class="loading-spinner"></div>
            <span>Loading instruments...</span>
          </div>
        </div>
      </div>
    </template>
  </FloatingDropdown>
</template>

<style scoped>
.instrument-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.instrument-header {
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  border-bottom: 1px solid #333;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  z-index: 10;
}

.instrument-header h3 {
  margin: 0;
  font-size: 14px;
  color: #00ff88;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #ff6b6b;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 107, 107, 0.2);
  transform: rotate(180deg);
}

.instrument-content {
  padding: 15px;
  overflow-y: auto;
  flex: 1;
}

.current-selection {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #333;
}

.current-instrument {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 6px;
}

.instrument-name {
  font-weight: 600;
  color: #00ff88;
  font-size: 13px;
}

.categories-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.instrument-category {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-title {
  margin: 0;
  font-size: 11px;
  color: #ffd93d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.instruments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 6px;
}

.instrument-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 10px;
  min-height: 60px;
  justify-content: center;
}

.instrument-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
  color: white;
}

.instrument-btn.active {
  background: rgba(0, 255, 136, 0.2);
  border-color: rgba(0, 255, 136, 0.5);
  color: #00ff88;
}

.instrument-icon {
  font-size: 18px;
  line-height: 1;
}

.instrument-label {
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
  max-width: 100%;
  word-wrap: break-word;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 15px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: #00ff88;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.instrument-toggle {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid #333;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  min-width: auto;
  max-width: 200px;
  justify-content: center;
}

.instrument-toggle:hover {
  background: rgba(0, 0, 0, 0.9);
  border-color: #555;
  transform: scale(1.05);
}

.current-icon {
  font-size: 16px;
  line-height: 1;
}

.current-name {
  font-weight: 500;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .instruments-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  }

  .instrument-btn {
    min-height: 55px;
    padding: 6px 4px;
  }

  .instrument-icon {
    font-size: 16px;
  }

  .instrument-toggle {
    max-width: 160px;
    padding: 6px 10px;
  }

  .current-name {
    font-size: 11px;
    max-width: 100px;
  }
}
</style>
