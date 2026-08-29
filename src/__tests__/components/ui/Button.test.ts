import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Button from "@/components/primatives/Button.vue";

const { triggerUIHaptic } = vi.hoisted(() => ({ triggerUIHaptic: vi.fn() }));

vi.mock("@/utils/hapticFeedback", () => ({ triggerUIHaptic }));

describe("Button", () => {
  beforeEach(() => triggerUIHaptic.mockClear());

  it("is one native icon-only momentary control", () => {
    const wrapper = mount(Button, {
      props: { ariaLabel: "Undo" },
      slots: { default: '<svg data-testid="icon" />' },
    });

    expect(wrapper.element.tagName).toBe("BUTTON");
    expect(wrapper.attributes("type")).toBe("button");
    expect(wrapper.attributes("aria-label")).toBe("Undo");
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(["paper-button", "paper-button--md", "paper-button--ink"]),
    );
    expect(wrapper.find('[data-testid="icon"]').exists()).toBe(true);
    expect(wrapper.attributes("aria-pressed")).toBeUndefined();
  });

  it("exposes accepted paper materials and named sizes", () => {
    const wrapper = mount(Button, { props: { tone: "brass", size: "lg", ariaLabel: "Send" } });
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(["paper-button--brass", "paper-button--lg"]),
    );
  });

  it("renders real loading and disabled states without toggle state", () => {
    const wrapper = mount(Button, {
      props: { loading: true, disabled: true, ariaLabel: "Rendering" },
    });
    expect(wrapper.attributes("aria-busy")).toBe("true");
    expect(wrapper.attributes("disabled")).toBeDefined();
    expect(wrapper.find(".paper-button__loader").exists()).toBe(true);
  });

  it("preserves opt-in haptics for absorbed Knob Button actions", async () => {
    const wrapper = mount(Button, { props: { haptic: true, ariaLabel: "Undo" } });
    await wrapper.trigger("click");
    expect(triggerUIHaptic).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("click")).toHaveLength(1);
  });
});
