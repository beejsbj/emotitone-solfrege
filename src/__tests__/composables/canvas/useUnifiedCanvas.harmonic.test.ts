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
    minorBlues: false,
    stageConfig: null as unknown as Ref<{ isEnabled: boolean }>,
    ambientConfig: { value: { isEnabled: false } },
    hilbertScopeConfig: { value: { isEnabled: false, sizeRatio: 0.6 } },
    musicStore: {
      laBasedMinor: false,
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
    stringEventTarget: null as EventTarget | null,
    createBlob: vi.fn(),
    startBlobFadeOut: vi.fn(),
    startBlobFadeOutById: vi.fn(),
    buildScene: vi.fn(() => null),
    renderBlobField: vi.fn(() => false),
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
  setStrudelLaBasedMinor: vi.fn(),
  getActiveStrudelStageNotes: () => mocks.strudelStageNotes,
  getAudioContext: () => null,
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
          // Stored names stay sharps-only; the analysis supplies spellings.
          displayedNotes: mocks.minorBlues ? [
            { noteId: "c4", noteName: "D#4", key: "D#", mode: "minor blues" },
            { noteId: "eb4", noteName: "A4", key: "D#", mode: "minor blues" },
          ] : [
            { noteId: "c4", noteName: "C4", key: "C", mode: "major" },
            { noteId: "eb4", noteName: "D#4", key: "C", mode: "major" },
          ],
          noteSpellings: mocks.minorBlues ? { c4: "Eb4", eb4: "A4" } : { c4: "C4", eb4: "Eb4" },
          intervalEdges: [
            {
              fromNoteId: "c4",
              toNoteId: "eb4",
              interval: "m3",
              spokenInterval: "minor third",
            },
          ],
          chordSymbol: mocks.minorBlues ? null : "Cm",
          chordLabel: mocks.minorBlues ? null : "Cm",
          chordSpoken: "C minor",
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
    hasPendingAnimation: () => mocks.activeBlobs.size > 0,
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

vi.mock("@/composables/canvas/useStringRenderer", () => ({
  useStringRenderer: () => ({
    hasPendingAnimation: () => false,
    initializeStrings: vi.fn(),
    addEventListeners: vi.fn((target: EventTarget) => { mocks.stringEventTarget = target; }),
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
    hasPendingAnimation: () => false,
    initializeHilbertScope: vi.fn(async () => {}),
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
    getBoundingClientRect: () => ({ width: window.innerWidth, height: window.innerHeight }),
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
    mocks.minorBlues = false;
    mocks.musicStore.laBasedMinor = false;
    mocks.stageConfig = ref({ isEnabled: true });
    mocks.ambientConfig.value.isEnabled = false;
    mocks.hilbertScopeConfig.value.isEnabled = false;
    mocks.blobConfig.value.isEnabled = true;
    mocks.blobConfig.value.connectionMode = "web";
    mocks.blobConfig.value.showChordLabel = true;
    mocks.blobConfig.value.showIntervalLabels = true;
    mocks.blobConfig.value.showEmotionLabel = true;
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

  it("shares the audible production timeline between harmonic notes and String events", () => {
    vi.setSystemTime(0);
    const clock = vi.spyOn(performance, "now").mockImplementation(() => Date.now());
    const sourceListeners = new Map<string, EventListener>();
    const listeners = vi.spyOn(window, "addEventListener").mockImplementation((type, listener) => {
      sourceListeners.set(type, listener as EventListener);
    });
    const active: ActiveNote = {
      noteId: "audible", noteName: "C4", solfege: note, solfegeIndex: 0,
      frequency: 261.63, octave: 4, keyboardOctave: 4, mode: "major", key: "C", audibleAt: 50,
    };
    const canvas = useUnifiedCanvas(createCanvasRef());
    canvas.initializeCanvas();
    expect(mocks.stringEventTarget).toBe(canvas.noteEventTarget);
    expect(canvas.noteEventTarget).not.toBe(window);
    const attack = vi.fn();
    canvas.noteEventTarget.addEventListener("note-played", attack);
    mocks.musicStore.getActiveNotes.mockReturnValue([active]);
    sourceListeners.get("note-played")!(new CustomEvent("note-played", {
      detail: { noteId: active.noteId, audibleAt: 50 },
    }));
    expect(mocks.stageActiveNotesProvider!()).toEqual([]);
    expect(attack).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(attack).toHaveBeenCalledOnce();
    expect(mocks.stageActiveNotesProvider!()).toEqual([active]);
    sourceListeners.get("note-released")!(new CustomEvent("note-released", {
      detail: { noteId: active.noteId, audibleAt: 100 },
    }));
    mocks.musicStore.getActiveNotes.mockReturnValue([]);
    expect(mocks.stageActiveNotesProvider!()).toEqual([active]);
    vi.advanceTimersByTime(50);
    expect(mocks.stageActiveNotesProvider!()).toEqual([]);
    canvas.cleanup();
    clock.mockRestore();
    listeners.mockRestore();
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
  });

  it("clears only transient Stage layers when Stage is disabled", () => {
    const canvas = useUnifiedCanvas(createCanvasRef());
    canvas.initializeCanvas();

    mocks.stageConfig.value.isEnabled = false;

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
    mocks.clearHilbertHistory.mockClear();

    usableRect.value = { x: 0, y: 0, width: 800, height: 80 };
    mocks.animationOptions?.onFrame(1_016, 1.016);
    canvas.handleNotePlayed(note, 293.66, "suspended", 4, "D4", "major", "C", 2);
    mocks.animationOptions?.onFrame(1_032, 1.032);

    expect(mocks.clearHilbertHistory).toHaveBeenCalledOnce();
    expect(mocks.clearAllBlobs).not.toHaveBeenCalled();

    usableRect.value = { x: 0, y: 0, width: 800, height: 600 };
    mocks.animationOptions?.onFrame(1_048, 1.048);
    expect(mocks.clearHilbertHistory).toHaveBeenCalledOnce();
  });

  it("delivers silent samples to Atmosphere while its painting is disabled", () => {
    const audioFeatures = {
      initialize: vi.fn(() => null),
      sample: vi.fn(() => ({ envelope: 0.0005, hasSignal: false })),
      cleanup: vi.fn(),
    };
    const canvas = useUnifiedCanvas(createCanvasRef(), {
      usableRect: ref({ x: 0, y: 0, width: 800, height: 600 }),
      reducedMotion: ref(false),
      audioFeatures,
      getActiveNotes: () => [],
    });
    canvas.initializeCanvas();
    mocks.animationOptions?.onFrame(1_000, 1);

    expect(mocks.renderAmbientBackground).toHaveBeenCalledOnce();
    const frame = mocks.renderAmbientBackground.mock.calls[0];
    expect(frame[2].isEnabled).toBe(false);
    expect(frame[7]).toEqual({ envelope: 0.0005, hasSignal: false });
    expect(frame[9]).toEqual([]);
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
    expect(mocks.renderHilbertScope.mock.calls.at(-1)?.at(-2)).toEqual([
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

  it.each([[false, "Do", "Se"], [true, "La", "Me"]] as const)("announces Eb minor-blues scale function despite respelling (la-based=%s)", (laBasedMinor, tonic, blue) => {
    mocks.minorBlues = true;
    mocks.musicStore.laBasedMinor = laBasedMinor;
    const canvas = useUnifiedCanvas(createCanvasRef());
    try {
      expect(canvas.harmonicAccessibleText.value).toContain(`Interval ${tonic} (E flat 4) to ${blue} (A 4)`);
    } finally {
      canvas.cleanup();
    }
  });

  it("exposes only enabled harmonic labels as accessible text", () => {
    const canvas = useUnifiedCanvas(createCanvasRef());

    const fullText = "Chord: C minor. Interval Do (C 4) to Me (E flat 4): minor third. Emotion: Grounded & radiant";
    expect(canvas.harmonicAccessibleText.value).toBe(fullText);
  });

  it("selectively exposes only enabled chord label in accessible text", () => {
    mocks.blobConfig.value.showIntervalLabels = false;
    mocks.blobConfig.value.showEmotionLabel = false;
    const canvas = useUnifiedCanvas(createCanvasRef());

    expect(canvas.harmonicAccessibleText.value).toBe("Chord: C minor");
  });

  it("selectively exposes only enabled interval label in accessible text", () => {
    mocks.blobConfig.value.showChordLabel = false;
    mocks.blobConfig.value.showEmotionLabel = false;
    const canvas = useUnifiedCanvas(createCanvasRef());

    expect(canvas.harmonicAccessibleText.value).toBe("Interval Do (C 4) to Me (E flat 4): minor third");
  });

  it("selectively exposes only enabled emotion label in accessible text", () => {
    mocks.blobConfig.value.showChordLabel = false;
    mocks.blobConfig.value.showIntervalLabels = false;
    const canvas = useUnifiedCanvas(createCanvasRef());

    expect(canvas.harmonicAccessibleText.value).toBe("Emotion: Grounded & radiant");
  });

  it("exposes no text when all harmonic labels are disabled", () => {
    mocks.blobConfig.value.showChordLabel = false;
    mocks.blobConfig.value.showIntervalLabels = false;
    mocks.blobConfig.value.showEmotionLabel = false;
    const canvas = useUnifiedCanvas(createCanvasRef());

    expect(canvas.harmonicAccessibleText.value).toBe("");
  });
});
