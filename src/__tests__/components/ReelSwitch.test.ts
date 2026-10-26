import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { h } from "vue";
import ReelSwitch, { type ReelSwitchReel } from "@/components/compounds/ReelSwitch.vue";

/**
 * The Reel Switch (BJS-572) through DOM pointer events: a sideways drag
 * across the reel turns to the neighbouring reel; anything else is the reel's
 * own (or a key's). The glass is 1024px wide here, so a quarter is 256px.
 */
const REELS: ReelSwitchReel[] = [
  { id: "home", name: "Every phrase", kind: "home" },
  { id: "loop-1", name: "Loop 1", kind: "loop", sounding: true },
  { id: "loop-2", name: "Loop 2", kind: "loop" },
];

let wrapper: VueWrapper | undefined;
let clock = 0;

beforeEach(() => {
  clock = 10_000;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  Object.defineProperties(Element.prototype, {
    setPointerCapture: { configurable: true, value: () => {} },
    hasPointerCapture: { configurable: true, value: () => false },
    releasePointerCapture: { configurable: true, value: () => {} },
  });
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.restoreAllMocks();
});

function render(activeId = "home", reels = REELS) {
  wrapper = mount(ReelSwitch, {
    props: { reels, activeId },
    slots: {
      default: () => h("div", { class: "reel" }, [
        h("span", { class: "strip" }, "Take 1"),
        h("button", { class: "key", "data-reel-control": "" }, "Delete"),
      ]),
    },
    attachTo: document.body,
  });
  return wrapper;
}

/** A touch from (x, y) to (x2, y2) over `ms`, in four moves. */
function drag(target: Element, x: number, x2: number, { ms = 400, y = 50, y2 = y } = {}) {
  const at = (type: string, step: number) => {
    clock = 10_000 + ms * step / 4;
    target.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 3, pointerType: "touch", isPrimary: true,
      clientX: x + (x2 - x) * step / 4, clientY: y + (y2 - y) * step / 4,
    }));
  };
  at("pointerdown", 0);
  for (const step of [1, 2, 3, 4]) at("pointermove", step);
  at("pointerup", 4);
}

const changes = () => (wrapper!.emitted("change") ?? []) as [string, string][];

describe("Reel Switch", () => {
  it("is nothing but its reel while there is only the home reel", () => {
    const page = render("home", REELS.slice(0, 1));
    expect(page.find("[data-testid=reel-pips]").exists()).toBe(false);
    expect(page.attributes("role")).toBeUndefined();
    drag(page.get(".strip").element, 600, 100);
    expect(changes()).toEqual([]);
  });

  it("draws one quiet pip per reel: home a bar, Loops dots, the shown one lit, a playing Loop ringed", () => {
    const page = render("loop-1");
    const pips = page.findAll("[data-reel-pip]");
    expect(pips.map((pip) => pip.attributes("data-reel-pip"))).toEqual(["home", "loop-1", "loop-2"]);
    expect(pips[0].classes()).toContain("reel-switch__pip--home");
    expect(pips.map((pip) => pip.classes().includes("reel-switch__pip--active"))).toEqual([false, true, false]);
    expect(pips.map((pip) => pip.classes().includes("reel-switch__pip--sounding"))).toEqual([false, true, false]);
    // No words on the glass: the name is for assistive technology.
    expect(page.get("[data-testid=reel-pips]").text()).toBe("");
    expect(page.attributes("aria-label")).toContain("Loop 1, reel 2 of 3");
  });

  it("turns on a sideways drag past a quarter of the reel, leftward to the next and rightward back", () => {
    const page = render("loop-1");
    const strip = page.get(".strip").element;
    drag(strip, 700, 400);
    expect(changes()).toEqual([["loop-2", "swipe"]]);
    drag(strip, 300, 600);
    expect(changes().at(-1)).toEqual(["home", "swipe"]);
  });

  it("turns on a short quick throw, but not on a short slow drag", () => {
    const page = render("home");
    const strip = page.get(".strip").element;
    drag(strip, 500, 440, { ms: 800 });
    expect(changes()).toEqual([]);
    drag(strip, 500, 460, { ms: 60 });
    expect(changes()).toEqual([["loop-1", "swipe"]]);
  });

  it("leaves vertical drags to the reel, keys to themselves, and stops at both ends", async () => {
    const page = render("home");
    const strip = page.get(".strip").element;
    drag(strip, 500, 480, { y: 300, y2: 150 });
    drag(page.get(".key").element, 700, 200);
    // Nothing before home, nothing after the last Loop.
    drag(strip, 200, 700);
    expect(changes()).toEqual([]);
    await page.setProps({ activeId: "loop-2" });
    drag(strip, 700, 200);
    expect(changes()).toEqual([]);
  });

  it("follows the finger while it drags, and gives only a little where there is no reel to go to", () => {
    const page = render("home");
    const strip = page.get(".strip").element;
    const point = (type: string, clientX: number) => strip.dispatchEvent(new PointerEvent(type,
      { bubbles: true, cancelable: true, pointerId: 4, pointerType: "touch", clientX, clientY: 50 }));
    point("pointerdown", 500);
    point("pointermove", 400);
    return page.vm.$nextTick().then(() => {
      expect((page.get(".reel-switch__page").element as HTMLElement).style.transform).toBe("translate3d(-100px, 0, 0)");
      point("pointermove", 600);
      return page.vm.$nextTick();
    }).then(() => {
      expect((page.get(".reel-switch__page").element as HTMLElement).style.transform).toBe("translate3d(25px, 0, 0)");
      point("pointercancel", 600);
      expect(changes()).toEqual([]);
    });
  });

  it("turns with the Left and Right arrow keys, and announces where it is", async () => {
    const page = render("loop-1");
    await page.trigger("keydown", { key: "ArrowRight" });
    await page.trigger("keydown", { key: "ArrowLeft" });
    expect(changes()).toEqual([["loop-2", "keyboard"], ["home", "keyboard"]]);
    await page.setProps({ activeId: "loop-2" });
    expect(page.get(".reel-switch__sr-only").text()).toBe("Loop 2, reel 3 of 3");
    await page.trigger("keydown", { key: "ArrowRight" });
    expect(changes()).toHaveLength(2);
  });
});
