<template>
  <Teleport to="body">
    <div ref="follower" class="knob-drag-value" aria-hidden="true">
      <Sticker variant="fill" color="ivory" class="knob-drag-value__paper">
        {{ value }}
      </Sticker>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import Sticker from "../Sticker.vue";

const props = defineProps<{ x: number; y: number; value: string }>();
const follower = ref<HTMLElement>();
let frame = 0;
let previousTime = 0;
let x = props.x;
let y = props.y;
let tilt = 0;

onMounted(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const draw = (time: number) => {
    const element = follower.value;
    if (!element) return;
    const dt = previousTime ? Math.min(time - previousTime, 64) : 16;
    previousTime = time;
    // A short, frame-rate-independent tail. Never delay the actual value.
    const follow = reducedMotion.matches ? 1 : 1 - Math.exp(-dt / 45);
    const targetTilt = reducedMotion.matches ? 0 : Math.max(-4, Math.min(4, (props.x - x) * 0.12));
    x += (props.x - x) * follow;
    y += (props.y - y) * follow;
    tilt += (targetTilt - tilt) * follow;

    // Leave room for both the fingertip and the paper's rotated corners.
    // Cap upward lag so a fast upward drag cannot catch the readout.
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    const halfWidth = element.offsetWidth / 2;
    const paperHeight = element.offsetHeight;
    // At the top edge there is no room above: step beside the finger.
    const beside = props.y - 48 < top + paperHeight + 16;
    const targetX = beside
      ? props.x + (props.x < left + width / 2 ? 1 : -1) * (halfWidth + 48)
      : x;
    const px = Math.max(left + halfWidth + 16, Math.min(left + width - halfWidth - 16, targetX));
    const targetY = beside ? props.y + paperHeight / 2 : Math.min(y - 64, props.y - 48);
    const py = Math.max(top + paperHeight + 16, Math.min(top + height - 16, targetY));
    element.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -100%) rotate(${tilt}deg)`;
    element.style.visibility = "visible";
    frame = requestAnimationFrame(draw);
  };
  draw(performance.now());
});

onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<style scoped>
.knob-drag-value {
  position: fixed;
  inset: 0 auto auto 0;
  z-index: 1000;
  visibility: hidden;
  pointer-events: none;
  user-select: none;
  max-inline-size: calc(100vw - 32px);
  will-change: transform;
}

.knob-drag-value__paper {
  max-inline-size: 100%;
  box-sizing: border-box;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
  text-transform: none;
  white-space: normal;
  overflow-wrap: anywhere;
  text-align: center;
}
</style>
