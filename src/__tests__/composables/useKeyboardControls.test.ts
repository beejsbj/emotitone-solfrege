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

vi.mock("@/stores/music", () => ({
  useMusicStore: () => mockMusicStore,
}));

vi.mock("@/stores/patterns", () => ({
  usePatternsStore: () => mockPatternsStore,
}));

describe("useKeyboardControls", () => {
  beforeEach(() => {
    mockMusicStore.currentScale.degreeCount = 12;
    mockMusicStore.attackNoteWithOctave.mockClear();
    mockMusicStore.releaseNote.mockClear();
    mockPatternsStore.removeLastFromCurrentSketch.mockClear();
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
});
