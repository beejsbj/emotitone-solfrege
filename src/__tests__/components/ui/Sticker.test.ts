import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import Sticker from "@/components/primatives/Sticker.vue";

describe("Sticker", () => {
  it("applies the shared color vocabulary to badge variants", () => {
    const wrapper = mount(Sticker, {
      props: {
        variant: "badge",
        color: "tomato",
      },
      slots: {
        default: "Alert",
      },
    });

    expect(wrapper.classes()).toContain("sticker--badge");
    expect(wrapper.classes()).toContain("sticker--color-tomato");
    expect(wrapper.find(".sticker__badge-edge").exists()).toBe(true);
    expect(wrapper.find(".sticker__badge-text").text()).toBe("Alert");
    expect(wrapper.attributes("style")).toBeUndefined();
  });
});
