<template>
  <AnatomyDisplay
    title="Heads-up &middot; Bottom-Right Stack"
    :features="features"
    caption="A Heads-up is what the instrument tells you: one right-aligned line of Ivory type on the Stage, with a small Brass lamp before it, stacked in the visible bottom right just above the deck. No box, border, panel or close key. Each line fades on its own, a warning after 4 s and a problem after 7 s; the newest sits at the bottom, nearest the deck, pushing older ones up, and at most three show. Swipe one off the right edge, the mirror of the Looper Dial's flick off the left, or press Escape or Delete, to put it away early. The live stack below plays one, two, then three lines and lets them fade; swipe any of them. Renamed from the Edge Notice in BJS-592, pending Burooj's acceptance."
  >
    <template #hero>
      <div class="heads-up-specimen__stage" data-testid="heads-up-specimen-live">
        <HeadsUpStack class="heads-up-specimen__stack" :entries="live.entries.value" @dismiss="live.dismiss" />
        <div class="heads-up-specimen__controls">
          <Button size="sm" tone="ink" accessible-name="Play one, two, then three lines" title="Play one, two, then three" @click="play">
            <Play />
          </Button>
          <Button size="sm" tone="ink" accessible-name="Raise the next line" title="Raise the next line (a fourth evicts the oldest)" @click="raiseNext">
            <Plus />
          </Button>
          <Button size="sm" tone="ink" accessible-name="Raise the newest line again" title="The same line again refreshes its timer" @click="raiseAgain">
            <RotateCcw />
          </Button>
        </div>
      </div>
    </template>

    <VariantGrid title="Stack">
      <VariantCell caption="One &middot; a problem, lit lamp">
        <div class="heads-up-specimen__cell">
          <HeadsUpStack :entries="LINES.slice(0, 1)" />
        </div>
      </VariantCell>
      <VariantCell caption="Two &middot; the newest at the bottom, nearest the deck">
        <div class="heads-up-specimen__cell">
          <HeadsUpStack :entries="LINES.slice(0, 2)" />
        </div>
      </VariantCell>
      <VariantCell caption="Three &middot; the most that show; a fourth evicts the oldest">
        <div class="heads-up-specimen__cell">
          <HeadsUpStack :entries="LINES.slice(0, 3)" />
        </div>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Signals">
      <VariantCell caption="Problem &middot; a lit Brass lamp, fades after 7 s (the Looper's error, a refused press, the shelf not saving)">
        <div class="heads-up-specimen__cell">
          <HeadsUp line="Not enough memory for Piano." label="Looper" signal="problem" />
        </div>
      </VariantCell>
      <VariantCell caption="Warning &middot; an unlit Brass lamp, fades after 4 s (the shelf over budget, still saving)">
        <div class="heads-up-specimen__cell">
          <HeadsUp line="Shelf full · still saving" label="Shelf full" signal="warning" />
        </div>
      </VariantCell>
      <VariantCell caption="Longest copy &middot; 32 characters">
        <div class="heads-up-specimen__cell">
          <HeadsUp line="Audio restarted. Tap Play again." label="Looper" signal="problem" />
        </div>
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import { Play, Plus, RotateCcw } from "lucide-vue-next";
import HeadsUp from "../../components/compounds/HeadsUp.vue";
import HeadsUpStack from "../../components/compounds/HeadsUpStack.vue";
import Button from "../../components/primatives/Button.vue";
import { useHeadsUpQueue } from "../../composables/useHeadsUpQueue";
import type { HeadsUpEntry } from "../../types/headsUp";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

/** Real lines from the app's three sources, oldest first. */
const LINES: HeadsUpEntry[] = [
  { id: "shelf", line: "Shelf full · still saving", label: "Shelf full", signal: "warning", role: "status" },
  { id: "looper", line: "Not enough memory for Piano.", label: "Looper", signal: "problem", role: "alert" },
  { id: "refused-press", line: "Can't play Piano: memory full", label: "Keyboard", signal: "problem", role: "alert" },
  { id: "looper-restart", line: "Audio restarted. Tap Play again.", label: "Looper", signal: "problem", role: "alert" },
];

// The specimen keeps its own queue: the same timers and rules as the app's store.
const live = useHeadsUpQueue();
let next = 0;
let steps: ReturnType<typeof setTimeout>[] = [];

function raiseNext() {
  const { id, line, label, signal } = LINES[next % LINES.length];
  live.raise({ id, line, label, signal });
  next += 1;
}

function raiseAgain() {
  const newest = live.entries.value.at(-1);
  if (newest) live.raise({ id: newest.id, line: newest.line, label: newest.label, signal: newest.signal });
  else raiseNext();
}

/** One, two, then three lines, 700 ms apart; then each fades on its own timer. */
function play() {
  steps.forEach(clearTimeout);
  live.clear();
  next = 0;
  steps = [0, 700, 1400].map((delay) => setTimeout(raiseNext, delay));
}

onMounted(play);
onBeforeUnmount(() => steps.forEach(clearTimeout));

const features = [
  { label: "Class", value: "compounds; props in, a dismiss out, no store. The queue and timers are useHeadsUpQueue, the app's one queue the heads-up store" },
  { label: "Anatomy", value: "a 6px Brass lamp, then one line of Ivory --t-mono, right-aligned; an Ink halo keeps it legible over the Stage" },
  { label: "No panel", value: "no box, border, background or close key: type on the Stage" },
  { label: "Signals", value: "warning: unlit --brass-lo lamp, fades after 4 s · problem: lit --brass-hi with its glow, fades after 7 s" },
  { label: "Stack", value: "newest at the bottom, nearest the deck, pushing older ones up; at most three, a fourth evicts the oldest; the same line again refreshes its timer in place" },
  { label: "Place", value: "the visible bottom right: a --hit-min above the deck's top edge, the Stage's right edge, beside the Looper's dials" },
  { label: "Dismiss", value: "fades on its own · a fast, mostly sideways sweep off the right edge (the Looper Dial's flick, mirrored, from flick.ts), at least 24px · Escape or Delete" },
  { label: "Never", value: "a slow drag, a vertical swipe, a leftward throw, or a tap that drifts 12px" },
  { label: "Copy", value: "32 characters fit one line at 390px; the full line is its title, the rest a hint for assistive technology" },
  { label: "Motion", value: "in: fades in from the right as its row opens · out: fades, drifting right, then its row closes · Reduced Motion: opacity only" },
];
</script>

<style scoped>
.heads-up-specimen__stage {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  inline-size: min(390px, 100%);
  min-block-size: 220px;
  padding: var(--s-5);
  box-sizing: border-box;
  background: var(--ink);
}

.heads-up-specimen__stack {
  margin-block-end: var(--s-5);
}

.heads-up-specimen__controls {
  display: flex;
  justify-content: flex-start;
  gap: var(--s-3);
}

.heads-up-specimen__cell {
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  inline-size: 100%;
  min-block-size: calc(3 * var(--hit-min));
}
</style>
