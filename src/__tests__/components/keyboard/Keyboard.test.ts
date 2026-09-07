import { defineComponent, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Keyboard from "@/components/compounds/Keyboard.vue";
import drawerKeyboardSource from "@/components/DrawerKeyboard.vue?raw";
import keyboardSource from "@/components/compounds/Keyboard.vue?raw";

const mocks = vi.hoisted(() => {
  const keyboardStore = {
    keyboardConfig: {
      mainOctave: 4,
      rowCount: 3,
      primaryLabel: "degree" as const,
      keyboardPadding: false,
      keyGaps: "small" as const,
      showLabels: true,
      keySize: 1,
      angledStyle: true,
      surfaceStyle: "glassmorphism" as const,
      keyBrightness: 0.8,
      keySaturation: 0.7,
      hapticFeedback: true,
    },
    visibleOctaves: [5, 4, 3],
    solfegeData: [
      { name: "Do", number: 1, intervalName: "Unison" },
      { name: "Re", number: 2, intervalName: "Second" },
    ],
    isKeyPressed: vi.fn((noteKey: string) => noteKey === "0_4"),
    isVisualNoteActive: vi.fn((noteKey: string) => noteKey === "1_5"),
    addTouch: vi.fn(),
    removeTouch: vi.fn(),
    clearAllTouches: vi.fn(),
  };
  const musicStore = {
    currentKey: "C",
    currentMode: "major" as const,
    getNoteName: vi.fn(
      (scaleIndex: number, octave: number) =>
        `${scaleIndex === 0 ? "C" : "D#"}${octave}`,
    ),
    getActiveNotes: vi.fn(() => [{ solfegeIndex: 0, octave: 3 }]),
  };
  const instrumentStore = {
    isInteractionLocked: false,
  };

  return {
    keyboardStore,
    musicStore,
    instrumentStore,
    useKeyboardControls: vi.fn(),
    attackNoteWithOctave: vi.fn(async () => undefined),
    releaseNoteByButtonKey: vi.fn(),
    triggerNoteHaptic: vi.fn(),
  };
});

vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => mocks.keyboardStore,
}));

vi.mock("@/stores/music", () => ({
  useMusicStore: () => mocks.musicStore,
}));

vi.mock("@/stores/instrument", () => ({
  useInstrumentStore: () => mocks.instrumentStore,
}));

vi.mock("@/composables/useKeyboardControls", () => ({
  useKeyboardControls: mocks.useKeyboardControls,
}));

vi.mock("@/composables/useSolfegeInteraction", () => ({
  useSolfegeInteraction: () => ({
    attackNoteWithOctave: mocks.attackNoteWithOctave,
    releaseNoteByButtonKey: mocks.releaseNoteByButtonKey,
  }),
}));

vi.mock("@/utils/hapticFeedback", () => ({
  triggerNoteHaptic: mocks.triggerNoteHaptic,
}));

vi.mock("@/services/musicColor", () => ({
  getChromaticNoteForScaleIndex: (scaleIndex: number) =>
    scaleIndex === 0 ? "C" : "D#",
}));

const KeyStub = defineComponent({
  name: "Key",
  inheritAttrs: false,
  props: {
    syllable: String,
    degree: String,
    rawPitch: String,
    primary: String,
    visibleLabels: Array,
    geometry: String,
    proportion: String,
    scaleIndex: Number,
    pitchClassIndex: Number,
    octave: Number,
    mode: String,
    musicKey: String,
    surfaceStyle: String,
    accidental: Boolean,
    keyBrightness: Number,
    keySaturation: Number,
    sounding: Boolean,
    pressed: Boolean,
    ariaLabel: String,
  },
  emits: ["press", "release"],
  template: '<button class="key-stub" v-bind="$attrs" />',
});

function mountKeyboard() {
  return mount(Keyboard, {
    global: {
      stubs: { Key: KeyStub },
    },
  });
}

function pointerEvent(
  type: string,
  options: {
    pointerId: number;
    pointerType: "mouse" | "touch";
    clientX: number;
    clientY?: number;
    button?: number;
  },
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: options.pointerId },
    pointerType: { value: options.pointerType },
    clientX: { value: options.clientX },
    clientY: { value: options.clientY ?? 20 },
    button: { value: options.button ?? 0 },
    isPrimary: { value: true },
  });
  return event;
}

function controlledRows() {
  return [{
    octave: 4,
    keys: [
      { id: "do-4", syllable: "Do", degree: "I", rawPitch: "C4", scaleIndex: 0 },
      { id: "re-4", syllable: "Re", degree: "II", rawPitch: "D4", scaleIndex: 1 },
    ],
  }];
}

describe("Keyboard production usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.keyboardStore.keyboardConfig.keyboardPadding = false;
    mocks.instrumentStore.isInteractionLocked = false;
  });

  it("builds configured octave rows from the accepted Key contract", () => {
    const wrapper = mountKeyboard();
    const keys = wrapper.findAllComponents(KeyStub);

    expect(keys).toHaveLength(6);

    expect(keys[0].props()).toMatchObject({
      syllable: "Do",
      degree: "I",
      rawPitch: "C5",
      primary: "raw",
      visibleLabels: ["raw"],
      proportion: "wide",
      surfaceStyle: "colored",
      sounding: false,
      pressed: false,
    });
    expect(keys[0].attributes("style")).toContain(
      "--keyboard-note-height: 56px",
    );

    expect(keys[1].props("sounding")).toBe(true);
    expect(keys[1].props("accidental")).toBe(true);

    expect(keys[2].props()).toMatchObject({
      primary: "degree",
      visibleLabels: ["syllable", "degree", "raw"],
      proportion: "medium",
      pressed: true,
    });
    expect(keys[2].attributes("style")).toContain(
      "--keyboard-note-height: 88px",
    );

    expect(keys[4].props("sounding")).toBe(true);
  });

  it("restores the production keyboard padding setting at the keyboard seam", () => {
    mocks.keyboardStore.keyboardConfig.keyboardPadding = true;
    const wrapper = mountKeyboard();

    expect(wrapper.classes()).toContain("keyboard--padded");
  });

  it("reserves the production padding before fitting rows into Drawer space", async () => {
    mocks.keyboardStore.keyboardConfig.keyboardPadding = true;
    const wrapper = mountKeyboard();
    await wrapper.setProps({ availableHeight: 400 });
    const keys = wrapper.findAllComponents(KeyStub);

    expect(parseFloat((keys[0].element as HTMLElement).style.getPropertyValue("--keyboard-note-height")))
      .toBeCloseTo(109.76, 1);
    expect(parseFloat((keys[2].element as HTMLElement).style.getPropertyValue("--keyboard-note-height")))
      .toBeCloseTo(172.48, 1);
  });

  it("fills Drawer allocation while preserving row hierarchy, identity, and the minimum", async () => {
    const wrapper = mountKeyboard();
    const identities = wrapper.findAllComponents(KeyStub).map(key => key.props("rawPitch"));
    await wrapper.setProps({ availableHeight: 400 });
    let keys = wrapper.findAllComponents(KeyStub);
    expect(parseFloat((keys[0].element as HTMLElement).style.getPropertyValue("--keyboard-note-height"))).toBeCloseTo(112);
    expect(parseFloat((keys[2].element as HTMLElement).style.getPropertyValue("--keyboard-note-height"))).toBeCloseTo(176);
    await wrapper.setProps({ availableHeight: 20 });
    keys = wrapper.findAllComponents(KeyStub);
    expect(keys[0].attributes("style")).toContain("--keyboard-note-height: 44px");
    expect(keys.map(key => key.props("rawPitch"))).toEqual(identities);
    wrapper.unmount();
  });

  it("routes Key-local input identity through the existing app adapters", async () => {
    const wrapper = mountKeyboard();
    const key = wrapper.findAllComponents(KeyStub)[2];
    const event = new MouseEvent("mousedown");

    key.vm.$emit("press", { inputId: "mouse", event });
    await nextTick();

    expect(mocks.keyboardStore.addTouch).toHaveBeenCalledWith(
      "mouse:0_4",
      "0_4",
    );
    expect(mocks.triggerNoteHaptic).toHaveBeenCalledOnce();
    expect(mocks.attackNoteWithOctave).toHaveBeenCalledWith(0, 4, event);

    key.vm.$emit("release", { inputId: "mouse", event });
    await nextTick();

    expect(mocks.keyboardStore.removeTouch).toHaveBeenCalledWith("mouse:0_4");
    expect(mocks.releaseNoteByButtonKey).toHaveBeenCalledWith("0_4", event);
  });

  it("disables keys and ignores presses while instrument samples are warming", async () => {
    mocks.instrumentStore.isInteractionLocked = true;
    const wrapper = mountKeyboard();
    const key = wrapper.findAllComponents(KeyStub)[2];

    expect(wrapper.get('[role="group"]').attributes("aria-busy")).toBe("true");
    expect(key.attributes("disabled")).toBeDefined();

    key.vm.$emit("press", {
      inputId: "mouse",
      event: new MouseEvent("mousedown"),
    });
    await nextTick();

    expect(mocks.keyboardStore.addTouch).not.toHaveBeenCalled();
    expect(mocks.attackNoteWithOctave).not.toHaveBeenCalled();
  });

  it("installs one global QWERTY route and clears held pointers on teardown", () => {
    const wrapper = mountKeyboard();

    expect(mocks.useKeyboardControls).toHaveBeenCalledOnce();
    expect(mocks.useKeyboardControls.mock.calls[0][0].value).toBe(4);

    wrapper.unmount();

    expect(mocks.keyboardStore.clearAllTouches).toHaveBeenCalledOnce();
  });

  it("keeps DrawerKeyboard thin and leaves removed legacy Key APIs behind", () => {
    expect(drawerKeyboardSource).toContain(
      'import Keyboard from "@/components/compounds/Keyboard.vue"',
    );
    expect(drawerKeyboardSource).toContain("<Keyboard");
    expect(drawerKeyboardSource).not.toContain("KeyboardKey");
    expect(drawerKeyboardSource).not.toContain("ProductionKeyboard");
    expect(drawerKeyboardSource).not.toContain("useKeyboardControls");

    expect(keyboardSource).toContain("useKeyboardControls");
    expect(keyboardSource).toContain('props.usage === "production"');
    expect(keyboardSource).not.toContain("KeyboardKey.vue");
    expect(keyboardSource).not.toContain("isKeyVisuallyActive");
    expect(keyboardSource).not.toContain("glassmorph-opacity");
    expect(keyboardSource).not.toContain('shape="');
    expect(keyboardSource).toMatch(
      /\.keyboard__key\s+:deep\(\.key__face\),[\s\S]*width:\s*100%;/,
    );
  });
});

describe("Keyboard pointer gestures", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("glissandos a held pointer between keys and releases outside the keyboard", async () => {
    const wrapper = mount(Keyboard, {
      props: { usage: "controlled", rows: controlledRows() },
      global: { stubs: { Key: KeyStub } },
    });
    const [first, second] = wrapper.findAll<HTMLButtonElement>(".keyboard__key");
    const root = wrapper.get<HTMLElement>(".keyboard");
    vi.spyOn(document, "elementFromPoint").mockImplementation((x) => {
      if (x < 100) return first.element;
      if (x < 200) return second.element;
      return null;
    });

    first.element.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 7,
      pointerType: "touch",
      clientX: 20,
    }));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("press")?.map(([intent]) =>
      (intent as { keyId: string }).keyId)).toEqual(["do-4"]);
    expect(first.classes()).toContain("keyboard__key--pressed");

    root.element.dispatchEvent(pointerEvent("pointermove", {
      pointerId: 7,
      pointerType: "touch",
      clientX: 120,
    }));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("release")?.map(([intent]) =>
      (intent as { keyId: string }).keyId)).toEqual(["do-4"]);
    expect(wrapper.emitted("press")?.map(([intent]) =>
      (intent as { keyId: string }).keyId)).toEqual(["do-4", "re-4"]);
    expect(first.classes()).not.toContain("keyboard__key--pressed");
    expect(second.classes()).toContain("keyboard__key--pressed");

    root.element.dispatchEvent(pointerEvent("pointermove", {
      pointerId: 7,
      pointerType: "touch",
      clientX: 240,
    }));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("release")?.map(([intent]) =>
      (intent as { keyId: string }).keyId)).toEqual(["do-4", "re-4"]);
    expect(second.classes()).not.toContain("keyboard__key--pressed");

    root.element.dispatchEvent(pointerEvent("pointermove", {
      pointerId: 7,
      pointerType: "touch",
      clientX: 20,
    }));
    root.element.dispatchEvent(pointerEvent("pointerup", {
      pointerId: 7,
      pointerType: "touch",
      clientX: 20,
    }));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("press")?.map(([intent]) =>
      (intent as { keyId: string }).keyId)).toEqual(["do-4", "re-4", "do-4"]);
    expect(wrapper.emitted("release")?.map(([intent]) =>
      (intent as { keyId: string }).keyId)).toEqual(["do-4", "re-4", "do-4"]);
  });
});
