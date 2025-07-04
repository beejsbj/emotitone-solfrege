<script setup lang="ts">
import { computed, ref, nextTick } from "vue";
import { useSequencerStore } from "@/stores/sequencer";
import { AVAILABLE_INSTRUMENTS } from "@/data/instruments";
import { Edit3, Check, X, Copy, Trash } from "lucide-vue-next";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

interface Props {
  sequencerId: string;
  themeColors?: {
    primary: string;
    secondary: string;
    accent: string;
  } | null;
}

const props = defineProps<Props>();

// Store
const sequencerStore = useSequencerStore();

// Get current sequencer
const sequencer = computed(() => {
  return sequencerStore.sequencers.find((s) => s.id === props.sequencerId);
});

// Local state for name editing
const isEditingName = ref(false);
const editedName = ref("");
const nameInput = ref<HTMLInputElement>();

// Computed properties
const beatCount = computed(() => sequencer.value?.beats.length || 0);
const instrument = computed(() => sequencer.value?.instrument || "synth");

// Instrument display info
const instrumentConfig = computed(
  () => AVAILABLE_INSTRUMENTS[instrument.value]
);
const instrumentIcon = computed(() => instrumentConfig.value?.icon || "🎵");
const instrumentDisplayName = computed(
  () => instrumentConfig.value?.displayName || "Unknown"
);

// Name logic
const octave = computed(() => sequencer.value?.octave || 4);
const autoDisplayName = computed(
  () => `${instrumentDisplayName.value} ${octave.value}`
);
const displayName = computed(() => {
  return sequencer.value?.name || autoDisplayName.value;
});
const hasCustomName = computed(() => {
  return Boolean(sequencer.value?.name);
});

// Methods
const startEditingName = async () => {
  if (!sequencer.value) return;
  editedName.value = hasCustomName.value ? sequencer.value.name : "";
  isEditingName.value = true;
  await nextTick();
  nameInput.value?.focus();
};

const saveName = () => {
  if (!sequencer.value) return;
  const trimmedName = editedName.value.trim();
  if (trimmedName && trimmedName !== sequencer.value.name) {
    sequencerStore.updateSequencer(props.sequencerId, {
      name: trimmedName,
    });
  }
  isEditingName.value = false;
};

const cancelEditingName = () => {
  isEditingName.value = false;
  editedName.value = "";
};

const handleNameKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    saveName();
  } else if (event.key === "Escape") {
    cancelEditingName();
  }
};

const duplicateSequencer = () => {
  sequencerStore.duplicateSequencer(props.sequencerId);
  triggerUIHaptic();
};

const deleteSequencer = () => {
  sequencerStore.deleteSequencer(props.sequencerId);
  triggerUIHaptic();
};

const closeSequencer = () => {
  sequencerStore.setActiveSequencer("");
  triggerUIHaptic();
};
</script>

<template>
  <div class="flex items-center justify-between gap-2">
    <!-- Icon and Name -->
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <span class="text-lg shrink-0">{{ instrumentIcon }}</span>

      <!-- Editable Name -->
      <div
        v-if="!isEditingName"
        @click="startEditingName"
        class="flex items-center gap-1 cursor-pointer hover:bg-white/5 rounded px-1 py-0.5 transition-colors group"
      >
        <span class="text-sm font-medium text-white truncate">
          {{ displayName }}
        </span>
        <Edit3
          :size="12"
          class="text-white/40 group-hover:text-white/60 transition-colors"
        />
      </div>

      <!-- Name Editing Input -->
      <div v-else class="flex items-center gap-1">
        <input
          ref="nameInput"
          v-model="editedName"
          @keydown="handleNameKeydown"
          @blur="saveName"
          class="text-sm font-medium bg-white/10 text-white border border-white/20 rounded px-2 py-0.5 min-w-0 flex-1"
          :placeholder="autoDisplayName"
        />
        <button
          @click="saveName"
          class="p-0.5 text-green-400 hover:text-green-300"
        >
          <Check :size="12" />
        </button>
        <button
          @click="cancelEditingName"
          class="p-0.5 text-red-400 hover:text-red-300"
        >
          <X :size="12" />
        </button>
      </div>

      <!-- Beat Count Badge -->
      <div class="flex items-center gap-1 text-xs">
        <span class="text-white/40">•</span>
        <span
          class="px-1.5 py-0.5 rounded-sm font-medium"
          :class="themeColors ? 'bg-white/20' : 'bg-blue-500/20 text-blue-400'"
          :style="themeColors ? { color: themeColors.primary } : {}"
        >
          {{ beatCount }} beats
        </span>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="flex gap-1">
      <button
        @click="closeSequencer"
        class="p-1.5 rounded transition-all duration-200 border text-white/60 hover:text-white border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10"
        title="Close"
      >
        <X :size="14" />
      </button>
      <button
        @click="duplicateSequencer"
        class="p-1.5 rounded transition-all duration-200 border"
        :class="
          themeColors
            ? 'bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40'
            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20 hover:text-white'
        "
        :style="themeColors ? { color: themeColors.primary } : {}"
        title="Duplicate"
      >
        <Copy :size="14" />
      </button>
      <button
        @click="deleteSequencer"
        class="p-1.5 bg-red-500/20 border border-red-500/30 rounded text-red-400 hover:bg-red-500/30 hover:border-red-500/50 transition-all duration-200"
        title="Delete"
      >
        <Trash :size="14" />
      </button>
    </div>
  </div>
</template>
