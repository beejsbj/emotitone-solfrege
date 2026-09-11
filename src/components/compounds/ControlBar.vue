<template>
  <section class="control-bar" aria-label="Keyboard controls">
    <div class="control-bar__item">
      <Knob
        :model-value="keyValue"
        type="options"
        :options="CHROMATIC_NOTES"
        label="Key"
        :haptic="haptic"
        :change-signal="changeSignals.key"
        @update:modelValue="(value) => emit('update:keyValue', String(value))"
      />
    </div>

    <div class="control-bar__item">
      <Knob
        :model-value="modeValue"
        type="options"
        :options="MODE_OPTIONS"
        label="Mode"
        :haptic="haptic"
        :change-signal="changeSignals.mode"
        @update:modelValue="(value) => emit('update:modeValue', String(value))"
      />
    </div>

    <div class="control-bar__item">
      <Knob
        :model-value="bpm"
        type="range"
        label="BPM"
        :haptic="haptic"
        :min="40"
        :max="220"
        :step="1"
        :change-signal="changeSignals.bpm"
        @update:modelValue="(value) => emit('update:bpm', Number(value))"
      />
    </div>

    <div class="control-bar__item">
      <Knob
        :model-value="octave"
        type="range"
        label="Octave"
        :haptic="haptic"
        :min="1"
        :max="8"
        :step="1"
        :change-signal="changeSignals.octave"
        @update:modelValue="(value) => emit('update:octave', Number(value))"
      />
    </div>

    <div class="control-bar__item">
      <Knob
        :model-value="playStyle"
        type="options"
        :options="playStyleOptions"
        label="Play Mode"
        @update:modelValue="(value) => emit('update:playStyle', String(value))"
      />
    </div>

    <div class="control-bar__item">
      <Knob
        :model-value="playRate"
        type="options"
        :options="rateOptions"
        label="Rate"
        :is-disabled="!playStyle.startsWith('arp-') && playStyle !== 'repeat'"
        @update:modelValue="(value) => emit('update:playRate', Number(value))"
      />
    </div>

    <div class="control-bar__item control-bar__item--joystick">
      <Joystick
        :model-value="harmonyValue"
        label="Harmony"
        :visual="joystickVisual"
        :haptic="haptic"
        @update:model-value="(value) => emit('update:harmonyValue', value)"
        @effective-change="(value) => emit('harmonyEffective', value)"
      />
    </div>

  </section>
</template>

<script setup lang="ts">
import { CHROMATIC_NOTES, MODE_OPTIONS } from "@/data/musicData";
import Knob from "@/components/primatives/Knob/index.vue";
import Joystick from "@/components/uniques/Joystick/index.vue";
import type { HarmonyAlteration } from "@/domain/harmony";
import type { JoystickVisual } from "@/components/uniques/Joystick/index.vue";
import { PLAY_STYLE_OPTIONS, type PlayStyle, type PlayStyleRate } from "@/services/playStyles";

const playStyleOptions = [...PLAY_STYLE_OPTIONS];
const rateOptions = [
  { value: 4, label: '1/4' },
  { value: 8, label: '1/8' },
  { value: 16, label: '1/16' },
];

type ControlBarChangeSignals = Partial<Record<"key" | "mode" | "bpm" | "octave", number>>;

withDefaults(
  defineProps<{
    keyValue?: string;
    modeValue?: string;
    bpm?: number;
    octave?: number;
    playStyle?: PlayStyle;
    playRate?: PlayStyleRate;
    harmonyValue?: HarmonyAlteration;
    joystickVisual?: JoystickVisual;
    changeSignals?: ControlBarChangeSignals;
    haptic?: boolean;
  }>(),
  {
    keyValue: "C",
    modeValue: "major",
    bpm: 120,
    octave: 4,
    playStyle: "together",
    playRate: 8,
    harmonyValue: "auto",
    changeSignals: () => ({}),
    haptic: true,
  },
);

const emit = defineEmits<{
  "update:keyValue": [value: string];
  "update:modeValue": [value: string];
  "update:bpm": [value: number];
  "update:octave": [value: number];
  "update:playStyle": [value: string];
  "update:playRate": [value: number];
  "update:harmonyValue": [value: HarmonyAlteration];
  harmonyEffective: [value: HarmonyAlteration];
}>();

</script>

<style scoped>
.control-bar {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  align-items: start;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 3px 0 4px;
  overflow: hidden;
  background-color: var(--instrument-bar-surface);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  contain: layout style;
  user-select: none;
}

.control-bar__item {
  min-width: 0;
  container-type: inline-size;
}

.control-bar__item:deep(.knob-wrapper) {
  touch-action: none;
}

.control-bar__item:first-child :deep(.instrument-control) {
  margin-inline:
    clamp(
      0px,
      calc((100% - var(--instrument-control-size)) / 2),
      var(--s-4)
    )
    auto;
}

.control-bar__item:last-child :deep(.instrument-control) {
  margin-inline:
    auto
    clamp(
      0px,
      calc((100% - var(--instrument-control-size)) / 2),
      var(--s-4)
    );
}
</style>
