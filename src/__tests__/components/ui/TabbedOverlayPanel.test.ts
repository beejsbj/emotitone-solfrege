import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { h } from "vue";
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
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("tracks the finger with both pages and settles onto the adjacent enabled tab", async () => {
    const wrapper = mount(TabbedOverlayPanel, {
      props: { modelValue: "blobs", tabs },
      slots: {
        default: ({ activeValue }: { activeValue: string }) => h(
          "button",
          { "data-testid": "content-action", "data-page-value": activeValue },
          activeValue,
        ),
      },
    });
    const surface = wrapper.get('[data-testid="tabbed-overlay-swipe-surface"]');
    Object.defineProperty(surface.element, "clientWidth", {
      configurable: true,
      value: 300,
    });
    const action = wrapper.get('[data-testid="content-action"]');

    await action.trigger("pointerdown", pointer(220, 120));
    await surface.trigger("pointermove", pointer(180, 122));
    await action.trigger("lostpointercapture", pointer(180, 122));
    expect(surface.classes()).toContain("tabbed-overlay-panel__swipe-surface--swiping");
    await surface.trigger("pointermove", pointer(130, 124));
    expect(surface.attributes("style")).toContain("--tabbed-overlay-swipe-x: -90px");
    expect(wrapper.get('[data-page-value="blobs"]').element.closest("[aria-hidden]")?.getAttribute("aria-hidden")).toBe("false");
    expect(wrapper.get('[data-page-value="glow"]').element.closest("[aria-hidden]")?.getAttribute("aria-hidden")).toBe("true");
    expect(wrapper.get('[data-page-value="glow"]').element.closest(".tabbed-overlay-panel__page")?.classList).toContain("tabbed-overlay-panel__page--next");
    await surface.trigger("pointerup", pointer(130, 124));

    expect(wrapper.emitted("update:modelValue")).toEqual([["glow"]]);
    expect(surface.classes()).toContain("tabbed-overlay-panel__swipe-surface--settling");
    expect(surface.attributes("style")).toContain("--tabbed-overlay-swipe-x: -300px");
    await surface.trigger("lostpointercapture", pointer(130, 124));
    expect(wrapper.emitted("update:modelValue")).toEqual([["glow"]]);
    expect(surface.classes()).toContain("tabbed-overlay-panel__swipe-surface--settling");
    await wrapper.setProps({ modelValue: "glow" });
    expect(wrapper.get('[data-page-value="glow"]').element.closest("[aria-hidden]")?.getAttribute("aria-hidden")).toBe("false");
    await wrapper.get(".tabbed-overlay-panel__page--current").trigger("transitionend", {
      propertyName: "transform",
    });
    expect(wrapper.findAll(".tabbed-overlay-panel__page")).toHaveLength(1);

    await wrapper.setProps({ modelValue: "blobs" });
    await surface.trigger("pointerdown", pointer(100, 120));
    await surface.trigger("pointermove", pointer(180, 122));
    await surface.trigger("pointerup", pointer(180, 122));

    expect(wrapper.emitted("update:modelValue")).toEqual([["glow"], ["home"]]);
  });

  it("returns both pages to rest when the swipe does not cross the threshold", async () => {
    const wrapper = mount(TabbedOverlayPanel, {
      props: { modelValue: "blobs", tabs },
      slots: {
        default: ({ activeValue }: { activeValue: string }) => h(
          "div",
          { "data-page-value": activeValue },
          activeValue,
        ),
      },
    });
    const surface = wrapper.get('[data-testid="tabbed-overlay-swipe-surface"]');
    Object.defineProperty(surface.element, "clientWidth", {
      configurable: true,
      value: 300,
    });

    await surface.trigger("pointerdown", pointer(180, 80));
    await surface.trigger("pointermove", pointer(150, 82));
    expect(wrapper.findAll(".tabbed-overlay-panel__page")).toHaveLength(2);
    await surface.trigger("pointerup", pointer(150, 82));

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(surface.classes()).toContain("tabbed-overlay-panel__swipe-surface--settling");
    expect(surface.attributes("style")).toContain("--tabbed-overlay-swipe-x: 0px");
    await wrapper.get(".tabbed-overlay-panel__page--current").trigger("transitionend", {
      propertyName: "transform",
    });
    expect(wrapper.findAll(".tabbed-overlay-panel__page")).toHaveLength(1);
    expect(wrapper.get('[data-page-value="blobs"]').exists()).toBe(true);
  });

  it("aligns a neighboring preview with a scrolled viewport and resets after commit", async () => {
    const wrapper = mount(TabbedOverlayPanel, {
      props: { modelValue: "home", tabs },
      slots: {
        default: ({ activeValue }: { activeValue: string }) => h(
          "div",
          { "data-page-value": activeValue },
          activeValue,
        ),
      },
    });
    const surface = wrapper.get('[data-testid="tabbed-overlay-swipe-surface"]');
    const scrollBody = wrapper.get(".overlay-panel-shell__body");
    Object.defineProperty(surface.element, "clientWidth", {
      configurable: true,
      value: 300,
    });
    scrollBody.element.scrollTop = 240;

    await surface.trigger("pointerdown", pointer(220, 100));
    await surface.trigger("pointermove", pointer(120, 102));
    expect((wrapper.get(".tabbed-overlay-panel__page--next").element as HTMLElement).style.insetBlockStart)
      .toBe("240px");
    await surface.trigger("pointerup", pointer(120, 102));
    await wrapper.setProps({ modelValue: "blobs" });
    await wrapper.get(".tabbed-overlay-panel__page--current").trigger("transitionend", {
      propertyName: "transform",
    });

    expect(scrollBody.element.scrollTop).toBe(0);
  });

  it("commits immediately when reduced motion is requested", async () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const wrapper = mount(TabbedOverlayPanel, {
      props: { modelValue: "home", tabs },
      slots: {
        default: ({ activeValue }: { activeValue: string }) => h("div", activeValue),
      },
    });
    const surface = wrapper.get('[data-testid="tabbed-overlay-swipe-surface"]');
    Object.defineProperty(surface.element, "clientWidth", {
      configurable: true,
      value: 300,
    });

    await surface.trigger("pointerdown", pointer(220, 100));
    await surface.trigger("pointermove", pointer(120, 102));
    await surface.trigger("pointerup", pointer(120, 102));

    expect(wrapper.emitted("update:modelValue")).toEqual([["blobs"]]);
    expect(surface.classes()).not.toContain("tabbed-overlay-panel__swipe-surface--settling");
    expect(wrapper.findAll(".tabbed-overlay-panel__page")).toHaveLength(1);
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
