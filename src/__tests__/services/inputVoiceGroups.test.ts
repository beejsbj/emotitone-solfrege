import { describe, expect, it, vi } from "vitest";
import { createVoiceGroupLifecycle } from "@/services/inputVoiceGroups";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("input voice-group lifecycle", () => {
  it("keeps shared pitches independent across chord and melody owners", async () => {
    const release = vi.fn();
    const groups = createVoiceGroupLifecycle(release);
    const chord = groups.attack("chord:pointer:one", [
      async () => "chord-C4",
      async () => "chord-E4",
      async () => "chord-G4",
    ]);
    const melody = groups.attack("melody:pointer:one", [async () => "melody-C4"]);
    await Promise.all([chord, melody]);

    groups.release("chord:pointer:one");
    expect(release.mock.calls.flat()).toEqual(["chord-C4", "chord-E4", "chord-G4"]);
    expect(groups.hasOwner("melody:pointer:one")).toBe(true);

    groups.release("melody:pointer:one");
    expect(release).toHaveBeenLastCalledWith("melody-C4");
  });

  it("keeps shared pitches independent across two chord owners and contacts", async () => {
    const release = vi.fn();
    const groups = createVoiceGroupLifecycle(release);
    await Promise.all([
      groups.attack("chord:touch:1", [async () => "one-G4"]),
      groups.attack("chord:touch:2", [async () => "two-G4"]),
    ]);

    groups.release("chord:touch:1");
    expect(release).toHaveBeenCalledExactlyOnceWith("one-G4");
    expect(groups.hasOwner("chord:touch:2")).toBe(true);
  });

  it("releases late voices when input ends before async attack resolves", async () => {
    const pending = deferred<string | null>();
    const release = vi.fn();
    const groups = createVoiceGroupLifecycle(release);
    const completion = groups.attack("melody:mouse", [() => pending.promise]);

    groups.release("melody:mouse");
    pending.resolve("late-C4");
    await completion;

    expect(release).toHaveBeenCalledExactlyOnceWith("late-C4");
    expect(groups.hasOwner("melody:mouse")).toBe(false);
  });

  it("releases every resolved and pending voice on blur or unmount cleanup", async () => {
    const pending = deferred<string | null>();
    const release = vi.fn();
    const groups = createVoiceGroupLifecycle(release);
    await groups.attack("chord:resolved", [async () => "resolved-C4"]);
    const pendingCompletion = groups.attack("melody:pending", [() => pending.promise]);

    groups.releaseAll();
    pending.resolve("pending-E4");
    await pendingCompletion;

    expect(release.mock.calls.flat()).toEqual(["resolved-C4", "pending-E4"]);
    expect(groups.hasOwner("chord:resolved")).toBe(false);
    expect(groups.hasOwner("melody:pending")).toBe(false);
  });

  it("articulates duplicate unison voices independently inside one group", async () => {
    const release = vi.fn();
    const groups = createVoiceGroupLifecycle(release);
    await groups.attack("chord:unison", [
      async () => "C4-voice-a",
      async () => "C4-voice-b",
    ]);

    groups.release("chord:unison");
    expect(release.mock.calls.flat()).toEqual(["C4-voice-a", "C4-voice-b"]);
  });
});
