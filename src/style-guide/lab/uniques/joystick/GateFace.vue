<script setup lang="ts">
import { computed } from "vue";
import { JOYSTICK_OPTIONS, vectorFromDirection } from "@/components/uniques/Joystick/joystickOptions";
import type { LabJoystickFaceProps } from "@/types/uniquesLab";

/*
 * Direction A · Gate Plate. The dark well is cut into the Brass plate as an
 * eight-slot shifter gate, so the choices are physical channels. The stick
 * rides the slot of the effective direction; each slot end carries a lamp.
 */
const props = defineProps<LabJoystickFaceProps>();

const TRAVEL = 27; // Production's stick travel, % of the face.
const SLOT_END = 31;
const slots = JOYSTICK_OPTIONS.filter((option) => option.value !== "auto").map((option) => {
  const { x, y } = vectorFromDirection(option.value);
  const length = Math.hypot(x, y) || 1;
  return { value: option.value, ux: x / length, uy: y / length };
});

// Cut the gate as a mask in face coordinates: a hub plus eight round-ended slots.
const gateMask = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><g stroke='#000' stroke-width='7.5' stroke-linecap='round'>${
    slots.map((slot) => `<line x1='50' y1='50' x2='${50 + slot.ux * SLOT_END}' y2='${50 + slot.uy * SLOT_END}'/>`).join("")
  }</g><circle cx='50' cy='50' r='10'/></svg>`,
)}")`;

// The stick is held in its slot: magnitude from the real stick, angle from the gate.
const stick = computed(() => {
  const magnitude = Math.min(1, Math.hypot(props.x, props.y));
  const slot = slots.find((item) => item.value === props.effective);
  if (!slot) return { left: 50 + props.x * 6, top: 50 + props.y * 6 };
  return { left: 50 + slot.ux * magnitude * TRAVEL, top: 50 + slot.uy * magnitude * TRAVEL };
});
</script>

<template>
  <div class="gate" :class="{ 'gate--active': active }">
    <span class="gate__plate" />
    <span class="gate__lip" :style="{ '--gate-mask': gateMask }" />
    <span class="gate__well" :style="{ '--gate-mask': gateMask }" />
    <svg class="gate__lamps" viewBox="0 0 100 100" aria-hidden="true">
      <line
        v-for="slot in slots"
        :key="`trace-${slot.value}`"
        class="gate__trace"
        :class="{ 'gate__trace--on': active && effective === slot.value }"
        x1="50" y1="50"
        :x2="50 + slot.ux * SLOT_END" :y2="50 + slot.uy * SLOT_END"
      />
      <circle
        v-for="slot in slots"
        :key="slot.value"
        class="gate__lamp"
        :class="{
          'gate__lamp--latched': latched === slot.value,
          'gate__lamp--effective': effective === slot.value,
        }"
        :cx="50 + slot.ux * 40" :cy="50 + slot.uy * 40" r="2.3"
      />
    </svg>
    <span class="gate__stick" :style="{ left: `${stick.left}%`, top: `${stick.top}%` }" />
  </div>
</template>

<style scoped>
.gate { position: absolute; inset: 0; }

.gate__plate {
  position: absolute;
  inset: 8%;
  overflow: hidden;
  border-radius: 50%;
  background: var(--brass-fill);
  box-shadow: 0 2px 0 var(--brass-edge);
}

.gate__plate::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--brass-sheen);
  background-position: -60% 0;
  background-size: 220% 100%;
  background-repeat: no-repeat;
  mix-blend-mode: screen;
  animation: brass-sheen var(--dur-sheen) var(--ease-sheen) infinite;
}

/* The machined edge: the same cut, offset, catching light on its lower wall. */
.gate__lip {
  position: absolute;
  inset: 0;
  background: var(--brass-hi);
  translate: 0 1.2%;
  -webkit-mask: var(--gate-mask) center / 100% 100% no-repeat;
  mask: var(--gate-mask) center / 100% 100% no-repeat;
}

.gate__well {
  position: absolute;
  inset: 0;
  background: var(--instrument-control-dark-well);
  -webkit-mask: var(--gate-mask) center / 100% 100% no-repeat;
  mask: var(--gate-mask) center / 100% 100% no-repeat;
}

.gate__lamps { position: absolute; inset: 0; overflow: visible; }

.gate__trace {
  stroke: var(--ivory);
  stroke-width: 1.2;
  stroke-linecap: round;
  opacity: 0;
  transition: opacity var(--dur-tap) var(--ease-stab);
}

.gate__trace--on { opacity: .55; }

.gate__lamp { fill: var(--brass-edge); transition: fill var(--dur-tap) var(--ease-stab); }
.gate__lamp--latched { fill: var(--ivory); filter: drop-shadow(0 0 1.5px var(--brass-hi)); }
.gate--active .gate__lamp--effective { fill: var(--ivory); }

.gate__stick {
  position: absolute;
  inline-size: 20%;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 50%;
  background: var(--brass-fill);
  box-shadow: inset 0 -2px 2px var(--brass-lo), 0 3px 4px var(--brass-edge);
  translate: -50% -50%;
  transition: left var(--dur-tap) var(--ease-stab), top var(--dur-tap) var(--ease-stab), scale var(--dur-bounce) var(--ease-bounce);
}

.gate--active .gate__stick { scale: .9; transition: left 60ms linear, top 60ms linear, scale var(--dur-tap) var(--ease-stab); }

@media (prefers-reduced-motion: reduce) {
  .gate__plate::after { animation: none; }
  .gate__stick, .gate--active .gate__stick, .gate__trace, .gate__lamp { scale: 1; transition: none; }
}

@media (forced-colors: active) {
  .gate__plate { background: Canvas; border: 1px solid CanvasText; box-shadow: none; }
  .gate__plate::after { display: none; }
  .gate__well { background: CanvasText; }
  .gate__lip { display: none; }
  .gate__lamp { fill: GrayText; filter: none; }
  .gate__lamp--latched, .gate--active .gate__lamp--effective { fill: Highlight; }
  .gate__trace { stroke: Highlight; }
  .gate__stick { background: Highlight; border: 1px solid HighlightText; box-shadow: none; }
}
</style>
