import { toRaw } from "vue";
import { sameJson } from "@/services/persistenceCodec";

/**
 * Merging entries by id against a base: the rule two tabs share (BJS-575 for
 * the phrase shelf, BJS-579 for named appearance presets). `base` is the list
 * both tabs last agreed on; what each tab did since is read against it. A
 * tab's own entries keep their live objects. Rules in docs/persistence-codec.md,
 * "Two tabs".
 */

export interface WithId { id: string }

/** One value, three ways. `conflict` decides when both sides changed it. */
export function mergeValue<V>(hasBase: boolean, base: unknown, oursSaved: unknown, ours: V, theirs: V, conflict: () => V): V {
  if (sameJson(oursSaved, theirs)) return ours;
  if (hasBase && sameJson(oursSaved, base)) return theirs;
  if (hasBase && sameJson(theirs, base)) return ours;
  return conflict();
}

/**
 * Entries keyed by id: ours in our order, then entries only theirs has.
 * `both` merges an entry both tabs changed; `theirsChanged` takes in an entry
 * only the other tab changed (by default its stored copy, but the phrase merge
 * goes field by field so this tab's live data survives where nothing changed).
 */
export function mergeById<E extends WithId>(
  base: readonly WithId[] | undefined,
  ours: readonly E[],
  theirs: readonly E[],
  saved: (entry: E) => unknown,
  both: (base: E | undefined, ours: E, theirs: E) => E,
  keep: (id: string) => boolean,
  theirsChanged: (base: E, ours: E, theirs: E) => E = (_base, _ours, other) => other,
): E[] {
  const baseById = new Map((base ?? []).map((entry) => [entry.id, entry as E]));
  const theirsById = new Map(theirs.map((entry) => [entry.id, entry]));
  const oursIds = new Set(ours.map((entry) => entry.id));
  const merged: E[] = [];
  for (const entry of ours) {
    const before = baseById.get(entry.id);
    const other = theirsById.get(entry.id);
    const mine = saved(entry);
    if (other) {
      if (sameJson(mine, other)) merged.push(entry);
      else if (before && sameJson(mine, before)) merged.push(theirsChanged(before, entry, other));
      else if (before && sameJson(other, before)) merged.push(entry);
      else merged.push(both(before, entry, other));
    } else if (!before || !sameJson(mine, before) || keep(entry.id)) {
      // New here, changed here since the other tab released it, or still needed here.
      merged.push(entry);
    }
    // Otherwise the other tab released it and this tab had not touched it.
  }
  for (const entry of theirs) {
    if (oursIds.has(entry.id)) continue;
    const before = baseById.get(entry.id);
    // New there, changed there since this tab released it, or still needed here.
    if (!before || !sameJson(entry, before) || keep(entry.id)) merged.push(entry);
  }
  return merged;
}

/** Field by field; this tab's value wins where both changed it. */
export function mergeFields<E extends WithId>(base: E | undefined, ours: E, theirs: E): E {
  const live = toRaw(ours) as unknown as Record<string, unknown>;
  const other = theirs as unknown as Record<string, unknown>;
  const before = base as unknown as Record<string, unknown> | undefined;
  const merged: Record<string, unknown> = {};
  for (const key of new Set([...Object.keys(live), ...Object.keys(other), ...Object.keys(before ?? {})])) {
    const value = mergeValue(Boolean(before), before?.[key], live[key], live[key], other[key], () => live[key]);
    if (value !== undefined) merged[key] = value;
  }
  return merged as unknown as E;
}
