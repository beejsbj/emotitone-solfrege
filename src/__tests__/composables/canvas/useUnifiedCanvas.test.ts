import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";
import { defineComponent, onUnmounted, ref } from "vue";
import { MAJOR_SOLFEGE } from "@/data";
import { useUnifiedCanvas } from "@/composables/canvas/useUnifiedCanvas";

vi.unmock("@/composables/useVisualConfig");
vi.unmock("gsap");

describe("unified canvas resource lifetime", () => {
  let wrapper: VueWrapper | undefined;
  let canvas: ReturnType<typeof useUnifiedCanvas>;
  let element: HTMLCanvasElement;
  let events: EventTarget;
  let audio: {
    initialize: ReturnType<typeof vi.fn>;
    sample: ReturnType<typeof vi.fn>;
    cleanup: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    let nextAnimationFrame = 0;
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => ++nextAnimationFrame));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    element = document.createElement("canvas");
    events = new EventTarget();
    audio = {
      initialize: vi.fn(() => null),
      sample: vi.fn(() => ({ envelope: 0, hasSignal: false })),
      cleanup: vi.fn(),
    };
    wrapper = mount(defineComponent({
      setup() {
        canvas = useUnifiedCanvas(ref(element), {
          usableRect: ref({ x: 0, y: 0, width: 800, height: 600 }),
          reducedMotion: ref(true),
          audioFeatures: audio,
          getActiveNotes: () => [],
          eventTarget: events,
        });
        onUnmounted(canvas.cleanup);
        return () => null;
      },
    }), { global: { plugins: [createPinia()] } });
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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
