<template>
  <div class="pattern-list">
    <PatternReel
      :items="reelItems"
      :selected-id="selectedPatternId"
      @commit="selectPattern"
      @delete="deletePattern"
      @copy="copyNotation"
      @open-strudel="openInStrudel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import PatternReel from "@/components/compounds/PatternReel.vue";
import type { PatternReelItem } from "@/components/compounds/PatternReel.vue";
import type { BarTapeSegment } from "@/components/primatives/BarTape.vue";
import { useColorSystem } from "@/composables/useColorSystem";
import { toStrudelSound } from "@/composables/useStrudel";
import { CHROMATIC_NOTES } from "@/data";
import { DEFAULT_SOURCE_BPM, logNotesToStrudel } from "@/services/StrudelNotation";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { usePatternsStore } from "@/stores/patterns";
import type { LogNote, Pattern, PatternNote } from "@/types/patterns";

const patternsStore = usePatternsStore();
const keyboardStore = useKeyboardDrawerStore();
const {
  getStaticPrimaryColorByScaleIndex,
  getStaticPrimaryColorByPitchClass,
} = useColorSystem();

const copiedPatternId = ref<string | null>(null);
const deleteArmedPatternId = ref<string | null>(null);
let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined;
let deleteArmTimer: ReturnType<typeof setTimeout> | undefined;

onBeforeUnmount(() => {
  clearTimeout(copyFeedbackTimer);
  clearTimeout(deleteArmTimer);
});

function sourceBpm(pattern: Pattern) {
  return typeof pattern.bpm === "number" && pattern.bpm > 0
    ? pattern.bpm
    : DEFAULT_SOURCE_BPM;
}

function rootOctave(pattern: Pattern) {
  const tonic = pattern.notes.find((note) => note.scaleIndex === 0);
  return tonic?.octave
    ?? pattern.notes[0]?.octave
    ?? keyboardStore.keyboardConfig.mainOctave;
}

function rootPitchClass(pattern: Pattern) {
  return Math.max(0, CHROMATIC_NOTES.indexOf(pattern.key));
}

function noteColor(note: PatternNote, pattern: Pattern) {
  if (
    typeof note.pitchClassIndex === "number"
    && Number.isInteger(note.pitchClassIndex)
  ) {
    return getStaticPrimaryColorByPitchClass(
      note.pitchClassIndex,
      pattern.mode,
      pattern.key,
      note.octave,
    );
  }

  return getStaticPrimaryColorByScaleIndex(
    note.scaleIndex,
    pattern.mode,
    pattern.key,
    note.octave,
  );
}

function orderedNotes(pattern: Pattern) {
  return [...pattern.notes].sort(
    (firstNote, secondNote) => firstNote.pressTime - secondNote.pressTime,
  );
}

function barTape(pattern: Pattern): BarTapeSegment[] {
  return orderedNotes(pattern).map((note) => ({
    color: noteColor(note, pattern),
    durationMs: note.duration,
  }));
}

function notation(pattern: Pattern) {
  const bpm = sourceBpm(pattern);
  return logNotesToStrudel(pattern.notes as unknown as LogNote[], {
    bpm,
    sourceBpm: bpm,
    notationType: "relative",
    scaleKey: pattern.key,
    scaleMode: pattern.mode,
    scaleOctave: keyboardStore.keyboardConfig.mainOctave,
    sound: toStrudelSound(pattern.instrument ?? "sine"),
  });
}

function reelItem(pattern: Pattern): PatternReelItem {
  const octave = rootOctave(pattern);
  const pitchClass = rootPitchClass(pattern);
  return {
    id: pattern.id,
    name: pattern.name ?? "Untitled pattern",
    rootLabel: `${pattern.key}${octave}`,
    spine: getStaticPrimaryColorByPitchClass(
      pitchClass,
      pattern.mode,
      pattern.key,
      octave,
    ),
    barTape: barTape(pattern),
    copied: copiedPatternId.value === pattern.id,
    canDelete: !pattern.isDefault,
    deleteArmed: deleteArmedPatternId.value === pattern.id,
  };
}

const reelItems = computed(() => patternsStore.patterns.map(reelItem));
const selectedPatternId = computed(() => {
  const focusedId = patternsStore.focusedPatternId;
  if (focusedId && reelItems.value.some((item) => item.id === focusedId)) {
    return focusedId;
  }
  return reelItems.value[reelItems.value.length - 1]?.id ?? "";
});

function patternById(id: string) {
  return patternsStore.patterns.find((pattern) => pattern.id === id);
}

function selectPattern(id: string) {
  patternsStore.loadPatternAsBase(id);
}

async function copyNotation(id: string) {
  const pattern = patternById(id);
  if (!pattern) return;
  const source = notation(pattern);
  if (!source) return;

  try {
    await navigator.clipboard.writeText(source);
    copiedPatternId.value = id;
    clearTimeout(copyFeedbackTimer);
    copyFeedbackTimer = setTimeout(() => {
      if (copiedPatternId.value === id) copiedPatternId.value = null;
    }, 1500);
  } catch {
    // Clipboard access is not available in every browser context.
  }
}

function openInStrudel(id: string) {
  const pattern = patternById(id);
  if (!pattern) return;
  const source = notation(pattern);
  if (!source) return;

  const bytes = new TextEncoder().encode(source);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  window.open(
    `https://strudel.cc/#${btoa(binary)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

function deletePattern(id: string) {
  const pattern = patternById(id);
  if (!pattern || pattern.isDefault) return;

  if (deleteArmedPatternId.value !== id) {
    deleteArmedPatternId.value = id;
    clearTimeout(deleteArmTimer);
    deleteArmTimer = setTimeout(() => {
      if (deleteArmedPatternId.value === id) deleteArmedPatternId.value = null;
    }, 2500);
    return;
  }

  clearTimeout(deleteArmTimer);
  deleteArmedPatternId.value = null;
  patternsStore.deletePattern(id);
}
</script>

<style scoped>
.pattern-list {
  min-width: 0;
}
</style>
