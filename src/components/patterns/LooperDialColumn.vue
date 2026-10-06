<script setup lang="ts">
/**
 * The Looper's controls, ported as accepted from the PR #132 prototype: one
 * mini Loop Dial per playing pattern climbing the left edge, its disc turning
 * under a fixed brass hand, with Stop All on top. Tap mutes, double-tap solos,
 * hold removes. The mic moves to the Drawer's lip on the right, since the left
 * edge belongs to the dials. A design-system unit later; small and faithful now.
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Square } from "lucide-vue-next";
import Button from "@/components/primatives/Button.vue";
import LoopDial from "@/components/primatives/LoopDial.vue";
import { looperDialProps } from "@/components/patterns/looperDial";
import { useMusicColor } from "@/composables/useMusicColor";
import { useLooperStore } from "@/stores/looper";

const looper = useLooperStore();
const { getStaticPrimaryColorByPitchClass, getStaticPrimaryColorByScaleIndex } = useMusicColor();

const dials = computed(() => looper.memberViews.map((view) => ({
  view,
  dial: looperDialProps(view, {
    byPitchClass: getStaticPrimaryColorByPitchClass,
    byScaleIndex: getStaticPrimaryColorByScaleIndex,
  }),
})));

// The mic key rides the Drawer's lip; publish where that is.
const lipRef = ref<HTMLElement>();
let lipTop = -1;
let frame = 0;
function trackLip() {
  frame = requestAnimationFrame(trackLip);
  const top = Math.round(lipRef.value?.getBoundingClientRect().top ?? -1);
  if (top === lipTop || top < 0) return;
  lipTop = top;
  document.documentElement.style.setProperty("--looper-lip-top", `${top}px`);
}
onMounted(() => {
  document.documentElement.dataset.looperMic = "lip";
  trackLip();
});
onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  clearTimeout(holdTimer);
  delete document.documentElement.dataset.looperMic;
  document.documentElement.style.removeProperty("--looper-lip-top");
});

// A dial: tap mutes, double-tap solos, hold removes. The first tap mutes at
// once; a second tap undoes that and solos instead.
const DOUBLE_TAP_MS = 320;
const HOLD_MS = 550;
let lastTap = { id: "", at: 0 };
let holdTimer: ReturnType<typeof setTimeout> | undefined;
let held = false;
function dialDown(id: string) {
  held = false;
  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    held = true;
    looper.removeMember(id);
  }, HOLD_MS);
}
function dialCancel() {
  clearTimeout(holdTimer);
  held = true;
}
function dialUp(id: string) {
  clearTimeout(holdTimer);
  if (held) return;
  const now = performance.now();
  const double = lastTap.id === id && now - lastTap.at < DOUBLE_TAP_MS;
  lastTap = double ? { id: "", at: 0 } : { id, at: now };
  looper.toggleMute(id);
  if (double) looper.toggleSolo(id);
}
</script>

<template>
  <!-- Always present: its top edge is the Drawer's lip, which the mic rides. -->
  <div ref="lipRef" class="looper-dials">
    <div v-if="looper.hasMembers" class="looper-dials__column" data-testid="looper-dials">
      <button
        v-for="{ view, dial } in dials"
        :key="view.phraseId"
        type="button"
        class="looper-dials__dial"
        :class="{
          'looper-dials__dial--silent': !view.audible,
          'looper-dials__dial--solo': view.soloed,
        }"
        :data-phrase-id="view.phraseId"
        :aria-pressed="view.audible"
        :aria-label="`${view.label}: tap to mute, double-tap to solo, hold to remove`"
        @pointerdown="dialDown(view.phraseId)"
        @pointerup="dialUp(view.phraseId)"
        @pointerleave="dialCancel"
        @contextmenu.prevent
      >
        <LoopDial
          :segments="dial.segments"
          :length-ms="dial.lengthMs"
          :bar-ms="dial.barMs"
          :origin-bars="dial.originBars"
          :rate="dial.rate"
          live
          spin="disc"
          :aria-label="view.label"
        />
      </button>
      <!-- Last in a reversed column: Stop All sits on top of the dials. -->
      <Button
        class="looper-dials__stop"
        size="sm"
        tone="ink"
        haptic
        accessible-name="Stop all loops"
        title="Stop all loops"
        @click="looper.stopAll()"
      >
        <Square />
      </Button>
    </div>
  </div>
</template>

<style scoped>
/* Zero-height anchor: the dials float over the Stage and take no Drawer height. */
.looper-dials {
  position: relative;
  height: 0;
  z-index: 3;
}

.looper-dials__column {
  position: absolute;
  left: 6px;
  bottom: 30px;
  display: flex;
  flex-direction: column-reverse;
  gap: 2px;
  pointer-events: auto;
  touch-action: manipulation;
  user-select: none;
}

.looper-dials__dial {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  -webkit-touch-callout: none;
}

/* The fixed hand is brass, with a sheen. */
.looper-dials__dial :deep(.loop-dial__masthead) {
  stroke: var(--brass-hi);
  stroke-width: 2;
  filter: drop-shadow(0 0 1.5px var(--brass)) drop-shadow(0 0 4px var(--brass));
}

.looper-dials__stop {
  align-self: center;
  margin-bottom: 4px;
}

.looper-dials__dial--solo {
  box-shadow: 0 0 0 1.5px var(--ivory);
}

.looper-dials__dial--silent {
  opacity: 0.3;
}
</style>

<style>
/* The mic key leaves the top centre and sits on the Drawer's lip, right;
   the left edge belongs to the loop dials. */
html[data-looper-mic="lip"] .humming-capture-transport {
  inset: auto;
  transform: none;
  top: calc(var(--looper-lip-top, 60vh) - 74px);
  right: 14px;
}

html[data-looper-mic="lip"] .humming-capture-transport__cancel-slot {
  left: auto;
  right: calc(100% + 12px);
}

html[data-looper-mic="lip"] .humming-capture-transport__feedback {
  top: auto;
  bottom: calc(100% + 12px);
  left: auto;
  right: 0;
  transform: none;
  justify-items: end;
}
</style>
