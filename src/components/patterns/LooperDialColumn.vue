<script setup lang="ts">
/**
 * The Looper's column (from #142, after the #132 prototype): one Looper Dial
 * per playing pattern climbing the left edge, each disc turning under a fixed
 * brass hand, with Stop All on top. The mic keeps its place at the top
 * centre whether or not anything plays. What the Looper could not do shows as
 * an Edge Notice on the right edge, the mirror of the dials on the left.
 */
import { computed, ref, watch } from "vue";
import { BookmarkPlus, Square } from "lucide-vue-next";
import Button from "@/components/primatives/Button.vue";
import EdgeNotice from "@/components/compounds/EdgeNotice.vue";
import LooperDial, { type LooperDialState } from "@/components/primatives/LooperDial.vue";
import { looperDialProps } from "@/components/patterns/looperDial";
import { useMusicColor } from "@/composables/useMusicColor";
import { useLooperStore } from "@/stores/looper";
import type { LooperMemberView } from "@/stores/looper";

const looper = useLooperStore();
const { getStaticPrimaryColorByPitchClass, getStaticPrimaryColorByScaleIndex } = useMusicColor();

// The members, and each pattern fading out where its dial was (BJS-598).
const dials = computed(() => looper.dialViews.map((view) => ({
  view,
  dial: looperDialProps(view, {
    byPitchClass: getStaticPrimaryColorByPitchClass,
    byScaleIndex: getStaticPrimaryColorByScaleIndex,
  }),
})));

/** What the polite live region says: the fade and its cut while Stop All fades, then that it has stopped. */
const stopStatus = ref("");
watch(() => looper.stopping, (stopping, was) => {
  if (stopping) stopStatus.value = "Stopping. Tap Stop All again to cut.";
  else if (was) stopStatus.value = looper.hasMembers ? "" : "Stopped.";
});

function stateOf(view: LooperMemberView): LooperDialState {
  if (view.soloed) return "solo";
  if (!view.audible) return "muted";
  return "playing";
}
</script>

<template>
  <!-- A zero-height anchor: the dials float over the Stage and take no Drawer height. -->
  <div class="looper-dials">
    <!-- Stop All's fade, told to assistive technology (BJS-598): the key's look alone is not heard. -->
    <span class="looper-dials__sr-only" aria-live="polite" data-testid="looper-stop-status">{{ stopStatus }}</span>
    <!-- A Play that could not sound says why, instead of doing nothing. -->
    <EdgeNotice
      v-if="looper.lastError"
      class="looper-dials__notice"
      data-testid="looper-error"
      :line="looper.lastError"
      label="Looper"
      signal="problem"
      role="alert"
      haptic
      @dismiss="looper.clearError()"
    />
    <div
      v-if="dials.length"
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
        :ending="view.ending"
        :ending-ms="view.endingMs"
        haptic
        @mute="looper.toggleMute(view.phraseId)"
        @desk="looper.bringToDesk(view.phraseId)"
        @solo="(held: boolean) => held ? looper.holdSolo(view.phraseId) : looper.releaseSolo(view.phraseId)"
        @remove="looper.removeMember(view.phraseId)"
      />
      <!-- Last in a reversed column: Stop All sits on top of the dials. It
           fades everything out over a bar, held down meanwhile; tapped again
           while held, it cuts at once (BJS-598). -->
      <Button
        class="looper-dials__stop"
        size="sm"
        tone="ink"
        haptic
        data-testid="looper-stop-all"
        :pressed="looper.stopping"
        :aria-pressed="looper.stopping"
        :accessible-name="looper.stopping ? 'Cut all loops now' : 'Stop all loops'"
        :title="looper.stopping ? 'Cut all loops now' : 'Stop all loops'"
        @click="looper.stopAll()"
      >
        <Square />
      </Button>
      <!-- Above Stop All: two or more patterns playing that no Loop holds yet
           can be saved as a Loop, which gets its own reel (BJS-572). -->
      <Button
        v-if="looper.canSaveLoop"
        class="looper-dials__save"
        size="sm"
        tone="ink"
        haptic
        data-testid="looper-save-loop"
        accessible-name="Save these patterns as a Loop"
        title="Save as a Loop"
        @click="looper.saveLoop()"
      >
        <BookmarkPlus />
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

.looper-dials__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  border: 0;
  clip-path: inset(50%);
  pointer-events: none;
  white-space: nowrap;
}

/* Its touch meets Stop All's, never overlaps it. */
.looper-dials__save {
  margin-bottom: calc(var(--hit-gap-sm) - var(--s-1));
}

/* An Edge Notice on the right edge, one row above the shelf's own (which
   sits --hit-min above the deck), so the two stack upward and never meet.
   Beside the dial column, never over it. */
.looper-dials__notice {
  position: absolute;
  right: var(--s-5);
  bottom: calc(2 * var(--hit-min));
  max-inline-size: calc(100% - var(--s-3) - var(--hit-min) - var(--s-4) - var(--s-5));
}
</style>
