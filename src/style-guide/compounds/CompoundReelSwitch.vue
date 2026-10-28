<template>
  <AnatomyDisplay
    title="Reel Switch &middot; Loop Reels"
    :features="features"
    caption="A saved Loop is its own reel beside the home reel. Swipe sideways across the reel to turn to the next one: the reel follows the finger and turns at a quarter of its width, or on a quick throw. A row of pips on the reel's bottom edge says where you are: home a short bar, each Loop a dot, the shown reel lit Ivory, a Loop that is playing ringed in Brass. A Loop's reel holds only its patterns, each wearing the Loop's name as its shelf word. Proposed in BJS-572, pending Burooj's acceptance."
  >
    <template #hero>
      <div class="reel-switch-specimen">
        <ReelSwitch :reels="reels" :active-id="activeId" @change="(id) => turn(id)">
          <PatternReel
            :key="activeId"
            :items="itemsFor(activeId)"
            :selected-id="selected[activeId]"
            :cyclic="false"
            @commit="(id) => (selected[activeId] = id)"
            @replace="report('Replace in Loop', $event)"
            @open-strudel="report('Open in Strudel', $event)"
            @delete="report('Delete', $event)"
          />
        </ReelSwitch>
        <output aria-live="polite">{{ lastAction }}</output>
      </div>
    </template>

    <VariantGrid title="Reels">
      <VariantCell caption="Home · two Loops saved, Loop 1 playing" stage="ink3">
        <ReelSwitch :reels="reels" active-id="home">
          <PatternReel :items="homeItems" :selected-id="homeItems[homeItems.length - 1].id" :cyclic="false" />
        </ReelSwitch>
      </VariantCell>
      <VariantCell caption="Loop 1 · its patterns, its name as their shelf word" stage="ink3">
        <ReelSwitch :reels="reels" active-id="loop-1">
          <PatternReel :items="loopOneItems" :selected-id="loopOneItems[0].id" :cyclic="false" />
        </ReelSwitch>
      </VariantCell>
      <VariantCell caption="Loop 1 · a take played over one, offering Replace in Loop" stage="ink3">
        <ReelSwitch :reels="reels" active-id="loop-1">
          <PatternReel :items="loopOneItems" :selected-id="loopOneItems[loopOneItems.length - 1].id" :cyclic="false" />
        </ReelSwitch>
      </VariantCell>
      <VariantCell caption="Only the home reel · no pips, no sideways gesture" stage="ink3">
        <ReelSwitch :reels="reels.slice(0, 1)" active-id="home">
          <PatternReel :items="homeItems" :selected-id="homeItems[homeItems.length - 1].id" :cyclic="false" />
        </ReelSwitch>
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import PatternReel, { type PatternReelItem } from "../../components/compounds/PatternReel.vue";
import ReelSwitch, { type ReelSwitchReel } from "../../components/compounds/ReelSwitch.vue";
import { instrumentIconFor } from "../../components/primatives/instrumentIcon";
import { useMusicColor } from "../../composables/useMusicColor";
import { chromaticPitchHeight } from "../../services/scalePitch";
import type { ChromaticNote, MusicalMode } from "../../types/music";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const { getStaticPrimaryColorByScaleIndex, getStaticPrimaryColorByPitchClass } = useMusicColor();

/** A strip as PhraseShelf maps one: root spine, notes on the Loop Dial. */
function strip(
  id: string,
  name: string,
  shelfTag: string,
  { key = "C" as ChromaticNote, pitchClass = 0, mode = "major" as MusicalMode, degrees = [0, 2, 4], instrument = "piano", label = "Piano" } = {},
  extra: Partial<PatternReelItem> = {},
): PatternReelItem {
  return {
    id,
    name,
    instrumentIcon: instrumentIconFor(instrument),
    instrumentLabel: label,
    rootLabel: `${key}4`,
    spine: getStaticPrimaryColorByPitchClass(pitchClass, mode, key, 4),
    loopDial: degrees.map((scaleIndex) => ({
      color: getStaticPrimaryColorByScaleIndex(scaleIndex, mode, key, 4),
      durationMs: 320,
      height: chromaticPitchHeight({ scaleIndex, octave: 4 }, { key, mode }),
    })),
    shelfTag,
    canRename: false,
    actions: [{ kind: "open", label: `Open ${name} in Strudel` }],
    ...extra,
  };
}

const bass = { key: "A" as ChromaticNote, pitchClass: 9, mode: "minor" as MusicalMode, degrees: [0, 0, 4, 3], instrument: "gm_acoustic_bass", label: "Acoustic bass" };
const homeItems: PatternReelItem[] = [
  strip("golden-sun", "Golden Sun", "Library", { degrees: [4, 2, 0, 2, 4] }),
  strip("take-2", "Take 2", "3m ago", bass),
  strip("take-1", "Take 1", "4m ago"),
  strip("blank", "New take", "", {}, { loopDial: [], actions: [], stateLabel: "start a new take" }),
];
const loopOneItems: PatternReelItem[] = [
  strip("take-1", "Take 1", "Loop 1", {}, { tone: "take", lamp: "armed" }),
  strip("take-2", "Take 2", "Loop 1", bass),
  strip("take-3", "Take 3", "Now", { degrees: [0, 4, 2, 5] }, {
    tone: "take",
    lamp: "live",
    actions: [
      { kind: "replace", label: "Replace Take 1 in Loop 1 with Take 3" },
      { kind: "open", label: "Open Take 3 in Strudel" },
    ],
  }),
];
const loopTwoItems: PatternReelItem[] = [
  strip("golden-sun", "Golden Sun", "Loop 2", { degrees: [4, 2, 0, 2, 4] }),
  strip("take-2", "Take 2", "Loop 2", bass),
  strip("blank", "New take", "", {}, { loopDial: [], actions: [], stateLabel: "start a new take" }),
];

const reels: ReelSwitchReel[] = [
  { id: "home", name: "Every phrase", kind: "home" },
  { id: "loop-1", name: "Loop 1", kind: "loop", sounding: true },
  { id: "loop-2", name: "Loop 2", kind: "loop" },
];
const items: Record<string, PatternReelItem[]> = { home: homeItems, "loop-1": loopOneItems, "loop-2": loopTwoItems };
const itemsFor = (id: string) => items[id] ?? homeItems;

const activeId = ref("home");
const selected = reactive<Record<string, string>>({ home: "blank", "loop-1": "take-3", "loop-2": "golden-sun" });
const lastAction = ref("Swipe sideways across the reel");

function turn(id: string) {
  activeId.value = id;
  lastAction.value = `Showing ${reels.find((reel) => reel.id === id)?.name}`;
}

function report(action: string, id: string) {
  lastAction.value = `${action} · ${id}`;
}

const features = [
  { label: "Class", value: "compound; props in (reels, the shown one), a change out, no store; the reel is its slot" },
  { label: "Gesture", value: "a sideways drag across the reel strip, followed under the finger; turns at a quarter of the width or on a quick throw (24px, 0.5 px/ms); leftward is the next reel" },
  { label: "Not a flick", value: "never a throw off the screen's edge: the Looper Dial's flick (left edge) and the Edge Notice's sweep (right edge) start on their own surfaces above the deck" },
  { label: "Axis", value: "decided past 6px like the reel's own vertical drag, so one touch is never both; keys on the strip keep their touches" },
  { label: "Ends", value: "nothing before home or after the last Loop: the strip gives a quarter of the drag, then settles back" },
  { label: "Pips", value: "4px, on the reel's bottom edge: home a 9px bar, each Loop a dot; --ivory-4, the shown reel --ivory, a playing Loop ringed in --brass. No text" },
  { label: "Keyboard", value: "Left and Right arrows turn; each turn is announced" },
  { label: "Still", value: "Reduced Motion: no follow and no entrance; the reel turns on release" },
  { label: "Source", value: "components/compounds/ReelSwitch.vue, reelSwipe.ts; mapped by patterns/PhraseShelf.vue" },
];
</script>

<style scoped>
.reel-switch-specimen {
  display: grid;
  gap: var(--s-4);
  inline-size: min(390px, 100%);
  padding-block-start: 64px;
}

.reel-switch-specimen output {
  color: var(--ivory-3);
  font: var(--t-caption);
  text-align: right;
  text-transform: uppercase;
}
</style>
