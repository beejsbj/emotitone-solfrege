import { beforeEach, describe, expect, it, vi } from "vitest";

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

const mockInstrumentStore = reactive({
  isInteractionLocked: false,
});

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

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

vi.mock("@/stores/music", () => ({
  useMusicStore: () => mockMusicStore,
}));

vi.mock("@/stores/instrument", () => ({
  useInstrumentStore: () => mockInstrumentStore,
}));

vi.mock("@/stores/patterns", () => ({
  usePatternsStore: () => mockPatternsStore,
}));

vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => mockKeyboardDrawerStore,
}));

describe("useKeyboardControls", () => {
  beforeEach(() => {
    mockInstrumentStore.isInteractionLocked = false;
    mockMusicStore.currentScale.degreeCount = 12;
    mockMusicStore.attackNoteWithOctave.mockClear();
    mockMusicStore.releaseNote.mockClear();
    mockPatternsStore.removeLastFromCurrentSketch.mockClear();
    mockKeyboardDrawerStore.addTouch.mockClear();
    mockKeyboardDrawerStore.removeTouch.mockClear();
  });

  it("builds three full 12-key rows for chromatic parity", () => {
    const controls = useKeyboardControls(ref(4));
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
    const controls = useKeyboardControls(ref(4));
    const mapping = controls.getKeyboardMapping();

    expect(Object.keys(mapping)).toHaveLength(15);
    expect(mapping.Digit5.solfegeIndex).toBe(4);
    expect(mapping.KeyT.solfegeIndex).toBe(4);
    expect(mapping.KeyG.solfegeIndex).toBe(4);
    expect(mapping.Digit6).toBeUndefined();
  });

  it("returns display labels for mapped notes", () => {
    mockMusicStore.currentScale.degreeCount = 12;
    const controls = useKeyboardControls(ref(4));

    expect(controls.getKeyboardLetterForNote(11, 3)).toBe("\\");
    expect(controls.getKeyboardLetterForNote(0, 4)).toBe("Q");
  });

  it("ignores hardware key presses while instrument samples are warming", async () => {
    mockInstrumentStore.isInteractionLocked = true;
    const controls = useKeyboardControls(ref(4));
    const keyDown = new KeyboardEvent("keydown", {
      code: "KeyQ",
      key: "q",
    });

    await controls.handleKeyDown(keyDown);
    await Promise.resolve();

    expect(mockMusicStore.attackNoteWithOctave).not.toHaveBeenCalled();
    expect(mockKeyboardDrawerStore.addTouch).not.toHaveBeenCalled();

    controls.cleanupKeyboardListeners();
  });

  it("requires keyup before a blocked key can attack after unlock", async () => {
    mockInstrumentStore.isInteractionLocked = true;
    const controls = useKeyboardControls(ref(4));

    await controls.handleKeyDown(
      new KeyboardEvent("keydown", { code: "KeyQ", key: "q" })
    );
    mockInstrumentStore.isInteractionLocked = false;
    await Promise.resolve();

    await controls.handleKeyDown(
      new KeyboardEvent("keydown", {
        code: "KeyQ",
        key: "q",
        repeat: true,
      })
    );
    expect(mockMusicStore.attackNoteWithOctave).not.toHaveBeenCalled();

    controls.handleKeyUp(
      new KeyboardEvent("keyup", { code: "KeyQ", key: "q" })
    );
    await controls.handleKeyDown(
      new KeyboardEvent("keydown", { code: "KeyQ", key: "q" })
    );

    expect(mockMusicStore.attackNoteWithOctave).toHaveBeenCalledOnce();
    controls.handleKeyUp(
      new KeyboardEvent("keyup", { code: "KeyQ", key: "q" })
    );
    controls.cleanupKeyboardListeners();
  });

  it("releases an asynchronous attack that finishes after warmup starts", async () => {
    const deferred = createDeferred<string | null>();
    mockMusicStore.attackNoteWithOctave.mockReturnValueOnce(deferred.promise);
    const controls = useKeyboardControls(ref(4));

    const pendingAttack = controls.handleKeyDown(
      new KeyboardEvent("keydown", { code: "KeyQ", key: "q" })
    );
    mockInstrumentStore.isInteractionLocked = true;
    await Promise.resolve();
    deferred.resolve("late-note-id");
    await pendingAttack;

    expect(mockMusicStore.releaseNote).toHaveBeenCalledWith("late-note-id");
    expect(mockKeyboardDrawerStore.addTouch).not.toHaveBeenCalled();
    controls.handleKeyUp(
      new KeyboardEvent("keyup", { code: "KeyQ", key: "q" })
    );
    expect(mockMusicStore.releaseNote).toHaveBeenCalledTimes(1);
    controls.cleanupKeyboardListeners();
  });
});
