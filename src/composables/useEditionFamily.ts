import { computed, ref } from "vue";
import type { TabsGeometry, TabsTone } from "@/components/primatives/Tabs.vue";
import type { KnobVisual } from "@/components/primatives/Knob/types";

/**
 * Edition families: one design seen together across the parts that have
 * editions. Each family names its Tabs, Knob and Joystick edition; the
 * Keyboard's key shapes keep their own daily variation and are not part of a
 * family (Burooj, 2026-10-09).
 *
 * The family in force resolves in this order:
 *   1. a review pin from the `?edition=<family>` query parameter (any family,
 *      never saved);
 *   2. a family pinned in Config (Global > Edition), saved with the visual
 *      config;
 *   3. this load's Shuffle pick, drawn from the families that meet the
 *      accessibility floor.
 */

export type JoystickVisual = "analog" | "digital";

export interface EditionFamily {
  id: string;
  /** Plain display name, used in Config. */
  name: string;
  tabs: { geometry: TabsGeometry; tone: TabsTone };
  knob: KnobVisual;
  joystick: JoystickVisual;
  /**
   * Every edition in the family meets the accessibility floor: 44px touch,
   * a visible focus ring, and 3:1 marks / 4.5:1 labels. Only these join
   * Shuffle or appear in Config.
   */
  meetsFloor: boolean;
}

/*
 * Two temperaments carry the pairing. Segmented: lit, square-cut marks — the
 * Ring's LED chads, the Digital Joystick's square cap and detents, and the
 * Tabs that read as squares or lights (Marquee bulbs, Sharp, Tile). Smooth:
 * continuous strokes and solid metal — the Arc's single stroke, the Analog
 * Joystick's round brass puck, and the hand-cut and Brass chips.
 *
 * The first family is the fallback when no load has been shuffled (the style
 * guide, tests): it is the pre-family default of all three parts.
 */
export const EDITION_FAMILIES = [
  { id: "tab", name: "Tab", tabs: { geometry: "tab", tone: "ivory" }, knob: "arc", joystick: "analog", meetsFloor: true },
  { id: "offcut", name: "Offcut", tabs: { geometry: "offcut", tone: "ivory" }, knob: "arc", joystick: "analog", meetsFloor: true },
  { id: "rip", name: "Rip", tabs: { geometry: "rip", tone: "ivory" }, knob: "arc", joystick: "analog", meetsFloor: true },
  { id: "brass", name: "Brass", tabs: { geometry: "tab", tone: "brass" }, knob: "arc", joystick: "analog", meetsFloor: true },
  { id: "tile", name: "Tile", tabs: { geometry: "tile", tone: "ivory" }, knob: "ring", joystick: "digital", meetsFloor: true },
  { id: "sharp", name: "Sharp", tabs: { geometry: "sharp", tone: "ivory" }, knob: "ring", joystick: "digital", meetsFloor: true },
  { id: "marquee", name: "Marquee", tabs: { geometry: "marquee", tone: "ivory" }, knob: "ring", joystick: "digital", meetsFloor: true },
] as const satisfies readonly EditionFamily[];

export type EditionFamilyId = (typeof EDITION_FAMILIES)[number]["id"];

/** The default Look: each load picks one family for every part. */
export const SHUFFLE = "shuffle";
export type EditionLook = typeof SHUFFLE | EditionFamilyId;

/** `?edition=<family id>` pins any family for review and snapshots. */
export const EDITION_QUERY_PARAMETER = "edition";

export const SHUFFLE_FAMILIES: readonly EditionFamily[] = EDITION_FAMILIES.filter(
  (family) => family.meetsFloor,
);

const STORAGE_KEY = "emotitone.edition.family";
/** Per-part rotation pointers from before families; removed on first shuffle. */
const RETIRED_STORAGE_KEYS = [
  "emotitone.tabs.edition",
  "emotitone.knob.visual",
  "emotitone.joystick.visual",
];

type EditionStorage = Pick<Storage, "getItem" | "setItem"> & Partial<Pick<Storage, "removeItem">>;

const FALLBACK_FAMILY: EditionFamily = EDITION_FAMILIES[0];

export function isEditionFamilyId(value: unknown): value is EditionFamilyId {
  return EDITION_FAMILIES.some((family) => family.id === value);
}

export function isEditionLook(value: unknown): value is EditionLook {
  return value === SHUFFLE || isEditionFamilyId(value);
}

/** Looks a player may choose in Config: Shuffle and every family on the floor. */
export const PINNABLE_LOOKS: readonly { value: EditionLook; label: string }[] = [
  { value: SHUFFLE, label: "Shuffle" },
  ...SHUFFLE_FAMILIES.map((family) => ({ value: family.id as EditionFamilyId, label: family.name })),
];

function familyById(id: string): EditionFamily {
  return EDITION_FAMILIES.find((family) => family.id === id) ?? FALLBACK_FAMILY;
}

const shuffledId = ref<string>(FALLBACK_FAMILY.id);
const pinnedLook = ref<EditionLook>(SHUFFLE);
const reviewId = ref<EditionFamilyId | null>(null);

const activeFamily = computed<EditionFamily>(() => {
  if (reviewId.value) return familyById(reviewId.value);
  if (pinnedLook.value !== SHUFFLE) return familyById(pinnedLook.value);
  return familyById(shuffledId.value);
});

function browserStorage(): EditionStorage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Shuffle for this load: a random family from the floor-meeting set, never the
 * one the previous load showed, so a reload always changes the look.
 */
export function beginEditionShuffle(
  storage: EditionStorage | undefined = browserStorage(),
  random: () => number = Math.random,
): EditionFamily {
  let previous: string | null = null;
  try {
    previous = storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    previous = null;
  }

  const fresh = SHUFFLE_FAMILIES.filter((family) => family.id !== previous);
  const candidates = fresh.length > 0 ? fresh : SHUFFLE_FAMILIES;
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  const picked = candidates[index] ?? FALLBACK_FAMILY;
  shuffledId.value = picked.id;

  try {
    storage?.setItem(STORAGE_KEY, picked.id);
    for (const key of RETIRED_STORAGE_KEYS) storage?.removeItem?.(key);
  } catch {
    // The pick stays stable in memory when storage is unavailable.
  }

  return picked;
}

/** Reads `?edition=<family>`; an unknown or missing value leaves no review pin. */
export function readEditionReviewPin(
  search: string = typeof window === "undefined" ? "" : window.location.search,
): EditionFamilyId | null {
  const requested = new URLSearchParams(search).get(EDITION_QUERY_PARAMETER)?.trim().toLowerCase();
  reviewId.value = isEditionFamilyId(requested) ? requested : null;
  return reviewId.value;
}

/** Applies the Look chosen in Config; anything unrecognised means Shuffle. */
export function pinEditionLook(look: unknown) {
  pinnedLook.value = isEditionLook(look) ? look : SHUFFLE;
}

/** The family every unpinned Tabs, Knob and Joystick presents right now. */
export function useEditionFamily() {
  return activeFamily;
}
