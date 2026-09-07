<template>
  <svg
    class="mark"
    :class="classes"
    :width="resolvedSize"
    :height="resolvedSize"
    :viewBox="viewBox"
    aria-hidden="true"
  >
    <path
      v-for="path in mark.paths"
      :key="path.d"
      :d="path.d"
      :fill-rule="path.fillRule"
      :fill="treatment === 'wire' ? 'none' : 'currentColor'"
      :stroke="treatment === 'wire' ? 'currentColor' : undefined"
      stroke-width="2.5"
      stroke-linecap="butt"
      stroke-linejoin="miter"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { MARK_DEFINITIONS, markViewBox, type MarkName } from "./marks";

export type { MarkName } from "./marks";

export type MarkTone =
  | "ivory"
  | "ivory-2"
  | "brass"
  | "tomato"
  | "pine"
  | "plum"
  | "mustard";

export type MarkTreatment = "fill" | "wire";

const props = withDefaults(
  defineProps<{
    name?: MarkName;
    tone?: MarkTone;
    size?: number | string;
    treatment?: MarkTreatment;
  }>(),
  {
    name: "triangle",
    tone: "ivory",
    size: 44,
    treatment: "fill",
  },
);

const mark = computed(() => MARK_DEFINITIONS[props.name]);
const viewBox = computed(() => markViewBox(props.name));
const resolvedSize = computed(() => typeof props.size === "number" ? String(props.size) : props.size);
const classes = computed(() => [`mark--tone-${props.tone}`, `mark--${props.treatment}`]);
</script>

<style scoped>
.mark {
  display: block;
  color: var(--ivory);
}

.mark--tone-ivory { color: var(--ivory); }
.mark--tone-ivory-2 { color: var(--ivory-2); }
.mark--tone-brass { color: var(--brass); }
.mark--tone-tomato { color: var(--tomato); }
.mark--tone-pine { color: var(--pine); }
.mark--tone-plum { color: var(--plum); }
.mark--tone-mustard { color: var(--mustard); }
</style>
