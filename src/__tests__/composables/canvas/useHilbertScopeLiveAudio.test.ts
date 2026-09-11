import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  liveListener: null as ((source: any) => void) | null,
  unsubscribe: vi.fn(),
  playback: { connect: vi.fn(), disconnect: vi.fn() },
}));

vi.mock("@/services/liveAudio", () => ({
  liveAudioInput: {
    subscribe: (listener: (source: any) => void) => {
      mocks.liveListener = listener;
      listener(null);
      return mocks.unsubscribe;
    },
  },
}));

vi.mock("@/services/superdoughAudio", () => ({
  getAudioContext: vi.fn(),
  getSuperdoughMasterGain: () => mocks.playback,
}));

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

import { getAudioContext } from "@/services/superdoughAudio";
import { useHilbertScopeRenderer } from "@/composables/canvas/useHilbertScopeRenderer";

function audioNode(extra: Record<string, unknown> = {}) {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    ...extra,
  };
}

describe("Hilbert Scope live audio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.liveListener = null;
  });

  it("attaches and detaches an authorized microphone source from its analysis bus", async () => {
    const gain = audioNode({ gain: { value: 0 } });
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
    vi.mocked(getAudioContext).mockReturnValue(context);
    const microphone = audioNode();
    const renderer = useHilbertScopeRenderer();

    await renderer.initializeHilbertScope(800, 600, { sizeRatio: 0.6 } as any);
    mocks.liveListener?.({ context, node: microphone, stream: {} });

    expect(microphone.connect).toHaveBeenCalledWith(gain);

    mocks.liveListener?.(null);
    expect(microphone.disconnect).toHaveBeenCalledWith(gain);

    renderer.cleanup();
    expect(mocks.playback.disconnect).toHaveBeenCalledWith(gain);
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
