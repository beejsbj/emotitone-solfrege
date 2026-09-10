import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PatternStrip from "@/components/compounds/PatternStrip.vue";
import patternStripSource from "@/components/compounds/PatternStrip.vue?raw";
import patternReelSource from "@/components/compounds/PatternReel.vue?raw";
import patternListSource from "@/components/patterns/PatternList.vue?raw";
import stripSpecimenSource from "@/style-guide/compounds/CompoundPatternStrip.vue?raw";
import reelSpecimenSource from "@/style-guide/compounds/CompoundPatternReel.vue?raw";
import type { PatternStripItem } from "@/components/compounds/PatternStrip.vue";

const item: PatternStripItem = {
  id: "evening-glass",
  name: "Evening Glass",
  rootLabel: "F#4",
  spine: "rgb(255, 0, 0)",
  barTape: [
    { color: "rgb(255, 0, 0)", durationMs: 100 },
    { color: "rgb(0, 255, 0)", durationMs: 200 },
  ],
  canDelete: true,
};

describe("PatternStrip", () => {
  it("renders the accepted 51.2px Ink row with spine, top Bar Tape, and actions", () => {
    const wrapper = mount(PatternStrip, { props: { item } });

    expect(wrapper.element.tagName).toBe("ARTICLE");
    expect(wrapper.attributes("style")).toContain("--pattern-strip-spine: rgb(255, 0, 0)");
    expect(wrapper.get(".pattern-strip__identity").attributes("aria-label"))
      .toBe("Select Evening Glass, root F#4");
    expect(wrapper.findAll(".bar-tape__segment")).toHaveLength(2);
    expect(wrapper.find(".pattern-strip__tape").exists()).toBe(true);
    expect(wrapper.findAll(".pattern-strip__actions button").map((button) => (
      button.attributes("aria-label")
    ))).toEqual([
      "Delete Evening Glass",
      "Copy Evening Glass Strudel code",
      "Open Evening Glass in Strudel",
    ]);
    expect(patternStripSource).toContain("height: 51.2px");
    expect(patternStripSource).toContain("min-height: 51.2px");
    expect(patternStripSource).toContain("background: var(--ink)");
    expect(patternStripSource).not.toMatch(/PatternCard|<Card|notch|metadata|CodeStrip/);
    expect(patternStripSource).toContain("@media (forced-colors: active)");
  });

  it("omits Bar Tape only for Current and exposes action feedback", () => {
    const wrapper = mount(PatternStrip, {
      props: {
        item: { ...item, copied: true, deleteArmed: true },
        active: true,
      },
    });

    expect(wrapper.find(".bar-tape").exists()).toBe(false);
    expect(wrapper.get(".pattern-strip__identity").attributes("aria-label"))
      .toBe("Unwind patterns around Evening Glass, root F#4");
    expect(wrapper.findAll(".pattern-strip__actions button").map((button) => (
      button.attributes("aria-label")
    ))).toEqual([
      "Confirm delete Evening Glass",
      "Copied Evening Glass",
      "Open Evening Glass in Strudel",
    ]);
  });

  it("emits identity and action intent without owning effects", async () => {
    const wrapper = mount(PatternStrip, { props: { item } });
    await wrapper.get(".pattern-strip__identity").trigger("click");
    const actions = wrapper.findAll(".pattern-strip__actions button");
    await actions[0].trigger("click");
    await actions[1].trigger("click");
    await actions[2].trigger("click");

    expect(wrapper.emitted("select")).toHaveLength(1);
    expect(wrapper.emitted("delete")).toHaveLength(1);
    expect(wrapper.emitted("copy")).toHaveLength(1);
    expect(wrapper.emitted("openStrudel")).toHaveLength(1);
  });

  it("keeps default-pattern deletion unavailable", () => {
    const wrapper = mount(PatternStrip, {
      props: { item: { ...item, canDelete: false } },
    });

    const deleteButton = wrapper.get('.pattern-strip__actions button[aria-label="Default pattern Evening Glass cannot be deleted"]');
    expect(deleteButton.attributes("disabled")).toBeDefined();
  });

  it("names and disables unavailable sharing actions", () => {
    const wrapper = mount(PatternStrip, {
      props: {
        item: {
          ...item,
          canCopy: false,
          canOpenStrudel: false,
          copyUnavailableLabel: "Record notes before copying Evening Glass",
          openUnavailableLabel: "Record notes before opening Evening Glass in Strudel",
        },
      },
    });

    const copy = wrapper.get('button[aria-label="Record notes before copying Evening Glass"]');
    const open = wrapper.get(
      'button[aria-label="Record notes before opening Evening Glass in Strudel"]',
    );
    expect(copy.attributes("disabled")).toBeDefined();
    expect(open.attributes("disabled")).toBeDefined();
  });

  it("crosses one authoritative seam in production and both real guide specimens", () => {
    expect(patternReelSource).toContain('import PatternStrip from "./PatternStrip.vue"');
    expect(patternListSource).toContain(
      'import PatternReel from "@/components/compounds/PatternReel.vue"',
    );
    expect(stripSpecimenSource).toContain(
      'import PatternStrip from "../../components/compounds/PatternStrip.vue"',
    );
    expect(reelSpecimenSource).toContain(
      'import PatternReel from "../../components/compounds/PatternReel.vue"',
    );
    expect(reelSpecimenSource.match(/@delete=/g)).toHaveLength(4);
    expect(reelSpecimenSource.match(/@copy=/g)).toHaveLength(4);
    expect(reelSpecimenSource.match(/@open-strudel=/g)).toHaveLength(4);
  });
});
