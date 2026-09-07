import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import Joystick from "@/components/primatives/Joystick.vue";
import { JOYSTICK_OPTIONS } from "@/components/primatives/joystickOptions";
import joystickSpecimenSource from "@/style-guide/primatives/PrimitiveJoystick.vue?raw";
import styleGuideSource from "@/style-guide/StyleGuide.vue?raw";

describe("Joystick", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("exposes center plus eight named directions as one keyboard-accessible state grid", () => {
    const wrapper = mount(Joystick);
    const buttons = wrapper.findAll("button");

    expect(buttons).toHaveLength(9);
    expect(buttons.map((button) => button.attributes("aria-label")))
      .toEqual(JOYSTICK_OPTIONS.map((option) => `${option.label}: ${option.description}`));
    expect(wrapper.attributes("data-latched")).toBe("auto");
    expect(buttons[4].attributes("aria-checked")).toBe("true");
    expect(buttons.filter((button) => button.attributes("tabindex") === "0"))
      .toHaveLength(1);
  });

  it("latches a tap while exposing its direction immediately for chord snapshots", async () => {
    const wrapper = mount(Joystick, { props: { modelValue: "auto" } });
    const right = wrapper.findAll("button")[5];

    await right.trigger("pointerdown", { pointerId: 1, button: 0 });
    expect(wrapper.emitted("effectiveChange")?.[0]).toEqual(["jazzy7"]);
    expect(wrapper.attributes("data-effective")).toBe("jazzy7");
    await right.trigger("pointerup", { pointerId: 1, button: 0 });

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["jazzy7"]);
  });

  it("restores the prior latch after a held momentary override", async () => {
    vi.useFakeTimers();
    const wrapper = mount(Joystick, {
      props: { modelValue: "dark", holdThreshold: 200 },
    });
    const lush = wrapper.findAll("button")[8];

    await lush.trigger("pointerdown", { pointerId: 2, button: 0 });
    await vi.advanceTimersByTimeAsync(210);
    await lush.trigger("pointerup", { pointerId: 2, button: 0 });

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("effectiveChange")).toEqual([["lush9"], ["dark"]]);
    expect(wrapper.attributes("data-effective")).toBe("dark");
  });

  it("cancels a held override on blur and unmount without changing the latch", async () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    const wrapper = mount(Joystick, { props: { modelValue: "sweet" } });
    const flip = wrapper.findAll("button")[1];
    await flip.trigger("pointerdown", { pointerId: 3, button: 0 });

    const blurListener = addEventListener.mock.calls.find(([type]) => type === "blur")
      ?.[1] as EventListener;
    blurListener(new Event("blur"));
    await wrapper.vm.$nextTick();
    expect(wrapper.attributes("data-effective")).toBe("sweet");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    await flip.trigger("pointerdown", { pointerId: 4, button: 0 });
    wrapper.unmount();
    expect(wrapper.emitted("effectiveChange")?.at(-1)).toEqual(["sweet"]);
  });

  it("moves focus spatially with arrows and latches through keyboard click", async () => {
    const wrapper = mount(Joystick, {
      props: { modelValue: "auto" },
      attachTo: document.body,
    });
    const buttons = wrapper.findAll("button");
    buttons[4].element.focus();
    await buttons[4].trigger("keydown", { key: "ArrowUp" });
    expect(document.activeElement).toBe(buttons[1].element);

    await buttons[1].trigger("click", { detail: 0 });
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["flip"]);
    wrapper.unmount();
  });

  it("has a real style-guide specimen and is not implemented as a Knob role", () => {
    expect(styleGuideSource).toContain('id="primitive-joystick"');
    expect(styleGuideSource).toContain("<PrimitiveJoystick");
    expect(joystickSpecimenSource).toContain(
      'import Joystick from "@/components/primatives/Joystick.vue"',
    );
    expect(joystickSpecimenSource).not.toContain("@/components/primatives/Knob");
  });
});
