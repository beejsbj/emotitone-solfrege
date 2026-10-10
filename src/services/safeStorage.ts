import { computed, ref } from "vue";
import { createPersistedState } from "pinia-plugin-persistedstate";

/**
 * One place where every persisted write goes, so a full or failing store
 * never loses a take silently. Writes that throw are caught here, reported
 * once per failure burst, and the in-memory state that asked for the write is
 * left exactly as it was.
 */

export type SaveFailureKind = "quota" | "unknown" | "newer";

/** What the player reads. Later kinds (e.g. a full phrase shelf) add a row here. */
export const SAVE_FAILURE_MESSAGES: Record<SaveFailureKind, string> = {
  quota: "Can't save — storage full",
  unknown: "Can't save",
  // A newer EmotiTone saved this device's data; this (older) page must not
  // overwrite it. Reloading picks up the newer app.
  newer: "Can't save — reload to update",
};

interface FailureBurst {
  kind: SaveFailureKind;
  dismissed: boolean;
}

// A burst runs from the first failed write until nothing is still failing.
// A failure is tied to the key that failed and ends when that same key writes
// successfully, so a small key that still fits can't clear the notice while a
// large one keeps failing. Two kinds are tracked separately:
//  - autosaved keys (Pinia stores, the visual config) fail again and again, so
//    a dismissal covers the keys already failing and anything new re-raises;
//  - one-off keys (an explicit save such as a Stage Look) fail once, in
//    answer to a tap; a retry of that key ends it, and a repeat failure after a
//    dismissal is news again.
const burst = ref<FailureBurst | null>(null);
const failedKeys = new Set<string>();
const oneOffKeys = new Set<string>();
// Autosaved keys already failing when the player dismissed the notice.
const dismissedKeys = new Set<string>();

/** The failure the player should currently see, or null. */
export const saveFailureNotice = computed(() => {
  const current = burst.value;
  if (!current || current.dismissed) return null;
  return { kind: current.kind, message: SAVE_FAILURE_MESSAGES[current.kind] };
});

/** True while a failure burst is open, even if the player dismissed the notice. */
export const hasSaveFailure = computed(() => burst.value !== null);

function closeIfSettled(): void {
  if (failedKeys.size === 0 && oneOffKeys.size === 0) {
    burst.value = null;
    dismissedKeys.clear();
  }
}

/**
 * The single handler for persistence failures. Shows the notice when a burst
 * opens, and shows it again if the player dismissed it and something new then
 * fails. `key` ties the failure to a write so that key's next success ends
 * it; `oneOff` marks an explicit save that nothing retries on its own.
 */
export function reportSaveFailure(kind: SaveFailureKind, key: string, oneOff = false): void {
  let isNews: boolean;
  if (oneOff) {
    isNews = true;
    oneOffKeys.add(key);
  } else {
    isNews = !dismissedKeys.has(key);
    failedKeys.add(key);
  }

  if (!burst.value) {
    burst.value = { kind, dismissed: false };
    return;
  }
  const upgraded = kind === "quota" ? "quota" : burst.value.kind;
  const reopen = isNews && burst.value.dismissed;
  if (reopen) dismissedKeys.clear();
  burst.value = {
    kind: upgraded,
    dismissed: reopen ? false : burst.value.dismissed,
  };
}

/** A write of `key` succeeded; ends the burst once nothing else is failing. */
export function reportSaveSuccess(key: string): void {
  failedKeys.delete(key);
  oneOffKeys.delete(key);
  dismissedKeys.delete(key);
  closeIfSettled();
}

export function dismissSaveFailure(): void {
  if (!burst.value) return;
  oneOffKeys.clear();
  dismissedKeys.clear();
  failedKeys.forEach((key) => dismissedKeys.add(key));
  burst.value = { ...burst.value, dismissed: true };
  closeIfSettled();
}

/** Test seam: forget any open burst. */
export function resetSaveFailure(): void {
  failedKeys.clear();
  oneOffKeys.clear();
  dismissedKeys.clear();
  burst.value = null;
}

export function isQuotaExceeded(error: unknown): boolean {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return (
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014
    );
  }
  const candidate = error as { name?: unknown; code?: unknown } | null;
  return (
    candidate?.name === "QuotaExceededError" ||
    candidate?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    candidate?.code === 22 ||
    candidate?.code === 1014
  );
}

export interface SafeStorage extends Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  /** A read that distinguishes a missing key from unavailable or failing storage. */
  read(key: string): { ok: true; value: string | null } | { ok: false };
  /** Every stored key (empty when storage is unavailable). */
  keys(): string[];
  /**
   * Like setItem, but says whether the value was actually stored. Pass
   * `{ oneOff: true }` for an explicit save that nothing will retry.
   */
  write(key: string, value: string, options?: { oneOff?: boolean }): boolean;
  /** Like write, but names why it failed (null when the value was stored). */
  attempt(key: string, value: string, options?: { oneOff?: boolean }): SaveFailureKind | null;
}

/**
 * Wraps a (lazily resolved) Storage. Resolving per call keeps this working
 * where `localStorage` access itself throws (privacy modes) and lets tests
 * swap the backend.
 */
export function createSafeStorage(
  backend: () => Storage | undefined = () => {
    try {
      return typeof window === "undefined" ? undefined : window.localStorage;
    } catch {
      return undefined;
    }
  },
): SafeStorage {
  const attempt = (
    key: string,
    value: string,
    options?: { oneOff?: boolean },
  ): SaveFailureKind | null => {
    try {
      const storage = backend();
      if (!storage) throw new Error("Storage is unavailable");
      storage.setItem(key, value);
      reportSaveSuccess(key);
      return null;
    } catch (error) {
      // Log once per burst; the notice is the player-facing signal.
      if (!hasSaveFailure.value) console.error(`Failed to save "${key}" to storage:`, error);
      const kind: SaveFailureKind = isQuotaExceeded(error) ? "quota" : "unknown";
      reportSaveFailure(kind, key, options?.oneOff);
      return kind;
    }
  };

  const write = (key: string, value: string, options?: { oneOff?: boolean }): boolean =>
    attempt(key, value, options) === null;

  const read = (key: string): ReturnType<SafeStorage["read"]> => {
    try {
      const storage = backend();
      if (!storage) throw new Error("Storage is unavailable");
      return { ok: true, value: storage.getItem(key) };
    } catch (error) {
      if (!hasSaveFailure.value) console.error(`Failed to read "${key}" from storage:`, error);
      reportSaveFailure("unknown", key);
      return { ok: false };
    }
  };

  return {
    read,
    getItem: (key) => {
      const result = read(key);
      return result.ok ? result.value : null;
    },
    setItem: (key, value) => {
      write(key, value);
    },
    removeItem: (key) => {
      try {
        backend()?.removeItem(key);
      } catch (error) {
        console.error(`Failed to remove "${key}" from storage:`, error);
      }
    },
    keys: () => {
      try {
        const storage = backend();
        if (!storage) return [];
        const found: string[] = [];
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index);
          if (key !== null) found.push(key);
        }
        return found;
      } catch {
        return [];
      }
    },
    write,
    attempt,
  };
}

/** The app's persisted-write path: Pinia stores and direct writers share it. */
export const persistentStorage = createSafeStorage();

/** pinia plugin that persists every `persist` store through `persistentStorage`. */
export const persistedStatePlugin = createPersistedState({ storage: persistentStorage });
