<script setup lang="ts">
import { computed } from "vue";
import { MARK_DEFINITIONS, type MarkName } from "@/components/primatives/marks";

/**
 * A real Mark drawn inside a parent SVG, so lab logos scale as one drawing.
 * Geometry comes from marks.ts; nothing is redrawn here.
 */
const props = withDefaults(defineProps<{
  name: MarkName;
  /** Centre in the parent viewBox. */
  x: number;
  y: number;
  /** Rendered width in parent units. */
  size: number;
  rotate?: number;
  fill?: string;
}>(), { rotate: 0, fill: "currentColor" });

const definition = computed(() => MARK_DEFINITIONS[props.name]);
const transform = computed(() => {
  const [, , w, h] = definition.value.viewBox;
  const scale = props.size / w;
  return `translate(${props.x} ${props.y}) rotate(${props.rotate}) scale(${scale}) translate(${-w / 2} ${-h / 2})`;
});
</script>

<template>
  <!-- Outer group stays transform-free so CSS motion never overrides placement. -->
  <g :fill="fill">
    <g :transform="transform">
      <path v-for="(path, index) in definition.paths" :key="index" :d="path.d" :fill-rule="path.fillRule" />
    </g>
  </g>
</template>
