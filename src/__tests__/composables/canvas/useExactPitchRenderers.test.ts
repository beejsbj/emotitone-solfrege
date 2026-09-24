import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ActiveNote } from "@/types/music";

// Track color resolution calls
const colorResolutionCalls: Array<{
  function: string;
  args: unknown[];
}> = [];

vi.mock("@/services/musicColor", () => ({
  resolveMusicColorSampleByPitchClass: vi.fn((pitchClass, mode, key, octave, config, fallback) => {
    colorResolutionCalls.push({
      function: "resolveMusicColorSampleByPitchClass",
      args: [pitchClass, mode, key, octave, fallback],
    });
    return { sample: { primary: "#ff6b9d" } };
  }),
  resolveMusicColorSampleByScaleIndex: vi.fn(() => {
    colorResolutionCalls.push({
      function: "resolveMusicColorSampleByScaleIndex",
      args: [],
    });
    return { sample: { primary: "#0099ff" } };
  }),
  musicColorValueToCss: vi.fn((color) => color),
  tuneMusicColorValue: vi.fn((color) => color),
  withMusicColorAlpha: vi.fn((color, alpha) => color),
}));

vi.mock("@/composables/useVisualConfig", () => ({
  useVisualConfig: () => ({
    dynamicColorConfig: { value: {} },
  }),
}));

vi.mock("@/stores/music", () => ({
  useMusicStore: () => ({
    currentMode: "major",
    currentKey: "C",
  }),
}));

vi.mock("@/composables/useMusicColor", () => ({
  useMusicColor: () => ({
    getPrimaryColorForPitch: vi.fn(() => "#ff6b9d"),
    getFleckColor: vi.fn(() => "#e0a93a"),
    getFleckColorByPitchClass: vi.fn(() => "#e0a93a"),
  }),
}));

describe("active-note canvas color routing", () => {
  beforeEach(() => {
    colorResolutionCalls.length = 0;
    vi.clearAllMocks();
  });

  it("routes Ambient exact-pitch notes through pitch-class identity when pitchClassIndex differs from solfegeIndex", async () => {
    const { useAmbientRenderer } = await import("@/composables/canvas/useAmbientRenderer");
    const { renderAmbientBackground } = useAmbientRenderer();

    const mockCtx = {
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D;

    // Note with conflicting scale and pitch indices
    const exactPitchNote: ActiveNote = {
      noteId: "test-note",
      noteName: "C#4",
      frequency: 277.18,
      octave: 4,
      keyboardOctave: 4,
      solfegeIndex: 0, // Solfege index 0 (Do, would select scale-index color in old code)
      pitchClassIndex: 1, // But pitch class 1 (C#, should select pitch-class color)
      mode: "major",
      key: "C",
      solfege: {
        name: "Do",
        number: 1,
        emotion: "Grounded",
        description: "Do note",
        texture: "soft",
        intervalName: "1P",
        semitones: 0,
      },
    };

    const getCachedGradient = vi.fn((key, createFn) => createFn());

    renderAmbientBackground(
      mockCtx,
      0,
      { isEnabled: true },
      800,
      600,
      { currentMode: "major", currentKey: "C", getActiveNotes: () => [] },
      getCachedGradient,
      { envelope: 0, hasSignal: false },
      false,
      [exactPitchNote]
    );

    // Must use pitch-class color resolution, not scale-index
    const pitchClassCall = colorResolutionCalls.find(
      (call) => call.function === "resolveMusicColorSampleByPitchClass"
    );
    // Pitch class 1 resolves as C#; solfege index 0 in C major would be C.
    expect(pitchClassCall?.args[0]).toBe("C#");
    expect(pitchClassCall?.args).toContain("fixed-chromatic");
  });

  it("uses scale-index color when active note has no exact pitch class", async () => {
    const { useAmbientRenderer } = await import("@/composables/canvas/useAmbientRenderer");
    const { renderAmbientBackground } = useAmbientRenderer();

    const mockCtx = {
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D;

    const scaleNote: ActiveNote = {
      noteId: "test-note",
      noteName: "C4",
      frequency: 261.63,
      octave: 4,
      keyboardOctave: 4,
      solfegeIndex: 0,
      // No pitchClassIndex - should use scale-index fallback
      mode: "major",
      key: "C",
      solfege: {
        name: "Do",
        number: 1,
        emotion: "Grounded",
        description: "Do note",
        texture: "soft",
        intervalName: "1P",
        semitones: 0,
      },
    };

    const getCachedGradient = vi.fn((key, createFn) => createFn());

    renderAmbientBackground(
      mockCtx,
      0,
      { isEnabled: true },
      800,
      600,
      { currentMode: "major", currentKey: "C", getActiveNotes: () => [] },
      getCachedGradient,
      { envelope: 0, hasSignal: false },
      false,
      [scaleNote]
    );

    // When no pitchClassIndex, must use scale-index color resolution
    const scaleIndexCall = colorResolutionCalls.find(
      (call) => call.function === "resolveMusicColorSampleByScaleIndex"
    );
    expect(scaleIndexCall).toBeDefined();
  });
});
