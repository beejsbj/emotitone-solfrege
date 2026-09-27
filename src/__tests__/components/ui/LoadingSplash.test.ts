import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, reactive, ref } from "vue";
import { mount } from "@vue/test-utils";
import LoadingSplash from "@/components/LoadingSplash.vue";

const loadingState = reactive({
  config: { showProgress: true, showMessages: true },
  progress: {
    audioContext: { phase: "audio-context", isComplete: true, error: "" },
    instruments: { isComplete: false, error: "", message: "Warming up piano" },
    visualEffects: { isComplete: true, error: "" },
    overall: { isComplete: false, error: "", message: "Loading audio samples" },
  },
});
const enableAudioContext = vi.fn(async () => true);
const hideSplash = vi.fn();
const skipLoading = vi.fn();
const resetLoading = vi.fn();
const midi = reactive({
  isSupported: false,
  isConnecting: false,
  isListening: false,
  connectedInputs: [] as string[],
  syncedOutput: null as string | null,
  lastError: null as string | null,
});

vi.mock("@/composables/useAppLoading", () => ({
  useAppLoading: () => ({
    loadingState,
    isVisible: ref(true),
    overallProgress: computed(() => loadingState.progress.overall.isComplete ? 100 : 60),
    updatePhase: vi.fn(),
    enableAudioContext,
    initializeInstruments: vi.fn(),
    initializeVisualEffects: vi.fn(),
    hideSplash,
    skipLoading,
    resetLoading,
  }),
}));
vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => ({ midi }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  loadingState.progress.overall.isComplete = false;
  loadingState.progress.instruments.error = "";
  loadingState.progress.audioContext.isComplete = true;
  loadingState.progress.audioContext.error = "";
  midi.isSupported = false;
  midi.isConnecting = false;
  midi.isListening = false;
  midi.connectedInputs = [];
  midi.syncedOutput = null;
  midi.lastError = null;
});

describe("production loading splash", () => {
  it("shows the production identity and live loading status", () => {
    const wrapper = mount(LoadingSplash, { props: { autoStart: false } });
    expect(wrapper.get(".loading-screen--app").exists()).toBe(true);
    expect(wrapper.text()).toContain("EMOTITONE");
    expect(wrapper.text()).toContain("COUNTIT IN.");
    expect(wrapper.text()).toContain("Warming up piano");
    expect(wrapper.text()).not.toContain("NOT FOR PRESS");
    expect(wrapper.findAll(".count-tile")).toHaveLength(4);
    expect(wrapper.get(".count-and").text()).toContain("MIDI input");
    expect(wrapper.get(".count-and").attributes("aria-label")).toContain("optional");
    wrapper.unmount();
  });

  it("enables audio before entering the app when ready", async () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    loadingState.progress.overall.isComplete = true;
    const wrapper = mount(LoadingSplash, { props: { autoStart: false } });
    expect(enableAudioContext).not.toHaveBeenCalled();
    await wrapper.get(".count-gate--play").trigger("click");
    expect(enableAudioContext).toHaveBeenCalledOnce();
    expect(hideSplash).toHaveBeenCalledWith(0);
    vi.unstubAllGlobals();
    wrapper.unmount();
  });

  it("keeps optional MIDI status visible and stamps resolved outcomes accurately", async () => {
    loadingState.progress.overall.isComplete = true;
    const wrapper = mount(LoadingSplash, { props: { autoStart: false } });
    const midiStage = wrapper.get(".count-and");
    // MIDI never holds the Play gate, even while it is still resolving.
    expect(wrapper.find(".count-gate--play").exists()).toBe(true);

    expect(midiStage.text()).toContain("MIDI is unavailable");
    expect(midiStage.text()).toContain("N/A");

    midi.isSupported = true;
    midi.isConnecting = true;
    await wrapper.vm.$nextTick();
    expect(midiStage.text()).toContain("Requesting browser MIDI access");
    expect(midiStage.find(".count-and__stamp").classes()).not.toContain("is-visible");
    expect(wrapper.find(".count-gate--play").exists()).toBe(true);

    midi.isConnecting = false;
    midi.lastError = "Permission denied";
    await wrapper.vm.$nextTick();
    expect(midiStage.text()).toContain("MIDI permission was not granted");
    expect(midiStage.text()).toContain("SKIP");
    expect(midiStage.find(".count-and__stamp").classes()).toContain("is-visible");
    expect(midiStage.attributes("aria-label")).toContain("skipped");
    wrapper.unmount();
  });

  it("retains loading error recovery", async () => {
    loadingState.progress.instruments.error = "Sample download failed";
    const wrapper = mount(LoadingSplash, { props: { autoStart: false } });
    expect(wrapper.text()).toContain("Sample download failed");
    expect(wrapper.find(".count-gate--play").exists()).toBe(false);
    await wrapper.get(".count-gate--retry").trigger("click");
    expect(resetLoading).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("asks for the audio cue when the browser blocks audio, and enables it only on that tap", async () => {
    loadingState.progress.audioContext.isComplete = false;
    loadingState.progress.audioContext.error = "AudioContext was not allowed to start";
    const wrapper = mount(LoadingSplash, { props: { autoStart: false } });

    expect(wrapper.text()).toContain("Audio needs a tap");
    expect(wrapper.text()).not.toContain("AudioContext was not allowed to start");
    expect(wrapper.find(".count-gate--retry").exists()).toBe(false);
    expect(enableAudioContext).not.toHaveBeenCalled();

    await wrapper.get(".count-gate--cue").trigger("click");
    expect(enableAudioContext).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});
