<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { ChordMember } from "@/components/compounds/Chord.vue";
import ChordKey from "@/components/compounds/ChordKey.vue";
import Keyboard from "@/components/compounds/Keyboard.vue";
import type { KeyboardRowView } from "@/components/compounds/Keyboard.vue";
import { buildHarmony, type HarmonyChord } from "@/domain/harmony";
import type { LabBenchProps } from "@/types/compoundsLab";
import LabCell from "../LabCell.vue";
import "./chord-skins.css";

/**
 * The real fused ChordKey, laid out exactly as the Keyboard's permanent chord
 * row lays it out (seven equal grid columns, 2px gap, 47px row). The harmony is
 * the real C-major build with V swapped for its dominant seventh, so the row
 * carries a 7th chord and the diminished vii. Member data mirrors Keyboard's
 * private `chordMembers` mapping; only `progress` is driven here, because in
 * the product the CodeStrip owns temporal progress and the Keyboard holds 1.
 *
 * Chord geometry is pinned to `pill`, today's chord edition (the melody Keys
 * are `offcut` today); production rotates both families daily.
 */
const props = withDefaults(defineProps<LabBenchProps>(), { skin: null, compact: false });

const CHORD_GEOMETRY = "pill" as const;
const MELODY_GEOMETRY = "offcut" as const;

const harmony: HarmonyChord[] = (() => {
  const auto = buildHarmony({ tonic: "C", scaleType: "major", octave: 4 });
  const dominant = buildHarmony({ tonic: "C", scaleType: "major", octave: 4, alteration: "dominant7" });
  return auto.map((chord, index) => (index === 4 ? dominant[4] : chord));
})();

function membersOf(chord: HarmonyChord, progress: readonly number[] | number = 1): ChordMember[] {
  return chord.voicing.pitches.map((pitch, voicingOrder) => ({
    id: `${chord.id}:${pitch.name}:${voicingOrder}`,
    rawPitch: pitch.name,
    primary: "raw",
    visibleLabels: ["raw"],
    scaleIndex: pitch.scaleIndex ?? chord.degreeIndex,
    pitchClassIndex: pitch.pitchClassIndex,
    octave: pitch.octave,
    mode: "major",
    musicKey: "C",
    surfaceStyle: "colored",
    accidental: pitch.pitchClass.includes("#"),
    voicingOrder,
    progress: typeof progress === "number" ? progress : progress[voicingOrder] ?? 0,
  }));
}

type StateId = "idle" | "pressed" | "rolling" | "spread" | "live";
interface BenchState { id: StateId; caption: string }

const STATES: BenchState[] = [
  { id: "idle", caption: "Idle · the permanent C-major row at rest, every member at full identity" },
  { id: "pressed", caption: "Pressed · G7 held (the rest press under touch or mouse)" },
  { id: "rolling", caption: "Playing · G7 rolls in low to high at 100 / 72 / 42 / 16%, the row at rest" },
  { id: "spread", caption: "Playing · every chord mid-roll, members independent (18 / 43 / 71 / 100% …)" },
  { id: "live", caption: "Playing · rolled attack and release loop (Reduced Motion holds one frame)" },
];
const states = props.compact ? STATES.filter((state) => state.id === "rolling") : STATES;

/* Distinct per-member progress for every chord in the "spread" frame. */
const SPREAD: number[][] = [
  [1, .62, .24],
  [.18, .43, .71],
  [0, .5, 1],
  [.86, .3, .58],
  [.18, .43, .71, 1],
  [.4, .9, .12],
  [.66, 0, .33],
];
const ROLL = [1, .72, .42, .16];

/* Live loop: each member rises and falls on a staggered phase. */
const livePhase = ref(.3);
const liveProgress = (chordIndex: number, memberIndex: number) => {
  const phase = (livePhase.value - chordIndex * .06 - memberIndex * .1 + 2) % 1;
  const triangle = phase < .5 ? phase * 2 : (1 - phase) * 2;
  return (1 - Math.cos(Math.PI * Math.min(1, triangle * 1.4))) / 2;
};

function progressFor(state: StateId, chordIndex: number): readonly number[] | number {
  if (state === "rolling") return chordIndex === 4 ? ROLL : 1;
  if (state === "spread") return SPREAD[chordIndex];
  if (state === "live") return harmony[chordIndex].voicing.pitches.map((_, member) => liveProgress(chordIndex, member));
  return 1;
}

const isPressed = (state: StateId, chordIndex: number) =>
  (state === "pressed" || state === "rolling") && chordIndex === 4;

/* Context: the real Keyboard (controlled) with one C-major melody row under its chord row. */
const DIATONIC = [
  ["Do", "I", "C", 0], ["Re", "II", "D", 2], ["Mi", "III", "E", 4], ["Fa", "IV", "F", 5],
  ["Sol", "V", "G", 7], ["La", "VI", "A", 9], ["Ti", "VII", "B", 11],
] as const;
const contextRows: KeyboardRowView[] = [{
  octave: 4,
  keys: DIATONIC.map(([syllable, degree, name, pitchClassIndex], scaleIndex) => ({
    id: `${scaleIndex}_4`, syllable, degree, rawPitch: `${name}4`, scaleIndex, pitchClassIndex, accidental: false,
  })),
}];

let frame: number | null = null;
let visible = false;
let observer: IntersectionObserver | undefined;
let media: MediaQueryList | undefined;
const root = ref<HTMLElement | null>(null);

function stop() {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
}
function start() {
  stop();
  if (props.compact || !visible || media?.matches) return;
  let origin = 0;
  const tick = (now: number) => {
    if (!origin) origin = now - livePhase.value * 3200;
    livePhase.value = ((now - origin) % 3200) / 3200;
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}
onMounted(() => {
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", start);
  observer = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    start();
  });
  if (root.value) observer.observe(root.value);
});
onBeforeUnmount(() => {
  stop();
  observer?.disconnect();
  media?.removeEventListener("change", start);
});
</script>

<template>
  <div ref="root" class="ulab-bench chord-bench" :class="skin ? `chord-skin--${skin}` : 'chord-skin--production'">
    <LabCell v-for="state in states" :key="state.id" :caption="state.caption" wide>
      <div class="chord-bench__row" :data-state="state.id" role="group" :aria-label="`Harmony chords, ${state.id}`">
        <ChordKey
          v-for="(chord, chordIndex) in harmony"
          :key="chord.id"
          class="chord-bench__key"
          :members="membersOf(chord, progressFor(state.id, chordIndex))"
          :symbol="chord.symbol"
          :accessible-name="chord.accessibleName"
          :geometry="CHORD_GEOMETRY"
          :pressed="isPressed(state.id, chordIndex)"
        />
      </div>
    </LabCell>
    <LabCell
      v-if="!compact"
      caption="In context · the real Keyboard: its chord row above today's offcut melody Keys"
      wide
    >
      <div class="chord-bench__context">
        <Keyboard
          usage="controlled"
          :rows="contextRows"
          :main-octave="4"
          :geometry-family="MELODY_GEOMETRY"
          edition-seed="chord-lab"
          tonic="C"
          scale-type="major"
        />
      </div>
    </LabCell>
  </div>
</template>

<style scoped>
.chord-bench :deep(.plab-cell__stage) {
  padding-inline: 0;
}

/* Mirrors `.keyboard` + `.keyboard__chord-row` from Keyboard.vue. */
.chord-bench__row {
  display: grid;
  box-sizing: border-box;
  inline-size: 100%;
  min-width: 0;
  min-height: 44px;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  align-items: stretch;
  gap: 2px;
  padding-block: 1px 2px;
  overflow: visible;
  container-type: inline-size;
  touch-action: none;
}

.chord-bench__key {
  min-width: 0;
  overflow: visible;
}

.chord-bench__context {
  inline-size: 100%;
}
</style>
