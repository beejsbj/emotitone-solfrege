import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { markRaw } from "vue";
import Tabs from "@/components/primatives/Tabs.vue";
import tabsPageSource from "@/style-guide/TabsPage.vue?raw";

const TestIcon = markRaw({ template: "<svg />" });

const tabs = [
  { label: "All Sounds", shortLabel: "All", value: "all", testId: "tab-all" },
  {
    label: "Keyboards",
    shortLabel: "Keys",
    value: "keys",
    testId: "tab-keys",
    icon: TestIcon,
  },
  { label: "Unavailable", value: "off", disabled: true },
];

describe("Tabs", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("emits selection through the authoritative chip surface", async () => {
    const wrapper = mount(Tabs, {
      props: { tabs, modelValue: "all", layout: "scroll" },
    });

    expect(wrapper.classes()).toContain("tabs--layout-scroll");
    expect(wrapper.get('[data-testid="tab-all"]').attributes("tabindex")).toBe("0");
    expect(wrapper.get('[data-testid="tab-keys"]').attributes("tabindex")).toBe("-1");
    expect(wrapper.get('[data-testid="tab-keys"]').attributes("aria-label")).toBe("Keyboards");

    await wrapper.get('[data-testid="tab-keys"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["keys"]]);
  });

  it("keeps disabled destinations inert and pins explicit guide variants", async () => {
    const wrapper = mount(Tabs, {
      props: { tabs, defaultValue: "all", geometry: "rip", tone: "brass" },
    });

    expect(wrapper.classes()).toContain("tabs--geometry-rip");
    expect(wrapper.classes()).toContain("tabs--tone-brass");
    await wrapper.get('button:disabled').trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("keeps the guide stress rail aligned with production's fifteen destinations", () => {
    expect(tabsPageSource).toContain("Fifteen destinations.");
    expect(tabsPageSource).not.toContain("floatingPopup");
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
      props: { tabs, modelValue: "all", layout: "scroll" },
    });
    Object.defineProperty(wrapper.element, "scrollLeft", {
      configurable: true,
      writable: true,
      value: 120,
    });
    const destination = wrapper.get('[data-testid="tab-keys"]');

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
    await destination.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    vi.advanceTimersByTime(401);
    await destination.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["keys"]]);
  });
});
