<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import PatternCard from "@/components/compounds/PatternCard.vue";
import type { BarTapeSegment } from "@/components/primatives/BarTape.vue";
import { buildRecordedCodeStripTokens } from "@/components/uniques/CodeStrip/recordingTokens";
import { useColorSystem } from "@/composables/useColorSystem";
import { toStrudelSound } from "@/composables/useStrudel";
import { getModeDefinition } from "@/data";
import { DEFAULT_SOURCE_BPM, logNotesToStrudel } from "@/services/StrudelNotation";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { usePatternsStore } from "@/stores/patterns";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type { LogNote, Pattern, PatternNote } from "@/types/patterns";

const patternsStore = usePatternsStore();
const keyboardStore = useKeyboardDrawerStore();
const visualConfigStore = useVisualConfigStore();
const { getStaticPrimaryColorByScaleIndex } = useColorSystem();

const props = defineProps<{
  pattern: Pattern;
}>();

const copied = ref(false);
const deleteArmedPatternId = ref<string | null>(null);
const deleteArmed = computed(
  () => deleteArmedPatternId.value === props.pattern.id,
);
let deleteArmTimer: ReturnType<typeof setTimeout> | undefined;

onBeforeUnmount(() => clearTimeout(deleteArmTimer));

const keyModeLabel = computed(() => {
  const key = props.pattern.key ?? "C";
  const mode = props.pattern.mode ?? "major";
  return `${key} ${getModeDefinition(mode).label}`;
});

const noteCount = computed(
  () => props.pattern.noteCount ?? props.pattern.notes.length,
);

const isExpanded = computed(
  () => patternsStore.focusedPatternId === props.pattern.id,
);

const ordinal = computed(() => {
  const index = patternsStore.patterns.findIndex(
    (pattern) => pattern.id === props.pattern.id,
  );
  return String(Math.max(0, index) + 1).padStart(2, "0");
});

const sourceBpm = computed(() => {
  const bpm = props.pattern.bpm;
  return typeof bpm === "number" && bpm > 0 ? bpm : DEFAULT_SOURCE_BPM;
});

const notation = computed(() =>
  logNotesToStrudel(props.pattern.notes as unknown as LogNote[], {
    bpm: sourceBpm.value,
    sourceBpm: sourceBpm.value,
    notationType: "relative",
    scaleKey: props.pattern.key,
    scaleMode: props.pattern.mode,
    scaleOctave: keyboardStore.keyboardConfig.mainOctave,
    sound: toStrudelSound(props.pattern.instrument ?? "sine"),
  }),
);

const retentionLabel = computed(() => {
  if (props.pattern.isDefault) return null;
  if (props.pattern.isKept) return "kept";

  const msRemaining =
    props.pattern.createdAt + 7 * 24 * 60 * 60 * 1000 - Date.now();
  if (msRemaining <= 0) return "expiring";

  const daysRemaining = Math.max(
    1,
    Math.ceil(msRemaining / (24 * 60 * 60 * 1000)),
  );
  return `${daysRemaining}d left`;
});

const instrumentName = computed(() =>
  displayInstrumentName(props.pattern.instrument ?? "sine"),
);

const metadata = computed(() => [
  `${noteCount.value} notes`,
  retentionLabel.value,
].filter(Boolean).join(" · "));

const cardLabel = computed(
  () => `Pattern ${ordinal.value} — ${instrumentName.value} / ${keyModeLabel.value}`,
);

function colorFor(note: PatternNote, pattern: Pattern): string {
  return getStaticPrimaryColorByScaleIndex(
    note.scaleIndex,
    pattern.mode,
    pattern.key,
    note.octave,
  );
}

const orderedNotes = computed(() => [...props.pattern.notes].sort(
  (firstNote, secondNote) => firstNote.pressTime - secondNote.pressTime,
));

const barTapeSegments = computed<BarTapeSegment[]>(() =>
  orderedNotes.value.map((note) => ({
    color: colorFor(note, props.pattern),
    durationMs: note.duration,
  })),
);

const codeTokens = computed(() => buildRecordedCodeStripTokens({
  notes: orderedNotes.value,
  mode: props.pattern.mode,
  musicKey: props.pattern.key,
  notation: visualConfigStore.config.codeStrip.notation,
  barMs: (60000 / sourceBpm.value) * 4,
  sourceBpm: sourceBpm.value,
  surfaceStyle: visualConfigStore.config.keyboard.surfaceStyle,
  keyBrightness: visualConfigStore.config.keyboard.keyBrightness,
  keySaturation: visualConfigStore.config.keyboard.keySaturation,
}));

function displayInstrumentName(instrument: string): string {
  return instrument.startsWith("gm_") ? instrument.slice(3) : instrument;
}

function handleSelect() {
  patternsStore.loadPatternAsBase(props.pattern.id);
}

async function copyNotation() {
  if (!notation.value) return;
  try {
    await navigator.clipboard.writeText(notation.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch {
    // Clipboard access is not available in every browser context.
  }
}

function openInStrudel() {
  if (!notation.value) return;
  const bytes = new TextEncoder().encode(notation.value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  window.open(
    `https://strudel.cc/#${btoa(binary)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

function deletePattern() {
  if (props.pattern.isDefault) return;

  if (deleteArmedPatternId.value !== props.pattern.id) {
    deleteArmedPatternId.value = props.pattern.id;
    clearTimeout(deleteArmTimer);
    deleteArmTimer = setTimeout(() => {
      deleteArmedPatternId.value = null;
    }, 2500);
    return;
  }

  clearTimeout(deleteArmTimer);
  deleteArmedPatternId.value = null;
  patternsStore.deletePattern(props.pattern.id);
}
</script>

<template>
  <PatternCard
    :state="isExpanded ? 'expanded' : 'collapsed'"
    :label="cardLabel"
    :ordinal="ordinal"
    :name="pattern.name ?? 'Untitled pattern'"
    :metadata="metadata"
    :bar-tape="barTapeSegments"
    :code-tokens="codeTokens"
    :code-source="notation"
    :copied="copied"
    :can-delete="!pattern.isDefault"
    :delete-armed="deleteArmed"
    @select="handleSelect"
    @delete="deletePattern"
    @open-strudel="openInStrudel"
    @copy="copyNotation"
  />
</template>
