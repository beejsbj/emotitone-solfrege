import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";
import { defineComponent, nextTick, onUnmounted, ref } from "vue";
import { MAJOR_SOLFEGE } from "@/data";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { mockCanvasContext } from "@/__tests__/helpers/test-utils";
import * as stageAudio from "@/services/stageAudio";
import { liveAudioInput, type LiveAudioSource } from "@/services/liveAudio";
import type { ActiveNote } from "@/types/music";
import { useUnifiedCanvas } from "@/composables/canvas/useUnifiedCanvas";

vi.unmock("@/composables/useVisualConfig");

describe("unified canvas resource lifetime", () => {
  let wrapper: VueWrapper | undefined;
  let canvas: ReturnType<typeof useUnifiedCanvas>;
  let element: HTMLCanvasElement;
  let events: EventTarget;
  let config: ReturnType<typeof useVisualConfigStore>;
  let reducedMotion: ReturnType<typeof ref<boolean>>;
  let frames: Map<number, FrameRequestCallback>;
  let resolutionListeners: Map<string, EventListener>;
  let audioEnvelope: number;
  let context: CanvasRenderingContext2D;
  const notes = ref<ActiveNote[]>([]);
  const frame = async (deltaMs = 1000 / 60) => {
    await nextTick();
    const pending = [...frames.values()];
    frames.clear();
    vi.advanceTimersByTime(deltaMs);
    for (const callback of pending) callback(Date.now());
    await nextTick();
  };
  let audio: {
    initialize: ReturnType<typeof vi.fn>;
    sample: ReturnType<typeof vi.fn>;
    cleanup: ReturnType<typeof vi.fn>;
  };

  const mountCanvas = (controlledAudio = true) => {
    wrapper = mount(defineComponent({
      setup() {
        config = useVisualConfigStore();
        config.useEphemeralDefaults();
        reducedMotion = ref(true);
        canvas = useUnifiedCanvas(ref(element), {
          usableRect: ref({ x: 0, y: 0, width: 800, height: 600 }),
          reducedMotion,
          audioFeatures: controlledAudio ? audio : undefined,
          getActiveNotes: () => notes.value,
          eventTarget: events,
        });
        onUnmounted(canvas.cleanup);
        return () => null;
      },
    }), { global: { plugins: [createPinia()] } });
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    notes.value = [];
    audioEnvelope = 0;
    frames = new Map();
    let nextAnimationFrame = 0;
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      frames.set(++nextAnimationFrame, callback);
      return nextAnimationFrame;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn((id: number) => frames.delete(id)));
    vi.stubGlobal("devicePixelRatio", 1);
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    resolutionListeners = new Map();
    vi.spyOn(window, "matchMedia").mockImplementation(query => ({
      media: query, matches: false,
      addEventListener: (_type: string, listener: EventListener) => resolutionListeners.set(query, listener),
      removeEventListener: () => resolutionListeners.delete(query),
    } as unknown as MediaQueryList));
    element = document.createElement("canvas");
    context = { ...mockCanvasContext, canvas: element } as unknown as CanvasRenderingContext2D;
    vi.spyOn(element, "getContext").mockReturnValue(context);
    events = new EventTarget();
    audio = {
      initialize: vi.fn(() => null),
      sample: vi.fn(() => ({ envelope: audioEnvelope, hasSignal: audioEnvelope > 0.01 })),
      cleanup: vi.fn(),
    };
    mountCanvas();
    await nextTick();
    vi.advanceTimersByTime(500);
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([1, 2, 3])("sizes the backing store at capped DPR %s while retaining CSS geometry", async dpr => {
    vi.stubGlobal("devicePixelRatio", dpr);
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({ width: 390, height: 844 } as DOMRect);
    canvas.initializeCanvas();
    await nextTick();
    const scale = Math.min(dpr, 2);
    expect([canvas.canvasWidth.value, canvas.canvasHeight.value]).toEqual([390, 844]);
    expect([element.width, element.height]).toEqual([390 * scale, 844 * scale]);
    expect(context.setTransform).toHaveBeenLastCalledWith(scale, 0, 0, scale, 0, 0);
  });

  it("resizes and rearms its resolution listener when DPR changes without a window resize", () => {
    canvas.initializeCanvas();
    expect(resolutionListeners.has("(resolution: 1dppx)")).toBe(true);
    vi.stubGlobal("devicePixelRatio", 2);
    resolutionListeners.get("(resolution: 1dppx)")!(new Event("change"));
    expect(element.width).toBe(canvas.canvasWidth.value * 2);
    expect(context.setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0);
    expect(resolutionListeners.has("(resolution: 1dppx)")).toBe(false);
    expect(resolutionListeners.has("(resolution: 2dppx)")).toBe(true);
    canvas.cleanup();
    expect(resolutionListeners.has("(resolution: 2dppx)")).toBe(false);
  });

  it("idles after drawing silence, wakes on a note, and stops after its visible release", async () => {
    canvas.initializeCanvas();
    canvas.startAnimation();
    await frame();
    expect(frames.size).toBe(0);
    expect(canvas.isAnimating.value).toBe(false);
    canvas.handleNotePlayed(MAJOR_SOLFEGE[0], 261.63, "held", 4, "C4", "major", "C", 0);
    expect(frames.size).toBeGreaterThan(0);
    await frame();
    expect(canvas.isAnimating.value).toBe(true);
    canvas.handleNoteReleased("C4", "held");
    for (let index = 0; index < 150 && frames.size; index++) await frame();
    expect(frames.size).toBe(0);
    expect(canvas.isAnimating.value).toBe(false);
    canvas.handleNotePlayed(MAJOR_SOLFEGE[0], 261.63, "next", 4, "C4", "major", "C", 0);
    expect(frames.size).toBeGreaterThan(0);
  });

  it("keeps audio release and scope history alive until they decay", async () => {
    reducedMotion.value = false;
    config.config.blobs.isEnabled = false;
    config.config.strings.isEnabled = false;
    config.config.hilbertScope.history = 0.9;
    audioEnvelope = 0.5;
    canvas.initializeCanvas();
    canvas.startAnimation();
    await frame();
    expect(frames.size).toBeGreaterThan(0);
    audioEnvelope = 0;
    await frame();
    expect(frames.size).toBeGreaterThan(0);
    for (let index = 0; index < 100 && frames.size; index++) await frame();
    expect(frames.size).toBe(0);
  });

  it("wakes the production Stage for an unpitched live input meter and releases its subscription", async () => {
    wrapper!.unmount();
    frames.clear();
    let publish: (source: LiveAudioSource | null) => void = () => {};
    const unsubscribe = vi.fn();
    vi.spyOn(liveAudioInput, "subscribe").mockImplementation(listener => {
      publish = listener;
      listener(null);
      return unsubscribe;
    });
    vi.spyOn(stageAudio, "createStageAudioFeatures").mockReturnValue(audio);
    mountCanvas(false);
    canvas.initializeCanvas();
    canvas.startAnimation();
    await frame();
    expect(frames.size).toBe(0);
    // No pitch event or detected envelope: opening the live analysis source
    // itself wakes the Stage so the next samples can reveal unpitched input.
    publish({} as LiveAudioSource);
    expect(canvas.isAnimating.value).toBe(true);
    await frame();
    expect(canvas.isAnimating.value).toBe(true);
    publish(null);
    await frame();
    expect(frames.size).toBe(0);
    wrapper!.unmount();
    wrapper = undefined;
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("stops while hidden or explicitly off, and wakes on visibility, resize and configuration", async () => {
    canvas.initializeCanvas();
    canvas.startAnimation();
    await frame();
    vi.mocked(Object.getOwnPropertyDescriptor(document, "hidden")!.get!).mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    canvas.handleNotePlayed(MAJOR_SOLFEGE[0], 261.63, "hidden", 4, "C4", "major", "C", 0);
    expect(frames.size).toBe(0);
    vi.mocked(Object.getOwnPropertyDescriptor(document, "hidden")!.get!).mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(frames.size).toBeGreaterThan(0);
    vi.mocked(Object.getOwnPropertyDescriptor(document, "hidden")!.get!).mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(frames.size).toBe(0);
    vi.mocked(Object.getOwnPropertyDescriptor(document, "hidden")!.get!).mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(frames.size).toBeGreaterThan(0);
    canvas.stopAnimation();
    canvas.handleResize();
    canvas.handleNotePlayed(MAJOR_SOLFEGE[0], 261.63, "off", 4, "C4", "major", "C", 0);
    expect(frames.size).toBe(0);
    canvas.startAnimation();
    config.config.stage.isEnabled = false;
    await nextTick();
    expect(frames.size).toBe(0);
    config.config.stage.isEnabled = true;
    await nextTick();
    expect(frames.size).toBeGreaterThan(0);
  });

  it("renders equal blob motion after one second at 60 and 120 Hz and clamps a stalled frame", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.75);
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({ width: 800, height: 600 } as DOMRect);
    const paths: number[][] = [];
    for (const hz of [60, 120]) {
      if (hz === 120) {
        wrapper!.unmount();
        frames.clear();
        mountCanvas();
      }
      vi.setSystemTime(1000);
      reducedMotion.value = false;
      config.config.strings.isEnabled = false;
      config.config.hilbertScope.isEnabled = false;
      config.config.ambient.isEnabled = false;
      config.config.blobs.connectionMode = "off";
      config.config.blobs.driftSpeed = 20;
      config.config.blobs.vibrationAmplitude = 5;
      canvas.initializeCanvas();
      canvas.startAnimation();
      canvas.handleNotePlayed(MAJOR_SOLFEGE[0], 261.63, "motion", 4, "C4", "major", "C", 0);
      await nextTick();
      for (let index = 0; index <= hz; index++) {
        vi.setSystemTime(1000 + index * 1000 / hz);
        const pending = [...frames.values()];
        frames.clear();
        for (const callback of pending) callback(1000 + index * 1000 / hz);
      }
      const point = vi.mocked(context.moveTo).mock.calls.at(-1)!;
      paths.push([...point]);
    }
    expect(paths[0][0]).toBeCloseTo(paths[1][0], 6);
    expect(paths[0][1]).toBeCloseTo(paths[1][1], 6);
    // A long stall advances vibration by at most 50 ms, rather than jumping
    // an entire second. Wall-clock release lifetimes remain authoritative.
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(3000);
    const stalled = vi.mocked(context.moveTo).mock.calls.at(-1)!;
    expect(Math.hypot(stalled[0] - paths[1][0], stalled[1] - paths[1][1])).toBeLessThan(10);
  });

  it("renders equal String response at 60 and 120 Hz and idles after damping", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.75);
    const paths: number[][][] = [];
    for (const hz of [60, 120]) {
      if (hz === 120) {
        wrapper!.unmount();
        frames.clear();
        mountCanvas();
      }
      vi.setSystemTime(1000);
      reducedMotion.value = false;
      config.config.blobs.isEnabled = false;
      config.config.hilbertScope.isEnabled = false;
      config.config.ambient.isEnabled = false;
      config.config.strings.isEnabled = true;
      config.config.strings.interpolationSpeed = 0.03;
      audioEnvelope = 0.8;
      notes.value = [{ noteId: "string", solfege: MAJOR_SOLFEGE[0], solfegeIndex: 0,
        pitchClassIndex: 0, frequency: 261.63, noteName: "C4", octave: 4,
        keyboardOctave: 4, mode: "major", key: "C" }];
      canvas.initializeCanvas();
      canvas.startAnimation();
      await nextTick();
      for (let index = 0; index <= hz; index++) {
        vi.setSystemTime(1000 + index * 1000 / hz);
        const pending = [...frames.values()];
        frames.clear();
        vi.mocked(context.lineTo).mockClear();
        for (const callback of pending) callback(1000 + index * 1000 / hz);
      }
      paths.push(vi.mocked(context.lineTo).mock.calls.map(point => [...point]));
    }
    expect(paths[0].length).toBeGreaterThan(0);
    expect(paths[0].length).toBe(paths[1].length);
    paths[0].forEach((point, index) => expect(point[0]).toBeCloseTo(paths[1][index][0], 6));
    notes.value = [];
    audioEnvelope = 0;
    for (let index = 0; index < 300 && frames.size; index++) await frame();
    expect(frames.size).toBe(0);
    config.config.strings.baseOpacity += 0.05;
    await nextTick();
    expect(frames.size).toBeGreaterThan(0);
    await frame();
    canvas.handleResize();
    expect(frames.size).toBeGreaterThan(0);
  });

  it("updates both canvas state and backing dimensions on resize", () => {
    canvas.initializeCanvas();
    vi.stubGlobal("innerWidth", 960);
    vi.stubGlobal("innerHeight", 540);

    canvas.handleResize();

    expect([canvas.canvasWidth.value, canvas.canvasHeight.value]).toEqual([960, 540]);
    expect([element.width, element.height]).toEqual([960, 540]);
  });

  it("stops animation, note timers, audio analysis, and String listeners on teardown", () => {
    const addListener = vi.spyOn(events, "addEventListener");
    const removeListener = vi.spyOn(events, "removeEventListener");
    canvas.initializeCanvas();
    canvas.startAnimation();
    const animationFrame = vi.mocked(requestAnimationFrame).mock.results.at(-1)!.value;
    canvas.handleNotePlayed(MAJOR_SOLFEGE[0], 261.63, undefined, 4, "C4", "major", "C", 0, 500);
    expect(canvas.isAnimating.value).toBe(true);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    expect(addListener).toHaveBeenCalledWith("note-played", expect.any(Function));
    expect(addListener).toHaveBeenCalledWith("note-released", expect.any(Function));

    wrapper!.unmount();
    wrapper = undefined;

    expect(canvas.isAnimating.value).toBe(false);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(animationFrame);
    expect(audio.cleanup).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    for (const [type, listener] of addListener.mock.calls) {
      expect(removeListener).toHaveBeenCalledWith(type, listener);
    }
  });
});
