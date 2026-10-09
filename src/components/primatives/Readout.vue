<template>
  <Teleport to="body">
    <div ref="follower" class="readout knob-readout" aria-hidden="true">
      <span
        class="readout__window"
        :class="[
          `readout__window--${tone}`,
          bounceCycle ? 'readout__window--bounce-a' : 'readout__window--bounce-b',
        ]"
      >
        <span class="readout__ghost">{{ ghost }}</span>
        <span :key="refresh" class="readout__lit">{{ value }}</span>
      </span>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

/**
 * The Readout: a small segment display that floats above the finger while a
 * Knob or Joystick is dragged. Lit characters sit over faint unlit "8"
 * segments; each change refreshes the display and rebounds the window.
 * Ivory for everyday controls, a Brass bezel for masters and Joystick drags,
 * an Ivory bezel for a committed (latched) Joystick direction.
 */
export type ReadoutTone = "brass" | "ivory" | "latched";

const props = defineProps<{
  x: number;
  y: number;
  value: string;
  tone: ReadoutTone;
}>();
const follower = ref<HTMLElement>();
const bounceCycle = ref(false);
const refresh = ref(0);
// Unlit segments sit only under letters and digits; punctuation keeps its own gap.
const ghost = computed(() => [...props.value].map((char) => (/[\p{L}\p{N}]/u.test(char) ? "8" : " ")).join(""));
let frame = 0;
let previousTime = 0;
let x = props.x;
let y = props.y;
let tilt = 0;
let velocityX = 0;
let velocityY = 0;
let tiltVelocity = 0;
const hoverDistance = 56;

watch(() => props.value, () => {
  bounceCycle.value = !bounceCycle.value;
  refresh.value += 1;
});

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
    // the visual viewport. Scale the complete window rather than clipping it.
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
.readout {
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

.readout__window {
  --lit: var(--ivory);
  --glow: color-mix(in srgb, var(--ivory) 55%, transparent);
  --bezel: var(--ink-4);

  display: inline-grid;
  max-inline-size: 100%;
  box-sizing: border-box;
  padding: 7px 10px 6px;
  background: var(--ink);
  border-radius: var(--r-xs);
  box-shadow: 0 0 0 3px var(--bezel), inset 0 2px 5px rgb(0 0 0 / 80%);
  font: 700 20px/1 var(--font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: .08em;
  text-align: center;
  text-transform: uppercase;
  overflow-wrap: anywhere;
  white-space: normal;
  transform-origin: 50% 100%;
}

.readout__window--brass {
  --lit: var(--brass-hi);
  --glow: color-mix(in srgb, var(--brass) 70%, transparent);
  --bezel: var(--brass);
}

.readout__window--latched { --bezel: var(--ivory); }

.readout__ghost,
.readout__lit { grid-area: 1 / 1; }

.readout__ghost { color: color-mix(in srgb, var(--lit) 9%, transparent); }

.readout__lit {
  color: var(--lit);
  text-shadow: 0 0 8px var(--glow);
}

@keyframes readout-arrive-a {
  from { scale: .9; }
  to { scale: 1; }
}

/* A second name lets consecutive value updates restart the same recipe. */
@keyframes readout-arrive-b {
  from { scale: .9; }
  to { scale: 1; }
}

@keyframes readout-refresh {
  from { opacity: .35; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: no-preference) {
  .readout__window--bounce-a { animation: readout-arrive-a var(--dur-bounce) var(--ease-bounce); }
  .readout__window--bounce-b { animation: readout-arrive-b var(--dur-bounce) var(--ease-bounce); }
  .readout__lit { animation: readout-refresh 140ms steps(2) both; }
}

@media (prefers-reduced-motion: reduce) {
  .readout__window,
  .readout__lit { animation: none; }
}

@media (forced-colors: active) {
  .readout__window { background: Canvas; box-shadow: none; border: 2px solid CanvasText; }
  .readout__lit { color: CanvasText; text-shadow: none; }
  .readout__ghost { display: none; }
}
</style>
