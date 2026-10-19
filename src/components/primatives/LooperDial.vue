<template>
  <button
    type="button"
    class="looper-dial touch-floor"
    :class="[`looper-dial--${state}`, { 'looper-dial--flicking': slideX < 0 }]"
    :style="slideX < 0 ? { transform: `translateX(${slideX}px)` } : undefined"
    :data-state="state"
    :aria-label="name"
    :title="name"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="lift"
    @pointercancel="cancel"
    @lostpointercapture="cancel"
    @keydown.delete.prevent="emit('remove')"
    @keydown.backspace.prevent="emit('remove')"
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
import { computed, onBeforeUnmount, ref } from "vue";
import LoopDial, { type LoopDialSegment } from "./LoopDial.vue";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

/*
 * The Looper Dial: one playing pattern in the Looper, as its own control (the
 * #132 prototype, carried by #142). The pattern's Loop Dial is the control
 * itself, not a keycap: its disc turns under a fixed brass hand, so the note at
 * twelve is the one sounding.
 *
 * The gesture map (Burooj, 2026-10-19): a tap mutes or unmutes at once, so it
 * can be played in rhythm; a double-tap brings the pattern to the desk (its
 * second tap undoes the first tap's mute); a hold solos it for as long as it is
 * held; a fast flick off the left edge removes it. From the keyboard, Enter or
 * Space mutes and Delete removes. Vertical movement is reserved for the loop's
 * volume (a follow-up), so it does nothing yet. Props in, gestures out: the
 * Looper decides what each gesture does.
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
  /** The second tap of a double-tap (after its own mute, which undoes the first). */
  desk: [];
  /** A hold reached the threshold (true), and its release or cancel (false). */
  solo: [held: boolean];
  /** A flick off the left edge, or Delete. */
  remove: [];
}>();

const DOUBLE_TAP_MS = 320;
const HOLD_MS = 550;
// The Knob's 5px tap threshold: past it the press is no longer a tap or a hold.
const TAP_THRESHOLD_PX = 5;
// A flick: leftward, mostly sideways, fast at the end, and far enough. The
// dials sit at the left edge, so "far enough" is measured against the room
// the finger has: 48px, or all the way to the glass's edge (within 4px of
// x 0), whichever comes first. A press near the edge has little room, so the
// speed and the sideways split are what keep a tap or a slow drag out.
const FLICK_PX = 48;
const EDGE_PX = 4;
const FLICK_SPEED_PX_PER_MS = 0.5;
const FLICK_WINDOW_MS = 100;

const name = computed(() => {
  const state = props.state === "solo" ? "solo" : props.state === "muted" ? "muted" : "playing";
  return `${props.label}, ${state}. Tap to mute, double-tap to bring it to the desk, hold to solo, flick left to remove`;
});

let holdTimer: ReturnType<typeof setTimeout> | undefined;
/** The press reached the hold threshold: its click is not a tap. */
let held = false;
/** Soloed by this hold, until it lifts or is cancelled. */
let soloing = false;
let lastTap = -Infinity;
let gesture: {
  pointerId: number; x: number; y: number;
  /** Past the tap threshold: vertical (reserved for volume) or sideways (a flick, perhaps). */
  moved: "vertical" | "sideways" | null;
  /** Recent sideways positions, for the flick's speed at the end. */
  samples: { t: number; x: number }[];
  /** Already thrown off: the lift that follows emits nothing more. */
  flung: boolean;
} | null = null;
/** The click that ends a moved press is not a tap. */
let dragged = false;
/** The dial follows a leftward slide, as a card about to be thrown off. */
const slideX = ref(0);

function down(event: PointerEvent) {
  held = false;
  dragged = false;
  gesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: null,
    samples: [{ t: performance.now(), x: event.clientX }], flung: false };
  try {
    (event.currentTarget as Element | null)?.setPointerCapture?.(event.pointerId);
  } catch {
    // A synthetic or already released pointer cannot be captured; moves still arrive here.
  }
  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    held = true;
    soloing = true;
    if (props.haptic) triggerUIHaptic();
    emit("solo", true);
  }, HOLD_MS);
}

function move(event: PointerEvent) {
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  if (!gesture.moved) {
    if (Math.hypot(dx, dy) <= TAP_THRESHOLD_PX) return;
    // Moved: no tap or double-tap comes of this press, and no hold starts.
    clearTimeout(holdTimer);
    dragged = true;
    gesture.moved = Math.abs(dy) > Math.abs(dx) * 1.05 ? "vertical" : "sideways";
  }
  // Vertical movement is kept for the loop's volume (a follow-up): nothing yet.
  if (gesture.moved !== "sideways" || soloing || gesture.flung) return;
  event.preventDefault();
  const now = performance.now();
  gesture.samples.push({ t: now, x: event.clientX });
  while (gesture.samples.length > 2 && now - gesture.samples[1].t > FLICK_WINDOW_MS) gesture.samples.shift();
  // Thrown off as soon as it is: a finger that reaches the glass's edge may never lift there.
  if (isFlick(event)) return fling();
  slideX.value = Math.min(0, dx);
}

/**
 * A fast, mostly sideways throw to the left, as far as the room allows (48px,
 * or to the screen's edge): never a vertical swipe, a slow drag or a tap.
 */
function isFlick(event: PointerEvent): boolean {
  if (!gesture || gesture.moved !== "sideways" || soloing || gesture.flung) return false;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  const room = Math.max(TAP_THRESHOLD_PX + 1, gesture.x - EDGE_PX);
  if (dx > -Math.min(FLICK_PX, room) || Math.abs(dx) < Math.abs(dy) * 1.5) return false;
  const now = performance.now();
  const from = gesture.samples.find((sample) => now - sample.t <= FLICK_WINDOW_MS) ?? gesture.samples[gesture.samples.length - 1];
  const elapsed = Math.max(1, now - from.t);
  return (from.x - event.clientX) / elapsed >= FLICK_SPEED_PX_PER_MS;
}

function fling() {
  gesture!.flung = true;
  slideX.value = 0;
  if (props.haptic) triggerUIHaptic();
  emit("remove");
}

function endSolo() {
  if (!soloing) return;
  soloing = false;
  emit("solo", false);
}

function lift(event: PointerEvent) {
  clearTimeout(holdTimer);
  if (gesture && event.pointerId === gesture.pointerId && isFlick(event)) fling();
  slideX.value = 0;
  endSolo();
  gesture = null;
}

function cancel() {
  clearTimeout(holdTimer);
  slideX.value = 0;
  endSolo();
  gesture = null;
}

function tap() {
  clearTimeout(holdTimer);
  // The click that ends a hold or a moved press is not a tap.
  if (held || dragged) {
    held = false;
    dragged = false;
    return;
  }
  if (props.haptic) triggerUIHaptic();
  const now = performance.now();
  const double = now - lastTap < DOUBLE_TAP_MS;
  lastTap = double ? -Infinity : now;
  // The first tap mutes at once; the second undoes that and brings the pattern to the desk.
  emit("mute");
  if (double) emit("desk");
}

onBeforeUnmount(() => {
  clearTimeout(holdTimer);
  endSolo();
});
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
  cursor: pointer;
  /* The dial owns its movement: a flick sideways, and (to come) volume vertically. */
  touch-action: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

.looper-dial:focus-visible {
  outline: 2px solid var(--ivory);
  outline-offset: 1px;
}

/* Following a leftward slide: it fades as it nears a throw. */
.looper-dial--flicking {
  opacity: .6;
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
