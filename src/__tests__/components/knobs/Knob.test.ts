import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import Knob from "@/components/knobs/Knob.vue";
import knobSource from "@/components/knobs/Knob.vue?raw";

const { triggerUIHaptic } = vi.hoisted(() => ({
  triggerUIHaptic: vi.fn(),
}));

vi.mock("@/composables/useGSAP", () => ({
  default: () => ({}),
}));

vi.mock("@/utils/hapticFeedback", () => ({
  triggerUIHaptic,
}));

const roleStub = (name: string) =>
  defineComponent({
    name,
    inheritAttrs: false,
    props: {
      modelValue: [Number, String, Boolean],
      options: Array,
      visual: String,
      tone: String,
      themeColor: String,
      isDisplay: Boolean,
    },
    template: `<div :data-role="'${name}'" />`,
  });

const global = {
  stubs: {
    RangeKnob: roleStub("RangeKnob"),
    BooleanKnob: roleStub("BooleanKnob"),
    OptionsKnob: roleStub("OptionsKnob"),
    ButtonKnob: roleStub("ButtonKnob"),
  },
};

describe("production Knob contracts", () => {
  let wrappers: VueWrapper[] = [];

  const render = (props: Record<string, unknown> = {}, attachTo?: HTMLElement) => {
    const wrapper = mount(Knob, { props, global, attachTo });
    wrappers.push(wrapper);
    return wrapper;
  };

  beforeEach(() => {
    triggerUIHaptic.mockClear();
  });

  afterEach(() => {
    for (const wrapper of wrappers) wrapper.unmount();
    wrappers = [];
    document.body.innerHTML = "";
  });

  it("preserves value precedence, role inference, compact anatomy, and bottom label", () => {
    const legacy = render({ value: 42, label: "Legacy" });
    expect(legacy.getComponent({ name: "RangeKnob" }).props("modelValue")).toBe(42);
    expect(legacy.classes()).toEqual(expect.arrayContaining(["knob-wrapper", "max-w-12"]));
    expect(legacy.get("label").text()).toBe("Legacy");
    expect(legacy.find(".knob-primitive__label").exists()).toBe(false);

    const preferred = render({ modelValue: 7, value: 42 });
    expect(preferred.getComponent({ name: "RangeKnob" }).props("modelValue")).toBe(7);

    expect(
      render({ modelValue: false }).findComponent({ name: "BooleanKnob" }).exists(),
    ).toBe(true);
    expect(
      render({ modelValue: 1, min: 0, max: 1, step: 1 })
        .findComponent({ name: "BooleanKnob" })
        .exists(),
    ).toBe(true);
    expect(
      render({ modelValue: "SQ", options: ["SIN", "SQ"] })
        .findComponent({ name: "OptionsKnob" })
        .exists(),
    ).toBe(true);
    expect(
      render({ type: "button" }).findComponent({ name: "ButtonKnob" }).exists(),
    ).toBe(true);
  });

  it("adds treatment props without changing explicit color compatibility", () => {
    const brass = render({
      modelValue: 64,
      visual: "ring",
      tone: "brass",
    }).getComponent({ name: "RangeKnob" });

    expect(brass.props()).toMatchObject({
      visual: "ring",
      tone: "brass",
      themeColor: "var(--brass, #e0a93a)",
    });

    const custom = render({
      modelValue: 64,
      visual: "arc",
      tone: "brass",
      themeColor: "hotpink",
    }).getComponent({ name: "RangeKnob" });
    expect(custom.props("themeColor")).toBe("hotpink");
  });

  it("emits both current and deprecated updates for boolean taps", async () => {
    const wrapper = render({ modelValue: false, type: "boolean" });

    await wrapper.trigger("click");

    expect(wrapper.emitted("update:modelValue")).toEqual([[true]]);
    expect(wrapper.emitted("update:value")).toEqual([[true]]);
    expect(triggerUIHaptic).toHaveBeenCalledTimes(1);
  });

  it("advances and wraps real string options on tap", async () => {
    const wrapper = render({
      modelValue: "SAW",
      type: "options",
      options: ["SIN", "TRI", "SAW"],
    });

    await wrapper.trigger("click");

    expect(wrapper.emitted("update:modelValue")).toEqual([["SIN"]]);
    expect(wrapper.emitted("update:value")).toEqual([["SIN"]]);
  });

  it("hands horizontal gestures to the production action scroller", async () => {
    const scrollHost = document.createElement("div");
    scrollHost.className = "action-scroll";
    scrollHost.scrollLeft = 40;
    document.body.append(scrollHost);
    const wrapper = render({ modelValue: 50, type: "range" }, scrollHost);

    wrapper.element.dispatchEvent(
      new MouseEvent("mousedown", { clientX: 100, clientY: 100, bubbles: true }),
    );
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 130, clientY: 102, bubbles: true }),
    );
    document.dispatchEvent(
      new MouseEvent("mouseup", { clientX: 130, clientY: 102, bubbles: true }),
    );

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(knobSource).toContain("absX > absY * 1.15");
    expect(knobSource).toContain(
      "scrollHost.scrollLeft = interaction.start.value.scrollLeft - deltaFromStartX",
    );
  });

  it("keeps disabled and display modes pointer-inert", async () => {
    const disabled = render({ modelValue: false, type: "boolean", isDisabled: true });
    expect(disabled.classes()).toContain("pointer-events-none");
    await disabled.trigger("click");
    expect(disabled.emitted("update:modelValue")).toBeUndefined();

    const display = render({ modelValue: 4, type: "range", isDisplay: true });
    expect(display.classes()).toContain("pointer-events-none");
    expect(display.getComponent({ name: "RangeKnob" }).props("isDisplay")).toBe(true);
  });
});
