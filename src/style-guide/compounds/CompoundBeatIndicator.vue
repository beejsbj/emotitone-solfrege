<template>
  <AnatomyDisplay
    title="Beat Indicator &middot; Transport Ring"
    :features="features"
    caption="Beat Indicator wraps its transport control in cut-paper shards, one per beat, with the downbeat centred at twelve o'clock and reading clockwise. It appears only while the transport runs. The orbit form is an exploration that places Marks at the same beat positions. UIBeat owns the clock; this compound owns no timer and never replaces the wrapped control's gestures."
  >
    <template #hero>
      <div class="hero-stage">
        <div class="hero-pair">
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
          <BeatIndicator variant="orbit" aria-label="Live orbiting beat Marks around Play">
            <Button
              size="lg"
              :tone="running ? 'ink' : 'ivory'"
              :accessible-name="running ? 'Stop orbit specimen' : 'Play orbit specimen'"
              @click="toggle"
            >
              <Square v-if="running" />
              <Play v-else />
            </Button>
          </BeatIndicator>
        </div>
        <div class="hero-label">
          {{ running ? "Ring vs orbit · 120 BPM" : "Stopped · ring hidden" }}
        </div>
      </div>
    </template>

    <VariantGrid title="Form &mdash; live on one isolated clock">
      <VariantCell caption="Ring &middot; cut shards">
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
      <VariantCell caption="Orbit &middot; Squares">
        <BeatIndicator variant="orbit" aria-label="Live small orbiting Squares">
          <Button
            size="sm"
            :tone="running ? 'ink' : 'ivory'"
            :accessible-name="running ? 'Stop small orbit specimen' : 'Play small orbit specimen'"
            @click="toggle"
          >
            <Square v-if="running" />
            <Play v-else />
          </Button>
        </BeatIndicator>
      </VariantCell>
      <VariantCell caption="Orbit &middot; notation set">
        <BeatIndicator
          variant="orbit"
          :marks="['eighth', 'accent', 'flat', 'fermata']"
          aria-label="Live orbiting notation Marks"
        >
          <Button
            size="sm"
            :tone="running ? 'ink' : 'ivory'"
            :accessible-name="running ? 'Stop notation orbit specimen' : 'Play notation orbit specimen'"
            @click="toggle"
          >
            <Square v-if="running" />
            <Play v-else />
          </Button>
        </BeatIndicator>
      </VariantCell>
      <VariantCell caption="Orbit &middot; structural set">
        <BeatIndicator
          variant="orbit"
          :marks="['triangle', 'disk', 'wave', 'diamond']"
          aria-label="Live orbiting structural Marks"
        >
          <Button
            size="sm"
            :tone="running ? 'ink' : 'ivory'"
            :accessible-name="running ? 'Stop structural orbit specimen' : 'Play structural orbit specimen'"
            @click="toggle"
          >
            <Square v-if="running" />
            <Play v-else />
          </Button>
        </BeatIndicator>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Meter &mdash; still, one shard per beat">
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
      <VariantCell caption="Orbit &middot; still">
        <BeatIndicator static variant="orbit" aria-label="Still orbiting Squares">
          <Button size="sm" tone="ivory" accessible-name="Play still orbit specimen">
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
  { label: "Ring", value: "one cut-paper shard per beat: faceted band, clockwise-leaning scissor cuts, offset paper shadow" },
  { label: "Tone", value: "ivory shards on an Ivory-4 shadow; brass downbeat on Brass-lo" },
  { label: "Presence", value: "hidden while the transport is idle; fades in when it arms" },
  { label: "Pulse", value: "active shard kicks outward 1→1.12 (downbeat 1.18) and brightens" },
  { label: "Orbit", value: "exploration: Marks at the beat positions swell in place 1→1.42 (downbeat 1.52)" },
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

.hero-pair {
  display: flex;
  align-items: center;
  gap: 28px;
}

.hero-label {
  color: var(--ivory-2);
  font: 700 13px/1 var(--font-display);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
</style>
