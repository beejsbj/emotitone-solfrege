import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import Key from "@/components/compounds/Key.vue";
import Note from "@/components/primatives/Note.vue";
import keySource from "@/components/compounds/Key.vue?raw";

const getKeyBackground = vi.fn(() => ({
  background: "hsla(10, 80%, 50%, 1)",
  primaryColor: "hsla(10, 80%, 50%, 1)",
}));

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({ getKeyBackground }),
}));

interface MockTouch {
  identifier: number;
  clientX: number;
  clientY: number;
}

function touchEvent(
  type: string,
  { touches = [], changedTouches = touches }: {
    touches?: MockTouch[];
    changedTouches?: MockTouch[];
  },
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    touches: { value: touches },
    changedTouches: { value: changedTouches },
  });
  return event;
}

function eventIds(wrapper: VueWrapper, name: "press" | "release") {
  return (wrapper.emitted(name) ?? []).map(
    ([payload]) => (payload as { inputId: string }).inputId,
  );
}

function setBounds(wrapper: VueWrapper) {
  vi.spyOn(wrapper.get("button").element, "getBoundingClientRect").mockReturnValue({
    left: 0,
    right: 100,
    top: 0,
    bottom: 100,
    width: 100,
    height: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

describe("Key", () => {
  beforeEach(() => {
    getKeyBackground.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is a real native button whose whole visible face is Note", () => {
    const wrapper = mount(Key);
    const button = wrapper.get("button");

    expect(wrapper.element).toBe(button.element);
    expect(button.attributes("type")).toBe("button");
    expect(button.attributes("aria-label")).toBe("Do (C4)");
    expect(button.attributes("aria-pressed")).toBeUndefined();
    expect(wrapper.findComponent(Note).exists()).toBe(true);
    expect(wrapper.get(".key__face").attributes("aria-hidden")).toBe("true");
  });

  it("forwards the complete accepted Note prop surface unchanged", () => {
    const visibleLabels = ["raw", "degree"] as const;
    const wrapper = mount(Key, {
      props: {
        ariaLabel: "F sharp two, raised fourth",
        syllable: "Fi",
        degree: "#IV",
        rawPitch: "F#2",
        primary: "raw",
        visibleLabels: [...visibleLabels],
        geometry: "offcut",
        proportion: "wide",
        scaleIndex: 6,
        pitchClassIndex: 6,
        octave: 2,
        mode: "dorian",
        musicKey: "B",
        surfaceStyle: "monochrome",
        accidental: true,
        keyBrightness: 0.7,
        keySaturation: 0.8,
        sounding: true,
      },
    });
    const note = wrapper.getComponent(Note);

    expect(wrapper.get("button").attributes("aria-label")).toBe(
      "F sharp two, raised fourth",
    );
    expect(note.props()).toMatchObject({
      syllable: "Fi",
      degree: "#IV",
      rawPitch: "F#2",
      primary: "raw",
      visibleLabels: [...visibleLabels],
      geometry: "offcut",
      proportion: "wide",
      scaleIndex: 6,
      pitchClassIndex: 6,
      octave: 2,
      mode: "dorian",
      musicKey: "B",
      surfaceStyle: "monochrome",
      accidental: true,
      keyBrightness: 0.7,
      keySaturation: 0.8,
      sounding: true,
    });
  });

  it("keeps physical pressed and musical sounding independent", async () => {
    const wrapper = mount(Key, { props: { sounding: true } });

    expect(wrapper.classes()).not.toContain("key--pressed");
    expect(wrapper.attributes("aria-pressed")).toBeUndefined();
    expect(wrapper.getComponent(Note).props("sounding")).toBe(true);

    await wrapper.setProps({ sounding: false, pressed: true });

    expect(wrapper.classes()).toContain("key--pressed");
    expect(wrapper.attributes("aria-pressed")).toBeUndefined();
    expect(wrapper.getComponent(Note).props("sounding")).toBe(false);
  });

  it("begins and ends mouse input idempotently, including departure", async () => {
    const wrapper = mount(Key);
    const button = wrapper.get("button");

    await button.trigger("mousedown", { button: 0 });
    await button.trigger("mousedown", { button: 0 });
    expect(eventIds(wrapper, "press")).toEqual(["mouse"]);
    expect(wrapper.classes()).toContain("key--pressed");

    await button.trigger("mouseleave");
    await button.trigger("mouseup");
    expect(eventIds(wrapper, "release")).toEqual(["mouse"]);
    expect(wrapper.classes()).not.toContain("key--pressed");
  });

  it("stays pressed until both controlled and local sources are clear", async () => {
    const wrapper = mount(Key, { props: { pressed: true } });
    const button = wrapper.get("button");

    await button.trigger("mousedown", { button: 0 });
    await wrapper.setProps({ pressed: false });
    expect(wrapper.classes()).toContain("key--pressed");

    await button.trigger("mouseup");
    expect(wrapper.classes()).not.toContain("key--pressed");
    expect(eventIds(wrapper, "press")).toEqual(["mouse"]);
    expect(eventIds(wrapper, "release")).toEqual(["mouse"]);
  });

  it("tracks touch ids independently and preserves the 5px departure tolerance", async () => {
    const wrapper = mount(Key);
    const button = wrapper.get("button");
    setBounds(wrapper);
    const first = { identifier: 7, clientX: 20, clientY: 20 };
    const second = { identifier: 8, clientX: 80, clientY: 80 };

    button.element.dispatchEvent(touchEvent("touchstart", {
      changedTouches: [first, second],
    }));
    await wrapper.vm.$nextTick();
    expect(eventIds(wrapper, "press")).toEqual(["touch:7", "touch:8"]);

    button.element.dispatchEvent(touchEvent("touchmove", {
      touches: [
        { ...first, clientX: 104 },
        { ...second, clientX: 106 },
      ],
    }));
    await wrapper.vm.$nextTick();
    expect(eventIds(wrapper, "release")).toEqual(["touch:8"]);
    expect(wrapper.classes()).toContain("key--pressed");

    button.element.dispatchEvent(touchEvent("touchend", {
      touches: [],
      changedTouches: [first, second],
    }));
    await wrapper.vm.$nextTick();
    expect(eventIds(wrapper, "release")).toEqual(["touch:8", "touch:7"]);
    expect(wrapper.classes()).not.toContain("key--pressed");
  });

  it("releases cancellation exactly once", async () => {
    const wrapper = mount(Key);
    const button = wrapper.get("button");
    setBounds(wrapper);
    const touch = { identifier: 3, clientX: 50, clientY: 50 };

    button.element.dispatchEvent(touchEvent("touchstart", {
      changedTouches: [touch],
    }));
    button.element.dispatchEvent(touchEvent("touchcancel", {
      changedTouches: [touch],
    }));
    button.element.dispatchEvent(touchEvent("touchend", {
      changedTouches: [touch],
    }));
    await wrapper.vm.$nextTick();

    expect(eventIds(wrapper, "release")).toEqual(["touch:3"]);
  });

  it("releases every active id once on window blur", async () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    const wrapper = mount(Key);
    const button = wrapper.get("button");
    setBounds(wrapper);
    const touch = { identifier: 4, clientX: 50, clientY: 50 };

    expect(addEventListener).toHaveBeenCalledWith("blur", expect.any(Function));
    const blurListener = addEventListener.mock.calls.find(
      ([type]) => type === "blur",
    )?.[1] as EventListener;

    await button.trigger("mousedown", { button: 0 });
    button.element.dispatchEvent(touchEvent("touchstart", {
      changedTouches: [touch],
    }));
    expect(wrapper.classes()).toContain("key--pressed");
    blurListener(new window.Event("blur"));
    blurListener(new window.Event("blur"));
    await wrapper.vm.$nextTick();

    expect(eventIds(wrapper, "release")).toEqual(["mouse", "touch:4"]);
  });

  it("releases active ids when the document becomes hidden", async () => {
    const addEventListener = vi.spyOn(document, "addEventListener");
    const wrapper = mount(Key);
    const button = wrapper.get("button");
    const visibilityState = vi.spyOn(document, "visibilityState", "get");

    expect(addEventListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
    const visibilityListener = addEventListener.mock.calls.find(
      ([type]) => type === "visibilitychange",
    )?.[1] as EventListener;

    await button.trigger("mousedown", { button: 0 });
    expect(wrapper.classes()).toContain("key--pressed");
    visibilityState.mockReturnValue("visible");
    visibilityListener(new window.Event("visibilitychange"));
    expect(eventIds(wrapper, "release")).toEqual([]);

    visibilityState.mockReturnValue("hidden");
    visibilityListener(new window.Event("visibilitychange"));
    await wrapper.vm.$nextTick();
    expect(eventIds(wrapper, "release")).toEqual(["mouse"]);
  });

  it("releases active ids exactly once before unmount", async () => {
    const wrapper = mount(Key);
    await wrapper.get("button").trigger("mousedown", { button: 0 });

    wrapper.unmount();

    const releases = wrapper.emitted("release") ?? [];
    expect(releases).toHaveLength(1);
    expect((releases[0][0] as { inputId: string }).inputId).toBe("mouse");
    expect((releases[0][0] as { event: Event }).event.type).toBe("unmount");
  });

  it("keeps interaction local and encodes the target, focus, pointer, and motion contracts", () => {
    expect(keySource).not.toMatch(
      /@\/stores|audio|haptic|midi|qwerty|addEventListener\(["']key/i,
    );
    expect(keySource).not.toContain("disabled");
    expect(keySource).toMatch(/min-width:\s*44px/);
    expect(keySource).toMatch(/min-height:\s*44px/);
    expect(keySource).toContain("touch-action: manipulation");
    expect(keySource).toMatch(/\.key:focus-visible\s*{[^}]*outline:\s*2px/);
    expect(keySource).toContain("outline-offset: 2px");
    expect(keySource).toContain("@media (hover: hover) and (pointer: fine)");
    expect(keySource).toContain("--key-face-hover-y: -1px");
    expect(keySource).toContain("--key-face-press-y: 2px");
    expect(keySource).toContain("rotate(var(--key-face-rotation, 0deg))");
    expect(keySource).toContain("transition: transform 90ms");
    expect(keySource).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*transition:\s*none/,
    );
    expect(keySource).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*--key-face-press-scale:\s*1/,
    );
  });
});
