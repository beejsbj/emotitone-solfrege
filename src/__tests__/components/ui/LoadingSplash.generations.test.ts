import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reactive } from "vue";
import { createPinia, disposePinia, setActivePinia, type Pinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import LoadingSplash from "@/components/LoadingSplash.vue";
import { useAppLoading } from "@/composables/useAppLoading";
import { useInstrumentStore } from "@/stores/instrument";
import LoadingScreen from "@/components/compositions/LoadingScreen.vue";

type Stage = "idle" | "samples" | "engine" | "ready";

// Only the browser/audio boundary is controlled. The loading adapter,
// instrument store and rendered splash all run their production code.
const audio = vi.hoisted(() => {
  const context = {
    state: "suspended" as AudioContextState,
    currentTime: 0,
    resume: vi.fn(async () => { context.state = "running"; }),
  };
  return {
    state: { stage: "idle" as Stage },
    context,
    initSuperdoughAudio: vi.fn(async (_report?: (progress: number, message: string) => void) => {}),
    initSynthOnlyAudio: vi.fn(async () => {}),
    prewarmSoundSamples: vi.fn(async (_sound: string) => {}),
    isPrewarmed: vi.fn((sound: string) => sound === "triangle"),
  };
});

vi.mock("@/services/superdoughAudio", () => ({
  setStrudelLaBasedMinor: vi.fn(),
  initSuperdoughAudio: audio.initSuperdoughAudio,
  initSynthOnlyAudio: audio.initSynthOnlyAudio,
  getAudioStartupStage: () => audio.state.stage,
  getAudioContext: () => audio.context,
  prewarmSoundSamples: audio.prewarmSoundSamples,
  isPrewarmed: audio.isPrewarmed,
  getReadySounds: () => ["triangle"],
  setLiveSynthControls: vi.fn(),
}));
vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => ({
    midi: reactive({
      isSupported: false,
      isConnecting: false,
      isListening: false,
      connectedInputs: [] as string[],
      syncedOutput: null as string | null,
      lastError: null as string | null,
    }),
  }),
}));
vi.mock("@/components/MidiPermissionIcon.vue", () => ({ default: { template: "<span />" } }));

let pinia: Pinia;
const wrappers: ReturnType<typeof mount>[] = [];

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function mountSplash() {
  const wrapper = mount(LoadingSplash, { global: { plugins: [pinia] } });
  wrappers.push(wrapper);
  await vi.advanceTimersByTimeAsync(400);
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  pinia = createPinia();
  setActivePinia(pinia);
  useAppLoading().resetLoading();
  audio.state.stage = "ready";
  audio.context.state = "suspended";
  audio.initSuperdoughAudio.mockImplementation(async () => {});
  audio.prewarmSoundSamples.mockImplementation(async () => {});
});

afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount());
  useAppLoading().resetLoading();
  disposePinia(pinia);
  vi.useRealTimers();
});

describe("loading generations with the real instrument store", () => {
  it.each(["resolve", "reject"] as const)("ignores old boot progress and %s after reset", async result => {
    const pending = deferred();
    let report!: (progress: number, message: string) => void;
    audio.initSuperdoughAudio.mockImplementationOnce(callback => {
      report = callback!;
      return pending.promise;
    });
    const wrapper = await mountSplash();
    const loading = useAppLoading();
    expect(useInstrumentStore().isLoading).toBe(true);
    loading.resetLoading();
    await flushPromises();
    expect(useInstrumentStore().isLoading).toBe(false);
    expect(loading.loadingState.progress.instruments.error).toBeUndefined();
    expect(loading.loadingState.progress.instruments.progress).toBe(0);
    const reset = JSON.stringify(loading.loadingState);
    const screen = wrapper.text();
    report(90, "Old samples arrived");
    if (result === "resolve") pending.resolve();
    else pending.reject(new Error("Old download failed"));
    await flushPromises();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(JSON.stringify(loading.loadingState)).toBe(reset);
    expect(wrapper.text()).toBe(screen);
    expect(useInstrumentStore().readyInstruments.size).toBe(0);
    expect(wrapper.find(".count-gate--play").exists()).toBe(false);
  });

  it("cancels the visual phase before it can start a stale instrument load", async () => {
    const wrapper = mount(LoadingSplash, { global: { plugins: [pinia] } });
    wrappers.push(wrapper);
    useAppLoading().resetLoading();
    await vi.advanceTimersByTimeAsync(400);
    await flushPromises();
    expect(audio.initSuperdoughAudio).not.toHaveBeenCalled();
    expect(useAppLoading().loadingState.progress.visualEffects.isComplete).toBe(false);
    expect(wrapper.find(".count-gate--play").exists()).toBe(false);
  });

  it("keeps a retry pending when the superseded load completes", async () => {
    const first = deferred();
    const second = deferred();
    audio.initSuperdoughAudio.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const wrapper = await mountSplash();
    // Exercise the recovery handler while the previous request is in flight.
    wrapper.getComponent(LoadingScreen).vm.$emit("retry");
    await vi.advanceTimersByTimeAsync(400);
    await flushPromises();
    const loading = useAppLoading();
    expect(loading.loadingState.progress.instruments.error).toBeUndefined();
    expect(loading.loadingState.progress.instruments.progress).toBe(0);
    const retry = JSON.stringify(loading.loadingState);
    first.resolve();
    await flushPromises();
    expect(JSON.stringify(loading.loadingState)).toBe(retry);
    expect(useInstrumentStore().isLoading).toBe(true);
    expect(wrapper.find(".count-gate--play").exists()).toBe(false);
    second.resolve();
    await flushPromises();
    expect(useInstrumentStore().isLoading).toBe(false);
    expect(wrapper.find(".count-gate--play").exists()).toBe(true);
  });

  it("does not let stale failure or progress overwrite a successful retry", async () => {
    const first = deferred();
    let report!: (progress: number, message: string) => void;
    audio.initSuperdoughAudio.mockImplementationOnce(callback => {
      report = callback!;
      return first.promise;
    });
    const wrapper = await mountSplash();
    wrapper.getComponent(LoadingScreen).vm.$emit("retry");
    await vi.advanceTimersByTimeAsync(400);
    await flushPromises();
    expect(wrapper.find(".count-gate--play").exists()).toBe(true);
    expect(useAppLoading().loadingState.progress.instruments.error).toBeUndefined();
    expect(useAppLoading().loadingState.progress.instruments.progress).toBe(100);
    const ready = JSON.stringify(useAppLoading().loadingState);
    report(10, "Old download");
    first.reject(new Error("Old failure"));
    await flushPromises();
    expect(JSON.stringify(useAppLoading().loadingState)).toBe(ready);
    expect(wrapper.find(".count-gate--play").exists()).toBe(true);
  });

  it("cancels a pending Play and prevents its warmup from changing selection or hiding the reset screen", async () => {
    useInstrumentStore().currentInstrument = "piano";
    const wrapper = await mountSplash();
    const warmup = deferred();
    audio.prewarmSoundSamples.mockReturnValueOnce(warmup.promise);
    await wrapper.get(".count-gate--play").trigger("click");
    await flushPromises();
    expect(useInstrumentStore().isLoading).toBe(true);
    useAppLoading().resetLoading();
    await flushPromises();
    expect(useInstrumentStore().isLoading).toBe(false);
    expect(useAppLoading().loadingState.progress.instruments.error).toBeUndefined();
    expect(useAppLoading().loadingState.progress.instruments.progress).toBe(0);
    const state = JSON.stringify(useAppLoading().loadingState);
    const ready = [...useInstrumentStore().readyInstruments];
    warmup.resolve();
    await flushPromises();
    expect(JSON.stringify(useAppLoading().loadingState)).toBe(state);
    expect([...useInstrumentStore().readyInstruments]).toEqual(ready);
    expect(useInstrumentStore().currentInstrument).toBe("piano");
    expect(useAppLoading().isVisible.value).toBe(true);
    expect(wrapper.text()).not.toContain("PREPARING…");
  });

  it("does not resume audio after reset cancels an engine start", async () => {
    const engine = deferred();
    audio.initSuperdoughAudio.mockReturnValueOnce(engine.promise);
    const loading = useAppLoading();
    const start = loading.enableAudioContext();
    loading.resetLoading();
    await expect(start).resolves.toBe(false);
    engine.resolve();
    await flushPromises();
    expect(audio.context.resume).not.toHaveBeenCalled();
    expect(loading.isVisible.value).toBe(true);
  });

  it("ignores a previous splash fade timer after reset", async () => {
    const loading = useAppLoading();
    loading.hideSplash(500);
    loading.resetLoading();
    await vi.advanceTimersByTimeAsync(600);
    expect(loading.isVisible.value).toBe(true);
    expect(loading.isLoading.value).toBe(true);
  });

  it("freezes a timed-out load and its store state when the download eventually completes", async () => {
    const pending = deferred();
    let report!: (progress: number, message: string) => void;
    audio.state.stage = "samples";
    audio.initSuperdoughAudio.mockImplementationOnce(callback => {
      report = callback!;
      return pending.promise;
    });
    const wrapper = await mountSplash();
    await vi.advanceTimersByTimeAsync(60_000);
    await flushPromises();
    expect(useInstrumentStore().isLoading).toBe(false);
    const timeout = JSON.stringify(useAppLoading().loadingState);
    report(100, "Audio engine ready");
    pending.resolve();
    await flushPromises();
    expect(JSON.stringify(useAppLoading().loadingState)).toBe(timeout);
    expect(useInstrumentStore().readyInstruments.size).toBe(0);
    expect(wrapper.find(".count-gate--play").exists()).toBe(false);
    expect(wrapper.find(".count-gate--reload").exists()).toBe(true);
  });
});
