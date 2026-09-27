<template>
  <PatternReel
    class="phrase-shelf"
    :items="reelItems"
    :selected-id="cursorId"
    :entry-signal="entrySignal"
    :cyclic="false"
    label="Phrase reel. The front strip is what you are playing into. Up and down arrows browse older phrases."
    @commit="browse"
    @load="loadPhrase"
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
import { phraseContour } from "@/domain/phraseBook";
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

// ─── Browse cursor ───────────────────────────────────────────────────────────
// The reel browses; it does not load. The cursor is where the reel is looking.
// It returns to the take whenever the take is what matters: a new take opens,
// or you play into it.
const browsedId = ref<string | null>(null);
const entrySignal = ref(0);

const cursorId = computed(() => {
  const id = browsedId.value;
  return id && reelItems.value.some((item) => item.id === id) ? id : phrasesStore.takeId;
});

watch(() => phrasesStore.takeId, (takeId, previousTakeId) => {
  const atTake = !browsedId.value || browsedId.value === previousTakeId;
  browsedId.value = null;
  // A fresh take arrives from below and pushes the deck back.
  if (atTake && phrasesStore.take.notes.length <= 1 && !phrasesStore.take.derivedFrom) {
    entrySignal.value += 1;
  }
});
// Your notes always go to the take, so playing brings the reel home.
watch(
  () => [phrasesStore.isTakeSounding, phrasesStore.lastLiveNoteId],
  () => { browsedId.value = null; },
);

function browse(id: string) {
  browsedId.value = id === phrasesStore.takeId ? null : id;
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

function shelfTag(phrase: Phrase) {
  if (phrase.shelf === "take") return phrase.derivedFrom ? "Now · copy" : "Now";
  if (phrase.shelf === "recent") return `Recent · ${age(phrase.closedAt)}`;
  return phrase.shelf === "kept" ? "Kept" : "Library";
}

function actionsFor(phrase: Phrase, title: string): PatternStripAction[] {
  const copied = copiedId.value === phrase.id;
  const copy: PatternStripAction = {
    kind: "copy",
    label: copied ? `Copied ${title}` : `Copy ${title} Strudel code`,
    done: copied,
  };
  const load: PatternStripAction = { kind: "load", label: `Put ${title} on the desk` };
  const armed = deleteArmedId.value === phrase.id;
  const remove: PatternStripAction = {
    kind: "delete",
    label: armed ? `Confirm delete ${title}` : `Delete ${title}`,
    done: armed,
  };

  switch (phrase.shelf) {
    case "take": {
      const playable = hasPlayableCode.value;
      return [
        {
          kind: "keep",
          label: phrase.notes.length ? `Keep ${title}` : "Play notes before keeping the take",
          disabled: !phrase.notes.length,
        },
        { ...copy, disabled: !playable },
        { kind: "open", label: `Open ${title} in Strudel`, disabled: !playable },
      ];
    }
    case "recent":
      return [{ kind: "keep", label: `Keep ${title}` }, remove, load];
    case "kept":
      return [remove, copy, load];
    case "library":
      return [copy, { kind: "open", label: `Open ${title} in Strudel` }, load];
  }
}

function reelItem(phrase: Phrase): PatternReelItem {
  const contour = phrase.notes.length ? phraseContour(phrase) : "";
  const title = phrase.name || phrase.derivedFrom?.name || contour || "New take";
  const { key, mode, instrument, octave } = phrase.context;
  const ordered = [...phrase.notes].sort((left, right) => left.pressTime - right.pressTime);
  return {
    id: phrase.id,
    presentationKey: `phrase:${phrase.id}`,
    name: title,
    detail: contour && contour !== title ? contour : undefined,
    instrumentIcon: instrumentIconFor(instrument),
    instrumentLabel: displayInstrumentName(instrument),
    rootLabel: `${key}${octave}`,
    spine: getStaticPrimaryColorByPitchClass(
      Math.max(0, CHROMATIC_NOTES.indexOf(key)),
      mode,
      key,
      octave,
    ),
    barTape: ordered.map((note) => ({ color: noteColor(note, phrase), durationMs: note.duration })),
    tone: phrase.shelf as PatternStripTone,
    shelfTag: shelfTag(phrase),
    recording: phrase.shelf === "take" && phrasesStore.isTakeSounding,
    canRename: true,
    actions: actionsFor(phrase, title),
  };
}

/** Deepest first: Library, Kept, Recent, then the take at the front. */
const reelItems = computed(() => {
  const { take, recent, kept, library } = phrasesStore.shelves;
  return [
    ...[...library].reverse(),
    ...[...kept].reverse(),
    ...[...recent].reverse(),
    take,
  ].map(reelItem);
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
  browsedId.value = null;
  const changed: PatternControl[] = [];
  if (musicStore.currentKey !== before.key) changed.push("key");
  if (musicStore.currentMode !== before.mode) changed.push("mode");
  if (visualConfigStore.config.codeStrip.bpm !== before.bpm) changed.push("bpm");
  if (keyboardStore.keyboardConfig.mainOctave !== before.octave) changed.push("octave");
  if (changed.length) emit("contextChange", changed);
}

function keepPhrase(id: string) {
  const keptId = phrasesStore.keepPhrase(id);
  // Keeping from the reel follows the phrase to its new shelf.
  if (keptId && id !== phrasesStore.takeId && browsedId.value) browsedId.value = keptId;
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
