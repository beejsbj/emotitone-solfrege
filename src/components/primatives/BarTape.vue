<template>
  <div :class="barTapeClasses" :aria-label="ariaLabel">
    <span
      v-for="segment in renderedSegments"
      :key="segment.note"
      :class="segmentClasses(segment)"
      :style="segmentStyle(segment)"
      aria-hidden="true"
    ></span>
    <span
      v-if="playheadPercent !== undefined"
      class="bar-tape__playhead"
      :style="playheadStyle"
      aria-hidden="true"
    ></span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { CSSProperties } from "vue";

export type BarTapeNote = "do" | "re" | "mi" | "fa" | "sol" | "la" | "ti";
export type BarTapeMode = "major" | "equal";
export type BarTapeSize = "default" | "thin" | "tall";
export type BarTapeFrame = "boxed" | "flush";

export interface BarTapeSegment {
  note: BarTapeNote;
  dim?: boolean;
  downbeat?: boolean;
}

const defaultSegments: BarTapeSegment[] = [
  { note: "do" },
  { note: "re" },
  { note: "mi" },
  { note: "fa" },
  { note: "sol" },
  { note: "la" },
  { note: "ti" },
];

const majorFlexByNote: Record<BarTapeNote, number> = {
  do: 16,
  re: 16,
  mi: 8,
  fa: 16,
  sol: 16,
  la: 16,
  ti: 8,
};

const props = withDefaults(
  defineProps<{
    mode?: BarTapeMode;
    size?: BarTapeSize;
    frame?: BarTapeFrame;
    segments?: BarTapeSegment[];
    playheadPercent?: number;
    ariaLabel?: string;
  }>(),
  {
    mode: "major",
    size: "default",
    frame: "boxed",
    ariaLabel: "Diatonic bar tape",
  },
);

const renderedSegments = computed(() => props.segments ?? defaultSegments);

const barTapeClasses = computed(() => [
  "bar-tape",
  `bar-tape--${props.mode}`,
  `bar-tape--${props.size}`,
  `bar-tape--${props.frame}`,
  props.playheadPercent !== undefined ? "bar-tape--live" : null,
]);

const playheadStyle = computed<CSSProperties>(() => ({
  left: `${Math.min(100, Math.max(0, props.playheadPercent ?? 0))}%`,
}));

const segmentClasses = (segment: BarTapeSegment) => [
  "bar-tape__segment",
  `bar-tape__segment--${segment.note}`,
  segment.dim ? "bar-tape__segment--dim" : null,
  segment.downbeat ? "bar-tape__segment--downbeat" : null,
];

const segmentStyle = (segment: BarTapeSegment): CSSProperties =>
  props.mode === "major" ? { flex: majorFlexByNote[segment.note] } : {};
</script>

<style scoped>
.bar-tape {
  position: relative;
  height: 8px;
  display: flex;
  border: 1px solid var(--hairline);
  background: var(--ink);
  overflow: hidden;
}

.bar-tape--thin {
  height: 4px;
}

.bar-tape--tall {
  height: 16px;
}

.bar-tape--flush {
  border-left: 0;
  border-right: 0;
  border-bottom: 0;
}

.bar-tape__segment {
  display: block;
  height: 100%;
  flex: 1;
}

.bar-tape--equal .bar-tape__segment {
  flex: 1;
}

.bar-tape__segment--do {
  background: var(--note-do);
}

.bar-tape__segment--re {
  background: var(--note-re);
}

.bar-tape__segment--mi {
  background: var(--note-mi);
}

.bar-tape__segment--fa {
  background: var(--note-fa);
}

.bar-tape__segment--sol {
  background: var(--note-sol);
}

.bar-tape__segment--la {
  background: var(--note-la);
}

.bar-tape__segment--ti {
  background: var(--note-ti);
}

.bar-tape__segment--dim {
  opacity: .18;
}

.bar-tape__segment--downbeat {
  background: var(--brass);
  box-shadow: var(--shadow-glow-brass);
}

.bar-tape__playhead {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  background: var(--ivory);
  box-shadow: 0 0 6px rgba(244, 239, 230, .6);
  flex: 0 0 auto;
  pointer-events: none;
}
</style>
