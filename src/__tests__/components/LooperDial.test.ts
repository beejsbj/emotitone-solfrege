import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { provideUIBeat, UIBeatClock } from "@/composables/useUIBeat";
import LooperDial from "@/components/primatives/LooperDial.vue";

/**
 * The Looper Dial: one playing pattern as its own control. Observed through
 * DOM pointer, click and key events, and the gestures it emits. The gesture
 * map (Burooj, 2026-10-19): tap mutes, double-tap brings the pattern to the
 * desk, hold solos while held, a flick off the left edge removes.
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
        onDesk: () => emitted.push("desk"),
        onSolo: (held: boolean) => emitted.push(held ? "solo on" : "solo off"),
        onRemove: () => emitted.push("remove"),
      });
    },
  });
  const generation = clock.arm({ mappingAvailable: true, bpm: 120, meter: { beatsPerBar: 4, beatUnit: 4 } });
  const wrapper = mount(Host, { attachTo: document.body });
  return { wrapper, clock, generation, emitted, button: () => wrapper.get("button.looper-dial") };
}

function pointer(element: Element, type: string, clientX: number, clientY: number) {
  element.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: "touch", clientX, clientY }));
}

/** The click a pointer press ends with. */
const click = (element: Element) => element.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));

describe("LooperDial", () => {
  afterEach(() => vi.useRealTimers());

  it("is the control itself: a bare dial, no keycap, named for its pattern and its gestures", () => {
    const { wrapper, button } = mountDial();
    expect(button().find(".paper-button__cap").exists()).toBe(false);
    expect(button().attributes("aria-label")).toBe("Take 3, playing. Tap to mute, double-tap to bring it to the desk, hold to solo, flick left to remove");
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

  it("a tap mutes, at once", async () => {
    const { wrapper, button, emitted } = mountDial();
    await button().trigger("pointerdown");
    await button().trigger("pointerup");
    await button().trigger("click");
    expect(emitted).toEqual(["mute"]);
    wrapper.unmount();
  });

  it("a double-tap brings the pattern to the desk: its second tap undoes the first tap's mute", async () => {
    const { wrapper, button, emitted } = mountDial();
    for (let tap = 0; tap < 2; tap++) {
      await button().trigger("pointerdown");
      await button().trigger("pointerup");
      await button().trigger("click");
    }
    expect(emitted).toEqual(["mute", "mute", "desk"]);
    expect(emitted).not.toContain("solo on");
    wrapper.unmount();
  });

  it("a hold solos only while held: from the threshold to the lift, and its click is no tap", () => {
    vi.useFakeTimers();
    const { wrapper, button, emitted } = mountDial();
    const element = button().element;
    pointer(element, "pointerdown", 20, 100);
    vi.advanceTimersByTime(400);
    expect(emitted).toEqual([]);
    vi.advanceTimersByTime(200);
    expect(emitted).toEqual(["solo on"]);
    // Still held: still soloed, a finger's wobble included.
    vi.advanceTimersByTime(2000);
    pointer(element, "pointermove", 30, 102);
    expect(emitted).toEqual(["solo on"]);
    pointer(element, "pointerup", 30, 102);
    expect(emitted).toEqual(["solo on", "solo off"]);
    click(element);
    pointer(element, "lostpointercapture", 30, 102);
    expect(emitted).toEqual(["solo on", "solo off"]);
    wrapper.unmount();
  });

  it("a held solo ends when the press is cancelled or loses its capture", () => {
    vi.useFakeTimers();
    const { wrapper, button, emitted } = mountDial();
    const element = button().element;
    pointer(element, "pointerdown", 20, 100);
    vi.advanceTimersByTime(600);
    pointer(element, "pointercancel", 20, 100);
    expect(emitted).toEqual(["solo on", "solo off"]);
    pointer(element, "pointerdown", 20, 100);
    vi.advanceTimersByTime(600);
    pointer(element, "lostpointercapture", 20, 100);
    expect(emitted).toEqual(["solo on", "solo off", "solo on", "solo off"]);
    wrapper.unmount();
  });

  it("a fast flick off the left edge removes", async () => {
    vi.useFakeTimers();
    const { wrapper, button, emitted } = mountDial();
    const element = button().element;
    pointer(element, "pointerdown", 30, 100);
    vi.advanceTimersByTime(16);
    pointer(element, "pointermove", 10, 101);
    await nextTick();
    // The dial follows the throw.
    expect(button().classes()).toContain("looper-dial--flicking");
    vi.advanceTimersByTime(16);
    pointer(element, "pointermove", -25, 103);
    vi.advanceTimersByTime(16);
    pointer(element, "pointerup", -45, 104);
    click(element);
    expect(emitted).toEqual(["remove"]);
    wrapper.unmount();
  });

  it("a slow drag left, a short flick, a rightward flick and a tap remove nothing", () => {
    vi.useFakeTimers();
    const { wrapper, button, emitted } = mountDial();
    const element = button().element;
    // Slow: 90px over 900ms.
    pointer(element, "pointerdown", 100, 100);
    for (let step = 1; step <= 9; step++) {
      vi.advanceTimersByTime(100);
      pointer(element, "pointermove", 100 - step * 10, 100);
    }
    pointer(element, "pointerup", 10, 100);
    click(element);
    expect(button().classes()).not.toContain("looper-dial--flicking");
    // Fast but short: 30px.
    vi.advanceTimersByTime(400);
    pointer(element, "pointerdown", 100, 100);
    vi.advanceTimersByTime(20);
    pointer(element, "pointermove", 85, 100);
    vi.advanceTimersByTime(20);
    pointer(element, "pointerup", 70, 100);
    click(element);
    // Fast, but to the right.
    vi.advanceTimersByTime(400);
    pointer(element, "pointerdown", 20, 100);
    vi.advanceTimersByTime(20);
    pointer(element, "pointermove", 60, 100);
    vi.advanceTimersByTime(20);
    pointer(element, "pointerup", 100, 100);
    click(element);
    expect(emitted).toEqual([]);
    // A tap is a mute, never a removal.
    vi.advanceTimersByTime(400);
    pointer(element, "pointerdown", 20, 100);
    pointer(element, "pointerup", 20, 100);
    click(element);
    expect(emitted).toEqual(["mute"]);
    wrapper.unmount();
  });

  it("a vertical drag does nothing yet (kept for the loop's volume), and is no tap or hold", () => {
    vi.useFakeTimers();
    const { wrapper, button, emitted } = mountDial();
    const element = button().element;
    pointer(element, "pointerdown", 20, 100);
    pointer(element, "pointermove", 21, 60);
    vi.advanceTimersByTime(800);
    pointer(element, "pointermove", 21, 20);
    pointer(element, "pointerup", 21, 20);
    click(element);
    expect(emitted).toEqual([]);
    wrapper.unmount();
  });

  it("a sideways slide neither mutes nor solos, however long it is held", () => {
    vi.useFakeTimers();
    const { wrapper, button, emitted } = mountDial();
    const element = button().element;
    pointer(element, "pointerdown", 20, 100);
    pointer(element, "pointermove", 30, 99);
    vi.advanceTimersByTime(800);
    pointer(element, "pointerup", 30, 99);
    click(element);
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
