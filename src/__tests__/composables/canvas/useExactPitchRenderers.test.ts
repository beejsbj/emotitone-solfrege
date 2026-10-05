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
    sampleHuePhase: vi.fn(() => null),
  }),
}));

const AMBIENT = {
  isEnabled: true,
  opacityMajor: 0.3,
  opacityMinor: 0.216,
  brightnessMajor: 0.455,
  brightnessMinor: 0.29,
  saturationMajor: 0.6,
  saturationMinor: 0.45,
};

const COMPOSITION = {
  usable: { x: 0, y: 0, width: 800, height: 600 },
  centerX: 400,
  centerY: 300,
  hilbertRadius: 100,
  orbitRadiusX: 200,
  orbitRadiusY: 150,
  blobFitScale: 1,
  suspended: false,
};

function createMockCtx() {
  return {
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    drawImage: vi.fn(),
    globalAlpha: 1,
    fillStyle: "",
  } as unknown as CanvasRenderingContext2D;
}

describe("active-note canvas color routing", () => {
  beforeEach(() => {
    colorResolutionCalls.length = 0;
    vi.clearAllMocks();
  });

  it("routes Ambient exact-pitch notes through pitch-class identity when pitchClassIndex differs from solfegeIndex", async () => {
    const { useAmbientRenderer } = await import("@/composables/canvas/useAmbientRenderer");
    const { renderAmbientBackground } = useAmbientRenderer();

    const mockCtx = createMockCtx();

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

    renderAmbientBackground(
      mockCtx,
      0,
      AMBIENT,
      800,
      600,
      { currentMode: "major", currentKey: "C", getActiveNotes: () => [] },
      COMPOSITION,
      { envelope: 0.5, hasSignal: true },
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

    const mockCtx = createMockCtx();

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

    renderAmbientBackground(
      mockCtx,
      0,
      AMBIENT,
      800,
      600,
      { currentMode: "major", currentKey: "C", getActiveNotes: () => [] },
      COMPOSITION,
      { envelope: 0.5, hasSignal: true },
      false,
      [scaleNote]
    );

    // When no pitchClassIndex, must use scale-index color resolution
    const scaleIndexCall = colorResolutionCalls.find(
      (call) => call.function === "resolveMusicColorSampleByScaleIndex"
    );
    expect(scaleIndexCall).toBeDefined();
  });
  it("lights the band with the sounding pitch and keeps it through the release", async () => {
    const { useAmbientRenderer } = await import("@/composables/canvas/useAmbientRenderer");
    const { renderAmbientBackground } = useAmbientRenderer();
    const store = { currentMode: "major", currentKey: "C", getActiveNotes: () => [] };
    const note = {
      noteId: "e4",
      noteName: "E4",
      frequency: 329.63,
      octave: 4,
      keyboardOctave: 4,
      solfegeIndex: 2,
      pitchClassIndex: 4,
      mode: "major",
      key: "C",
    } as ActiveNote;

    const silent = createMockCtx();
    renderAmbientBackground(silent, 0, AMBIENT, 800, 600, store, COMPOSITION,
      { envelope: 0, hasSignal: false }, false, []);
    expect(silent.drawImage).toHaveBeenCalledOnce();
    expect(colorResolutionCalls).toHaveLength(0);

    const sounding = createMockCtx();
    renderAmbientBackground(sounding, 1, AMBIENT, 800, 600, store, COMPOSITION,
      { envelope: 0.6, hasSignal: true }, false, [note]);
    expect(colorResolutionCalls.at(-1)?.args[0]).toBe("E");

    colorResolutionCalls.length = 0;
    const releasing = createMockCtx();
    renderAmbientBackground(releasing, 2, AMBIENT, 800, 600, store, COMPOSITION,
      { envelope: 0.04, hasSignal: false }, false, []);
    expect(colorResolutionCalls.at(-1)?.args[0]).toBe("E");
  });

  it("paints only the Ink ground while the Stage is suspended", async () => {
    const { useAmbientRenderer } = await import("@/composables/canvas/useAmbientRenderer");
    const { renderAmbientBackground } = useAmbientRenderer();
    const ctx = createMockCtx();

    renderAmbientBackground(ctx, 0, AMBIENT, 800, 600,
      { currentMode: "major", currentKey: "C", getActiveNotes: () => [] },
      { ...COMPOSITION, suspended: true },
      { envelope: 1, hasSignal: true }, false, []);

    expect(ctx.fillRect).toHaveBeenCalledOnce();
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });
  it("widens the band above the default Strength and keeps its height below it", async () => {
    // Without an offscreen 2D canvas the band paints crisply onto the Stage.
    vi.spyOn(document, "createElement").mockReturnValueOnce(
      { getContext: () => null } as unknown as HTMLElement,
    );
    const { useAmbientRenderer } = await import("@/composables/canvas/useAmbientRenderer");
    const { renderAmbientBackground } = useAmbientRenderer();
    const store = { currentMode: "major", currentKey: "C", getActiveNotes: () => [] };
    const bandHeight = (opacityMajor: number) => {
      const ctx = createMockCtx();
      renderAmbientBackground(ctx, 0, { ...AMBIENT, opacityMajor }, 800, 600, store,
        COMPOSITION, { envelope: 0, hasSignal: false }, true, []);
      const top = vi.mocked(ctx.moveTo).mock.calls[0][1];
      const bottom = vi.mocked(ctx.lineTo).mock.calls[2][1];
      return bottom - top;
    };

    // Reduced Motion holds the half-height at 15% of the 600px short side.
    expect(bandHeight(0.3)).toBeCloseTo(180, 6);
    expect(bandHeight(0.1)).toBeCloseTo(180, 6);
    expect(bandHeight(1)).toBeCloseTo(360, 6);
  });
  it.each(["suspended", "disabled"] as const)(
    "forgets the released pitch while Atmosphere is %s",
    async (state) => {
      const { useAmbientRenderer } = await import("@/composables/canvas/useAmbientRenderer");
      const { renderAmbientBackground } = useAmbientRenderer();
      const store = { currentMode: "major", currentKey: "C", getActiveNotes: () => [] };
      const note = {
        noteId: "e4", noteName: "E4", frequency: 329.63, octave: 4, keyboardOctave: 4,
        solfegeIndex: 2, pitchClassIndex: 4, mode: "major", key: "C",
      } as ActiveNote;

      renderAmbientBackground(createMockCtx(), 0, AMBIENT, 800, 600, store,
        COMPOSITION, { envelope: 0.6, hasSignal: true }, false, [note]);
      expect(colorResolutionCalls.at(-1)?.args[0]).toBe("E");

      const hidden = createMockCtx();
      renderAmbientBackground(hidden, 1,
        { ...AMBIENT, isEnabled: state !== "disabled" }, 800, 600, store,
        { ...COMPOSITION, suspended: state === "suspended" },
        { envelope: 0.0005, hasSignal: false }, false, []);
      expect(hidden.drawImage).not.toHaveBeenCalled();
      expect(hidden.fillRect).toHaveBeenCalledTimes(state === "suspended" ? 1 : 0);

      colorResolutionCalls.length = 0;
      renderAmbientBackground(createMockCtx(), 2, AMBIENT, 800, 600, store,
        COMPOSITION, { envelope: 0.6, hasSignal: true }, false, []);
      expect(colorResolutionCalls).toHaveLength(0);
    },
  );

  it("never invents or revives a pitch hue for unpitched sound", async () => {
    const { useAmbientRenderer } = await import("@/composables/canvas/useAmbientRenderer");
    const { renderAmbientBackground } = useAmbientRenderer();
    const store = { currentMode: "major", currentKey: "C", getActiveNotes: () => [] };
    const render = (envelope: number, notes: ActiveNote[]) => renderAmbientBackground(
      createMockCtx(), 0, AMBIENT, 800, 600, store, COMPOSITION,
      { envelope, hasSignal: envelope > 0 }, false, notes);
    const note = {
      noteId: "e4", noteName: "E4", frequency: 329.63, octave: 4, keyboardOctave: 4,
      solfegeIndex: 2, pitchClassIndex: 4, mode: "major", key: "C",
    } as ActiveNote;

    render(0.6, []);
    expect(colorResolutionCalls).toHaveLength(0);

    render(0.6, [note]);
    expect(colorResolutionCalls).toHaveLength(1);

    render(0, []);
    colorResolutionCalls.length = 0;
    render(0.6, []);
    expect(colorResolutionCalls).toHaveLength(0);
  });
});
