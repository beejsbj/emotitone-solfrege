<template>
  <button
    type="button"
    class="looper-dial touch-floor"
    :class="`looper-dial--${state}`"
    :data-state="state"
    :aria-label="name"
    :title="name"
    @pointerdown="down"
    @pointerup="lift"
    @pointercancel="cancel"
    @pointerleave="cancel"
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
import { computed, onBeforeUnmount } from "vue";
import LoopDial, { type LoopDialSegment } from "./LoopDial.vue";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

/*
 * The Looper Dial: one playing pattern in the Looper, as its own control (the
 * #132 prototype, carried by #142). The pattern's Loop Dial is the control
 * itself, not a keycap: its disc turns under a fixed brass hand, so the note at
 * twelve is the one sounding. Tap mutes, double-tap solos, hold removes; from
 * the keyboard, Enter or Space mutes and Delete removes. Props in, gestures
 * out: the Looper decides what a gesture does.
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
}>();

const DOUBLE_TAP_MS = 320;
const HOLD_MS = 550;

const name = computed(() => {
  const state = props.state === "solo" ? "solo" : props.state === "muted" ? "muted" : "playing";
  return `${props.label}, ${state}. Tap to mute, double-tap to solo, hold to remove`;
});

let holdTimer: ReturnType<typeof setTimeout> | undefined;
let held = false;
let lastTap = -Infinity;

function down() {
  held = false;
  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    held = true;
    if (props.haptic) triggerUIHaptic();
    emit("remove");
  }, HOLD_MS);
}

function lift() {
  clearTimeout(holdTimer);
}

function cancel() {
  clearTimeout(holdTimer);
}

function tap() {
  clearTimeout(holdTimer);
  // The click that ends a hold is not a tap.
  if (held) {
    held = false;
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
  cursor: pointer;
  touch-action: manipulation;
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
