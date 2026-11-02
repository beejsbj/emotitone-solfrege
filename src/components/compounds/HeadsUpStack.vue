<template>
  <!-- Oldest at the top, newest at the bottom, nearest the deck: a new line
       pushes the older ones up. -->
  <TransitionGroup tag="div" name="heads-up-stack" class="heads-up-stack" data-testid="heads-up-stack">
    <HeadsUp
      v-for="entry in entries"
      :key="entry.id"
      :data-heads-up="entry.id"
      :line="entry.line"
      :hint="entry.hint"
      :label="entry.label"
      :signal="entry.signal"
      :role="entry.role"
      :busy="busy"
      :haptic="haptic"
      @dismiss="emit('dismiss', entry.id)"
    />
  </TransitionGroup>
</template>

<script setup lang="ts">
import HeadsUp from "@/components/compounds/HeadsUp.vue";
import type { HeadsUpEntry } from "@/types/headsUp";

/*
 * The Heads-up stack: the lines the instrument is telling you, stacked in the
 * visible "bottom right", just above the deck. Each one fades on its own
 * timer (held by whoever owns the entries: the heads-up store in the app),
 * and a swipe right, Escape or Delete puts one away early. Props in, a
 * dismiss out: it reads no store.
 *
 * Motion: a new line grows in from below as it fades in, pushing the older
 * ones up; a line that goes fades, drifting a little right, then its row
 * closes. Reduced Motion: opacity only, no drift and no growing row.
 */
withDefaults(defineProps<{
  /** Oldest first; the owner keeps it to three. */
  entries: HeadsUpEntry[];
  /** Something below is being moved: every line steps aside until it settles. */
  busy?: boolean;
  haptic?: boolean;
}>(), {
  busy: false,
  haptic: false,
});

const emit = defineEmits<{
  /** One line swept away, or Escape or Delete on it. */
  dismiss: [id: string];
}>();
</script>

<style scoped>
.heads-up-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-inline-size: 100%;
}

.heads-up-stack > * {
  max-inline-size: 100%;
}

/* Arriving: the row opens as the line fades in from the right. */
.heads-up-stack .heads-up-stack-enter-active {
  overflow: clip;
  transition:
    opacity var(--dur-ui) var(--ease-brush),
    translate var(--dur-ui) var(--ease-brush),
    min-block-size var(--dur-ui) var(--ease-brush),
    max-block-size var(--dur-ui) var(--ease-brush);
}

.heads-up-stack .heads-up-stack-enter-from {
  opacity: 0;
  translate: var(--s-5) 0;
  min-block-size: 0;
  max-block-size: 0;
}

.heads-up-stack .heads-up-stack-enter-to,
.heads-up-stack .heads-up-stack-leave-from {
  max-block-size: var(--hit-min);
}

/* Going: it fades where it is, drifting right, and only then does its row
   close, so the lines above settle down after it has gone. */
.heads-up-stack .heads-up-stack-leave-active {
  overflow: clip;
  transition:
    opacity var(--dur-scene) var(--ease-brush),
    translate var(--dur-scene) var(--ease-brush),
    min-block-size var(--dur-ui) var(--ease-brush) var(--dur-scene),
    max-block-size var(--dur-ui) var(--ease-brush) var(--dur-scene);
}

/* Swept away: quicker, carried on from where the finger threw it. */
.heads-up-stack .heads-up-stack-leave-active.heads-up--sweeping {
  transition-duration: var(--dur-ui);
  transition-delay: 0s, 0s, var(--dur-ui), var(--dur-ui);
}

.heads-up-stack .heads-up-stack-leave-to {
  opacity: 0;
  translate: var(--s-5) 0;
  min-block-size: 0;
  max-block-size: 0;
}

@media (prefers-reduced-motion: reduce) {
  .heads-up-stack .heads-up-stack-enter-active,
  .heads-up-stack .heads-up-stack-leave-active,
  .heads-up-stack .heads-up-stack-leave-active.heads-up--sweeping {
    overflow: visible;
    transition: opacity var(--dur-ui) linear;
  }

  .heads-up-stack .heads-up-stack-enter-from,
  .heads-up-stack .heads-up-stack-leave-to {
    translate: none;
    min-block-size: var(--hit-min);
    max-block-size: none;
  }
}
</style>
