<template>
  <AnatomyDisplay
    title="Edge Notice &middot; Right-Edge Line"
    :features="features"
    caption="The Edge Notice is what the instrument tells you: one right-aligned line of Ivory type on the Stage, with a small Brass lamp before it. No box, border, panel or close key. Swipe it off the right edge to put it away, the mirror of the Looper Dial's flick off the left: the left edge is what you play, the right edge is what the instrument tells you. Escape or Delete puts it away from the keyboard. Proposed in BJS-493 (PR #202), the look BJS-578 asked for, pending Burooj's acceptance."
  >
    <template #hero>
      <div class="edge-notice-specimen__stage">
        <EdgeNotice
          v-if="shown"
          :line="line"
          label="Looper"
          signal="problem"
          role="alert"
          @dismiss="shown = false"
        />
        <Button v-else size="sm" tone="ink" accessible-name="Show the notice again" title="Show the notice again" @click="shown = true">
          <RotateCcw />
        </Button>
      </div>
    </template>

    <VariantGrid title="Signals">
      <VariantCell caption="Problem &middot; a lit Brass lamp (the Looper's error; the shelf not saving)">
        <div class="edge-notice-specimen__cell">
          <EdgeNotice line="Stop a loop to add Piano." label="Looper" signal="problem" />
        </div>
      </VariantCell>
      <VariantCell caption="Warning &middot; an unlit Brass lamp (the shelf over budget, still saving)">
        <div class="edge-notice-specimen__cell">
          <EdgeNotice line="Shelf full · still saving" label="Shelf full" signal="warning" />
        </div>
      </VariantCell>
      <VariantCell caption="Longest copy &middot; 32 characters">
        <div class="edge-notice-specimen__cell">
          <EdgeNotice line="Audio restarted. Tap Play again." label="Looper" signal="problem" />
        </div>
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { RotateCcw } from "lucide-vue-next";
import EdgeNotice from "../../components/compounds/EdgeNotice.vue";
import Button from "../../components/primatives/Button.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const shown = ref(true);
const line = "Piano didn't load. Try again.";

const features = [
  { label: "Class", value: "compound; props in, a dismiss out, no store" },
  { label: "Anatomy", value: "a 6px Brass lamp, then one line of Ivory --t-mono, right-aligned; an Ink halo keeps it legible over the Stage" },
  { label: "No panel", value: "no box, border, background or close key: type on the Stage" },
  { label: "Signals", value: "warning: unlit --brass-lo lamp · problem: lit --brass-hi with its glow" },
  { label: "Dismiss", value: "a fast, mostly sideways sweep off the right edge (the Looper Dial's flick, mirrored, from flick.ts), at least 24px · Escape or Delete" },
  { label: "Never", value: "a slow drag, a vertical swipe, a leftward throw, or a tap that drifts 12px" },
  { label: "Copy", value: "32 characters fit one line at 390px; the full line is its title, the rest a hint for assistive technology" },
  { label: "Still", value: "Reduced Motion: no entrance, fade or follow transition" },
];
</script>

<style scoped>
.edge-notice-specimen__stage {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  inline-size: min(390px, 100%);
  min-block-size: 96px;
  padding-inline: var(--s-5);
  box-sizing: border-box;
}

.edge-notice-specimen__cell {
  display: flex;
  justify-content: flex-end;
  inline-size: 100%;
}
</style>
