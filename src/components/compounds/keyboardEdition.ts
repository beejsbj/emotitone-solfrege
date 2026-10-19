import type { NoteGeometry } from "@/components/primatives/Note.vue";

export const KEYBOARD_GEOMETRY_FAMILIES = [
  "standard",
  "tile",
  "offcut",
  "tab",
  "pill",
] as const satisfies readonly NoteGeometry[];

export type KeyboardGeometryFamily =
  (typeof KEYBOARD_GEOMETRY_FAMILIES)[number];

const CHORD_GEOMETRY_OFFSET = 2;

/**
 * Chords follow the edition family's melody Key geometry while taking a
 * visibly different geometry from it. The offset is a full derangement of the
 * five geometries, so neither row can land on the other's geometry.
 */
export function keyboardChordFamily(
  melodyFamily: KeyboardGeometryFamily,
): KeyboardGeometryFamily {
  const melodyIndex = KEYBOARD_GEOMETRY_FAMILIES.indexOf(melodyFamily);
  return KEYBOARD_GEOMETRY_FAMILIES[
    (melodyIndex + CHORD_GEOMETRY_OFFSET) % KEYBOARD_GEOMETRY_FAMILIES.length
  ];
}

export interface KeyboardEditionVariation {
  cut: string;
  rotation: string;
  shadow: string;
  layer: number;
  variant: number;
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRandom(seed: number) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function pageSeed() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  }

  return Math.floor(Math.random() * 0xffff_ffff).toString(36);
}

export const KEYBOARD_PAGE_EDITION_SEED = pageSeed();

export function keyboardEditionVariation(
  family: KeyboardGeometryFamily,
  editionSeed: string,
  keyId: string,
): KeyboardEditionVariation {
  const random = seededRandom(hashString(`${family}:${editionSeed}:${keyId}`));
  const variant = Math.floor(random() * 3) + 1;
  const rotation = Math.floor(random() * 3) + 1;
  const shadow = Math.floor(random() * 3) + 1;

  return {
    cut: `var(--keyboard-${family}-cut-${variant})`,
    rotation: `var(--keyboard-${family}-rotation-${rotation})`,
    shadow: `var(--keyboard-${family}-shadow-${shadow})`,
    layer: Math.floor(random() * 10_000) + 1,
    variant,
  };
}

export function keyboardEditionRowVariations(
  family: KeyboardGeometryFamily,
  editionSeed: string,
  keyIds: readonly string[],
) {
  let previousVariant: number | undefined;

  return keyIds.map((keyId) => {
    const variation = keyboardEditionVariation(family, editionSeed, keyId);
    if (variation.variant === previousVariant) {
      variation.variant = (variation.variant % 3) + 1;
      variation.cut = `var(--keyboard-${family}-cut-${variation.variant})`;
    }
    previousVariant = variation.variant;
    return [keyId, variation] as const;
  });
}

export function visibleKeyboardOctaves(mainOctave: number, rowCount: number) {
  const requestedRows = Math.max(1, Math.min(8, Math.round(rowCount)));
  const center = Math.max(1, Math.min(8, Math.round(mainOctave)));
  const preferredLow = center - Math.floor((requestedRows - 1) / 2);
  const low = Math.max(1, Math.min(9 - requestedRows, preferredLow));

  return Array.from(
    { length: requestedRows },
    (_, index) => low + requestedRows - index - 1,
  );
}
