<template>
  <AnatomyDisplay
    title="Phrase Shelf &middot; Linear PatternReel"
    :features="features"
    caption="Whatever the reel is on is on the desk: scrolling loads. A phrase you only look at stays in its own place and wears the brass desk edge there. Play a note onto it and a copy is made at the front, while the original goes back to plain. The blank slot at the front starts a new take."
  >
    <template #hero>
      <div class="phrase-shelf-specimen">
        <PatternReel
          :items="heroItems"
          :selected-id="deskId"
          :cyclic="false"
          :entry-signal="heroEntry"
          @commit="choose"
          @keep="report('Keep', $event)"
          @delete="report('Delete', $event)"
          @copy="report('Copy', $event)"
          @open-strudel="report('Open in Strudel', $event)"
        />
        <div class="phrase-shelf-specimen__controls">
          <button type="button" @click="playNote">Play a note</button>
          <output aria-live="polite">{{ lastAction }}</output>
        </div>
      </div>
    </template>

    <VariantGrid title="States">
      <VariantCell caption="Looking at Library · on the desk in place" stage="ink3">
        <PatternReel :items="lookingItems" :selected-id="'library-1'" :cyclic="false" />
      </VariantCell>
      <VariantCell caption="Played over it · the copy moves to the front" stage="ink3">
        <PatternReel :items="copiedItems" :selected-id="'copy-1'" :cyclic="false" />
      </VariantCell>
      <VariantCell caption="Take · recording lamp lit" stage="ink3">
        <PatternReel :items="recordingItems" :selected-id="'take-1'" :cyclic="false" />
      </VariantCell>
      <VariantCell caption="Blank front · start a new take" stage="ink3">
        <PatternReel :items="blankItems" :selected-id="'blank'" :cyclic="false" />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import PatternReel from "../../components/compounds/PatternReel.vue";
import type { PatternReelItem } from "../../components/compounds/PatternReel.vue";
import type {
  PatternStripAction,
  PatternStripTone,
} from "../../components/compounds/PatternStrip.vue";
import { instrumentIconFor } from "../../components/primatives/instrumentIcon";
import { useMusicColor } from "../../composables/useMusicColor";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const { getStaticPrimaryColorByScaleIndex, getStaticPrimaryColorByPitchClass } = useMusicColor();

type Shelf = "recent" | "kept" | "library";

interface SpecimenPhrase {
  id: string;
  shelf: Shelf | "take";
  name: string;
  contour?: string;
  instrument: string;
  label: string;
  degrees: Array<[scaleIndex: number, durationMs: number]>;
}

const SHELF_TAGS: Record<Shelf, string> = { recent: "4m ago", kept: "Kept", library: "Library" };

function actions(shelf: Shelf | "take", name: string): PatternStripAction[] {
  const copy = { kind: "copy" as const, label: `Copy ${name}` };
  const open = { kind: "open" as const, label: `Open ${name} in Strudel` };
  const keep = { kind: "keep" as const, label: `Keep ${name}` };
  const remove = { kind: "delete" as const, label: `Delete ${name}` };
  if (shelf === "recent") return [keep, remove, copy];
  if (shelf === "kept") return [remove, copy, open];
  return [keep, copy, open];
}

/** role: on the desk in its own place, on the desk at the front, or just shelved. */
function item(
  phrase: SpecimenPhrase,
  role: "shelf" | "in-place" | "front",
  recording = false,
): PatternReelItem {
  const onDesk = role !== "shelf";
  const shelf = phrase.shelf === "take" ? null : phrase.shelf;
  return {
    id: phrase.id,
    presentationKey: phrase.id,
    name: phrase.name,
    detail: phrase.contour,
    instrumentIcon: instrumentIconFor(phrase.instrument),
    instrumentLabel: phrase.label,
    rootLabel: "C4",
    spine: getStaticPrimaryColorByPitchClass(0, "major", "C", 4),
    barTape: phrase.degrees.map(([scaleIndex, durationMs]) => ({
      color: getStaticPrimaryColorByScaleIndex(scaleIndex, "major", "C", 4),
      durationMs,
    })),
    tone: onDesk ? "take" : (shelf as PatternStripTone),
    shelfTag: role === "front"
      ? (phrase.id.startsWith("copy") ? "Copy" : "Now")
      : SHELF_TAGS[shelf ?? "recent"],
    lamp: role === "front" ? "live" : role === "in-place" ? "armed" : undefined,
    recording,
    canRename: true,
    actions: actions(shelf ?? "library", phrase.name),
  };
}

const blank: PatternReelItem = {
  id: "blank",
  presentationKey: "blank",
  name: "New take",
  instrumentIcon: instrumentIconFor("triangle"),
  instrumentLabel: "Triangle",
  rootLabel: "",
  spine: "var(--ink-5)",
  barTape: [],
  canRename: false,
  actions: [],
};

const library: SpecimenPhrase = {
  id: "library-1", shelf: "library", name: "Twinkle Twinkle Little Star",
  contour: "Do Do Sol Sol La…", instrument: "celesta", label: "Celesta",
  degrees: [[0, 300], [0, 300], [4, 300], [4, 300], [5, 300], [5, 300], [4, 600]],
};
const kept: SpecimenPhrase = {
  id: "kept-1", shelf: "kept", name: "Morning Stairs", contour: "Do Re Mi Fa Sol",
  instrument: "piano", label: "Piano", degrees: [[0, 250], [1, 250], [2, 250], [3, 250], [4, 500]],
};
const recent: SpecimenPhrase = {
  id: "recent-1", shelf: "recent", name: "Do Mi Sol Mi Do…", instrument: "triangle",
  label: "Triangle", degrees: [[0, 200], [2, 200], [4, 200], [2, 200], [0, 400]],
};
const take: SpecimenPhrase = {
  id: "take-1", shelf: "take", name: "La Sol Fa Mi", instrument: "triangle",
  label: "Triangle", degrees: [[5, 180], [4, 180], [3, 180], [2, 360]],
};
const libraryCopy: SpecimenPhrase = {
  ...library, id: "copy-1", shelf: "take",
  degrees: [...library.degrees, [2, 300]],
};

const lookingItems = [item(library, "in-place"), item(kept, "shelf"), item(recent, "shelf"), blank];
const copiedItems = [item(library, "shelf"), item(kept, "shelf"), item(recent, "shelf"), item(libraryCopy, "front")];
const recordingItems = [item(library, "shelf"), item(kept, "shelf"), item(recent, "shelf"), item(take, "front", true)];
const blankItems = [item(library, "shelf"), item(kept, "shelf"), item(recent, "shelf"), blank];

// Hero: a tiny simulation of the tape-head rules, no store.
const shelved = ref<SpecimenPhrase[]>([library, kept, recent]);
const front = ref<SpecimenPhrase | null>(take);
const lookingAt = ref<string | null>(null);
const heroEntry = ref(0);
const lastAction = ref("Ready · La Sol Fa Mi is on the desk");

const deskId = computed(() => lookingAt.value ?? front.value?.id ?? "blank");
const heroItems = computed(() => [
  ...shelved.value.map((phrase) => item(phrase, phrase.id === lookingAt.value ? "in-place" : "shelf")),
  lookingAt.value || !front.value ? blank : item(front.value, "front"),
]);

/** Scrolling loads. Leaving a played take files it into Recent, ahead of you. */
function choose(id: string) {
  if (id === deskId.value) return;
  if (front.value && !lookingAt.value) {
    const filed: SpecimenPhrase = { ...front.value, shelf: "recent" };
    shelved.value = [...shelved.value, filed];
    front.value = null;
  }
  lookingAt.value = id === "blank" ? null : id;
  const phrase = shelved.value.find((candidate) => candidate.id === id);
  lastAction.value = phrase ? `On the desk · ${phrase.name} (only looking)` : "Blank · a new take";
}

/** The first note makes a copy at the front; the original goes back to plain. */
function playNote() {
  const source = shelved.value.find((phrase) => phrase.id === lookingAt.value);
  if (source) {
    front.value = { ...source, id: `copy-${Date.now()}`, shelf: "take", degrees: [...source.degrees, [2, 300]] };
    lookingAt.value = null;
    heroEntry.value += 1;
    lastAction.value = `Played over ${source.name} · the copy is at the front`;
    return;
  }
  const current = front.value ?? { ...take, id: `take-${Date.now()}`, name: "Do", degrees: [] };
  front.value = { ...current, degrees: [...current.degrees, [0, 250]] };
  lastAction.value = `Played into ${front.value.name}`;
}

function report(action: string, id: string) {
  const phrase = [...shelved.value, front.value].find((candidate) => candidate?.id === id);
  lastAction.value = `${action} · ${phrase?.name ?? id}`;
}

const features = [
  { label: "Model", value: "one Phrase noun; shelves take → recent → kept → library" },
  { label: "Scroll", value: "loads: whatever the reel is on is on the desk" },
  { label: "Looking", value: "a looked-at phrase stays in place, so the reel never reorders" },
  { label: "First note", value: "makes a copy at the front; the original returns to plain" },
  { label: "Blank slot", value: "at the front; scroll there, or press Return, to start fresh" },
  { label: "Lamp", value: "hollow ring: loaded, only looking · filled: yours · glows while a key is down; colour from the music" },
  { label: "Source", value: "components/patterns/PhraseShelf.vue; order from domain/phraseBook arrangeReel" },
];
</script>

<style scoped>
.phrase-shelf-specimen {
  display: grid;
  gap: var(--s-4);
  padding-top: 110px;
}

.phrase-shelf-specimen__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
}

.phrase-shelf-specimen__controls button {
  padding: var(--s-3) var(--s-5);
  border: 0;
  background: var(--brass);
  color: var(--brass-edge);
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.phrase-shelf-specimen output {
  padding: var(--s-3) var(--s-4);
  background: var(--ink);
  color: var(--ivory-3);
  font: var(--t-caption);
  text-align: right;
  text-transform: uppercase;
}
</style>
