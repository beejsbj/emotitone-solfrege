<script setup lang="ts">
import { computed } from "vue";
import { JOYSTICK_OPTIONS } from "@/components/uniques/Joystick/joystickOptions";
import type { LabJoystickFaceProps } from "@/types/uniquesLab";

/*
 * Direction C · Pad Matrix (Digital). The face is the Joystick's own keyboard
 * model made visible: the 3 × 3 radio grid as nine lit pads, Automatic in the
 * centre. A Brass cursor slides continuously over the grid and the pad under
 * it lights, so a discrete choice still tracks the finger.
 */
const props = defineProps<LabJoystickFaceProps>();

const PITCH = 25; // Pad pitch, % of the face.

// Map the stick's circle onto the square grid so diagonals reach the corner pads.
const cursor = computed(() => {
  const peak = Math.max(Math.abs(props.x), Math.abs(props.y));
  const scale = peak > 0.001 ? Math.hypot(props.x, props.y) / peak : 0;
  return { left: `${50 + props.x * scale * PITCH}%`, top: `${50 + props.y * scale * PITCH}%` };
});
</script>

<template>
  <div class="matrix" :class="{ 'matrix--active': active }">
    <span class="matrix__plate" />
    <span
      v-for="(option, index) in JOYSTICK_OPTIONS"
      :key="option.value"
      class="matrix__pad"
      :class="{
        'matrix__pad--centre': option.value === 'auto',
        'matrix__pad--lit': effective === option.value,
        'matrix__pad--latched': latched === option.value && effective !== option.value,
      }"
      :style="{ left: `${50 + ((index % 3) - 1) * PITCH}%`, top: `${50 + (Math.floor(index / 3) - 1) * PITCH}%` }"
    />
    <span class="matrix__cursor" :style="cursor" />
  </div>
</template>

<style scoped>
.matrix { position: absolute; inset: 0; }

.matrix__plate {
  position: absolute;
  inset: 8%;
  background: var(--ink);
  box-shadow: inset 0 0 0 2px var(--brass);
}

.matrix__pad {
  position: absolute;
  inline-size: 17%;
  aspect-ratio: 1;
  background: var(--ink-4);
  translate: -50% -50%;
  transition: background-color var(--dur-tap) var(--ease-stab), box-shadow var(--dur-tap) var(--ease-stab);
}

.matrix__pad--centre { inline-size: 9%; border-radius: 50%; }
.matrix__pad--latched { background: var(--brass-lo); }
.matrix__pad--lit { background: var(--brass-hi); box-shadow: 0 0 6px color-mix(in srgb, var(--brass) 70%, transparent); }

.matrix__cursor {
  position: absolute;
  inline-size: 23%;
  aspect-ratio: 1;
  box-shadow: inset 0 0 0 1.5px var(--brass-hi), 0 0 8px color-mix(in srgb, var(--brass) 45%, transparent);
  translate: -50% -50%;
  transition: left var(--dur-tap) var(--ease-stab), top var(--dur-tap) var(--ease-stab);
}

.matrix--active .matrix__cursor { transition: left 0s, top 0s; }

@media (prefers-reduced-motion: reduce) {
  .matrix__pad, .matrix__cursor, .matrix--active .matrix__cursor { transition: none; }
}

@media (forced-colors: active) {
  .matrix__plate { background: Canvas; box-shadow: none; border: 1px solid CanvasText; }
  .matrix__pad { background: GrayText; box-shadow: none; }
  .matrix__pad--latched { background: CanvasText; }
  .matrix__pad--lit { background: Highlight; }
  .matrix__cursor { box-shadow: none; outline: 2px solid Highlight; }
}
</style>
