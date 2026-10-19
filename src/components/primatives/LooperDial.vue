<template>
  <button
    type="button"
    class="looper-dial touch-floor"
    :class="`looper-dial--${state}`"
    :data-state="state"
    :aria-label="name"
    :title="name"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="lift"
    @pointercancel="cancel"
    @keydown.delete.prevent="emit('remove')"
    @keydown.backspace.prevent="emit('remove')"
    @keydown.up.prevent="emit('shift', 1)"
    @keydown.down.prevent="emit('shift', -1)"
    @contextmenu.prevent
    @click="tap"
  >
    <LoopDial
      :segments="segments"
      :length-ms="lengthMs"
      :bar-ms="barMs"
      :origin-bars="originBars"
      :rate="rate"
      live
      spin="disc"
      :aria-label="label"
    />
  </button>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from "vue";
import LoopDial, { type LoopDialSegment } from "./LoopDial.vue";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

/*
 * The Looper Dial: one playing pattern in the Looper, as its own control (the
 * #132 prototype, carried by #142). The pattern's Loop Dial is the control
 * itself, not a keycap: its disc turns under a fixed brass hand, so the note at
 * twelve is the one sounding. Tap mutes, double-tap solos, hold removes, and a
 * vertical drag (the Knob's feel) turns the pattern within the loop a beat at
 * a time; from the keyboard, Enter or Space mutes, Delete removes, and Up or
 * Down turns it a beat. Props in, gestures out: the Looper decides what each
 * gesture does.
 */
export type LooperDialState = "playing" | "muted" | "solo";

const props = withDefaults(defineProps<{
  segments: LoopDialSegment[];
  lengthMs?: number;
  barMs?: number;
  /** Where the pattern's time 0 sits on the bar clock. */
  originBars?: number;
  rate?: number;
  /** The pattern's name. */
  label: string;
  /** Sounding, muted (or silenced by another's solo), or soloed. */
  state?: LooperDialState;
  haptic?: boolean;
}>(), {
  lengthMs: undefined,
  barMs: undefined,
  originBars: 0,
  rate: 1,
  state: "playing",
  haptic: false,
});

const emit = defineEmits<{
  /** Every tap, including each of a double-tap's two. */
  mute: [];
  /** The second tap of a double-tap (after its own mute). */
  solo: [];
  /** A hold, or Delete. */
  remove: [];
  /** A vertical drag (or Up/Down): turn the pattern this many beats later (+) or earlier (-). */
  shift: [beats: number];
}>();

const DOUBLE_TAP_MS = 320;
const HOLD_MS = 550;
// The Knob's options feel: past its 5px tap threshold a mostly vertical
// movement is a drag, and every 15px of it is one step (here one beat).
const TAP_THRESHOLD_PX = 5;
const STEP_PX = 15;
const MIN_STEP_INTERVAL_MS = 100;

const name = computed(() => {
  const state = props.state === "solo" ? "solo" : props.state === "muted" ? "muted" : "playing";
  return `${props.label}, ${state}. Tap to mute, double-tap to solo, hold to remove, drag up or down to move it in the loop`;
});

let holdTimer: ReturnType<typeof setTimeout> | undefined;
let held = false;
let lastTap = -Infinity;
let gesture: { pointerId: number; x: number; y: number; lastY: number; dragging: boolean; accumulated: number; lastStep: number } | null = null;
/** The click that ends a drag is not a tap. */
let dragged = false;

function down(event: PointerEvent) {
  held = false;
  dragged = false;
  gesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, lastY: event.clientY,
    dragging: false, accumulated: 0, lastStep: -Infinity };
  try {
    (event.currentTarget as Element | null)?.setPointerCapture?.(event.pointerId);
  } catch {
    // A synthetic or already released pointer cannot be captured; moves still arrive here.
  }
  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    held = true;
    if (props.haptic) triggerUIHaptic();
    emit("remove");
  }, HOLD_MS);
}

function move(event: PointerEvent) {
  if (!gesture || event.pointerId !== gesture.pointerId || held) return;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  if (!gesture.dragging) {
    if (Math.hypot(dx, dy) <= TAP_THRESHOLD_PX || Math.abs(dy) <= Math.abs(dx) * 1.05) return;
    // A drag: no tap, double-tap or hold comes of this press.
    gesture.dragging = true;
    dragged = true;
    clearTimeout(holdTimer);
  }
  event.preventDefault();
  // Up turns the pattern later, as up turns a Knob up.
  gesture.accumulated += gesture.lastY - event.clientY;
  gesture.lastY = event.clientY;
  const steps = Math.trunc(gesture.accumulated / STEP_PX);
  const now = performance.now();
  if (!steps || now - gesture.lastStep < MIN_STEP_INTERVAL_MS) return;
  gesture.accumulated -= steps * STEP_PX;
  gesture.lastStep = now;
  if (props.haptic) triggerUIHaptic();
  emit("shift", steps);
}

function lift() {
  clearTimeout(holdTimer);
  gesture = null;
}

function cancel() {
  clearTimeout(holdTimer);
  gesture = null;
}

function tap() {
  clearTimeout(holdTimer);
  // The click that ends a hold or a drag is not a tap.
  if (held || dragged) {
    held = false;
    dragged = false;
    return;
  }
  if (props.haptic) triggerUIHaptic();
  const now = performance.now();
  const double = now - lastTap < DOUBLE_TAP_MS;
  lastTap = double ? -Infinity : now;
  // The first tap mutes at once; the second undoes that and solos instead.
  emit("mute");
  if (double) emit("solo");
}

onBeforeUnmount(() => clearTimeout(holdTimer));
</script>

<style scoped>
/* No keycap: the dial is the control, on the Stage's Ink. */
.looper-dial {
  display: grid;
  place-items: center;
  inline-size: var(--hit-min);
  block-size: var(--hit-min);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ivory);
  cursor: ns-resize;
  /* The dial owns vertical movement, as a Knob does. */
  touch-action: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

.looper-dial:focus-visible {
  outline: 2px solid var(--ivory);
  outline-offset: 1px;
}

/* Muted, or silenced by another's solo: the record goes dark, its place stays. */
.looper-dial--muted > .loop-dial {
  opacity: .3;
}

/* Soloed: an Ivory ring, the chosen state. */
.looper-dial--solo {
  box-shadow: 0 0 0 1.5px var(--ivory);
}

@media (forced-colors: active) {
  .looper-dial--solo {
    box-shadow: none;
    outline: 2px solid Highlight;
  }
}
</style>
