<template>
  <PatternReel
    class="pattern-list"
    :items="reelItems"
    :selected-id="selectedPatternId"
    :entry-signal="entrySignal"
    @commit="selectPattern"
    @delete="deletePattern"
    @copy="copyNotation"
    @open-strudel="openInStrudel"
    @rename="renamePattern"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import PatternReel from "@/components/compounds/PatternReel.vue";
import type { PatternReelItem } from "@/components/compounds/PatternReel.vue";
import type { BarTapeSegment } from "@/components/primatives/BarTape.vue";
import { instrumentIconFor } from "@/components/primatives/instrumentIcon";
import { useColorSystem } from "@/composables/useColorSystem";
import { useCodeStripStrudel } from "@/composables/useCodeStripStrudel";
import { toStrudelSound } from "@/composables/useStrudel";
import { CHROMATIC_NOTES } from "@/data";
import { displayInstrumentName } from "@/data/instruments";
import { DEFAULT_SOURCE_BPM, logNotesToStrudel } from "@/services/StrudelNotation";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { usePatternsStore } from "@/stores/patterns";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type { LogNote, Pattern, PatternNote } from "@/types/patterns";

const patternsStore = usePatternsStore();
const keyboardStore = useKeyboardDrawerStore();
const musicStore = useMusicStore();
const visualConfigStore = useVisualConfigStore();
const { currentCode, hasPlayableCode } = useCodeStripStrudel();
const {
  getStaticPrimaryColorByScaleIndex,
  getStaticPrimaryColorByPitchClass,
} = useColorSystem();
const CURRENT_TAKE_ID = "current-pattern-take";
type PatternControl = "key" | "mode" | "bpm" | "octave";

withDefaults(defineProps<{
  entrySignal?: number;
}>(), {
  entrySignal: 0,
});

const emit = defineEmits<{
  contextChange: [controls: PatternControl[]];
}>();

const copiedPatternId = ref<string | null>(null);
const deleteArmedPatternId = ref<string | null>(null);
let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined;
let deleteArmTimer: ReturnType<typeof setTimeout> | undefined;

onBeforeUnmount(() => {
  clearTimeout(copyFeedbackTimer);
  clearTimeout(deleteArmTimer);
});

type PatternContext = Pick<Pattern, "key" | "mode" | "instrument" | "bpm">;

function sourceBpm(bpm: number | undefined) {
  return typeof bpm === "number" && bpm > 0
    ? bpm
    : DEFAULT_SOURCE_BPM;
}

function rootOctave(notes: PatternNote[]) {
  const tonic = notes.find((note) => note.scaleIndex === 0);
  return tonic?.octave
    ?? notes[0]?.octave
    ?? keyboardStore.keyboardConfig.mainOctave;
}

function rootPitchClass(key: Pattern["key"]) {
  return Math.max(0, CHROMATIC_NOTES.indexOf(key));
}

function noteColor(note: PatternNote, context: PatternContext) {
  if (
    typeof note.pitchClassIndex === "number"
    && Number.isInteger(note.pitchClassIndex)
  ) {
    return getStaticPrimaryColorByPitchClass(
      note.pitchClassIndex,
      context.mode,
      context.key,
      note.octave,
    );
  }

  return getStaticPrimaryColorByScaleIndex(
    note.scaleIndex,
    context.mode,
    context.key,
    note.octave,
  );
}

function orderedNotes(notes: PatternNote[]) {
  return [...notes].sort(
    (firstNote, secondNote) => firstNote.pressTime - secondNote.pressTime,
  );
}

function barTape(notes: PatternNote[], context: PatternContext): BarTapeSegment[] {
  return orderedNotes(notes).map((note) => ({
    color: noteColor(note, context),
    durationMs: note.duration,
  }));
}

function notation(notes: PatternNote[], context: PatternContext) {
  const bpm = sourceBpm(context.bpm);
  return logNotesToStrudel(notes as unknown as LogNote[], {
    bpm,
    sourceBpm: bpm,
    notationType: "relative",
    scaleKey: context.key,
    scaleMode: context.mode,
    scaleOctave: keyboardStore.keyboardConfig.mainOctave,
    sound: toStrudelSound(context.instrument ?? "sine"),
  });
}

function isStoredPattern(pattern: Pattern) {
  return Boolean(
    pattern.isDefault
    || patternsStore.savedPatterns.some((candidate) => candidate.id === pattern.id),
  );
}

function reelItem(pattern: Pattern): PatternReelItem {
  const octave = rootOctave(pattern.notes);
  const pitchClass = rootPitchClass(pattern.key);
  const stored = isStoredPattern(pattern);
  return {
    id: pattern.id,
    presentationKey: stored
      ? `stored:${pattern.id}`
      : `dynamic:${pattern.notes[0]?.id ?? pattern.id}`,
    name: pattern.name ?? "Untitled pattern",
    instrumentIcon: instrumentIconFor(pattern.instrument),
    instrumentLabel: displayInstrumentName(pattern.instrument),
    rootLabel: `${pattern.key}${octave}`,
    spine: getStaticPrimaryColorByPitchClass(
      pitchClass,
      pattern.mode,
      pattern.key,
      octave,
    ),
    barTape: barTape(pattern.notes, pattern),
    copied: copiedPatternId.value === pattern.id,
    canDelete: !pattern.isDefault,
    canRename: stored,
    deleteArmed: deleteArmedPatternId.value === pattern.id,
  };
}

function sameNoteSequence(first: PatternNote[], second: PatternNote[]) {
  return first.length === second.length
    && first.every((note, index) => note.id === second[index]?.id);
}

const storedCurrentPatternId = computed(() => {
  const sketch = patternsStore.currentSketchNotes;
  const loadedId = patternsStore.loadedBasePatternId;
  const loadedPattern = loadedId
    ? patternsStore.patterns.find((pattern) => pattern.id === loadedId)
    : undefined;
  const loadedBaseStillContributes = loadedPattern
    && patternsStore.loadedBaseNotes.length > 0
    && patternsStore.loadedBaseNotes.every((note, index) => note.id === sketch[index]?.id);
  if (loadedBaseStillContributes) return loadedPattern.id;

  const focused = patternsStore.focusedPattern;
  if (focused && sketch.length > 0 && sameNoteSequence(focused.notes, sketch)) {
    return focused.id;
  }

  return null;
});

const currentTakeItem = computed<PatternReelItem>(() => {
  const context = patternsStore.currentSketchMeta;
  const notes = patternsStore.currentSketchNotes;
  const octave = rootOctave(notes);
  const pitchClass = rootPitchClass(context.key);
  return {
    id: CURRENT_TAKE_ID,
    name: "Current Take",
    instrumentIcon: instrumentIconFor(context.instrument),
    instrumentLabel: displayInstrumentName(context.instrument),
    rootLabel: `${context.key}${octave}`,
    spine: getStaticPrimaryColorByPitchClass(
      pitchClass,
      context.mode,
      context.key,
      octave,
    ),
    barTape: barTape(notes, context),
    copied: copiedPatternId.value === CURRENT_TAKE_ID,
    canDelete: false,
    canRename: false,
    canCopy: hasPlayableCode.value,
    canOpenStrudel: hasPlayableCode.value,
    deleteUnavailableLabel: "Edit the current take in CodeStrip",
    copyUnavailableLabel: "Record notes before copying Current Take",
    openUnavailableLabel: "Record notes before opening Current Take in Strudel",
  };
});

const reelItems = computed(() => {
  const storedItems = patternsStore.patterns.map(reelItem);
  return storedCurrentPatternId.value
    ? storedItems
    : [...storedItems, currentTakeItem.value];
});
const selectedPatternId = computed(() => (
  storedCurrentPatternId.value ?? CURRENT_TAKE_ID
));

watch(
  [deleteArmedPatternId, () => reelItems.value.map((item) => item.id)],
  ([armedId, itemIds]) => {
    if (!armedId || itemIds.includes(armedId)) return;
    clearTimeout(deleteArmTimer);
    deleteArmedPatternId.value = null;
  },
);

function patternById(id: string) {
  return patternsStore.patterns.find((pattern) => pattern.id === id);
}

function selectPattern(id: string) {
  if (id === CURRENT_TAKE_ID) return;
  const pattern = patternById(id);
  if (!pattern) return;

  const previousControls = {
    key: musicStore.currentKey,
    mode: musicStore.currentMode,
    bpm: visualConfigStore.config.codeStrip.bpm,
    octave: keyboardStore.keyboardConfig.mainOctave,
  };

  patternsStore.loadPatternAsBase(id);
  const changedControls: PatternControl[] = [];
  if (musicStore.currentKey !== previousControls.key) changedControls.push("key");
  if (musicStore.currentMode !== previousControls.mode) changedControls.push("mode");
  if (visualConfigStore.config.codeStrip.bpm !== previousControls.bpm) {
    changedControls.push("bpm");
  }
  if (keyboardStore.keyboardConfig.mainOctave !== previousControls.octave) {
    changedControls.push("octave");
  }
  if (changedControls.length) emit("contextChange", changedControls);
}

function renamePattern(id: string, name: string) {
  if (id === CURRENT_TAKE_ID) return;
  const pattern = patternById(id);
  if (!pattern || !isStoredPattern(pattern)) return;
  patternsStore.renamePattern(id, name);
}

function notationForId(id: string) {
  if (id === CURRENT_TAKE_ID) {
    return hasPlayableCode.value ? currentCode.value : "";
  }
  const pattern = patternById(id);
  return pattern ? notation(pattern.notes, pattern) : "";
}

async function copyNotation(id: string) {
  const source = notationForId(id);
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
  const source = notationForId(id);
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
  if (id === CURRENT_TAKE_ID) return;
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
  width: 100%;
  min-width: 0;
}
</style>
