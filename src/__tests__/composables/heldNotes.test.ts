import { describe, expect, it, vi } from "vitest";
import { createHeldNotes } from "@/composables/heldNotes";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

interface TestPress {
  pressId: string;
  pitch: string;
}

function createHarness() {
  const attacks: Array<ReturnType<typeof deferred<string | null>>> = [];
  const release = vi.fn();
  const onPressed = vi.fn();
  const onUnpressed = vi.fn();
  const onAttackFailure = vi.fn();
  const heldNotes = createHeldNotes<TestPress>({
    attack: () => {
      const attack = deferred<string | null>();
      attacks.push(attack);
      return attack.promise;
    },
    release,
    onPressed,
    onUnpressed,
    onAttackFailure,
  });

  return {
    attacks,
    heldNotes,
    onAttackFailure,
    onPressed,
    onUnpressed,
    release,
  };
}

describe("held note ownership", () => {
  it("releases an eventual note when its press ended during attack", async () => {
    const harness = createHarness();
    const completion = harness.heldNotes.press({ pressId: "pointer:1", pitch: "C4" });

    expect(harness.heldNotes.release("pointer:1")).toBe(true);
    harness.attacks[0].resolve("note-1");

    await expect(completion).resolves.toEqual({ status: "released", noteId: "note-1" });
    expect(harness.release).toHaveBeenCalledWith(
      "note-1",
      expect.objectContaining({ pressId: "pointer:1" })
    );
    expect(harness.heldNotes.isHeld("pointer:1")).toBe(false);
    expect(harness.heldNotes.getActiveNoteIds()).toHaveLength(0);
  });

  it("keeps a rapid re-press independent from stale completion", async () => {
    const harness = createHarness();
    const first = harness.heldNotes.press({ pressId: "keyboard:Q", pitch: "C4" });
    harness.heldNotes.release("keyboard:Q");
    const second = harness.heldNotes.press({ pressId: "keyboard:Q", pitch: "C4" });

    harness.attacks[1].resolve("current-note");
    await expect(second).resolves.toEqual({ status: "active", noteId: "current-note" });
    harness.attacks[0].resolve("stale-note");
    await first;
    expect(harness.release).toHaveBeenCalledWith(
      "stale-note",
      expect.objectContaining({ pressId: "keyboard:Q" })
    );
    expect(harness.heldNotes.isHeld("keyboard:Q")).toBe(true);
    expect(harness.heldNotes.getActiveNoteIds().get("keyboard:Q")).toBe("current-note");
  });

  it("gives simultaneous same-pitch owners separate notes and idempotent repeats", async () => {
    const harness = createHarness();
    const first = harness.heldNotes.press({ pressId: "touch:1", pitch: "C4" });
    const repeated = harness.heldNotes.press({ pressId: "touch:1", pitch: "C4" });
    const second = harness.heldNotes.press({ pressId: "touch:2", pitch: "C4" });

    expect(repeated).toBe(first);
    expect(harness.attacks).toHaveLength(2);
    harness.attacks[0].resolve("note-1");
    harness.attacks[1].resolve("note-2");
    await Promise.all([first, second]);

    harness.heldNotes.release("touch:1");
    expect(harness.release).toHaveBeenCalledWith(
      "note-1",
      expect.objectContaining({ pressId: "touch:1" })
    );
    expect(harness.heldNotes.getActiveNoteIds().get("touch:2")).toBe("note-2");
  });

  it("cleans up rejected attacks and cancels every generation on teardown", async () => {
    const harness = createHarness();
    const failed = harness.heldNotes.press({ pressId: "midi:a", pitch: "C4" });
    const pending = harness.heldNotes.press({ pressId: "midi:b", pitch: "D4" });

    harness.attacks[0].reject(new Error("audio unavailable"));
    await expect(failed).resolves.toMatchObject({ status: "failed" });
    expect(harness.onAttackFailure).toHaveBeenCalledWith(
      expect.objectContaining({ pressId: "midi:a" }),
      expect.any(Error)
    );

    harness.heldNotes.releaseAll();
    harness.attacks[1].resolve("note-after-teardown");
    await pending;
    expect(harness.release).toHaveBeenCalledWith(
      "note-after-teardown",
      expect.objectContaining({ pressId: "midi:b" })
    );
    expect(harness.onUnpressed).toHaveBeenCalledTimes(2);
  });
});
