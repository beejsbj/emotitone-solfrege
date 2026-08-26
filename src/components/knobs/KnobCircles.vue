<script setup lang="ts">
import KnobFace from "@/components/primatives/Knob.vue";
import type { KnobTone, KnobVisual } from "@/types/knob";

interface Props {
  type: "range" | "boolean" | "options" | "button";
  color: string;
  backgroundOpacity?: number;
  strokeWidth?: number;
  backgroundStrokeWidth?: number;
  isDisplay?: boolean;
  value?: number;
  isActive?: boolean;
  totalSegments?: number;
  activeSegment?: number;
  visual?: KnobVisual;
  tone?: KnobTone;
}

withDefaults(defineProps<Props>(), {
  backgroundOpacity: 0.4,
  strokeWidth: 8,
  backgroundStrokeWidth: 2,
  visual: "arc",
  tone: "ivory",
});
</script>

<template>
  <KnobFace
    :role="type"
    :visual="visual"
    :tone="tone"
    :color="color"
    :background-opacity="backgroundOpacity"
    :stroke-width="strokeWidth"
    :background-stroke-width="backgroundStrokeWidth"
    :is-display="isDisplay"
    :value="value"
    :is-active="isActive"
    :total-segments="totalSegments"
    :active-segment="activeSegment"
  />
</template>
