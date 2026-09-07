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
  beforeEach(() => {
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

  it("releases a QWERTY owner even when keyup beats async attack resolution", async () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    let resolveAttack!: (value: string) => void;
    mockMusicStore.attackNoteWithOctave.mockImplementationOnce(() =>
      new Promise<string>((resolve) => { resolveAttack = resolve; }),
    );
    useKeyboardControls(ref(4));
    const listeners = addEventListener.mock.calls;
    const keydown = listeners.find(([type]) => type === "keydown")?.[1] as EventListener;
    const keyup = listeners.find(([type]) => type === "keyup")?.[1] as EventListener;

    keydown(new KeyboardEvent("keydown", { code: "KeyQ", key: "q" }));
    keyup(new KeyboardEvent("keyup", { code: "KeyQ", key: "q" }));
    resolveAttack("late-q");
    await Promise.resolve();
    await Promise.resolve();

    expect(mockMusicStore.releaseNote).toHaveBeenCalledWith("late-q");
    expect(mockKeyboardDrawerStore.removeTouch).toHaveBeenCalledWith("keyboard:KeyQ");
  });
});
