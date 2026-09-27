<template>
  <AnatomyDisplay
    title="Phrase Shelf &middot; Linear PatternReel"
    :features="features"
    caption="The front strip is always the take: the one phrase your notes go into. Behind it, by distance from now: Recent, Kept, Library. Browsing moves through the shelves without touching the desk; the brass button puts a phrase on the desk and the old take slides back into Recent."
  >
    <template #hero>
      <div class="phrase-shelf-specimen">
        <PatternReel
          :items="heroItems"
          :selected-id="heroCursor"
          :cyclic="false"
          :entry-signal="heroEntry"
          @commit="heroCursor = $event"
          @load="load"
          @keep="keep"
          @delete="report('Delete', $event)"
          @copy="report('Copy', $event)"
          @open-strudel="report('Open in Strudel', $event)"
        />
        <output aria-live="polite">{{ lastAction }}</output>
      </div>
    </template>

    <VariantGrid title="States">
      <VariantCell caption="Take · recording lamp lit" stage="ink3">
        <PatternReel
          :items="recordingItems"
          :selected-id="recordingItems[recordingItems.length - 1].id"
          :cyclic="false"
        />
      </VariantCell>
      <VariantCell caption="Browsing · a Recent phrase" stage="ink3">
        <PatternReel :items="staticItems" :selected-id="'recent-1'" :cyclic="false" />
      </VariantCell>
      <VariantCell caption="Browsing · Library, a copy source" stage="ink3">
        <PatternReel :items="staticItems" :selected-id="'library-1'" :cyclic="false" />
      </VariantCell>
      <VariantCell caption="Empty take after Return" stage="ink3">
        <PatternReel :items="emptyItems" :selected-id="'take-empty'" :cyclic="false" />
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

interface SpecimenPhrase {
  id: string;
  shelf: PatternStripTone;
  name: string;
  contour?: string;
  instrument: string;
  label: string;
  degrees: Array<[scaleIndex: number, durationMs: number]>;
  tag?: string;
}

const TAGS: Record<PatternStripTone, string> = {
  take: "Now",
  recent: "Recent · 4m",
  kept: "Kept",
  library: "Library",
};

function actions(phrase: SpecimenPhrase): PatternStripAction[] {
  const load = { kind: "load" as const, label: `Put ${phrase.name} on the desk` };
  if (phrase.shelf === "take") {
    const empty = !phrase.degrees.length;
    return [
      { kind: "keep", label: `Keep ${phrase.name}`, disabled: empty },
      { kind: "copy", label: `Copy ${phrase.name}`, disabled: empty },
      { kind: "open", label: `Open ${phrase.name} in Strudel`, disabled: empty },
    ];
  }
  if (phrase.shelf === "recent") return [{ kind: "keep", label: `Keep ${phrase.name}` }, { kind: "delete", label: `Delete ${phrase.name}` }, load];
  if (phrase.shelf === "kept") return [{ kind: "delete", label: `Delete ${phrase.name}` }, { kind: "copy", label: `Copy ${phrase.name}` }, load];
  return [{ kind: "copy", label: `Copy ${phrase.name}` }, { kind: "open", label: `Open ${phrase.name} in Strudel` }, load];
}

function item(phrase: SpecimenPhrase, recording = false): PatternReelItem {
  return {
    id: phrase.id,
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
    tone: phrase.shelf,
    shelfTag: phrase.tag ?? TAGS[phrase.shelf],
    recording,
    canRename: true,
    actions: actions(phrase),
  };
}

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
const emptyTake: SpecimenPhrase = {
  id: "take-empty", shelf: "take", name: "New take", instrument: "triangle",
  label: "Triangle", degrees: [],
};

const staticItems = [library, kept, recent, take].map((phrase) => item(phrase));
const recordingItems = [library, kept, recent].map((phrase) => item(phrase)).concat(item(take, true));
const emptyItems = [library, kept, { ...recent, id: "recent-2" }, emptyTake].map((phrase) => item(phrase));

// Hero: a tiny simulation of the shelf rules, no store.
const shelf = ref<SpecimenPhrase[]>([library, kept, recent, take]);
const heroCursor = ref(take.id);
const heroEntry = ref(0);
const lastAction = ref("Ready · the take is on the desk");
const heroItems = computed(() => shelf.value.map((phrase) => item(phrase)));

function report(action: string, id: string) {
  const phrase = shelf.value.find((candidate) => candidate.id === id);
  lastAction.value = `${action} · ${phrase?.name ?? id}`;
}

function load(id: string) {
  const chosen = shelf.value.find((phrase) => phrase.id === id);
  const current = shelf.value.find((phrase) => phrase.shelf === "take");
  if (!chosen || !current || chosen === current) return;
  const rest = shelf.value.filter((phrase) => phrase !== current && phrase !== chosen);
  const retired: SpecimenPhrase = { ...current, shelf: "recent", tag: "Recent · just now" };
  const incoming: SpecimenPhrase = chosen.shelf === "recent"
    ? { ...chosen, shelf: "take", tag: undefined }
    : { ...chosen, id: `${chosen.id}-copy-${Date.now()}`, shelf: "take", tag: "Now · copy" };
  const keepsSource = chosen.shelf !== "recent" ? [chosen] : [];
  const ordered = [...rest, ...keepsSource];
  const library = ordered.filter((phrase) => phrase.shelf === "library");
  const kept = ordered.filter((phrase) => phrase.shelf === "kept");
  const recent = ordered.filter((phrase) => phrase.shelf === "recent");
  shelf.value = [...library, ...kept, ...recent, retired, incoming];
  heroCursor.value = incoming.id;
  lastAction.value = `On the desk · ${incoming.name}; ${current.name} moved to Recent`;
}

function keep(id: string) {
  const index = shelf.value.findIndex((phrase) => phrase.id === id);
  if (index < 0) return;
  const phrase = shelf.value[index];
  const kept: SpecimenPhrase = { ...phrase, shelf: "kept", tag: undefined };
  if (phrase.shelf === "take") {
    const next: SpecimenPhrase[] = [
      ...shelf.value.filter((candidate) => candidate !== phrase && candidate.shelf !== "take"),
      kept,
      { ...emptyTake, id: `take-${Date.now()}` },
    ];
    shelf.value = next.sort((left, right) => order(left) - order(right));
    heroCursor.value = shelf.value[shelf.value.length - 1].id;
    heroEntry.value += 1;
  } else {
    shelf.value = shelf.value
      .map((candidate) => candidate === phrase ? kept : candidate)
      .sort((left, right) => order(left) - order(right));
  }
  lastAction.value = `Kept · ${phrase.name}`;
}

function order(phrase: SpecimenPhrase) {
  return ["library", "kept", "recent", "take"].indexOf(phrase.shelf);
}

const features = [
  { label: "Model", value: "one Phrase noun; shelves take → recent → kept → library" },
  { label: "Order", value: "linear, deepest first; the take is pinned to the front" },
  { label: "Browse", value: "drag, wheel, tap, Up/Down move a cursor; the desk is untouched" },
  { label: "Load", value: "brass button: Recent moves back to the take; Kept/Library fork a copy" },
  { label: "Home", value: "a new take or a played note brings the cursor back to the take" },
  { label: "Take material", value: "brass edge, record lamp while a key is down, Now tag" },
  { label: "Source", value: "components/patterns/PhraseShelf.vue over components/compounds/PatternReel.vue" },
];
</script>

<style scoped>
.phrase-shelf-specimen {
  display: grid;
  gap: var(--s-4);
  padding-top: 110px;
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
