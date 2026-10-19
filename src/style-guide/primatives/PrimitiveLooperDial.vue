<template>
  <AnatomyDisplay
    title="Looper Dial &middot; One Playing Pattern"
    :features="features"
    caption="The Looper Dial is one playing pattern in the Looper, and it is the control itself: no keycap. Its Loop Dial's disc turns under a fixed brass hand, so the note at twelve is the one sounding. Tap mutes, double-tap solos, hold removes, and a vertical drag turns the pattern within the loop a beat at a time. The dials climb the left edge with Stop All on top; the mic moves to the Drawer's lip. Proposed in BJS-493 (from the #132 prototype, as #142 carried it), pending Burooj's acceptance."
  >
    <template #hero>
      <div class="looper-dial-specimen__column">
        <Button size="sm" tone="ink" accessible-name="Stop all loops" title="Stop all loops"><Square /></Button>
        <LooperDial
          v-for="(dial, index) in dials"
          :key="dial.label"
          v-bind="dial"
          :state="states[index]"
          @mute="toggle(index, 'muted')"
          @solo="toggle(index, 'solo')"
        />
      </div>
    </template>

    <VariantGrid title="States">
      <VariantCell caption="Playing &middot; the disc turns under the brass hand" stage="ink3">
        <LooperDial v-bind="dials[0]" state="playing" />
      </VariantCell>
      <VariantCell caption="Muted, or silenced by a solo &middot; the record goes dark" stage="ink3">
        <LooperDial v-bind="dials[1]" state="muted" />
      </VariantCell>
      <VariantCell caption="Soloed &middot; an Ivory ring" stage="ink3">
        <LooperDial v-bind="dials[2]" state="solo" />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Square } from "lucide-vue-next";
import Button from "../../components/primatives/Button.vue";
import LooperDial, { type LooperDialState } from "../../components/primatives/LooperDial.vue";
import { useMusicColor } from "../../composables/useMusicColor";
import { chromaticPitchHeight } from "../../services/scalePitch";
import { defaultPatterns } from "../../data/patterns";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";
import { useUIBeatFixture } from "../guide/useUIBeatFixture";

// The guide's isolated clock: the discs turn without production playback.
useUIBeatFixture({ bpm: ref(120), meter: ref({ beatsPerBar: 4, beatUnit: 4 }) });
const BAR_MS = 2000;

const { getStaticPrimaryColorByScaleIndex } = useMusicColor();

// Three real patterns, each as a member: notes at their onsets over whole bars.
const dials = defaultPatterns.slice(0, 3).map((pattern, index) => {
  const origin = Math.min(...pattern.notes.map((note) => note.pressTime));
  const segments = pattern.notes.map((note) => ({
    color: getStaticPrimaryColorByScaleIndex(note.scaleIndex, pattern.mode, pattern.key, note.octave),
    startMs: note.pressTime - origin,
    durationMs: note.duration,
    height: chromaticPitchHeight(note, pattern),
  }));
  const lastEnd = Math.max(...segments.map((segment) => segment.startMs + segment.durationMs));
  return {
    label: pattern.name ?? `Pattern ${index + 1}`,
    segments,
    lengthMs: Math.ceil(lastEnd / BAR_MS) * BAR_MS,
    barMs: BAR_MS,
    originBars: index * .25,
    rate: 1,
  };
});

const states = ref<LooperDialState[]>(["playing", "playing", "playing"]);
function toggle(index: number, state: "muted" | "solo") {
  states.value = states.value.map((current, at) => {
    if (at !== index) return state === "solo" && current === "solo" ? "playing" : current;
    return current === state ? "playing" : state;
  });
}

const features = [
  { label: "Meaning", value: "one playing pattern in the Looper, and its control" },
  { label: "Motion", value: "the disc turns under a fixed brass hand with the sounding bar position, from the member's own place and rate; Reduced Motion holds it still" },
  { label: "Gestures", value: "tap mutes · double-tap solos · hold removes · drag up or down (the Knob's feel, 15px a step, one emit per 100 ms that may carry several steps, the rest on lift) turns the pattern a beat later or earlier; a sideways slide does nothing · Enter mutes, Delete removes, Up/Down turn it a beat" },
  { label: "States", value: "playing · muted (or silenced by a solo) at 30% · soloed with an Ivory ring" },
  { label: "Surface", value: "no keycap: the 34px Loop Dial on the Stage's Ink, inside a 44px touch target" },
  { label: "Colour", value: "Music Color notes, a brass hand, Ivory focus and solo" },
  { label: "Production", value: "the Looper's column on the left edge, Stop All (a Button) on top" },
  { label: "Source", value: "components/primatives/LooperDial.vue (composes LoopDial)" },
];
</script>

<style scoped>
.looper-dial-specimen__column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-1);
  padding: var(--s-4);
  background: var(--ink);
}
</style>
