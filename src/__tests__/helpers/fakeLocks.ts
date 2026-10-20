/** A minimal Web Locks manager shared by "tabs": exclusive locks, queued by name. */
export function fakeLocks(): Navigator["locks"] {
  const held = new Set<string>();
  const pending: string[] = [];
  const waiters = new Map<string, Array<() => void>>();
  const grant = (name: string, callback: () => Promise<void>) => {
    held.add(name);
    return callback().finally(() => {
      held.delete(name);
      waiters.get(name)?.shift()?.();
    });
  };
  const manager = {
    request(name: string, callback: () => Promise<void>) {
      if (!held.has(name)) return grant(name, callback);
      pending.push(name);
      return new Promise<void>((resolve) => {
        const queue = waiters.get(name) ?? [];
        queue.push(() => {
          pending.splice(pending.indexOf(name), 1);
          void grant(name, callback).then(resolve);
        });
        waiters.set(name, queue);
      });
    },
    async query() {
      return { held: [...held].map((name) => ({ name })), pending: pending.map((name) => ({ name })) };
    },
  };
  return manager as unknown as Navigator["locks"];
}
