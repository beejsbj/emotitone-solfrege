<template>
  <Teleport to="body">
    <div ref="follower" class="drag-value knob-drag-value" aria-hidden="true">
      <Sticker
        :variant="tone === 'ivory' ? 'fill' : 'badge'"
        :color="tone === 'brass' ? 'brass-sheen' : 'ivory'"
        class="drag-value__paper knob-drag-value__paper"
      >
        {{ value }}
      </Sticker>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import Sticker from "./Sticker.vue";

export type DragValueTone = "brass" | "ivory" | "ivory-badge";

const props = defineProps<{
  x: number;
  y: number;
  value: string;
  tone: DragValueTone;
}>();
const follower = ref<HTMLElement>();
let frame = 0;
let previousTime = 0;
let x = props.x;
let y = props.y;
let tilt = 0;
let velocityX = 0;
let velocityY = 0;
let tiltVelocity = 0;
const hoverDistance = 56;

onMounted(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const draw = (time: number) => {
    const element = follower.value;
    if (!element) return;
    const elapsed = previousTime ? Math.min(time - previousTime, 64) / 1000 : 1 / 60;
    previousTime = time;
    if (reducedMotion.matches) {
      x = props.x;
      y = props.y;
      tilt = velocityX = velocityY = tiltVelocity = 0;
    } else {
      // Preserve momentum through reversals. Small physics steps keep the
      // paper's spring stable on both high-refresh screens and missed frames.
      const steps = Math.ceil(elapsed / (1 / 120));
      const dt = elapsed / steps;
      for (let i = 0; i < steps; i++) {
        // Vertical drag is the primary gesture: it must make the paper lean,
        // too. A softer rotational spring lets it rebound after position settles.
        const targetTilt = Math.max(-12, Math.min(12,
          (props.x - x) * 0.3 + (props.y - y) * 0.45,
        ));
        velocityX += ((props.x - x) * 300 - velocityX * 22) * dt;
        velocityY += ((props.y - y) * 300 - velocityY * 22) * dt;
        tiltVelocity += ((targetTilt - tilt) * 180 - tiltVelocity * 14) * dt;
        x += velocityX * dt;
        y += velocityY * dt;
        tilt += tiltVelocity * dt;
      }
    }

    // Leave room for both the fingertip and the paper's rotated corners.
    // Cap upward lag so a fast upward drag cannot catch the readout.
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    const viewportGutter = 16;
    const availableWidth = Math.max(0, width - viewportGutter * 2);
    const availableHeight = Math.max(0, height - viewportGutter * 2);
    element.style.maxInlineSize = `${availableWidth}px`;

    // Preserve the full label when zoom makes the wrapped paper taller than
    // the visual viewport. Scale the complete Sticker rather than clipping it.
    const naturalWidth = element.offsetWidth;
    const naturalHeight = element.offsetHeight;
    const angle = Math.abs(tilt) * Math.PI / 180;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const horizontalExtent = naturalWidth / 2 * cos + naturalHeight * sin;
    const topExtent = naturalHeight * cos + naturalWidth / 2 * sin;
    const bottomExtent = naturalWidth / 2 * sin;
    const scale = Math.min(
      1,
      availableWidth / Math.max(1, horizontalExtent * 2),
      availableHeight / Math.max(1, topExtent + bottomExtent),
    );
    const visibleHorizontalExtent = horizontalExtent * scale;
    const visibleTopExtent = topExtent * scale;
    const visibleBottomExtent = bottomExtent * scale;

    // At the top edge there is no room above: step beside the finger.
    const beside = props.y - 48 < top + visibleTopExtent + viewportGutter;
    const targetX = beside
      ? props.x + (props.x < left + width / 2 ? 1 : -1) * (visibleHorizontalExtent + 48)
      : x;
    const minX = left + visibleHorizontalExtent + viewportGutter;
    const maxX = left + width - visibleHorizontalExtent - viewportGutter;
    const px = minX <= maxX
      ? Math.max(minX, Math.min(maxX, targetX))
      : left + width / 2;
    const targetY = beside
      ? props.y + (visibleTopExtent + visibleBottomExtent) / 2
      : Math.min(y - hoverDistance, props.y - 48);
    const minY = top + visibleTopExtent + viewportGutter;
    const maxY = top + height - visibleBottomExtent - viewportGutter;
    const py = minY <= maxY
      ? Math.max(minY, Math.min(maxY, targetY))
      : top + height / 2;
    element.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -100%) rotate(${tilt}deg) scale(${scale})`;
    element.style.visibility = "visible";
    frame = requestAnimationFrame(draw);
  };
  draw(performance.now());
});

onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<style scoped>
.drag-value {
  position: fixed;
  inset: 0 auto auto 0;
  z-index: 1000;
  visibility: hidden;
  pointer-events: none;
  user-select: none;
  max-inline-size: calc(100vw - 32px);
  transform-origin: 50% 100%;
  will-change: transform;
}

.drag-value__paper {
  max-inline-size: 100%;
  box-sizing: border-box;
  font-variant-numeric: tabular-nums;
  white-space: normal;
  overflow-wrap: anywhere;
  text-align: center;
}

.drag-value__paper.sticker--fill {
  font-size: 20px;
  text-transform: none;
}
</style>
