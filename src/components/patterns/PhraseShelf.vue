<template>
  <PatternReel
    class="phrase-shelf"
    :items="reelItems"
    :selected-id="deskItemId"
    :entry-signal="entrySignal"
    :cyclic="false"
    label="Phrase reel. The selected strip is what you play into. Up and down arrows load older phrases; the front slot starts a new take."
    @commit="choose"
    @keep="keepPhrase"
    @delete="deletePhrase"
    @copy="copyNotation"
    @open-strudel="openInStrudel"
    @rename="renamePhrase"
    @interaction-change="emit('interactionChange', $event)"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import PatternReel from "@/components/compounds/PatternReel.vue";
import type { PatternReelItem } from "@/components/compounds/PatternReel.vue";
import type {
  PatternStripAction,
  PatternStripTone,
} from "@/components/compounds/PatternStrip.vue";
import { instrumentIconFor } from "@/components/primatives/instrumentIcon";
import { useMusicColor } from "@/composables/useMusicColor";
import { useCodeStripStrudel } from "@/composables/useCodeStripStrudel";
import { toStrudelSound } from "@/composables/useStrudel";
import { CHROMATIC_NOTES } from "@/data";
import { displayInstrumentName } from "@/data/instruments";
import { phraseContour, type ReelEntry } from "@/domain/phraseBook";
import { logNotesToStrudel } from "@/services/StrudelNotation";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { usePhrasesStore } from "@/stores/phrases";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type { LogNote, PatternNote } from "@/types/patterns";
import type { Phrase } from "@/types/phrases";

type PatternControl = "key" | "mode" | "bpm" | "octave";

const emit = defineEmits<{
  contextChange: [controls: PatternControl[]];
  interactionChange: [active: boolean];
}>();

const phrasesStore = usePhrasesStore();
const keyboardStore = useKeyboardDrawerStore();
const musicStore = useMusicStore();
const visualConfigStore = useVisualConfigStore();
const { currentCode, hasPlayableCode } = useCodeStripStrudel();
const {
  getStaticPrimaryColorByScaleIndex,
  getStaticPrimaryColorByPitchClass,
} = useMusicColor();

const copiedId = ref<string | null>(null);
const deleteArmedId = ref<string | null>(null);
const now = ref(Date.now());
let copyTimer: ReturnType<typeof setTimeout> | undefined;
let deleteTimer: ReturnType<typeof setTimeout> | undefined;
const clockTimer = setInterval(() => { now.value = Date.now(); }, 30_000);

onBeforeUnmount(() => {
  clearTimeout(copyTimer);
  clearTimeout(deleteTimer);
  clearInterval(clockTimer);
});

// ─── The desk ────────────────────────────────────────────────────────────────
// Whatever the reel is on is on the desk: scrolling loads. A phrase you only
// look at stays in its own place, so scrolling never reorders the reel; the
// first note you play onto it makes a copy that moves to the front.
const BLANK_ID = "phrase-shelf-blank";
const entrySignal = ref(0);

// The reel is always on the desk, wherever the desk is drawn.
const deskItemId = computed(() => phrasesStore.takeId);

/** The take being played into sits at the front (not merely looked at). */
const deskAtFront = computed(() => {
  const front = phrasesStore.reel[phrasesStore.reel.length - 1];
  return front.role === "desk" && Boolean(front.phrase?.notes.length);
});

// Return, or a silence that splits the take: a fresh take arrives from below
// and pushes the deck back. Scrolling to the blank slot needs no entrance.
watch(
  () => ({ id: phrasesStore.takeId, front: deskAtFront.value }),
  (next, previous) => {
    if (next.id === previous.id || !previous.front) return;
    if (!phrasesStore.take.derivedFrom && phrasesStore.take.notes.length <= 1) {
      entrySignal.value += 1;
    }
  },
);

function choose(id: string) {
  if (id === BLANK_ID) phrasesStore.startBlankTake();
  else if (id !== phrasesStore.takeId) loadPhrase(id);
}

// ─── Presentation ────────────────────────────────────────────────────────────
function noteColor(note: PatternNote, phrase: Phrase) {
  const { mode, key } = phrase.context;
  return typeof note.pitchClassIndex === "number" && Number.isInteger(note.pitchClassIndex)
    ? getStaticPrimaryColorByPitchClass(note.pitchClassIndex, mode, key, note.octave)
    : getStaticPrimaryColorByScaleIndex(note.scaleIndex, mode, key, note.octave);
}

function age(stamp: number | undefined) {
  if (!stamp) return "";
  const minutes = Math.floor(Math.max(0, now.value - stamp) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

/** One short word for where it lives. The reel's position says "on the desk". */
function shelfTag(phrase: Phrase, inPlace: boolean) {
  if (phrase.shelf === "take" && !inPlace) return phrase.derivedFrom ? "Copy" : "Now";
  const origin = phrase.shelf === "take" ? phrasesStore.book.recorder.origin : phrase.shelf;
  if (origin === "recent") {
    const when = age(phrase.closedAt);
    return when === "just now" ? when : `${when} ago`;
  }
  return origin === "kept" ? "Kept" : "Library";
}

function stateLabel(phrase: Phrase, inPlace: boolean, isDesk: boolean) {
  if (!isDesk) return undefined;
  if (!inPlace) return "on the desk, yours";
  return phrase.derivedFrom ? "on the desk; playing makes a copy" : "on the desk";
}

/** "gm_acoustic_guitar_nylon" reads as "acoustic guitar nylon". */
function instrumentLabel(instrument: string) {
  return displayInstrumentName(instrument).replace(/_/g, " ");
}

function actionsFor(phrase: Phrase, title: string, inPlace: boolean): PatternStripAction[] {
  const copied = copiedId.value === phrase.id;
  const copy: PatternStripAction = {
    kind: "copy",
    label: copied ? `Copied ${title}` : `Copy ${title} Strudel code`,
    done: copied,
  };
  const open: PatternStripAction = { kind: "open", label: `Open ${title} in Strudel` };
  const keep: PatternStripAction = { kind: "keep", label: `Keep ${title}` };
  const armed = deleteArmedId.value === phrase.id;
  const remove: PatternStripAction = {
    kind: "delete",
    label: armed ? `Confirm delete ${title}` : `Delete ${title}`,
    done: armed,
  };

  // A phrase you're only looking at offers what its own shelf offers.
  const shelf = phrase.shelf === "take" && inPlace
    ? phrasesStore.book.recorder.origin
    : phrase.shelf;
  switch (shelf) {
    case "take":
    case "fresh": {
      const playable = hasPlayableCode.value;
      return [
        {
          ...keep,
          label: phrase.notes.length ? keep.label : "Play notes before keeping the take",
          disabled: !phrase.notes.length,
        },
        { ...copy, disabled: !playable },
        { ...open, disabled: !playable },
      ];
    }
    case "recent":
      return [keep, remove, copy];
    case "kept":
      return [remove, copy, open];
    case "library":
      return [keep, copy, open];
  }
}

function blankItem(): PatternReelItem {
  const { instrument } = phrasesStore.take.context;
  return {
    id: BLANK_ID,
    presentationKey: "blank",
    name: "New take",
    instrumentIcon: instrumentIconFor(instrument),
    instrumentLabel: instrumentLabel(instrument),
    rootLabel: "",
    spine: "var(--ink-5)",
    barTape: [],
    stateLabel: "start a new take",
    canRename: false,
    actions: [],
  };
}

function reelItem(entry: ReelEntry, isFront: boolean): PatternReelItem {
  const phrase = entry.phrase;
  if (!phrase) return blankItem();
  const isDesk = entry.role === "desk";
  const inPlace = isDesk && !isFront;
  // A looked-at copy shows its source's current name (renames go to the source).
  const source = inPlace && phrase.derivedFrom
    ? phrasesStore.findPhrase(phrase.derivedFrom.id)
    : undefined;
  const contour = phrase.notes.length ? phraseContour(phrase) : "";
  const title = source?.name || phrase.name || phrase.derivedFrom?.name || contour || "New take";
  const { key, mode, instrument, octave } = phrase.context;
  const ordered = [...phrase.notes].sort((left, right) => left.pressTime - right.pressTime);
  return {
    id: phrase.id,
    presentationKey: entry.key,
    name: title,
    detail: contour && contour !== title ? contour : undefined,
    instrumentIcon: instrumentIconFor(instrument),
    instrumentLabel: instrumentLabel(instrument),
    rootLabel: `${key}${octave}`,
    spine: getStaticPrimaryColorByPitchClass(
      Math.max(0, CHROMATIC_NOTES.indexOf(key)),
      mode,
      key,
      octave,
    ),
    barTape: ordered.map((note) => ({ color: noteColor(note, phrase), durationMs: note.duration })),
    tone: isDesk ? "take" : phrase.shelf as PatternStripTone,
    shelfTag: shelfTag(phrase, inPlace),
    lamp: isDesk ? (inPlace ? "armed" : "live") : undefined,
    stateLabel: stateLabel(phrase, inPlace, isDesk),
    recording: isDesk && phrasesStore.isTakeSounding,
    canRename: true,
    actions: actionsFor(phrase, title, inPlace),
  };
}

/** Deepest first: Library, Kept, Recent, then the front slot. */
const reelItems = computed(() => {
  const reel = phrasesStore.reel;
  return reel.map((entry, index) => reelItem(entry, index === reel.length - 1));
});

watch([deleteArmedId, () => reelItems.value.map((item) => item.id)], ([armedId, ids]) => {
  if (!armedId || ids.includes(armedId)) return;
  clearTimeout(deleteTimer);
  deleteArmedId.value = null;
});

// ─── Actions ─────────────────────────────────────────────────────────────────
function loadPhrase(id: string) {
  const before = {
    key: musicStore.currentKey,
    mode: musicStore.currentMode,
    bpm: visualConfigStore.config.codeStrip.bpm,
    octave: keyboardStore.keyboardConfig.mainOctave,
  };
  if (!phrasesStore.openPhrase(id)) return;
  const changed: PatternControl[] = [];
  if (musicStore.currentKey !== before.key) changed.push("key");
  if (musicStore.currentMode !== before.mode) changed.push("mode");
  if (visualConfigStore.config.codeStrip.bpm !== before.bpm) changed.push("bpm");
  if (keyboardStore.keyboardConfig.mainOctave !== before.octave) changed.push("octave");
  if (changed.length) emit("contextChange", changed);
}

function keepPhrase(id: string) {
  phrasesStore.keepPhrase(id);
}

function renamePhrase(id: string, name: string) {
  phrasesStore.renamePhrase(id, name);
}

function deletePhrase(id: string) {
  if (deleteArmedId.value !== id) {
    deleteArmedId.value = id;
    clearTimeout(deleteTimer);
    deleteTimer = setTimeout(() => {
      if (deleteArmedId.value === id) deleteArmedId.value = null;
    }, 2500);
    return;
  }
  clearTimeout(deleteTimer);
  deleteArmedId.value = null;
  phrasesStore.deletePhrase(id);
}

function notationFor(id: string) {
  if (id === phrasesStore.takeId) return hasPlayableCode.value ? currentCode.value : "";
  const phrase = phrasesStore.findPhrase(id);
  if (!phrase?.notes.length) return "";
  const { bpm, key, mode, instrument, shape } = phrase.context;
  return logNotesToStrudel(phrase.notes as unknown as LogNote[], {
    bpm,
    sourceBpm: bpm,
    notationType: "relative",
    scaleKey: key,
    scaleMode: mode,
    scaleOctave: keyboardStore.keyboardConfig.mainOctave,
    patternDurationMs: phrase.duration,
    sound: toStrudelSound(instrument ?? "sine"),
    shape,
  });
}

async function copyNotation(id: string) {
  const source = notationFor(id);
  if (!source) return;
  try {
    await navigator.clipboard.writeText(source);
    copiedId.value = id;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      if (copiedId.value === id) copiedId.value = null;
    }, 1500);
  } catch {
    // Clipboard access is not available in every browser context.
  }
}

function openInStrudel(id: string) {
  const source = notationFor(id);
  if (!source) return;
  const bytes = new TextEncoder().encode(source);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  window.open(`https://strudel.cc/#${btoa(binary)}`, "_blank", "noopener,noreferrer");
}
</script>

<style scoped>
.phrase-shelf {
  width: 100%;
  min-width: 0;
}
</style>
