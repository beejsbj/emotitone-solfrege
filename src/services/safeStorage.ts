import { computed, ref } from "vue";
import { createPersistedState } from "pinia-plugin-persistedstate";

/**
 * One place where every persisted write goes, so a full or failing store
 * never loses a take silently. Writes that throw are caught here, reported
 * once per failure burst, and the in-memory state that asked for the write is
 * left exactly as it was.
 */

export type SaveFailureKind = "quota" | "unknown";

/** What the player reads. Later kinds (e.g. a full phrase shelf) add a row here. */
export const SAVE_FAILURE_MESSAGES: Record<SaveFailureKind, string> = {
  quota: "Can't save — storage full",
  unknown: "Can't save",
};

interface FailureBurst {
  kind: SaveFailureKind;
  dismissed: boolean;
}

/** How long a one-off failure (an explicit save) stays up when nothing keeps failing. */
export const ONE_OFF_NOTICE_MS = 6000;

// A burst runs from the first failed write until nothing is still failing.
// Two sorts of failure keep it open:
//  - an autosaved key (Pinia stores, the visual config) stays failing until
//    that same key writes successfully; tracking keys, not "any success", keeps
//    a small key that still fits from clearing the notice while a large one
//    keeps failing;
//  - a one-off failure (an explicit save such as a Stage Look) can't recover
//    by itself, since nothing rewrites it, so it only keeps the notice up for
//    a few seconds instead of for the whole session.
const burst = ref<FailureBurst | null>(null);
const failedKeys = new Set<string>();
// Keys that were already failing when the player dismissed the notice. A
// failure of any other key, or of a key that has since recovered, is news and
// shows the notice again.
const dismissedKeys = new Set<string>();
let oneOffPending = false;
let oneOffTimer: ReturnType<typeof setTimeout> | undefined;

/** The failure the player should currently see, or null. */
export const saveFailureNotice = computed(() => {
  const current = burst.value;
  if (!current || current.dismissed) return null;
  return { kind: current.kind, message: SAVE_FAILURE_MESSAGES[current.kind] };
});

/** True while a failure burst is open, even if the player dismissed the notice. */
export const hasSaveFailure = computed(() => burst.value !== null);

function closeIfSettled(): void {
  if (failedKeys.size === 0 && !oneOffPending) {
    burst.value = null;
    dismissedKeys.clear();
  }
}

function clearOneOff(): void {
  oneOffPending = false;
  if (oneOffTimer !== undefined) clearTimeout(oneOffTimer);
  oneOffTimer = undefined;
}

/**
 * The single handler for persistence failures. Shows the notice when a burst
 * opens, and shows it again if the player dismissed it and something new then
 * fails. `key` ties the failure to an autosaved write so that key's next
 * success ends it; `oneOff` marks a failure that nothing will retry.
 */
export function reportSaveFailure(
  kind: SaveFailureKind,
  key?: string,
  oneOff = false,
): void {
  let isNews: boolean;
  if (oneOff || key === undefined) {
    isNews = true;
    oneOffPending = true;
    if (oneOffTimer !== undefined) clearTimeout(oneOffTimer);
    oneOffTimer = setTimeout(() => {
      oneOffTimer = undefined;
      oneOffPending = false;
      closeIfSettled();
    }, ONE_OFF_NOTICE_MS);
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

/** An autosaved write of `key` succeeded; ends the burst once nothing else is failing. */
export function reportSaveSuccess(key: string): void {
  failedKeys.delete(key);
  dismissedKeys.delete(key);
  closeIfSettled();
}

export function dismissSaveFailure(): void {
  if (!burst.value) return;
  clearOneOff();
  dismissedKeys.clear();
  failedKeys.forEach((key) => dismissedKeys.add(key));
  burst.value = { ...burst.value, dismissed: true };
  closeIfSettled();
}

/** Test seam: forget any open burst. */
export function resetSaveFailure(): void {
  clearOneOff();
  failedKeys.clear();
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
  /**
   * Like setItem, but says whether the value was actually stored. Pass
   * `{ oneOff: true }` for an explicit save that nothing will retry.
   */
  write(key: string, value: string, options?: { oneOff?: boolean }): boolean;
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
  const write = (key: string, value: string, options?: { oneOff?: boolean }): boolean => {
    try {
      const storage = backend();
      if (!storage) throw new Error("Storage is unavailable");
      storage.setItem(key, value);
      reportSaveSuccess(key);
      return true;
    } catch (error) {
      // Log once per burst; the notice is the player-facing signal.
      if (!hasSaveFailure.value) console.error(`Failed to save "${key}" to storage:`, error);
      reportSaveFailure(isQuotaExceeded(error) ? "quota" : "unknown", key, options?.oneOff);
      return false;
    }
  };

  return {
    getItem: (key) => backend()?.getItem(key) ?? null,
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
    write,
  };
}

/** The app's persisted-write path: Pinia stores and direct writers share it. */
export const persistentStorage = createSafeStorage();

/** pinia plugin that persists every `persist` store through `persistentStorage`. */
export const persistedStatePlugin = createPersistedState({ storage: persistentStorage });
