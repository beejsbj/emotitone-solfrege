import { getCurrentScope, onScopeDispose, ref } from "vue";
import type { HeadsUpEntry, HeadsUpSignal } from "@/types/headsUp";

/** At most this many show; a newer one evicts the oldest. */
export const HEADS_UP_MAX = 3;

/** How long each signal stays before it fades (BJS-592; tune on the phone). */
export const HEADS_UP_MS: Record<HeadsUpSignal, number> = {
  warning: 4000,
  problem: 7000,
};

export type HeadsUpInput = Omit<HeadsUpEntry, "id" | "signal" | "role"> & {
  /** Defaults to the line: the same message is the same entry. */
  id?: string;
  signal?: HeadsUpSignal;
  role?: HeadsUpEntry["role"];
};

/**
 * A Heads-up stack's queue: what the instrument is telling you right now,
 * oldest first, newest last (nearest the deck). Each entry fades on its own
 * timer. The app's one queue is the heads-up store; the style guide's
 * specimen keeps its own.
 */
export function useHeadsUpQueue() {
  const entries = ref<HeadsUpEntry[]>([]);
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function schedule(entry: HeadsUpEntry) {
    clearTimeout(timers.get(entry.id));
    timers.set(entry.id, setTimeout(() => dismiss(entry.id), HEADS_UP_MS[entry.signal]));
  }

  /**
   * Show a line. The same message (same id and line) refreshes its timer in
   * place instead of showing twice; a new line under an id already showing
   * replaces it as the newest. A fourth evicts the oldest.
   */
  function raise(input: HeadsUpInput): string {
    const signal = input.signal ?? "problem";
    const entry: HeadsUpEntry = {
      ...input,
      id: input.id ?? input.line,
      signal,
      role: input.role ?? (signal === "problem" ? "alert" : "status"),
    };
    const index = entries.value.findIndex((shown) => shown.id === entry.id);
    const current = entries.value[index];
    if (current && current.line === entry.line && current.signal === entry.signal) {
      entries.value[index] = entry;
    } else {
      if (current) entries.value.splice(index, 1);
      entries.value.push(entry);
      while (entries.value.length > HEADS_UP_MAX) dismiss(entries.value[0].id);
    }
    schedule(entry);
    return entry.id;
  }

  /** Update what a showing entry's hint says, without showing it again or touching its timer. */
  function revise(id: string, patch: Pick<HeadsUpEntry, "hint">) {
    const index = entries.value.findIndex((shown) => shown.id === id);
    if (index >= 0) entries.value[index] = { ...entries.value[index], ...patch };
  }

  /** Put one away: faded, swiped, or no longer true. */
  function dismiss(id: string) {
    clearTimeout(timers.get(id));
    timers.delete(id);
    const index = entries.value.findIndex((shown) => shown.id === id);
    if (index >= 0) entries.value.splice(index, 1);
  }

  function clear() {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    entries.value = [];
  }

  if (getCurrentScope()) onScopeDispose(clear);

  return { entries, raise, revise, dismiss, clear };
}
