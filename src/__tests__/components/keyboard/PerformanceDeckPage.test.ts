import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import PerformanceDeckPage from "@/style-guide/PerformanceDeckPage.vue";

vi.mock("@/components/PerformanceDeck.vue", () => ({
  default: {
    name: "PerformanceDeck",
    props: ["patterns", "selectedPatternId", "patternEntrySignal", "codeStripTokens"],
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
    });
    wrapper.unmount();
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
