import { markRaw, reactive } from "vue";
import type { PatternReelItem } from "@/components/compounds/PatternReel.vue";
import type { PatternStripAction, PatternStripTone } from "@/components/compounds/PatternStrip.vue";
import { instrumentIconFor } from "@/components/primatives/instrumentIcon";
import { useMusicColor } from "@/composables/useMusicColor";
import { chromaticPitchHeight } from "@/services/scalePitch";

/*
 * Guide-only fixtures for the PatternReel lab bench: the Phrase Shelf specimen's
 * phrases (components/patterns/PhraseShelf.vue is what production mounts on the
 * Drawer), built fresh per bench so every direction owns its own state.
 */
type Shelf = "take" | "recent" | "kept" | "library";
type Role = "shelf" | "in-place" | "front";

interface Phrase {
  id: string;
  shelf: Shelf;
  name: string;
  contour?: string;
  instrument: string;
  label: string;
  degrees: Array<[scaleIndex: number, durationMs: number]>;
}

const SHELF_TAGS: Record<Exclude<Shelf, "take">, string> = { recent: "4m ago", kept: "Kept", library: "Library" };

const PHRASES: Phrase[] = [
  {
    id: "library-1", shelf: "library", name: "Twinkle Twinkle Little Star", contour: "Do Do Sol Sol La…",
    instrument: "celesta", label: "Celesta",
    degrees: [[0, 300], [0, 300], [4, 300], [4, 300], [5, 300], [5, 300], [4, 600]],
  },
  {
    id: "kept-1", shelf: "kept", name: "Morning Stairs", contour: "Do Re Mi Fa Sol",
    instrument: "piano", label: "Piano", degrees: [[0, 250], [1, 250], [2, 250], [3, 250], [4, 500]],
  },
  {
    id: "recent-1", shelf: "recent", name: "Late Night Tram", contour: "Sol La Ti La",
    instrument: "epiano1", label: "Rhodes", degrees: [[4, 500], [5, 250], [6, 250], [5, 750]],
  },
  {
    id: "take-1", shelf: "take", name: "La Sol Fa Mi", instrument: "triangle",
    label: "Triangle", degrees: [[5, 180], [4, 180], [3, 180], [2, 360], [0, 240]],
  },
];

function actions(shelf: Shelf, name: string): PatternStripAction[] {
  const copy = { kind: "copy" as const, label: `Copy ${name}` };
  const open = { kind: "open" as const, label: `Open ${name} in Strudel` };
  const remove = { kind: "delete" as const, label: `Delete ${name}` };
  return shelf === "library" ? [copy, open] : [remove, copy, open];
}

export function useReelFixtures() {
  const { getStaticPrimaryColorByScaleIndex, getStaticPrimaryColorByPitchClass } = useMusicColor();

  function item(phrase: Phrase, role: Role, recording = false): PatternReelItem {
    const onDesk = role !== "shelf";
    return {
      id: phrase.id,
      presentationKey: phrase.id,
      name: phrase.name,
      detail: phrase.contour,
      instrumentIcon: markRaw(instrumentIconFor(phrase.instrument)),
      instrumentLabel: phrase.label,
      rootLabel: "C4",
      spine: getStaticPrimaryColorByPitchClass(0, "major", "C", 4),
      barTape: phrase.degrees.map(([scaleIndex, durationMs]) => ({
        color: getStaticPrimaryColorByScaleIndex(scaleIndex, "major", "C", 4),
        durationMs,
        height: chromaticPitchHeight({ scaleIndex, octave: 4 }, { key: "C", mode: "major" }),
      })),
      tone: onDesk ? "take" : (phrase.shelf as PatternStripTone),
      shelfTag: role === "front" ? "Now" : SHELF_TAGS[phrase.shelf === "take" ? "recent" : phrase.shelf],
      lamp: role === "front" ? "live" : role === "in-place" ? "armed" : undefined,
      recording,
      canRename: true,
      actions: actions(phrase.shelf, phrase.name),
    };
  }

  const [library, kept, recent, take] = PHRASES;
  /** The deck as it sits on the Drawer: three shelved phrases behind the take you are playing into. */
  const deck = () => reactive<PatternReelItem[]>([item(library, "shelf"), item(kept, "shelf"), item(recent, "shelf"), item(take, "front")]);
  /** One strip on its own: the take on the desk, a key held down. */
  const selected = () => reactive<PatternReelItem>(item(take, "front", true));
  /** A long library title, looked at in place on the desk. */
  const long = () => reactive<PatternReelItem>(item(library, "in-place"));

  return { deck, selected, long, frontId: take.id };
}
