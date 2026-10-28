import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";
import ReelSwitch, { type ReelSwitchReel } from "@/components/compounds/ReelSwitch.vue";
import PatternReel, { type PatternReelItem } from "@/components/compounds/PatternReel.vue";
import { instrumentIconFor } from "@/components/primatives/instrumentIcon";

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

  /** Elements by role and accessible name, as assistive technology finds them. */
  function byRole(root: Element, role: "button" | "group", name: string | RegExp) {
    const implicit = role === "button" ? "button, [role=button]" : "[role=group], fieldset";
    return [...root.querySelectorAll<HTMLElement>(implicit)].filter((element) => {
      if (element.closest("[aria-hidden=true]")) return false;
      const label = element.getAttribute("aria-label") ?? element.textContent ?? "";
      return typeof name === "string" ? label === name : name.test(label);
    });
  }

  it("lets a screen reader turn reels with Buttons named for the reel each goes to", async () => {
    const page = render("loop-1");
    const root = page.element;
    // The pips are pictures; the turn keys are real buttons.
    expect(page.get("[data-testid=reel-pips]").attributes("aria-hidden")).toBe("true");
    const [previous] = byRole(root, "button", "Previous reel: Every phrase");
    const [next] = byRole(root, "button", "Next reel: Loop 2");
    expect(previous).toBeDefined();
    expect(next).toBeDefined();
    next.click();
    await nextTick();
    expect(changes()).toEqual([["loop-2", "button"]]);
    await page.setProps({ activeId: "loop-2" });
    // At the last reel there is no next one to go to.
    expect(byRole(root, "button", "No next reel")[0].hasAttribute("disabled")).toBe(true);
    byRole(root, "button", "Previous reel: Loop 1")[0].click();
    await nextTick();
    expect(changes().at(-1)).toEqual(["loop-1", "button"]);
    // A touch on a turn key is a press, never the start of a swipe.
    drag(byRole(root, "button", "Previous reel: Loop 1")[0], 700, 200);
    expect(changes()).toHaveLength(2);
  });

  it("keeps the focus on a turn key when the reel it turned to is the last", async () => {
    const page = render("loop-1");
    const next = byRole(page.element, "button", "Next reel: Loop 2")[0];
    next.focus();
    next.click();
    await page.setProps({ activeId: "loop-2" });
    await nextTick();
    expect(document.activeElement).toBe(byRole(page.element, "button", "Previous reel: Loop 1")[0]);
  });

  it("leaves an arrow key that something inside already answered", async () => {
    const page = render("loop-1");
    const strip = page.get(".strip").element;
    strip.addEventListener("keydown", (event) => event.preventDefault());
    strip.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    await nextTick();
    expect(changes()).toEqual([]);
  });

  it("leaves a touch that starts within 20px of either side of the glass to the browser's back swipe", () => {
    const page = render("loop-1");
    const strip = page.get(".strip").element;
    expect(window.innerWidth).toBe(1024);
    drag(strip, 10, 400);
    drag(strip, 1015, 600);
    expect(changes()).toEqual([]);
    drag(strip, 30, 400);
    drag(strip, 990, 600);
    expect(changes()).toEqual([["home", "swipe"], ["loop-2", "swipe"]]);
  });

  it("puts the focus on the new reel when an arrow key turns from a reel that goes away", async () => {
    // As the deck does: each reel is its own element, replaced on a turn.
    const Host = defineComponent({
      setup() {
        const active = ref("home");
        return () => h(ReelSwitch, {
          reels: REELS,
          activeId: active.value,
          onChange: (id: string) => { active.value = id; },
        }, () => h("section", { key: active.value, tabindex: 0, class: "reel", "data-reel-of": active.value }, active.value));
      },
    });
    const host = mount(Host, { attachTo: document.body });
    try {
      const home = host.get("[data-reel-of=home]").element as HTMLElement;
      home.focus();
      home.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
      await nextTick();
      await nextTick();
      const loop = host.get("[data-reel-of=loop-1]").element;
      expect(home.isConnected).toBe(false);
      expect(document.activeElement).toBe(loop);
    } finally {
      host.unmount();
    }
  });

  it("decides one axis with the reel inside it, so a touch is a turn or a scroll, never both", async () => {
    const item = (id: string): PatternReelItem => ({
      id, name: id, instrumentIcon: instrumentIconFor("piano"), instrumentLabel: "Piano", rootLabel: "C4",
      spine: "currentColor", loopDial: [{ color: "currentColor", durationMs: 100 }],
    });
    wrapper = mount(ReelSwitch, {
      props: { reels: REELS, activeId: "loop-1" },
      slots: { default: () => h(PatternReel, { items: ["a", "b", "c"].map(item), selectedId: "b", cyclic: false }) },
      attachTo: document.body,
    });
    const reel = wrapper.getComponent(PatternReel);
    const strip = wrapper.get(".pattern-reel__slot--active .pattern-strip").element;
    const point = (type: string, clientX: number, clientY: number) => {
      clock += 20;
      strip.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 7, pointerType: "touch", isPrimary: true, clientX, clientY,
      }));
    };
    // Exactly the slop down and a little sideways: neither has it yet.
    point("pointerdown", 500, 300);
    point("pointermove", 505, 306);
    await nextTick();
    expect(reel.classes()).not.toContain("pattern-reel--dragging");
    // Then sideways: the switch's, and the reel never scrolls.
    point("pointermove", 520, 307);
    point("pointermove", 700, 308);
    await nextTick();
    expect(reel.classes()).not.toContain("pattern-reel--dragging");
    point("pointerup", 700, 308);
    await nextTick();
    expect(changes()).toEqual([["home", "swipe"]]);
    expect(reel.emitted("commit")).toBeUndefined();
  });
});
