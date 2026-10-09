import { DEFAULT_INSTRUMENT } from "@/data/instruments";
import { isSelectableInstrument } from "@/data/instrumentCatalog";
import { isSameShape, NEUTRAL_SHAPE, sanitizeShape } from "@/services/shape";
import type { Shape } from "@/types/instrument";

export interface PersistedInstrumentState {
  currentInstrument: string;
  instrumentShapes: Record<string, Shape>;
}

/**
 * Read the instrument store's persisted state defensively. The catalog can
 * change between visits, so an instrument the picker no longer offers falls
 * back to the default, and malformed or unselectable Shape entries are dropped.
 */
export function deserializeInstrumentState(raw: string): PersistedInstrumentState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  const record = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};

  const instrumentShapes: Record<string, Shape> = {};
  const storedShapes = record.instrumentShapes;
  if (storedShapes && typeof storedShapes === "object") {
    for (const [instrument, value] of Object.entries(storedShapes)) {
      const shape = isSelectableInstrument(instrument) ? sanitizeShape(value) : null;
      if (shape && !isSameShape(shape, NEUTRAL_SHAPE)) instrumentShapes[instrument] = shape;
    }
  }

  return {
    currentInstrument: isSelectableInstrument(record.currentInstrument)
      ? record.currentInstrument
      : DEFAULT_INSTRUMENT,
    instrumentShapes,
  };
}
