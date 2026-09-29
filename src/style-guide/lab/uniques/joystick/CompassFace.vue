<script setup lang="ts">
import { computed } from "vue";
import { JOYSTICK_OPTIONS, vectorFromDirection } from "@/components/uniques/Joystick/joystickOptions";
import type { LabJoystickFaceProps } from "@/types/uniquesLab";

/*
 * Direction B · LED Compass. The Joystick joins the Knob family: the same
 * dark dome at the Knob's 16% inset and the same hand-cut LED chads at the
 * collar's radius, eight of them, one per direction. No Brass plate; the stick
 * is a Brass nub in the dome, and light answers where you are pointing.
 */
const props = defineProps<LabJoystickFaceProps>();

// Knob collar geometry (KnobFace): radius 44, chad 6.4, a fixed hand-cut tilt.
const RADIUS = 44;
const CHAD = 6.4;
const TRAVEL = 21; // The nub stays inside the smaller dome.
const chads = JOYSTICK_OPTIONS.filter((option) => option.value !== "auto").map((option, index) => {
  const { x, y } = vectorFromDirection(option.value);
  const length = Math.hypot(x, y) || 1;
  const cx = 50 + (x / length) * RADIUS;
  const cy = 50 + (y / length) * RADIUS;
  const angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
  return { value: option.value, cx, cy, tilt: angle + ((index * 37) % 11) - 5 };
});

const nub = computed(() => ({
  left: `${50 + props.x * TRAVEL}%`,
  top: `${50 + props.y * TRAVEL}%`,
}));
</script>

<template>
  <div class="compass" :class="{ 'compass--active': active }">
    <span class="compass__dome" />
    <svg class="compass__collar" viewBox="0 0 100 100" aria-hidden="true">
      <rect
        v-for="chad in chads"
        :key="chad.value"
        class="compass__chad"
        :class="{
          'compass__chad--lit': effective === chad.value,
          'compass__chad--latched': latched === chad.value && effective !== chad.value,
        }"
        :x="chad.cx - CHAD / 2" :y="chad.cy - CHAD / 2" :width="CHAD" :height="CHAD" rx="0.6"
        :transform="`rotate(${chad.tilt} ${chad.cx} ${chad.cy})`"
      />
    </svg>
    <span class="compass__nub" :class="{ 'compass__nub--auto': effective === 'auto' }" :style="nub" />
  </div>
</template>

<style scoped>
.compass { position: absolute; inset: 0; color: var(--brass-hi); }

/* The Knob's dome, exactly: 16% inset, dark well, currentColor-tinted rim. */
.compass__dome {
  position: absolute;
  inset: 16%;
  border: clamp(1px, 1.5cqi, 2px) solid color-mix(in srgb, currentColor 24%, #080808);
  border-radius: 50%;
  background: var(--instrument-control-dark-well);
  box-shadow: var(--instrument-control-dark-well-shadow);
}

.compass__collar { position: absolute; inset: 0; overflow: visible; }

.compass__chad { fill: var(--ink-5); transition: fill var(--dur-tap) var(--ease-stab), filter var(--dur-tap) var(--ease-stab); }
.compass__chad--lit { fill: currentColor; filter: drop-shadow(0 0 3px color-mix(in srgb, currentColor 75%, transparent)); }
.compass__chad--latched { fill: var(--brass-lo); }

.compass__nub {
  position: absolute;
  inline-size: 26%;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 50%;
  background: var(--brass-fill);
  box-shadow: inset 0 -2px 2px var(--brass-lo), 0 3px 4px rgb(0 0 0 / 55%);
  translate: -50% -50%;
  transition: left var(--dur-tap) var(--ease-stab), top var(--dur-tap) var(--ease-stab), scale var(--dur-bounce) var(--ease-bounce);
}

.compass__nub::after {
  content: "";
  position: absolute;
  inset: -10% -30%;
  background: var(--brass-sheen);
  background-position: -60% 0;
  background-size: 220% 100%;
  background-repeat: no-repeat;
  mix-blend-mode: screen;
  animation: brass-sheen var(--dur-sheen) var(--ease-sheen) infinite;
}

.compass--active .compass__nub { scale: .9; transition: left 0s, top 0s, scale var(--dur-tap) var(--ease-stab); }

@media (prefers-reduced-motion: reduce) {
  .compass__nub, .compass--active .compass__nub, .compass__chad { scale: 1; transition: none; }
  .compass__nub::after { animation: none; }
}

@media (forced-colors: active) {
  .compass__dome { background: Canvas; border-color: CanvasText; box-shadow: none; }
  .compass__chad { fill: GrayText; filter: none; }
  .compass__chad--lit { fill: Highlight; }
  .compass__chad--latched { fill: CanvasText; }
  .compass__nub { background: Highlight; border: 1px solid HighlightText; box-shadow: none; }
  .compass__nub::after { display: none; }
}
</style>
