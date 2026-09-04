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

export interface KeyboardEditionVariation {
  cut: string;
  rotation: string;
  shadow: string;
  layer: number;
  variant: number;
}

const EPOCH_UTC = Date.UTC(2000, 0, 1);
const DAY_MS = 86_400_000;
const deckCache = new Map<number, KeyboardGeometryFamily[]>();

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

function shuffleFamilies(seed: number) {
  const result = [...KEYBOARD_GEOMETRY_FAMILIES];
  const random = seededRandom(seed);

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function deckForBlock(block: number): KeyboardGeometryFamily[] {
  const safeBlock = Math.max(0, block);
  const cached = deckCache.get(safeBlock);
  if (cached) return cached;

  let previousLast: KeyboardGeometryFamily | undefined;

  for (let index = 0; index <= safeBlock; index += 1) {
    const knownDeck = deckCache.get(index);
    if (knownDeck) {
      previousLast = knownDeck[knownDeck.length - 1];
      continue;
    }

    const deck = shuffleFamilies(hashString(`emotitone-keyboard-day:${index}`));
    if (previousLast && deck[0] === previousLast) {
      const swapIndex = deck.findIndex((family) => family !== previousLast);
      [deck[0], deck[swapIndex]] = [deck[swapIndex], deck[0]];
    }

    deckCache.set(index, deck);
    previousLast = deck[deck.length - 1];
  }

  return deckCache.get(safeBlock)!;
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDayIndex(date: Date) {
  const localMidnightAsUtc = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  return Math.max(0, Math.floor((localMidnightAsUtc - EPOCH_UTC) / DAY_MS));
}

export function keyboardFamilyForDate(date = new Date()): KeyboardGeometryFamily {
  const dayIndex = localDayIndex(date);
  const block = Math.floor(dayIndex / KEYBOARD_GEOMETRY_FAMILIES.length);
  const position = dayIndex % KEYBOARD_GEOMETRY_FAMILIES.length;
  return deckForBlock(block)[position];
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
  const requestedRows = [1, 3, 5, 7].includes(rowCount) ? rowCount : 3;
  const halfRows = Math.floor(requestedRows / 2);
  const octaves: number[] = [];

  for (let offset = -halfRows; offset <= halfRows; offset += 1) {
    const octave = mainOctave + offset;
    if (octave >= 1 && octave <= 8) octaves.push(octave);
  }

  return octaves.sort((a, b) => b - a);
}
