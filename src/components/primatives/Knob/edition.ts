import type { KnobVisual } from "./types";

const KNOB_EDITION_STORAGE_KEY = "emotitone.knob.visual";
const INITIAL_KNOB_VISUAL: KnobVisual = "arc";

let pageKnobVisual: KnobVisual = INITIAL_KNOB_VISUAL;

type KnobEditionStorage = Pick<Storage, "getItem" | "setItem">;

export function nextKnobVisual(previous: string | null | undefined): KnobVisual {
  return previous === "ring" ? "arc" : "ring";
}

function browserStorage(): KnobEditionStorage | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Chooses one shared Knob presentation for this app load and records it so the
 * next load receives the opposite presentation. The existing Digital Arc is
 * treated as the pre-feature edition, so a first load begins with Analog Ring.
 */
export function beginKnobPageEdition(
  storage: KnobEditionStorage | undefined = browserStorage(),
): KnobVisual {
  let previous: string | null = null;

  try {
    previous = storage?.getItem(KNOB_EDITION_STORAGE_KEY) ?? null;
  } catch {
    previous = null;
  }

  pageKnobVisual = nextKnobVisual(previous);

  try {
    storage?.setItem(KNOB_EDITION_STORAGE_KEY, pageKnobVisual);
  } catch {
    // Storage can be unavailable in privacy-restricted contexts. The chosen
    // presentation still remains stable for this page load.
  }

  return pageKnobVisual;
}

export function currentKnobPageVisual(): KnobVisual {
  return pageKnobVisual;
}
