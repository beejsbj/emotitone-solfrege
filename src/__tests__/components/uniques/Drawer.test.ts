import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import Drawer from "@/components/uniques/Drawer/index.vue";

const mounted: ReturnType<typeof mount>[] = [];
let prefixHeight = 120;
beforeEach(() => {
  prefixHeight = 120;
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  });
  vi.spyOn(document, 'addEventListener').mockImplementation(EventTarget.prototype.addEventListener.bind(document));
  vi.spyOn(document, 'removeEventListener').mockImplementation(EventTarget.prototype.removeEventListener.bind(document));
  vi.spyOn(document, 'dispatchEvent').mockImplementation(EventTarget.prototype.dispatchEvent.bind(document));
  const windowEvents = new EventTarget();
  vi.spyOn(window, 'addEventListener').mockImplementation(windowEvents.addEventListener.bind(windowEvents));
  vi.spyOn(window, 'removeEventListener').mockImplementation(windowEvents.removeEventListener.bind(windowEvents));
  vi.spyOn(window, 'dispatchEvent').mockImplementation(windowEvents.dispatchEvent.bind(windowEvents));
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function(this: HTMLElement) {
    return { height: this.classList.contains("drawer__persistent") ? prefixHeight : 0 } as DOMRect;
  });
});
afterEach(() => { mounted.splice(0).forEach(w => w.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function create(extra = {}) {
  const w = mount(Drawer, {
    props: { accessibleName: "Keyboard", defaultOpen: true, initialContentHeight: 200, minContentHeight: 100, fixed: true, ...extra },
    slots: { persistent: '<div>Pattern List · CodeStrip · Controls</div>', default: '<template #default="{ height }"><div data-content :data-height="height">Keys</div></template>' },
  });
  mounted.push(w);
  await flushPromises();
  return w;
}
function height(w: ReturnType<typeof mount>) { return parseFloat((w.element as HTMLElement).style.height); }
async function drag(w: ReturnType<typeof mount>, delta: number) {
  const handle = w.get('button');
  await handle.trigger('pointerdown', { button: 0, pointerId: 1, clientY: 400 });
  await handle.trigger('pointermove', { pointerId: 1, clientY: 400 + delta });
  await handle.trigger('pointerup', { pointerId: 1, clientY: 400 + delta });
  await handle.trigger('click'); // Browser-generated click following pointerup must not toggle a drag.
}

describe("Drawer continuous height contract", () => {
  it("tap keeps the persistent bars, then restores keyboard space", async () => {
    const w = await create();
    expect(height(w)).toBe(320);
    await w.get('button').trigger('click');
    expect(height(w)).toBe(120);
    expect(w.get('.drawer__content').attributes('inert')).toBeDefined();
    await w.get('button').trigger('click');
    expect(height(w)).toBe(320);
  });
  it("shrinks content to its floor, then clips continuously through bars to zero", async () => {
    const w = await create();
    await drag(w, 63);
    expect(height(w)).toBe(257);
    expect(w.get('[data-content]').attributes('data-height')).toBe('137');
    await drag(w, 80);
    expect(height(w)).toBe(177);
    expect(w.get('[data-content]').attributes('data-height')).toBe('100');
    await drag(w, 110);
    expect(height(w)).toBe(67);
    await drag(w, 100);
    expect(height(w)).toBe(0);
    expect(w.get('button').attributes('inert')).toBeUndefined();
    expect(w.get('.drawer__clip').attributes('inert')).toBeDefined();
    await w.get('button').trigger('click');
    expect(height(w)).toBe(257); // Last usable content height, not a partly clipped state.
  });
  it("persists only completed usable resizes and restores them across mounts", async () => {
    const w = await create({ storageKey: 'keyboard-test' });
    await drag(w, -73);
    expect(JSON.parse(localStorage.getItem('emotitone.drawer.keyboard-test')!).contentHeight).toBe(273);
    await drag(w, 360);
    const restored = await create({ storageKey: 'keyboard-test' });
    expect(height(restored)).toBe(393);
  });
  it("clamps a restored preference to the viewport without overwriting it", async () => {
    localStorage.setItem('emotitone.drawer.keyboard-test', JSON.stringify({ contentHeight: 3000 }));
    const w = await create({ storageKey: 'keyboard-test' });
    expect(height(w)).toBeLessThan(window.innerHeight);
    expect(JSON.parse(localStorage.getItem('emotitone.drawer.keyboard-test')!).contentHeight).toBe(3000);
  });
  it("preserves keyboard space when the persistent Pattern List expands", async () => {
    const w = await create();
    prefixHeight = 180;
    window.dispatchEvent(new Event('resize'));
    await w.vm.$nextTick();
    expect(height(w)).toBe(380);
    expect(w.get('[data-content]').attributes('data-height')).toBe('200');
    await w.get('button').trigger('click');
    prefixHeight = 100;
    window.dispatchEvent(new Event('resize'));
    await w.vm.$nextTick();
    expect(height(w)).toBe(100);
  });
  it("accepts external open changes and native activation without arrow resizing", async () => {
    const w = await create({ modelValue: false });
    expect(height(w)).toBe(120);
    await w.setProps({ modelValue: true });
    expect(height(w)).toBe(320);
    await w.get('button').trigger('keydown', { key: 'ArrowDown' });
    expect(height(w)).toBe(320);
    await w.setProps({ modelValue: false });
    expect(height(w)).toBe(120);
  });
  it("top anchor follows downward dragging, has no persistent floor and closes on Escape", async () => {
    const w = mount(Drawer, { props: { accessibleName: 'Config', anchor: 'top', defaultOpen: true, initialContentHeight: 200, closeOnEscape: true } });
    mounted.push(w);
    await flushPromises();
    await drag(w, 57);
    expect(height(w)).toBe(257);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await w.vm.$nextTick();
    expect(height(w)).toBe(0);
    expect(w.get('button').exists()).toBe(true);
  });
  it("removes clipped persistent controls from focus and restores them when visible", async () => {
    let notify: IntersectionObserverCallback = () => {};
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { notify = callback; }
      observe = observe;
      unobserve = vi.fn();
      disconnect = disconnect;
    });
    const w = mount(Drawer, {
      props: { accessibleName: 'Keyboard', defaultOpen: true },
      slots: { persistent: '<button data-control>Control</button><button inert data-inert>Unavailable</button>' },
    });
    mounted.push(w);
    await flushPromises();
    const control = w.get('[data-control]').element as HTMLElement;
    const unavailable = w.get('[data-inert]').element as HTMLElement;
    expect(observe).toHaveBeenCalledWith(control);
    const entry = (target: HTMLElement, visible: boolean) => ({ target, isIntersecting: visible,
      intersectionRect: { height: visible ? 20 : 0, width: visible ? 40 : 0 },
    }) as IntersectionObserverEntry;
    notify([entry(control, false)], {} as IntersectionObserver);
    expect(control.inert).toBe(true);
    notify([entry(control, true), entry(unavailable, true)], {} as IntersectionObserver);
    expect(control.inert).toBe(false);
    expect(unavailable.inert).toBe(true);
    w.unmount();
    expect(disconnect).toHaveBeenCalled();
  });

});
