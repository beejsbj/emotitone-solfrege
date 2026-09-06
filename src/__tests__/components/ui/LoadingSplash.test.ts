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
  useKeyboardDrawerStore: () => ({ midi: { isSupported: false } }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  loadingState.progress.overall.isComplete = false;
  loadingState.progress.instruments.error = "";
});

describe("production loading splash", () => {
  it("shows the production identity and live loading status", () => {
    const wrapper = mount(LoadingSplash, { props: { autoStart: false } });
    expect(wrapper.get("h1").text()).toBe("EMOTITONE");
    expect(wrapper.text()).toContain("SOLFÈGE LEARNING");
    expect(wrapper.text()).toContain("Warming up piano");
    expect(wrapper.text()).not.toContain("NOT FOR PRESS");
    wrapper.unmount();
  });

  it("enables audio before entering the app when ready", async () => {
    loadingState.progress.overall.isComplete = true;
    const wrapper = mount(LoadingSplash, { props: { autoStart: false } });
    await wrapper.get(".btn--start").trigger("click");
    expect(enableAudioContext).toHaveBeenCalledOnce();
    expect(hideSplash).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("retains loading error recovery", async () => {
    loadingState.progress.instruments.error = "Sample download failed";
    const wrapper = mount(LoadingSplash, { props: { autoStart: false } });
    expect(wrapper.text()).toContain("Sample download failed");
    await wrapper.get(".btn--retry").trigger("click");
    expect(resetLoading).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});
