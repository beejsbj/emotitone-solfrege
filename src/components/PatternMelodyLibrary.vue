<template>
  <div class="pattern-melody-library bg-white/5 rounded-lg p-4 border border-white/10">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-white font-bold text-lg">Pattern & Melody Library</h3>
      
      <!-- Save Controls -->
      <div class="flex items-center gap-2">
        <input
          v-model="newMelodyName"
          placeholder="Save current melody..."
          class="bg-gray-800 text-white border border-white/20 rounded-lg px-3 py-2 text-sm min-w-0 w-40"
          @keyup.enter="saveCurrentMelody"
        />
        <button
          @click="saveCurrentMelody"
          :disabled="!newMelodyName || !hasBeats"
          class="px-4 py-2 bg-blue-500/80 hover:bg-blue-500 disabled:bg-gray-500/50 text-white rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap"
        >
          Save
        </button>
      </div>
    </div>

    <!-- Custom Dropdown -->
    <div class="relative">
      <button
        @click="toggleDropdown"
        class="w-full flex items-center justify-between bg-gray-800 text-white border border-white/20 rounded-lg px-4 py-3 text-left hover:bg-gray-700 transition-colors"
      >
        <span class="flex-1 truncate">
          {{ selectedItem ? selectedItem.name : 'Select pattern or melody...' }}
        </span>
        <span 
          class="text-white/60 transition-transform duration-200"
          :class="{ 'rotate-180': isDropdownOpen }"
        >
          ▼
        </span>
      </button>

      <!-- Dropdown Content -->
      <div 
        v-if="isDropdownOpen"
        class="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-white/20 rounded-lg shadow-2xl z-50 max-h-80 overflow-y-auto"
      >
        <!-- Clear Selection -->
        <button
          @click="selectItem(null)"
          class="w-full px-4 py-2 text-left text-gray-400 hover:bg-gray-700 border-b border-white/10 text-sm"
        >
          Clear selection
        </button>

        <!-- Patterns Group -->
        <div class="border-b border-white/10">
          <div class="px-4 py-2 bg-gray-700/50 text-white/80 font-semibold text-sm uppercase tracking-wide">
            🎼 Melodic Patterns
          </div>
          <div 
            v-for="pattern in melodicPatterns" 
            :key="pattern.name"
            @click="selectItem({ ...pattern, type: 'pattern' })"
            class="px-4 py-3 text-white hover:bg-gray-700 cursor-pointer border-b border-white/5 transition-colors"
            :class="{ 'bg-blue-600/30': selectedItem?.name === pattern.name }"
          >
            <div class="font-medium">{{ pattern.name }}</div>
            <div class="text-sm text-white/60 mt-1">{{ pattern.description }}</div>
            <div class="text-xs text-white/40 mt-1">{{ pattern.emotion }}</div>
          </div>
        </div>

        <!-- Intervals Group -->
        <div class="border-b border-white/10">
          <div class="px-4 py-2 bg-gray-700/50 text-white/80 font-semibold text-sm uppercase tracking-wide">
            🎵 Intervals
          </div>
          <div 
            v-for="interval in intervalPatterns" 
            :key="interval.name"
            @click="selectItem({ ...interval, type: 'interval' })"
            class="px-4 py-3 text-white hover:bg-gray-700 cursor-pointer border-b border-white/5 transition-colors"
            :class="{ 'bg-blue-600/30': selectedItem?.name === interval.name }"
          >
            <div class="font-medium">{{ interval.name }}</div>
            <div class="text-sm text-white/60 mt-1">{{ interval.description }}</div>
          </div>
        </div>

        <!-- Default Melodies Group -->
        <div class="border-b border-white/10" v-if="defaultMelodies.length > 0">
          <div class="px-4 py-2 bg-gray-700/50 text-white/80 font-semibold text-sm uppercase tracking-wide">
            🎹 Default Melodies
          </div>
          <div 
            v-for="melody in defaultMelodies" 
            :key="melody.id"
            @click="selectItem({ ...melody, type: 'default-melody' })"
            class="px-4 py-3 text-white hover:bg-gray-700 cursor-pointer border-b border-white/5 transition-colors"
            :class="{ 'bg-blue-600/30': selectedItem?.name === melody.name }"
          >
            <div class="font-medium">{{ melody.name }}</div>
            <div class="text-sm text-white/60 mt-1">{{ melody.description }}</div>
            <div class="text-xs text-white/40 mt-1">{{ melody.emotion }} • {{ melody.beats.length }} beats</div>
          </div>
        </div>

        <!-- User Saved Melodies Group -->
        <div v-if="userMelodies.length > 0">
          <div class="px-4 py-2 bg-gray-700/50 text-white/80 font-semibold text-sm uppercase tracking-wide">
            💾 Your Melodies
          </div>
          <div 
            v-for="melody in userMelodies" 
            :key="melody.id"
            class="flex items-center group"
          >
            <div 
              @click="selectItem({ ...melody, type: 'user-melody' })"
              class="flex-1 px-4 py-3 text-white hover:bg-gray-700 cursor-pointer border-b border-white/5 transition-colors"
              :class="{ 'bg-blue-600/30': selectedItem?.name === melody.name }"
            >
              <div class="font-medium">{{ melody.name }}</div>
              <div class="text-sm text-white/60 mt-1">{{ melody.description }}</div>
              <div class="text-xs text-white/40 mt-1">{{ melody.beats.length }} beats • {{ formatDate(melody.createdAt) }}</div>
            </div>
            <button
              @click.stop="deleteMelody(melody.id)"
              class="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all"
              title="Delete melody"
            >
              🗑
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Item Info -->
    <div v-if="selectedItem" class="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
      <div class="flex items-center justify-between">
        <div>
          <div class="font-medium text-blue-200">{{ selectedItem.name }}</div>
          <div class="text-sm text-blue-300/80 mt-1">{{ selectedItem.description || getItemTypeLabel(selectedItem.type) }}</div>
        </div>
        <button
          @click="loadSelectedItem"
          class="px-4 py-2 bg-blue-500/80 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all duration-200"
        >
          Load
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { MelodicPattern, SavedMelody } from '@/types/music';

// Props
interface Props {
  patterns: MelodicPattern[];
  savedMelodies: SavedMelody[];
  hasBeats: boolean;
}

const props = defineProps<Props>();

// Emits
interface Emits {
  (event: 'load-pattern', pattern: MelodicPattern): void;
  (event: 'load-melody', melody: SavedMelody): void;
  (event: 'save-melody', name: string): void;
  (event: 'delete-melody', id: string): void;
}

const emit = defineEmits<Emits>();

// State
const isDropdownOpen = ref(false);
const selectedItem = ref<any>(null);
const newMelodyName = ref('');

// Computed properties
const melodicPatterns = computed(() => 
  props.patterns.filter(p => !p.intervals || p.intervals.length !== 1)
);

const intervalPatterns = computed(() => 
  props.patterns.filter(p => p.intervals && p.intervals.length === 1)
);

const defaultMelodies = computed(() => 
  props.savedMelodies.filter(m => m.emotion === 'Default' || m.description.includes('Default'))
);

const userMelodies = computed(() => 
  props.savedMelodies.filter(m => m.emotion !== 'Default' && !m.description.includes('Default'))
);

// Methods
const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value;
};

const selectItem = (item: any) => {
  selectedItem.value = item;
  isDropdownOpen.value = false;
};

const loadSelectedItem = () => {
  if (!selectedItem.value) return;

  switch (selectedItem.value.type) {
    case 'pattern':
    case 'interval':
      emit('load-pattern', selectedItem.value);
      break;
    case 'default-melody':
    case 'user-melody':
      emit('load-melody', selectedItem.value);
      break;
  }
};

const saveCurrentMelody = () => {
  if (!newMelodyName.value || !props.hasBeats) return;
  emit('save-melody', newMelodyName.value);
  newMelodyName.value = '';
};

const deleteMelody = (id: string) => {
  if (confirm('Are you sure you want to delete this melody?')) {
    emit('delete-melody', id);
    if (selectedItem.value?.id === id) {
      selectedItem.value = null;
    }
  }
};

const getItemTypeLabel = (type: string) => {
  switch (type) {
    case 'pattern': return 'Melodic Pattern';
    case 'interval': return 'Interval Pattern';
    case 'default-melody': return 'Built-in Melody';
    case 'user-melody': return 'Your Melody';
    default: return '';
  }
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(date));
};

// Close dropdown when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.pattern-melody-library')) {
    isDropdownOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.pattern-melody-library {
  /* Custom scrollbar for dropdown */
}

.pattern-melody-library ::-webkit-scrollbar {
  width: 6px;
}

.pattern-melody-library ::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.pattern-melody-library ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.pattern-melody-library ::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>