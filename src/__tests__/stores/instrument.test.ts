import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useInstrumentStore } from "@/stores/instrument";
import { decodeInstrumentState, INSTRUMENT_STORAGE_KEY } from "@/services/instrumentPersistence";
import { persistedStatePlugin, resetSaveFailure, saveFailureNotice } from "@/services/safeStorage";
import { installBackupConsole } from "@/services/persistenceCodec";
import capturedPayload from "../fixtures/persistence/instrument.v0.store-capture.json?raw";
import headlessChromePayload from "../fixtures/persistence/instrument.v0.headless-chrome.json?raw";
import { DEFAULT_INSTRUMENT } from "@/data/instruments";

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
  setStrudelLaBasedMinor: vi.fn(),
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
  it("derives a canonical Shape and applies one back to the knobs", () => {
    const store = useInstrumentStore();
    expect(store.shape).toEqual({
      cutoff: 12000, resonance: 0, room: 0, delay: 0, attack: null, release: null,
    });

    store.setSynthControl("cutoff", 2500.4);
    store.setSynthControl("attack", 0.0504);
    expect(store.shape).toMatchObject({ cutoff: 2500, attack: 0.05, release: null });

    store.applyShape({ cutoff: 800, resonance: 3, room: 0.2, delay: 0.1, attack: null, release: 0.8 });
    expect(store.synthControls).toEqual({
      cutoff: 800, resonance: 3, room: 0.2, delay: 0.1, attack: 0.003, release: 0.8,
    });
    expect(store.synthControlOverrides).toEqual({ attack: false, release: true });
    expect(store.shape).toEqual({
      cutoff: 800, resonance: 3, room: 0.2, delay: 0.1, attack: null, release: 0.8,
    });
    expect(audioMocks.setLiveSynthControls).toHaveBeenLastCalledWith(expect.objectContaining({
      cutoff: 800,
      release: 0.8,
      overrides: { attack: false, release: true },
    }));
  });
  it("rests untouched envelope knobs on the current instrument's natural envelope", async () => {
    const store = useInstrumentStore();
    audioMocks.isPrewarmed.mockReturnValue(true);
    await store.setInstrument("gm_acoustic_guitar_nylon");
    expect(store.synthControls).toMatchObject({ attack: 0.01, release: 1.5 });
    expect(store.shape).toMatchObject({ attack: null, release: null });

    store.setSynthControl("release", 1.4);
    expect(store.shape.release).toBe(1.4);
    // Turned back onto the natural value, the stage is untouched again.
    store.setSynthControl("release", 1.5);
    expect(store.shape.release).toBeNull();
    expect(store.instrumentShapes).not.toHaveProperty("gm_acoustic_guitar_nylon");
    store.setSynthControl("release", 1.4);
    store.resetSynthControls();
    expect(store.synthControls).toMatchObject({ attack: 0.01, release: 1.5 });

    await store.setInstrument("piano");
    expect(store.synthControls).toMatchObject({ attack: 0.001, release: 0.2 });
  });
  describe("per-instrument Shape memory", () => {
    const NEUTRAL = { cutoff: 12000, resonance: 0, room: 0, delay: 0, attack: null, release: null };

    it("restores each instrument's Shape and starts never-shaped ones neutral", async () => {
      const store = useInstrumentStore();
      audioMocks.isPrewarmed.mockReturnValue(true);
      await store.setInstrument("piano");
      store.setSynthControl("cutoff", 1800);
      store.setSynthControl("release", 0.8);
      const pianoShape = { ...NEUTRAL, cutoff: 1800, release: 0.8 };

      await store.setInstrument("triangle");
      expect(store.shape).toEqual(NEUTRAL);
      expect(store.synthControlOverrides).toEqual({ attack: false, release: false });
      store.setSynthControl("room", 0.5);

      await store.setInstrument("piano");
      expect(store.shape).toEqual(pianoShape);
      expect(audioMocks.setLiveSynthControls).toHaveBeenLastCalledWith(expect.objectContaining({
        cutoff: 1800, release: 0.8, overrides: { attack: false, release: true },
      }));

      await store.setInstrument("triangle");
      expect(store.shape).toEqual({ ...NEUTRAL, room: 0.5 });
      store.resetSynthControls();
      await store.setInstrument("piano");
      await store.setInstrument("triangle");
      expect(store.shape).toEqual(NEUTRAL);
    });

    it("applies the fallback instrument's Shape when warmup fails", async () => {
      const store = useInstrumentStore();
      // Shape piano explicitly; the app default (triangle) is not ready under
      // this suite's readiness mock, so it cannot serve as the fallback.
      await store.setInstrument("piano");
      store.setSynthControl("delay", 0.3);
      audioMocks.prewarmSoundSamples.mockRejectedValueOnce(new Error("Network down"));

      const pending = store.setInstrument("gm_vibraphone");
      expect(store.shape).toEqual(NEUTRAL);
      const result = await pending;

      expect(result).toMatchObject({ status: "failed", fallback: "piano" });
      expect(store.currentInstrument).toBe("piano");
      expect(store.shape).toEqual({ ...NEUTRAL, delay: 0.3 });
    });
  });
});

describe("instrument persistence", () => {
  const NEUTRAL = { cutoff: 12000, resonance: 0, room: 0, delay: 0, attack: null, release: null };
  const KEY = INSTRUMENT_STORAGE_KEY;
  // The app's real localStorage (test-setup's Storage double).
  const saved = {
    get: (key: string) => window.localStorage.getItem(key),
    set: (key: string, value: string) => window.localStorage.setItem(key, value),
  };

  // A fresh page load: new Pinia with the app's persistence plugin installed.
  function freshStore() {
    const pinia = createPinia();
    pinia.use(persistedStatePlugin);
    createApp({}).use(pinia);
    setActivePinia(pinia);
    return useInstrumentStore();
  }

  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    audioMocks.isPrewarmed.mockImplementation((name: string) => name === "piano");
    audioMocks.prewarmSoundSamples.mockResolvedValue(undefined);
    audioMocks.getReadySounds.mockReturnValue(["piano"]);
    liveMocks.needsLivePlaybackPreparation.mockReturnValue(false);
  });

  it("restores the selected instrument and each instrument's Shape on a fresh load", async () => {
    const first = freshStore();
    await first.setInstrument("piano");
    first.setSynthControl("cutoff", 1800);
    first.setSynthControl("release", 0.8);
    await first.setInstrument("gm_flute");
    first.setSynthControl("room", 0.4);
    await nextTick(); // the persistence subscription flushes before render
    expect(JSON.parse(saved.get(KEY)!)).toEqual({
      $version: 1,
      data: {
        currentInstrument: "gm_flute",
        instrumentShapes: {
          piano: { ...NEUTRAL, cutoff: 1800, release: 0.8 },
          gm_flute: { ...NEUTRAL, room: 0.4 },
        },
      },
    });

    vi.clearAllMocks();
    const second = freshStore();
    expect(second.currentInstrument).toBe("gm_flute");
    expect(second.shape).toEqual({ ...NEUTRAL, room: 0.4 });
    // Setup synced defaults before hydration; the restored Shape must win.
    expect(audioMocks.setLiveSynthControls).toHaveBeenLastCalledWith(expect.objectContaining({
      room: 0.4, overrides: { attack: false, release: false },
    }));
    await second.setInstrument("piano");
    expect(second.shape).toEqual({ ...NEUTRAL, cutoff: 1800, release: 0.8 });
  });

  it("falls back to the default instrument when the persisted one is not selectable", () => {
    saved.set(KEY, JSON.stringify({ currentInstrument: "bassdrum1", instrumentShapes: {} }));
    expect(freshStore().currentInstrument).toBe(DEFAULT_INSTRUMENT);
    expect(decodeInstrumentState({ currentInstrument: "not_a_sound" }).currentInstrument)
      .toBe(DEFAULT_INSTRUMENT);
    saved.set(KEY, JSON.stringify({ currentInstrument: 42 }));
    expect(freshStore().currentInstrument).toBe(DEFAULT_INSTRUMENT);
    saved.set(KEY, "{not json");
    vi.spyOn(console, "error").mockImplementationOnce(() => {});
    const store = freshStore();
    expect(store.currentInstrument).toBe(DEFAULT_INSTRUMENT);
    expect(store.shape).toEqual(NEUTRAL);
  });

  it("sanitizes persisted Shapes: clamps ranges and drops malformed entries", () => {
    const state = decodeInstrumentState({
      currentInstrument: "piano",
      instrumentShapes: {
        piano: { cutoff: 99999, resonance: -3, room: 0.5, delay: 0, attack: null, release: 9 },
        gm_flute: { cutoff: "bright", resonance: 0, room: 0, delay: 0, attack: null, release: null },
        sawtooth: { cutoff: 900, resonance: 0, room: 0, delay: 0, attack: "slow", release: null },
        bassdrum1: { ...NEUTRAL, cutoff: 900 },
        triangle: "junk",
        sine: { ...NEUTRAL },
      },
    });
    expect(state).toEqual({
      currentInstrument: "piano",
      instrumentShapes: {
        piano: { cutoff: 12000, resonance: 0, room: 0.5, delay: 0, attack: null, release: 2.5 },
      },
    });

    saved.set(KEY, JSON.stringify({ currentInstrument: "piano", instrumentShapes: {
      piano: { cutoff: 1800.44, resonance: 0, room: 0, delay: 0, attack: 0.05, release: null },
      gm_flute: { cutoff: null },
    } }));
    const store = freshStore();
    expect(store.shape).toEqual({ ...NEUTRAL, cutoff: 1800, attack: 0.05 });
    expect(store.instrumentShapes).toEqual({ piano: { ...NEUTRAL, cutoff: 1800, attack: 0.05 } });
  });

  it("preserves the persisted selection and Shape at boot, then prepares them after Play", async () => {
    saved.set(KEY, JSON.stringify({ currentInstrument: "gm_epiano1", instrumentShapes: {
      gm_epiano1: { ...NEUTRAL, cutoff: 1800 },
    } }));
    audioMocks.isPrewarmed.mockImplementation((name: string) => name === DEFAULT_INSTRUMENT);
    audioMocks.getReadySounds.mockReturnValue([DEFAULT_INSTRUMENT]);
    const store = freshStore();
    const progress = vi.fn();

    await store.initializeInstruments(progress, { prepareSelected: false });
    expect(audioMocks.prewarmSoundSamples).not.toHaveBeenCalled();
    expect(store.currentInstrument).toBe("gm_epiano1");
    expect(store.shape.cutoff).toBe(1800);
    expect(store.isInstrumentReady("gm_epiano1")).toBe(false);
    expect(store.isLoading).toBe(false);

    const prepared = createDeferred<void>();
    audioMocks.prewarmSoundSamples.mockReturnValueOnce(prepared.promise);
    const entry = store.initializeInstruments(progress);
    await Promise.resolve();
    expect(store.isLoading).toBe(true);
    prepared.resolve();
    await entry;
    expect(store.currentInstrument).toBe("gm_epiano1");
    expect(store.shape.cutoff).toBe(1800);
    expect(store.isInstrumentReady("gm_epiano1")).toBe(true);
    expect(store.isLoading).toBe(false);
  });

  it("falls back at startup when the persisted instrument fails, recalling the fallback's Shape", async () => {
    saved.set(KEY, JSON.stringify({ currentInstrument: "gm_epiano1", instrumentShapes: {
      gm_epiano1: { ...NEUTRAL, cutoff: 1800 },
      [DEFAULT_INSTRUMENT]: { ...NEUTRAL, delay: 0.3 },
    } }));
    audioMocks.isPrewarmed.mockImplementation((name: string) => name === DEFAULT_INSTRUMENT);
    audioMocks.getReadySounds.mockReturnValue([DEFAULT_INSTRUMENT]);
    audioMocks.prewarmSoundSamples.mockRejectedValueOnce(new Error("Network down"));
    const store = freshStore();
    expect(store.shape.cutoff).toBe(1800);

    await store.initializeInstruments();

    expect(store.currentInstrument).toBe(DEFAULT_INSTRUMENT);
    expect(store.shape).toEqual({ ...NEUTRAL, delay: 0.3 });
    expect(store.lastWarmupErrorInstrument).toBe("gm_epiano1");
    expect(audioMocks.setLiveSynthControls).toHaveBeenLastCalledWith(expect.objectContaining({ delay: 0.3 }));
  });
});

describe("instrument store: versioned saved data on captured payloads", () => {
  const KEY = INSTRUMENT_STORAGE_KEY;
  const TODAY = Date.UTC(2026, 9, 10, 9);
  const BACKUP = `${KEY}.backup.v0.2026-10-10`;
  const storage = window.localStorage as unknown as {
    getItem: (key: string) => string | null;
    setItem: ReturnType<typeof vi.fn>;
  };

  function freshStore() {
    const pinia = createPinia();
    pinia.use(persistedStatePlugin);
    createApp({}).use(pinia);
    setActivePinia(pinia);
    return useInstrumentStore();
  }

  const writtenKeys = () => storage.setItem.mock.calls.map(([key]) => key as string);

  /**
   * Storage that is nearly full until the returned function runs: a key that
   * is already stored can still be replaced in place, but a new key (a
   * backup, as large as the payload) throws a quota error.
   */
  function fillStorage() {
    // test-setup's Storage double keeps its items in `store`.
    const items = (window.localStorage as unknown as { store: Map<string, string> }).store;
    const store = (key: string, value: string) => {
      items.set(String(key), String(value));
    };
    storage.setItem.mockImplementation((key: string, value: string) => {
      if (!items.has(key)) throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      store(key, value);
    });
    return () => storage.setItem.mockImplementation(store);
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(TODAY);
    window.localStorage.clear();
    resetSaveFailure();
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    audioMocks.isPrewarmed.mockImplementation(() => true);
    audioMocks.prewarmSoundSamples.mockResolvedValue(undefined);
    audioMocks.getReadySounds.mockReturnValue(["piano"]);
    liveMocks.needsLivePlaybackPreparation.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("migrates today's captured payload to v1, writing the backup before the rewrite", () => {
    window.localStorage.setItem(KEY, capturedPayload);
    vi.clearAllMocks();

    const store = freshStore();

    expect(store.currentInstrument).toBe("piano");
    expect(store.shape).toEqual({ cutoff: 2400, resonance: 3.2, room: 0.35, delay: 0, attack: null, release: 0.9 });
    expect(Object.keys(store.instrumentShapes).sort()).toEqual(["gm_flute", "gm_vibraphone", "piano", "sawtooth"]);

    expect(writtenKeys()).toEqual([BACKUP, KEY]);
    expect(storage.getItem(BACKUP)).toBe(capturedPayload);
    expect(JSON.parse(storage.getItem(KEY)!)).toEqual({ $version: 1, data: JSON.parse(capturedPayload) });
  });

  it("round-trips the migrated payload: a second load reads v1 and changes nothing", async () => {
    window.localStorage.setItem(KEY, capturedPayload);
    const first = freshStore();
    await first.setInstrument("gm_vibraphone");
    await nextTick();
    const v1 = storage.getItem(KEY)!;
    vi.clearAllMocks();

    const second = freshStore();

    expect(second.currentInstrument).toBe("gm_vibraphone");
    expect(second.shape).toEqual({ cutoff: 12000, resonance: 0, room: 0, delay: 0.25, attack: 0.04, release: null });
    expect(second.instrumentShapes).toEqual(first.instrumentShapes);
    expect(writtenKeys()).toEqual([]);
    expect(storage.getItem(KEY)).toBe(v1);
  });

  it("migrates a payload a real Chrome profile stored", () => {
    window.localStorage.setItem(KEY, headlessChromePayload);

    const store = freshStore();

    expect(store.currentInstrument).toBe("triangle");
    expect(storage.getItem(BACKUP)).toBe(headlessChromePayload);
    expect(JSON.parse(storage.getItem(KEY)!)).toEqual({ $version: 1, data: JSON.parse(headlessChromePayload) });
  });

  it("keeps the captured payload when the backup can't be written, playing on it and saying so", async () => {
    window.localStorage.setItem(KEY, capturedPayload);
    const restore = fillStorage();

    const store = freshStore();
    expect(store.currentInstrument).toBe("piano");
    expect(store.shape.cutoff).toBe(2400);
    expect(saveFailureNotice.value?.message).toBe("Can't save — storage full");

    store.setSynthControl("cutoff", 600);
    await store.setInstrument("gm_flute");
    await nextTick();
    restore();
    expect(storage.getItem(KEY)).toBe(capturedPayload);
    expect(storage.getItem(BACKUP)).toBeNull();
    expect(store.instrumentShapes.piano.cutoff).toBe(600);
  });

  it("leaves a payload from a newer app untouched while this page plays on defaults", async () => {
    const newer = JSON.stringify({ $version: 2, data: { selection: { id: "piano" }, shapes: [] } });
    window.localStorage.setItem(KEY, newer);

    const store = freshStore();
    expect(store.currentInstrument).toBe(DEFAULT_INSTRUMENT);

    await store.setInstrument("gm_flute");
    store.setSynthControl("room", 0.5);
    await nextTick();

    expect(storage.getItem(KEY)).toBe(newer);
    expect(saveFailureNotice.value?.message).toBe("Can't save — reload to update");
  });

  it("keeps corrupt saved bytes in a backup and starts on defaults", async () => {
    window.localStorage.setItem(KEY, capturedPayload.slice(0, 40));

    const store = freshStore();
    expect(store.currentInstrument).toBe(DEFAULT_INSTRUMENT);
    expect(storage.getItem(`${KEY}.backup.unreadable.2026-10-10`)).toBe(capturedPayload.slice(0, 40));

    await store.setInstrument("gm_flute");
    await nextTick();
    expect(JSON.parse(storage.getItem(KEY)!).data.currentInstrument).toBe("gm_flute");
    expect(storage.getItem(`${KEY}.backup.unreadable.2026-10-10`)).toBe(capturedPayload.slice(0, 40));
  });

  it("reports an autosave whose encode throws instead of failing silently", async () => {
    const store = freshStore();
    await store.setInstrument("piano");
    await nextTick();
    const before = storage.getItem(KEY);

    // A value JSON can't encode reaches the saved state.
    (store.instrumentShapes as Record<string, unknown>).piano = { cutoff: BigInt(1) };
    await nextTick();

    expect(saveFailureNotice.value?.message).toBe("Can't save");
    expect(storage.getItem(KEY)).toBe(before);
  });

  it("restores the pre-migration backup from the console", () => {
    window.localStorage.setItem(KEY, capturedPayload);
    freshStore();
    const target: Record<string, unknown> = {};
    installBackupConsole(target);
    const backups = target.emotitoneBackups as {
      list: () => Array<{ backupKey: string }>;
      restore: (key: string) => { ok: boolean };
    };

    expect(backups.list().map((entry) => entry.backupKey)).toEqual([BACKUP]);
    expect(backups.restore(BACKUP).ok).toBe(true);
    expect(storage.getItem(KEY)).toBe(capturedPayload);

    // The next page load migrates the restored bytes again, as on day one.
    const reloaded = freshStore();
    expect(reloaded.currentInstrument).toBe("piano");
    expect(JSON.parse(storage.getItem(KEY)!).$version).toBe(1);
  });
});
