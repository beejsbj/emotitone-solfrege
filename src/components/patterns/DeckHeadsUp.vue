<script setup lang="ts">
/**
 * The deck's Heads-up stack: what the instrument is telling you (the Looper,
 * the phrase shelf, a refused press), stacked on the Stage's right edge just
 * above the deck, the mirror of the Looper's dials on the left. The heads-up
 * store holds the lines and their timers; this only places them.
 */
import HeadsUpStack from "@/components/compounds/HeadsUpStack.vue";
import { useHeadsUpStore } from "@/stores/headsUp";

withDefaults(defineProps<{
  /** The reel is being scrolled: step aside so the unwound wheel stays visible. */
  busy?: boolean;
}>(), { busy: false });

const headsUp = useHeadsUpStore();
</script>

<template>
  <!-- A zero-height anchor: the stack floats over the Stage. Not an occlusion
       part: a passing line must not resize the Stage's composition. -->
  <div class="deck-heads-up">
    <HeadsUpStack
      class="deck-heads-up__stack"
      :entries="headsUp.entries"
      :busy="busy"
      :data-reel-busy="busy ? 'true' : undefined"
      haptic
      @dismiss="headsUp.dismiss"
    />
  </div>
</template>

<style scoped>
.deck-heads-up {
  position: relative;
  height: 0;
  z-index: 4;
}

/* Anchored a --hit-min above the deck's top edge, clear of the reel's resting
   stack and the drawer handle's touch, so it covers only Stage; it grows
   upward. The left edge stays the dials'. */
.deck-heads-up__stack {
  position: absolute;
  right: var(--s-5);
  bottom: var(--hit-min);
  max-inline-size: calc(100% - var(--s-3) - var(--hit-min) - var(--s-4) - var(--s-5));
}
</style>
