import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import PerformanceDeckPage from "@/style-guide/PerformanceDeckPage.vue";
import styleGuideSource from "@/style-guide/StyleGuide.vue?raw";

vi.mock("@/components/PerformanceDeck.vue", () => ({
  default: {
    name: "PerformanceDeck",
    props: [
      "patterns",
      "selectedPatternId",
      "patternEntrySignal",
      "codeStripTokens",
      "keyValue",
      "modeValue",
      "bpm",
      "octave",
      "rowCount",
    ],
    emits: [
      "patternCopy",
      "patternDelete",
      "patternRename",
      "patternCommit",
      "patternOpenStrudel",
      "togglePlayback",
      "backspace",
      "return",
      "rowCountChange",
      "keyboardPress",
      "keyboardRelease",
      "chordPress",
      "chordRelease",
      "harmonyEffective",
      "update:drawerOpen",
      "update:keyValue",
      "update:modeValue",
      "update:bpm",
      "update:octave",
      "update:harmonyValue",
    ],
    template: '<div data-testid="performance-deck" />',
  },
}));

describe("PerformanceDeck guide fixtures", () => {
  it("registers PerformanceDeck in the Compositions sink section", () => {
    const compositions = styleGuideSource.indexOf('id="compositions-heading"');
    const performanceDeck = styleGuideSource.indexOf('id="composition-performance-deck"');

    expect(compositions).toBeGreaterThan(-1);
    expect(performanceDeck).toBeGreaterThan(compositions);
  });

  it("models Return as a saved take plus an entering empty Current Take", async () => {
    const wrapper = mount(PerformanceDeckPage);
    const deck = wrapper.getComponent({ name: "PerformanceDeck" });

    expect(deck.props("patternEntrySignal")).toBe(0);
    deck.vm.$emit("patternCommit", "after-rain", "tap");
    await wrapper.vm.$nextTick();
    expect(deck.props("selectedPatternId")).toBe("after-rain");

    deck.vm.$emit("return");
    await wrapper.vm.$nextTick();

    expect(deck.props("patternEntrySignal")).toBe(1);
    expect(deck.props("selectedPatternId")).toBe("current");
    expect(deck.props("codeStripTokens")).toEqual([]);
    expect(deck.props("patterns").at(-2)).toMatchObject({
      id: "take-1",
      name: "Take 1",
      canDelete: true,
      canRename: true,
    });
    expect(deck.props("patterns").at(-1)).toMatchObject({
      id: "current",
      name: "Current Take",
      barTape: [],
      codeStripTokens: [],
      canCopy: false,
    });
    wrapper.unmount();
  });

  it("loads each selected fixture's CodeStrip and musical context", async () => {
    const wrapper = mount(PerformanceDeckPage);
    const deck = wrapper.getComponent({ name: "PerformanceDeck" });

    deck.vm.$emit("patternCommit", "after-rain", "tap");
    await wrapper.vm.$nextTick();

    expect(deck.props("selectedPatternId")).toBe("after-rain");
    expect(deck.props("codeStripTokens")).toMatchObject([
      { type: "note", rawPitch: "F#4" },
      { type: "note", rawPitch: "A4" },
      { type: "note", rawPitch: "C#5" },
    ]);
    expect(deck.props("keyValue")).toBe("F#");
    expect(deck.props("modeValue")).toBe("dorian");
    expect(deck.props("bpm")).toBe(92);
    expect(deck.props("octave")).toBe(4);
  });

  it("clears Current when an emptied loaded fixture starts a new take", async () => {
    const wrapper = mount(PerformanceDeckPage);
    const deck = wrapper.getComponent({ name: "PerformanceDeck" });

    deck.vm.$emit("patternCommit", "after-rain", "tap");
    await wrapper.vm.$nextTick();
    for (let event = 0; event < 3; event += 1) deck.vm.$emit("backspace");
    deck.vm.$emit("return");
    await wrapper.vm.$nextTick();

    expect(deck.props("selectedPatternId")).toBe("current");
    expect(deck.props("codeStripTokens")).toEqual([]);
    expect(deck.props("patterns").at(-1)).toMatchObject({
      id: "current",
      barTape: [],
      codeStripTokens: [],
      canCopy: false,
    });
  });

  it("keeps copied pattern identities unique across delete and recopy", async () => {
    const wrapper = mount(PerformanceDeckPage);
    const deck = wrapper.getComponent({ name: "PerformanceDeck" });

    deck.vm.$emit("patternCopy", "after-rain");
    await wrapper.vm.$nextTick();
    const firstCopy = deck.props("patterns").find(
      (pattern: { id: string }) => pattern.id.startsWith("after-rain-copy-"),
    );

    deck.vm.$emit("patternDelete", firstCopy.id);
    await wrapper.vm.$nextTick();
    deck.vm.$emit("patternDelete", firstCopy.id);
    deck.vm.$emit("patternCopy", "after-rain");
    await wrapper.vm.$nextTick();

    const ids = deck.props("patterns").map((pattern: { id: string }) => pattern.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(firstCopy.id);
    wrapper.unmount();
  });

  it("does not copy an armed deletion state", async () => {
    const wrapper = mount(PerformanceDeckPage);
    const deck = wrapper.getComponent({ name: "PerformanceDeck" });

    deck.vm.$emit("patternDelete", "after-rain");
    await wrapper.vm.$nextTick();
    expect(deck.props("patterns").find(
      (pattern: { id: string }) => pattern.id === "after-rain",
    )).toMatchObject({ deleteArmed: true });

    deck.vm.$emit("patternCopy", "after-rain");
    await wrapper.vm.$nextTick();
    const copy = deck.props("patterns").find(
      (pattern: { id: string }) => pattern.id.startsWith("after-rain-copy-"),
    );
    expect(copy).toMatchObject({ deleteArmed: false });
  });

  it("drives the controlled row-count target from the specimen selector", async () => {
    const wrapper = mount(PerformanceDeckPage);
    const deck = wrapper.getComponent({ name: "PerformanceDeck" });

    await wrapper.get("select").setValue("5");

    expect(deck.props("rowCount")).toBe(5);
  });

  it("keeps first-tap deletion armed and accepts predecessor-first confirmation", async () => {
    const wrapper = mount(PerformanceDeckPage);
    const deck = wrapper.getComponent({ name: "PerformanceDeck" });

    deck.vm.$emit("patternCommit", "late-train", "tap");
    deck.vm.$emit("patternDelete", "late-train");
    await wrapper.vm.$nextTick();

    expect(deck.props("selectedPatternId")).toBe("late-train");
    expect(deck.props("patterns").find(
      (pattern: { id: string }) => pattern.id === "late-train",
    )).toMatchObject({ deleteArmed: true });

    deck.vm.$emit("patternCommit", "after-rain", "tap");
    deck.vm.$emit("patternDelete", "late-train");
    await wrapper.vm.$nextTick();

    expect(deck.props("selectedPatternId")).toBe("after-rain");
    expect(deck.props("patterns").some(
      (pattern: { id: string }) => pattern.id === "late-train",
    )).toBe(false);
    wrapper.unmount();
  });
});
