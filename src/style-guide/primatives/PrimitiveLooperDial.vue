<template>
  <AnatomyDisplay
    title="Looper Dial &middot; One Playing Pattern"
    :features="features"
    caption="The Looper Dial is one playing pattern in the Looper, and it is the control itself: no keycap. Its Loop Dial's disc turns under a fixed brass hand, so the note at twelve is the one sounding. Tap mutes at once, double-tap brings the pattern to the desk, hold solos it while held, and a fast flick off the left edge removes it (Burooj's gesture map, 2026-10-19). The dials climb the left edge with Stop All on top; the mic keeps its place at the top. The flick is shared with the Edge Notice, which is swept off the right edge. Stop All ends a loop over a bar (BJS-598): it fades the sound out over one bar, the dial dims to nothing on the same curve, and Stop All is held down meanwhile; tapped again, it cuts. The flick does not fade: the pattern leaves at once and its dial goes with it. Try Stop All here. Proposed in BJS-493 (from the #132 prototype, as #142 carried it), pending Burooj's acceptance."
  >
    <template #hero>
      <div class="looper-dial-specimen__column">
        <!-- Save as a Loop (BJS-572): above Stop All while two or more playing patterns are not yet a Loop. -->
        <Button v-if="shown && !stopping" class="looper-dial-specimen__save" size="sm" tone="ink" accessible-name="Save these patterns as a Loop" title="Save as a Loop"><BookmarkPlus /></Button>
        <Button
          v-if="shown"
          size="sm"
          tone="ink"
          :pressed="stopping"
          :aria-pressed="stopping"
          :accessible-name="stopping ? 'Cut all loops now' : 'Stop all loops'"
          :title="stopping ? 'Cut all loops now' : 'Stop all loops'"
          @click="stopAll"
        >
          <Square />
        </Button>
        <template v-if="shown">
          <LooperDial
            v-for="(dial, index) in dials"
            :key="dial.label"
            v-bind="dial"
            :state="states[index]"
            :ending="stopping"
            :ending-ms="BAR_MS"
            @mute="toggle(index)"
            @solo="(held: boolean) => hold(index, held)"
            @desk="desk = dial.label"
          />
        </template>
        <p class="looper-dial-specimen__desk">{{ shown ? `At the desk: ${desk}` : "Stopped. The loop comes back in a moment." }}</p>
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
      <VariantCell caption="Ending &middot; dims to nothing over the bar's fade, on the sound's curve; takes no gesture (replays every few seconds)" stage="ink3">
        <LooperDial :key="replay" v-bind="dials[0]" ending :ending-ms="BAR_MS" />
      </VariantCell>
      <VariantCell caption="Stop All while everything fades &middot; held down; tapped again, it cuts" stage="ink3">
        <Button size="sm" tone="ink" pressed aria-pressed="true" accessible-name="Cut all loops now" title="Cut all loops now"><Square /></Button>
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { BookmarkPlus, Square } from "lucide-vue-next";
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

const muted = ref([false, false, false]);
const held = ref<number | null>(null);
const desk = ref(dials[0].label);
// A held dial sounds alone; the others go dark until it is let go.
const states = computed<LooperDialState[]>(() => muted.value.map((isMuted, index) => {
  if (held.value !== null) return index === held.value ? "solo" : "muted";
  return isMuted ? "muted" : "playing";
}));
function toggle(index: number) {
  muted.value = muted.value.map((isMuted, at) => at === index ? !isMuted : isMuted);
}
function hold(index: number, on: boolean) {
  held.value = on ? index : held.value === index ? null : held.value;
}

// Stop All as the Looper does it (BJS-598), without sound: the dials fade out
// over a bar, Stop All held down meanwhile; a second tap cuts at once. The
// specimen's loop then comes back, so it can be tried again.
const shown = ref(true);
const stopping = ref(false);
let ended: ReturnType<typeof setTimeout> | undefined;
let back: ReturnType<typeof setTimeout> | undefined;
function stopped() {
  clearTimeout(ended);
  stopping.value = false;
  shown.value = false;
  back = setTimeout(() => { shown.value = true; }, 1200);
}
function stopAll() {
  if (stopping.value) return stopped();
  stopping.value = true;
  ended = setTimeout(stopped, BAR_MS);
}
// The Ending cell replays its fade.
const replay = ref(0);
const replaying = setInterval(() => { replay.value++; }, BAR_MS + 1000);
onBeforeUnmount(() => {
  clearTimeout(ended);
  clearTimeout(back);
  clearInterval(replaying);
});

const features = [
  { label: "Meaning", value: "one playing pattern in the Looper, and its control" },
  { label: "Motion", value: "the disc turns under a fixed brass hand with the sounding bar position, from the member's own place and rate; Reduced Motion holds it still" },
  { label: "Gestures", value: "tap mutes or unmutes at once (playable in rhythm) · double-tap brings the pattern to the desk, its second tap undoing the first's mute · hold (550 ms) solos it while held, and letting go or a cancel puts back the solo and the held pattern's own mute (a mute tapped on another dial meanwhile is kept) · a fast flick off the left edge (48 px, or all the way to the screen's edge when there is less room, at 0.5 px/ms or faster at the end) removes it, never a slow drag, a vertical swipe or a tap · vertical movement is kept for the loop's volume (to come) · Enter mutes, Delete removes" },
  { label: "States", value: "playing · muted (or silenced by a solo) at 30% · soloed with an Ivory ring · ending: fading out after Stop All (a flick is not an ending: the pattern and its dial go at once), the record dims to nothing over the bar on the sound's own (1 − t)² curve while the disc turns on, and it takes no gesture (Reduced Motion: a still 15%)" },
  { label: "Ending", value: "Stop All fades the sound out over one bar at the loop's tempo (BJS-598); Stop All is held in its pressed look while it fades, and tapped again it cuts everything at once. The flick removes at once and does not fade" },
  { label: "Surface", value: "no keycap: the 34px Loop Dial on the Stage's Ink, inside a 44px touch target" },
  { label: "Colour", value: "Music Color notes, a brass hand, Ivory focus and solo" },
  { label: "Production", value: "the Looper's column on the left edge, Stop All (a Button) on top, pressed while it fades; above it Save as a Loop while two or more playing patterns are not yet a Loop (BJS-572)" },
  { label: "Source", value: "components/primatives/LooperDial.vue (composes LoopDial)" },
];
</script>

<style scoped>
.looper-dial-specimen__desk {
  margin: var(--s-2) 0 0;
  font: var(--t-mono);
  color: var(--ivory);
}

.looper-dial-specimen__column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-1);
  padding: var(--s-4);
  background: var(--ink);
}

.looper-dial-specimen__save {
  margin-bottom: calc(var(--hit-gap-sm) - var(--s-1));
}
</style>
