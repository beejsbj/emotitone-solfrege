import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Button from "@/components/primatives/Button.vue";
import buttonSource from "@/components/primatives/Button.vue?raw";
import booleanKnobSource from "@/components/primatives/Knob/BooleanKnob.vue?raw";

const { triggerUIHaptic } = vi.hoisted(() => ({ triggerUIHaptic: vi.fn() }));

vi.mock("@/utils/hapticFeedback", () => ({ triggerUIHaptic }));

describe("Button", () => {
  beforeEach(() => triggerUIHaptic.mockClear());

  it("is one native icon-only momentary control", () => {
    const wrapper = mount(Button, {
      props: { accessibleName: "Undo" },
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
    const wrapper = mount(Button, { props: { tone: "brass", size: "lg", accessibleName: "Send" } });
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(["paper-button--brass", "paper-button--brass-sheen-glow", "paper-button--lg"]),
    );
  });

  it.each(["flat", "sheen", "glow", "sheen-glow"] as const)(
    "exposes the %s brass finish",
    (brassFinish) => {
      const wrapper = mount(Button, {
        props: { tone: "brass", brassFinish, accessibleName: `${brassFinish} brass` },
      });
      expect(wrapper.classes()).toContain(`paper-button--brass-${brassFinish}`);
    },
  );

  it("renders real loading and disabled states without toggle state", () => {
    const wrapper = mount(Button, {
      props: { loading: true, disabled: true, accessibleName: "Rendering" },
    });
    expect(wrapper.attributes("aria-busy")).toBe("true");
    expect(wrapper.attributes("disabled")).toBeDefined();
    expect(wrapper.find(".paper-button__loader").exists()).toBe(true);
  });

  it("keeps disabled production brass in the native still-state contract", () => {
    const wrapper = mount(Button, {
      props: { tone: "brass", disabled: true, accessibleName: "Unavailable send" },
    });
    expect(wrapper.attributes("disabled")).toBeDefined();
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(["paper-button--brass", "paper-button--brass-sheen-glow"]),
    );
  });

  it("preserves opt-in haptics for absorbed Knob Button actions", async () => {
    const wrapper = mount(Button, { props: { haptic: true, accessibleName: "Undo" } });
    await wrapper.trigger("click");
    expect(triggerUIHaptic).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("click")).toHaveLength(1);
  });

  it("shares the promoted Boolean Knob rebound with non-brass buttons", () => {
    expect(buttonSource).toContain(
      ".paper-button:not(.paper-button--brass):not(:disabled)",
    );
    expect(buttonSource).toMatch(
      /@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*transform var\(--dur-bounce\) var\(--ease-bounce\)/,
    );
    expect(buttonSource).toContain("transform var(--dur-bounce) var(--ease-bounce)");
    expect(booleanKnobSource).toContain(
      "transition: transform var(--dur-bounce) var(--ease-bounce)",
    );
    expect(booleanKnobSource).not.toContain("elastic.out");
  });
});
