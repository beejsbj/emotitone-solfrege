<template>
  <PatternReel
    class="phrase-shelf"
    :items="reelItems"
    :selected-id="deskItemId"
    :entry-signal="entrySignal"
    :cyclic="false"
    label="Phrase reel. The selected strip is what you play into. Up and down arrows load older phrases; the front slot starts a new take."
    @commit="choose"
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
import {
  phraseContour,
  phraseStamp,
  phraseTitle,
  untouchedCopySource,
  type ReelEntry,
} from "@/domain/phraseBook";
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

/**
 * One short word for where it lives. The reel's position says "on the desk".
 * Your phrases (Recent and Kept) read as one timeline, so they show their age.
 */
function shelfTag(phrase: Phrase, inPlace: boolean) {
  if (phrase.shelf === "take" && !inPlace) return phrase.derivedFrom ? "Copy" : "Now";
  const origin = phrase.shelf === "take" ? phrasesStore.book.recorder.origin : phrase.shelf;
  if (origin === "library") return "Library";
  // A looked-at Kept copy shows its source's age.
  const dated = phrase.shelf === "take" && origin === "kept" && phrase.derivedFrom
    ? phrasesStore.findPhrase(phrase.derivedFrom.id) ?? phrase
    : phrase;
  const when = age(phraseStamp(dated));
  return when === "just now" ? when : `${when} ago`;
}

function stateLabel(inPlace: boolean, isDesk: boolean) {
  if (!isDesk) return undefined;
  if (!inPlace) return "on the desk, yours";
  return untouchedCopySource(phrasesStore.book, phrasesStore.isTakeTouched)
    ? "on the desk; playing makes a copy"
    : "on the desk";
}

/** "gm_acoustic_guitar_nylon" reads as "acoustic guitar nylon". */
function instrumentLabel(instrument: string) {
  return displayInstrumentName(instrument).replace(/_/g, " ");
}

function actionsFor(phrase: Phrase, title: string, inPlace: boolean): PatternStripAction[] {
  const copied = copiedId.value === phrase.id;
  const armed = deleteArmedId.value === phrase.id;
  const isYourTake = phrase.shelf === "take" && !inPlace;
  const playable = isYourTake ? hasPlayableCode.value : phrase.notes.length > 0;
  const copy: PatternStripAction = {
    kind: "copy",
    label: copied ? `Copied ${title}` : `Copy ${title} Strudel code`,
    done: copied,
    disabled: !playable,
  };
  const open: PatternStripAction = {
    kind: "open",
    label: `Open ${title} in Strudel`,
    disabled: !playable,
  };
  const origin = phrase.shelf === "take" && inPlace
    ? phrasesStore.book.recorder.origin
    : phrase.shelf;
  // Everything you play is kept; the library is built in. So the one
  // curating action is delete, armed by the first tap and confirmed by the second.
  if (origin === "library") return [copy, open];
  const remove: PatternStripAction = {
    kind: "delete",
    label: armed
      ? `Confirm delete ${title}`
      : isYourTake ? `Delete this take` : `Delete ${title}`,
    done: armed,
    disabled: isYourTake && !phrase.notes.length,
  };
  return [remove, copy, open];
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
  // A stable title; the solfège contour lives on the meta line below it.
  const title = source?.name || phraseTitle(phrase);
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
    deleteArmed: deleteArmedId.value === phrase.id,
    stateLabel: stateLabel(inPlace, isDesk),
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

// An armed delete means "delete what I armed". If the desk changes under it
// (a new take, or you played into it), that meaning no longer holds.
watch(
  () => [phrasesStore.takeId, phrasesStore.isTakeTouched],
  () => {
    clearTimeout(deleteTimer);
    deleteArmedId.value = null;
    deleteTargetId = null;
  },
);

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

function renamePhrase(id: string, name: string) {
  phrasesStore.renamePhrase(id, name);
}

// What the armed delete will remove, resolved on the first tap. On confirm the
// reel moves to a neighbour (loading it) before it asks for the delete, and a
// copy you were only looking at is gone by then; its Kept source is the target.
let deleteTargetId: string | null = null;

function deletePhrase(id: string) {
  if (deleteArmedId.value !== id) {
    const copySource = untouchedCopySource(phrasesStore.book, phrasesStore.isTakeTouched);
    deleteArmedId.value = id;
    deleteTargetId = id === phrasesStore.takeId && copySource ? copySource : id;
    clearTimeout(deleteTimer);
    deleteTimer = setTimeout(() => {
      if (deleteArmedId.value === id) deleteArmedId.value = null;
    }, 2500);
    return;
  }
  clearTimeout(deleteTimer);
  deleteArmedId.value = null;
  phrasesStore.deletePhrase(deleteTargetId ?? id);
  deleteTargetId = null;
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
