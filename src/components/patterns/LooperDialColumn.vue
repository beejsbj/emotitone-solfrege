<script setup lang="ts">
/**
 * The Looper's column (from #142, after the #132 prototype): one Looper Dial
 * per playing pattern climbing the left edge, each disc turning under a fixed
 * brass hand, with Stop All on top. While it holds dials the mic leaves the
 * top centre and rides the Drawer's lip on the right, since the left edge
 * belongs to the dials.
 */
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Square, X } from "lucide-vue-next";
import Button from "@/components/primatives/Button.vue";
import LooperDial, { type LooperDialState } from "@/components/primatives/LooperDial.vue";
import { looperDialProps } from "@/components/patterns/looperDial";
import { useMusicColor } from "@/composables/useMusicColor";
import { useLooperStore } from "@/stores/looper";
import type { LooperMemberView } from "@/stores/looper";

const looper = useLooperStore();
const { getStaticPrimaryColorByPitchClass, getStaticPrimaryColorByScaleIndex } = useMusicColor();

const dials = computed(() => looper.memberViews.map((view) => ({
  view,
  dial: looperDialProps(view, {
    byPitchClass: getStaticPrimaryColorByPitchClass,
    byScaleIndex: getStaticPrimaryColorByScaleIndex,
  }),
})));

function stateOf(view: LooperMemberView): LooperDialState {
  if (view.soloed) return "solo";
  if (!view.audible) return "muted";
  return "playing";
}

// ─── The mic on the Drawer's lip ─────────────────────────────────────────────
// The anchor's top edge is the Drawer's lip; publish where it is each frame,
// for as long as dials hold the left edge.
const lipRef = ref<HTMLElement>();
let lipTop = -1;
let frame: number | null = null;

function trackLip() {
  frame = requestAnimationFrame(trackLip);
  const top = Math.round(lipRef.value?.getBoundingClientRect().top ?? -1);
  if (top === lipTop || top < 0) return;
  lipTop = top;
  document.documentElement.style.setProperty("--looper-lip-top", `${top}px`);
}

function micOnLip(on: boolean) {
  const root = document.documentElement;
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  lipTop = -1;
  if (on) {
    root.dataset.looperMic = "lip";
    trackLip();
  } else {
    delete root.dataset.looperMic;
    root.style.removeProperty("--looper-lip-top");
  }
}

watch(() => looper.hasMembers, micOnLip, { immediate: true, flush: "post" });
onBeforeUnmount(() => micOnLip(false));
</script>

<template>
  <!-- A zero-height anchor: the dials float over the Stage and take no Drawer height. -->
  <div ref="lipRef" class="looper-dials">
    <!-- A Play that could not sound says why, instead of doing nothing. -->
    <div
      v-if="looper.lastError"
      class="looper-dials__notice"
      :class="{ 'looper-dials__notice--over-mic': looper.hasMembers }"
      data-testid="looper-error"
    >
      <span class="looper-dials__notice-lamp" aria-hidden="true" />
      <!-- One line on screen; the whole message for assistive technology and the title. -->
      <p class="looper-dials__notice-line" role="alert" :title="looper.lastError">{{ looper.lastError }}</p>
      <Button
        class="looper-dials__notice-dismiss"
        size="xs"
        tone="ink"
        haptic
        accessible-name="Dismiss"
        title="Dismiss"
        @click="looper.clearError()"
      >
        <X />
      </Button>
    </div>
    <div
      v-if="looper.hasMembers"
      class="looper-dials__column"
      role="group"
      aria-label="Playing patterns"
      data-testid="looper-dials"
    >
      <LooperDial
        v-for="{ view, dial } in dials"
        :key="view.phraseId"
        :data-phrase-id="view.phraseId"
        :segments="dial.segments"
        :length-ms="dial.lengthMs"
        :bar-ms="dial.barMs"
        :origin-bars="dial.originBars"
        :rate="dial.rate"
        :label="view.label"
        :state="stateOf(view)"
        haptic
        @mute="looper.toggleMute(view.phraseId)"
        @desk="looper.bringToDesk(view.phraseId)"
        @solo="(held: boolean) => held ? looper.holdSolo(view.phraseId) : looper.releaseSolo(view.phraseId)"
        @remove="looper.removeMember(view.phraseId)"
      />
      <!-- Last in a reversed column: Stop All sits on top of the dials. -->
      <Button
        class="looper-dials__stop"
        size="sm"
        tone="ink"
        haptic
        data-testid="looper-stop-all"
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
.looper-dials {
  position: relative;
  height: 0;
  z-index: 3;
}

.looper-dials__column {
  position: absolute;
  left: var(--s-3);
  /* Clear of the reel's deeper strips, which rise above the desk strip. */
  bottom: var(--s-10);
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: var(--s-1);
}

.looper-dials__stop {
  margin-bottom: var(--s-2);
}

/* The shelf notice's grammar (#192, ShelfNotice): one thin Ink strip with
   Ivory type, a small Brass lamp and an inline xs dismiss key, no border, the
   same --s-3 margin above, below and beside the key. Its 44px touch floor
   overhangs the strip onto bare Stage, as the shelf's does. */
.looper-dials__notice {
  position: absolute;
  /* Beside the dial column, never over it. */
  left: calc(var(--s-3) + var(--hit-min) + var(--s-4));
  right: var(--s-4);
  bottom: var(--s-10);
  display: flex;
  align-items: center;
  gap: var(--s-5);
  box-sizing: border-box;
  padding-block: var(--s-3);
  padding-inline: var(--s-6) var(--s-3);
  background: var(--ink-3);
  color: var(--ivory);
  border-radius: var(--r-xs);
}

/* Lit Brass: the Looper could not do what was asked. */
/* While the mic rides the Drawer's lip (its 44px touch floor 20px above the
   lip), the strip sits clear above it, so the mic never covers Dismiss. */
.looper-dials__notice--over-mic {
  bottom: calc(var(--hit-min) + var(--s-7) + var(--s-2));
}

.looper-dials__notice-lamp {
  flex: 0 0 auto;
  inline-size: 6px;
  block-size: 6px;
  border-radius: 50%;
  background: var(--brass-hi);
  box-shadow: var(--shadow-glow-brass);
}

.looper-dials__notice-line {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font: var(--t-mono);
  color: var(--ivory);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Room under the key for its lit lip, which hangs --s-2 below the switch,
   so cap and lip together sit centred on the line with even margins. */
.looper-dials__notice-dismiss {
  flex: 0 0 auto;
  margin-block-end: var(--s-2);
}

@media (forced-colors: active) {
  .looper-dials__notice {
    background: Canvas;
    color: CanvasText;
    outline: 1px solid CanvasText;
  }

  .looper-dials__notice-lamp {
    background: CanvasText;
    box-shadow: none;
  }
}
</style>

<style>
/* While dials hold the left edge, the mic key leaves the top centre and sits
   on the Drawer's lip, on the right (the #132 prototype, as #142 carried it). */
html[data-looper-mic="lip"] .humming-capture-transport {
  inset: auto;
  top: calc(var(--looper-lip-top, 60vh) - var(--hit-min) - var(--s-7));
  right: var(--s-6);
  transform: none;
}

/* The cancel key mirrors to the mic's left, its touch still meeting the mic's. */
html[data-looper-mic="lip"] .humming-capture-transport__cancel-slot {
  left: auto;
  right: calc(100% + var(--hit-min) - (var(--humming-primary-size) + var(--humming-cancel-size)) / 2);
}

html[data-looper-mic="lip"] .humming-capture-transport__feedback {
  top: auto;
  bottom: calc(100% + var(--s-5));
  left: auto;
  right: 0;
  transform: none;
  justify-items: end;
}
</style>
