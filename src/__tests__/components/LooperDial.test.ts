import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { provideUIBeat, UIBeatClock } from "@/composables/useUIBeat";
import LooperDial from "@/components/primatives/LooperDial.vue";

/**
 * The Looper Dial: one playing pattern as its own control. Observed through
 * DOM pointer, click and key events, and the gestures it emits.
 */
const segments = [{ color: "red", startMs: 0, durationMs: 1000, height: 55 }];
const base = { segments, lengthMs: 4000, barMs: 2000, label: "Take 3" };

function mountDial(props: Record<string, unknown> = {}) {
  const clock = new UIBeatClock({ observeEnvironment: false, reducedMotion: () => false, documentVisible: () => true });
  const emitted: string[] = [];
  const Host = defineComponent({
    setup() {
      provideUIBeat({ clock, presentationEnabled: () => true });
      return () => h(LooperDial, {
        ...base, ...props,
        onMute: () => emitted.push("mute"),
        onSolo: () => emitted.push("solo"),
        onRemove: () => emitted.push("remove"),
      });
    },
  });
  const generation = clock.arm({ mappingAvailable: true, bpm: 120, meter: { beatsPerBar: 4, beatUnit: 4 } });
  const wrapper = mount(Host, { attachTo: document.body });
  return { wrapper, clock, generation, emitted, button: () => wrapper.get("button.looper-dial") };
}

describe("LooperDial", () => {
  afterEach(() => vi.useRealTimers());

  it("is the control itself: a bare dial, no keycap, named for its pattern and its gestures", () => {
    const { wrapper, button } = mountDial();
    expect(button().find(".paper-button__cap").exists()).toBe(false);
    expect(button().attributes("aria-label")).toBe("Take 3, playing. Tap to mute, double-tap to solo, hold to remove, drag up or down to move it in the loop");
    expect(button().find(".loop-dial").exists()).toBe(true);
    wrapper.unmount();
  });

  it("turns its disc under a fixed brass hand while the loop plays", () => {
    const { wrapper, clock, generation } = mountDial({ originBars: 0 });
    const dial = wrapper.get(".loop-dial");
    expect(dial.classes()).toContain("loop-dial--disc");
    // Half a bar into a two-bar loop: the disc has turned back a quarter; the hand has not moved.
    clock.publish(generation, { rawPosition: .5, barPosition: .5 });
    expect((wrapper.get(".loop-dial__disc").element as SVGGElement).style.transform).toBe("rotate(-90.00deg)");
    expect((wrapper.get(".loop-dial__hand").element as SVGGElement).style.transform).toBe("");
    wrapper.unmount();
    clock.destroy();
  });

  it("a tap mutes", async () => {
    const { wrapper, button, emitted } = mountDial();
    await button().trigger("pointerdown");
    await button().trigger("pointerup");
    await button().trigger("click");
    expect(emitted).toEqual(["mute"]);
    wrapper.unmount();
  });

  it("a double-tap solos: the second tap undoes its mute and solos", async () => {
    const { wrapper, button, emitted } = mountDial();
    for (let tap = 0; tap < 2; tap++) {
      await button().trigger("pointerdown");
      await button().trigger("pointerup");
      await button().trigger("click");
    }
    expect(emitted).toEqual(["mute", "mute", "solo"]);
    wrapper.unmount();
  });

  it("a hold removes, and the click that ends it is not a tap", async () => {
    vi.useFakeTimers();
    const { wrapper, button, emitted } = mountDial();
    await button().trigger("pointerdown");
    vi.advanceTimersByTime(600);
    await button().trigger("pointerup");
    await button().trigger("click");
    expect(emitted).toEqual(["remove"]);
    wrapper.unmount();
  });

  function pointer(element: Element, type: string, clientX: number, clientY: number) {
    element.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: "touch", clientX, clientY }));
  }

  it("a vertical drag turns the pattern a beat per 15px, Knob-style, and is no tap or hold", async () => {
    vi.useFakeTimers();
    const shifts: number[] = [];
    const { wrapper, button, emitted } = mountDial({ onShift: (beats: number) => shifts.push(beats) });
    const element = button().element;
    pointer(element, "pointerdown", 20, 100);
    // Within the tap threshold nothing happens.
    pointer(element, "pointermove", 20, 97);
    expect(shifts).toEqual([]);
    // Up 16px: one beat later.
    pointer(element, "pointermove", 21, 84);
    expect(shifts).toEqual([1]);
    // One emit per 100ms at most (one may carry several steps); the movement is not lost.
    vi.advanceTimersByTime(120);
    pointer(element, "pointermove", 21, 69);
    expect(shifts).toEqual([1, 1]);
    // Back down past both: earlier.
    vi.advanceTimersByTime(120);
    pointer(element, "pointermove", 21, 100);
    expect(shifts).toEqual([1, 1, -2]);
    // Holding still past the hold time mid-drag removes nothing; the ending click is no tap.
    vi.advanceTimersByTime(800);
    pointer(element, "pointerup", 21, 100);
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    expect(emitted).toEqual([]);
    // The next press is an ordinary tap again.
    await button().trigger("pointerdown");
    await button().trigger("pointerup");
    await button().trigger("click");
    expect(emitted).toEqual(["mute"]);
    wrapper.unmount();
  });

  it("a lift flushes whole steps the 100ms interval held back (one emit may carry several)", () => {
    vi.useFakeTimers();
    const shifts: number[] = [];
    const { wrapper, button } = mountDial({ onShift: (beats: number) => shifts.push(beats) });
    const element = button().element;
    pointer(element, "pointerdown", 20, 100);
    pointer(element, "pointermove", 20, 84);
    expect(shifts).toEqual([1]);
    // Another 16px within 100ms: held back, not lost.
    vi.advanceTimersByTime(40);
    pointer(element, "pointermove", 20, 68);
    expect(shifts).toEqual([1]);
    pointer(element, "pointerup", 20, 68);
    expect(shifts).toEqual([1, 1]);
    wrapper.unmount();
  });

  it("a sideways slide neither mutes nor removes, however long it is held", () => {
    vi.useFakeTimers();
    const shifts: number[] = [];
    const { wrapper, button, emitted } = mountDial({ onShift: (beats: number) => shifts.push(beats) });
    const element = button().element;
    // A quick slide off sideways, then its click.
    pointer(element, "pointerdown", 20, 100);
    pointer(element, "pointermove", 60, 96);
    pointer(element, "pointerup", 60, 96);
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    // A slide held past the hold time, then its click.
    vi.advanceTimersByTime(400);
    pointer(element, "pointerdown", 20, 100);
    pointer(element, "pointermove", 30, 99);
    vi.advanceTimersByTime(800);
    pointer(element, "pointerup", 30, 99);
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    expect(emitted).toEqual([]);
    expect(shifts).toEqual([]);
    wrapper.unmount();
  });

  it("a press whose pointer capture is lost (the page took the touch) is cancelled", () => {
    vi.useFakeTimers();
    const { wrapper, button, emitted } = mountDial();
    const element = button().element;
    pointer(element, "pointerdown", 20, 100);
    pointer(element, "lostpointercapture", 20, 100);
    vi.advanceTimersByTime(800);
    expect(emitted).toEqual([]);
    wrapper.unmount();
  });

  it("from the keyboard: Enter mutes through the native click, Delete removes", async () => {
    const { wrapper, button, emitted } = mountDial();
    await button().trigger("click", { detail: 0 });
    await button().trigger("keydown", { key: "Delete" });
    expect(emitted).toEqual(["mute", "remove"]);
    wrapper.unmount();
  });

  it("shows muted and soloed in its state and name", () => {
    const muted = mountDial({ state: "muted" });
    expect(muted.button().classes()).toContain("looper-dial--muted");
    expect(muted.button().attributes("aria-label")).toMatch(/^Take 3, muted\./);
    muted.wrapper.unmount();
    const solo = mountDial({ state: "solo" });
    expect(solo.button().classes()).toContain("looper-dial--solo");
    expect(solo.button().attributes("aria-label")).toMatch(/^Take 3, solo\./);
    solo.wrapper.unmount();
  });
});
