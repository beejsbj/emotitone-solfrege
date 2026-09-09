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
  it("anchors Current at the bottom and collapses truthful predecessors behind it", () => {
    const wrapper = mount(PatternReel, {
      props: { items, selectedId: "gamma" },
    });

    expect(slotFor(wrapper, "Gamma").classes()).toContain("pattern-reel__slot--active");
    expect(slotFor(wrapper, "Gamma").attributes("style")).toContain("--slot-y: 0px");
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--slot-y: -18px");
    expect(slotFor(wrapper, "Alpha").attributes("style")).toContain("--slot-y: -31px");
    expect(wrapper.findAll(".bar-tape")).toHaveLength(2);
    expect(slotFor(wrapper, "Gamma").find(".bar-tape").exists()).toBe(false);
  });

  it("unwinds on Current tap, holds for 900ms, then starts the 200ms rebound collapse", async () => {
    vi.useFakeTimers();
    const wrapper = mount(PatternReel, {
      props: { items, selectedId: "gamma" },
    });

    await wrapper.get('button[aria-label^="Unwind patterns around Gamma"]').trigger("click");
    await nextTick();
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--slot-y: -58px");
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--settle-duration: 200ms");

    vi.advanceTimersByTime(1099);
    await nextTick();
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--slot-y: -58px");

    vi.advanceTimersByTime(1);
    await nextTick();
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--slot-y: -18px");
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--settle-duration: 200ms");
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

  it("keeps Reduced Motion in the fixed deck posture", async () => {
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
    expect(slotFor(wrapper, "Beta").attributes("style")).toContain("--slot-y: -18px");
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
});
