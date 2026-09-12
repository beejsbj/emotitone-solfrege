import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref, type Ref } from "vue";
import { useUnifiedCanvas } from "@/composables/canvas/useUnifiedCanvas";
import { mockCanvasContext } from "@/__tests__/helpers/test-utils";
import type { ActiveNote } from "@/types/music";

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
    stageConfig: null as unknown as Ref<{ isEnabled: boolean }>,
    ambientConfig: { value: { isEnabled: false } },
    hilbertScopeConfig: { value: { isEnabled: false, sizeRatio: 0.6 } },
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
    activeBlobs: new Map<string, { baseRadius: number }>(),
    liveStageNotes: [] as ActiveNote[],
    strudelStageNotes: [] as ActiveNote[],
    stageActiveNotesProvider: null as null | (() => readonly ActiveNote[]),
    createBlob: vi.fn(),
    startBlobFadeOut: vi.fn(),
    startBlobFadeOutById: vi.fn(),
    buildScene: vi.fn(() => null),
    renderBlobField: vi.fn(() => false),
    createParticles: vi.fn(),
    renderParticles: vi.fn(),
    clearAllParticles: vi.fn(),
    clearAllBlobs: vi.fn(),
    clearHilbertHistory: vi.fn(),
    renderAmbientBackground: vi.fn(),
    renderHilbertScope: vi.fn(),
    animationOptions: null as null | {
      onFrame: (timestamp: number, elapsed: number) => void;
    },
  };
});

vi.mock("@/stores/music", () => ({
  useMusicStore: () => mocks.musicStore,
}));

vi.mock("@/services/hummingStage", () => ({
  getActiveLivePitchStageNotes: () => mocks.liveStageNotes,
}));

vi.mock("@/services/superdoughAudio", () => ({
  getActiveStrudelStageNotes: () => mocks.strudelStageNotes,
}));

vi.mock("@/services/stageAudio", () => ({
  createStageAudioFeatures: () => ({
    initialize: vi.fn(() => null),
    sample: vi.fn(() => ({ envelope: 0, hasSignal: false })),
    cleanup: vi.fn(),
  }),
}));

vi.mock("@/composables/useVisualConfig", () => ({
  useVisualConfig: () => ({
    stageConfig: mocks.stageConfig,
    blobConfig: mocks.blobConfig,
    ambientConfig: mocks.ambientConfig,
    particleConfig: { value: { isEnabled: false, count: 0 } },
    stringConfig: { value: { isEnabled: false } },
    animationConfig: { value: {} },
    hilbertScopeConfig: mocks.hilbertScopeConfig,
  }),
}));

vi.mock("@/composables/useHarmonicAnalysis", () => ({
  useHarmonicAnalysis: (getActiveNotes: () => readonly ActiveNote[]) => {
    mocks.stageActiveNotesProvider = getActiveNotes;
    return {
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
    };
  },
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
    activeBlobs: mocks.activeBlobs,
    createBlob: mocks.createBlob,
    startBlobFadeOut: mocks.startBlobFadeOut,
    startBlobFadeOutById: mocks.startBlobFadeOutById,
    reprojectBlobs: vi.fn(),
    prepareBlobs: vi.fn(),
    getPreparedBlobFrames: vi.fn(() => []),
    renderBlobs: vi.fn(),
    getActiveBlobCount: vi.fn(() => 0),
    clearAllBlobs: mocks.clearAllBlobs,
    removeBlob: vi.fn(),
  }),
}));

vi.mock("@/composables/canvas/useParticleSystem", () => ({
  useParticleSystem: () => ({
    createParticles: mocks.createParticles,
    renderParticles: mocks.renderParticles,
    getActiveParticleCount: vi.fn(() => 0),
    clearAllParticles: mocks.clearAllParticles,
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
  useAmbientRenderer: () => ({
    renderAmbientBackground: mocks.renderAmbientBackground,
  }),
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
    renderHilbertScope: mocks.renderHilbertScope,
    clearHistory: mocks.clearHilbertHistory,
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
    mocks.stageConfig = ref({ isEnabled: true });
    mocks.ambientConfig.value.isEnabled = false;
    mocks.hilbertScopeConfig.value.isEnabled = false;
    mocks.blobConfig.value.isEnabled = true;
    mocks.blobConfig.value.connectionMode = "web";
    mocks.activeBlobs.clear();
    mocks.liveStageNotes.length = 0;
    mocks.strudelStageNotes.length = 0;
    mocks.stageActiveNotesProvider = null;
    mocks.createBlob.mockImplementation((...args: unknown[]) => {
      const config = args[6] as { isEnabled: boolean };
      const noteId = args[7] as string | undefined;
      if (config.isEnabled && noteId) {
        mocks.activeBlobs.set(noteId, { baseRadius: 50 });
      }
    });
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
      0,
      100
    );

    const syntheticId = mocks.createBlob.mock.calls[0][7] as string;
    expect(syntheticId).toMatch(/^one-shot:C4:/);
    expect(mocks.recordHarmonicNote).toHaveBeenCalledWith(
      expect.objectContaining({
        noteId: syntheticId,
        noteName: "C4",
        pitchClassIndex: 0,
      })
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
      4,
      "C4",
    );
  });

  it("hydrates a held note when Note Bodies is re-enabled without replaying effects", () => {
    const activeNote = {
      noteId: "held-c-sharp-4",
      noteName: "C#4",
      solfege: note,
      solfegeIndex: -1,
      pitchClassIndex: 1,
      frequency: 277.18,
      octave: 4,
      keyboardOctave: 4,
      mode: "major",
      key: "C",
    };
    mocks.musicStore.getActiveNotes.mockReturnValue([activeNote]);
    mocks.blobConfig.value.isEnabled = false;
    const canvas = useUnifiedCanvas(createCanvasRef());
    canvas.initializeCanvas();
    expect(mocks.createBlob).not.toHaveBeenCalled();

    mocks.blobConfig.value.isEnabled = true;
    mocks.animationOptions?.onFrame(1_000, 1);
    mocks.animationOptions?.onFrame(1_016, 1.016);

    expect(mocks.createBlob).toHaveBeenCalledTimes(1);
    expect(mocks.createBlob).toHaveBeenCalledWith(
      note,
      277.18,
      0,
      0,
      window.innerWidth,
      window.innerHeight,
      mocks.blobConfig.value,
      "held-c-sharp-4",
      "C",
      "major",
      4,
      "C#4",
    );
    expect(mocks.recordHarmonicNote).not.toHaveBeenCalled();
    expect(mocks.createParticles).not.toHaveBeenCalled();
  });

  it("rehydrates an unchanged live pitch that is absent from the music store", () => {
    mocks.liveStageNotes.push({
      noteId: "live-pitch-1-1",
      noteName: "C#4",
      solfege: note,
      solfegeIndex: -1,
      pitchClassIndex: 1,
      frequency: 277.18,
      octave: 4,
      keyboardOctave: 4,
      mode: "major",
      key: "C",
    });
    expect(mocks.stageActiveNotesProvider).toBeNull();
    mocks.blobConfig.value.isEnabled = false;
    const canvas = useUnifiedCanvas(createCanvasRef());
    expect(mocks.stageActiveNotesProvider?.()).toEqual(mocks.liveStageNotes);
    canvas.initializeCanvas();
    expect(mocks.createBlob).not.toHaveBeenCalled();

    mocks.blobConfig.value.isEnabled = true;
    mocks.animationOptions?.onFrame(1_000, 1);
    mocks.animationOptions?.onFrame(1_016, 1.016);

    expect(mocks.createBlob).toHaveBeenCalledOnce();
    expect(mocks.createBlob).toHaveBeenCalledWith(
      note,
      277.18,
      0,
      0,
      window.innerWidth,
      window.innerHeight,
      mocks.blobConfig.value,
      "live-pitch-1-1",
      "C",
      "major",
      4,
      "C#4",
    );
    expect(mocks.recordHarmonicNote).not.toHaveBeenCalled();
    expect(mocks.createParticles).not.toHaveBeenCalled();
  });

  it("rehydrates an active Strudel note that began while bodies were hidden", () => {
    mocks.strudelStageNotes.push({
      noteId: "strudel-1",
      noteName: "C#4",
      solfege: note,
      solfegeIndex: -1,
      pitchClassIndex: 1,
      frequency: 277.18,
      octave: 4,
      keyboardOctave: 4,
      mode: "major",
      key: "C",
    });
    mocks.blobConfig.value.isEnabled = false;
    const canvas = useUnifiedCanvas(createCanvasRef());
    expect(mocks.stageActiveNotesProvider?.()).toEqual(mocks.strudelStageNotes);
    canvas.initializeCanvas();
    expect(mocks.createBlob).not.toHaveBeenCalled();

    mocks.blobConfig.value.isEnabled = true;
    mocks.animationOptions?.onFrame(1_000, 1);

    expect(mocks.createBlob).toHaveBeenCalledOnce();
    expect(mocks.createBlob).toHaveBeenCalledWith(
      note,
      277.18,
      0,
      0,
      window.innerWidth,
      window.innerHeight,
      mocks.blobConfig.value,
      "strudel-1",
      "C",
      "major",
      4,
      "C#4",
    );
    expect(mocks.recordHarmonicNote).not.toHaveBeenCalled();
    expect(mocks.createParticles).not.toHaveBeenCalled();
  });

  it("clears in-flight flecks immediately when Reduced Motion turns on", () => {
    const reducedMotion = ref(false);
    const canvas = useUnifiedCanvas(createCanvasRef(), {
      usableRect: ref({ x: 0, y: 0, width: 800, height: 600 }),
      reducedMotion,
    });
    canvas.initializeCanvas();

    canvas.handleNotePlayed(note, 261.63, "first", 4, "C4", "major", "C", 0);
    expect(mocks.createParticles).toHaveBeenCalledTimes(1);

    reducedMotion.value = true;
    reducedMotion.value = false;
    expect(mocks.clearAllParticles).toHaveBeenCalledTimes(1);

    reducedMotion.value = true;
    canvas.handleNotePlayed(note, 293.66, "hidden", 4, "D4", "major", "C", 2);
    expect(mocks.createParticles).toHaveBeenCalledTimes(1);

    reducedMotion.value = false;
    canvas.handleNotePlayed(note, 329.63, "resumed", 4, "E4", "major", "C", 4);
    expect(mocks.createParticles).toHaveBeenCalledTimes(2);
  });

  it("clears only transient Stage layers when Stage is disabled", () => {
    const canvas = useUnifiedCanvas(createCanvasRef());
    canvas.initializeCanvas();

    mocks.stageConfig.value.isEnabled = false;

    expect(mocks.clearAllParticles).toHaveBeenCalledOnce();
    expect(mocks.clearHilbertHistory).toHaveBeenCalledOnce();
    expect(mocks.clearAllBlobs).not.toHaveBeenCalled();
  });

  it("retires transient layers once while the Stage layout is suspended", () => {
    const usableRect = ref({ x: 0, y: 0, width: 800, height: 600 });
    const canvas = useUnifiedCanvas(createCanvasRef(), {
      usableRect,
      reducedMotion: ref(false),
    });
    canvas.initializeCanvas();
    mocks.animationOptions?.onFrame(1_000, 1);
    mocks.clearAllParticles.mockClear();
    mocks.clearHilbertHistory.mockClear();

    usableRect.value = { x: 0, y: 0, width: 800, height: 80 };
    mocks.animationOptions?.onFrame(1_016, 1.016);
    canvas.handleNotePlayed(note, 293.66, "suspended", 4, "D4", "major", "C", 2);
    mocks.animationOptions?.onFrame(1_032, 1.032);

    expect(mocks.clearAllParticles).toHaveBeenCalledOnce();
    expect(mocks.clearHilbertHistory).toHaveBeenCalledOnce();
    expect(mocks.clearAllBlobs).not.toHaveBeenCalled();
    expect(mocks.createParticles).not.toHaveBeenCalled();

    usableRect.value = { x: 0, y: 0, width: 800, height: 600 };
    mocks.animationOptions?.onFrame(1_048, 1.048);
    expect(mocks.clearAllParticles).toHaveBeenCalledOnce();
    expect(mocks.clearHilbertHistory).toHaveBeenCalledOnce();
  });

  it("shares live pitch identity with Ambient and Hilbert", () => {
    const liveNote = {
      noteId: "live-pitch-1-1",
      noteName: "E4",
      solfege: note,
      solfegeIndex: 2,
      pitchClassIndex: 4,
      frequency: 329.63,
      octave: 4,
      keyboardOctave: 4,
      mode: "major",
      key: "C",
    } satisfies ActiveNote;
    mocks.liveStageNotes.push(liveNote);
    mocks.ambientConfig.value.isEnabled = true;
    mocks.hilbertScopeConfig.value.isEnabled = true;
    const canvas = useUnifiedCanvas(createCanvasRef());
    canvas.initializeCanvas();

    mocks.animationOptions?.onFrame(1_000, 1);

    expect(mocks.renderAmbientBackground.mock.calls.at(-1)?.at(-1)).toEqual([
      liveNote,
    ]);
    expect(mocks.renderHilbertScope.mock.calls.at(-1)?.at(-1)).toEqual([
      liveNote,
    ]);
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
