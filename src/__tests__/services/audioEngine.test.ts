import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

/**
 * The app's audio engine startup and warmup (BJS-495): sample maps register
 * in the catalog, the shared graph starts once, and every sound is prepared
 * into the live worklet, the only renderer.
 */
const hoisted = vi.hoisted(() => ({
  context: Object.assign(new EventTarget(), {
    state: "running", currentTime: 12, sampleRate: 48000,
    resume: vi.fn().mockResolvedValue(undefined),
  }),
  master: { id: "master-gain" },
  initializeAudio: vi.fn().mockResolvedValue(undefined),
  prepareLive: vi.fn().mockResolvedValue(undefined),
  liveFailure: vi.fn((): { kind: "load" | "unavailable"; reason: string; budget?: true } | undefined => undefined),
  shaping: vi.fn(),
}));

vi.mock("@/services/audioRuntime", () => ({
  getAudioContext: () => hoisted.context,
  getMasterGain: () => hoisted.master,
  initializeAudio: hoisted.initializeAudio,
}));
vi.mock("@/services/livePlayback", () => ({
  prepareLivePlayback: hoisted.prepareLive,
  getLivePlaybackFailure: hoisted.liveFailure,
  setLivePlaybackShaping: hoisted.shaping,
}));
vi.unmock("@/services/audioEngine");

const SAMPLE_MAPS: Record<string, unknown> = {
  "piano.json": { _base: "https://samples.test/piano/", piano: { A0: "A0v8.mp3", C4: "C4v8.mp3" } },
  "vcsl.json": { _base: "https://samples.test/vcsl/", kalimba: ["kalimba-1.wav", "kalimba-2.wav"] },
};
const serveFixtures = async (url: string) => {
  const name = url.split("/").pop()!;
  if (SAMPLE_MAPS[name]) return new Response(JSON.stringify(SAMPLE_MAPS[name]));
  return new Response(new Uint8Array(8));
};
const fetchMock = vi.fn(serveFixtures);

describe("the app's audio engine", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    hoisted.liveFailure.mockImplementation(() => undefined);
    hoisted.initializeAudio.mockReset().mockResolvedValue(undefined);
    hoisted.prepareLive.mockReset().mockResolvedValue(undefined);
    fetchMock.mockReset().mockImplementation(serveFixtures);
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("starts the shared graph once, however many callers ask", async () => {
    const audio = await import("@/services/audioEngine");
    await Promise.all([audio.initAudioEngine(), audio.initAudioEngine()]);
    await audio.initAudioEngine();
    expect(hoisted.initializeAudio).toHaveBeenCalledOnce();
  });

  it("reuses the pending engine across loading reset and reconciles only the new generation", async () => {
    const { createPinia, setActivePinia, disposePinia } = await import("pinia");
    const { effectScope } = await import("vue");
    const { useAppLoading } = await import("@/composables/useAppLoading");
    const { useInstrumentStore } = await import("@/stores/instrument");
    const pinia = createPinia();
    setActivePinia(pinia);
    const scope = effectScope();
    const loading = scope.run(useAppLoading)!;
    const store = useInstrumentStore();
    let finishEngine!: () => void;
    let finishPreparation!: () => void;
    hoisted.initializeAudio.mockImplementationOnce(() => new Promise<void>(resolve => { finishEngine = resolve; }));
    hoisted.prepareLive.mockImplementationOnce(() => new Promise<void>(resolve => { finishPreparation = resolve; }));
    try {
      const first = loading.initializeInstruments();
      await vi.waitFor(() => expect(hoisted.initializeAudio).toHaveBeenCalledOnce());
      loading.resetLoading();
      await first;
      expect(store.readyInstruments.size).toBe(0);
      expect(store.isLoading).toBe(false);

      const retry = loading.initializeInstruments();
      await vi.waitFor(() => expect(store.isLoading).toBe(true));
      const shared = (await import("@/services/audioEngine")).initAudioEngine();
      finishEngine();
      await vi.waitFor(() => expect(hoisted.prepareLive).toHaveBeenCalledOnce());
      expect(loading.loadingState.progress.instruments.progress).toBe(80);
      expect(loading.loadingState.progress.instruments.isComplete).toBe(false);
      finishPreparation();
      await Promise.all([retry, shared]);
      expect(loading.loadingState.progress.instruments.isComplete).toBe(true);
      expect(store.isLoading).toBe(false);
      expect(store.isInstrumentReady("triangle")).toBe(true);
      expect(hoisted.initializeAudio).toHaveBeenCalledOnce();
      expect(hoisted.prepareLive).toHaveBeenCalledOnce();
    } finally {
      finishPreparation?.();
      loading.resetLoading();
      scope.stop();
      disposePinia(pinia);
    }
  });

  it("ignores a failed attempt's late sample progress after another caller retries", async () => {
    const audio = await import("@/services/audioEngine");
    let finishOldPack!: () => void;
    fetchMock.mockImplementationOnce(async () => { throw new Error("Sample pack failed"); })
      .mockImplementationOnce(async (url: string) => {
        await new Promise<void>(resolve => { finishOldPack = resolve; });
        return serveFixtures(url);
      });
    await expect(audio.initAudioEngine()).rejects.toThrow("Sample pack failed");
    let finishEngine!: () => void;
    hoisted.initializeAudio.mockImplementationOnce(() => new Promise<void>(resolve => { finishEngine = resolve; }));
    const progress: number[] = [];
    const retry = audio.initAudioEngine(value => progress.push(value));
    try {
      await vi.waitFor(() => expect(hoisted.initializeAudio).toHaveBeenCalledOnce());
      expect(progress.at(-1)).toBe(79);
      finishOldPack();
      await flushPromises();
      expect(progress.at(-1)).toBe(79);
    } finally {
      finishEngine?.();
      await retry;
    }
  });

  it("tags only sample-map failures as SampleLoadError, never a graph failure after the samples load", async () => {
    const { SampleLoadError } = await import("@/services/audioFailures");
    const audio = await import("@/services/audioEngine");

    fetchMock.mockImplementationOnce(async () => new Response("", { status: 503 }));
    await expect(audio.initAudioEngine()).rejects.toBeInstanceOf(SampleLoadError);
    expect(audio.getAudioStartupStage()).toBe("idle");

    hoisted.initializeAudio.mockRejectedValueOnce(new Error("AudioWorklet failed"));
    const graph = await audio.initAudioEngine().catch((error: unknown) => error);
    expect(graph).toBeInstanceOf(Error);
    expect(graph).not.toBeInstanceOf(SampleLoadError);
  });

  it("reports which startup step is pending, and synth-only refuses rather than awaiting a hung engine", async () => {
    const audio = await import("@/services/audioEngine");
    expect(audio.getAudioStartupStage()).toBe("idle");

    const pendingPacks: Array<() => void> = [];
    fetchMock.mockImplementation(async (url: string) => {
      await new Promise<void>((resolve) => { pendingPacks.push(resolve); });
      return serveFixtures(url);
    });
    hoisted.initializeAudio.mockImplementationOnce(() => new Promise(() => {})); // the engine hangs
    void audio.initAudioEngine();
    await Promise.resolve();
    expect(audio.getAudioStartupStage()).toBe("samples");

    await vi.waitFor(() => expect(pendingPacks).toHaveLength(2));
    pendingPacks.forEach((resolve) => resolve());
    await vi.waitFor(() => expect(audio.getAudioStartupStage()).toBe("engine"));

    await expect(audio.initSynthOnlyAudio()).rejects.toThrow("still starting");
    expect(hoisted.initializeAudio).toHaveBeenCalledOnce(); // no second, queued engine start
  });

  it("is ready once the synth-only start succeeds while the sample maps still download", async () => {
    const audio = await import("@/services/audioEngine");
    fetchMock.mockImplementation(() => new Promise(() => {})); // the download hangs
    void audio.initAudioEngine();
    await Promise.resolve();
    expect(audio.getAudioStartupStage()).toBe("samples");

    await audio.initSynthOnlyAudio();
    expect(audio.getAudioStartupStage()).toBe("ready");
    expect(audio.isPrewarmed("triangle")).toBe(true);
    expect(hoisted.prepareLive).toHaveBeenCalledWith(hoisted.context, hoisted.master, "triangle");
  });

  it("starts the synths after a failed load, so the next start does not retry the download", async () => {
    fetchMock.mockImplementation(async () => new Response("", { status: 503 }));
    const audio = await import("@/services/audioEngine");
    await expect(audio.initAudioEngine()).rejects.toThrow("503");
    const mapFetches = fetchMock.mock.calls.length;

    await audio.initSynthOnlyAudio();
    expect(audio.getAudioStartupStage()).toBe("ready");
    expect(audio.isPrewarmed("triangle")).toBe(true);
    await audio.initAudioEngine();
    expect(fetchMock).toHaveBeenCalledTimes(mapFetches);
  });

  it("keeps the loading-screen steps and reports each map as it registers", async () => {
    const audio = await import("@/services/audioEngine");
    const steps: Array<[number, string]> = [];

    await audio.initAudioEngine((progress, message) => steps.push([progress, message]));

    expect(steps).toEqual([
      [3, "Synth sounds registered"],
      [40, expect.stringMatching(/^(Piano|Orchestra) loaded \(1\/2\)$/)],
      [75, expect.stringMatching(/^(Piano|Orchestra) loaded \(2\/2\)$/)],
      [79, "Starting audio context…"],
      [80, "Preparing triangle…"],
      [98, "triangle ready"],
      [100, "Audio engine ready"],
    ]);
    expect(audio.getAudioStartupStage()).toBe("ready");
  });

  it("prepares only the default oscillator during startup, downloading no audio", async () => {
    const audio = await import("@/services/audioEngine");
    const { DEFAULT_INSTRUMENT } = await import("@/data/instruments");

    await audio.initAudioEngine();

    expect(DEFAULT_INSTRUMENT).toBe("triangle");
    expect(audio.isPrewarmed("triangle")).toBe(true);
    expect(hoisted.prepareLive.mock.calls.map(([, , name]) => name)).toEqual(["triangle"]);
    expect(fetchMock.mock.calls.map(([url]) => url).sort()).toEqual([
      "https://raw.githubusercontent.com/felixroos/dough-samples/main/piano.json",
      "https://raw.githubusercontent.com/felixroos/dough-samples/main/vcsl.json",
    ]);
    expect(audio.isPrewarmed("piano")).toBe(false);
  });

  it("lists the worklet's oscillator synths and the catalog's instruments, GM ones once their catalog loads", async () => {
    const audio = await import("@/services/audioEngine");
    await audio.initAudioEngine();
    expect(audio.getRegisteredSounds().slice(0, 8))
      .toEqual(["triangle", "square", "sawtooth", "sine", "tri", "sqr", "saw", "sin"]);
    expect(audio.getRegisteredSounds()).toEqual(expect.arrayContaining(["piano", "kalimba"]));
    expect(audio.getRegisteredSounds()).not.toContain("gm_celesta");

    await audio.ensureSoundfontCatalog();
    expect(audio.getRegisteredSounds()).toEqual(expect.arrayContaining(["gm_celesta", "gm_piano"]));
    expect(audio.isPrewarmed("gm_celesta")).toBe(false);
    await audio.prewarmSoundSamples("gm_celesta");
    expect(hoisted.prepareLive).toHaveBeenLastCalledWith(hoisted.context, hoisted.master, "gm_celesta");
    expect(audio.isPrewarmed("gm_celesta")).toBe(true);
  });

  it("treats the oscillator synths as ready, and unknown sounds as neither ready nor playable", async () => {
    const audio = await import("@/services/audioEngine");
    expect(audio.isPrewarmed("triangle")).toBe(true);
    expect(audio.isPrewarmed("sqr")).toBe(true);
    expect(audio.isPrewarmed("supersaw")).toBe(false);
    await expect(audio.prewarmSoundSamples("not-a-sound")).rejects.toThrow("Unknown sound: not-a-sound");
    expect(audio.isPrewarmed("not-a-sound")).toBe(false);
  });

  it("loads a sampled instrument into the worklet", async () => {
    const audio = await import("@/services/audioEngine");
    await audio.initAudioEngine();

    await audio.prewarmSoundSamples("piano");

    expect(hoisted.prepareLive).toHaveBeenLastCalledWith(hoisted.context, hoisted.master, "piano");
    expect(audio.isPrewarmed("piano")).toBe(true);
  });

  it("surfaces a failed worklet download and leaves the instrument cold", async () => {
    hoisted.liveFailure.mockImplementation(() => ({ kind: "load", reason: "Could not download C4v8.mp3 (HTTP 503)" }));
    const audio = await import("@/services/audioEngine");
    await audio.initAudioEngine();

    await expect(audio.prewarmSoundSamples("piano")).rejects.toThrow("HTTP 503");
    expect(audio.isPrewarmed("piano")).toBe(false);
  });

  it("fails to start, on either entry, when the worklet cannot run at all; a load failure still starts", async () => {
    hoisted.liveFailure.mockImplementation(() => ({ kind: "unavailable", reason: "AudioWorklet is unavailable" }));
    const audio = await import("@/services/audioEngine");
    await expect(audio.initAudioEngine()).rejects.toThrow("Audio engine failed to start: AudioWorklet is unavailable");
    await expect(audio.initSynthOnlyAudio()).rejects.toThrow("Audio engine failed to start: AudioWorklet is unavailable");
    expect(audio.getAudioStartupStage()).not.toBe("ready");

    // The default synth's own load failure is not the engine's: a later selection retries it.
    hoisted.liveFailure.mockImplementation(() => ({ kind: "load", reason: "Could not prepare triangle" }));
    await audio.initAudioEngine();
    expect(audio.getAudioStartupStage()).toBe("ready");
  });

  it("starts when the default synth is refused for memory: the worklet runs, it is only full", async () => {
    hoisted.liveFailure.mockImplementation(() => ({ kind: "unavailable",
      reason: "Live renderer memory budget is occupied by held or pinned instruments", budget: true }));
    const audio = await import("@/services/audioEngine");
    await audio.initAudioEngine();
    expect(audio.getAudioStartupStage()).toBe("ready");
  });

  it("refuses a sound the worklet will not hold, with its reason: nothing else plays it", async () => {
    const audio = await import("@/services/audioEngine");
    await audio.initAudioEngine();
    hoisted.liveFailure.mockImplementation(() => ({ kind: "unavailable",
      reason: "Live renderer instrument budget is occupied by held or pinned instruments", budget: true }));

    await expect(audio.prewarmSoundSamples("kalimba")).rejects.toThrow("budget is occupied");
    expect(audio.isPrewarmed("kalimba")).toBe(false);
  });

  it("passes the Shape controls to the worklet, with envelope overrides only where set", async () => {
    const audio = await import("@/services/audioEngine");
    audio.setLiveSynthControls({ cutoff: 3000, resonance: 2, attack: .2, release: .8, room: .3, delay: .1,
      overrides: { attack: true, release: false } });
    expect(hoisted.shaping).toHaveBeenLastCalledWith({ cutoff: 3000, resonance: 2, room: .3, delay: .1,
      envelope: { attack: .2, release: undefined } });
    audio.setLiveSynthControls(null);
    expect(hoisted.shaping).toHaveBeenLastCalledWith({ cutoff: 12000, resonance: 0, room: 0, delay: 0,
      envelope: { attack: undefined, release: undefined } });
  });
});
