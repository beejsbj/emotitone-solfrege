import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import PresetRow from "@/components/compounds/PresetRow.vue";

describe("PresetRow", () => {
  it("composes kicker, name, and action behavior", async () => {
    const wrapper = mount(PresetRow, {
      props: {
        tone: "tomato",
        kicker: "Soft Glass",
        name: "Soft Glass.",
        actionLabel: "Apply",
      },
    });

    expect(wrapper.classes()).toContain("preset-row--tone-tomato");
    expect(wrapper.find(".kicker").text()).toContain("Soft Glass");
    expect(wrapper.find(".preset-row__name").text()).toBe("Soft Glass.");

    await wrapper.get(".preset-row__button").trigger("click");
    expect(wrapper.emitted("action")).toHaveLength(1);
  });

  it("renders status metadata without an action button", () => {
    const wrapper = mount(PresetRow, {
      props: {
        tone: "plum",
        kicker: "Ambient",
        name: "Ambient.",
        meta: "Applied",
      },
    });

    expect(wrapper.find(".preset-row__meta").text()).toBe("Applied");
    expect(wrapper.find(".preset-row__button").exists()).toBe(false);
  });
});
