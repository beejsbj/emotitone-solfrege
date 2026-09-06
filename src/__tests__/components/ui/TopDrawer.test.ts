import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import TopDrawer from "@/components/TopDrawer.vue";

beforeEach(() => {
  vi.spyOn(document, 'addEventListener').mockImplementation(EventTarget.prototype.addEventListener.bind(document));
  vi.spyOn(document, 'removeEventListener').mockImplementation(EventTarget.prototype.removeEventListener.bind(document));
  vi.spyOn(document, 'dispatchEvent').mockImplementation(EventTarget.prototype.dispatchEvent.bind(document));
  const windowEvents = new EventTarget();
  vi.spyOn(window, 'addEventListener').mockImplementation(windowEvents.addEventListener.bind(windowEvents));
  vi.spyOn(window, 'removeEventListener').mockImplementation(windowEvents.removeEventListener.bind(windowEvents));
  vi.spyOn(window, 'dispatchEvent').mockImplementation(windowEvents.dispatchEvent.bind(windowEvents));
});
const mounted: ReturnType<typeof mount>[] = [];
afterEach(() => { mounted.splice(0).forEach(w => w.unmount()); document.body.innerHTML = ""; vi.restoreAllMocks(); });
function create(anchor: "top-left" | "top-right", name: string) {
  const wrapper = mount(TopDrawer, {
    attachTo: document.body,
    props: { anchor, ariaLabel: name, handleTestId: name },
    slots: { panel: '<template #panel="{ close, anchor }"><div :data-panel="anchor"><button @click="close">Done</button></div></template>' },
  });
  mounted.push(wrapper);
  return wrapper;
}
function handle(name: string) { return document.querySelector(`[data-testid="${name}"]`) as HTMLButtonElement; }

describe("TopDrawer production host", () => {
  it("uses the real Drawer handle and keeps it mounted after slot dismissal", async () => {
    create("top-left", "Instrument");
    await flushPromises();
    expect(document.querySelector('.drawer')).not.toBeNull();
    expect(document.querySelector('[data-panel]')).toBeNull();
    handle("Instrument").click();
    await flushPromises();
    expect(document.querySelector('[data-panel="top-left"]')).not.toBeNull();
    (document.querySelector('[data-panel] button') as HTMLButtonElement).click();
    await flushPromises();
    expect(document.querySelector('[data-panel]')).toBeNull();
    expect(handle("Instrument").getAttribute("aria-expanded")).toBe("false");
  });
  it("switches top panels without a scrim and retains Escape dismissal", async () => {
    create("top-left", "Instrument");
    create("top-right", "Config");
    await flushPromises();
    handle("Instrument").click();
    await flushPromises();
    handle("Config").click();
    await flushPromises();
    expect(handle("Instrument").getAttribute("aria-expanded")).toBe("false");
    expect(handle("Config").getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector('[data-panel="top-left"]')).toBeNull();
    expect(document.querySelector('[data-panel="top-right"]')).not.toBeNull();
    expect(document.querySelector('[class*="scrim"]')).toBeNull();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await flushPromises();
    expect(handle("Config").getAttribute("aria-expanded")).toBe("false");
  });
});
