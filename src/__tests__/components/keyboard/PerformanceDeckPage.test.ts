import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import PerformanceDeckPage from "@/style-guide/PerformanceDeckPage.vue";

vi.mock("@/components/PerformanceDeck.vue", () => ({
  default: {
    name: "PerformanceDeck",
    props: ["patterns"],
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
  it("keeps copied pattern identities unique across delete and recopy", async () => {
    const wrapper = mount(PerformanceDeckPage);
    const deck = wrapper.getComponent({ name: "PerformanceDeck" });

    deck.vm.$emit("patternCopy", "after-rain");
    await wrapper.vm.$nextTick();
    const firstCopy = deck.props("patterns").find(
      (pattern: { id: string }) => pattern.id.startsWith("after-rain-copy-"),
    );

    deck.vm.$emit("patternDelete", firstCopy.id);
    deck.vm.$emit("patternCopy", "after-rain");
    await wrapper.vm.$nextTick();

    const ids = deck.props("patterns").map((pattern: { id: string }) => pattern.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(firstCopy.id);
    wrapper.unmount();
  });
});
