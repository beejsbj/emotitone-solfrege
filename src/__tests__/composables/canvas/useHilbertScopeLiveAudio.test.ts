import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const musicColor = vi.hoisted(() => ({
  getPrimaryColorForPitch: vi.fn(),
  getStaticPrimaryColorForPitch: vi.fn(),
  getPrimaryColor: vi.fn(),
  getStaticPrimaryColor: vi.fn(),
}));

vi.mock("@/composables/useMusicColor", () => ({
  useMusicColor: () => musicColor,
}));

vi.mock("@/stores/music", () => ({
  useMusicStore: () => ({
    getActiveNotes: () => [],
    solfegeData: [],
    currentMode: "major",
    currentKey: "C",
  }),
}));

import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { useHilbertScopeRenderer } from "@/composables/canvas/useHilbertScopeRenderer";

function audioNode(extra: Record<string, unknown> = {}) {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    ...extra,
  };
}

function canvasContext() {
  return {
    setTransform: vi.fn(),
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    globalAlpha: 1,
    lineWidth: 1,
    shadowBlur: 0,
    shadowColor: "",
    strokeStyle: "",
  };
}

describe("Hilbert Scope waveform source", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("only consumes the analysis source supplied by the Stage", async () => {
    const context = {
      sampleRate: 48_000,
      createGain: () => gain,
      createAnalyser: () => audioNode({
        fftSize: 0,
        frequencyBinCount: 128,
      }),
      createBuffer: () => ({ copyToChannel: vi.fn() }),
      createConvolver: () => audioNode({ normalize: true, buffer: null }),
      createDelay: () => audioNode({ delayTime: { value: 0 } }),
    } as unknown as AudioContext;
    const stageBus = audioNode({ context });
    const renderer = useHilbertScopeRenderer();

    await renderer.initializeHilbertScope(
      800,
      600,
      { sizeRatio: 0.6 } as any,
      stageBus as unknown as AudioNode,
    );
    expect(stageBus.connect).toHaveBeenCalledTimes(2);

    renderer.cleanup();
    expect(stageBus.disconnect).toHaveBeenCalledTimes(2);
  });

  it.each([1, 2, 3])("keeps the scope and its history in CSS coordinates at DPR %s", async dpr => {
    vi.stubGlobal("devicePixelRatio", dpr);
    const history = document.createElement("canvas");
    const swap = document.createElement("canvas");
    const historyContext = canvasContext();
    const swapContext = canvasContext();
    vi.spyOn(history, "getContext").mockReturnValue(historyContext as unknown as CanvasRenderingContext2D);
    vi.spyOn(swap, "getContext").mockReturnValue(swapContext as unknown as CanvasRenderingContext2D);
    const canvases = [history, swap];
    vi.spyOn(document, "createElement").mockImplementation(() => canvases.shift()!);
    const renderer = useHilbertScopeRenderer();
    await renderer.initializeHilbertScope(390, 844, DEFAULT_CONFIG.hilbertScope);
    const scale = Math.min(dpr, 2);
    expect([history.width, history.height, swap.width, swap.height]).toEqual([
      390 * scale, 844 * scale, 390 * scale, 844 * scale,
    ]);
    expect(historyContext.setTransform).toHaveBeenLastCalledWith(scale, 0, 0, scale, 0, 0);
    const main = canvasContext();
    renderer.renderHilbertScope(main as unknown as CanvasRenderingContext2D, 1,
      DEFAULT_CONFIG.hilbertScope, 390, 844, undefined, { envelope: 1, hasSignal: true });
    expect(main.drawImage).toHaveBeenCalledWith(history, 0, 0, 390, 844);
    renderer.resizeHilbertScope(844, 390, DEFAULT_CONFIG.hilbertScope);
    expect([history.width, history.height]).toEqual([844 * scale, 390 * scale]);
    renderer.cleanup();
  });

  it("gives equal scope growth, fading and history decay after one second at 60 and 120 Hz", async () => {
    const results: number[][] = [];
    for (const hz of [60, 120]) {
      const historyContext = canvasContext();
      const swapContext = canvasContext();
      const canvases = [historyContext, swapContext].map(context => ({
        width: 0, height: 0, getContext: () => context,
      }));
      const create = vi.spyOn(document, "createElement").mockImplementation(() => canvases.shift()! as unknown as HTMLCanvasElement);
      const context = {
        sampleRate: 48000,
        createAnalyser: () => audioNode({ getFloatTimeDomainData: (data: Float32Array) => data.fill(0.25) }),
        createBuffer: () => ({ copyToChannel: vi.fn() }),
        createConvolver: () => audioNode(),
        createDelay: () => audioNode({ delayTime: { value: 0 } }),
      } as unknown as AudioContext;
      const renderer = useHilbertScopeRenderer();
      const config = { ...DEFAULT_CONFIG.hilbertScope, scaleInDuration: 2, history: 0.9, smear: 0 };
      await renderer.initializeHilbertScope(800, 600, config, audioNode({ context }) as unknown as AudioNode);
      const main = canvasContext();
      for (let index = 0; index <= hz; index++) {
        renderer.renderHilbertScope(main as unknown as CanvasRenderingContext2D, index / hz,
          config, 800, 600, undefined, { envelope: 1, hasSignal: true }, false, [], index ? 1 / hz : 0);
      }
      results.push([...historyContext.moveTo.mock.calls.at(-1)!, historyContext.globalAlpha]);
      expect(renderer.hasPendingAnimation()).toBe(true);
      for (let index = 0; index < hz; index++) {
        renderer.renderHilbertScope(main as unknown as CanvasRenderingContext2D, 1 + index / hz,
          config, 800, 600, undefined, { envelope: 0, hasSignal: false }, false, [], 1 / hz);
      }
      expect(renderer.hasPendingAnimation()).toBe(false);
      renderer.cleanup();
      create.mockRestore();
    }
    expect(results[0][0]).toBeCloseTo(results[1][0], 8);
    expect(results[0][1]).toBeCloseTo(results[1][1], 8);
    expect(results[0][2]).toBeCloseTo(results[1][2], 8);
  });

  it("clears waveform history for Reduced Motion and resumes from a blank trail", async () => {
    const historyContext = canvasContext();
    const swapContext = canvasContext();
    const mainContext = canvasContext();
    const historyCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => historyContext),
    };
    const swapCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => swapContext),
    };
    const canvases = [historyCanvas, swapCanvas];
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      if (tagName === "canvas") {
        return canvases.shift() as unknown as HTMLCanvasElement;
      }
      throw new Error(`Unexpected element: ${tagName}`);
    }) as typeof document.createElement);

    const analyser = () => audioNode({
      fftSize: 0,
      getFloatTimeDomainData: vi.fn((values: Float32Array) => {
        values[0] = 0.25;
      }),
    });
    const context = {
      sampleRate: 48_000,
      createAnalyser: analyser,
      createBuffer: () => ({ copyToChannel: vi.fn() }),
      createConvolver: () => audioNode({ normalize: true, buffer: null }),
      createDelay: () => audioNode({ delayTime: { value: 0 } }),
    } as unknown as AudioContext;
    const stageBus = audioNode({ context });
    const renderer = useHilbertScopeRenderer();
    const config = {
      isEnabled: true,
      sizeRatio: 0.6,
      scaleInDuration: 1,
      history: 0.8,
      smear: 0.4,
      opacity: 1,
      glowEnabled: false,
      glowIntensity: 0,
      thickness: 2,
    } as any;

    // Exact-pitch note: solfege index 0 (Do) but sounding pitch class 1 (C#).
    const exactPitchNote = { solfegeIndex: 0, pitchClassIndex: 1, octave: 4, mode: "major", key: "C" } as any;

    await renderer.initializeHilbertScope(800, 600, config, stageBus as unknown as AudioNode);
    renderer.renderHilbertScope(
      mainContext as unknown as CanvasRenderingContext2D,
      0,
      config,
      800,
      600,
      undefined,
      { envelope: 1, hasSignal: true },
      false,
      [exactPitchNote],
    );
    expect(musicColor.getPrimaryColorForPitch).toHaveBeenCalledWith(0, 1, "major", "C", 4);
    expect(musicColor.getPrimaryColor).not.toHaveBeenCalled();
    expect(historyContext.stroke).toHaveBeenCalled();
    expect(mainContext.drawImage).toHaveBeenCalledWith(historyCanvas, 0, 0, 800, 600);

    historyContext.clearRect.mockClear();
    swapContext.clearRect.mockClear();
    renderer.clearHistory();
    expect(historyContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(swapContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);

    historyContext.clearRect.mockClear();
    historyContext.stroke.mockClear();
    mainContext.arc.mockClear();
    mainContext.drawImage.mockClear();
    renderer.renderHilbertScope(
      mainContext as unknown as CanvasRenderingContext2D,
      16,
      config,
      800,
      600,
      undefined,
      { envelope: 1, hasSignal: true },
      true,
    );

    expect(historyContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(historyContext.stroke).not.toHaveBeenCalled();
    expect(mainContext.arc).toHaveBeenCalled();
    expect(mainContext.drawImage).not.toHaveBeenCalled();

    historyContext.stroke.mockClear();
    mainContext.drawImage.mockClear();
    renderer.renderHilbertScope(
      mainContext as unknown as CanvasRenderingContext2D,
      32,
      config,
      800,
      600,
      undefined,
      { envelope: 1, hasSignal: true },
    );

    expect(historyContext.stroke).toHaveBeenCalled();
    expect(mainContext.drawImage).toHaveBeenCalledWith(historyCanvas, 0, 0, 800, 600);

    renderer.cleanup();
  });
});
