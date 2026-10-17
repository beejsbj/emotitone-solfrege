import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHummingCapture } from "@/composables/useHummingCapture";
import HummingCaptureTransport from "@/components/humming/HummingCaptureTransport.vue";
import { usePhrasesStore } from "@/stores/phrases";
import { useMusicStore } from "@/stores/music";

const audio = vi.hoisted(() => ({ release: vi.fn(async () => undefined), stopMonitor: vi.fn(async () => undefined) }));
vi.mock("@/services/liveAudio", () => ({
  liveAudioInput: {
    acquire: async () => ({ source: { stream: {} }, release: audio.release }),
    subscribe: () => () => undefined,
  },
}));
vi.mock("@/services/livePitch", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/livePitch")>(),
  startLivePitchMonitor: async () => ({ stop: audio.stopMonitor }),
}));
// Decoding is a browser boundary; retain the real HTTP adapter and note conversion.
vi.mock("@/services/pitchAnalysis", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/pitchAnalysis")>(),
  preparePitchAnalysisAudio: async (blob: Blob) => blob,
}));

describe("humming recording deadline", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it.each([false, true])("keeps the take after the deadline or backgrounding (hidden=%s)", async (hidden) => {
    vi.useFakeTimers();
    let recorder!: FakeRecorder;
    class FakeRecorder {
      state = "inactive";
      mimeType = "audio/webm";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      constructor() { recorder = this; }
      start() { this.state = "recording"; }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["retained voice audio"]) });
        this.onstop?.();
      }
    }
    vi.stubGlobal("MediaRecorder", FakeRecorder);
    const uploads: Blob[] = [];
    vi.stubGlobal("fetch", async (_url: string, options: { body: Blob }) => {
      uploads.push(options.body as Blob);
      return new Response(JSON.stringify({
        schema_version: 1, product: "Melograph", tracker: "praat-ac",
        duration_seconds: 60, frames: [], takes: [], warnings: [], strudel: "", strudel_midi: "",
        phrases: [{
          number: 1, start_seconds: 59, end_seconds: 60, duration_seconds: 1,
          events: [{ type: "note", start_seconds: 59, end_seconds: 60,
            duration_seconds: 1, midi: 60, note: "C4", confidence: 0.01 }],
        }],
      }), { status: 200 });
    });
    const pinia = createPinia();
    setActivePinia(pinia);
    const music = useMusicStore();
    music.currentKey = "C";
    music.currentMode = "major";
    const phrases = usePhrasesStore();
    const Host = defineComponent({
      setup() {
        const capture = useHummingCapture();
        return () => h(HummingCaptureTransport, {
          status: capture.status.value, statusMessage: capture.statusMessage.value,
          remainingSeconds: capture.remainingSeconds.value,
          onToggle: capture.toggle, onCancel: capture.cancel,
        });
      },
    });
    const wrapper = mount(Host, { global: { plugins: [pinia], stubs: { Teleport: true } } });
    try {
      await wrapper.get('button[aria-label="Start humming capture"]').trigger("click");
      await flushPromises();
      expect(recorder.state).toBe("recording");
      expect(wrapper.get('[role="status"]').text()).toContain("60-second limit");
      const visibleCountdown = () => wrapper.get('.humming-capture-transport__countdown');
      expect(visibleCountdown().text()).toContain("60-second limit");
      expect(visibleCountdown().attributes("aria-hidden")).toBe("true");
      expect(visibleCountdown().attributes("aria-live")).toBeUndefined();
      expect(visibleCountdown().attributes("role")).toBeUndefined();
      await vi.advanceTimersByTimeAsync(50_000);
      const announced: string[] = [];
      for (let seconds = 10; seconds >= 1; seconds -= 1) {
        if (seconds < 10) await vi.advanceTimersByTimeAsync(1000);
        const message = wrapper.get('[role="status"]').text();
        if (message !== announced.at(-1)) announced.push(message);
        expect(visibleCountdown().text()).toContain(`${seconds} ${seconds === 1 ? "second" : "seconds"} left`);
      }
      expect(announced).toEqual([
        "10 seconds left — your take saves automatically", "5 seconds left", "1 second left",
      ]);
      await vi.advanceTimersByTimeAsync(999);
      expect(recorder.state).toBe("recording");
      expect(wrapper.get('[role="status"]').text()).toContain("1 second left");
      if (hidden) {
        const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
        document.dispatchEvent(new Event("visibilitychange"));
        visibility.mockRestore();
      } else {
        await vi.advanceTimersByTimeAsync(1);
      }
      await flushPromises();
      expect(recorder.state).toBe("inactive");
      expect(uploads).toHaveLength(1);
      expect(uploads[0].size).toBeGreaterThan(0);
      expect(audio.stopMonitor).toHaveBeenCalledTimes(1);
      expect(audio.release).toHaveBeenCalledTimes(1);
      expect(phrases.take.notes).toEqual([expect.objectContaining({
        note: "C4", pressTime: 0, releaseTime: 1000, velocity: 0.7,
      })]);
      expect(wrapper.get('[role="status"]').text()).toBe("1 notes added from 1 take");
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      wrapper.unmount();
      pinia._s.forEach((store) => store.$dispose());
    }
  });
});
