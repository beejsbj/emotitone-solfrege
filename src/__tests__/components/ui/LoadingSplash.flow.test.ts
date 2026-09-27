/**
 * Production loading flow through the real useAppLoading adapter. Only the
 * audio service and the instrument store are stubbed, so these states are the
 * ones the adapter actually produces rather than hand-built loading state.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reactive } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import LoadingSplash from "@/components/LoadingSplash.vue";
import { useAppLoading } from "@/composables/useAppLoading";

const audio = vi.hoisted(() => {
  const context = {
    state: "suspended" as AudioContextState,
    /** Whether the browser lets this resume start the context. */
    allow: false,
    resume: vi.fn(async () => {
      if (audio.context.allow) audio.context.state = "running";
    }),
  };
  return { context, initSuperdoughAudio: vi.fn(async () => {}), initSynthOnlyAudio: vi.fn(async () => {}) };
});
const toast = vi.hoisted(() => ({ warning: vi.fn() }));

const instruments = vi.hoisted(() => ({ initializeInstruments: vi.fn(async () => {}) }));

vi.mock("@/services/superdoughAudio", () => ({
  initSuperdoughAudio: audio.initSuperdoughAudio,
  initSynthOnlyAudio: audio.initSynthOnlyAudio,
  getAudioContext: () => audio.context,
}));
vi.mock("vue-sonner", () => ({ toast }));
vi.mock("@/stores/instrument", () => ({ useInstrumentStore: () => instruments }));
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

async function mountLoaded() {
  const wrapper = mount(LoadingSplash);
  await vi.advanceTimersByTimeAsync(400); // the visual-effects phase
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  useAppLoading().resetLoading();
  audio.context.state = "suspended";
  audio.context.allow = false;
  instruments.initializeInstruments.mockImplementation(async () => {});
});

afterEach(() => {
  vi.useRealTimers();
});

describe("production loading flow", () => {
  it("lands a blocked Play tap on the Enable Audio cue, and a successful cue tap enters the app", async () => {
    const wrapper = await mountLoaded();

    // Gate before audio: loading finishes without touching the AudioContext.
    expect(wrapper.find(".count-gate--play").exists()).toBe(true);
    expect(audio.context.resume).not.toHaveBeenCalled();

    // The browser refuses: resume never starts the context.
    await wrapper.get(".count-gate--play").trigger("click");
    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();

    expect(audio.context.resume).toHaveBeenCalledOnce();
    expect(useAppLoading().isVisible.value).toBe(true);
    expect(wrapper.find(".count-gate--play").exists()).toBe(false);
    expect(wrapper.find(".count-gate--retry").exists()).toBe(false);
    expect(wrapper.text()).toContain("GIVE US");
    expect(wrapper.text()).toContain("Audio needs a tap");
    expect(wrapper.get(".count-tile.is-held").text()).toContain("Audio system");

    // The next tap is allowed: the splash closes into the app.
    audio.context.allow = true;
    await wrapper.get(".count-gate--cue").trigger("click");
    await flushPromises();

    expect(audio.context.state).toBe("running");
    expect(useAppLoading().isVisible.value).toBe(false);
    expect(useAppLoading().loadingState.progress.audioContext.error).toBeFalsy();
    wrapper.unmount();
  });

  it("enters straight away when the browser lets the Play tap start audio", async () => {
    audio.context.allow = true;
    const wrapper = await mountLoaded();

    await wrapper.get(".count-gate--play").trigger("click");
    await flushPromises();

    expect(audio.context.resume).toHaveBeenCalledOnce();
    expect(useAppLoading().isVisible.value).toBe(false);
    expect(audio.initSynthOnlyAudio).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("fills the active tile from its own phase, not from the averaged overall progress", async () => {
    let report: (progress: number, message: string) => void = () => {};
    instruments.initializeInstruments.mockImplementation((callback?: (progress: number, message: string) => void) => {
      report = callback ?? report;
      return new Promise<void>(() => {}); // still loading
    });
    const wrapper = await mountLoaded();

    report(50, "Piano loaded (3/7)");
    await flushPromises();

    const tiles = wrapper.findAll(".count-tile");
    expect(tiles[0].classes()).toContain("is-complete");
    expect(tiles[1].classes()).toContain("is-active");
    // Overall is (100 + 50 + 0) / 3 = 50%; the old equal-quarter estimate read that as a full Instrument tile.
    expect(tiles[1].attributes("style")).toContain("--tile-fill: 0.5");
    wrapper.unmount();
  });

  it("holds a failed sample load on the retry gate instead of offering Play", async () => {
    instruments.initializeInstruments.mockRejectedValueOnce(new Error("Instrument initialization timeout"));
    const wrapper = await mountLoaded();

    expect(wrapper.find(".count-gate--play").exists()).toBe(false);
    expect(wrapper.text()).toContain("FROM THE TOP");
    expect(wrapper.text()).toContain("Instrument initialization timeout");
    expect(wrapper.get(".count-tile.is-held").text()).toContain("Instrument samples");
    // The count holds on beat two: the audio beat is not pasted up behind a failed load.
    expect(wrapper.findAll(".count-tile")[2].classes()).toContain("is-pending");
    expect(useAppLoading().loadingState.progress.overall.isComplete).toBe(false);

    // Retry runs the load again; this time it lands and Play opens.
    await wrapper.get(".count-gate--retry").trigger("click");
    await vi.advanceTimersByTimeAsync(400);
    await flushPromises();

    expect(instruments.initializeInstruments).toHaveBeenCalledTimes(2);
    expect(wrapper.find(".count-gate--retry").exists()).toBe(false);
    expect(wrapper.find(".count-gate--play").exists()).toBe(true);
    wrapper.unmount();
  });

  it("offers a quieter way in with basic synths after a failed load, still started by the tap", async () => {
    instruments.initializeInstruments.mockRejectedValueOnce(new Error("Instrument initialization timeout"));
    const wrapper = await mountLoaded();

    // Retry stays the gate; the fallback is secondary paper, never Brass.
    expect(wrapper.find(".count-gate--retry").exists()).toBe(true);
    const fallback = wrapper.get(".count-fallback");
    expect(fallback.text().replace(/\s+/g, " ")).toMatch(/Play on ?with basic synths/i);
    expect(fallback.classes()).not.toContain("brass");
    expect(wrapper.find(".brass").exists()).toBe(false);
    expect(audio.context.resume).not.toHaveBeenCalled();
    expect(audio.initSynthOnlyAudio).not.toHaveBeenCalled();

    // The browser blocks the first tap: the cue takes over, and its tap keeps the basic-synth path.
    await fallback.trigger("click");
    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();
    expect(audio.initSynthOnlyAudio).toHaveBeenCalledOnce();
    expect(useAppLoading().isVisible.value).toBe(true);
    expect(wrapper.find(".count-gate--cue").exists()).toBe(true);
    expect(toast.warning).not.toHaveBeenCalled();

    audio.context.allow = true;
    await wrapper.get(".count-gate--cue").trigger("click");
    await flushPromises();

    expect(audio.initSynthOnlyAudio).toHaveBeenCalledTimes(2);
    expect(audio.initSuperdoughAudio).not.toHaveBeenCalled(); // no sample download inside the tap
    expect(useAppLoading().isVisible.value).toBe(false);
    expect(toast.warning).toHaveBeenCalledOnce();
    expect(toast.warning.mock.calls[0][1].description).toMatch(/basic synthesizers/);
    wrapper.unmount();
  });

  it("keeps the basic-synth action off every screen but a failed load", async () => {
    const wrapper = await mountLoaded();
    expect(wrapper.find(".count-gate--play").exists()).toBe(true);
    expect(wrapper.find(".count-fallback").exists()).toBe(false);
    wrapper.unmount();
  });
});
