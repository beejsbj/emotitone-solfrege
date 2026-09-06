<template>
  <svg
    class="mark"
    :class="classes"
    :width="resolvedSize"
    :height="resolvedSize"
    :viewBox="mark.viewBox"
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

export type MarkName =
  | "triangle"
  | "disk"
  | "zigzag"
  | "blade"
  | "wave"
  | "bar"
  | "diamond"
  | "half-circle"
  | "star"
  | "eighth"
  | "beam"
  | "sharp"
  | "flat"
  | "accent"
  | "trill"
  | "slur"
  | "fermata"
  | "staccato"
  | "grace"
  | "clef";

export type MarkTone =
  | "ivory"
  | "ivory-2"
  | "brass"
  | "tomato"
  | "pine"
  | "plum"
  | "mustard";

export type MarkTreatment = "fill" | "wire";

interface MarkPath {
  d: string;
  fillRule?: "evenodd";
}

interface MarkDefinition {
  viewBox: string;
  paths: MarkPath[];
}

const MARKS: Record<MarkName, MarkDefinition> = {
  triangle: {
    viewBox: "0 0 80 80",
    paths: [{ d: "M41 6 L46 17 L51 25 L57 36 L62 46 L67 56 L72 67 L74 73 L62 71 L49 73 L36 71 L22 73 L9 72 L7 71 L13 60 L18 50 L23 41 L29 30 L34 19 Z" }],
  },
  disk: {
    viewBox: "0 0 80 80",
    paths: [{ d: "M72 41 L69 53 L62 62 L51 69 L41 72 L29 71 L18 64 L11 54 L7 42 L9 30 L16 19 L26 11 L37 8 L48 9 L58 13 L66 21 L71 31 Z" }],
  },
  zigzag: {
    viewBox: "0 0 120 80",
    paths: [{ d: "M2 60 L22 26 L40 60 L60 28 L80 62 L100 24 L118 60 L118 70 L100 38 L80 72 L60 40 L40 72 L22 38 L2 70 Z" }],
  },
  blade: {
    viewBox: "0 0 80 80",
    paths: [{ d: "M9 7 L22 9 L33 7 L42 13 L50 23 L57 32 L56 44 L58 56 L56 72 L43 71 L31 73 L21 64 L12 52 L7 46 L9 31 L7 18 Z" }],
  },
  wave: {
    viewBox: "0 0 80 80",
    paths: [{ d: "M5 46 L16 28 L25 30 L34 48 L43 32 L53 30 L63 50 L74 34 L75 42 L64 60 L52 42 L43 42 L34 58 L25 42 L15 40 L4 56 Z" }],
  },
  bar: {
    viewBox: "0 0 96 80",
    paths: [{ d: "M4 34 L92 34 L92 46 L4 46 Z" }],
  },
  diamond: {
    viewBox: "0 0 80 80",
    paths: [{ d: "M40 6 L60 38 L40 72 L20 38 Z" }],
  },
  "half-circle": {
    viewBox: "0 0 80 80",
    paths: [{ d: "M10 60 L10 38 Q10 12 40 12 Q70 12 70 38 L70 60 Z" }],
  },
  star: {
    viewBox: "0 0 80 80",
    paths: [{ d: "M40 6 L52 26 L72 26 L57 43 L63 64 L40 52 L17 64 L23 43 L8 26 L28 26 Z" }],
  },
  eighth: {
    viewBox: "0 0 60 60",
    paths: [
      { d: "M35 8 L38 11 L37 24 L38 36 L37 46 L33 46 L34 36 L33 24 L34 11 Z" },
      { d: "M11 42 L18 38 L28 38 L34 41 L36 47 L31 52 L21 53 L13 51 L8 47 Z" },
      { d: "M37 8 L46 14 L51 22 L49 30 L44 33 L48 24 L43 18 L37 14 Z" },
    ],
  },
  beam: {
    viewBox: "0 0 60 60",
    paths: [
      { d: "M17 6 L21 8 L21 44 L17 44 Z" },
      { d: "M40 6 L44 8 L44 42 L40 42 Z" },
      { d: "M16 6 L44 4 L45 12 L16 14 Z" },
      { d: "M16 18 L44 16 L45 24 L16 26 Z" },
      { d: "M5 44 L12 40 L21 40 L26 43 L25 49 L18 53 L9 52 L4 48 Z" },
      { d: "M28 42 L35 38 L44 38 L49 42 L48 48 L41 52 L32 51 L27 47 Z" },
    ],
  },
  sharp: {
    viewBox: "0 0 60 60",
    paths: [
      { d: "M17 6 L20 8 L20 30 L21 50 L17 52 L15 30 L15 8 Z" },
      { d: "M38 4 L41 6 L41 28 L42 48 L38 50 L36 28 L36 6 Z" },
      { d: "M7 22 L44 15 L45 24 L8 30 Z" },
      { d: "M7 38 L44 31 L45 40 L8 46 Z" },
    ],
  },
  flat: {
    viewBox: "0 0 50 60",
    paths: [
      { d: "M14 6 L18 8 L17 28 L18 48 L14 50 L13 28 Z" },
      { d: "M17 24 L24 21 L32 24 L36 30 L34 38 L26 44 L18 43 L16 38 L19 36 L25 39 L30 36 L31 30 L27 27 L20 28 Z" },
    ],
  },
  accent: {
    viewBox: "0 0 60 60",
    paths: [{ d: "M7 30 L20 24 L34 22 L48 20 L54 24 L52 30 L54 36 L48 40 L34 38 L20 36 L8 32 Z" }],
  },
  trill: {
    viewBox: "0 0 60 60",
    paths: [
      { d: "M6 38 L14 22 L22 30 L30 16 L38 24 L46 12 L54 22 L54 28 L46 18 L38 30 L30 22 L22 36 L14 28 L6 44 Z" },
      { d: "M48 4 L53 3 L55 8 L52 12 L48 10 Z" },
    ],
  },
  slur: {
    viewBox: "0 0 60 60",
    paths: [{ d: "M6 40 L13 28 L23 20 L32 18 L41 21 L51 30 L54 40 L50 38 L43 28 L34 24 L25 25 L17 31 L10 41 Z" }],
  },
  fermata: {
    viewBox: "0 0 60 60",
    paths: [
      { d: "M8 38 Q10 20 30 18 Q50 20 52 38 L48 38 Q46 24 30 22 Q14 24 12 38 Z" },
      { d: "M26 42 Q26 34 30 32 Q34 34 34 42 Q34 50 30 52 Q26 50 26 42 Z" },
    ],
  },
  staccato: {
    viewBox: "0 0 60 60",
    paths: [
      { d: "M12 34 L16 32 L19 35 L18 39 L14 39 L11 37 Z" },
      { d: "M28 30 L33 28 L35 32 L34 36 L30 36 L27 33 Z" },
      { d: "M44 26 L49 24 L51 28 L50 32 L46 32 L43 29 Z" },
    ],
  },
  grace: {
    viewBox: "0 0 60 60",
    paths: [
      { d: "M33 10 L35 12 L34 22 L35 32 L33 34 L31 32 L32 22 L31 12 Z" },
      { d: "M13 31 L19 29 L26 29 L30 32 L29 37 L22 40 L15 38 L11 35 Z" },
      { d: "M35 10 L46 7 L47 12 L36 16 Z" },
      { d: "M16 24 L42 10 L44 14 L18 28 Z" },
    ],
  },
  clef: {
    viewBox: "0 0 60 60",
    paths: [
      { d: "M30 5 L33 9 L31 18 L33 28 L30 38 L33 48 L31 54 L27 56 L25 52 L29 48 L27 38 L30 28 L28 18 L30 9 Z" },
      { d: "M32 12 L40 9 L46 14 L45 22 L38 27 L31 27 L37 24 L41 19 L37 16 L32 17 Z" },
      { d: "M19 36 L28 33 L37 36 L41 42 L37 49 L29 51 L22 48 L18 43 Z M27 40 L31 39 L34 42 L32 46 L28 46 L25 43 Z", fillRule: "evenodd" },
    ],
  },
};

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

const mark = computed(() => MARKS[props.name]);
const resolvedSize = computed(() =>
  typeof props.size === "number" ? String(props.size) : props.size,
);
const classes = computed(() => [
  `mark--tone-${props.tone}`,
  `mark--${props.treatment}`,
]);
</script>

<style scoped>
.mark {
  display: block;
  color: var(--ivory);
}

.mark--tone-ivory {
  color: var(--ivory);
}

.mark--tone-ivory-2 {
  color: var(--ivory-2);
}

.mark--tone-brass {
  color: var(--brass);
}

.mark--tone-tomato {
  color: var(--tomato);
}

.mark--tone-pine {
  color: var(--pine);
}

.mark--tone-plum {
  color: var(--plum);
}

.mark--tone-mustard {
  color: var(--mustard);
}
</style>
