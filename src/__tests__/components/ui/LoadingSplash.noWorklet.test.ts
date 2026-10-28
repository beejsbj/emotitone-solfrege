/**
 * A browser without AudioWorklet (a phone on the dev server over plain http,
 * which is not a secure context, or an old engine): the worklet is the only
 * renderer, so startup must fail and say why rather than enter an instrument
 * that refuses every note. The real audio engine and live playback run here;
 * only the browser's audio graph, the network and the instrument store are
 * stand-ins.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reactive } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import LoadingSplash from "@/components/LoadingSplash.vue";
import { useAppLoading } from "@/composables/useAppLoading";
import { SampleLoadError } from "@/services/audioFailures";

const audio = vi.hoisted(() => ({
  // A context with no audioWorklet, as an insecure page gets.
  context: Object.assign(new EventTarget(), {
    state: "suspended" as AudioContextState,
    currentTime: 0,
    sampleRate: 48000,
    resume: vi.fn(async () => { audio.context.state = "running"; }),
  }),
  master: { id: "master" },
}));

const instruments = vi.hoisted(() => ({
  initializeInstruments: vi.fn(async () => {}), fallBackToSynth: vi.fn(), markEngineBooted: vi.fn(),
}));

vi.unmock("@/services/audioEngine");
vi.mock("@/services/audioRuntime", () => ({
  getAudioContext: () => audio.context,
  getMasterGain: () => audio.master,
  getLiveOrbit: () => undefined,
  initializeAudio: vi.fn(async () => {}),
}));
vi.mock("@/stores/instrument", () => ({ useInstrumentStore: () => instruments }));
vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => ({
    midi: reactive({
      isSupported: false, isConnecting: false, isListening: false,
      connectedInputs: [] as string[], syncedOutput: null as string | null, lastError: null as string | null,
    }),
  }),
}));
vi.mock("@/components/MidiPermissionIcon.vue", () => ({ default: { template: "<span />" } }));

const SAMPLE_MAPS: Record<string, unknown> = {
  "piano.json": { _base: "https://samples.test/piano/", piano: { C4: "C4v8.mp3" } },
  "vcsl.json": { _base: "https://samples.test/vcsl/", kalimba: ["kalimba-1.wav"] },
};

async function mountLoaded() {
  const wrapper = mount(LoadingSplash);
  await vi.advanceTimersByTimeAsync(400); // the visual-effects phase
  await flushPromises();
  return wrapper;
}

describe("starting audio where the browser has no AudioWorklet", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useAppLoading().resetLoading();
    audio.context.state = "suspended";
    vi.stubGlobal("AudioWorkletNode", undefined);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const map = SAMPLE_MAPS[url.split("/").pop()!];
      return map ? new Response(JSON.stringify(map)) : new Response(new Uint8Array(8));
    }));
    instruments.initializeInstruments.mockImplementation(async () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("holds the Play tap on the reason instead of entering a silent instrument", async () => {
    const wrapper = await mountLoaded();
    await wrapper.get(".count-gate--play").trigger("click");
    await vi.advanceTimersByTimeAsync(0);
    await flushPromises();

    expect(useAppLoading().loadingState.progress.audioContext.failure).toBe("engine");
    expect(useAppLoading().isVisible.value).toBe(true);
    expect(wrapper.text()).toContain("Audio engine failed to start: AudioWorklet is unavailable");
    expect(wrapper.find(".count-gate--reload").exists()).toBe(true);
    wrapper.unmount();
  });

  it("holds the basic-synth entry on the same reason", async () => {
    instruments.initializeInstruments.mockRejectedValueOnce(new SampleLoadError("error loading piano.json"));
    const wrapper = await mountLoaded();
    await wrapper.get(".count-fallback").trigger("click");
    await vi.advanceTimersByTimeAsync(0);
    await flushPromises();

    expect(instruments.markEngineBooted).not.toHaveBeenCalled();
    expect(useAppLoading().loadingState.progress.audioContext.failure).toBe("engine");
    expect(useAppLoading().isVisible.value).toBe(true);
    expect(wrapper.text()).toContain("Audio engine failed to start: AudioWorklet is unavailable");
    wrapper.unmount();
  });
});
