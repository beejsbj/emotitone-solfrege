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
  instrumentLabel: "Rhodes",
  rootLabel: "F#4",
  spine: "rgb(255, 0, 0)",
  barTape: [
    { color: "rgb(255, 0, 0)", durationMs: 100 },
    { color: "rgb(0, 255, 0)", durationMs: 200 },
  ],
  canDelete: true,
  canRename: true,
};

describe("PatternStrip", () => {
  it("renders the accepted 51.2px Ink row with spine, top Bar Tape, and actions", () => {
    const wrapper = mount(PatternStrip, { props: { item } });

    expect(wrapper.element.tagName).toBe("ARTICLE");
    expect(wrapper.attributes("style")).toContain("--pattern-strip-spine: rgb(255, 0, 0)");
    expect(wrapper.get(".pattern-strip__identity").attributes("aria-label"))
      .toBe("Select Evening Glass, root F#4");
    expect(wrapper.get(".pattern-strip__identity small").text()).toBe("Rhodes");
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

  it("keeps the 1px Bar Tape present when a strip becomes Current", async () => {
    const wrapper = mount(PatternStrip, {
      props: {
        item: { ...item, copied: true, deleteArmed: true },
        active: true,
      },
    });

    const tapeElement = wrapper.get(".bar-tape").element;
    expect(wrapper.get(".bar-tape").attributes("aria-hidden")).toBeUndefined();
    expect(wrapper.get(".pattern-strip__identity").attributes("aria-label"))
      .toBe("Unwind patterns around Evening Glass, root F#4");
    await wrapper.setProps({ active: false });
    expect(wrapper.get(".bar-tape").element).toBe(tapeElement);
    expect(wrapper.get(".bar-tape").attributes("aria-hidden")).toBeUndefined();
    expect(patternStripSource).not.toContain('v-if="!active"');
    expect(patternStripSource).toMatch(
      /\.pattern-strip__tape\s*{[\s\S]*position: absolute;[\s\S]*inset: 0 0 auto 4px;/,
    );
    expect(patternStripSource).not.toContain(".pattern-strip--active .pattern-strip__tape");
    expect(patternStripSource).not.toContain("transition: opacity");
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

  it("renames the selected pattern inline on double-tap or F2", async () => {
    const wrapper = mount(PatternStrip, { props: { item, active: true } });

    await wrapper.get(".pattern-strip__identity").trigger("dblclick");
    const input = wrapper.get<HTMLInputElement>(".pattern-strip__rename input");
    expect(input.attributes("aria-label")).toBe("Rename Evening Glass");
    await input.setValue("Blue Hour");
    await input.trigger("blur");

    expect(wrapper.emitted("rename")).toEqual([["Blue Hour"]]);

    await wrapper.get(".pattern-strip__identity").trigger("keydown", { key: "F2" });
    expect(wrapper.find(".pattern-strip__rename input").exists()).toBe(true);
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
    expect(reelSpecimenSource.match(/@rename=/g)).toHaveLength(4);
    expect(stripSpecimenSource.match(/@select=/g)).toHaveLength(5);
    expect(stripSpecimenSource.match(/@delete=/g)).toHaveLength(5);
    expect(stripSpecimenSource.match(/@copy=/g)).toHaveLength(5);
    expect(stripSpecimenSource.match(/@open-strudel=/g)).toHaveLength(5);
    expect(stripSpecimenSource.match(/@rename=/g)).toHaveLength(5);
  });
});
