import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const superdoughMocks = vi.hoisted(() => ({
  initSuperdoughAudio: vi.fn().mockResolvedValue(undefined),
  isPrewarmed: vi.fn<(instrumentName: string) => boolean>(),
  prewarmSoundSamples: vi.fn<(instrumentName: string) => Promise<void>>(),
}));

vi.mock("@/services/superdoughAudio", () => ({
  initSuperdoughAudio: superdoughMocks.initSuperdoughAudio,
  isPrewarmed: superdoughMocks.isPrewarmed,
  prewarmSoundSamples: superdoughMocks.prewarmSoundSamples,
}));

import { DEFAULT_INSTRUMENT } from "@/data/instruments";
import { useInstrumentStore } from "@/stores/instrument";

function createDeferredPromise() {
  let resolve!: () => void;
  let reject!: (error?: unknown) => void;

  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("instrument store readiness contract", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    superdoughMocks.initSuperdoughAudio.mockClear();
    superdoughMocks.isPrewarmed.mockReset();
    superdoughMocks.prewarmSoundSamples.mockReset();
    superdoughMocks.isPrewarmed.mockImplementation((instrumentName) => instrumentName === DEFAULT_INSTRUMENT);
  });

  it("promotes an already prewarmed selection immediately with no warming state", async () => {
    const instrumentStore = useInstrumentStore();

    superdoughMocks.isPrewarmed.mockImplementation(
      (instrumentName) => instrumentName === DEFAULT_INSTRUMENT || instrumentName === "organ_full",
    );

    await instrumentStore.setInstrument("organ_full");

    expect(instrumentStore.currentInstrument).toBe("organ_full");
    expect(instrumentStore.readyInstrument).toBe("organ_full");
    expect(instrumentStore.warmingInstrument).toBeNull();
    expect(instrumentStore.isWarmingInstrument).toBe(false);
    expect(instrumentStore.instrumentStatus).toBe("ready");
    expect(superdoughMocks.prewarmSoundSamples).not.toHaveBeenCalled();
  });

  it("keeps the previous ready instrument until a cold selection finishes warming", async () => {
    const instrumentStore = useInstrumentStore();
    const pendingWarmup = createDeferredPromise();

    superdoughMocks.prewarmSoundSamples.mockReturnValue(pendingWarmup.promise);

    const setInstrumentPromise = instrumentStore.setInstrument("organ_full");

    expect(instrumentStore.currentInstrument).toBe("organ_full");
    expect(instrumentStore.readyInstrument).toBe(DEFAULT_INSTRUMENT);
    expect(instrumentStore.warmingInstrument).toBe("organ_full");
    expect(instrumentStore.isWarmingInstrument).toBe(true);
    expect(instrumentStore.instrumentStatus).toBe("warming");

    pendingWarmup.resolve();
    await setInstrumentPromise;

    expect(instrumentStore.readyInstrument).toBe("organ_full");
    expect(instrumentStore.warmingInstrument).toBeNull();
    expect(instrumentStore.isWarmingInstrument).toBe(false);
    expect(instrumentStore.instrumentStatus).toBe("ready");
  });

  it("ignores stale warmup completions after a newer selection starts warming", async () => {
    const instrumentStore = useInstrumentStore();
    const firstWarmup = createDeferredPromise();
    const secondWarmup = createDeferredPromise();

    superdoughMocks.prewarmSoundSamples.mockImplementation((instrumentName) => {
      if (instrumentName === "organ_full") {
        return firstWarmup.promise;
      }

      if (instrumentName === "pipeorgan_quiet") {
        return secondWarmup.promise;
      }

      return Promise.resolve();
    });

    const firstSelection = instrumentStore.setInstrument("organ_full");
    const secondSelection = instrumentStore.setInstrument("pipeorgan_quiet");

    expect(instrumentStore.currentInstrument).toBe("pipeorgan_quiet");
    expect(instrumentStore.readyInstrument).toBe(DEFAULT_INSTRUMENT);
    expect(instrumentStore.warmingInstrument).toBe("pipeorgan_quiet");
    expect(instrumentStore.isWarmingInstrument).toBe(true);
    expect(instrumentStore.instrumentStatus).toBe("warming");

    firstWarmup.resolve();
    await firstSelection;

    expect(instrumentStore.currentInstrument).toBe("pipeorgan_quiet");
    expect(instrumentStore.readyInstrument).toBe(DEFAULT_INSTRUMENT);
    expect(instrumentStore.warmingInstrument).toBe("pipeorgan_quiet");
    expect(instrumentStore.isWarmingInstrument).toBe(true);
    expect(instrumentStore.instrumentStatus).toBe("warming");

    secondWarmup.resolve();
    await secondSelection;

    expect(instrumentStore.readyInstrument).toBe("pipeorgan_quiet");
    expect(instrumentStore.warmingInstrument).toBeNull();
    expect(instrumentStore.isWarmingInstrument).toBe(false);
    expect(instrumentStore.instrumentStatus).toBe("ready");
  });
});
