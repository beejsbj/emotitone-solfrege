import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PatternReel from "@/components/compounds/PatternReel.vue";
import PatternStrip from "@/components/compounds/PatternStrip.vue";
import { instrumentIconFor } from "@/components/primatives/instrumentIcon";
import type { PatternReelItem } from "@/components/compounds/PatternReel.vue";

function item(id: string, overrides: Partial<PatternReelItem> = {}): PatternReelItem {
  return {
    id,
    name: id,
    instrumentIcon: instrumentIconFor("piano"),
    instrumentLabel: "Piano",
    rootLabel: "C4",
    spine: "rgb(255, 0, 0)",
    barTape: [{ color: "rgb(255, 0, 0)", durationMs: 100 }],
    ...overrides,
  };
}

// Deepest first; the take sits at the front (last).
const items = ["library", "kept", "recent", "take"].map((id) => item(id));

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
});

afterEach(() => vi.unstubAllGlobals());

describe("PatternReel · linear", () => {
  it("does not wrap past the front or the back", async () => {
    const atFront = mount(PatternReel, { props: { items, selectedId: "take", cyclic: false } });
    await atFront.trigger("keydown", { key: "ArrowDown" });
    expect(atFront.emitted("commit")).toBeUndefined();

    const atBack = mount(PatternReel, { props: { items, selectedId: "library", cyclic: false } });
    await atBack.trigger("keydown", { key: "ArrowUp" });
    expect(atBack.emitted("commit")).toBeUndefined();
  });

  it("steps back toward older shelves", async () => {
    const wrapper = mount(PatternReel, { props: { items, selectedId: "take", cyclic: false } });
    await wrapper.trigger("keydown", { key: "ArrowUp" });
    expect(wrapper.emitted("commit")?.[0]).toEqual(["recent", "keyboard"]);
  });

  it("shows only older phrases behind the front, never the far end", () => {
    const wrapper = mount(PatternReel, { props: { items, selectedId: "take", cyclic: false } });
    const rendered = wrapper.findAll(".pattern-reel__slot").map((slot) => slot.attributes("data-pattern-id"));
    expect(rendered).toEqual(["library", "kept", "recent", "take"]);
    expect(wrapper.attributes("aria-roledescription")).toBe("pattern reel");

    const cyclic = mount(PatternReel, { props: { items, selectedId: "library" } });
    const cyclicIds = cyclic.findAll(".pattern-reel__slot").map((slot) => slot.attributes("data-pattern-id"));
    expect(cyclicIds).toContain("take");
    const linear = mount(PatternReel, { props: { items, selectedId: "library", cyclic: false } });
    const linearIds = linear.findAll(".pattern-reel__slot").map((slot) => slot.attributes("data-pattern-id"));
    expect(linearIds).toEqual(["library", "kept"]);
  });

  it("relays keep and load from a strip's data-driven actions", async () => {
    const withActions = items.map((entry) => ({
      ...entry,
      actions: [
        { kind: "keep" as const, label: `Keep ${entry.name}` },
        { kind: "load" as const, label: `Load ${entry.name}` },
      ],
    }));
    const wrapper = mount(PatternReel, { props: { items: withActions, selectedId: "recent", cyclic: false } });
    const front = wrapper.get(".pattern-reel__slot--active");
    await front.get('[data-action="keep"]').trigger("click");
    await front.get('[data-action="load"]').trigger("click");
    expect(wrapper.emitted("keep")?.[0]).toEqual(["recent"]);
    expect(wrapper.emitted("load")?.[0]).toEqual(["recent"]);
  });
});

describe("PatternStrip · shelf presentation", () => {
  it("renders the shelf tag, the record lamp, and the contour detail", () => {
    const wrapper = mount(PatternStrip, {
      props: {
        item: item("take", {
          name: "Morning",
          tone: "take",
          shelfTag: "Now",
          detail: "Do Mi Sol",
          recording: true,
          actions: [{ kind: "copy", label: "Copy Morning", disabled: true }],
        }),
        active: true,
      },
    });
    expect(wrapper.classes()).toContain("pattern-strip--tone-take");
    expect(wrapper.classes()).toContain("pattern-strip--recording");
    expect(wrapper.get('[data-testid="pattern-strip-shelf"]').text()).toBe("Now");
    expect(wrapper.find(".pattern-strip__lamp").exists()).toBe(true);
    expect(wrapper.get(".pattern-strip__detail").text()).toBe("Do Mi Sol");
    expect(wrapper.get('[data-action="copy"]').attributes("disabled")).toBeDefined();
    expect(wrapper.find('[data-action="delete"]').exists()).toBe(false);
  });

  it("keeps the default trio when no actions are given", () => {
    const wrapper = mount(PatternStrip, { props: { item: item("plain", { canDelete: true }) } });
    expect(wrapper.findAll(".pattern-strip__actions button")).toHaveLength(3);
    expect(wrapper.find(".pattern-strip__lamp").exists()).toBe(false);
  });
});
