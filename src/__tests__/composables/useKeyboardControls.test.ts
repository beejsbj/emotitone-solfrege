import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, reactive, ref, type Ref } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useKeyboardControls } from "@/composables/useKeyboardControls";

// Mount through a real host so onMounted/onUnmounted attach and remove the
// window listeners and the lock watcher; unmounting after each test keeps
// earlier instances from reacting to later key events.
const hosts: VueWrapper[] = [];
function mountControls(octave: Ref<number>) {
  let controls!: ReturnType<typeof useKeyboardControls>;
  hosts.push(mount(defineComponent({
    setup() {
      controls = useKeyboardControls(octave);
      return () => null;
    },
  })));
  return controls;
}

const mockInstrumentStore = reactive({
  isInteractionLocked: false,
});

const mockMusicStore = reactive({
  currentScale: reactive({ degreeCount: 12 }),
  currentKey: "C",
  currentMode: "major" as string,
  attackNoteWithOctave: vi.fn().mockResolvedValue("mock-note-id"),
  attackExactPitch: vi.fn().mockResolvedValue("mock-chord-note-id"),
  releaseNote: vi.fn(),
});

const mockPatternsStore = {
  removeLastFromCurrentSketch: vi.fn(),
};

const mockKeyboardDrawerStore = {
  visibleOctaves: [6, 5, 4, 3],
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
  afterEach(() => {
    hosts.splice(0).forEach((host) => host.unmount());
  });

  beforeEach(() => {
    mockInstrumentStore.isInteractionLocked = false;
    mockMusicStore.currentScale.degreeCount = 12;
    mockMusicStore.currentKey = "C";
    mockMusicStore.currentMode = "major";
    mockMusicStore.attackNoteWithOctave.mockClear();
    mockMusicStore.attackExactPitch.mockClear();
    mockMusicStore.releaseNote.mockClear();
    mockPatternsStore.removeLastFromCurrentSketch.mockClear();
    mockKeyboardDrawerStore.visibleOctaves = [6, 5, 4, 3];
    mockKeyboardDrawerStore.addTouch.mockClear();
    mockKeyboardDrawerStore.removeTouch.mockClear();
  });

  it("builds two full 12-key rows plus a ten-key bottom row (number row excluded)", () => {
    const controls = mountControls(ref(4));
    const mapping = controls.getKeyboardMapping();

    // Two 12-key letter rows + one 10-key bottom row = 34 keys
    expect(Object.keys(mapping)).toHaveLength(34);
    // Number row keys are NOT in the note mapping
    expect(mapping.Digit1).toBeUndefined();
    expect(mapping.Digit0).toBeUndefined();
    expect(mapping.KeyQ).toEqual({
      solfegeIndex: 0,
      octave: 5,
      label: "Q",
    });
    expect(mapping.Backslash).toEqual({
      solfegeIndex: 11,
      octave: 4,
      label: "\\",
    });
    expect(mapping.KeyZ).toEqual({
      solfegeIndex: 0,
      octave: 3,
      label: "Z",
    });
    expect(mapping.Slash).toEqual({
      solfegeIndex: 9,
      octave: 3,
      label: "/",
    });
  });

  it("uses the leftmost keys for smaller mode sizes", () => {
    mockMusicStore.currentScale.degreeCount = 5;
    const controls = mountControls(ref(4));
    const mapping = controls.getKeyboardMapping();

    // Two 5-key letter rows + one 5-key bottom row = 15 keys
    expect(Object.keys(mapping)).toHaveLength(15);
    expect(mapping.KeyT.solfegeIndex).toBe(4);
    expect(mapping.KeyG.solfegeIndex).toBe(4);
    expect(mapping.KeyB.solfegeIndex).toBe(4);
    expect(mapping.KeyY).toBeUndefined();
    expect(mapping.KeyN).toBeUndefined();
  });

  it("returns display labels for mapped notes", () => {
    mockMusicStore.currentScale.degreeCount = 12;
    const controls = mountControls(ref(4));

    expect(controls.getKeyboardLetterForNote(11, 4)).toBe("\\");
    expect(controls.getKeyboardLetterForNote(0, 5)).toBe("Q");
  });

  it("enables only physical rows whose octaves are visible", () => {
    mockKeyboardDrawerStore.visibleOctaves = [4];
    const controls = mountControls(ref(4));

    expect(controls.getKeyboardMapping()).toMatchObject({
      KeyA: { solfegeIndex: 0, octave: 4, label: "A" },
    });
    expect(controls.getKeyboardMapping().KeyQ).toBeUndefined();
    expect(controls.getKeyboardMapping().KeyZ).toBeUndefined();
    // Number row is never in the note mapping (it triggers chords)
    expect(controls.getKeyboardMapping().Digit1).toBeUndefined();

    mockKeyboardDrawerStore.visibleOctaves = [5, 4];
    expect(controls.getKeyboardMapping()).toMatchObject({
      KeyQ: { solfegeIndex: 0, octave: 5, label: "Q" },
      KeyA: { solfegeIndex: 0, octave: 4, label: "A" },
    });
    expect(controls.getKeyboardMapping().KeyZ).toBeUndefined();
    expect(controls.getKeyboardMapping().Digit1).toBeUndefined();

    mockKeyboardDrawerStore.visibleOctaves = [5, 4, 3];
    expect(controls.getKeyboardMapping()).toMatchObject({
      KeyQ: { solfegeIndex: 0, octave: 5, label: "Q" },
      KeyA: { solfegeIndex: 0, octave: 4, label: "A" },
      KeyZ: { solfegeIndex: 0, octave: 3, label: "Z" },
    });
    expect(controls.getKeyboardMapping().Digit1).toBeUndefined();

    mockKeyboardDrawerStore.visibleOctaves = [6, 5, 4, 3];
    expect(controls.getKeyboardMapping()).toMatchObject({
      KeyQ: { solfegeIndex: 0, octave: 5, label: "Q" },
      KeyA: { solfegeIndex: 0, octave: 4, label: "A" },
      KeyZ: { solfegeIndex: 0, octave: 3, label: "Z" },
    });
    // Number row is chord-only regardless of visible octaves
    expect(controls.getKeyboardMapping().Digit1).toBeUndefined();

    controls.cleanupKeyboardListeners();
  });

  it("keeps physical row identities anchored near octave limits", () => {
    mockKeyboardDrawerStore.visibleOctaves = [8, 7, 6];
    const controls = mountControls(ref(8));
    const mapping = controls.getKeyboardMapping();

    expect(mapping.KeyA.octave).toBe(8);
    expect(mapping.KeyZ.octave).toBe(7);
    expect(mapping.KeyQ).toBeUndefined();
    expect(mapping.Digit1).toBeUndefined();
    expect(controls.getKeyboardLetterForNote(0, 6)).toBeNull();

    controls.cleanupKeyboardListeners();
  });

  it("attacks distinct octaves from the letter rows and chords from the number row", async () => {
    const controls = mountControls(ref(4));

    // Number row triggers chords via attackExactPitch
    await controls.handleKeyDown(
      new KeyboardEvent("keydown", { code: "Digit1", key: "1" })
    );
    controls.handleKeyUp(
      new KeyboardEvent("keyup", { code: "Digit1", key: "1" })
    );

    // attackExactPitch should have been called (once per pitch in the chord)
    expect(mockMusicStore.attackExactPitch).toHaveBeenCalled();
    // attackNoteWithOctave should NOT have been called for the number row
    expect(mockMusicStore.attackNoteWithOctave).not.toHaveBeenCalled();

    mockMusicStore.attackExactPitch.mockClear();

    // Letter rows still trigger individual notes
    await controls.handleKeyDown(
      new KeyboardEvent("keydown", { code: "KeyQ", key: "q" })
    );
    controls.handleKeyUp(
      new KeyboardEvent("keyup", { code: "KeyQ", key: "q" })
    );
    await controls.handleKeyDown(
      new KeyboardEvent("keydown", { code: "KeyA", key: "a" })
    );
    controls.handleKeyUp(
      new KeyboardEvent("keyup", { code: "KeyA", key: "a" })
    );
    await controls.handleKeyDown(
      new KeyboardEvent("keydown", { code: "KeyZ", key: "z" })
    );

    expect(mockMusicStore.attackNoteWithOctave.mock.calls.map(
      ([solfegeIndex, octave]) => ({ solfegeIndex, octave }),
    )).toEqual([
      { solfegeIndex: 0, octave: 5 },
      { solfegeIndex: 0, octave: 4 },
      { solfegeIndex: 0, octave: 3 },
    ]);

    controls.handleKeyUp(
      new KeyboardEvent("keyup", { code: "KeyZ", key: "z" })
    );
    controls.cleanupKeyboardListeners();
  });

  it("number row chord keys register touch as chord:degree-N", async () => {
    const controls = mountControls(ref(4));

    await controls.handleKeyDown(
      new KeyboardEvent("keydown", { code: "Digit1", key: "1" })
    );

    expect(mockKeyboardDrawerStore.addTouch).toHaveBeenCalledWith(
      "keyboard:Digit1",
      "chord:degree-1",
    );

    controls.handleKeyUp(
      new KeyboardEvent("keyup", { code: "Digit1", key: "1" })
    );
    controls.cleanupKeyboardListeners();
  });

  it("does not turn modified keyboard shortcuts into notes", async () => {
    const controls = mountControls(ref(4));
    const shortcuts = [
      new KeyboardEvent("keydown", {
        code: "KeyC",
        key: "c",
        ctrlKey: true,
        cancelable: true,
      }),
      new KeyboardEvent("keydown", {
        code: "KeyV",
        key: "v",
        metaKey: true,
        cancelable: true,
      }),
      new KeyboardEvent("keydown", {
        code: "KeyZ",
        key: "z",
        altKey: true,
        cancelable: true,
      }),
    ];

    for (const shortcut of shortcuts) {
      await controls.handleKeyDown(shortcut);
      expect(shortcut.defaultPrevented).toBe(false);
    }

    expect(mockMusicStore.attackNoteWithOctave).not.toHaveBeenCalled();
    expect(mockKeyboardDrawerStore.addTouch).not.toHaveBeenCalled();
    controls.cleanupKeyboardListeners();
  });

  it("does not turn modified number-row shortcuts into chords", async () => {
    const controls = mountControls(ref(4));
    const shortcut = new KeyboardEvent("keydown", {
      code: "Digit1",
      key: "1",
      ctrlKey: true,
      cancelable: true,
    });

    await controls.handleKeyDown(shortcut);
    expect(shortcut.defaultPrevented).toBe(false);
    expect(mockMusicStore.attackExactPitch).not.toHaveBeenCalled();
    expect(mockKeyboardDrawerStore.addTouch).not.toHaveBeenCalled();

    controls.cleanupKeyboardListeners();
  });

  it("requires keyup before a modified shortcut key can attack", async () => {
    const controls = mountControls(ref(4));
    const shortcut = new KeyboardEvent("keydown", {
      code: "KeyC",
      key: "c",
      ctrlKey: true,
      cancelable: true,
    });

    await controls.handleKeyDown(shortcut);
    await controls.handleKeyDown(
      new KeyboardEvent("keydown", {
        code: "KeyC",
        key: "c",
        repeat: true,
      })
    );

    expect(shortcut.defaultPrevented).toBe(false);
    expect(mockMusicStore.attackNoteWithOctave).not.toHaveBeenCalled();

    controls.handleKeyUp(
      new KeyboardEvent("keyup", { code: "KeyC", key: "c" })
    );
    await controls.handleKeyDown(
      new KeyboardEvent("keydown", { code: "KeyC", key: "c" })
    );

    expect(mockMusicStore.attackNoteWithOctave).toHaveBeenCalledOnce();
    controls.handleKeyUp(
      new KeyboardEvent("keyup", { code: "KeyC", key: "c" })
    );
    controls.cleanupKeyboardListeners();
  });

  it("still releases a note held before a modifier is pressed", async () => {
    const controls = mountControls(ref(4));

    await controls.handleKeyDown(
      new KeyboardEvent("keydown", { code: "KeyC", key: "c" })
    );
    await controls.handleKeyDown(
      new KeyboardEvent("keydown", {
        code: "KeyC",
        key: "c",
        ctrlKey: true,
        repeat: true,
      })
    );
    controls.handleKeyUp(
      new KeyboardEvent("keyup", { code: "KeyC", key: "c" })
    );

    expect(mockMusicStore.attackNoteWithOctave).toHaveBeenCalledOnce();
    expect(mockMusicStore.releaseNote).toHaveBeenCalledWith("mock-note-id");
    controls.cleanupKeyboardListeners();
  });

  it("releases a QWERTY owner even when keyup beats async attack resolution", async () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    let resolveAttack!: (value: string) => void;
    let isCancelled = () => false;
    mockMusicStore.attackNoteWithOctave.mockImplementationOnce(
      (_scaleIndex: number, _octave: number, cancelled: () => boolean) => {
        isCancelled = cancelled;
        return new Promise<string>((resolve) => { resolveAttack = resolve; });
      },
    );
    mountControls(ref(4));
    const listeners = addEventListener.mock.calls;
    const keydown = listeners.find(([type]) => type === "keydown")?.[1] as EventListener;
    const keyup = listeners.find(([type]) => type === "keyup")?.[1] as EventListener;

    keydown(new KeyboardEvent("keydown", { code: "KeyQ", key: "q" }));
    expect(isCancelled()).toBe(false);
    keyup(new KeyboardEvent("keyup", { code: "KeyQ", key: "q" }));
    expect(isCancelled()).toBe(true);
    resolveAttack("late-q");
    await Promise.resolve();
    await Promise.resolve();

    expect(mockMusicStore.releaseNote).toHaveBeenCalledWith("late-q");
    expect(mockKeyboardDrawerStore.removeTouch).toHaveBeenCalledWith("keyboard:KeyQ");
  });

  it("ignores hardware key presses while instrument samples are warming", async () => {
    mockInstrumentStore.isInteractionLocked = true;
    const controls = mountControls(ref(4));
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
    const controls = mountControls(ref(4));

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
    const controls = mountControls(ref(4));

    const pendingAttack = controls.handleKeyDown(
      new KeyboardEvent("keydown", { code: "KeyQ", key: "q" })
    );
    mockInstrumentStore.isInteractionLocked = true;
    await Promise.resolve();
    deferred.resolve("late-note-id");
    await pendingAttack;

    expect(mockMusicStore.releaseNote).toHaveBeenCalledWith("late-note-id");
    expect(mockKeyboardDrawerStore.removeTouch).toHaveBeenCalledWith("keyboard:KeyQ");
    controls.handleKeyUp(
      new KeyboardEvent("keyup", { code: "KeyQ", key: "q" })
    );
    expect(mockMusicStore.releaseNote).toHaveBeenCalledTimes(1);
    controls.cleanupKeyboardListeners();
  });
});

