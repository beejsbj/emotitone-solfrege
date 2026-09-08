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
    expect(wrapper.text()).toContain("LET'S MAKESOME MUSIC.");
    expect(wrapper.text()).toContain("Warming up piano");
    expect(wrapper.text()).not.toContain("NOT FOR PRESS");
    expect(wrapper.findAll(".converged-loader__stages li").at(-1)?.text()).toContain("MIDI input");
    wrapper.unmount();
  });

  it("enables audio before entering the app when ready", async () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    loadingState.progress.overall.isComplete = true;
    const wrapper = mount(LoadingSplash, { props: { autoStart: false } });
    await wrapper.get(".converged-loader__completion-action").trigger("click");
    expect(enableAudioContext).toHaveBeenCalledOnce();
    expect(hideSplash).toHaveBeenCalledWith(0);
    vi.unstubAllGlobals();
    wrapper.unmount();
  });

  it("keeps optional MIDI status visible and stamps resolved outcomes accurately", async () => {
    loadingState.progress.overall.isComplete = true;
    const wrapper = mount(LoadingSplash, { props: { autoStart: false } });
    const midiStage = wrapper.findAll(".converged-loader__stages li").at(-1)!;

    expect(midiStage.text()).toContain("MIDI is unavailable");
    expect(midiStage.text()).toContain("N/A");

    midi.isSupported = true;
    midi.isConnecting = true;
    await wrapper.vm.$nextTick();
    expect(midiStage.text()).toContain("Requesting browser MIDI access");
    expect(midiStage.find(".converged-loader__stamp").classes()).not.toContain("is-visible");

    midi.isConnecting = false;
    midi.lastError = "Permission denied";
    await wrapper.vm.$nextTick();
    expect(midiStage.text()).toContain("MIDI permission was not granted");
    expect(midiStage.text()).toContain("SKIP");
    expect(midiStage.find(".converged-loader__stamp").classes()).toContain("is-visible");
    wrapper.unmount();
  });

  it("retains loading error recovery", async () => {
    loadingState.progress.instruments.error = "Sample download failed";
    const wrapper = mount(LoadingSplash, { props: { autoStart: false } });
    expect(wrapper.text()).toContain("Sample download failed");
    await wrapper.get(".converged-loader__state-action--retry").trigger("click");
    expect(resetLoading).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});
