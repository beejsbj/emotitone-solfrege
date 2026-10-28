import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";
import { provideUIBeat, UIBeatClock } from "@/composables/useUIBeat";
import LooperDial from "@/components/primatives/LooperDial.vue";

const { triggerUIHaptic } = vi.hoisted(() => ({ triggerUIHaptic: vi.fn() }));
vi.mock("@/utils/hapticFeedback", () => ({ triggerUIHaptic }));

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

  // Phone coordinates: the column sits at x 6, so a dial spans x 6 to 50 and a
  // touchscreen never reports a clientX below 0.
  /** A throw from `from` to `to` (clientX), in `steps` moves `everyMs` apart, then the lift. */
  function throwDial(element: Element, from: number, to: number, steps: number, everyMs: number, y = (step: number) => 100 + step) {
    pointer(element, "pointerdown", from, 100);
    for (let step = 1; step <= steps; step++) {
      vi.advanceTimersByTime(everyMs);
      pointer(element, "pointermove", Math.round(from + (to - from) * step / steps), y(step));
    }
    pointer(element, "pointerup", to, y(steps));
    click(element);
  }

  it("a flick off the left edge removes: from the dial's centre (x 28) to the glass's edge (x 0) in 48 ms", async () => {
    vi.useFakeTimers();
    const { wrapper, button, emitted } = mountDial();
    const element = button().element;
    pointer(element, "pointerdown", 28, 100);
    vi.advanceTimersByTime(16);
    pointer(element, "pointermove", 18, 101);
    await nextTick();
    // The dial follows the throw.
    expect(button().classes()).toContain("looper-dial--flicking");
    vi.advanceTimersByTime(16);
    pointer(element, "pointermove", 8, 101);
    vi.advanceTimersByTime(16);
    pointer(element, "pointermove", 0, 102);
    // Thrown at the edge, before any lift (a finger there may never lift on the glass).
    expect(emitted).toEqual(["remove"]);
    pointer(element, "pointerup", 0, 102);
    click(element);
    expect(emitted).toEqual(["remove"]);
    wrapper.unmount();
  });

  it("a flick from the dial's right side (x 44) to the edge removes, as does one cancelled at the edge", () => {
    vi.useFakeTimers();
    const { wrapper, button, emitted } = mountDial();
    const element = button().element;
    throwDial(element, 44, 0, 4, 16);
    expect(emitted).toEqual(["remove"]);
    vi.advanceTimersByTime(400);
    pointer(element, "pointerdown", 30, 100);
    vi.advanceTimersByTime(20);
    pointer(element, "pointermove", 14, 100);
    vi.advanceTimersByTime(20);
    pointer(element, "pointermove", 2, 100);
    pointer(element, "pointercancel", 2, 100);
    expect(emitted).toEqual(["remove", "remove"]);
    wrapper.unmount();
  });

  it("a slow drag to the edge, a short throw, a vertical swipe, a rightward throw and a tap remove nothing", () => {
    vi.useFakeTimers();
    const { wrapper, button, emitted } = mountDial();
    const element = button().element;
    // Slow: x 28 to 0 over 560 ms.
    throwDial(element, 28, 0, 7, 80);
    expect(button().classes()).not.toContain("looper-dial--flicking");
    // Fast but short: x 44 to 34 has 30px of room left.
    vi.advanceTimersByTime(400);
    throwDial(element, 44, 34, 2, 16);
    // A fast vertical swipe drifting left (a reel scroll would look like this).
    vi.advanceTimersByTime(400);
    throwDial(element, 28, 14, 3, 16, (step) => 100 - step * 30);
    // Fast, but to the right.
    vi.advanceTimersByTime(400);
    throwDial(element, 20, 60, 2, 16);
    expect(emitted).toEqual([]);
    // A tap is a mute, never a removal.
    vi.advanceTimersByTime(400);
    pointer(element, "pointerdown", 28, 100);
    pointer(element, "pointerup", 28, 100);
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

  it("ending (BJS-598): says so, dims over the fade it is given, and takes no gesture", async () => {
    vi.useFakeTimers();
    const { wrapper, button, emitted, clock, generation } = mountDial({ ending: true, endingMs: 1500 });
    expect(button().classes()).toContain("looper-dial--ending");
    expect(button().attributes("aria-label")).toBe("Take 3, ending");
    expect(button().attributes("aria-disabled")).toBe("true");
    expect((button().element as HTMLElement).style.getPropertyValue("--looper-dial-ending")).toBe("1500ms");
    // Its disc still turns: the pattern is still heard.
    clock.publish(generation, { rawPosition: .5, barPosition: .5 });
    expect((wrapper.get(".loop-dial__disc").element as SVGGElement).style.transform).toBe("rotate(-90.00deg)");
    // A tap, a hold, a flick to the edge and Delete do nothing.
    const element = button().element;
    pointer(element, "pointerdown", 28, 100);
    vi.advanceTimersByTime(600);
    pointer(element, "pointerup", 28, 100);
    click(element);
    pointer(element, "pointerdown", 28, 100);
    vi.advanceTimersByTime(16);
    pointer(element, "pointermove", 14, 100);
    vi.advanceTimersByTime(16);
    pointer(element, "pointermove", 0, 100);
    pointer(element, "pointerup", 0, 100);
    await button().trigger("keydown", { key: "Delete" });
    expect(emitted).toEqual([]);
    expect(button().classes()).not.toContain("looper-dial--flicking");
    wrapper.unmount();
    clock.destroy();
  });

  it("a press under way when the dial starts ending comes to nothing: no solo, no throw, no haptic", async () => {
    vi.useFakeTimers();
    triggerUIHaptic.mockClear();
    const ending = ref(false);
    const emitted: string[] = [];
    const clock = new UIBeatClock({ observeEnvironment: false, reducedMotion: () => false, documentVisible: () => true });
    const Host = defineComponent({
      setup() {
        provideUIBeat({ clock, presentationEnabled: () => true });
        return () => h(LooperDial, { ...base, haptic: true, ending: ending.value,
          onMute: () => emitted.push("mute"), onDesk: () => emitted.push("desk"),
          onSolo: (held: boolean) => emitted.push(held ? "solo on" : "solo off"), onRemove: () => emitted.push("remove") });
      },
    });
    const wrapper = mount(Host, { attachTo: document.body });
    const element = wrapper.get("button.looper-dial").element;
    // A hold under way: Stop All lands before its threshold.
    pointer(element, "pointerdown", 28, 100);
    vi.advanceTimersByTime(300);
    ending.value = true;
    await nextTick();
    vi.advanceTimersByTime(600);
    // Then the same finger throws it to the edge and lifts.
    pointer(element, "pointermove", 14, 100);
    vi.advanceTimersByTime(16);
    pointer(element, "pointermove", 0, 100);
    pointer(element, "pointerup", 0, 100);
    click(element);
    expect(emitted).toEqual([]);
    expect(triggerUIHaptic).not.toHaveBeenCalled();
    wrapper.unmount();
    clock.destroy();
  });
});
