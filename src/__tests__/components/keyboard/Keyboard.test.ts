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
    parseNoteInput: vi.fn((pitch: string) => {
      const match = pitch.match(/^([A-G])(?:#|b)?(-?\d+)$/);
      if (!match) return null;
      const scaleIndex = ({ C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 } as Record<string, number>)[match[1]];
      return { solfegeIndex: scaleIndex, octave: Number(match[2]) };
    }),
    attackNoteWithOctave: vi.fn(async () => "melody-note"),
    attackExactPitch: vi.fn(async (pitch: string) => `exact-${pitch}`),
    releaseNote: vi.fn(),
  };
  const instrumentStore = {
    isInteractionLocked: false,
  };

  return {
    keyboardStore,
    musicStore,
    instrumentStore,
    useKeyboardControls: vi.fn(),
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
    disabled: Boolean,
    ariaLabel: String,
  },
  emits: ["press", "release"],
  template: '<button class="key-stub" v-bind="$attrs" />',
});

const ChordKeyStub = defineComponent({
  name: "ChordKey",
  inheritAttrs: false,
  props: {
    members: Array,
    symbol: String,
    accessibleName: String,
    geometry: String,
    pressed: Boolean,
    disabled: Boolean,
  },
  emits: ["press", "release"],
  template: '<button class="chord-key-stub" v-bind="$attrs" />',
});

function mountKeyboard() {
  return mount(Keyboard, {
    global: {
      stubs: { Key: KeyStub, ChordKey: ChordKeyStub },
    },
  });
}

function pointerEvent(
  type: string,
  options: {
    pointerId: number;
    pointerType: "mouse" | "pen" | "touch";
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

function glissandoRows() {
  return [{
    octave: 4,
    keys: Array.from({ length: 3 }, (_, scaleIndex) => ({
      id: `key-${scaleIndex}`,
      syllable: `Note ${scaleIndex}`,
      degree: `${scaleIndex + 1}`,
      rawPitch: `N${scaleIndex}`,
      scaleIndex,
    })),
  }];
}

function mockGlissandoHitTesting(
  keys: Array<{ element: HTMLButtonElement }>,
) {
  keys.forEach((key, index) => {
    vi.spyOn(key.element, "getBoundingClientRect").mockReturnValue(
      new DOMRect(index * 100, 0, 100, 40),
    );
  });
  vi.spyOn(document, "elementFromPoint").mockImplementation((x) =>
    keys[Math.min(keys.length - 1, Math.floor(x / 100))]?.element ?? null
  );
}

describe("Keyboard production usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.keyboardStore.keyboardConfig.keyboardPadding = false;
    mocks.keyboardStore.isKeyPressed.mockImplementation(
      (noteKey: string) => noteKey === "0_4",
    );
    mocks.musicStore.getNoteName.mockImplementation(
      (scaleIndex: number, octave: number) =>
        `${scaleIndex === 0 ? "C" : "D#"}${octave}`,
    );
    mocks.musicStore.currentKey = "C";
    mocks.musicStore.currentMode = "major";
    mocks.instrumentStore.isInteractionLocked = false;
  });

  it("includes chord faces in controlled reduced-motion and forced-color previews", () => {
    expect(keyboardSource).toContain(
      ".keyboard--motion-reduced :deep(.chord-key__face)",
    );
    expect(keyboardSource).toContain(
      ".keyboard--motion-reduced :deep(.chord__fused-progress)",
    );
    expect(keyboardSource).toContain(
      ".keyboard--contrast-forced :deep(.chord-key:focus-visible)",
    );
    expect(keyboardSource).toContain(
      ".keyboard--contrast-forced :deep(.chord__fused)",
    );
    expect(keyboardSource).toContain(
      ".keyboard--contrast-forced :deep(.chord__symbol)",
    );
    expect(keyboardSource).toMatch(
      /\.keyboard__chord-row\s*\{[\s\S]*?grid-template-columns:\s*repeat\(var\(--keyboard-chord-count, 1\), minmax\(0, 1fr\)\)/,
    );
    expect(keyboardSource).toMatch(
      /\.keyboard__chord-row\s*\{[\s\S]*?touch-action:\s*none/,
    );
    expect(keyboardSource).toMatch(
      /\.keyboard__row\s*\{[\s\S]*?touch-action:\s*none/,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds configured octave rows from the accepted Key contract", () => {
    const wrapper = mountKeyboard();
    const keys = wrapper.findAllComponents(KeyStub);
    expect(wrapper.findAllComponents(ChordKeyStub)).toHaveLength(7);

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
      "--keyboard-note-height: 76px",
    );

    expect(keys[4].props("sounding")).toBe(true);
  });

  it("separates scientific color octave from the keyboard row coordinate", () => {
    mocks.musicStore.currentKey = "B";
    mocks.musicStore.getNoteName.mockImplementation(
      (scaleIndex: number, octave: number) =>
        scaleIndex === 0 ? `B${octave}` : `C#${octave + 1}`,
    );

    const wrapper = mountKeyboard();
    const rowFour = wrapper.find('[data-octave="4"]');
    const rowKeys = rowFour.findAllComponents(KeyStub);

    expect(rowKeys[0].props("rawPitch")).toBe("B4");
    expect(rowKeys[0].props("octave")).toBe(4);
    expect(rowKeys[1].props("rawPitch")).toBe("C#5");
    expect(rowKeys[1].props("octave")).toBe(5);
    expect(rowFour.attributes("data-octave")).toBe("4");
  });

  it("keeps chord geometry edition-driven but distinct from melody geometry", () => {
    const wrapper = mount(Keyboard, {
      props: {
        usage: "controlled",
        rows: controlledRows(),
        geometryFamily: "pill",
      },
      global: { stubs: { Key: KeyStub, ChordKey: ChordKeyStub } },
    });

    expect(wrapper.attributes("data-geometry-family")).toBe("pill");
    expect(wrapper.get(".keyboard__chord-row").attributes("data-geometry-family"))
      .toBe("tile");
    expect(wrapper.findAllComponents(ChordKeyStub).every(
      (chord) => chord.props("geometry") === "tile",
    )).toBe(true);
  });

  it("owns fluid primary typography at the Keyboard layer", () => {
    expect(keyboardSource).toMatch(
      /\.keyboard__row--main[\s\S]*--note-primary-size:\s*clamp\(16px, 62cqi, 24px\)/,
    );
    expect(keyboardSource).toMatch(
      /\.keyboard__row:not\(\.keyboard__row--main\)[\s\S]*--note-primary-size:\s*clamp\(15px, 47cqi, 18px\)/,
    );
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
      .toBeCloseTo(102.77, 1);
    expect(parseFloat((keys[2].element as HTMLElement).style.getPropertyValue("--keyboard-note-height")))
      .toBeCloseTo(139.47, 1);
  });

  it("fills the host allocation while preserving the minimum, row hierarchy, and identity", async () => {
    const wrapper = mountKeyboard();
    const identities = wrapper.findAllComponents(KeyStub).map(key => key.props("rawPitch"));
    await wrapper.setProps({ availableHeight: 400 });
    let keys = wrapper.findAllComponents(KeyStub);
    expect(parseFloat((keys[0].element as HTMLElement).style.getPropertyValue("--keyboard-note-height"))).toBeCloseTo(105.17, 1);
    expect(parseFloat((keys[2].element as HTMLElement).style.getPropertyValue("--keyboard-note-height"))).toBeCloseTo(142.74, 1);
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
      "melody:mouse:0_4",
      "0_4",
    );
    expect(mocks.triggerNoteHaptic).toHaveBeenCalledOnce();
    expect(mocks.musicStore.attackNoteWithOctave).toHaveBeenCalledWith(
      0,
      4,
      expect.any(Function),
    );
    const isCancelled = mocks.musicStore.attackNoteWithOctave.mock.calls[0][2] as
      () => boolean;
    expect(isCancelled()).toBe(false);

    key.vm.$emit("release", { inputId: "mouse", event });
    await nextTick();
    expect(isCancelled()).toBe(true);

    expect(mocks.keyboardStore.removeTouch).toHaveBeenCalledWith("melody:mouse:0_4");
    await Promise.resolve();
    expect(mocks.musicStore.releaseNote).toHaveBeenCalledWith("melody-note");
  });

  it("snapshots a chord alteration and attacks every member by exact pitch", async () => {
    const wrapper = mountKeyboard();
    const firstChord = wrapper.findAllComponents(ChordKeyStub)[0];
    const event = new MouseEvent("mousedown");

    firstChord.vm.$emit("press", { inputId: "pointer:7", event });
    await nextTick();

    expect(mocks.keyboardStore.addTouch).toHaveBeenCalledWith(
      "chord:pointer:7:degree-1",
      "chord:degree-1",
    );
    expect(mocks.musicStore.attackExactPitch.mock.calls.map(([pitch]) => pitch))
      .toEqual(["C4", "E4", "G4"]);

    await wrapper.setProps({ harmonyAlteration: "dark" });
    expect(mocks.musicStore.attackExactPitch).toHaveBeenCalledTimes(3);
    expect((firstChord.props("members") as Array<{ rawPitch: string }>).map(
      (member) => member.rawPitch,
    )).toEqual(["C4", "E4", "G4"]);
    expect(firstChord.props("symbol")).toBe("C");

    firstChord.vm.$emit("press", { inputId: "pointer:8", event });
    await nextTick();
    expect(mocks.musicStore.attackExactPitch.mock.calls.slice(3).map(([pitch]) => pitch))
      .toEqual(["C4", "D#4", "G4"]);

    firstChord.vm.$emit("release", { inputId: "pointer:7", event });
    await nextTick();
    await Promise.resolve();
    expect(mocks.musicStore.releaseNote.mock.calls.map(([noteId]) => noteId))
      .toEqual(["exact-C4", "exact-E4", "exact-G4"]);

    firstChord.vm.$emit("release", { inputId: "pointer:8", event });
    await nextTick();
    wrapper.unmount();
  });

  it("depresses corresponding note keys for the lifetime of a chord owner", async () => {
    mocks.keyboardStore.isKeyPressed.mockReturnValue(false);
    const wrapper = mountKeyboard();
    const firstChord = wrapper.findAllComponents(ChordKeyStub)[0];
    const c4Key = () => wrapper.findAllComponents(KeyStub)[2];
    const event = new MouseEvent("mousedown");

    expect(c4Key().props("pressed")).toBe(false);
    firstChord.vm.$emit("press", { inputId: "pointer:pressed", event });
    await nextTick();

    expect(c4Key().props("pressed")).toBe(true);

    firstChord.vm.$emit("release", { inputId: "pointer:pressed", event });
    await nextTick();

    expect(c4Key().props("pressed")).toBe(false);
    wrapper.unmount();
  });

  it("matches held chord depression to exact pitches after the key changes", async () => {
    mocks.keyboardStore.isKeyPressed.mockReturnValue(false);
    mocks.musicStore.getNoteName.mockImplementation(
      (scaleIndex: number, octave: number) => {
        const pitches = mocks.musicStore.currentKey === "D"
          ? ["D", "E"]
          : ["C", "D#"];
        return `${pitches[scaleIndex]}${octave}`;
      },
    );
    const wrapper = mountKeyboard();
    const chords = wrapper.findAllComponents(ChordKeyStub);
    const heldChord = chords[0];
    const refreshChord = chords[1];
    const event = new MouseEvent("mousedown");

    heldChord.vm.$emit("press", { inputId: "pointer:held-pitches", event });
    await nextTick();
    mocks.musicStore.currentKey = "D";
    refreshChord.vm.$emit("press", { inputId: "pointer:refresh", event });
    refreshChord.vm.$emit("release", { inputId: "pointer:refresh", event });
    await nextTick();

    const mainRowKeys = wrapper.findAllComponents(KeyStub).slice(2, 4);
    expect(mainRowKeys.map((key) => [key.props("rawPitch"), key.props("pressed")]))
      .toEqual([["D4", false], ["E4", true]]);

    heldChord.vm.$emit("release", { inputId: "pointer:held-pitches", event });
    wrapper.unmount();
  });

  it("keeps a held chord in its attack-time key and mode color context", async () => {
    const wrapper = mountKeyboard();
    const firstChord = wrapper.findAllComponents(ChordKeyStub)[0];
    const event = new MouseEvent("mousedown");

    firstChord.vm.$emit("press", { inputId: "pointer:colors", event });
    await nextTick();

    mocks.musicStore.currentKey = "G";
    mocks.musicStore.currentMode = "harmonic minor";
    await wrapper.setProps({ harmonyAlteration: "dark" });

    const heldChord = wrapper.findAllComponents(ChordKeyStub).find(
      (chord) => chord.attributes("data-chord-id") === "degree-1",
    );
    expect(heldChord?.props("members")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mode: "major", musicKey: "C" }),
      ]),
    );

    heldChord?.vm.$emit("release", { inputId: "pointer:colors", event });
    wrapper.unmount();
  });

  it("emits a pointer chord release with its press-time harmony", async () => {
    const wrapper = mountKeyboard();
    const firstChord = wrapper.findAllComponents(ChordKeyStub)[0];
    const event = new MouseEvent("mousedown");

    firstChord.vm.$emit("press", { inputId: "pointer:event-snapshot", event });
    await nextTick();
    const pressedIntent = wrapper.emitted("chordPress")?.[0]?.[0] as {
      chord: unknown;
    };

    await wrapper.setProps({ harmonyAlteration: "dark" });
    const remappedChord = wrapper.findAllComponents(ChordKeyStub).find(
      (chord) => chord.attributes("data-chord-id") === "degree-1",
    );
    remappedChord?.vm.$emit("release", {
      inputId: "pointer:event-snapshot",
      event,
    });
    await nextTick();

    expect(wrapper.emitted("chordRelease")?.[0]?.[0]).toMatchObject({
      chord: pressedIntent.chord,
    });
    wrapper.unmount();
  });

  it("keeps overlapping click pulses owned by their individual chord keys", async () => {
    const wrapper = mountKeyboard();
    const [firstChord, secondChord] = wrapper.findAllComponents(ChordKeyStub);
    const event = new MouseEvent("click");

    firstChord.vm.$emit("press", { inputId: "click", event });
    secondChord.vm.$emit("press", { inputId: "click", event });
    await nextTick();

    firstChord.vm.$emit("release", { inputId: "click", event });
    secondChord.vm.$emit("release", { inputId: "click", event });
    await nextTick();
    await Promise.resolve();

    expect(wrapper.emitted("chordRelease")?.map(([intent]) => (
      intent as { chordId: string }
    ).chordId)).toEqual(["degree-1", "degree-2"]);
    expect(mocks.keyboardStore.removeTouch.mock.calls.map(([ownerId]) => ownerId))
      .toEqual(["chord:click:degree-1", "chord:click:degree-2"]);
    expect(mocks.musicStore.releaseNote).toHaveBeenCalledTimes(6);
    wrapper.unmount();
  });

  it("keeps a held degree rendered until release when a smaller scale removes it", async () => {
    const wrapper = mountKeyboard();
    const seventhChord = wrapper.findAllComponents(ChordKeyStub)[6];
    const event = new MouseEvent("mousedown");

    seventhChord.vm.$emit("press", { inputId: "pointer:9", event });
    await nextTick();
    const heldSymbol = seventhChord.props("symbol");

    mocks.musicStore.currentMode = "major pentatonic";
    await wrapper.setProps({ harmonyAlteration: "dark" });

    const orphan = wrapper.findAllComponents(ChordKeyStub).find(
      (chord) => chord.attributes("data-chord-id") === "degree-7",
    );
    expect(orphan?.props("symbol")).toBe(heldSymbol);
    expect(orphan?.props("pressed")).toBe(true);

    orphan?.vm.$emit("release", { inputId: "pointer:9", event });
    await nextTick();
    expect(wrapper.findAllComponents(ChordKeyStub)).toHaveLength(5);
    wrapper.unmount();
  });

  it("keeps a focus-held chord sounding through a smaller-scale remap until keyup", async () => {
    const wrapper = mount(Keyboard, {
      attachTo: document.body,
      global: {
        stubs: { Key: KeyStub, ChordKey: ChordKeyStub },
      },
    });
    const seventhChord = wrapper.findAllComponents(ChordKeyStub)[6];
    (seventhChord.element as HTMLButtonElement).focus();

    await seventhChord.trigger("keydown", {
      key: "Enter",
      code: "Enter",
      repeat: false,
    });
    await nextTick();
    expect(mocks.musicStore.attackExactPitch).toHaveBeenCalledTimes(3);

    mocks.musicStore.currentMode = "major pentatonic";
    await wrapper.setProps({ harmonyAlteration: "dark" });
    await Promise.resolve();

    const heldChord = wrapper.findAllComponents(ChordKeyStub).find(
      (chord) => chord.attributes("data-chord-id") === "degree-7",
    );
    expect(heldChord?.props("pressed")).toBe(true);
    expect(mocks.musicStore.releaseNote).not.toHaveBeenCalled();

    await heldChord?.trigger("keyup", { key: "Enter", code: "Enter" });
    await nextTick();
    await Promise.resolve();
    expect(mocks.musicStore.releaseNote).toHaveBeenCalledTimes(3);
    expect(document.activeElement).toBe(
      wrapper.findAllComponents(ChordKeyStub)[4].element,
    );
    wrapper.unmount();
  });

  it("uses live harmony for a second focus attack while displaying a held snapshot", async () => {
    const wrapper = mountKeyboard();
    const firstChord = wrapper.findAllComponents(ChordKeyStub)[0];

    await firstChord.trigger("keydown", {
      key: " ",
      code: "Space",
      repeat: false,
    });
    await wrapper.setProps({ harmonyAlteration: "dark" });
    await firstChord.trigger("keydown", {
      key: "Enter",
      code: "Enter",
      repeat: false,
    });
    await nextTick();

    expect(mocks.musicStore.attackExactPitch.mock.calls.slice(0, 3).map(([pitch]) => pitch))
      .toEqual(["C4", "E4", "G4"]);
    expect(mocks.musicStore.attackExactPitch.mock.calls.slice(3).map(([pitch]) => pitch))
      .toEqual(["C4", "D#4", "G4"]);

    await firstChord.trigger("keyup", { key: "Enter", code: "Enter" });
    await firstChord.trigger("keyup", { key: " ", code: "Space" });
    wrapper.unmount();
  });

  it("releases a focus owner when keyup lands in the other keyboard zone", async () => {
    const wrapper = mountKeyboard();
    const firstChord = wrapper.findAllComponents(ChordKeyStub)[0];
    const firstKey = wrapper.findAllComponents(KeyStub)[0];

    await firstChord.trigger("keydown", {
      key: "Enter",
      code: "Enter",
      repeat: false,
    });
    await Promise.resolve();
    await firstKey.trigger("keyup", { key: "Enter", code: "Enter" });
    await Promise.resolve();
    expect(mocks.musicStore.releaseNote).toHaveBeenCalledTimes(3);

    mocks.musicStore.releaseNote.mockClear();
    await firstKey.trigger("keydown", {
      key: " ",
      code: "Space",
      repeat: false,
    });
    await Promise.resolve();
    await firstChord.trigger("keyup", { key: " ", code: "Space" });
    await Promise.resolve();
    expect(mocks.musicStore.releaseNote).toHaveBeenCalledWith("melody-note");

    wrapper.unmount();
  });

  it("keeps a shared key sounding until every pointer leaves", async () => {
    const wrapper = mountKeyboard();
    const root = wrapper.get<HTMLElement>(".keyboard");
    const key = wrapper.get<HTMLButtonElement>('[data-key-id="0_4"]');
    vi.spyOn(document, "elementFromPoint").mockReturnValue(key.element);

    key.element.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 21,
      pointerType: "touch",
      clientX: 20,
    }));
    key.element.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 22,
      pointerType: "touch",
      clientX: 20,
    }));
    await nextTick();

    expect(mocks.musicStore.attackNoteWithOctave).toHaveBeenCalledOnce();

    root.element.dispatchEvent(pointerEvent("pointerup", {
      pointerId: 21,
      pointerType: "touch",
      clientX: 20,
    }));
    await nextTick();
    expect(mocks.musicStore.releaseNote).not.toHaveBeenCalled();

    root.element.dispatchEvent(pointerEvent("pointerup", {
      pointerId: 22,
      pointerType: "touch",
      clientX: 20,
    }));
    await nextTick();
    await Promise.resolve();
    expect(mocks.musicStore.releaseNote).toHaveBeenCalledOnce();
    expect(mocks.musicStore.releaseNote).toHaveBeenCalledWith("melody-note");
  });

  it("disables keys and chords and ignores presses while samples are warming", async () => {
    mocks.instrumentStore.isInteractionLocked = true;
    const wrapper = mountKeyboard();
    const key = wrapper.findAllComponents(KeyStub)[2];
    const chord = wrapper.findAllComponents(ChordKeyStub)[0];

    expect(wrapper.get('[role="group"]').attributes("aria-busy")).toBe("true");
    expect(key.props("disabled")).toBe(true);
    expect(chord.props("disabled")).toBe(true);

    key.vm.$emit("press", {
      inputId: "mouse",
      event: new MouseEvent("mousedown"),
    });
    chord.vm.$emit("press", {
      inputId: "mouse",
      event: new MouseEvent("mousedown"),
    });
    await nextTick();

    expect(mocks.keyboardStore.addTouch).not.toHaveBeenCalled();
    expect(mocks.musicStore.attackNoteWithOctave).not.toHaveBeenCalled();
    expect(mocks.musicStore.attackExactPitch).not.toHaveBeenCalled();
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
      global: { stubs: { Key: KeyStub, ChordKey: ChordKeyStub } },
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

  it("keeps a held note sounding when a surviving row is added", async () => {
    const wrapper = mount(Keyboard, {
      props: { usage: "controlled", rows: controlledRows() },
      global: { stubs: { Key: KeyStub, ChordKey: ChordKeyStub } },
    });
    const first = wrapper.findAll<HTMLButtonElement>(".keyboard__key")[0];
    const root = wrapper.get<HTMLElement>(".keyboard");
    vi.spyOn(document, "elementFromPoint").mockReturnValue(first.element);

    first.element.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 17,
      pointerType: "touch",
      clientX: 20,
    }));
    await wrapper.setProps({
      rows: [
        ...controlledRows(),
        {
          octave: 5,
          keys: [{ id: "do-5", syllable: "Do", degree: "I", rawPitch: "C5", scaleIndex: 0 }],
        },
      ],
    });

    expect(wrapper.emitted("release")).toBeUndefined();
    expect(wrapper.findAll(".keyboard__key")[0].classes()).toContain("keyboard__key--pressed");

    const keyMovedUnderStationaryFinger = wrapper.findAll<HTMLButtonElement>(".keyboard__key")[2];
    vi.mocked(document.elementFromPoint).mockReturnValue(keyMovedUnderStationaryFinger.element);

    root.element.dispatchEvent(pointerEvent("pointerup", {
      pointerId: 17,
      pointerType: "touch",
      clientX: 20,
    }));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("press")?.map(([intent]) =>
      (intent as { keyId: string }).keyId)).toEqual(["do-4"]);
    expect(wrapper.emitted("release")?.map(([intent]) =>
      (intent as { keyId: string }).keyId)).toEqual(["do-4"]);
  });

  it("ignores non-contact pen button presses", async () => {
    const wrapper = mount(Keyboard, {
      props: { usage: "controlled", rows: controlledRows() },
      global: { stubs: { Key: KeyStub, ChordKey: ChordKeyStub } },
    });
    const [first] = wrapper.findAll<HTMLButtonElement>(".keyboard__key");
    vi.spyOn(document, "elementFromPoint").mockReturnValue(first.element);

    first.element.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 8,
      pointerType: "pen",
      button: 2,
      clientX: 20,
    }));
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("press")).toBeUndefined();
    expect(first.classes()).not.toContain("keyboard__key--pressed");
  });

  it("plays every crossed key when a fast pointer move skips event samples", async () => {
    const wrapper = mount(Keyboard, {
      props: { usage: "controlled", rows: glissandoRows() },
      global: { stubs: { Key: KeyStub, ChordKey: ChordKeyStub } },
    });
    const keys = wrapper.findAll<HTMLButtonElement>(".keyboard__key");
    const root = wrapper.get<HTMLElement>(".keyboard");
    mockGlissandoHitTesting(keys);

    keys[0].element.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 9,
      pointerType: "touch",
      clientX: 20,
    }));
    root.element.dispatchEvent(pointerEvent("pointermove", {
      pointerId: 9,
      pointerType: "touch",
      clientX: 220,
    }));
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("press")?.map(([intent]) =>
      (intent as { keyId: string }).keyId)).toEqual(
      glissandoRows()[0].keys.map((key) => key.id),
    );

    root.element.dispatchEvent(pointerEvent("pointerup", {
      pointerId: 9,
      pointerType: "touch",
      clientX: 220,
    }));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("release")?.map(([intent]) =>
      (intent as { keyId: string }).keyId)).toEqual(
      glissandoRows()[0].keys.map((key) => key.id),
    );
  });

  it("preserves erratic reversals reported in one coalesced pointer event", async () => {
    const wrapper = mount(Keyboard, {
      props: { usage: "controlled", rows: glissandoRows() },
      global: { stubs: { Key: KeyStub, ChordKey: ChordKeyStub } },
    });
    const keys = wrapper.findAll<HTMLButtonElement>(".keyboard__key");
    const root = wrapper.get<HTMLElement>(".keyboard");
    mockGlissandoHitTesting(keys);

    keys[0].element.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 10,
      pointerType: "touch",
      clientX: 20,
    }));
    const coalescedMove = pointerEvent("pointermove", {
      pointerId: 10,
      pointerType: "touch",
      clientX: 20,
    });
    Object.defineProperty(coalescedMove, "getCoalescedEvents", {
      value: () => [
        pointerEvent("pointermove", {
          pointerId: 10,
          pointerType: "touch",
          clientX: 220,
        }),
        pointerEvent("pointermove", {
          pointerId: 10,
          pointerType: "touch",
          clientX: 20,
        }),
      ],
    });
    root.element.dispatchEvent(coalescedMove);
    root.element.dispatchEvent(pointerEvent("pointerup", {
      pointerId: 10,
      pointerType: "touch",
      clientX: 20,
    }));
    await wrapper.vm.$nextTick();

    const expectedPath = ["key-0", "key-1", "key-2", "key-1", "key-0"];
    expect(wrapper.emitted("press")?.map(([intent]) =>
      (intent as { keyId: string }).keyId)).toEqual(expectedPath);
    expect(wrapper.emitted("release")?.map(([intent]) =>
      (intent as { keyId: string }).keyId)).toEqual(expectedPath);
  });

  it("does not synthesize adjacent notes along a shared key edge", async () => {
    const wrapper = mount(Keyboard, {
      props: { usage: "controlled", rows: glissandoRows() },
      global: { stubs: { Key: KeyStub, ChordKey: ChordKeyStub } },
    });
    const keys = wrapper.findAll<HTMLButtonElement>(".keyboard__key");
    const root = wrapper.get<HTMLElement>(".keyboard");
    mockGlissandoHitTesting(keys);

    keys[1].element.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 13,
      pointerType: "touch",
      clientX: 100,
    }));
    root.element.dispatchEvent(pointerEvent("pointermove", {
      pointerId: 13,
      pointerType: "touch",
      clientX: 100,
    }));
    root.element.dispatchEvent(pointerEvent("pointermove", {
      pointerId: 13,
      pointerType: "touch",
      clientX: 120,
    }));
    root.element.dispatchEvent(pointerEvent("pointerup", {
      pointerId: 13,
      pointerType: "touch",
      clientX: 120,
    }));
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("press")?.map(([intent]) =>
      (intent as { keyId: string }).keyId)).toEqual(["key-1"]);
    expect(wrapper.emitted("release")?.map(([intent]) =>
      (intent as { keyId: string }).keyId)).toEqual(["key-1"]);
  });

  it("samples the final path segment when a fast swipe ends before another move", async () => {
    const wrapper = mount(Keyboard, {
      props: { usage: "controlled", rows: glissandoRows() },
      global: { stubs: { Key: KeyStub, ChordKey: ChordKeyStub } },
    });
    const keys = wrapper.findAll<HTMLButtonElement>(".keyboard__key");
    const root = wrapper.get<HTMLElement>(".keyboard");
    mockGlissandoHitTesting(keys);

    keys[0].element.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 12,
      pointerType: "touch",
      clientX: 20,
    }));
    root.element.dispatchEvent(pointerEvent("pointerup", {
      pointerId: 12,
      pointerType: "touch",
      clientX: 220,
    }));
    await wrapper.vm.$nextTick();

    const expectedPath = glissandoRows()[0].keys.map((key) => key.id);
    expect(wrapper.emitted("press")?.map(([intent]) =>
      (intent as { keyId: string }).keyId)).toEqual(expectedPath);
    expect(wrapper.emitted("release")?.map(([intent]) =>
      (intent as { keyId: string }).keyId)).toEqual(expectedPath);
  });

  it("releases outside instead of falling back to the captured key target", async () => {
    const wrapper = mount(Keyboard, {
      props: { usage: "controlled", rows: controlledRows() },
      global: { stubs: { Key: KeyStub, ChordKey: ChordKeyStub } },
    });
    const [first] = wrapper.findAll<HTMLButtonElement>(".keyboard__key");
    vi.spyOn(document, "elementFromPoint").mockImplementation((x) =>
      x >= 0 ? first.element : null
    );

    first.element.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 11,
      pointerType: "touch",
      clientX: 20,
    }));
    first.element.dispatchEvent(pointerEvent("pointermove", {
      pointerId: 11,
      pointerType: "touch",
      clientX: -20,
    }));
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("release")?.map(([intent]) =>
      (intent as { keyId: string }).keyId)).toEqual(["do-4"]);
    expect(first.classes()).not.toContain("keyboard__key--pressed");

    first.element.dispatchEvent(pointerEvent("pointerup", {
      pointerId: 11,
      pointerType: "touch",
      clientX: -20,
    }));
  });
});
