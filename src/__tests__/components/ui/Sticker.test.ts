import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import Sticker from "@/components/primatives/Sticker.vue";

describe("Sticker", () => {
  it("applies the Brass Badge treatment without randomized geometry", () => {
    const wrapper = mount(Sticker, {
      props: {
        variant: "badge",
        color: "brass-sheen",
      },
      slots: {
        default: "Alert",
      },
    });

    expect(wrapper.classes()).toContain("sticker--badge");
    expect(wrapper.classes()).toContain("sticker--color-brass-sheen");
    expect(wrapper.find(".sticker__badge-edge").exists()).toBe(true);
    expect(wrapper.find(".sticker__badge-text").text()).toBe("Alert");
    expect(wrapper.attributes("style")).toBeUndefined();
  });

  it("supports the Ivory Badge material used for committed joystick latches", () => {
    const wrapper = mount(Sticker, {
      props: {
        variant: "badge",
        color: "ivory",
      },
      slots: {
        default: "Dark",
      },
    });

    expect(wrapper.classes()).toContain("sticker--badge");
    expect(wrapper.classes()).toContain("sticker--color-ivory");
    expect(wrapper.find(".sticker__badge-edge").exists()).toBe(true);
    expect(wrapper.find(".sticker__badge-text").text()).toBe("Dark");
  });
});
