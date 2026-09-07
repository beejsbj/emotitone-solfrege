import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useUnifiedCanvas } from "@/composables/canvas/useUnifiedCanvas";
import { mockCanvasContext } from "@/__tests__/helpers/test-utils";

const mocks = vi.hoisted(() => {
  const blobConfig = {
    value: {
      isEnabled: true,
      fadeOutDuration: 1,
      scaleOutDuration: 0.4,
      connectionMode: "web",
      showChordLabel: true,
      showIntervalLabels: true,
      showEmotionLabel: true,
      labelOpacity: 0.5,
    },
  };

  return {
    blobConfig,
    musicStore: {
      currentMode: "major",
      currentKey: "C",
      solfegeData: [],
      getActiveNotes: vi.fn(() => []),
    },
    recordHarmonicNote: vi.fn(),
    releaseHarmonicNote: vi.fn(),
    expireHarmonicNote: vi.fn(),
    resetHarmonicAnalysis: vi.fn(),
    createBlob: vi.fn(),
    startBlobFadeOut: vi.fn(),
    startBlobFadeOutById: vi.fn(),
    buildScene: vi.fn(() => null),
    renderBlobField: vi.fn(() => false),
    animationOptions: null as null | {
      onFrame: (timestamp: number, elapsed: number) => void;
    },
  };
});

vi.mock("@/stores/music", () => ({
  useMusicStore: () => mocks.musicStore,
}));

vi.mock("@/composables/useVisualConfig", () => ({
  useVisualConfig: () => ({
    blobConfig: mocks.blobConfig,
    ambientConfig: { value: { isEnabled: false } },
    particleConfig: { value: { isEnabled: false, count: 0 } },
    stringConfig: { value: { isEnabled: false } },
    animationConfig: { value: {} },
    hilbertScopeConfig: { value: { isEnabled: false } },
  }),
}));

vi.mock("@/composables/useHarmonicAnalysis", () => ({
  useHarmonicAnalysis: () => ({
    snapshot: {
      value: {
        isVisible: true,
        displayedNotes: [
          { noteId: "c4", noteName: "C4" },
          { noteId: "e4", noteName: "E4" },
        ],
        intervalEdges: [
          { fromNoteId: "c4", toNoteId: "e4", interval: "3M" },
        ],
        chordLabel: "C major",
        emotionalDescription: "Grounded & radiant",
      },
    },
    notePlayed: mocks.recordHarmonicNote,
    noteReleased: mocks.releaseHarmonicNote,
    noteExpired: mocks.expireHarmonicNote,
    reset: mocks.resetHarmonicAnalysis,
  }),
}));

vi.mock("@/composables/useAnimationLifecycle", () => ({
  useAnimationLifecycle: (options: typeof mocks.animationOptions) => {
    mocks.animationOptions = options;
    return {
      startAnimation: vi.fn(),
      stopAnimation: vi.fn(),
      isAnimating: { value: false },
    };
  },
}));

vi.mock("@/composables/canvas/useBlobRenderer", () => ({
  useBlobRenderer: () => ({
    activeBlobs: new Map(),
    createBlob: mocks.createBlob,
    startBlobFadeOut: mocks.startBlobFadeOut,
    startBlobFadeOutById: mocks.startBlobFadeOutById,
    prepareBlobs: vi.fn(),
    getPreparedBlobFrames: vi.fn(() => []),
    renderBlobs: vi.fn(),
    getActiveBlobCount: vi.fn(() => 0),
    clearAllBlobs: vi.fn(),
    removeBlob: vi.fn(),
  }),
}));

vi.mock("@/composables/canvas/useParticleSystem", () => ({
  useParticleSystem: () => ({
    createParticles: vi.fn(),
    renderParticles: vi.fn(),
    getActiveParticleCount: vi.fn(() => 0),
    clearAllParticles: vi.fn(),
  }),
}));

vi.mock("@/composables/canvas/useStringRenderer", () => ({
  useStringRenderer: () => ({
    initializeStrings: vi.fn(),
    addEventListeners: vi.fn(),
    removeEventListeners: vi.fn(),
    updateStringProperties: vi.fn(),
    renderStrings: vi.fn(),
    getActiveStringCount: vi.fn(() => 0),
    clearAllStrings: vi.fn(),
  }),
}));

vi.mock("@/composables/canvas/useAmbientRenderer", () => ({
  useAmbientRenderer: () => ({ renderAmbientBackground: vi.fn() }),
}));

vi.mock("@/composables/canvas/useHarmonicGeometryRenderer", () => ({
  useHarmonicGeometryRenderer: () => ({
    buildScene: mocks.buildScene,
    renderLabels: vi.fn(),
  }),
}));

vi.mock("@/composables/canvas/useBlobFieldRenderer", () => ({
  useBlobFieldRenderer: () => ({
    renderBlobField: mocks.renderBlobField,
    dispose: vi.fn(),
  }),
}));

vi.mock("@/composables/canvas/useHilbertScopeRenderer", () => ({
  useHilbertScopeRenderer: () => ({
    initializeHilbertScope: vi.fn(),
    resizeHilbertScope: vi.fn(),
    renderHilbertScope: vi.fn(),
    cleanup: vi.fn(),
  }),
}));

vi.mock("@/utils/performanceMonitor", () => ({
  performanceMonitor: {
    update: vi.fn(),
    checkAndWarnPerformance: vi.fn(),
    getMetrics: vi.fn(),
    reset: vi.fn(),
  },
}));

const note = {
  name: "Do",
  number: 1,
  emotion: "Grounded",
  description: "Do note",
  fleckShape: "circle",
  texture: "soft",
  intervalName: "1P",
  semitones: 0,
} as const;

function createCanvasRef() {
  const canvas = {
    width: 800,
    height: 600,
    getContext: vi.fn(() => mockCanvasContext),
  } as unknown as HTMLCanvasElement;
  Object.assign(mockCanvasContext, { canvas });
  return ref(canvas);
}

describe("useUnifiedCanvas harmonic lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.blobConfig.value.isEnabled = true;
    mocks.blobConfig.value.connectionMode = "web";
    mocks.musicStore.getActiveNotes.mockReturnValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("expires finite id-less playback through the same synthetic blob key", () => {
    const canvas = useUnifiedCanvas(createCanvasRef());

    canvas.handleNotePlayed(
      note,
      261.63,
      undefined,
      4,
      "C4",
      "major",
      "C",
      100
    );

    const syntheticId = mocks.createBlob.mock.calls[0][7] as string;
    expect(syntheticId).toMatch(/^one-shot:C4:/);
    expect(mocks.recordHarmonicNote).toHaveBeenCalledWith(
      expect.objectContaining({ noteId: syntheticId, noteName: "C4" })
    );

    vi.advanceTimersByTime(100);
    expect(mocks.releaseHarmonicNote).toHaveBeenCalledWith(syntheticId);
    expect(mocks.startBlobFadeOutById).toHaveBeenCalledWith(syntheticId);

    vi.advanceTimersByTime(416);
    expect(mocks.expireHarmonicNote).toHaveBeenCalledWith(syntheticId);
  });

  it("hydrates missing blob anchors for notes held through the loading gate", () => {
    mocks.musicStore.getActiveNotes.mockReturnValue([
      {
        noteId: "held-c4",
        noteName: "C4",
        solfege: note,
        frequency: 261.63,
        octave: 4,
        mode: "major",
        key: "C",
      },
    ]);
    const canvas = useUnifiedCanvas(createCanvasRef());

    canvas.initializeCanvas();

    expect(mocks.createBlob).toHaveBeenCalledWith(
      note,
      261.63,
      0,
      0,
      window.innerWidth,
      window.innerHeight,
      mocks.blobConfig.value,
      "held-c4",
      "C",
      "major",
      4
    );
  });

  it("maps legacy releases to chromatic analysis and solfege blob keys", () => {
    const canvas = useUnifiedCanvas(createCanvasRef());

    canvas.handleNoteReleased("Do", undefined, "C4");

    expect(mocks.releaseHarmonicNote).toHaveBeenCalledWith("legacy:C4");
    expect(mocks.startBlobFadeOut).toHaveBeenCalledWith("Do");
  });

  it("does not build harmonic geometry while blobs are disabled", () => {
    const canvas = useUnifiedCanvas(createCanvasRef());
    canvas.initializeCanvas();
    mocks.blobConfig.value.isEnabled = false;

    mocks.animationOptions?.onFrame(1000, 1);

    expect(mocks.buildScene).not.toHaveBeenCalled();
    expect(mocks.renderBlobField).not.toHaveBeenCalled();
  });

  it("renders Web through the shared blob field with the analyzed scene", () => {
    const scene = { points: [{ blob: {} }, { blob: {} }] };
    mocks.buildScene.mockReturnValueOnce(scene);
    const canvas = useUnifiedCanvas(createCanvasRef());
    canvas.initializeCanvas();

    mocks.animationOptions?.onFrame(1000, 1);

    expect(mocks.renderBlobField).toHaveBeenCalledWith(
      mockCanvasContext,
      [],
      mocks.blobConfig.value,
      scene
    );
  });

  it("keeps Web in the same blob field before it has a relationship", () => {
    const canvas = useUnifiedCanvas(createCanvasRef());
    canvas.initializeCanvas();

    mocks.animationOptions?.onFrame(1000, 1);

    expect(mocks.renderBlobField).toHaveBeenCalledWith(
      mockCanvasContext,
      [],
      mocks.blobConfig.value,
      null
    );
  });

  it("exposes only enabled harmonic labels as accessible text", () => {
    const canvas = useUnifiedCanvas(createCanvasRef());

    expect(canvas.harmonicAccessibleText.value).toBe(
      "Chord: C major. Interval C4 to E4: 3M. Emotion: Grounded & radiant"
    );
  });
});
