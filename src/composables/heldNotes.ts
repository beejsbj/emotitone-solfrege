import { reactive } from "vue";

export interface HeldNotePress {
  pressId: string;
}

export type HeldNoteResolution =
  | { status: "active"; noteId: string }
  | { status: "released"; noteId: string }
  | { status: "failed"; error?: unknown };

export interface HeldNotesOptions<Press extends HeldNotePress> {
  attack: (press: Press) => Promise<string | null>;
  release: (noteId: string, press: Press) => void;
  onPressed?: (press: Press) => void;
  onUnpressed?: (press: Press) => void;
  beforeNoteRelease?: (noteId: string, press: Press) => void;
  onAttackFailure?: (press: Press, error?: unknown) => void;
}

interface HeldNoteGeneration<Press extends HeldNotePress> {
  generation: number;
  press: Press;
  released: boolean;
  noteId?: string;
  completion: Promise<HeldNoteResolution>;
}

/**
 * Owns the asynchronous lifetime of notes keyed by physical input identity.
 *
 * A released pending generation stays alive only long enough to release any
 * eventual note ID. A later press with the same ID gets a new generation, so
 * stale completion can never replace or release the newer note.
 */
export function createHeldNotes<Press extends HeldNotePress>(
  options: HeldNotesOptions<Press>
) {
  const currentGenerations = new Map<string, HeldNoteGeneration<Press>>();
  const activeNoteIds = reactive(new Map<string, string>());
  let nextGeneration = 0;

  const unpress = (entry: HeldNoteGeneration<Press>) => {
    if (entry.released) {
      return;
    }

    entry.released = true;
    options.onUnpressed?.(entry.press);
  };

  const releaseResolvedNote = (
    entry: HeldNoteGeneration<Press>,
    noteId: string
  ) => {
    options.beforeNoteRelease?.(noteId, entry.press);
    options.release(noteId, entry.press);
    activeNoteIds.delete(entry.press.pressId);
  };

  const settleFailure = (
    entry: HeldNoteGeneration<Press>,
    error?: unknown
  ): HeldNoteResolution => {
    unpress(entry);
    if (currentGenerations.get(entry.press.pressId) === entry) {
      currentGenerations.delete(entry.press.pressId);
      activeNoteIds.delete(entry.press.pressId);
    }
    options.onAttackFailure?.(entry.press, error);
    return { status: "failed", error };
  };

  const press = (value: Press): Promise<HeldNoteResolution> => {
    const existing = currentGenerations.get(value.pressId);
    if (existing && !existing.released) {
      return existing.completion;
    }

    const entry: HeldNoteGeneration<Press> = {
      generation: ++nextGeneration,
      press: value,
      released: false,
      completion: Promise.resolve({ status: "failed" }),
    };
    currentGenerations.set(value.pressId, entry);
    options.onPressed?.(value);

    let attack: Promise<string | null>;
    try {
      attack = options.attack(value);
    } catch (error) {
      entry.completion = Promise.resolve(settleFailure(entry, error));
      return entry.completion;
    }

    entry.completion = attack.then(
      (noteId): HeldNoteResolution => {
        if (!noteId) {
          return settleFailure(entry);
        }

        entry.noteId = noteId;
        const isCurrent = currentGenerations.get(value.pressId) === entry;
        if (entry.released || !isCurrent) {
          releaseResolvedNote(entry, noteId);
          if (isCurrent) {
            currentGenerations.delete(value.pressId);
          }
          return { status: "released", noteId };
        }

        activeNoteIds.set(value.pressId, noteId);
        return { status: "active", noteId };
      },
      (error): HeldNoteResolution => settleFailure(entry, error)
    );

    return entry.completion;
  };

  const release = (pressId: string): boolean => {
    const entry = currentGenerations.get(pressId);
    if (!entry || entry.released) {
      return false;
    }

    unpress(entry);
    if (entry.noteId) {
      currentGenerations.delete(pressId);
      releaseResolvedNote(entry, entry.noteId);
    }
    return true;
  };

  const releaseWhere = (matches: (press: Press) => boolean) => {
    for (const entry of Array.from(currentGenerations.values())) {
      if (matches(entry.press)) {
        release(entry.press.pressId);
      }
    }
  };

  const releaseAll = () => releaseWhere(() => true);

  return {
    press,
    release,
    releaseWhere,
    releaseAll,
    isHeld: (pressId: string) => {
      const entry = currentGenerations.get(pressId);
      return Boolean(entry && !entry.released);
    },
    getActiveNoteIds: (): ReadonlyMap<string, string> => activeNoteIds,
  };
}
