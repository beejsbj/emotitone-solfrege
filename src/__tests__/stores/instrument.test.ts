import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useInstrumentStore } from "@/stores/instrument";

const liveMocks = vi.hoisted(() => ({ needsLivePlaybackPreparation: vi.fn(() => false) }));
vi.mock("@/services/livePlayback", () => liveMocks);

const audioMocks = vi.hoisted(() => ({
  initSuperdoughAudio: vi.fn().mockResolvedValue(undefined),
  isPrewarmed: vi.fn((instrumentName: string) => instrumentName === "piano"),
  prewarmSoundSamples: vi.fn().mockResolvedValue(undefined),
  getReadySounds: vi.fn(() => ["piano"]),
  setLiveSynthControls: vi.fn(),
}));

vi.mock("@/services/superdoughAudio", () => ({
  ...audioMocks,
}));

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("instrument store warmup", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    liveMocks.needsLivePlaybackPreparation.mockReturnValue(false);
    audioMocks.initSuperdoughAudio.mockResolvedValue(undefined);
    audioMocks.isPrewarmed.mockImplementation(
      (instrumentName: string) => instrumentName === "piano"
    );
    audioMocks.prewarmSoundSamples.mockResolvedValue(undefined);
    audioMocks.getReadySounds.mockReturnValue(["piano"]);
  });

  it("selects ready instruments without entering warmup", async () => {
    const store = useInstrumentStore();

    const result = await store.setInstrument("piano");

    expect(result).toEqual({ status: "ready", instrument: "piano" });
    expect(store.currentInstrument).toBe("piano");
    expect(store.warmingInstrument).toBeNull();
    expect(store.isInteractionLocked).toBe(false);
    expect(audioMocks.prewarmSoundSamples).not.toHaveBeenCalled();
  });

  it("waits for render-thread preparation even when the sample cache is warm", async () => {
    const store = useInstrumentStore();
    const prepared = createDeferred<void>();
    liveMocks.needsLivePlaybackPreparation.mockReturnValue(true);
    audioMocks.prewarmSoundSamples.mockReturnValueOnce(prepared.promise);
    const selection = store.setInstrument("piano");
    expect(store.isInteractionLocked).toBe(true);
    expect(audioMocks.prewarmSoundSamples).toHaveBeenCalledWith("piano");
    prepared.resolve();
    await expect(selection).resolves.toEqual({ status: "ready", instrument: "piano" });
    expect(store.isInteractionLocked).toBe(false);
  });

  it("keeps initialization pending until the selected live renderer is prepared", async () => {
    const store = useInstrumentStore();
    const prepared = createDeferred<void>();
    liveMocks.needsLivePlaybackPreparation.mockReturnValue(true);
    audioMocks.prewarmSoundSamples.mockReturnValueOnce(prepared.promise);
    const initialization = store.initializeInstruments();
    await Promise.resolve();
    expect(store.isLoading).toBe(true);
    expect(audioMocks.prewarmSoundSamples).toHaveBeenCalledWith("piano");
    prepared.resolve();
    await initialization;
    expect(store.isLoading).toBe(false);
  });

  it("locks interaction until a cold instrument becomes ready", async () => {
    const store = useInstrumentStore();
    const deferred = createDeferred<void>();
    audioMocks.prewarmSoundSamples.mockReturnValueOnce(deferred.promise);

    const warmup = store.setInstrument("gm_vibraphone");

    expect(store.currentInstrument).toBe("gm_vibraphone");
    expect(store.warmingInstrument).toBe("gm_vibraphone");
    expect(store.isInteractionLocked).toBe(true);

    deferred.resolve();
    await warmup;

    expect(store.isInstrumentReady("gm_vibraphone")).toBe(true);
    expect(store.warmingInstrument).toBeNull();
    expect(store.isInteractionLocked).toBe(false);
  });

  it("restores the last ready instrument when warmup fails", async () => {
    const store = useInstrumentStore();
    // Establish piano as the last ready instrument explicitly; the app default
    // (triangle) is not ready under this suite's readiness mock.
    await store.setInstrument("piano");
    audioMocks.prewarmSoundSamples.mockRejectedValueOnce(
      new Error("Network down")
    );

    const result = await store.setInstrument("gm_vibraphone");

    expect(result).toEqual({
      status: "failed",
      instrument: "gm_vibraphone",
      fallback: "piano",
    });
    expect(store.currentInstrument).toBe("piano");
    expect(store.warmingInstrument).toBeNull();
    expect(store.lastWarmupErrorInstrument).toBe("gm_vibraphone");
    expect(store.lastWarmupError).toBe("Network down");
  });

  it("deduplicates repeated warmup requests for the same instrument", async () => {
    const store = useInstrumentStore();
    const deferred = createDeferred<void>();
    audioMocks.prewarmSoundSamples.mockReturnValue(deferred.promise);

    const first = store.setInstrument("gm_vibraphone");
    const second = store.setInstrument("gm_vibraphone");

    expect(audioMocks.prewarmSoundSamples).toHaveBeenCalledTimes(1);

    deferred.resolve();
    const results = await Promise.all([first, second]);

    expect(results).toEqual([
      { status: "superseded", instrument: "gm_vibraphone" },
      { status: "ready", instrument: "gm_vibraphone" },
    ]);
    expect(store.currentInstrument).toBe("gm_vibraphone");
    expect(store.isInstrumentReady("gm_vibraphone")).toBe(true);
  });

  it("seeds ready instruments from the initialized audio engine", async () => {
    const store = useInstrumentStore();
    audioMocks.getReadySounds.mockReturnValue(["piano", "gm_vibraphone"]);

    await store.initializeInstruments();

    expect(store.isInstrumentReady("gm_vibraphone")).toBe(true);
    expect(store.readyInstruments.has("gm_vibraphone")).toBe(true);
  });

  it("restores the most recent playable selection across an A/B/A race", async () => {
    const store = useInstrumentStore();
    const deferred = createDeferred<void>();
    audioMocks.getReadySounds.mockReturnValue(["piano", "gm_marimba"]);
    audioMocks.prewarmSoundSamples.mockReturnValue(deferred.promise);
    await store.initializeInstruments();

    const firstA = store.setInstrument("gm_vibraphone");
    const selectionB = await store.setInstrument("gm_marimba");
    const secondA = store.setInstrument("gm_vibraphone");

    deferred.reject(new Error("Network down"));
    const [firstResult, secondResult] = await Promise.all([firstA, secondA]);

    expect(selectionB).toEqual({
      status: "ready",
      instrument: "gm_marimba",
    });
    expect(firstResult).toEqual({
      status: "superseded",
      instrument: "gm_vibraphone",
    });
    expect(secondResult).toEqual({
      status: "failed",
      instrument: "gm_vibraphone",
      fallback: "gm_marimba",
    });
    expect(store.currentInstrument).toBe("gm_marimba");
  });

  it("propagates initialization failure and restores a verified synth fallback", async () => {
    const store = useInstrumentStore();
    const error = new Error("Sample registry unavailable");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    audioMocks.initSuperdoughAudio.mockRejectedValue(error);
    audioMocks.getReadySounds.mockReturnValue(["triangle"]);
    audioMocks.isPrewarmed.mockImplementation(
      (instrumentName: string) => instrumentName === "triangle"
    );

    await expect(store.initializeInstruments()).rejects.toBe(error);

    expect(store.currentInstrument).toBe("triangle");
    expect(store.isInstrumentReady("piano")).toBe(false);
    expect(store.isInstrumentReady("triangle")).toBe(true);
    consoleError.mockRestore();
  });

  it("manages synth controls and forwards them to audio runtime", () => {
    const store = useInstrumentStore();
    expect(store.synthControls).toEqual({
      cutoff: 12000,
      resonance: 0,
      attack: 0.003,
      release: 0.12,
      room: 0,
      delay: 0,
    });
    expect(store.synthControlOverrides).toEqual({ attack: false, release: false });
    expect(audioMocks.setLiveSynthControls).toHaveBeenCalledWith(expect.objectContaining({
      ...store.synthControls,
      overrides: { attack: false, release: false },
    }));

    store.setSynthControl("cutoff", 2500);
    expect(store.synthControls.cutoff).toBe(2500);
    expect(store.synthControlOverrides.attack).toBe(false);

    store.setSynthControl("attack", 0.003);
    expect(store.synthControlOverrides.attack).toBe(true);

    store.resetSynthControls();
    expect(store.synthControls.cutoff).toBe(12000);
    expect(store.synthControlOverrides).toEqual({ attack: false, release: false });
    expect(audioMocks.setLiveSynthControls).toHaveBeenLastCalledWith(expect.objectContaining({
      ...store.synthControls,
      overrides: { attack: false, release: false },
    }));
  });
});
