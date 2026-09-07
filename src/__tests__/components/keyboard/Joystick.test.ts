import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Joystick from "@/components/uniques/Joystick/index.vue";
import { JOYSTICK_OPTIONS, directionFromVector } from "@/components/uniques/Joystick/joystickOptions";
import joystickSource from "@/components/uniques/Joystick/index.vue?raw";
import specimen from "@/style-guide/uniques/UniqueJoystick.vue?raw";
import guide from "@/style-guide/StyleGuide.vue?raw";
vi.mock("@/utils/hapticFeedback", () => ({ triggerUIHaptic: vi.fn() }));
const wrappers: ReturnType<typeof mount>[] = [];
beforeEach(() => {
  vi.spyOn(document, "addEventListener").mockImplementation(Document.prototype.addEventListener.bind(document));
  vi.spyOn(document, "removeEventListener").mockImplementation(Document.prototype.removeEventListener.bind(document));
  vi.spyOn(document, "dispatchEvent").mockImplementation(Document.prototype.dispatchEvent.bind(document));
});
function setup(value = "auto") {
  const wrapper = mount(Joystick, { props: { modelValue: value as "auto" }, attachTo: document.body });
  wrappers.push(wrapper);
  const plate = wrapper.get(".joystick__plate");
  vi.spyOn(plate.element, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
  const capture = vi.fn();
  Object.defineProperty(plate.element, "setPointerCapture", { value: capture, configurable: true });
  return { wrapper, plate, capture };
}
async function pointer(target: Element | Document, type: string, x: number, y: number) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { pointerId: 1, button: 0, clientX: x, clientY: y });
  target.dispatchEvent(event);
  await Promise.resolve();
}
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.useRealTimers(); vi.restoreAllMocks(); });
describe("Joystick unique", () => {
  it("maps center and all screen-space octants deterministically", () => {
    expect(directionFromVector(.1, .1)).toBe("auto");
    expect([[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]].map(([x,y]) => directionFromVector(x,y)))
      .toEqual(["flip", "dominant7", "jazzy7", "lush9", "sus4", "sweet", "dark", "augmented"]);
    expect(directionFromVector(.24, 0)).toBe("jazzy7");
  });
  it("drags from center, continuously follows a detent, clamps travel and latches a short release", async () => {
    const { wrapper, plate, capture } = setup();
    await pointer(plate.element, "pointerdown", 50, 50);
    expect(capture).toHaveBeenCalledWith(1);
    await pointer(document, "pointermove", 60, 51);
    expect(wrapper.attributes("data-effective")).toBe("jazzy7");
    expect(wrapper.get(".joystick__stick").attributes("style")).toContain("left: 60%");
    await pointer(document, "pointermove", 70, 53);
    expect(wrapper.attributes("data-effective")).toBe("jazzy7");
    expect(wrapper.get(".joystick__stick").attributes("style")).toContain("left: 70%");
    await pointer(document, "pointermove", 150, 50);
    expect(wrapper.get(".joystick__stick").attributes("style")).toContain("left: 77%");
    await pointer(document, "pointerup", 150, 50);
    expect(wrapper.emitted("update:modelValue")).toEqual([["jazzy7"]]);
  });
  it("shares Knob geometry, centered ring detents, brass sheen, and floating drag feedback", async () => {
    const { wrapper, plate } = setup();

    expect(wrapper.classes()).toContain("instrument-control");
    expect(plate.classes()).toContain("instrument-control__face");
    expect(wrapper.get(".joystick__label").classes()).toContain("instrument-control__label");
    expect(joystickSource).toContain("animation: brass-sheen 6.5s");
    expect(joystickSource).toContain("point.x * 44");
    expect(joystickSource).toContain('import DragValue from "@/components/primatives/DragValue.vue"');

    await pointer(plate.element, "pointerdown", 50, 50);
    await pointer(document, "pointermove", 80, 50);

    const follower = document.querySelector(".knob-drag-value");
    expect(follower?.textContent).toContain("Jazzy");

    await pointer(document, "pointerup", 80, 50);
    expect(document.querySelector(".knob-drag-value")).toBeNull();
    wrapper.unmount();
  });
  it("tracks globally when capture is unavailable and releases successful capture on completion", async () => {
    const { wrapper, plate, capture } = setup();
    capture.mockImplementationOnce(() => { throw new Error("capture unavailable"); });
    await pointer(plate.element, "pointerdown", 50, 50);
    await pointer(document, "pointermove", 50, 25);
    await pointer(document, "pointerup", 50, 25);
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["flip"]);
    const release = vi.fn();
    Object.defineProperty(plate.element, "hasPointerCapture", { value: () => true, configurable: true });
    Object.defineProperty(plate.element, "releasePointerCapture", { value: release, configurable: true });
    await pointer(plate.element, "pointerdown", 50, 50);
    await pointer(document, "pointerup", 50, 50);
    expect(release).toHaveBeenCalledWith(1);
    await pointer(plate.element, "lostpointercapture", 50, 50);
    expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
  });
  it.each(["analog", "digital"] as const)("keeps an edge press and subthreshold motion inert in %s", async visual => {
    vi.useFakeTimers();
    const { wrapper, plate } = setup("dark");
    await wrapper.setProps({ visual });
    const restingStyle = wrapper.get(".joystick__stick").attributes("style");
    await pointer(plate.element, "pointerdown", 95, 25);
    expect(wrapper.attributes("data-effective")).toBe("dark");
    expect(wrapper.get(".joystick__stick").attributes("style")).toBe(restingStyle);
    await pointer(document, "pointermove", 98, 28);
    expect(wrapper.get(".joystick__stick").attributes("style")).toBe(restingStyle);
    await pointer(document, "pointerup", 98, 28);
    await pointer(plate.element, "pointerdown", 5, 75);
    await vi.advanceTimersByTimeAsync(270);
    await pointer(document, "pointerup", 5, 75);
    expect(wrapper.emitted("effectiveChange")).toBeUndefined();
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
  it("adds relative drag to the current value from any press location and reaches center", async () => {
    const { wrapper, plate } = setup("jazzy7");
    expect(wrapper.findAll(".joystick__direction")).toHaveLength(0);
    expect(wrapper.findAll(".joystick__option.sr-only")).toHaveLength(9);
    await pointer(plate.element, "pointerdown", 35, 35);
    await pointer(document, "pointermove", 25, 35);
    expect(wrapper.attributes("data-effective")).toBe("jazzy7");
    expect(wrapper.get(".joystick__stick").attributes("style")).toContain("left: 67%");
    await pointer(document, "pointermove", 8, 35);
    expect(wrapper.attributes("data-effective")).toBe("auto");
    await pointer(document, "pointerup", 8, 35);
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["auto"]);
  });
  it("exposes a held drag immediately and restores the previous latch", async () => {
    vi.useFakeTimers();
    const { wrapper, plate } = setup("dark");
    await pointer(plate.element, "pointerdown", 50, 50);
    await pointer(document, "pointermove", 97, 70);
    expect(wrapper.attributes("data-effective")).toBe("lush9");
    await vi.advanceTimersByTimeAsync(270);
    expect(wrapper.attributes("data-momentary")).toBe("true");
    await pointer(document, "pointerup", 97, 70);
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("effectiveChange")?.at(-1)).toEqual(["dark"]);
  });
  it.each(["pointercancel", "lostpointercapture", "blur", "hidden", "unmount"])("cleans up on %s", async kind => {
    const windowListeners = vi.spyOn(window, "addEventListener");
    const { wrapper, plate } = setup("sweet");
    await pointer(plate.element, "pointerdown", 70, 50);
    await pointer(document, "pointermove", 120, 20);
    if (kind === "blur") (windowListeners.mock.calls.find(([type]) => type === "blur")?.[1] as EventListener)(new Event("blur"));
    else if (kind === "hidden") {
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    } else if (kind === "unmount") wrapper.unmount();
    else await pointer(kind === "lostpointercapture" ? plate.element : document, kind, 70, 50);
    await pointer(document, "pointerup", 70, 50);
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("effectiveChange")?.at(-1)).toEqual(["sweet"]);
  });
  it("keeps keyboard access after cancellation and suppresses pointer clicks", async () => {
    const { wrapper, plate } = setup();
    await pointer(plate.element, "pointerdown", 70, 50);
    await pointer(document, "pointermove", 90, 50);
    await pointer(document, "pointercancel", 70, 50);
    const buttons = wrapper.findAll("button");
    await buttons[5].trigger("click", { detail: 1 });
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    await buttons[5].trigger("click", { detail: 0 });
    expect(wrapper.emitted("update:modelValue")).toEqual([["jazzy7"]]);
    expect(buttons.map(button => button.attributes("aria-label"))).toEqual(JOYSTICK_OPTIONS.map(option => `${option.label}: ${option.description}`));
    await buttons[4].trigger("keydown", { key: "ArrowUp" });
    expect(document.activeElement).toBe(buttons[1].element);
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["flip"]);
    expect(buttons[1].attributes("tabindex")).toBe("0");
    expect(buttons[4].attributes("tabindex")).toBe("-1");
    await wrapper.setProps({ modelValue: "flip" });
    expect(buttons[1].attributes("aria-checked")).toBe("true");
    await buttons[1].trigger("keydown", { key: "Home" });
    expect(document.activeElement).toBe(buttons[4].element);
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["auto"]);
    expect(buttons[4].attributes("tabindex")).toBe("0");
    await buttons[3].trigger("keydown", { key: "ArrowLeft" });
    expect(document.activeElement).toBe(buttons[3].element);
  });
  it("has both treatments through the same unique specimen seam", async () => {
    const { wrapper } = setup();
    expect(wrapper.classes()).toContain("joystick--analog");
    await wrapper.setProps({ visual: "digital" });
    expect(wrapper.classes()).toContain("joystick--digital");
    expect(guide).toContain('id="unique-joystick"');
    expect(guide).not.toContain("PrimitiveJoystick");
    expect(specimen).toContain('visual="analog"');
    expect(specimen).toContain('visual="digital"');
    expect(specimen).toContain('@/components/uniques/Joystick/index.vue');
  });
});
