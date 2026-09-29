<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { ChordMember } from "@/components/compounds/Chord.vue";
import CodeStripBar from "@/components/compounds/CodeStripBar.vue";
import type { CodeStripToken } from "@/components/uniques/CodeStrip/index.vue";
import LabCell from "../LabCell.vue";
import "./code-strip-skins.css";

/**
 * The real Code Strip inside the real CodeStrip Bar, driven through controlled
 * tokens: a looping phrase, a paused frame at phone and wide widths, and the
 * empty document. Controlled strips render Bar durations whatever the
 * requested mode (a pre-existing defect the guide specimen shares), so this
 * bench shows only Bar. `skin` is applied around the real source. The phrase clock is
 * specimen scaffolding standing in for Strudel's source-location highlight.
 */
const props = withDefaults(defineProps<{ skin?: string | null; onlyPlaying?: boolean; label?: string }>(), {
  skin: null,
  onlyPlaying: false,
  label: "Production",
});

const members = (progress: number[]): ChordMember[] => [
  { id: "c", syllable: "Do", rawPitch: "C4", scaleIndex: 0, progress: progress[0], voicingOrder: 0, pressOrder: 1 },
  { id: "e", syllable: "Mi", rawPitch: "E4", scaleIndex: 2, progress: progress[1], voicingOrder: 1, pressOrder: 2 },
  { id: "g", syllable: "Sol", rawPitch: "G4", scaleIndex: 4, progress: progress[2], voicingOrder: 2, pressOrder: 3 },
  { id: "b", syllable: "Ti", rawPitch: "B4", scaleIndex: 6, progress: progress[3], voicingOrder: 3, pressOrder: 0 },
];

/** One phrase at phase 0–1; each event fills while the phase crosses it. */
function phrase(phase: number): CodeStripToken[] {
  const at = (start: number, span: number) => Math.min(1, Math.max(0, (phase - start) / span));
  return [
    { type: "note", note: "do", text: "Do", duration: "@0.125", progress: at(0, .1) },
    { type: "note", note: "mi", text: "Mi", duration: "@0.125", progress: at(.1, .1) },
    { type: "rest", duration: "@0.0625", progress: at(.2, .05) },
    { type: "chord", symbol: "Cmaj7", duration: "@0.5", members: members([at(.25, .3), at(.27, .3), at(.29, .3), at(.31, .3)]) },
    { type: "note", note: "la", text: "La", duration: "@0.25", progress: at(.62, .14) },
    { type: "note", note: "sol", text: "Sol", duration: "@0.125", progress: at(.76, .1) },
    { type: "rest", duration: "@0.125", progress: at(.86, .07) },
    { type: "note", note: "fa", text: "Fa", duration: "@0.125", progress: at(.93, .07) },
  ];
}

const phase = ref(.46);
const looping = computed(() => phrase(phase.value));
const paused = phrase(.44);
let frame: number | null = null;
let start = 0;
const tick = (time: number) => {
  if (!start) start = time;
  phase.value = ((time - start) % 6400) / 6400;
  frame = requestAnimationFrame(tick);
};
onMounted(() => {
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) frame = requestAnimationFrame(tick);
});
onBeforeUnmount(() => {
  if (frame != null) cancelAnimationFrame(frame);
  relay?.disconnect();
});

/*
 * Lab relay for Stave's timed stems. Sequence sets an event's progress on its
 * Note, Rest or Chord members, not on its duration bar, so this copies it onto
 * each stem as a 0–1 fill for the segment that stem denotes. Adoption would
 * pass progress to the duration bar inside Sequence.vue instead.
 */
const root = ref<HTMLElement | null>(null);
let relay: MutationObserver | undefined;
function readProgress(line: Element) {
  const own = line.querySelector<HTMLElement>(".code-strip__note, .code-strip__rest");
  if (own) return parseFloat(own.style.getPropertyValue("--code-strip-progress")) || 0;
  const members = [...line.querySelectorAll<HTMLElement>("[style*='--chord-member-progress']")]
    .map((member) => parseFloat(member.style.getPropertyValue("--chord-member-progress")) || 0);
  return members.length ? members.reduce((sum, value) => sum + value, 0) / members.length : 0;
}
function relayStems() {
  root.value?.querySelectorAll(".code-strip__event-line").forEach((line) => {
    const marks = line.querySelectorAll<HTMLElement>(".code-strip__duration-mark");
    const filled = readProgress(line) * marks.length;
    marks.forEach((mark, index) => {
      const fill = String(Math.min(1, Math.max(0, filled - index)));
      if (mark.style.getPropertyValue("--ulab-stem-fill") !== fill) mark.style.setProperty("--ulab-stem-fill", fill);
    });
  });
}
onMounted(() => {
  if (props.skin !== "stave" || !root.value) return;
  relayStems();
  relay = new MutationObserver(relayStems);
  relay.observe(root.value, { subtree: true, childList: true, attributes: true, attributeFilter: ["style"] });
});
</script>

<template>
  <div ref="root" class="ulab-bench ulab-strip" :class="props.skin ? `ulab-strip--${props.skin}` : 'ulab-strip--production'">
    <LabCell
      :caption="onlyPlaying ? label : 'Playing · the phrase loops through notes, rests and a fused chord (Reduced Motion holds one frame)'"
      wide
    >
      <div class="ulab-strip__bar"><CodeStripBar :tokens="looping" /></div>
    </LabCell>
    <template v-if="!onlyPlaying">
    <LabCell caption="Paused mid-chord · 4/4" wide>
      <div class="ulab-strip__bar"><CodeStripBar :tokens="paused" duration-mode="bar" /></div>
    </LabCell>
    <LabCell caption="Wide host · the Keyboard drawer's bar at tablet and desktop widths" wide>
      <div class="ulab-strip__bar ulab-strip__bar--wide"><CodeStripBar :tokens="paused" /></div>
    </LabCell>
    <LabCell caption="Empty document" wide>
      <div class="ulab-strip__bar"><CodeStripBar :tokens="[]" /></div>
    </LabCell>
    </template>
  </div>
</template>

<style scoped>
.ulab-strip__bar { inline-size: min(100%, 390px); }
.ulab-strip__bar--wide { inline-size: 100%; }
.ulab-strip :deep(.plab-cell__stage) { padding-inline: 0; }
</style>
