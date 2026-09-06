import { beforeEach, describe, expect, it, vi } from "vitest";

const lifecycle = vi.hoisted(() => ({ unmounted: [] as Array<() => void> }));
const mocks = vi.hoisted(() => ({
  attack: vi.fn(),
  release: vi.fn(),
  addTouch: vi.fn(),
  removeTouch: vi.fn(),
}));

vi.mock("vue", async () => {
  const actual = await vi.importActual<typeof import("vue")>("vue");
  return {
    ...actual,
    onMounted: (callback: () => void) => callback(),
    onUnmounted: (callback: () => void) => lifecycle.unmounted.push(callback),
  };
});

vi.mock("@/stores/music", () => ({
  useMusicStore: () => ({
    currentKey: "C",
    attackNoteWithOctave: mocks.attack,
    releaseNote: mocks.release,
    getActiveNotes: vi.fn(() => []),
  }),
}));

vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => ({
    addTouch: mocks.addTouch,
    removeTouch: mocks.removeTouch,
  }),
}));

vi.mock("@/composables/useColorSystem", async () => {
  const { ref } = await import("vue");
  return {
    useColorSystem: () => ({
      getGradient: vi.fn(() => "gradient"),
      isDynamicColorsEnabled: ref(false),
    }),
  };
});

import { useSolfegeInteraction } from "@/composables/useSolfegeInteraction";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("useSolfegeInteraction held note lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lifecycle.unmounted.length = 0;
  });

  it("cancels a pointer press before attack resolves", async () => {
    const attack = deferred<string | null>();
    mocks.attack.mockReturnValueOnce(attack.promise);
    const controls = useSolfegeInteraction();

    const completion = controls.attackNoteForPress("mouse:0_4", 0, 4);
    expect(mocks.addTouch).toHaveBeenCalledWith("mouse:0_4", "0_4");

    controls.releaseNoteForPress("mouse:0_4");
    expect(mocks.removeTouch).toHaveBeenCalledWith("mouse:0_4");

    attack.resolve("pointer-note");
    await completion;
    expect(mocks.release).toHaveBeenCalledWith("pointer-note");
    expect(controls.activeNoteIds.value).toHaveLength(0);
  });

  it("keeps simultaneous same-pitch pointer and focus owners independent", async () => {
    mocks.attack
      .mockResolvedValueOnce("pointer-note")
      .mockResolvedValueOnce("focus-note");
    const controls = useSolfegeInteraction();

    await Promise.all([
      controls.attackNoteForPress("mouse:0_4", 0, 4),
      controls.attackNoteForPress("focus:Enter:0_4", 0, 4),
    ]);

    expect(controls.activeNoteIds.value).toEqual(new Map([
      ["mouse:0_4", "pointer-note"],
      ["focus:Enter:0_4", "focus-note"],
    ]));

    controls.releaseNoteForPress("mouse:0_4");
    expect(mocks.release).toHaveBeenCalledWith("pointer-note");
    expect(controls.activeNoteIds.value.get("focus:Enter:0_4")).toBe("focus-note");
  });

  it("cleans failed attacks and releases pending focus input on teardown", async () => {
    const failed = deferred<string | null>();
    const pending = deferred<string | null>();
    mocks.attack
      .mockReturnValueOnce(failed.promise)
      .mockReturnValueOnce(pending.promise);
    const controls = useSolfegeInteraction();

    const failedCompletion = controls.attackNoteForPress("mouse:0_4", 0, 4);
    failed.reject(new Error("attack failed"));
    await failedCompletion;
    expect(mocks.removeTouch).toHaveBeenCalledWith("mouse:0_4");

    const pendingCompletion = controls.attackNoteForPress(
      "focus:Space:1_4",
      1,
      4,
    );
    lifecycle.unmounted.forEach((callback) => callback());
    pending.resolve("focus-note");
    await pendingCompletion;

    expect(mocks.removeTouch).toHaveBeenCalledWith("focus:Space:1_4");
    expect(mocks.release).toHaveBeenCalledWith("focus-note");
  });
});
