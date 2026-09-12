import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listener: null as ((source: any) => void) | null,
  unsubscribe: vi.fn(),
  master: { connect: vi.fn(), disconnect: vi.fn() } as {
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  } | null,
  analyserSamples: new Float32Array(1024),
}));

vi.mock("@/services/liveAudio", () => ({
  liveAudioInput: {
    subscribe(listener: (source: any) => void) {
      mocks.listener = listener;
      listener(null);
      return mocks.unsubscribe;
    },
  },
}));

vi.mock("@/services/superdoughAudio", () => ({
  getSuperdoughMasterGain: () => mocks.master,
  getAudioContext: () => context,
}));

const analyser = {
  fftSize: 1024,
  smoothingTimeConstant: 0,
  connect: vi.fn(),
  disconnect: vi.fn(),
  getFloatTimeDomainData: vi.fn((target: Float32Array) => target.set(mocks.analyserSamples)),
};
const bus = { gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() };
const context = {
  createGain: () => bus,
  createAnalyser: () => analyser,
} as unknown as AudioContext;

import { createStageAudioFeatures } from "@/services/stageAudio";

describe("Stage audio features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.analyserSamples.fill(0);
    mocks.listener = null;
    mocks.master = { connect: vi.fn(), disconnect: vi.fn() };
  });

  it("fans playback and authorized live input into one analysis bus", () => {
    const features = createStageAudioFeatures();
    expect(features.initialize()).toBe(bus);
    const microphone = { connect: vi.fn(), disconnect: vi.fn() };
    mocks.listener?.({ context, node: microphone, stream: {} });
    expect(mocks.master?.connect).toHaveBeenCalledWith(bus);
    expect(microphone.connect).toHaveBeenCalledWith(bus);

    features.cleanup();
    expect(microphone.disconnect).toHaveBeenCalledWith(bus);
    expect(mocks.master?.disconnect).toHaveBeenCalledWith(bus);
  });

  it("attaches playback after deferred Superdough initialization", () => {
    mocks.master = null;
    const features = createStageAudioFeatures();

    expect(features.initialize()).toBe(bus);
    const deferredMaster = { connect: vi.fn(), disconnect: vi.fn() };
    mocks.master = deferredMaster;

    features.sample(16);
    features.sample(32);

    expect(deferredMaster.connect).toHaveBeenCalledOnce();
    expect(deferredMaster.connect).toHaveBeenCalledWith(bus);

    const replacementMaster = { connect: vi.fn(), disconnect: vi.fn() };
    mocks.master = replacementMaster;
    features.sample(48);

    expect(deferredMaster.disconnect).toHaveBeenCalledWith(bus);
    expect(replacementMaster.connect).toHaveBeenCalledOnce();
    expect(replacementMaster.connect).toHaveBeenCalledWith(bus);
    features.cleanup();
    expect(replacementMaster.disconnect).toHaveBeenCalledWith(bus);
  });

  it("uses a faster attack than release and does not invent an idle signal", () => {
    const features = createStageAudioFeatures();
    features.initialize();
    expect(features.sample(16)).toEqual({ envelope: 0, hasSignal: false });

    mocks.analyserSamples.fill(0.12);
    const attack = features.sample(86);
    expect(attack.envelope).toBeGreaterThan(0.2);
    expect(attack.hasSignal).toBe(true);

    mocks.analyserSamples.fill(0);
    const release = features.sample(156);
    expect(release.envelope).toBeGreaterThan(0);
    expect(release.envelope).toBeLessThan(attack.envelope);
    expect(release.hasSignal).toBe(true);
  });
});
