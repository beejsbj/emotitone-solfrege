<template>
  <AnatomyDisplay
    title="Beat Indicator &middot; Transport Ring"
    :features="features"
    caption="Beat Indicator wraps its transport control in a segmented ring that echoes Knob's Digital Arc: one butt-ended segment per beat over a hairline track, with the downbeat centred at twelve o'clock and reading clockwise. It appears only while the transport runs. UIBeat owns the clock; this compound owns no timer and never replaces the wrapped control's gestures."
  >
    <template #hero>
      <div class="hero-stage">
        <BeatIndicator aria-label="Live beat ring around Play">
          <Button
            size="lg"
            :tone="running ? 'ink' : 'ivory'"
            :accessible-name="running ? 'Stop ring specimen' : 'Play ring specimen'"
            @click="toggle"
          >
            <Square v-if="running" />
            <Play v-else />
          </Button>
        </BeatIndicator>
        <div class="hero-label">
          {{ running ? "4/4 · 120 BPM" : "Stopped · ring hidden" }}
        </div>
      </div>
    </template>

    <VariantGrid title="Live &mdash; one isolated clock">
      <VariantCell caption="Small &middot; ivory Play / ink Stop">
        <BeatIndicator aria-label="Live small beat ring">
          <Button
            size="sm"
            :tone="running ? 'ink' : 'ivory'"
            :accessible-name="running ? 'Stop small ring specimen' : 'Play small ring specimen'"
            @click="toggle"
          >
            <Square v-if="running" />
            <Play v-else />
          </Button>
        </BeatIndicator>
      </VariantCell>
      <VariantCell caption="Even &middot; no brass downbeat">
        <BeatIndicator :downbeat="false" aria-label="Live even beat ring">
          <Button
            size="sm"
            :tone="running ? 'ink' : 'ivory'"
            :accessible-name="running ? 'Stop even ring specimen' : 'Play even ring specimen'"
            @click="toggle"
          >
            <Square v-if="running" />
            <Play v-else />
          </Button>
        </BeatIndicator>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Meter &mdash; still, one segment per beat">
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

    <VariantGrid title="Wrap &mdash; still, the ring follows its control">
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
      <VariantCell caption="One beat &middot; full ring">
        <BeatIndicator static :beats="1" aria-label="Single beat ring">
          <Button size="sm" tone="ivory" accessible-name="Play single beat specimen">
            <Play />
          </Button>
        </BeatIndicator>
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Play, Square } from "lucide-vue-next";
import BeatIndicator from "@/components/compounds/BeatIndicator.vue";
import Button from "@/components/primatives/Button.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";
import { useUIBeatFixture } from "../guide/useUIBeatFixture";

const { running, toggle } = useUIBeatFixture({
  bpm: ref(120),
  meter: ref({ beatsPerBar: 4, beatUnit: 4 }),
});

const features = [
  { label: "Class", value: "compound; wraps one transport control in its slot" },
  { label: "Ring", value: "one butt-ended 8-unit segment per beat over a 0.4 hairline track, after Knob's Digital Arc" },
  { label: "Tone", value: "ivory segments with their own glow; brass downbeat with Knob's brass edge light" },
  { label: "Presence", value: "hidden while the transport is idle; fades in when it arms" },
  { label: "Pulse", value: "lit segment kicks outward 1→1.12 (downbeat 1.18) and brightens from 0.2" },
  { label: "Clock", value: "UIBeat injection; no component-local timer" },
  { label: "Still", value: "static specimens always, and playback under Reduced Motion or Visuals off, hold the downbeat without motion" },
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
