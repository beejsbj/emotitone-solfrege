<script setup lang="ts">
/**
 * The Looper's controls (from #142, after the #132 prototype): one key per
 * playing pattern climbing the left edge, each carrying that pattern's Loop
 * Dial, with Stop All on top. Tap mutes, double-tap solos, hold removes.
 *
 * Provisional: the brief's loop dial (a disc turning under a fixed hand) is
 * direction, not an accepted unit, so these keys carry the accepted Loop Dial
 * as it is, its hand sweeping from the member's own place in the loop.
 */
import { computed, onBeforeUnmount } from "vue";
import { Square } from "lucide-vue-next";
import Button from "@/components/primatives/Button.vue";
import LoopDial from "@/components/primatives/LoopDial.vue";
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

function stateOf(view: LooperMemberView) {
  if (view.soloed) return "solo";
  if (!view.audible) return "muted";
  return "playing";
}

function nameOf(view: LooperMemberView) {
  return `${view.label}, ${stateOf(view)}. Tap to mute, double-tap to solo, hold to remove`;
}

// Tap mutes at once; a second tap soon after undoes that and solos instead.
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

function dialLift() {
  clearTimeout(holdTimer);
}

function dialTap(id: string) {
  clearTimeout(holdTimer);
  // The click that ends a hold is not a tap.
  if (held) {
    held = false;
    return;
  }
  const now = performance.now();
  const double = lastTap.id === id && now - lastTap.at < DOUBLE_TAP_MS;
  lastTap = double ? { id: "", at: 0 } : { id, at: now };
  looper.toggleMute(id);
  if (double) looper.toggleSolo(id);
}

onBeforeUnmount(() => clearTimeout(holdTimer));
</script>

<template>
  <!-- A zero-height anchor: the dials float over the Stage and take no Drawer height. -->
  <div class="looper-dials">
    <div
      v-if="looper.hasMembers"
      class="looper-dials__column"
      role="group"
      aria-label="Playing patterns"
      data-testid="looper-dials"
    >
      <Button
        v-for="{ view, dial } in dials"
        :key="view.phraseId"
        class="looper-dials__dial"
        :class="{ 'looper-dials__dial--silent': !view.audible }"
        :tone="view.soloed ? 'ivory' : 'ink'"
        :ui-beat="false"
        haptic
        :data-phrase-id="view.phraseId"
        :data-state="stateOf(view)"
        :accessible-name="nameOf(view)"
        :title="nameOf(view)"
        @pointerdown="dialDown(view.phraseId)"
        @pointerup="dialLift"
        @pointercancel="dialLift"
        @keydown.delete.prevent="looper.removeMember(view.phraseId)"
        @contextmenu.prevent
        @click="dialTap(view.phraseId)"
      >
        <LoopDial
          :segments="dial.segments"
          :length-ms="dial.lengthMs"
          :bar-ms="dial.barMs"
          :origin-bars="dial.originBars"
          :rate="dial.rate"
          live
          :aria-label="view.label"
        />
      </Button>
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
  left: var(--s-4);
  /* Clear of the reel's deeper strips, which rise above the desk strip. */
  bottom: var(--s-10);
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  /* Keys sit --hit-gap-sm apart so their touches meet, not overlap. */
  gap: var(--hit-gap-sm);
  touch-action: manipulation;
  user-select: none;
  -webkit-touch-callout: none;
}

/* The dial fills the key's face: a record on the cap. */
.looper-dials__dial :deep(.paper-button__content .loop-dial) {
  inline-size: 30px;
  block-size: 30px;
}

/* Muted (or silenced by a solo): the key stays, its record goes dark. */
.looper-dials__dial--silent :deep(.paper-button__content) {
  opacity: .35;
}
</style>
