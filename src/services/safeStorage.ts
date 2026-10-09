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

// A burst runs from the first failed write until every key that failed has
// since been written successfully. Tracking keys (not "any success") keeps a
// small key that still fits from clearing and re-raising the notice while a
// large one keeps failing.
const burst = ref<FailureBurst | null>(null);
const failedKeys = new Set<string>();

/** The failure the player should currently see, or null. */
export const saveFailureNotice = computed(() => {
  const current = burst.value;
  if (!current || current.dismissed) return null;
  return { kind: current.kind, message: SAVE_FAILURE_MESSAGES[current.kind] };
});

/** True while a failure burst is open, even if the player dismissed the notice. */
export const hasSaveFailure = computed(() => burst.value !== null);

/**
 * The single handler for persistence failures. Opens a burst (showing the
 * notice) unless one is already open; a burst never re-shows after dismissal.
 * `key` ties the burst to a write so a later success of that key closes it.
 */
export function reportSaveFailure(kind: SaveFailureKind, key?: string): void {
  if (key !== undefined) failedKeys.add(key);
  if (!burst.value) {
    burst.value = { kind, dismissed: false };
  } else if (kind === "quota" && burst.value.kind !== "quota") {
    // Quota is the more useful explanation; upgrade it without re-showing.
    burst.value = { ...burst.value, kind };
  }
}

/** A write of `key` succeeded; closes the burst once every failed key has recovered. */
export function reportSaveSuccess(key: string): void {
  if (!failedKeys.delete(key)) return;
  if (failedKeys.size === 0) burst.value = null;
}

export function dismissSaveFailure(): void {
  if (burst.value) burst.value = { ...burst.value, dismissed: true };
}

/** Test seam: forget any open burst. */
export function resetSaveFailure(): void {
  failedKeys.clear();
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
  /** Like setItem, but says whether the value was actually stored. */
  write(key: string, value: string): boolean;
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
  const write = (key: string, value: string): boolean => {
    try {
      const storage = backend();
      if (!storage) throw new Error("Storage is unavailable");
      storage.setItem(key, value);
      reportSaveSuccess(key);
      return true;
    } catch (error) {
      console.error(`Failed to save "${key}" to storage:`, error);
      reportSaveFailure(isQuotaExceeded(error) ? "quota" : "unknown", key);
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
