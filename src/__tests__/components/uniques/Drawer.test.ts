import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import Drawer from "@/components/uniques/Drawer/index.vue";

const { triggerUIHaptic } = vi.hoisted(() => ({ triggerUIHaptic: vi.fn() }));
vi.mock("@/utils/hapticFeedback", () => ({ triggerUIHaptic }));

const mounted: ReturnType<typeof mount>[] = [];
let prefixHeight = 120;
let committedLayoutResize = false;
beforeEach(() => {
  triggerUIHaptic.mockClear();
  prefixHeight = 120;
  committedLayoutResize = false;
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
    if (this.classList.contains("drawer--layout-resize")) committedLayoutResize = true;
    return { height: this.classList.contains("drawer__persistent") ? prefixHeight : parseFloat(this.style.height) || 0 } as DOMRect;
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
  it("offers one opt-in haptic for a handle tap, not its post-drag click", async () => {
    const w = await create({ haptic: true });

    await drag(w, -20);
    expect(triggerUIHaptic).not.toHaveBeenCalled();
    await w.get('button').trigger('click');
    expect(triggerUIHaptic).toHaveBeenCalledOnce();
  });
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
  it("can keep a non-scrolling consumer above one complete content floor while dragging", async () => {
    const w = await create({ dragToCollapse: false });
    await drag(w, 500);
    expect(height(w)).toBe(220);
    expect(w.get('[data-content]').attributes('data-height')).toBe('100');
    expect(w.emitted('contentResize')?.at(-1)).toEqual([100, 'pointer']);
  });
  it("offers Arrow-key resizing through the handle when a consumer opts in", async () => {
    const w = await create({
      dragToCollapse: false,
      keyboardResizeStep: 10,
      handleResizeDescription: '3 keyboard rows. Drag or use Arrow keys to resize.',
    });
    const handle = w.get('button');
    expect(handle.attributes('aria-keyshortcuts')).toBe('ArrowUp ArrowDown');
    expect(handle.attributes('aria-description')).toContain('3 keyboard rows');

    await handle.trigger('keydown', { key: 'ArrowUp' });
    await flushPromises();
    expect(height(w)).toBe(330);
    expect(w.emitted('contentResize')?.at(-1)).toEqual([210]);
    expect(committedLayoutResize).toBe(true);
    expect(w.classes()).not.toContain('drawer--layout-resize');
    await handle.trigger('keydown', { key: 'ArrowDown' });
    expect(height(w)).toBe(320);
  });
  it("does not attribute layout resizing to a pointer that is merely held", async () => {
    const w = await create({ dragToCollapse: false, keyboardResizeStep: 10 });
    const handle = w.get('button');

    await handle.trigger('pointerdown', { button: 0, pointerId: 7, clientY: 100 });
    await handle.trigger('keydown', { key: 'ArrowUp' });
    await flushPromises();

    expect(w.emitted('contentResize')?.at(-1)).toEqual([210]);
    await handle.trigger('pointerup', { pointerId: 7, clientY: 100 });
  });
  it("keeps playable content closed when the viewport cannot fit one complete row", async () => {
    const w = await create({
      dragToCollapse: false,
      keyboardResizeStep: 10,
      maxHeightRatio: 0.25,
      storageKey: 'short-keyboard',
    });
    expect(height(w)).toBe(120);
    expect(w.get('.drawer__content').attributes('inert')).toBeDefined();

    await drag(w, -500);
    expect(height(w)).toBe(120);
    await w.get('button').trigger('keydown', { key: 'ArrowUp' });
    expect(height(w)).toBe(120);
    expect(localStorage.getItem('emotitone.drawer.short-keyboard')).toBeNull();
  });
  it("publishes viewport allocations, then closes content if one row no longer fits", async () => {
    const innerHeight = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
    const w = await create({ dragToCollapse: false, maxHeightRatio: 0.5 });
    expect(height(w)).toBe(320);

    innerHeight.mockReturnValue(600);
    window.dispatchEvent(new Event('resize'));
    await w.vm.$nextTick();
    expect(height(w)).toBe(300);
    expect(w.emitted('contentResize')?.at(-1)).toEqual([180]);

    innerHeight.mockReturnValue(400);
    window.dispatchEvent(new Event('resize'));
    await w.vm.$nextTick();
    expect(height(w)).toBe(120);
    expect(w.get('.drawer__content').attributes('inert')).toBeDefined();

    innerHeight.mockReturnValue(800);
    window.dispatchEvent(new Event('resize'));
    await w.get('button').trigger('click');
    expect(height(w)).toBe(320);
  });
  it("closes content when its minimum grows beyond the available allocation", async () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
    const w = await create({
      dragToCollapse: false,
      initialContentHeight: 70,
      minContentHeight: 70,
      maxHeightRatio: 0.25,
    });
    expect(height(w)).toBe(190);

    await w.setProps({ minContentHeight: 100 });
    await flushPromises();
    expect(height(w)).toBe(120);
    expect(w.get('.drawer__content').attributes('inert')).toBeDefined();
  });
  it("restores the preferred open height from below the usable minimum", async () => {
    const w = await create();
    await drag(w, 143);
    expect(height(w)).toBe(177);
    await w.get('button').trigger('click');
    expect(height(w)).toBe(320);
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
  it("closes once from a viewport-clamped open state below the content floor", async () => {
    const w = await create({ initialContentHeight: 500, minContentHeight: 500, maxHeightRatio: 0.25 });
    expect(height(w)).toBeGreaterThan(120);
    expect(height(w)).toBeLessThan(120 + 500);

    await w.get('button').trigger('click');
    expect(height(w)).toBe(120);
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
  it("restores the dragged keyboard height when the row-count floor decreases", async () => {
    const w = await create();
    await drag(w, -50);
    expect(height(w)).toBe(370);

    await w.setProps({ minContentHeight: 300 });
    await flushPromises();
    expect(height(w)).toBe(420);
    expect(committedLayoutResize).toBe(true);
    expect(w.classes()).not.toContain('drawer--layout-resize');

    committedLayoutResize = false;
    await w.setProps({ minContentHeight: 100 });
    await flushPromises();
    expect(height(w)).toBe(370);
    expect(w.get('[data-content]').attributes('data-height')).toBe('250');
    expect(committedLayoutResize).toBe(true);
    expect(w.classes()).not.toContain('drawer--layout-resize');
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
  it("removes clipped controls and keys from focus and restores them when visible", async () => {
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
      props: { accessibleName: 'Keyboard', defaultOpen: true, scroll: false, minContentHeight: 100 },
      slots: { persistent: '<button data-control>Control</button><button inert data-inert>Unavailable</button>', default: '<button data-key tabindex="0">Do</button>' },
    });
    mounted.push(w);
    await flushPromises();
    const control = w.get('[data-control]').element as HTMLElement;
    const unavailable = w.get('[data-inert]').element as HTMLElement;
    const key = w.get('[data-key]').element as HTMLElement;
    expect(observe).toHaveBeenCalledWith(control);
    expect(observe).toHaveBeenCalledWith(key);
    const entry = (target: HTMLElement, visible: boolean) => ({ target, isIntersecting: visible,
      intersectionRect: { height: visible ? 20 : 0, width: visible ? 40 : 0 },
    }) as IntersectionObserverEntry;
    notify([entry(control, false), entry(key, false)], {} as IntersectionObserver);
    expect(control.inert).toBe(true);
    expect(key.inert).toBe(true);
    notify([entry(control, true), entry(unavailable, true)], {} as IntersectionObserver);
    expect(control.inert).toBe(false);
    expect(unavailable.inert).toBe(true);
    w.unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("top drawers reopen to content size rather than remembered or dragged height", async () => {
    localStorage.setItem('emotitone.drawer.config-test', JSON.stringify({ contentHeight: 120 }));
    const w = mount(Drawer, { props: { accessibleName: 'Config', anchor: 'top',
      fitContentOnOpen: true, naturalContentHeight: 420, storageKey: 'config-test',
    } });
    mounted.push(w);
    await flushPromises();
    await w.get('button').trigger('click');
    await flushPromises();
    expect(height(w)).toBe(420);
    await drag(w, -200);
    expect(height(w)).toBe(220);
    await w.get('button').trigger('click');
    await w.get('button').trigger('click');
    await flushPromises();
    expect(height(w)).toBe(420);
    await w.setProps({ naturalContentHeight: 3000 });
    expect(height(w)).toBeLessThan(window.innerHeight);
    expect(JSON.parse(localStorage.getItem('emotitone.drawer.config-test')!).contentHeight).toBe(120);
  });
  it("outside pointer dismisses top panels without consuming stage or keyboard input", async () => {
    const w = mount(Drawer, { attachTo: document.body, props: { accessibleName: 'Config', defaultOpen: true, closeOnOutside: true }, slots: { default: '<button data-inside>Inside</button>' } });
    mounted.push(w);
    await flushPromises();
    await w.get('[data-inside]').trigger('pointerdown');
    expect(height(w)).toBeGreaterThan(0);
    const outside = document.createElement('button');
    document.body.append(outside);
    const press = vi.fn();
    outside.addEventListener('pointerdown', press);
    const event = new Event('pointerdown', { bubbles: true, cancelable: true });
    outside.dispatchEvent(event);
    await flushPromises();
    expect(height(w)).toBe(0);
    expect(press).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(false);
    outside.remove();
  });

});
