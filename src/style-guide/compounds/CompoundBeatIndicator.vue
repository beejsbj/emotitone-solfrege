<template>
  <AnatomyDisplay
    title="Beat Indicator &middot; Transport Ring"
    :features="features"
    caption="Beat Indicator wraps its transport control in a segmented ring: one arc per beat, the downbeat centred at twelve o'clock, reading clockwise. UIBeat owns its clock; this compound owns no timer and never replaces the wrapped control's gestures."
  >
    <template #hero>
      <div class="hero-stage">
        <BeatIndicator static aria-label="Four beat ring around Play">
          <Button size="lg" tone="ivory" accessible-name="Play specimen">
            <Play />
          </Button>
        </BeatIndicator>
        <div class="hero-label">4/4 &middot; idle downbeat</div>
      </div>
    </template>

    <VariantGrid title="Meter &mdash; one arc per beat">
      <VariantCell caption="4/4">
        <BeatIndicator static aria-label="Four beat ring">
          <Button size="sm" tone="ivory" accessible-name="Play 4/4 specimen">
            <Play />
          </Button>
        </BeatIndicator>
      </VariantCell>
      <VariantCell caption="3/4">
        <BeatIndicator static :beats="3" aria-label="Three beat ring">
          <Button size="sm" tone="ivory" accessible-name="Play 3/4 specimen">
            <Play />
          </Button>
        </BeatIndicator>
      </VariantCell>
      <VariantCell caption="6/8">
        <BeatIndicator static :beats="6" aria-label="Six beat ring">
          <Button size="sm" tone="ivory" accessible-name="Play 6/8 specimen">
            <Play />
          </Button>
        </BeatIndicator>
      </VariantCell>
      <VariantCell caption="Even &middot; no downbeat">
        <BeatIndicator static :downbeat="false" aria-label="Even beat ring">
          <Button size="sm" tone="ivory" accessible-name="Play even specimen">
            <Play />
          </Button>
        </BeatIndicator>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Wrap &mdash; the ring follows its control">
      <VariantCell caption="Small &middot; 32px Button">
        <BeatIndicator static aria-label="Ring around small Button">
          <Button size="sm" tone="ivory" accessible-name="Play small specimen">
            <Play />
          </Button>
        </BeatIndicator>
      </VariantCell>
      <VariantCell caption="Medium &middot; 40px Button">
        <BeatIndicator static aria-label="Ring around medium Button">
          <Button size="md" tone="ivory" accessible-name="Play medium specimen">
            <Play />
          </Button>
        </BeatIndicator>
      </VariantCell>
      <VariantCell caption="Large &middot; 48px Button">
        <BeatIndicator static aria-label="Ring around large Button">
          <Button size="lg" tone="ivory" accessible-name="Play large specimen">
            <Play />
          </Button>
        </BeatIndicator>
      </VariantCell>
      <VariantCell caption="Playing &middot; ink Stop">
        <BeatIndicator static aria-label="Ring around Stop">
          <Button size="sm" tone="ink" accessible-name="Stop specimen">
            <Square />
          </Button>
        </BeatIndicator>
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { Play, Square } from "lucide-vue-next";
import BeatIndicator from "@/components/compounds/BeatIndicator.vue";
import Button from "@/components/primatives/Button.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const features = [
  { label: "Class", value: "compound; wraps one transport control in its slot" },
  { label: "Ring", value: "one arc per beat; downbeat centred at twelve o'clock, clockwise" },
  { label: "Tone", value: "ivory arcs; optional brass downbeat" },
  { label: "Pulse", value: "active arc kicks outward 1→1.12 (downbeat 1.18) and brightens" },
  { label: "Clock", value: "UIBeat injection; no component-local timer" },
  { label: "Meter", value: "beats prop creates 1..N arcs; one beat draws a full circle" },
  { label: "Static", value: "explicit still specimen; downbeat held at idle" },
  { label: "Reduced", value: "motion removed; downbeat remains legible" },
];
</script>

<style scoped>
.hero-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.hero-label {
  color: var(--ivory-2);
  font: 700 13px/1 var(--font-display);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
</style>
