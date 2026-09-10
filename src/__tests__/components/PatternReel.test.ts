import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import PatternReel from "@/components/compounds/PatternReel.vue";
import PatternStrip from "@/components/compounds/PatternStrip.vue";
import patternReelSource from "@/components/compounds/PatternReel.vue?raw";
import type { PatternReelItem } from "@/components/compounds/PatternReel.vue";

function item(id: string, name: string): PatternReelItem {
  return {
    id,
    name,
    rootLabel: "C4",
    spine: "rgb(255, 0, 0)",
    barTape: [{ color: "rgb(255, 0, 0)", durationMs: 100 }],
    canDelete: true,
  };
}

const items = [
  item("alpha", "Alpha"),
  item("beta", "Beta"),
  item("gamma", "Gamma"),
];

function slotFor(wrapper: ReturnType<typeof mount>, name: string) {
  const slot = wrapper.findAll(".pattern-reel__slot").find((candidate) => (
    candidate.text().includes(name)
  ));
  if (!slot) throw new Error(`Missing slot for ${name}`);
  return slot;
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    matches: false,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("PatternReel", () => {
  it("keeps an unframed empty reel visibly keyboard-focusable", () => {
    const wrapper = mount(PatternReel, {
      props: { items: [], selectedId: "" },
    });

    expect(wrapper.get(".pattern-reel__empty").text()).toBe(
      "Play some notes, then press Return.",
    );
    expect(patternReelSource).toMatch(
      /\.pattern-reel:focus-visible \.pattern-reel__empty\s*{[\s\S]*outline:/,
    );
  });

  it("anchors Current at the bottom and collapses truthful predecessors behind it", () => {
    const wrapper = mount(PatternReel, {
      props: { items, selectedId: "gamma" },
    });

    expect(slotFor(wrapper, "Gamma").classes()).toContain("pattern-reel__slot--active");
    expect(slotFor(wrapper, "Gamma").attributes("style")).toContain("--slot-y: 0px");
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--slot-y: -14.4px");
    expect(slotFor(wrapper, "Alpha").attributes("style")).toContain("--slot-y: -24.8px");
    expect(wrapper.findAll(".bar-tape")).toHaveLength(3);
    expect(wrapper.findAll(".bar-tape").filter((tape) => (
      tape.attributes("aria-hidden") === undefined
    ))).toHaveLength(2);
    expect(slotFor(wrapper, "Gamma").get(".bar-tape").attributes("aria-hidden"))
      .toBe("true");
    expect(wrapper.find(".pattern-reel__head").exists()).toBe(false);
    expect(wrapper.find(".pattern-reel__fade").exists()).toBe(false);
    expect(patternReelSource).toContain("width: 100%");
    expect(patternReelSource).toContain("background: transparent");
  });

  it("unwinds on Current tap, holds for 900ms, then starts the 200ms rebound collapse", async () => {
    vi.useFakeTimers();
    const wrapper = mount(PatternReel, {
      props: { items, selectedId: "gamma" },
    });

    await wrapper.get('button[aria-label^="Unwind patterns around Gamma"]').trigger("click");
    await nextTick();
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--slot-y: -46.4px");
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--settle-duration: 200ms");

    vi.advanceTimersByTime(1099);
    await nextTick();
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--slot-y: -46.4px");

    vi.advanceTimersByTime(1);
    await nextTick();
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--slot-y: -14.4px");
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--settle-duration: 200ms");
  });

  it("keeps collapsed predecessors inert until Current reveals the wheel", async () => {
    const wrapper = mount(PatternReel, {
      props: { items, selectedId: "gamma" },
    });
    const beta = slotFor(wrapper, "Beta");

    expect(beta.attributes("aria-hidden")).toBe("true");
    expect(beta.attributes("inert")).toBeDefined();
    expect(beta.get(".pattern-strip__identity").attributes("disabled")).toBeDefined();
    for (const action of beta.findAll(".pattern-strip__actions button")) {
      expect(action.attributes("disabled")).toBeDefined();
    }

    await wrapper.get('button[aria-label^="Unwind patterns around Gamma"]').trigger("click");
    await nextTick();

    expect(beta.attributes("aria-hidden")).toBeUndefined();
    expect(beta.attributes("inert")).toBeUndefined();
    expect(beta.get(".pattern-strip__identity").attributes("disabled")).toBeUndefined();
    for (const action of beta.findAll(".pattern-strip__actions button")) {
      expect(action.attributes("disabled")).toBeUndefined();
    }
  });

  it("uses the approved 200ms collapse when an open-wheel tap commits", async () => {
    vi.useFakeTimers();
    const wrapper = mount(PatternReel, {
      props: { items, selectedId: "gamma" },
    });

    const betaElement = slotFor(wrapper, "Beta").element;
    await wrapper.get('button[aria-label^="Unwind patterns around Gamma"]').trigger("click");
    await nextTick();
    await slotFor(wrapper, "Beta").get('.pattern-strip__identity').trigger("click");
    await nextTick();

    expect(wrapper.emitted("commit")).toContainEqual(["beta", "tap"]);
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--slot-y: -14.4px");
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--settle-duration: 200ms");
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain(
      "--settle-easing: var(--ease-reel-rebound)",
    );

    await wrapper.setProps({ selectedId: "beta" });
    expect(slotFor(wrapper, "Beta").element).toBe(betaElement);
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--slot-y: 0px");
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--settle-duration: 200ms");
  });

  it("keeps DOM focus order aligned with the visible top-to-bottom slot order", () => {
    const wrapper = mount(PatternReel, {
      props: { items, selectedId: "beta" },
    });

    expect(wrapper.findAll(".pattern-reel__slot strong").map((label) => label.text()))
      .toEqual(["Gamma", "Alpha", "Beta"]);
  });

  it("preserves browser zoom and commits an ordinary three-line wheel notch", async () => {
    vi.useFakeTimers();
    const wrapper = mount(PatternReel, {
      props: { items, selectedId: "gamma" },
    });
    const zoomGesture = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: 60,
    });
    Object.defineProperty(zoomGesture, "ctrlKey", { value: true });

    wrapper.element.dispatchEvent(zoomGesture);
    await nextTick();
    expect(wrapper.emitted("commit")).toBeUndefined();
    expect(slotFor(wrapper, "Gamma").classes()).toContain("pattern-reel__slot--active");
    expect(patternReelSource).toMatch(/event\.ctrlKey[\s\S]*event\.preventDefault\(\)/);

    const wheelNotch = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaMode: WheelEvent.DOM_DELTA_LINE,
      deltaY: 3,
    });
    wrapper.element.dispatchEvent(wheelNotch);
    await nextTick();

    expect(wheelNotch.defaultPrevented).toBe(true);
    expect(slotFor(wrapper, "Alpha").classes()).toContain("pattern-reel__slot--active");
    expect(slotFor(wrapper, "Gamma").get(".bar-tape").attributes("aria-hidden"))
      .toBe("true");
    expect(slotFor(wrapper, "Alpha").get(".bar-tape").attributes("aria-hidden"))
      .toBeUndefined();

    vi.advanceTimersByTime(220);
    await nextTick();
    expect(wrapper.emitted("commit")).toEqual([["alpha", "wheel"]]);
  });

  it("bounds page-mode wheel input to one cyclic step", async () => {
    vi.useFakeTimers();
    const fourItems = [...items, item("delta", "Delta")];
    const wrapper = mount(PatternReel, {
      props: { items: fourItems, selectedId: "delta" },
    });
    const pageWheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaMode: WheelEvent.DOM_DELTA_PAGE,
      deltaY: 1,
    });

    wrapper.element.dispatchEvent(pageWheel);
    await nextTick();

    expect(pageWheel.defaultPrevented).toBe(true);
    expect(slotFor(wrapper, "Alpha").classes()).toContain("pattern-reel__slot--active");

    vi.advanceTimersByTime(220);
    await nextTick();
    expect(wrapper.emitted("commit")).toEqual([["alpha", "wheel"]]);
  });

  it("captures pending drags and scopes horizontal-gesture click suppression to the viewport", async () => {
    vi.useFakeTimers();
    const wrapper = mount(PatternReel, {
      props: { items, selectedId: "gamma" },
    });
    const reel = wrapper.element as HTMLElement;
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    Object.defineProperties(reel, {
      setPointerCapture: { value: setPointerCapture },
      hasPointerCapture: { value: vi.fn(() => false) },
      releasePointerCapture: { value: releasePointerCapture },
    });
    const identity = slotFor(wrapper, "Gamma").get(".pattern-strip__identity");
    await identity.trigger("pointerdown", {
      button: 0,
      clientX: 20,
      clientY: 20,
      pointerId: 7,
    });
    expect(setPointerCapture).not.toHaveBeenCalled();

    await wrapper.trigger("pointermove", {
      clientX: 40,
      clientY: 21,
      pointerId: 7,
    });
    expect(releasePointerCapture).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    await wrapper.trigger("pointerup", { pointerId: 7 });
    expect(releasePointerCapture).not.toHaveBeenCalled();

    await identity.trigger("click");
    expect(wrapper.emitted("commit")).toBeUndefined();

    await wrapper.trigger("keydown", { key: "ArrowDown" });
    expect(wrapper.emitted("commit")).toEqual([["alpha", "keyboard"]]);
  });

  it("defers pointer capture so an ordinary identity tap reaches its button", async () => {
    const wrapper = mount(PatternReel, {
      props: { items, selectedId: "gamma" },
    });
    const reel = wrapper.element as HTMLElement;
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    Object.defineProperties(reel, {
      setPointerCapture: { value: setPointerCapture },
      hasPointerCapture: { value: vi.fn(() => false) },
      releasePointerCapture: { value: releasePointerCapture },
    });
    const identity = slotFor(wrapper, "Gamma").get(".pattern-strip__identity");

    await identity.trigger("pointerdown", {
      button: 0,
      clientX: 20,
      clientY: 20,
      pointerId: 8,
    });
    await identity.trigger("pointerup", { pointerId: 8 });

    expect(setPointerCapture).not.toHaveBeenCalled();
    expect(releasePointerCapture).not.toHaveBeenCalled();

    await identity.trigger("click");
    await nextTick();
    expect(slotFor(wrapper, "Beta").attributes("aria-hidden")).toBeUndefined();
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--slot-y: -46.4px");
  });

  it("clears an uncaptured pointer released outside before the next gesture", async () => {
    const addWindowListener = vi.spyOn(window, "addEventListener");
    const wrapper = mount(PatternReel, {
      props: { items, selectedId: "gamma" },
    });
    const reel = wrapper.element as HTMLElement;
    const setPointerCapture = vi.fn();
    Object.defineProperties(reel, {
      setPointerCapture: { value: setPointerCapture },
      hasPointerCapture: { value: vi.fn(() => false) },
      releasePointerCapture: { value: vi.fn() },
    });
    const identity = slotFor(wrapper, "Gamma").get(".pattern-strip__identity");
    await identity.trigger("pointerdown", {
      button: 0,
      clientX: 20,
      clientY: 20,
      pointerId: 12,
    });
    expect(addWindowListener).toHaveBeenCalledWith("pointerup", expect.any(Function));
    const outsideRelease = new Event("pointerup");
    Object.defineProperty(outsideRelease, "pointerId", { value: 12 });
    const outsideReleaseListener = addWindowListener.mock.calls
      .find(([type]) => type === "pointerup")?.[1] as EventListener;
    outsideReleaseListener(outsideRelease);

    await identity.trigger("pointerdown", {
      button: 0,
      clientX: 20,
      clientY: 70,
      pointerId: 13,
    });
    expect(addWindowListener.mock.calls.filter(([type]) => type === "pointerup"))
      .toHaveLength(2);
    await wrapper.trigger("pointermove", {
      clientX: 20,
      clientY: 20,
      pointerId: 13,
    });

    expect(setPointerCapture).toHaveBeenCalledWith(13);
    await wrapper.trigger("pointercancel", { pointerId: 13 });
    wrapper.unmount();
  });

  it("returns a cancelled direct drag to the deck without starting the open hold", async () => {
    const wrapper = mount(PatternReel, {
      props: { items, selectedId: "gamma" },
    });
    const reel = wrapper.element as HTMLElement;
    Object.defineProperties(reel, {
      setPointerCapture: { value: vi.fn() },
      hasPointerCapture: { value: vi.fn(() => true) },
      releasePointerCapture: { value: vi.fn() },
    });
    const identity = slotFor(wrapper, "Gamma").get(".pattern-strip__identity");

    await identity.trigger("pointerdown", {
      button: 0,
      clientX: 20,
      clientY: 70,
      pointerId: 9,
    });
    await wrapper.trigger("pointermove", {
      clientX: 20,
      clientY: 20,
      pointerId: 9,
    });
    await wrapper.trigger("pointercancel", { pointerId: 9 });
    await nextTick();

    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--slot-y: -14.4px");
    expect(slotFor(wrapper, "Beta").attributes("aria-hidden")).toBe("true");
    expect(wrapper.emitted("commit")).toBeUndefined();
  });

  it("pauses the open-hold collapse timer while a vertical drag is claimed", async () => {
    vi.useFakeTimers();
    const wrapper = mount(PatternReel, {
      props: { items, selectedId: "gamma" },
    });
    const reel = wrapper.element as HTMLElement;
    Object.defineProperties(reel, {
      setPointerCapture: { value: vi.fn() },
      hasPointerCapture: { value: vi.fn(() => true) },
      releasePointerCapture: { value: vi.fn() },
    });
    const identity = slotFor(wrapper, "Gamma").get(".pattern-strip__identity");

    await identity.trigger("click");
    vi.advanceTimersByTime(201);
    await identity.trigger("pointerdown", {
      button: 0,
      clientX: 20,
      clientY: 50,
      pointerId: 10,
    });
    await wrapper.trigger("pointermove", {
      clientX: 20,
      clientY: 40,
      pointerId: 10,
    });
    await nextTick();
    const openDragPosition = slotFor(wrapper, "Beta").attributes("style")
      .match(/--slot-y: ([^;]+)/)?.[1];

    vi.advanceTimersByTime(1000);
    await nextTick();
    expect(wrapper.classes()).toContain("pattern-reel--dragging");
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain(
      `--slot-y: ${openDragPosition}`,
    );
    expect(slotFor(wrapper, "Beta").attributes("aria-hidden")).toBeUndefined();
    wrapper.unmount();
  });

  it("keeps the revealed wheel open while keyboard focus remains in a predecessor", async () => {
    vi.useFakeTimers();
    const wrapper = mount(PatternReel, {
      attachTo: document.body,
      props: { items, selectedId: "gamma" },
    });

    await wrapper.get('button[aria-label^="Unwind patterns around Gamma"]').trigger("click");
    await nextTick();
    const betaDelete = slotFor(wrapper, "Beta").get('button[aria-label="Delete Beta"]');
    (betaDelete.element as HTMLElement).focus();

    vi.advanceTimersByTime(1100);
    await nextTick();
    expect(document.activeElement).toBe(betaDelete.element);
    expect(slotFor(wrapper, "Beta").attributes("aria-hidden")).toBeUndefined();
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--slot-y: -46.4px");

    (wrapper.element as HTMLElement).focus();
    await nextTick();
    vi.advanceTimersByTime(899);
    await nextTick();
    expect(slotFor(wrapper, "Beta").attributes("aria-hidden")).toBeUndefined();

    vi.advanceTimersByTime(1);
    await nextTick();
    expect(slotFor(wrapper, "Beta").attributes("aria-hidden")).toBe("true");
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--slot-y: -14.4px");

    wrapper.unmount();
  });

  it("restarts the full hold when focus exits a predecessor before the deadline", async () => {
    vi.useFakeTimers();
    const wrapper = mount(PatternReel, {
      attachTo: document.body,
      props: { items, selectedId: "gamma" },
    });

    await wrapper.get('button[aria-label^="Unwind patterns around Gamma"]').trigger("click");
    await nextTick();
    vi.advanceTimersByTime(1000);
    const betaDelete = slotFor(wrapper, "Beta").get('button[aria-label="Delete Beta"]');
    (betaDelete.element as HTMLElement).focus();
    (wrapper.element as HTMLElement).focus();
    await nextTick();

    vi.advanceTimersByTime(899);
    await nextTick();
    expect(slotFor(wrapper, "Beta").attributes("aria-hidden")).toBeUndefined();

    vi.advanceTimersByTime(1);
    await nextTick();
    expect(slotFor(wrapper, "Beta").attributes("aria-hidden")).toBe("true");
    wrapper.unmount();
  });

  it("does not let predecessor focus in another reel pause its collapse", async () => {
    vi.useFakeTimers();
    const firstReel = mount(PatternReel, {
      attachTo: document.body,
      props: { items, selectedId: "gamma" },
    });
    const secondReel = mount(PatternReel, {
      attachTo: document.body,
      props: { items, selectedId: "gamma" },
    });

    await firstReel.get('button[aria-label^="Unwind patterns around Gamma"]').trigger("click");
    await secondReel.get('button[aria-label^="Unwind patterns around Gamma"]').trigger("click");
    await nextTick();
    const secondBetaDelete = slotFor(secondReel, "Beta")
      .get('button[aria-label="Delete Beta"]');
    (secondBetaDelete.element as HTMLElement).focus();

    vi.advanceTimersByTime(1100);
    await nextTick();

    expect(slotFor(firstReel, "Beta").attributes("aria-hidden")).toBe("true");
    expect(slotFor(secondReel, "Beta").attributes("aria-hidden")).toBeUndefined();

    firstReel.unmount();
    secondReel.unmount();
  });

  it("keeps the incoming identity continuous when a short reel wraps upward", async () => {
    const wrapper = mount(PatternReel, {
      props: { items: items.slice(0, 2), selectedId: "beta" },
    });
    const reel = wrapper.element as HTMLElement;
    Object.defineProperties(reel, {
      setPointerCapture: { value: vi.fn() },
      hasPointerCapture: { value: vi.fn(() => true) },
      releasePointerCapture: { value: vi.fn() },
    });
    const identity = slotFor(wrapper, "Beta").get(".pattern-strip__identity");

    await identity.trigger("pointerdown", {
      button: 0,
      clientX: 20,
      clientY: 70,
      pointerId: 11,
    });
    await wrapper.trigger("pointermove", {
      clientX: 20,
      clientY: 20,
      pointerId: 11,
    });
    await nextTick();

    const alphaSlots = wrapper.findAll(".pattern-reel__slot").filter((slot) => (
      slot.text().includes("Alpha")
    ));
    expect(alphaSlots).toHaveLength(2);
    expect(alphaSlots.map((slot) => slot.classes())).toEqual(expect.arrayContaining([
      expect.arrayContaining(["pattern-reel__slot---1"]),
      expect.arrayContaining(["pattern-reel__slot--1", "pattern-reel__slot--active"]),
    ]));
    expect(alphaSlots.filter((slot) => slot.attributes("aria-hidden") === "true"))
      .toHaveLength(1);
    expect(alphaSlots.filter((slot) => slot.attributes("aria-hidden") === undefined))
      .toHaveLength(1);
    expect(alphaSlots.filter((slot) => slot.attributes("inert") !== undefined))
      .toHaveLength(1);
    wrapper.unmount();
  });

  it("commits cyclic keyboard selection immediately", async () => {
    const wrapper = mount(PatternReel, {
      props: { items, selectedId: "gamma" },
    });

    await wrapper.trigger("keydown", { key: "ArrowDown" });
    expect(wrapper.emitted("commit")).toEqual([["alpha", "keyboard"]]);
    expect(wrapper.classes()).toContain("pattern-reel--keyboard");
  });

  it("relays the acted-on pattern id without owning application effects", () => {
    const wrapper = mount(PatternReel, {
      props: { items, selectedId: "gamma" },
    });
    const beta = wrapper.findAllComponents(PatternStrip).find((strip) => (
      strip.props("item").id === "beta"
    ));
    if (!beta) throw new Error("Missing Beta PatternStrip");

    beta.vm.$emit("delete");
    beta.vm.$emit("copy");
    beta.vm.$emit("openStrudel");

    expect(wrapper.emitted("delete")).toEqual([["beta"]]);
    expect(wrapper.emitted("copy")).toEqual([["beta"]]);
    expect(wrapper.emitted("openStrudel")).toEqual([["beta"]]);
  });

  it("refreshes the open hold so late two-tap deletion remains completable", async () => {
    vi.useFakeTimers();
    const wrapper = mount(PatternReel, {
      props: { items, selectedId: "gamma" },
    });

    await wrapper.get('button[aria-label^="Unwind patterns around Gamma"]').trigger("click");
    vi.advanceTimersByTime(1050);
    await nextTick();
    await slotFor(wrapper, "Beta").get('button[aria-label="Delete Beta"]').trigger("click");
    await wrapper.setProps({
      items: items.map((entry) => entry.id === "beta"
        ? { ...entry, deleteArmed: true }
        : entry),
    });

    vi.advanceTimersByTime(100);
    await nextTick();
    const beta = slotFor(wrapper, "Beta");
    expect(beta.attributes("aria-hidden")).toBeUndefined();
    expect(beta.get('.pattern-strip__identity').attributes("disabled")).toBeUndefined();
    await beta.get('button[aria-label="Confirm delete Beta"]').trigger("click");

    expect(wrapper.emitted("delete")).toEqual([["beta"], ["beta"]]);
  });

  it("keeps the staged forward slot out of keyboard interaction", () => {
    const fiveItems = [...items, item("delta", "Delta"), item("epsilon", "Epsilon")];
    const wrapper = mount(PatternReel, {
      props: { items: fiveItems, selectedId: "epsilon" },
    });
    const stagedSlot = wrapper.get(".pattern-reel__slot--1");

    expect(stagedSlot.attributes("aria-hidden")).toBe("true");
    expect(stagedSlot.get(".pattern-strip__identity").attributes("disabled")).toBeDefined();
    for (const action of stagedSlot.findAll(".pattern-strip__actions button")) {
      expect(action.attributes("disabled")).toBeDefined();
    }
  });

  it("lets Reduced Motion snap the deck open without animating it", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
    const wrapper = mount(PatternReel, {
      props: { items, selectedId: "gamma" },
    });

    await wrapper.get('button[aria-label^="Unwind patterns around Gamma"]').trigger("click");
    await nextTick();
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--slot-y: -46.4px");
    expect(slotFor(wrapper, "Beta").attributes("aria-hidden")).toBeUndefined();
    expect(patternReelSource).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*transition: none;/,
    );

    vi.advanceTimersByTime(899);
    await nextTick();
    expect(slotFor(wrapper, "Beta").attributes("aria-hidden")).toBeUndefined();

    vi.advanceTimersByTime(1);
    await nextTick();
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--slot-y: -14.4px");
    expect(slotFor(wrapper, "Beta").attributes("aria-hidden")).toBe("true");
  });

  it("keeps motion local, compositor-safe, and still under Reduced Motion", () => {
    expect(patternReelSource).toMatch(
      /transition:\s*transform var\(--settle-duration\)[\s\S]*opacity var\(--settle-duration\)/,
    );
    expect(patternReelSource).not.toMatch(/transition:\s*(?:height|width|padding|margin)/);
    expect(patternReelSource).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.pattern-reel__slot\s*{[\s\S]*transition: none;/,
    );
    expect(patternReelSource).toContain("@media (forced-colors: active)");
  });

  it("keeps one predecessor visible on the shortest stage", () => {
    const shortStageRule = patternReelSource.slice(
      patternReelSource.indexOf("@media (max-height: 560px)"),
      patternReelSource.indexOf("@media (prefers-reduced-motion: reduce)"),
    );

    expect(shortStageRule).toContain("--reel-height: 97.6px");
    expect(shortStageRule).not.toContain("pattern-reel__slot--depth-1");
  });
});
