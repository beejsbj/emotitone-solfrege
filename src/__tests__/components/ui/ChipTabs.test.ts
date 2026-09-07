import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { markRaw } from "vue";
import ChipTabs from "@/components/primatives/ChipTabs.vue";

const TestIcon = markRaw({ template: "<svg />" });

const tabs = [
  { label: "All Sounds", shortLabel: "All", value: "all", testId: "tab-all" },
  {
    label: "Keyboards",
    shortLabel: "Keys",
    value: "keys",
    testId: "tab-keys",
    icon: TestIcon,
  },
  { label: "Unavailable", value: "off", disabled: true },
];

describe("ChipTabs", () => {
  it("emits selection through the authoritative chip surface", async () => {
    const wrapper = mount(ChipTabs, {
      props: { tabs, modelValue: "all", layout: "scroll" },
    });

    expect(wrapper.classes()).toContain("chip-tabs--layout-scroll");
    expect(wrapper.get('[data-testid="tab-all"]').attributes("tabindex")).toBe("0");
    expect(wrapper.get('[data-testid="tab-keys"]').attributes("tabindex")).toBe("-1");
    expect(wrapper.get('[data-testid="tab-keys"]').attributes("aria-label")).toBe("Keyboards");

    await wrapper.get('[data-testid="tab-keys"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["keys"]]);
  });

  it("keeps disabled destinations inert and pins explicit guide variants", async () => {
    const wrapper = mount(ChipTabs, {
      props: { tabs, defaultValue: "all", geometry: "rip", tone: "brass" },
    });

    expect(wrapper.classes()).toContain("chip-tabs--geometry-rip");
    expect(wrapper.classes()).toContain("chip-tabs--tone-brass");
    await wrapper.get('button:disabled').trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});
