<script setup lang="ts">
import { computed } from "vue";
import { useSequencerStore } from "@/stores/sequencer";
import { SEQUENCER_COLOR_PALETTES } from "@/data/sequencer";
import { Knob } from "@/components/knobs";

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

// Computed properties
const isPlaying = computed(() => sequencer.value?.isPlaying || false);
const volume = computed(() => sequencer.value?.volume || 1);
const octave = computed(() => sequencer.value?.octave || 4);

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

// Methods
const updateOctave = (value: string | number | boolean) => {
  const newOctave =
    typeof value === "number" ? value : parseInt(value as string);
  if (!isNaN(newOctave)) {
    sequencerStore.updateSequencer(props.sequencerId, {
      octave: newOctave,
    });
  }
};

const updateVolume = (value: string | number | boolean) => {
  const newVolume =
    typeof value === "number" ? value : parseFloat(value as string);
  if (!isNaN(newVolume)) {
    sequencerStore.setSequencerVolume(props.sequencerId, newVolume);
  }
};

const updateColor = (newColor: any) => {
  sequencerStore.updateSequencer(props.sequencerId, {
    color: newColor === "default" ? undefined : newColor,
  });
};
</script>

<template>
  <div class="flex items-center gap-3 flex-1">
    <div class="flex items-center gap-2">
      <Knob
        :model-value="octave"
        type="range"
        :min="2"
        :max="8"
        :step="1"
        label="Octave"
        :format-value="formatOctave"
        :is-disabled="isPlaying"
        @update:modelValue="updateOctave"
        class="mini-knob"
        :theme-color="themeColors?.primary"
      />
    </div>

    <div class="flex items-center gap-2">
      <Knob
        :model-value="volume"
        type="range"
        :min="0"
        :max="1"
        :step="0.1"
        label="Vol"
        :format-value="formatVolume"
        @update:modelValue="updateVolume"
        class="mini-knob"
        :theme-color="themeColors?.primary"
      />
    </div>

    <div class="flex items-center gap-2">
      <Knob
        :model-value="knobColorValue"
        type="options"
        :options="colorOptions"
        label="Color"
        :format-value="formatColor"
        @update:modelValue="updateColor"
        class="mini-knob"
        :theme-color="themeColors?.primary"
      />
    </div>
  </div>
</template>
