import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import HeadsUp from "@/components/compounds/HeadsUp.vue";

/**
 * A Heads-up: one right-aligned line the instrument tells you, put away
 * by a swipe off the right edge, the mirror of the Looper Dial's flick off the
 * left. Observed through DOM pointer and key events, and its dismiss.
 */
const PHONE_WIDTH = 390;
let wrapper: VueWrapper | undefined;
let width: PropertyDescriptor | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  width = Object.getOwnPropertyDescriptor(window, "innerWidth");
  Object.defineProperty(window, "innerWidth", { configurable: true, value: PHONE_WIDTH });
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  if (width) Object.defineProperty(window, "innerWidth", width);
  vi.useRealTimers();
});

function render(props: Record<string, unknown> = {}) {
  wrapper?.unmount();
  wrapper = mount(HeadsUp, {
    attachTo: document.body,
    props: { line: "Stop a loop to add Piano.", label: "Looper", ...props },
  });
  return wrapper;
}

function pointer(element: Element, type: string, clientX: number, clientY = 300) {
  element.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 9, pointerType: "touch", clientX, clientY }));
}

/** A touch from x to x2 in `steps` moves of `stepMs` each, then a lift. */
function swipe(element: Element, from: number, to: number, steps: number, stepMs: number, y: (step: number) => number = () => 300) {
  pointer(element, "pointerdown", from, y(0));
  for (let step = 1; step <= steps; step++) {
    vi.advanceTimersByTime(stepMs);
    pointer(element, "pointermove", Math.round(from + (to - from) * step / steps), y(step));
  }
  pointer(element, "pointerup", to, y(steps));
}

describe("HeadsUp", () => {
  it("is text on the Stage: the line and a Brass lamp, with no key, box or close button", () => {
    const notice = render({ hint: ". Stop a loop first." });
    expect(notice.find("button").exists()).toBe(false);
    expect(notice.get("[role=status]").text()).toBe("Stop a loop to add Piano.. Stop a loop first.");
    expect(notice.get(".heads-up__line").attributes("title")).toBe("Stop a loop to add Piano.");
    expect(notice.find(".heads-up__lamp").exists()).toBe(true);
    expect(notice.classes()).toContain("heads-up--problem");
    const warning = render({ signal: "warning", role: "alert" });
    expect(warning.classes()).toContain("heads-up--warning");
    expect(warning.find("[role=alert]").exists()).toBe(true);
  });

  it("is swept off the right edge: a fast sideways throw dismisses it, before any lift", async () => {
    const notice = render();
    const element = notice.element;
    pointer(element, "pointerdown", 300);
    vi.advanceTimersByTime(16);
    pointer(element, "pointermove", 320);
    await nextTick();
    // The line follows the sweep.
    expect(notice.classes()).toContain("heads-up--sweeping");
    vi.advanceTimersByTime(16);
    pointer(element, "pointermove", 340);
    vi.advanceTimersByTime(16);
    pointer(element, "pointermove", 352);
    expect(notice.emitted("dismiss")).toHaveLength(1);
    pointer(element, "pointerup", 352);
    expect(notice.emitted("dismiss")).toHaveLength(1);
  });

  it("near the right edge, reaching the glass's edge is far enough (the dial's flick, mirrored)", () => {
    const notice = render();
    // x 360 has 26px of room to x 386: a quick throw to the edge counts.
    swipe(notice.element, 360, 388, 2, 16);
    expect(notice.emitted("dismiss")).toHaveLength(1);
  });

  it("a tap that drifts 12px toward the edge, however fast, never dismisses", () => {
    const notice = render();
    // Mid-line, and right at the edge, where 12px is all the room there is.
    swipe(notice.element, 300, 312, 1, 16);
    swipe(notice.element, 374, 386, 1, 16);
    swipe(notice.element, 376, 388, 2, 8);
    expect(notice.emitted("dismiss")).toBeUndefined();
  });

  it("a slow drag, a short throw, a vertical swipe, a leftward throw and a tap leave it", () => {
    const notice = render();
    const element = notice.element;
    // Slow: x 250 to 340 over 560 ms.
    swipe(element, 250, 340, 7, 80);
    // Fast but short: 20px with 100px of room.
    swipe(element, 270, 290, 2, 16);
    // A fast vertical swipe drifting right.
    swipe(element, 250, 270, 3, 16, (step) => 300 - step * 30);
    // Fast, but to the left.
    swipe(element, 300, 200, 2, 16);
    // A tap.
    pointer(element, "pointerdown", 300);
    pointer(element, "pointerup", 300);
    expect(notice.emitted("dismiss")).toBeUndefined();
  });

  it("dismisses from the keyboard with Escape or Delete, and says how", async () => {
    const notice = render();
    expect(notice.attributes("tabindex")).toBe("0");
    expect(notice.attributes("aria-description")).toBe("Swipe right or press Escape to dismiss");
    await notice.trigger("keydown", { key: "Escape" });
    await notice.trigger("keydown", { key: "Delete" });
    expect(notice.emitted("dismiss")).toHaveLength(2);
  });

  it("steps aside while busy: hidden, inert, and no sweep lands", () => {
    const notice = render({ busy: true });
    expect(notice.attributes("aria-hidden")).toBe("true");
    expect(notice.attributes("inert")).toBeDefined();
    expect(notice.attributes("tabindex")).toBeUndefined();
    swipe(notice.element, 300, 360, 3, 16);
    expect(notice.emitted("dismiss")).toBeUndefined();
  });
});
