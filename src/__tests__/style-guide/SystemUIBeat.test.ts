import { afterEach, describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import SystemUIBeat from "@/style-guide/systems/SystemUIBeat.vue";
import { UIBeatClock } from "@/composables/useUIBeat";
// Child controls register GSAP plugins on import; shallowMount never runs them.
vi.mock("@/composables/useGSAP", () => ({ default: vi.fn() }));
import systemUIBeatSource from "@/style-guide/systems/SystemUIBeat.vue?raw";

describe("SystemUIBeat guide fixture", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps the dense keyboard family outside the accepted guide distribution", () => {
    expect(systemUIBeatSource).not.toContain("<Key");
    expect(systemUIBeatSource).not.toContain("<ChordKey");
    expect(systemUIBeatSource).toContain("<Button");
    expect(systemUIBeatSource).toContain("<Joystick");
  });

  it("keeps bar position continuous when tempo changes during playback", async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const runFrame = (timestamp: number) => frames.shift()?.(timestamp);
    const published: number[] = [];
    vi.spyOn(UIBeatClock.prototype, "publish").mockImplementation(function (_generation, position) {
      published.push(position.barPosition);
    });

    const wrapper = shallowMount(SystemUIBeat);
    runFrame(0);
    runFrame(1000); // 120 BPM in 4/4: 2000 ms bar, so half a bar.

    vi.spyOn(performance, "now").mockReturnValue(1000);
    await wrapper.findAll("button").find((button) => button.text() === "140 BPM")!.trigger("click");
    runFrame(1000 + (4 * 60_000) / 140 / 2); // Half a bar at the new tempo.

    expect(published).toHaveLength(4);
    [0, 0.5, 0.5, 1].forEach((position, index) => expect(published[index]).toBeCloseTo(position, 6));
    wrapper.unmount();
  });
});
