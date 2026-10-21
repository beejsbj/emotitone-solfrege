<script setup lang="ts">
import Mark from "@/components/primatives/Mark.vue";
import type { MarkName } from "@/components/primatives/marks";

export interface FloatingMark {
  name: MarkName;
  /** Percent position inside the host. */
  x: number;
  y: number;
  size: number;
  rotate: number;
  color: string;
  /** Drift period in seconds; staggered so the field never pulses in unison. */
  drift?: number;
}

defineProps<{ marks: FloatingMark[] }>();
</script>

<template>
  <div class="floating-marks" aria-hidden="true">
    <span
      v-for="(mark, index) in marks"
      :key="index"
      class="floating-marks__mark"
      :style="{
        left: `${mark.x}%`,
        top: `${mark.y}%`,
        color: `var(--${mark.color})`,
        '--mark-rotate': `${mark.rotate}deg`,
        '--mark-drift': `${mark.drift ?? 7 + index * 1.3}s`,
        animationDelay: `${index * -1.7}s`,
      }"
    >
      <Mark :name="mark.name" tone="inherit" :size="mark.size" />
    </span>
  </div>
</template>

<style scoped>
.floating-marks {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.floating-marks__mark {
  position: absolute;
  display: block;
  transform: translate(-50%, -50%) rotate(var(--mark-rotate));
  animation: mark-drift var(--mark-drift) var(--ease-brush) infinite alternate;
}

@keyframes mark-drift {
  0%   { transform: translate(-50%, -50%) rotate(var(--mark-rotate)); }
  100% { transform: translate(-50%, calc(-50% - 10px)) rotate(calc(var(--mark-rotate) + 12deg)); }
}

@media (prefers-reduced-motion: reduce) {
  .floating-marks__mark { animation: none; }
}
</style>
