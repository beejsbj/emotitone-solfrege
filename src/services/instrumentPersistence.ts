import { DEFAULT_INSTRUMENT } from "@/data/instruments";
import { isSelectableInstrument } from "@/data/instrumentCatalog";
import { createPersistedBinding, UNVERSIONED } from "@/services/persistenceCodec";
import { isSameShape, NEUTRAL_SHAPE, sanitizeShape } from "@/services/shape";
import type { Shape } from "@/types/instrument";

export const INSTRUMENT_STORAGE_KEY = "emotitone-instrument";

export interface PersistedInstrumentState {
  currentInstrument: string;
  instrumentShapes: Record<string, Shape>;
}

/**
 * Read the instrument store's saved data defensively. The catalog can change
 * between visits, so an instrument the picker no longer offers falls back to
 * the default, and malformed or unselectable Shape entries are dropped.
 */
export function decodeInstrumentState(data: unknown): PersistedInstrumentState {
  const record = data && typeof data === "object" ? data as Record<string, unknown> : {};

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

/**
 * Version history of `emotitone-instrument`:
 *  - 0: `{ currentInstrument, instrumentShapes }`, no envelope (before codecs).
 *  - 1: the same shape inside the `$version` envelope.
 */
export const instrumentPersistence = createPersistedBinding<PersistedInstrumentState>({
  key: INSTRUMENT_STORAGE_KEY,
  version: 1,
  defaults: () => ({ currentInstrument: DEFAULT_INSTRUMENT, instrumentShapes: {} }),
  decode: decodeInstrumentState,
  migrations: {
    [UNVERSIONED]: (data) => data,
  },
});
