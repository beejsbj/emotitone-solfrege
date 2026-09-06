import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vue", async () => {
  const actual = await vi.importActual<typeof import("vue")>("vue");

  return {
    ...actual,
    onMounted: (callback: () => void) => callback(),
    onUnmounted: vi.fn(),
  };
});

import { reactive, ref } from "vue";
import { useKeyboardControls } from "@/composables/useKeyboardControls";

const addEventListenerSpy = vi.spyOn(window, "addEventListener");
const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

const mockMusicStore = reactive({
  currentScale: reactive({ degreeCount: 12 }),
  attackNoteWithOctave: vi.fn().mockResolvedValue("mock-note-id"),
  releaseNote: vi.fn(),
});

const mockPatternsStore = {
  removeLastFromCurrentSketch: vi.fn(),
};

const mockKeyboardDrawerStore = {
  addTouch: vi.fn(),
  removeTouch: vi.fn(),
};

vi.mock("@/stores/music", () => ({
  useMusicStore: () => mockMusicStore,
}));

vi.mock("@/stores/patterns", () => ({
  usePatternsStore: () => mockPatternsStore,
}));

vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => mockKeyboardDrawerStore,
}));

describe("useKeyboardControls", () => {
  const mountedControls: Array<ReturnType<typeof useKeyboardControls>> = [];
  const createControls = () => {
    const controls = useKeyboardControls(ref(4));
    mountedControls.push(controls);
    return controls;
  };

  beforeEach(() => {
    mockMusicStore.currentScale.degreeCount = 12;
    mockMusicStore.attackNoteWithOctave.mockClear();
    mockMusicStore.releaseNote.mockClear();
    mockPatternsStore.removeLastFromCurrentSketch.mockClear();
    mockKeyboardDrawerStore.addTouch.mockClear();
    mockKeyboardDrawerStore.removeTouch.mockClear();
    mockMusicStore.attackNoteWithOctave.mockReset();
    mockMusicStore.attackNoteWithOctave.mockResolvedValue("mock-note-id");
    addEventListenerSpy.mockClear();
    removeEventListenerSpy.mockClear();
  });

  afterEach(() => {
    mountedControls.splice(0).forEach((controls) => {
      controls.cleanupKeyboardListeners();
    });
  });

  it("builds three full 12-key rows for chromatic parity", () => {
    const controls = createControls();
    const mapping = controls.getKeyboardMapping();

    expect(Object.keys(mapping)).toHaveLength(36);
    expect(mapping.Digit1).toEqual({
      solfegeIndex: 0,
      octave: 5,
      label: "1",
    });
    expect(mapping.KeyQ).toEqual({
      solfegeIndex: 0,
      octave: 4,
      label: "Q",
    });
    expect(mapping.Backslash).toEqual({
      solfegeIndex: 11,
      octave: 3,
      label: "\\",
    });
  });

  it("uses the leftmost keys for smaller mode sizes", () => {
    mockMusicStore.currentScale.degreeCount = 5;
    const controls = createControls();
    const mapping = controls.getKeyboardMapping();

    expect(Object.keys(mapping)).toHaveLength(15);
    expect(mapping.Digit5.solfegeIndex).toBe(4);
    expect(mapping.KeyT.solfegeIndex).toBe(4);
    expect(mapping.KeyG.solfegeIndex).toBe(4);
    expect(mapping.Digit6).toBeUndefined();
  });

  it("returns display labels for mapped notes", () => {
    mockMusicStore.currentScale.degreeCount = 12;
    const controls = createControls();

    expect(controls.getKeyboardLetterForNote(11, 3)).toBe("\\");
    expect(controls.getKeyboardLetterForNote(0, 4)).toBe("Q");
  });

  it("releases a key whose attack resolves after keyup", async () => {
    const attack = deferred<string | null>();
    mockMusicStore.attackNoteWithOctave.mockReturnValueOnce(attack.promise);
    const controls = createControls();

    getWindowListener("keydown")(new KeyboardEvent("keydown", { code: "KeyQ", key: "q" }));
    getWindowListener("keyup")(new KeyboardEvent("keyup", { code: "KeyQ", key: "q" }));
    expect(controls.pressedKeys.value.has("KeyQ")).toBe(false);

    attack.resolve("late-note");
    await flushPromises();

    expect(mockMusicStore.releaseNote).toHaveBeenCalledWith("late-note");
    expect(mockKeyboardDrawerStore.removeTouch).toHaveBeenCalledWith("keyboard:KeyQ");
    expect(controls.keyboardNoteIds.value).toHaveLength(0);
  });

  it("does not let stale completion overwrite a rapid re-press", async () => {
    const first = deferred<string | null>();
    const second = deferred<string | null>();
    mockMusicStore.attackNoteWithOctave
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const controls = createControls();

    getWindowListener("keydown")(new KeyboardEvent("keydown", { code: "KeyQ", key: "q" }));
    getWindowListener("keyup")(new KeyboardEvent("keyup", { code: "KeyQ", key: "q" }));
    getWindowListener("keydown")(new KeyboardEvent("keydown", { code: "KeyQ", key: "q" }));

    first.resolve("stale-note");
    await flushPromises();
    expect(mockMusicStore.releaseNote).toHaveBeenCalledWith("stale-note");
    expect(controls.pressedKeys.value.has("KeyQ")).toBe(true);

    second.resolve("current-note");
    await flushPromises();
    expect(controls.keyboardNoteIds.value.get("keyboard:KeyQ")).toBe("current-note");

    getWindowListener("blur")(new Event("blur"));
    expect(mockMusicStore.releaseNote).toHaveBeenCalledWith("current-note");
    expect(controls.pressedKeys.value.has("KeyQ")).toBe(false);
  });

  it("cleans up a failed attack and accepts the next keydown", async () => {
    const failed = deferred<string | null>();
    mockMusicStore.attackNoteWithOctave.mockReturnValueOnce(failed.promise);
    const controls = createControls();

    getWindowListener("keydown")(new KeyboardEvent("keydown", { code: "KeyQ", key: "q" }));
    expect(controls.pressedKeys.value.has("KeyQ")).toBe(true);
    failed.reject(new Error("audio unavailable"));
    await flushPromises();

    expect(controls.pressedKeys.value.has("KeyQ")).toBe(false);
    expect(mockKeyboardDrawerStore.removeTouch).toHaveBeenCalledWith("keyboard:KeyQ");

    getWindowListener("keydown")(new KeyboardEvent("keydown", { code: "KeyQ", key: "q" }));
    await flushPromises();
    expect(mockMusicStore.attackNoteWithOctave).toHaveBeenCalledTimes(2);
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function getWindowListener(type: string) {
  const call = addEventListenerSpy.mock.calls
    .findLast(([eventType]) => eventType === type);
  if (!call) {
    throw new Error(`Missing ${type} listener`);
  }
  return call[1] as EventListener;
}
