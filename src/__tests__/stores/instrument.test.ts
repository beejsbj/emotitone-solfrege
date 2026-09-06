import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useInstrumentStore } from "@/stores/instrument";

const audioMocks = vi.hoisted(() => ({
  initSuperdoughAudio: vi.fn().mockResolvedValue(undefined),
  isPrewarmed: vi.fn((instrumentName: string) => instrumentName === "piano"),
  prewarmSoundSamples: vi.fn().mockResolvedValue(undefined),
  getReadySounds: vi.fn(() => ["piano"]),
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
    audioMocks.initSuperdoughAudio.mockResolvedValue(undefined);
    audioMocks.isPrewarmed.mockImplementation(
      (instrumentName: string) => instrumentName === "piano"
    );
    audioMocks.prewarmSoundSamples.mockResolvedValue(undefined);
    audioMocks.getReadySounds.mockReturnValue(["piano"]);
  });

  it("selects ready instruments without entering warmup", async () => {
    const store = useInstrumentStore();

    await store.setInstrument("piano");

    expect(store.currentInstrument).toBe("piano");
    expect(store.warmingInstrument).toBeNull();
    expect(store.isInteractionLocked).toBe(false);
    expect(audioMocks.prewarmSoundSamples).not.toHaveBeenCalled();
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
    audioMocks.prewarmSoundSamples.mockRejectedValueOnce(
      new Error("Network down")
    );

    await store.setInstrument("gm_vibraphone");

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
    await Promise.all([first, second]);

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
});
