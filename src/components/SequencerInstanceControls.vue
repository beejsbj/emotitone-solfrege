<script setup lang="ts">
import { computed, ref } from "vue";
import { useMultiSequencerStore } from "@/stores/multiSequencer";
import { useInstrumentStore } from "@/stores/instrument";
import { AVAILABLE_INSTRUMENTS } from "@/data/instruments";
import { SEQUENCER_COLOR_PALETTES } from "@/data/sequencer";
import InstrumentSelector from "@/components/InstrumentSelector.vue";
import Knob from "@/components/Knob.vue";
import {
  Play,
  CircleStop,
  Volume2,
  VolumeX,
  Trash,
  Copy,
  Edit3,
  Check,
  X,
} from "lucide-vue-next";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

interface Props {
  sequencerId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  deleteSequencer: [sequencerId: string];
  playbackToggle: [sequencerId: string, shouldPlay: boolean];
}>();

// Stores
const multiSequencerStore = useMultiSequencerStore();
const instrumentStore = useInstrumentStore();

// Get current sequencer
const sequencer = computed(() =>
  multiSequencerStore.sequencers.find((s) => s.id === props.sequencerId)
);

// Local state
const showInstrumentSelector = ref(false);
const isEditingName = ref(false);
const editedName = ref("");

// Computed
const isPlaying = computed(() => sequencer.value?.isPlaying || false);
const isMuted = computed(() => sequencer.value?.isMuted || false);
const volume = computed(() => sequencer.value?.volume || 1);
const octave = computed(() => sequencer.value?.octave || 4);
const instrument = computed(() => sequencer.value?.instrument || "synth");
const beatCount = computed(() => sequencer.value?.beats.length || 0);
const canPlay = computed(() => beatCount.value > 0 && !isMuted.value);

// Instrument display name and icon
const instrumentConfig = computed(
  () => AVAILABLE_INSTRUMENTS[instrument.value]
);
const instrumentIcon = computed(() => instrumentConfig.value?.icon || "🎵");
const instrumentDisplayName = computed(
  () => instrumentConfig.value?.displayName || "Unknown"
);

// Auto-generate display name: "Piano 4" instead of "Sequencer 1"
const autoDisplayName = computed(
  () => `${instrumentDisplayName.value} ${octave.value}`
);

// Display name: use custom name if set, otherwise auto-generated
const displayName = computed(() => {
  return sequencer.value?.name || autoDisplayName.value;
});

// Whether this sequencer has a custom name
const hasCustomName = computed(() => {
  return Boolean(sequencer.value?.name);
});

// Current color palette
const currentColorPalette = computed(() => {
  if (!sequencer.value?.color) return null;
  return SEQUENCER_COLOR_PALETTES.find((p) => p.id === sequencer.value?.color);
});

// Color options for knob
const colorOptions = computed(() => [
  { value: "default", label: "Default", color: "hsla(220, 9%, 46%, 1)" },
  { value: "neon", label: "Neon", color: "hsla(158, 100%, 53%, 1)" },
  { value: "sunset", label: "Sunset", color: "hsla(21, 90%, 48%, 1)" },
  { value: "ocean", label: "Ocean", color: "hsla(217, 91%, 60%, 1)" },
  { value: "purple", label: "Purple", color: "hsla(271, 91%, 65%, 1)" },
  { value: "pink", label: "Pink", color: "hsla(328, 85%, 70%, 1)" },
  { value: "gold", label: "Gold", color: "hsla(43, 96%, 56%, 1)" },
]);

// Color value for knob (convert undefined to "default")
const knobColorValue = computed(() => {
  return sequencer.value?.color || "default";
});

// Format functions
const formatOctave = (value: number) => `${value}`;
const formatVolume = (value: number) => `${Math.round(value * 100)}`;
const formatColor = (value: any) => {
  const option = colorOptions.value.find((opt) => opt.value === value);
  return option?.label || "Default";
};

// Get theme color from palette ID
const getThemeColor = (paletteId?: string) => {
  const colorMap: Record<string, string> = {
    neon: "hsla(158, 100%, 53%, 1)",
    sunset: "hsla(21, 90%, 48%, 1)",
    ocean: "hsla(217, 91%, 60%, 1)",
    purple: "hsla(271, 91%, 65%, 1)",
    pink: "hsla(328, 85%, 70%, 1)",
    gold: "hsla(43, 96%, 56%, 1)",
  };

  return paletteId ? colorMap[paletteId] || colorMap.neon : null;
};

// Simple theme colors for UI
const themeColors = computed(() => {
  if (!sequencer.value?.color) return null;

  const primaryColor = getThemeColor(sequencer.value.color);
  if (!primaryColor) return null;

  return {
    primary: primaryColor,
    secondary: "hsla(0, 84%, 60%, 1)", // red for stop state
    accent: "hsla(0, 84%, 60%, 1)", // red for mute/delete
  };
});

// Dynamic styles based on color theme
const dynamicStyles = computed(() => {
  const theme = themeColors.value;
  if (!theme) return {};

  return {
    "--theme-primary": theme.primary,
    "--theme-secondary": theme.secondary,
    "--theme-accent": theme.accent,
  };
});

// Methods
const togglePlayback = () => {
  if (!sequencer.value) return;
  emit("playbackToggle", props.sequencerId, !isPlaying.value);
  triggerUIHaptic();
};

const toggleMute = () => {
  multiSequencerStore.toggleSequencerMute(props.sequencerId);
  triggerUIHaptic();
};

const updateOctave = (newOctave: number) => {
  multiSequencerStore.updateSequencer(props.sequencerId, {
    octave: newOctave,
  });
};

const updateVolume = (newVolume: number) => {
  multiSequencerStore.setSequencerVolume(props.sequencerId, newVolume);
};

const updateColor = (newColor: any) => {
  multiSequencerStore.updateSequencer(props.sequencerId, {
    color: newColor === "default" ? undefined : newColor,
  });
};

const selectInstrument = (instrumentId: string) => {
  multiSequencerStore.updateSequencer(props.sequencerId, {
    instrument: instrumentId,
  });
  showInstrumentSelector.value = false;
  triggerUIHaptic();
};

const duplicateSequencer = () => {
  multiSequencerStore.duplicateSequencer(props.sequencerId);
  triggerUIHaptic();
};

const deleteSequencer = () => {
  emit("deleteSequencer", props.sequencerId);
  triggerUIHaptic();
};

const startEditingName = () => {
  if (!sequencer.value) return;
  // If no custom name is set, start with empty string to encourage custom naming
  editedName.value = hasCustomName.value ? sequencer.value.name : "";
  isEditingName.value = true;
};

const saveName = () => {
  if (!sequencer.value) return;
  const trimmedName = editedName.value.trim();
  if (trimmedName && trimmedName !== sequencer.value.name) {
    multiSequencerStore.updateSequencer(props.sequencerId, {
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

// Dynamic play button styling
const getPlayButtonStyles = () => {
  if (!themeColors.value) return {};

  const { primary, secondary } = themeColors.value;

  if (!isPlaying.value && canPlay.value) {
    // Play ready state - use primary color with alpha
    const match = primary.match(/hsla\((\d+),\s*(\d+)%,\s*(\d+)%,\s*[\d.]+\)/);
    if (match) {
      const [, h, s, l] = match;
      return {
        background: `hsla(${h}, ${s}%, ${l}%, 0.2)`,
        borderColor: `hsla(${h}, ${s}%, ${l}%, 0.5)`,
        color: primary,
      };
    }
  } else if (isPlaying.value) {
    // Play active state - use red for stop
    return {
      background: "hsla(0, 84%, 60%, 0.2)",
      borderColor: "hsla(0, 84%, 60%, 0.5)",
      color: "hsla(0, 84%, 60%, 1)",
    };
  }

  return {};
};
</script>

<template>
  <div
    v-if="sequencer"
    class="flex flex-col gap-3 rounded-md p-3 bg-black/80 border shadow-lg backdrop-blur-sm"
    :class="themeColors ? '' : 'border-white/10'"
    :style="
      themeColors
        ? {
            ...dynamicStyles,
            borderColor: themeColors.primary
              .replace('1)', '0.3)')
              .replace('hsla(', 'hsla('),
            boxShadow: `0 0 20px ${themeColors.primary
              .replace('1)', '0.1)')
              .replace('hsla(', 'hsla(')}`,
          }
        : dynamicStyles
    "
  >
    <!-- Header: Icon, Name, Beat Count, Quick Actions -->
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
            v-model="editedName"
            @keydown="handleNameKeydown"
            @blur="saveName"
            class="text-sm font-medium bg-white/10 text-white border border-white/20 rounded px-2 py-0.5 min-w-0 flex-1"
            :placeholder="autoDisplayName"
            ref="nameInput"
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
            :class="
              themeColors ? 'bg-white/20' : 'bg-blue-500/20 text-blue-400'
            "
            :style="themeColors ? { color: themeColors.primary } : {}"
          >
            {{ beatCount }} beats
          </span>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="flex gap-1">
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

    <!-- Instrument Selector -->
    <div class="w-full">
      <InstrumentSelector
        :current-instrument="instrument"
        :on-select-instrument="selectInstrument"
        :compact="true"
      />
    </div>

    <!-- Control Sections -->
    <div class="flex gap-3">
      <!-- Playback Controls -->
      <div class="flex items-center gap-2">
        <button
          @click="togglePlayback"
          :disabled="!canPlay && !isPlaying"
          class="px-3 py-2 rounded-lg border font-medium transition-all duration-200 cursor-pointer flex items-center gap-2 text-sm"
          :class="{
            'bg-emerald-500/20 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/30 hover:border-emerald-500/60':
              !isPlaying && canPlay && !themeColors,
            'bg-red-500/20 border-red-500/50 text-red-500 hover:bg-red-500/30 hover:border-red-500/60':
              isPlaying && !themeColors,
            'bg-gray-500/20 border-gray-500/30 text-gray-500 cursor-not-allowed':
              !canPlay && !isPlaying,
          }"
          :style="getPlayButtonStyles()"
        >
          <CircleStop v-if="isPlaying" :size="16" />
          <Play v-else :size="16" />
          <span>{{ isPlaying ? "Stop" : "Play" }}</span>
        </button>

        <button
          @click="toggleMute"
          class="p-2 rounded-lg border cursor-pointer transition-all duration-200"
          :class="{
            'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20 hover:text-white':
              !isMuted && !themeColors,
            'bg-red-500/20 border-red-500/50 text-red-500 hover:bg-red-500/30 hover:border-red-500/60':
              isMuted,
            'bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:border-white/40':
              !isMuted && themeColors,
          }"
          :style="!isMuted && themeColors ? { color: themeColors.primary } : {}"
          :title="isMuted ? 'Unmute' : 'Mute'"
        >
          <VolumeX v-if="isMuted" :size="16" />
          <Volume2 v-else :size="16" />
        </button>
      </div>

      <!-- Audio Controls -->
      <div class="flex items-center gap-3 flex-1">
        <div class="flex items-center gap-2">
          <Knob
            :value="octave"
            :min="2"
            :max="8"
            :step="1"
            param-name="Octave"
            :format-value="formatOctave"
            :is-disabled="isPlaying"
            @update:value="updateOctave"
            class="mini-knob"
            :theme-color="themeColors?.primary"
          />
        </div>

        <div class="flex items-center gap-2">
          <Knob
            :value="volume"
            :min="0"
            :max="1"
            :step="0.1"
            param-name="Vol"
            :format-value="formatVolume"
            @update:value="updateVolume"
            class="mini-knob"
            :theme-color="themeColors?.primary"
          />
        </div>

        <div class="flex items-center gap-2">
          <Knob
            :value="knobColorValue"
            :options="colorOptions"
            param-name="Color"
            :format-value="formatColor"
            @update:value="updateColor"
            class="mini-knob"
            :theme-color="themeColors?.primary"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Minimal custom styles - most styling now handled by Tailwind classes */
</style>
