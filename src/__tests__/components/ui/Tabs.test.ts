import { afterEach, describe, expect, it, vi } from "vitest";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { defineComponent, h, markRaw, nextTick, ref } from "vue";
import Tabs from "@/components/primatives/Tabs.vue";
import { TABS_EDITIONS } from "@/components/primatives/TabsEdition";
import tabsSource from "@/components/primatives/Tabs.vue?raw";
import TabsPage from "@/style-guide/TabsPage.vue";

const TestIcon = markRaw({ template: "<svg />" });

enableAutoUnmount(afterEach);

const tabs = [
  { label: "Keyboards", shortLabel: "Keys", value: "keys", testId: "tab-keys" },
  {
    label: "Mallets",
    shortLabel: "Mallets",
    value: "mallets",
    testId: "tab-mallets",
    icon: TestIcon,
  },
  { label: "Unavailable", value: "off", disabled: true },
];

const keyboardTabs = [
  { label: "Unavailable first", value: "off-first", disabled: true },
  ...tabs,
  { label: "Presets", value: "presets", testId: "tab-presets" },
  { label: "Unavailable last", value: "off-last", disabled: true },
];

async function pressKey(element: Element, key: string) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  element.dispatchEvent(event);
  await nextTick();
  return event;
}

describe("Tabs", () => {
  it("uses a destination's brass material without pinning the rail geometry or other tabs", async () => {
    const wrapper = mount(Tabs, { props: {
      tabs: [{ label: "Shape", value: "shape", tone: "brass" }, ...tabs],
      modelValue: "keys", geometry: "offcut", tone: "ivory",
    } });
    expect(wrapper.classes()).toContain("tabs--tone-ivory");
    await wrapper.setProps({ modelValue: "shape" });
    expect(wrapper.classes()).toContain("tabs--tone-brass");
    expect(wrapper.classes()).toContain("tabs--geometry-offcut");
    expect(wrapper.get('.tabs__chip').classes()).toContain("brass");
    await wrapper.setProps({ modelValue: "keys" });
    expect(wrapper.classes()).toContain("tabs--tone-ivory");
    wrapper.unmount();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("emits pointer selection through the authoritative chip surface", async () => {
    const wrapper = mount(Tabs, {
      props: { tabs, modelValue: "keys", layout: "scroll" },
    });

    expect(wrapper.classes()).toContain("tabs--layout-scroll");
    expect(wrapper.get('[data-testid="tab-mallets"]').attributes("aria-label")).toBe("Mallets");

    await wrapper.get('[data-testid="tab-mallets"]').trigger("click", { detail: 1 });
    expect(wrapper.emitted("update:modelValue")).toEqual([["mallets", "pointer"]]);
  });

  it.each(TABS_EDITIONS.flatMap((edition) =>
    [true, false].map((controlled) => ({ ...edition, controlled })),
  ))("reaches inactive tabs with Arrow/Home/End in $id (controlled: $controlled)", async ({ geometry, tone, controlled }) => {
    const wrapper = mount(defineComponent({
      setup() {
        const value = ref("keys");
        return () => h(Tabs, {
          tabs: keyboardTabs,
          geometry,
          tone,
          layout: "scroll",
          modelValue: controlled ? value.value : undefined,
          defaultValue: "keys",
          "onUpdate:modelValue": (next: string) => { value.value = next; },
        });
      },
    }), { attachTo: document.body });
    const rail = wrapper.getComponent(Tabs);
    const keys = rail.get('[data-testid="tab-keys"]');
    expect(keys.attributes("tabindex")).toBe("0");
    expect(rail.get('[data-testid="tab-mallets"]').attributes("tabindex")).toBe("-1");
    (keys.element as HTMLElement).focus();
    expect(document.activeElement).toBe(keys.element);

    const steps = [
      ["ArrowRight", "mallets"],
      ["ArrowRight", "presets"],
      ["ArrowRight", "keys"],
      ["ArrowLeft", "presets"],
      ["ArrowLeft", "mallets"],
      ["ArrowLeft", "keys"],
      ["End", "presets"],
      ["Home", "keys"],
    ];
    for (const [key, value] of steps) {
      const event = await pressKey(document.activeElement as Element, key);
      const selected = rail.get(`[data-testid="tab-${value}"]`);
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(selected.element);
      expect(rail.findAll('[aria-selected="true"]').map((tab) => tab.element)).toEqual([selected.element]);
      expect(rail.findAll('[tabindex="0"]').map((tab) => tab.element)).toEqual([selected.element]);
    }
    expect(rail.emitted("update:modelValue")).toEqual(steps.map(([, value]) => [value, "keyboard"]));
  });

  it.each(["horizontal", "vertical"])("honors %s aria-orientation and leaves other keys alone", async (orientation) => {
    const wrapper = mount(Tabs, {
      attachTo: document.body,
      attrs: { "aria-orientation": orientation },
      props: { tabs: keyboardTabs, defaultValue: "keys" },
    });
    const keys = wrapper.get('[data-testid="tab-keys"]');
    (keys.element as HTMLElement).focus();
    const vertical = orientation === "vertical";
    for (const key of [vertical ? "ArrowRight" : "ArrowDown", vertical ? "ArrowLeft" : "ArrowUp", "Tab", "Enter", " "]) {
      const event = await pressKey(keys.element, key);
      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(keys.element);
      expect(keys.attributes("aria-selected")).toBe("true");
    }
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    for (const [key, value] of [
      [vertical ? "ArrowDown" : "ArrowRight", "mallets"],
      [vertical ? "ArrowUp" : "ArrowLeft", "keys"],
      ["End", "presets"],
      [vertical ? "ArrowDown" : "ArrowRight", "keys"],
      [vertical ? "ArrowUp" : "ArrowLeft", "presets"],
      ["Home", "keys"],
    ]) {
      const event = await pressKey(document.activeElement as Element, key);
      const selected = wrapper.get(`[data-testid="tab-${value}"]`);
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(selected.element);
      expect(selected.attributes("aria-selected")).toBe("true");
    }
  });

  it("navigates from the focused tab when controlled selection has not changed", async () => {
    const wrapper = mount(Tabs, {
      attachTo: document.body,
      props: { tabs: keyboardTabs, modelValue: "keys" },
    });
    const mallets = wrapper.get('[data-testid="tab-mallets"]');
    (mallets.element as HTMLElement).focus();
    await pressKey(mallets.element, "ArrowRight");
    expect(document.activeElement).toBe(wrapper.get('[data-testid="tab-presets"]').element);
    expect(wrapper.emitted("update:modelValue")).toEqual([["presets", "keyboard"]]);
    expect(wrapper.get('[data-testid="tab-keys"]').attributes("aria-selected")).toBe("true");
  });

  it("keeps a single enabled tab focused without emitting a redundant selection", async () => {
    const wrapper = mount(Tabs, {
      attachTo: document.body,
      props: { tabs: [keyboardTabs[0], tabs[0], keyboardTabs[keyboardTabs.length - 1]], defaultValue: "keys" },
    });
    const keys = wrapper.get('[data-testid="tab-keys"]');
    (keys.element as HTMLElement).focus();
    for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) {
      const event = await pressKey(keys.element, key);
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(keys.element);
      expect(keys.attributes("aria-selected")).toBe("true");
    }
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it.each([
    { items: [] },
    { items: [{ label: "Unavailable", value: "off", disabled: true }] },
  ])("ignores navigation when no enabled tab is focused ($items)", async ({ items }) => {
    const wrapper = mount(Tabs, { props: { tabs: items } });
    for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) {
      const event = await pressKey(wrapper.element, key);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("keeps disabled destinations inert and pins explicit guide variants", async () => {
    const wrapper = mount(Tabs, {
      props: { tabs, defaultValue: "keys", geometry: "rip", tone: "brass" },
    });

    expect(wrapper.classes()).toContain("tabs--geometry-rip");
    expect(wrapper.classes()).toContain("tabs--tone-brass");
    await wrapper.get('button:disabled').trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("renders fourteen stress-case destinations and excludes retired floatingPopup", () => {
    const wrapper = mount(TabsPage);
    const stress = wrapper.get('[aria-label="Configuration stress-case tabs"]');
    const destinations = stress.findAll('[data-testid^="tabs-page-config-"]');

    expect(destinations).toHaveLength(14);
    expect(destinations.map((tab) => tab.attributes("data-testid"))).not.toContain(
      "tabs-page-config-floatingPopup",
    );
    wrapper.unmount();
  });

  it("reveals the active destination again after the viewport resizes", async () => {
    const scrollTo = vi.fn();
    const observe = vi.fn();
    const disconnect = vi.fn();
    let resizeObserverCallback: ResizeObserverCallback | undefined;
    class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        resizeObserverCallback = callback;
      }

      observe = observe;
      unobserve = vi.fn();
      disconnect = disconnect;
    }
    const addEventListener = vi.spyOn(window, "addEventListener");
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    const wrapper = mount(Tabs, {
      props: {
        tabs: [
          ...tabs,
          { label: "Presets", value: "presets", testId: "tab-presets" },
        ],
        modelValue: "presets",
        layout: "scroll",
      },
    });
    const scrollport = wrapper.element as HTMLElement;
    const activeTab = wrapper.get('[data-testid="tab-presets"]').element as HTMLElement;
    Object.defineProperties(scrollport, {
      clientWidth: { configurable: true, value: 200 },
      scrollTo: { configurable: true, value: scrollTo },
    });
    Object.defineProperties(activeTab, {
      offsetLeft: { configurable: true, value: 700 },
      offsetWidth: { configurable: true, value: 60 },
    });
    expect(observe).toHaveBeenCalledWith(scrollport);
    expect(observe).toHaveBeenCalledWith(wrapper.get(".tabs__track").element);

    const resizeHandler = addEventListener.mock.calls.find(
      ([eventName]) => eventName === "resize",
    )?.[1] as EventListener | undefined;
    expect(resizeHandler).toBeDefined();
    resizeHandler?.(new Event("resize"));

    expect(scrollTo).toHaveBeenCalledWith({ left: 630, behavior: "auto" });
    scrollTo.mockClear();
    resizeObserverCallback?.([], {} as ResizeObserver);
    expect(scrollTo).toHaveBeenCalledWith({ left: 630, behavior: "auto" });

    wrapper.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    addEventListener.mockRestore();
  });

  it("drag-scrolls an overflowing rail without selecting the tab under release", async () => {
    vi.useFakeTimers();
    const wrapper = mount(Tabs, {
      props: { tabs, modelValue: "keys", layout: "scroll" },
    });
    Object.defineProperty(wrapper.element, "scrollLeft", {
      configurable: true,
      writable: true,
      value: 120,
    });
    const destination = wrapper.get('[data-testid="tab-mallets"]');

    await destination.trigger("pointerdown", {
      pointerId: 7,
      pointerType: "touch",
      isPrimary: true,
      clientX: 160,
      clientY: 20,
    });
    await wrapper.trigger("pointermove", {
      pointerId: 7,
      pointerType: "touch",
      isPrimary: true,
      clientX: 80,
      clientY: 22,
    });
    expect((wrapper.element as HTMLElement).scrollLeft).toBe(200);
    expect(wrapper.classes()).toContain("tabs--dragging");

    await destination.trigger("lostpointercapture", {
      pointerId: 7,
      pointerType: "touch",
      isPrimary: true,
    });
    expect(wrapper.classes()).toContain("tabs--dragging");

    await wrapper.trigger("pointerup", {
      pointerId: 7,
      pointerType: "touch",
      isPrimary: true,
      clientX: 80,
      clientY: 22,
    });
    await destination.trigger("click", { detail: 1 });
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    vi.advanceTimersByTime(401);
    await destination.trigger("click", { detail: 1 });
    expect(wrapper.emitted("update:modelValue")).toEqual([["mallets", "pointer"]]);
  });

  it("maps a vertical mouse wheel onto an overflowing horizontal rail", () => {
    const wrapper = mount(Tabs, {
      props: { tabs, modelValue: "keys", layout: "scroll" },
    });
    const rail = wrapper.element as HTMLElement;
    Object.defineProperties(rail, {
      clientWidth: { configurable: true, value: 200 },
      scrollWidth: { configurable: true, value: 700 },
      scrollLeft: { configurable: true, writable: true, value: 120 },
    });

    const wheel = new WheelEvent("wheel", { deltaY: 48, cancelable: true });
    rail.dispatchEvent(wheel);

    expect(rail.scrollLeft).toBe(168);
    expect(wheel.defaultPrevented).toBe(true);

    rail.scrollLeft = 500;
    const boundaryWheel = new WheelEvent("wheel", { deltaY: 48, cancelable: true });
    rail.dispatchEvent(boundaryWheel);
    expect(rail.scrollLeft).toBe(500);
    expect(boundaryWheel.defaultPrevented).toBe(false);
  });

  it("renders Marquee as a lit bulb row instead of a chip", () => {
    const wrapper = mount(Tabs, {
      props: { tabs, modelValue: "keys", geometry: "marquee" },
    });

    expect(wrapper.classes()).toContain("tabs--geometry-marquee");
    expect(wrapper.find(".tabs__chip").exists()).toBe(false);
    expect(wrapper.find(".tabs__streak").exists()).toBe(false);
    const buttons = wrapper.findAll(".tabs__button");
    for (const button of buttons) {
      expect(button.findAll(".tabs__bulbs .tabs__bulb")).toHaveLength(7);
      expect(button.get(".tabs__bulbs").attributes("aria-hidden")).toBe("true");
    }
    expect(wrapper.get('[data-testid="tab-keys"]').classes()).toContain("tabs__button--active");
    expect(wrapper.get('[data-testid="tab-keys"]').attributes("aria-selected")).toBe("true");
    wrapper.unmount();
  });

  it("chases Marquee bulbs in the direction of travel", async () => {
    const wrapper = mount(Tabs, {
      props: {
        tabs: [...tabs.slice(0, 2), { label: "Presets", value: "presets", testId: "tab-presets" }],
        modelValue: "keys",
        geometry: "marquee",
      },
    });
    const delays = (testId: string) => wrapper
      .get(`[data-testid="${testId}"]`)
      .findAll(".tabs__bulb")
      .map((bulb) => (bulb.element as HTMLElement).style.transitionDelay);

    await wrapper.setProps({ modelValue: "presets" });
    expect(delays("tab-presets")).toEqual(["0ms", "34ms", "68ms", "102ms", "136ms", "170ms", "204ms"]);

    await wrapper.setProps({ modelValue: "mallets" });
    expect(delays("tab-mallets")).toEqual(["204ms", "170ms", "136ms", "102ms", "68ms", "34ms", "0ms"]);
    wrapper.unmount();
  });

  it("lights a Brass destination's Marquee bulbs without toning the rest of the rail", () => {
    const wrapper = mount(Tabs, {
      props: {
        tabs: [{ label: "Shape", value: "shape", tone: "brass", testId: "tab-shape" }, ...tabs],
        modelValue: "keys",
        geometry: "marquee",
      },
    });

    expect(wrapper.get('[data-testid="tab-shape"]').classes()).toContain("tabs__button--brass");
    expect(wrapper.get('[data-testid="tab-keys"]').classes()).not.toContain("tabs__button--brass");
    wrapper.unmount();
  });

  it("keeps chip geometries free of Marquee bulbs", () => {
    const wrapper = mount(Tabs, { props: { tabs, modelValue: "keys", geometry: "tab" } });
    expect(wrapper.find(".tabs__bulb").exists()).toBe(false);
    expect(wrapper.find(".tabs__chip").exists()).toBe(true);
    wrapper.unmount();
  });

  it("stops both the brass chip and its sheen under Reduced Motion", () => {
    expect(tabsSource).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.tabs__chip\.brass::after\s*\{[^}]*animation: none;/,
    );
  });
});
