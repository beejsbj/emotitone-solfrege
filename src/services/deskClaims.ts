/**
 * Which open takes a live tab is still playing into (BJS-575). Every tab holds
 * a Web Lock named after its open take for as long as that take is on its
 * desk; the browser releases it when the tab closes or crashes. A take stored
 * with shelf "take" that no tab holds was left behind by a tab that is gone:
 * the store shelves it (Recent if it has notes) so the sketch is not hidden.
 *
 * Without the Web Locks API nothing is claimed and nothing is reported as
 * unclaimed: other tabs' takes are left alone (they surface in Recent once
 * their tab moves on, and a take left behind stays stored but off the shelves).
 */

const PREFIX = "emotitone-desk:";

type LockManagerLike = Pick<LockManager, "request" | "query">;

export interface DeskClaims {
  /** Hold `takeId` for this tab, releasing the previous one. */
  claim(takeId: string): void;
  /** Of these take ids, those no live tab holds. Empty without Web Locks. */
  unclaimed(takeIds: readonly string[]): Promise<string[]>;
  dispose(): void;
}

function defaultLocks(): LockManagerLike | undefined {
  try {
    return typeof navigator === "undefined" ? undefined : navigator.locks;
  } catch {
    return undefined;
  }
}

export function createDeskClaims(locks: LockManagerLike | undefined = defaultLocks()): DeskClaims {
  let held: string | null = null;
  let release: (() => void) | null = null;
  return {
    claim(takeId) {
      if (takeId === held) return;
      release?.();
      release = null;
      held = takeId;
      if (!locks) return;
      const done = new Promise<void>((resolve) => { release = resolve; });
      // Two tabs on one shared take queue for the same name; either counts as held.
      void locks.request(PREFIX + takeId, () => done).catch(() => {});
    },
    async unclaimed(takeIds) {
      if (!locks || !takeIds.length) return [];
      try {
        const { held: holding = [], pending = [] } = await locks.query();
        const live = new Set([...holding, ...pending].map((lock) => lock.name));
        return takeIds.filter((id) => !live.has(PREFIX + id));
      } catch {
        return [];
      }
    },
    dispose() {
      release?.();
      release = null;
      held = null;
    },
  };
}
