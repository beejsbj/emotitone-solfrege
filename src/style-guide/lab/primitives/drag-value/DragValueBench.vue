<script setup lang="ts">
import { computed, ref, type Component } from "vue";
import LabCell from "../LabCell.vue";
import LabDragFollower from "./LabDragFollower.vue";

/**
 * The floating value in every tone its two consumers use, a step control to
 * see the change motion, and a live pad that drives the real follower physics.
 */
const props = defineProps<{ component: Component }>();

const stepped = ref(64);
const pad = ref<HTMLElement | null>(null);
const dragging = ref(false);
const pointer = ref({ x: 0, y: 0 });
const padValue = ref(50);
let startY = 0;
let startValue = 50;

const onDown = (event: PointerEvent) => {
  dragging.value = true;
  startY = event.clientY;
  startValue = padValue.value;
  pointer.value = { x: event.clientX, y: event.clientY };
  pad.value?.setPointerCapture(event.pointerId);
};
const onMove = (event: PointerEvent) => {
  if (!dragging.value) return;
  pointer.value = { x: event.clientX, y: event.clientY };
  padValue.value = Math.max(0, Math.min(100, Math.round(startValue + (startY - event.clientY) * .5)));
};
const onUp = () => { dragging.value = false; };

const paper = computed(() => props.component);
</script>

<template>
  <div class="plab-bench">
    <LabCell caption="Ivory · everyday Knob drag (range, unit, option)">
      <component :is="component" value="64" tone="ivory" />
      <component :is="component" value="3.5s" tone="ivory" />
      <component :is="component" value="Phrygian" tone="ivory" />
    </LabCell>
    <LabCell caption="Brass Badge · master Knobs and the Joystick drag">
      <component :is="component" value="0.35" tone="brass" />
      <component :is="component" value="Bluesy" tone="brass" />
    </LabCell>
    <LabCell caption="Ivory latched · a committed Joystick direction">
      <component :is="component" value="Jazzy" tone="ivory-badge" />
    </LabCell>
    <LabCell :caption="`Value change · tap to step (${stepped})`">
      <button type="button" class="plab-step" @click="stepped = stepped >= 96 ? 7 : stepped + 9">
        <component :is="component" :value="String(stepped)" tone="ivory" />
      </button>
    </LabCell>
    <LabCell caption="Live · drag up and down in the pad; the real follower physics carries the paper" wide>
      <div
        ref="pad"
        class="plab-pad"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
      >
        Drag here · {{ padValue }}
      </div>
      <LabDragFollower v-if="dragging" :x="pointer.x" :y="pointer.y" :value="String(padValue)" tone="ivory" :paper="paper" />
    </LabCell>
  </div>
</template>

<style scoped>
.plab-step {
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}

.plab-step:focus-visible { outline: 2px solid var(--ivory); outline-offset: 4px; }

.plab-pad {
  display: grid;
  place-items: center;
  inline-size: min(100%, 320px);
  block-size: 120px;
  background: var(--ink-3);
  color: var(--ivory-3);
  cursor: ns-resize;
  font: var(--t-caption);
  touch-action: none;
  user-select: none;
}
</style>
