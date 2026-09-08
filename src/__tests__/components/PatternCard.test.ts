import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import PatternCard from "@/components/compounds/PatternCard.vue";
import patternCardSource from "@/components/compounds/PatternCard.vue?raw";
import productionPatternCardSource from "@/components/patterns/PatternCard.vue?raw";
import specimenSource from "@/style-guide/compounds/CompoundPatternCard.vue?raw";

vi.mock("@/components/uniques/CodeStrip/index.vue", () => ({
  default: {
    name: "CodeStrip",
    props: ["source"],
    template: '<div class="code-strip-stub">{{ source }}</div>',
  },
}));

const baseProps = {
  label: "Pattern 01 — Piano / C Major",
  ordinal: "01",
  name: "Twinkle Twinkle Little Star",
  metadata: "14 notes",
};

describe("PatternCard", () => {
  it("renders the collapsed Card with metadata and Bar Tape", async () => {
    const wrapper = mount(PatternCard, {
      props: {
        ...baseProps,
        barTape: [
          { color: "rgb(255, 0, 0)", durationMs: 100 },
          { color: "rgb(0, 255, 0)", durationMs: 200 },
        ],
      },
    });

    expect(wrapper.element.tagName).toBe("BUTTON");
    expect(wrapper.find(".system-card__label").text()).toBe(baseProps.label);
    expect(wrapper.find(".pattern-card__ordinal").text()).toBe("01");
    expect(wrapper.find(".pattern-card__meta").text()).toBe(baseProps.metadata);
    expect(wrapper.findAll(".bar-tape__segment")).toHaveLength(2);
    expect(wrapper.find(".pattern-card__code-strip").exists()).toBe(false);
    expect(wrapper.find(".pattern-card__actions").exists()).toBe(false);

    await wrapper.trigger("click");
    expect(wrapper.emitted("select")).toHaveLength(1);
  });

  it("replaces Bar Tape with CodeStrip and the three accepted actions when expanded", async () => {
    const wrapper = mount(PatternCard, {
      props: {
        ...baseProps,
        state: "expanded",
        codeSource: 'note("<0 1 2>")',
      },
    });

    expect(wrapper.element.tagName).toBe("ARTICLE");
    expect(wrapper.find(".bar-tape").exists()).toBe(false);
    expect(wrapper.find(".code-strip-stub").text()).toBe('note("<0 1 2>")');
    expect(wrapper.text()).not.toContain("Active · Strudel");

    const actions = wrapper.findAll(".pattern-card__actions button");
    expect(actions.map((action) => action.attributes("aria-label"))).toEqual([
      "Delete pattern",
      "Copy Strudel code",
      "Open in Strudel",
    ]);

    await actions[0].trigger("click");
    await actions[1].trigger("click");
    await actions[2].trigger("click");
    expect(wrapper.emitted("delete")).toHaveLength(1);
    expect(wrapper.emitted("copy")).toHaveLength(1);
    expect(wrapper.emitted("openStrudel")).toHaveLength(1);
  });

  it("keeps library deletion unavailable and exposes copied feedback", () => {
    const wrapper = mount(PatternCard, {
      props: {
        ...baseProps,
        state: "expanded",
        canDelete: false,
        copied: true,
      },
    });

    const actions = wrapper.findAll(".pattern-card__actions button");
    expect(actions[0].attributes("disabled")).toBeDefined();
    expect(actions[0].attributes("aria-label")).toBe("Default patterns cannot be deleted");
    expect(actions[1].attributes("aria-label")).toBe("Copied");
  });

  it("turns Delete into an explicit second-tap confirmation", () => {
    const wrapper = mount(PatternCard, {
      props: {
        ...baseProps,
        state: "expanded",
        deleteArmed: true,
      },
    });

    const deleteButton = wrapper.find(".pattern-card__actions button");
    expect(deleteButton.attributes("aria-label")).toBe("Confirm delete pattern");
    expect(deleteButton.find("svg").exists()).toBe(true);
  });

  it("has one authoritative seam across the guide and production adapter", () => {
    expect(patternCardSource).toContain('import Card from "../primatives/Card.vue"');
    expect(patternCardSource).toContain('import BarTape from "../primatives/BarTape.vue"');
    expect(patternCardSource).toContain('import Button from "../primatives/Button.vue"');
    expect(patternCardSource).toContain('import CodeStrip from "../uniques/CodeStrip/index.vue"');
    expect(specimenSource).toContain(
      'import PatternCard from "../../components/compounds/PatternCard.vue"',
    );
    expect(productionPatternCardSource).toContain(
      'import PatternCard from "@/components/compounds/PatternCard.vue"',
    );
    expect(productionPatternCardSource).not.toContain("window.confirm");
  });
});
