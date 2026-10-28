import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import DeckHeadsUp from "@/components/patterns/DeckHeadsUp.vue";
import { HEADS_UP_MS } from "@/composables/useHeadsUpQueue";
import { useHeadsUpStore } from "@/stores/headsUp";

/**
 * The Heads-up stack above the deck (BJS-592): lines stack newest at the
 * bottom, fade on their own timers, and go early on a swipe right. Observed
 * through the rendered stack, the real store and DOM pointer events, on fake
 * timers.
 */
const PHONE_WIDTH = 390;
let wrapper: VueWrapper | undefined;
let width: PropertyDescriptor | undefined;
let headsUp: ReturnType<typeof useHeadsUpStore>;

beforeEach(() => {
  vi.useFakeTimers();
  width = Object.getOwnPropertyDescriptor(window, "innerWidth");
  Object.defineProperty(window, "innerWidth", { configurable: true, value: PHONE_WIDTH });
  setActivePinia(createPinia());
  headsUp = useHeadsUpStore();
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  headsUp.$dispose();
  if (width) Object.defineProperty(window, "innerWidth", width);
  vi.useRealTimers();
});

function render(props: Record<string, unknown> = {}) {
  wrapper = mount(DeckHeadsUp, { attachTo: document.body, props });
  return wrapper;
}

/** The lines on screen, top to bottom. */
const lines = (page: VueWrapper) => page.findAll(".heads-up__line").map((line) => line.attributes("title"));

async function wait(ms: number) {
  vi.advanceTimersByTime(ms);
  await nextTick();
}

/** A fast throw to the right on one line: 300 to 352 in three 16 ms moves. */
function sweep(element: Element) {
  const at = (type: string, clientX: number) => element.dispatchEvent(new PointerEvent(type,
    { bubbles: true, cancelable: true, pointerId: 3, pointerType: "touch", clientX, clientY: 300 }));
  at("pointerdown", 300);
  for (const x of [320, 340, 352]) {
    vi.advanceTimersByTime(16);
    at("pointermove", x);
  }
  at("pointerup", 352);
}

describe("Heads-up stack", () => {
  it("stacks newest at the bottom, nearest the deck, and fades each on its own timer", async () => {
    const page = render();
    expect(lines(page)).toEqual([]);
    headsUp.raise({ line: "Shelf full · still saving", label: "Shelf full", signal: "warning" });
    await wait(1000);
    headsUp.raise({ line: "Not enough memory for Piano.", label: "Looper", signal: "problem" });
    await nextTick();
    expect(lines(page)).toEqual(["Shelf full · still saving", "Not enough memory for Piano."]);
    // A warning's lamp is unlit and it waits its turn; a problem's is lit and interrupts.
    const [warning, problem] = page.findAll(".heads-up");
    expect(warning.classes()).toContain("heads-up--warning");
    expect(warning.find("[role=status]").exists()).toBe(true);
    expect(problem.classes()).toContain("heads-up--problem");
    expect(problem.find("[role=alert]").exists()).toBe(true);
    // Still type on the Stage: no key or close button anywhere in the stack.
    expect(page.find("button").exists()).toBe(false);

    // The warning goes at 4 s after it arrived; the problem stays.
    await wait(HEADS_UP_MS.warning - 1000 - 1);
    expect(lines(page)).toHaveLength(2);
    await wait(1);
    expect(lines(page)).toEqual(["Not enough memory for Piano."]);
    // The problem goes 7 s after it arrived.
    await wait(HEADS_UP_MS.problem - (HEADS_UP_MS.warning - 1000) - 1);
    expect(lines(page)).toEqual(["Not enough memory for Piano."]);
    await wait(1);
    expect(lines(page)).toEqual([]);
  });

  it("a swipe right puts one away early and leaves the rest", async () => {
    const page = render();
    headsUp.raise({ line: "Shelf full · still saving", label: "Shelf full", signal: "warning" });
    headsUp.raise({ line: "Not enough memory for Piano.", label: "Looper" });
    headsUp.raise({ line: "Can't play Piano: memory full", label: "Keyboard" });
    await nextTick();
    sweep(page.get('[data-heads-up="Not enough memory for Piano."]').element);
    await nextTick();
    expect(lines(page)).toEqual(["Shelf full · still saving", "Can't play Piano: memory full"]);
    // Escape on a focused line does the same.
    await page.get('[data-heads-up="Shelf full · still saving"]').trigger("keydown", { key: "Escape" });
    expect(lines(page)).toEqual(["Can't play Piano: memory full"]);
  });

  it("shows at most three: a fourth evicts the oldest", async () => {
    const page = render();
    for (const line of ["One", "Two", "Three"]) headsUp.raise({ line, label: "Test" });
    await nextTick();
    expect(lines(page)).toEqual(["One", "Two", "Three"]);
    headsUp.raise({ line: "Four", label: "Test" });
    await nextTick();
    expect(lines(page)).toEqual(["Two", "Three", "Four"]);
    // The evicted line's timer is gone with it: nothing comes back or breaks when it would have fired.
    await wait(HEADS_UP_MS.problem);
    expect(lines(page)).toEqual([]);
  });

  it("the same message again refreshes its timer in place instead of showing twice", async () => {
    const page = render();
    headsUp.raise({ line: "Can't play Piano: memory full", label: "Keyboard" });
    headsUp.raise({ line: "Shelf full · still saving", label: "Shelf full", signal: "warning" });
    await wait(HEADS_UP_MS.problem - 1000);
    headsUp.raise({ line: "Can't play Piano: memory full", label: "Keyboard" });
    await nextTick();
    // One line, in its place.
    expect(lines(page)).toEqual(["Can't play Piano: memory full"]);
    await wait(HEADS_UP_MS.problem - 1);
    expect(lines(page)).toEqual(["Can't play Piano: memory full"]);
    await wait(1);
    expect(lines(page)).toEqual([]);
  });

  it("a new line from the same source replaces the old one as the newest", async () => {
    const page = render();
    headsUp.raise({ id: "shelf", line: "Shelf full · still saving", label: "Shelf full", signal: "warning" });
    headsUp.raise({ line: "Not enough memory for Piano.", label: "Looper" });
    headsUp.raise({ id: "shelf", line: "Not saving. Delete old takes.", label: "Not saving" });
    await nextTick();
    expect(lines(page)).toEqual(["Not enough memory for Piano.", "Not saving. Delete old takes."]);
  });

  it("steps aside while the reel is busy: hidden and inert, and no sweep lands", async () => {
    const page = render({ busy: true });
    headsUp.raise({ line: "Not enough memory for Piano.", label: "Looper" });
    await nextTick();
    const line = page.get(".heads-up");
    expect(line.attributes("aria-hidden")).toBe("true");
    expect(line.attributes("inert")).toBeDefined();
    sweep(line.element);
    await nextTick();
    expect(lines(page)).toEqual(["Not enough memory for Piano."]);
    await page.setProps({ busy: false });
    expect(page.get(".heads-up").attributes("aria-hidden")).toBeUndefined();
  });
});
