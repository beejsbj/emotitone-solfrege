import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    getPrimaryColorForPitch: vi.fn(),
    getPrimaryColor: vi.fn(),
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

describe("Hilbert Scope waveform source", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
