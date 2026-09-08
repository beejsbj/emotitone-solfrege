import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import ChordKey from "@/components/compounds/ChordKey.vue";
import Chord from "@/components/compounds/Chord.vue";

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    getKeyBackground: () => ({ background: "tomato", primaryColor: "tomato" }),
    getKeyBackgroundByPitchClass: () => ({ background: "tomato", primaryColor: "tomato" }),
  }),
}));

const members = [
  { id: "C4", rawPitch: "C4", scaleIndex: 0, progress: 1 },
  { id: "E4", rawPitch: "E4", scaleIndex: 2, progress: 1 },
  { id: "G4", rawPitch: "G4", scaleIndex: 4, progress: 1 },
];

describe("ChordKey", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("wraps the accepted fused Chord in the shared native Key interaction shell", () => {
    const wrapper = mount(ChordKey, {
      props: { members, symbol: "C", accessibleName: "C major chord" },
    });

    expect(wrapper.element.tagName).toBe("BUTTON");
    expect(wrapper.attributes()).toMatchObject({
      type: "button",
      "aria-label": "C major chord",
    });
    expect(wrapper.getComponent(Chord).props()).toMatchObject({
      display: "symbol",
      symbol: "C",
      members,
    });
    expect(wrapper.get(".chord-key__face").attributes("aria-hidden")).toBe("true");
  });

  it("tracks multiple contacts independently and releases them on unmount", async () => {
    const wrapper = mount(ChordKey, {
      props: { members, symbol: "C", accessibleName: "C major chord" },
    });
    vi.spyOn(wrapper.element, "getBoundingClientRect").mockReturnValue({
      left: 0, right: 100, top: 0, bottom: 100,
      width: 100, height: 100, x: 0, y: 0, toJSON: () => ({}),
    });
    const event = new Event("touchstart", { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
      touches: { value: [] },
      changedTouches: { value: [
        { identifier: 1, clientX: 20, clientY: 20 },
        { identifier: 2, clientX: 80, clientY: 80 },
      ] },
    });
    wrapper.element.dispatchEvent(event);
    await wrapper.vm.$nextTick();

    expect(event.defaultPrevented).toBe(true);
    expect((wrapper.emitted("press") ?? []).map(([payload]) =>
      (payload as { inputId: string }).inputId,
    )).toEqual(["touch:1", "touch:2"]);

    wrapper.unmount();
    expect((wrapper.emitted("release") ?? []).map(([payload]) =>
      (payload as { inputId: string }).inputId,
    )).toEqual(["touch:1", "touch:2"]);
  });

  it("releases an active touch when disabled", async () => {
    const wrapper = mount(ChordKey, {
      props: { members, symbol: "C", accessibleName: "C major chord" },
    });
    vi.spyOn(wrapper.element, "getBoundingClientRect").mockReturnValue({
      left: 0, right: 100, top: 0, bottom: 100,
      width: 100, height: 100, x: 0, y: 0, toJSON: () => ({}),
    });
    const start = new Event("touchstart", { bubbles: true, cancelable: true });
    Object.defineProperties(start, {
      touches: { value: [{ identifier: 3, clientX: 50, clientY: 50 }] },
      changedTouches: { value: [{ identifier: 3, clientX: 50, clientY: 50 }] },
    });
    wrapper.element.dispatchEvent(start);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("press")).toHaveLength(1);

    await wrapper.setProps({ disabled: true });
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("release")).toHaveLength(1);
    wrapper.unmount();
  });

  it("owns touch movement instead of handing it to horizontal pan", () => {
    const wrapper = mount(ChordKey, {
      props: { members, symbol: "C", accessibleName: "C major chord" },
    });
    const event = new Event("touchmove", { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
      touches: { value: [{ identifier: 1, clientX: 40, clientY: 20 }] },
      changedTouches: { value: [] },
    });

    wrapper.element.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    wrapper.unmount();
  });

  it("releases an active chord when the touch leaves its face", async () => {
    const wrapper = mount(ChordKey, {
      props: { members, symbol: "C", accessibleName: "C major chord" },
    });
    vi.spyOn(wrapper.element, "getBoundingClientRect").mockReturnValue({
      left: 0, right: 100, top: 0, bottom: 100,
      width: 100, height: 100, x: 0, y: 0, toJSON: () => ({}),
    });
    const start = new Event("touchstart", { bubbles: true, cancelable: true });
    Object.defineProperties(start, {
      touches: { value: [{ identifier: 7, clientX: 50, clientY: 50 }] },
      changedTouches: { value: [{ identifier: 7, clientX: 50, clientY: 50 }] },
    });
    wrapper.element.dispatchEvent(start);
    await wrapper.vm.$nextTick();

    const move = new Event("touchmove", { bubbles: true, cancelable: true });
    Object.defineProperties(move, {
      touches: { value: [{ identifier: 7, clientX: 52, clientY: 110 }] },
      changedTouches: { value: [] },
    });
    wrapper.element.dispatchEvent(move);
    const end = new Event("touchend", { bubbles: true, cancelable: true });
    Object.defineProperties(end, {
      touches: { value: [] },
      changedTouches: { value: [{ identifier: 7, clientX: 52, clientY: 110 }] },
    });
    wrapper.element.dispatchEvent(end);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("press")).toHaveLength(1);
    expect(wrapper.emitted("release")).toHaveLength(1);
    wrapper.unmount();
  });

  it("starts a stationary held thumb immediately", async () => {
    const wrapper = mount(ChordKey, {
      props: { members, symbol: "C", accessibleName: "C major chord" },
    });
    vi.spyOn(wrapper.element, "getBoundingClientRect").mockReturnValue({
      left: 0, right: 100, top: 0, bottom: 100,
      width: 100, height: 100, x: 0, y: 0, toJSON: () => ({}),
    });
    const start = new Event("touchstart", { bubbles: true, cancelable: true });
    Object.defineProperties(start, {
      touches: { value: [{ identifier: 5, clientX: 50, clientY: 50 }] },
      changedTouches: { value: [{ identifier: 5, clientX: 50, clientY: 50 }] },
    });
    wrapper.element.dispatchEvent(start);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("press")).toHaveLength(1);
    expect(wrapper.emitted("press")?.[0]?.[0]).toMatchObject({ inputId: "touch:5" });
    wrapper.unmount();
    expect(wrapper.emitted("release")).toHaveLength(1);
  });

  it("releases a quick stationary touch without a delayed pulse", async () => {
    const wrapper = mount(ChordKey, {
      props: { members, symbol: "C", accessibleName: "C major chord" },
    });
    vi.spyOn(wrapper.element, "getBoundingClientRect").mockReturnValue({
      left: 0, right: 100, top: 0, bottom: 100,
      width: 100, height: 100, x: 0, y: 0, toJSON: () => ({}),
    });
    const start = new Event("touchstart", { bubbles: true, cancelable: true });
    Object.defineProperties(start, {
      touches: { value: [{ identifier: 6, clientX: 50, clientY: 50 }] },
      changedTouches: { value: [{ identifier: 6, clientX: 50, clientY: 50 }] },
    });
    wrapper.element.dispatchEvent(start);
    const end = new Event("touchend", { bubbles: true, cancelable: true });
    Object.defineProperties(end, {
      touches: { value: [] },
      changedTouches: { value: [{ identifier: 6, clientX: 50, clientY: 50 }] },
    });
    wrapper.element.dispatchEvent(end);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("press")).toHaveLength(1);
    expect(wrapper.emitted("release")).toHaveLength(1);
    wrapper.unmount();
  });

  it("turns click-only activation into one bounded press and release", async () => {
    vi.useFakeTimers();
    const wrapper = mount(ChordKey, {
      props: { members, symbol: "C", accessibleName: "C major chord" },
    });

    wrapper.element.click();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("press")).toHaveLength(1);
    expect(wrapper.emitted("press")?.[0]?.[0]).toMatchObject({ inputId: "click" });
    expect(wrapper.emitted("release")).toBeUndefined();

    vi.advanceTimersByTime(120);
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("release")).toHaveLength(1);
    expect(wrapper.emitted("release")?.[0]?.[0]).toMatchObject({ inputId: "click" });

    wrapper.unmount();
  });

  it("does not replay pointer or keyboard activation through click", async () => {
    const wrapper = mount(ChordKey, {
      props: { members, symbol: "C", accessibleName: "C major chord" },
    });

    await wrapper.trigger("mousedown", { button: 0 });
    await wrapper.trigger("mouseup", { button: 0 });
    wrapper.element.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));

    wrapper.element.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      key: "Enter",
      code: "Enter",
    }));
    wrapper.element.dispatchEvent(new KeyboardEvent("keyup", {
      bubbles: true,
      key: "Enter",
      code: "Enter",
    }));
    wrapper.element.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }));
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("press")).toHaveLength(1);
    expect(wrapper.emitted("release")).toHaveLength(1);
    wrapper.unmount();
  });
});
