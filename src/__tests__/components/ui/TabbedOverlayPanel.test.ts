import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import TabbedOverlayPanel from "@/components/TabbedOverlayPanel.vue";

const tabs = [
  { value: "home", label: "Home", shortLabel: "Home" },
  { value: "blobs", label: "Blobs", shortLabel: "Blobs" },
  { value: "off", label: "Unavailable", shortLabel: "Off", disabled: true },
  { value: "glow", label: "Glow", shortLabel: "Glow" },
];

const pointer = (x: number, y: number) => ({
  pointerId: 4,
  pointerType: "touch",
  isPrimary: true,
  clientX: x,
  clientY: y,
});

describe("TabbedOverlayPanel swipe navigation", () => {
  afterEach(() => vi.useRealTimers());

  it("moves between enabled tabs with a dominant horizontal content swipe", async () => {
    const wrapper = mount(TabbedOverlayPanel, {
      props: { modelValue: "blobs", tabs },
      slots: { default: '<button data-testid="content-action">Content</button>' },
    });
    const surface = wrapper.get('[data-testid="tabbed-overlay-swipe-surface"]');
    const action = wrapper.get('[data-testid="content-action"]');

    await action.trigger("pointerdown", pointer(220, 120));
    await surface.trigger("pointermove", pointer(180, 122));
    await action.trigger("lostpointercapture", pointer(180, 122));
    expect(surface.classes()).toContain("tabbed-overlay-panel__swipe-surface--swiping");
    await surface.trigger("pointermove", pointer(130, 124));
    await surface.trigger("pointerup", pointer(130, 124));

    expect(wrapper.emitted("update:modelValue")).toEqual([["glow"]]);

    await wrapper.setProps({ modelValue: "blobs" });
    await surface.trigger("pointerdown", pointer(100, 120));
    await surface.trigger("pointermove", pointer(180, 122));
    await surface.trigger("pointerup", pointer(180, 122));

    expect(wrapper.emitted("update:modelValue")).toEqual([["glow"], ["home"]]);
  });

  it("leaves vertical scrolling and Knob gestures alone", async () => {
    const wrapper = mount(TabbedOverlayPanel, {
      props: { modelValue: "blobs", tabs },
      slots: { default: '<div class="knob-wrapper" data-testid="knob"><span /></div>' },
    });
    const surface = wrapper.get('[data-testid="tabbed-overlay-swipe-surface"]');

    await surface.trigger("pointerdown", pointer(180, 80));
    await surface.trigger("pointermove", pointer(170, 170));
    await surface.trigger("pointerup", pointer(170, 170));

    await wrapper.get('[data-testid="knob"]').trigger("pointerdown", pointer(220, 120));
    await surface.trigger("pointermove", pointer(120, 124));
    await surface.trigger("pointerup", pointer(120, 124));

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});
