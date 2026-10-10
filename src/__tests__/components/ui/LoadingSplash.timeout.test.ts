/**
 * The real 60-second instrument-load timeout, through the real useAppLoading
 * adapter, the real instrument store and the real music store. Only the audio
 * service is stubbed, with startup steps that can be left hanging, so these
 * tests advance the actual outer timer while the store initializer is pending.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reactive } from "vue";
import { createPinia, disposePinia, setActivePinia, type Pinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import LoadingSplash from "@/components/LoadingSplash.vue";
import { useAppLoading } from "@/composables/useAppLoading";
import { useInstrumentStore } from "@/stores/instrument";
import { useMusicStore } from "@/stores/music";

type Stage = "idle" | "samples" | "engine" | "ready";

const audio = vi.hoisted(() => {
  const never = () => new Promise<never>(() => {});
  const state = {
    stage: "idle" as Stage,
    /** Which startup step hangs: the sample download, the engine, or a sampled instrument's warmup. */
    hang: "samples" as "samples" | "engine" | "warmup",
    initialized: false,
  };
  const context = {
    state: "suspended" as AudioContextState,
    currentTime: 0,
    resume: vi.fn(async () => { context.state = "running"; }),
  };
  return {
    state,
    context,
    initSuperdoughAudio: vi.fn(async () => {
      if (state.initialized) return;
      state.stage = "samples";
      if (state.hang === "samples") return never();
      state.stage = "engine";
      if (state.hang === "engine") return never();
      state.stage = "ready";
      state.initialized = true;
    }),
    // Mirrors the real guard: never queue behind a pending engine start.
    initSynthOnlyAudio: vi.fn(async () => {
      if (state.initialized) return;
      if (state.stage === "engine") throw new Error("The audio engine is still starting");
      state.stage = "ready";
      state.initialized = true;
    }),
    prewarmSoundSamples: vi.fn(async (sound: string) => {
      if (state.hang === "warmup" && sound !== "triangle") return never();
    }),
    isPrewarmed: vi.fn((sound: string) => sound === "triangle"),
    attackNote: vi.fn(async () => 0),
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
  attackNote: audio.attackNote,
  releaseNote: vi.fn(),
  stopNote: vi.fn(),
  releaseAll: vi.fn(),
  playNoteWithDuration: vi.fn(async () => {}),
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
const reloadPage = vi.hoisted(() => vi.fn());
vi.mock("@/utils/reloadPage", () => ({ reloadPage }));
vi.mock("@/components/MidiPermissionIcon.vue", () => ({ default: { template: "<span />" } }));

let pinia: Pinia;

/** Mounts with a persisted sampled instrument selected, then runs the load past its 60-second limit. */
async function mountAndTimeOut() {
  useInstrumentStore().currentInstrument = "piano"; // as hydrated from storage
  const wrapper = mount(LoadingSplash, { global: { plugins: [pinia] } });
  await vi.advanceTimersByTimeAsync(400); // the visual-effects phase
  await flushPromises();
  expect(wrapper.find(".count-gate--play").exists()).toBe(false); // still loading
  await vi.advanceTimersByTimeAsync(60_000);
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  pinia = createPinia();
  setActivePinia(pinia);
  useAppLoading().resetLoading();
  audio.state.stage = "idle";
  audio.state.initialized = false;
  audio.context.state = "suspended";
});

afterEach(() => {
  disposePinia(pinia);
  vi.useRealTimers();
});

describe("instrument load timeout", () => {
  it("names a hung sample download as samples, enters on the synth, and plays the synth on the first note", async () => {
    audio.state.hang = "samples";
    const wrapper = await mountAndTimeOut();

    expect(useAppLoading().loadingState.progress.instruments.failure).toBe("samples");
    expect(wrapper.find(".count-gate--retry").exists()).toBe(true);
    expect(useInstrumentStore().currentInstrument).toBe("piano"); // the hung store never reconciled

    await wrapper.get(".count-fallback").trigger("click");
    await flushPromises();

    expect(audio.initSynthOnlyAudio).toHaveBeenCalledOnce();
    expect(useAppLoading().isVisible.value).toBe(false);
    expect(useInstrumentStore().currentInstrument).toBe("triangle");

    await useMusicStore().attackNote(0);
    expect(audio.attackNote).toHaveBeenCalledOnce();
    expect(audio.attackNote.mock.calls[0][2]).toBe("triangle");
    wrapper.unmount();
  });

  it("recovers a samples timeout with RELOAD beside the synths, never an in-place retry of the pending start", async () => {
    audio.state.hang = "samples";
    const wrapper = await mountAndTimeOut();

    expect(useAppLoading().loadingState.progress.instruments).toMatchObject({ failure: "samples", timedOut: true });
    expect(wrapper.text()).not.toContain("FROM THE TOP");
    expect(wrapper.find(".count-fallback").exists()).toBe(true); // synths need no sample promise

    await wrapper.get(".count-gate--reload").trigger("click");
    await flushPromises();
    expect(reloadPage).toHaveBeenCalledOnce();
    expect(audio.initSuperdoughAudio).toHaveBeenCalledOnce(); // the pending start is not awaited again
    wrapper.unmount();
  });

  it("names a sampled instrument still warming after the engine is ready as samples, and plays the synth", async () => {
    audio.state.hang = "warmup";
    useInstrumentStore().currentInstrument = "piano";
    const wrapper = mount(LoadingSplash, { global: { plugins: [pinia] } });
    await vi.advanceTimersByTimeAsync(400);
    await flushPromises();
    expect(audio.prewarmSoundSamples).not.toHaveBeenCalled();
    await wrapper.get(".count-gate--play").trigger("click");
    await flushPromises();
    await vi.advanceTimersByTimeAsync(60_000);
    await flushPromises();

    expect(audio.prewarmSoundSamples).toHaveBeenCalledWith("piano");
    expect(useAppLoading().loadingState.progress.instruments.failure).toBe("samples");

    await wrapper.get(".count-fallback").trigger("click");
    await flushPromises();

    expect(useAppLoading().isVisible.value).toBe(false);
    await useMusicStore().attackNote(0);
    expect(audio.attackNote.mock.calls[0][2]).toBe("triangle");
    wrapper.unmount();
  });

  it("names a hung engine start as engine: an honest Reload, no in-place retry, no synth option, no cue", async () => {
    audio.state.hang = "engine";
    const wrapper = await mountAndTimeOut();

    expect(useAppLoading().loadingState.progress.instruments.failure).toBe("engine");
    // The hung start stays cached, so FROM THE TOP would only wait on it again.
    expect(wrapper.text()).not.toContain("FROM THE TOP");
    const reload = wrapper.get(".count-gate--reload");
    expect(reload.text()).toContain("RELOAD");
    expect(wrapper.get(".loading-screen__title").text()).toBe("FROMSCRATCH.");
    await reload.trigger("click");
    expect(reloadPage).toHaveBeenCalledOnce();
    expect(audio.initSuperdoughAudio).toHaveBeenCalledOnce(); // no second wait on the hung engine
    expect(wrapper.find(".count-fallback").exists()).toBe(false);
    expect(wrapper.find(".count-gate--cue").exists()).toBe(false);
    expect(wrapper.find(".count-gate--play").exists()).toBe(false);
    expect(wrapper.text()).toContain("the audio engine did not start");
    expect(audio.initSynthOnlyAudio).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
