<template>
  <section ref="controlBarRef" class="control-bar" aria-label="Keyboard controls">
    <div class="control-bar__item">
      <Knob
        :model-value="keyValue"
        type="options"
        :options="CHROMATIC_NOTES"
        label="Key"
        @update:modelValue="(value) => emit('update:keyValue', String(value))"
      />
    </div>

    <div class="control-bar__item">
      <Knob
        :model-value="modeValue"
        type="options"
        :options="MODE_OPTIONS"
        label="Mode"
        @update:modelValue="(value) => emit('update:modeValue', String(value))"
      />
    </div>

    <div class="control-bar__item">
      <Knob
        :model-value="bpm"
        type="range"
        label="BPM"
        :min="40"
        :max="220"
        :step="1"
        @update:modelValue="(value) => emit('update:bpm', Number(value))"
      />
    </div>

    <div class="control-bar__item">
      <Knob
        :model-value="octave"
        type="range"
        label="Octave"
        :min="1"
        :max="8"
        :step="1"
        @update:modelValue="(value) => emit('update:octave', Number(value))"
      />
    </div>

    <div class="control-bar__item">
      <Knob
        :model-value="rows"
        type="range"
        label="Rows"
        :min="1"
        :max="8"
        :step="2"
        @update:modelValue="(value) => emit('update:rows', Number(value))"
      />
    </div>

  </section>
</template>

<script setup lang="ts">
import { provide, ref } from "vue";
import { CHROMATIC_NOTES, MODE_OPTIONS } from "@/data/musicData";
import Knob from "@/components/primatives/Knob/index.vue";
import { knobScrollContextKey } from "@/components/primatives/Knob/interaction";

const controlBarRef = ref<HTMLElement | null>(null);

provide(knobScrollContextKey, {
  read: () => controlBarRef.value?.scrollLeft ?? 0,
  write: (left) => {
    if (controlBarRef.value) controlBarRef.value.scrollLeft = left;
  },
});

withDefaults(
  defineProps<{
    keyValue?: string;
    modeValue?: string;
    bpm?: number;
    octave?: number;
    rows?: number;
  }>(),
  {
    keyValue: "C",
    modeValue: "major",
    bpm: 120,
    octave: 4,
    rows: 3,
  },
);

const emit = defineEmits<{
  "update:keyValue": [value: string];
  "update:modeValue": [value: string];
  "update:bpm": [value: number];
  "update:octave": [value: number];
  "update:rows": [value: number];
}>();
</script>

<style scoped>
.control-bar {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: start;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 3px 0 4px;
  overflow: hidden;
  background-color: var(--instrument-bar-surface);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  -webkit-backdrop-filter: var(--instrument-bar-backdrop);
  backdrop-filter: var(--instrument-bar-backdrop);
  contain: layout style;
  user-select: none;
}

.control-bar__item {
  min-width: 0;
}

.control-bar__item:deep(.knob-wrapper) {
  touch-action: none;
}
</style>
