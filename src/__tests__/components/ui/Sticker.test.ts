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

  it.each([
    ["before", ["mark", "sticker__marked-text"]],
    ["after", ["sticker__marked-text", "mark"]],
  ] as const)("places an optional Mark %s the text", (markPosition, expectedOrder) => {
    const wrapper = mount(Sticker, {
      props: {
        variant: "fill",
        color: "tomato",
        mark: "eighth",
        markPosition,
      },
      slots: {
        default: "Live",
      },
    });

    expect(wrapper.classes()).toContain("sticker--marked");
    expect(wrapper.find("svg.mark").attributes("data-mark")).toBe("eighth");
    expect(wrapper.find("svg.mark").classes()).toContain("mark--tone-inherit");
    expect(wrapper.element.children).toHaveLength(2);
    expect(Array.from(wrapper.element.children).map((child) => child.classList[0])).toEqual(expectedOrder);
  });
});
