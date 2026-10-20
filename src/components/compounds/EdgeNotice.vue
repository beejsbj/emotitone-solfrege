<template>
  <div
    class="edge-notice"
    :class="[
      `edge-notice--${signal}`,
      { 'edge-notice--busy': busy, 'edge-notice--sweeping': slideX > 0 },
    ]"
    :style="slideX > 0 ? { transform: `translateX(${slideX}px)` } : undefined"
    role="group"
    :aria-label="label"
    :aria-description="busy ? undefined : 'Swipe right or press Escape to dismiss'"
    :aria-hidden="busy ? 'true' : undefined"
    :inert="busy || undefined"
    :tabindex="busy ? undefined : 0"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="lift"
    @pointercancel="cancel"
    @lostpointercapture="cancel"
    @keydown.escape.prevent="dismiss"
    @keydown.delete.prevent="dismiss"
  >
    <span class="edge-notice__lamp" aria-hidden="true" />
    <!-- One line on screen; the whole line in the title, the rest for assistive technology. -->
    <p class="edge-notice__line" :role="role" :title="line">
      {{ line }}<span v-if="hint" class="edge-notice__sr">{{ hint }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { trackFlick, type FlickTracker } from "@/components/primatives/flick";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

/*
 * The Edge Notice: what the instrument tells you, as one right-aligned line of
 * Ivory type on the Stage, with a small Brass lamp before it. No box, border,
 * panel or close key. A swipe off the right edge dismisses it: the mirror of
 * the Looper Dial's flick off the left edge (the left edge is what you play,
 * the right edge is what the instrument tells you). From the keyboard, Escape
 * or Delete dismisses it. Props in, a dismiss out: it reads no store.
 *
 * Two signals, told by the lamp and never by colour: a warning (an unlit
 * Brass lamp) and a problem (lit, with its glow).
 */
export type EdgeNoticeSignal = "warning" | "problem";

const props = withDefaults(defineProps<{
  /** The one line on screen; keep it to 32 characters so it fits at 390px. */
  line: string;
  /** Read after the line by assistive technology only: what the line can't fit. */
  hint?: string;
  /** The notice's name for assistive technology, e.g. "Shelf full". */
  label: string;
  signal?: EdgeNoticeSignal;
  /** `alert` interrupts; `status` waits its turn. */
  role?: "alert" | "status";
  /** Something below is being moved: step aside, untouchable, until it settles. */
  busy?: boolean;
  haptic?: boolean;
}>(), {
  hint: undefined,
  signal: "problem",
  role: "status",
  busy: false,
  haptic: false,
});

const emit = defineEmits<{
  /** Swept off the right edge, or Escape or Delete. */
  dismiss: [];
}>();

// The Knob's 5px tap threshold: past it the press is a sweep, or nothing.
const TAP_THRESHOLD_PX = 5;

let gesture: {
  pointerId: number; x: number; y: number;
  /** Past the tap threshold: sideways (a sweep, perhaps) or vertical (nothing). */
  moved: "vertical" | "sideways" | null;
  flick: FlickTracker;
  /** Already swept off: the lift that follows emits nothing more. */
  flung: boolean;
} | null = null;
/** The line follows a rightward slide, as a card about to be swept off. */
const slideX = ref(0);

function down(event: PointerEvent) {
  if (props.busy) return;
  const start = { x: event.clientX, y: event.clientY, t: performance.now() };
  gesture = { pointerId: event.pointerId, x: start.x, y: start.y, moved: null, flung: false,
    flick: trackFlick("right", start, { minRoomPx: TAP_THRESHOLD_PX + 1 }) };
  try {
    (event.currentTarget as Element | null)?.setPointerCapture?.(event.pointerId);
  } catch {
    // A synthetic or already released pointer cannot be captured; moves still arrive here.
  }
}

function move(event: PointerEvent) {
  if (!gesture || event.pointerId !== gesture.pointerId || gesture.flung) return;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  if (!gesture.moved) {
    if (Math.hypot(dx, dy) <= TAP_THRESHOLD_PX) return;
    gesture.moved = Math.abs(dy) > Math.abs(dx) * 1.05 ? "vertical" : "sideways";
  }
  if (gesture.moved !== "sideways") return;
  event.preventDefault();
  gesture.flick.sample(event.clientX, performance.now());
  // Swept off as soon as it is: a finger that reaches the glass's edge may never lift there.
  if (gesture.flick.isFlick(event.clientX, event.clientY, performance.now())) return fling();
  slideX.value = Math.max(0, dx);
}

function fling() {
  gesture!.flung = true;
  slideX.value = 0;
  dismiss();
}

function dismiss() {
  if (props.haptic) triggerUIHaptic();
  emit("dismiss");
}

function lift(event: PointerEvent) {
  if (gesture && event.pointerId === gesture.pointerId && !gesture.flung && gesture.moved === "sideways"
    && gesture.flick.isFlick(event.clientX, event.clientY, performance.now())) fling();
  cancel();
}

function cancel() {
  slideX.value = 0;
  gesture = null;
}

onBeforeUnmount(cancel);
</script>

<style scoped>
/* Type on the Stage, not a panel: no box, border or background. An Ink halo
   keeps Ivory legible over a bright Stage; the lamp is the only Brass. */
.edge-notice {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--s-4);
  box-sizing: border-box;
  inline-size: fit-content;
  max-inline-size: 100%;
  /* A sweep's full touch, however thin the line. */
  min-block-size: var(--hit-min);
  margin-inline-start: auto;
  color: var(--ivory);
  cursor: grab;
  /* The notice owns its movement: a sweep to the right. */
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  transition: opacity var(--dur-ui) var(--ease-brush), visibility 0s;
}

.edge-notice:focus-visible {
  outline: 2px solid var(--ivory);
  outline-offset: 2px;
}

.edge-notice--busy {
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--dur-tap) var(--ease-brush), visibility 0s linear var(--dur-tap);
}

/* Following a rightward slide: it fades as it nears a sweep. */
.edge-notice--sweeping {
  opacity: .6;
  transition: none;
}

/* A warning: an unlit Brass lamp. A problem: lit, with its glow. */
.edge-notice__lamp {
  flex: 0 0 auto;
  inline-size: 6px;
  block-size: 6px;
  border-radius: 50%;
  background: var(--brass-lo);
}

.edge-notice--problem .edge-notice__lamp {
  background: var(--brass-hi);
  box-shadow: var(--shadow-glow-brass);
}

.edge-notice__line {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font: var(--t-mono);
  color: var(--ivory);
  text-align: end;
  text-overflow: ellipsis;
  text-shadow: 0 0 6px var(--ink), 0 1px 2px var(--ink);
  white-space: nowrap;
}

.edge-notice__sr {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@keyframes edge-notice-in {
  from { opacity: 0; translate: var(--s-5) 0; }
  to { opacity: 1; translate: 0 0; }
}

@media (prefers-reduced-motion: no-preference) {
  .edge-notice:not(.edge-notice--busy) {
    animation: edge-notice-in var(--dur-ui) var(--ease-brush);
  }
}

@media (prefers-reduced-motion: reduce) {
  .edge-notice,
  .edge-notice--busy {
    animation: none;
    transition: none;
  }
}

@media (forced-colors: active) {
  .edge-notice__line {
    color: CanvasText;
    text-shadow: none;
  }

  .edge-notice__lamp {
    background: CanvasText;
    box-shadow: none;
  }
}
</style>
