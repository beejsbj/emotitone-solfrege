<script setup lang="ts">
import { computed, type Component } from "vue";
import Knob from "@/components/primatives/Knob/index.vue";
import { formatKnobDisplayValue } from "@/components/primatives/Knob/displayValue";
import type { KnobOption, KnobVisual } from "@/components/primatives/Knob/types";
import type { LabKnobFaceProps, LabKnobRole } from "@/types/primitivesLab";

/*
 * Lab scaffold. The production Knob stays mounted and owns every gesture,
 * keyboard path, ARIA attribute, DragValue follower, and label. A direction
 * only paints a replacement face over the production face it hides. Adoption
 * would move the face into KnobFace instead; this overlay is not anatomy.
 */
const props = withDefaults(defineProps<{
  face?: Component | null;
  visual?: KnobVisual;
  type: LabKnobRole;
  tone?: "ivory" | "brass";
  label: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[] | KnobOption[];
  formatValue?: (value: number) => string | number;
  isDisabled?: boolean;
  size?: string;
}>(), {
  face: null,
  visual: undefined,
  tone: "ivory",
  min: 0,
  max: 100,
  step: 1,
  options: undefined,
  formatValue: (value: number) => value.toString(),
  isDisabled: false,
  size: "72px",
});

const model = defineModel<number | string | boolean>({ required: true });

const optionEntries = computed(() => (props.options ?? []).map((option) =>
  typeof option === "string" ? { label: option, value: option } : option,
));

const faceProps = computed<LabKnobFaceProps>(() => {
  const formatted = props.type === "range"
    ? String(formatKnobDisplayValue(props.formatValue(Number(model.value))))
    : "";
  const [, number = formatted, unit = ""] = formatted.match(/^([+-]?(?:\d+\.?\d*|\.\d+))(.*)$/) ?? [];
  return {
    role: props.type,
    tone: props.tone,
    value: props.type === "range" ? (Number(model.value) - props.min) / (props.max - props.min) : 0,
    display: number,
    unit: unit.trim(),
    active: props.type === "boolean" && Boolean(model.value),
    optionIndex: Math.max(0, optionEntries.value.findIndex((option) => option.value === model.value)),
    optionLabels: optionEntries.value.map((option) => option.label),
  };
});
</script>

<template>
  <div
    class="lab-knob"
    :class="{ 'lab-knob--custom': face, 'lab-knob--disabled': isDisabled }"
    :style="{ '--lab-knob-size': size }"
  >
    <Knob
      v-model="model"
      :type="type"
      :visual="visual"
      :tone="tone"
      :label="label"
      :min="min"
      :max="max"
      :step="step"
      :options="options"
      :format-value="formatValue"
      :is-disabled="isDisabled"
      :haptic="false"
    />
    <span v-if="face" class="lab-knob__face"><component :is="face" class="lab-knob__paint" v-bind="faceProps" /></span>
  </div>
</template>

<style scoped>
.lab-knob {
  position: relative;
  display: grid;
  justify-items: center;
  inline-size: var(--lab-knob-size);
}

.lab-knob :deep(.instrument-control) { --instrument-control-size: var(--lab-knob-size); }

.lab-knob--custom :deep(.knob-wrapper__face) { visibility: hidden; }

.lab-knob__face {
  position: absolute;
  top: 0;
  left: 0;
  inline-size: var(--lab-knob-size);
  block-size: var(--lab-knob-size);
  pointer-events: none;
  container-type: inline-size;
}

.lab-knob__paint { inline-size: 100%; block-size: 100%; }

.lab-knob--disabled .lab-knob__face { opacity: .5; }
</style>
