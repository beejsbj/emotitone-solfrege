import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/composables/useMusicColor", () => ({
  useMusicColor: () => ({
    getPrimaryColorForPitch: vi.fn(),
    getStaticPrimaryColorForPitch: vi.fn(),
    getPrimaryColor: vi.fn(),
    getStaticPrimaryColor: vi.fn(),
  }),
}));

vi.mock("@/stores/music", () => ({
  useMusicStore: () => ({
    getActiveNotes: () => [],
    solfegeData: [],
    currentMode: "major",
    currentKey: "C",
  }),
}));

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

    await renderer.initializeHilbertScope(800, 600, config, stageBus as unknown as AudioNode);
    renderer.renderHilbertScope(
      mainContext as unknown as CanvasRenderingContext2D,
      0,
      config,
      800,
      600,
      undefined,
      { envelope: 1, hasSignal: true },
    );
    expect(historyContext.stroke).toHaveBeenCalled();
    expect(mainContext.drawImage).toHaveBeenCalledWith(historyCanvas, 0, 0);

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
    expect(mainContext.drawImage).toHaveBeenCalledWith(historyCanvas, 0, 0);

    renderer.cleanup();
  });
});
