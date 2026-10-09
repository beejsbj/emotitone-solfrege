import { defineComponent, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Keyboard from "@/components/compounds/Keyboard.vue";
import { HARMONY_ALTERATIONS, buildHarmony } from "@/domain/harmony";

// The real Keyboard and the real number-row handler run together; only the
// stores (the audio boundary) and the key art are stand-ins. The behaviour
// under test: pressing a number-row key sounds the same pitches as pressing
// the on-screen chord key for that degree, for every Joystick alteration.
const mocks = vi.hoisted(() => ({
  keyboardStore: {
    keyboardConfig: {
      mainOctave: 4,
      rowCount: 3,
      primaryLabel: "degree" as const,
      keyboardPadding: false,
      keyGaps: "small" as const,
      showLabels: true,
      keySize: 1,
      angledStyle: true,
      surfaceStyle: "colored" as const,
      keyBrightness: 0.8,
      keySaturation: 0.7,
      hapticFeedback: false,
    },
    visibleOctaves: [4],
    solfegeData: [{ name: "Do", number: 1, intervalName: "Unison" }],
    isKeyPressed: vi.fn(() => false),
    isVisualNoteActive: vi.fn(() => false),
    addTouch: vi.fn(),
    removeTouch: vi.fn(),
    clearAllTouches: vi.fn(),
  },
  musicStore: {
    currentKey: "C",
    currentMode: "major" as string,
    currentScale: { degreeCount: 7 },
    getNoteName: vi.fn(() => "C4"),
    getActiveNotes: vi.fn(() => []),
    attackNoteWithOctave: vi.fn(async () => "note"),
    attackExactPitch: vi.fn(async (pitch: string) => `exact-${pitch}`),
    releaseNote: vi.fn(),
    setNotePitchBend: vi.fn(),
    setNoteGain: vi.fn(),
  },
  instrumentStore: { isInteractionLocked: false },
  phrasesStore: { undoLastNote: vi.fn() },
}));

vi.mock("@/stores/keyboardDrawer", () => ({ useKeyboardDrawerStore: () => mocks.keyboardStore }));
vi.mock("@/stores/music", () => ({ useMusicStore: () => mocks.musicStore }));
vi.mock("@/stores/instrument", () => ({ useInstrumentStore: () => mocks.instrumentStore }));
vi.mock("@/stores/phrases", () => ({ usePhrasesStore: () => mocks.phrasesStore }));
vi.mock("@/utils/hapticFeedback", () => ({ triggerNoteHaptic: vi.fn() }));

const ChordKeyStub = defineComponent({
  name: "ChordKey",
  inheritAttrs: false,
  props: {
    members: Array, symbol: String, accessibleName: String, geometry: String,
    pressed: Boolean, managedInput: Boolean, disabled: Boolean,
  },
  emits: ["press", "release"],
  template: '<button class="chord-key-stub" v-bind="$attrs" />',
});
const KeyStub = defineComponent({
  name: "Key",
  inheritAttrs: false,
  template: '<button class="key-stub" v-bind="$attrs" />',
});

const NUMBER_ROW = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7"];

const attackedPitches = () =>
  mocks.musicStore.attackExactPitch.mock.calls.map(([pitch]) => pitch as string);

describe("number-row chords follow the Joystick alteration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.musicStore.currentKey = "C";
    mocks.musicStore.currentMode = "major";
  });

  afterEach(() => {
    window.dispatchEvent(new Event("blur"));
  });

  async function pressNumberRow(code: string) {
    window.dispatchEvent(new KeyboardEvent("keydown", { code, key: code }));
    await Promise.resolve();
    window.dispatchEvent(new KeyboardEvent("keyup", { code, key: code }));
    await Promise.resolve();
  }

  const KEY_MODES = [
    { key: "C", mode: "major" },
    { key: "F#", mode: "dorian" },
  ];

  for (const { key, mode } of KEY_MODES) for (const alteration of HARMONY_ALTERATIONS) {
    it(`sounds the on-screen chord pitches for every degree in ${key} ${mode} under "${alteration}"`, async () => {
      mocks.musicStore.currentKey = key;
      mocks.musicStore.currentMode = mode;
      const wrapper = mount(Keyboard, {
        props: { harmonyAlteration: alteration },
        global: { stubs: { Key: KeyStub, ChordKey: ChordKeyStub } },
      });
      const chordKeys = wrapper.findAllComponents(ChordKeyStub);
      expect(chordKeys).toHaveLength(7);

      for (const [index, code] of NUMBER_ROW.entries()) {
        mocks.musicStore.attackExactPitch.mockClear();
        await pressNumberRow(code);
        const fromNumberRow = attackedPitches();

        mocks.musicStore.attackExactPitch.mockClear();
        chordKeys[index].vm.$emit("press", {
          inputId: `pointer:${index}`,
          event: new MouseEvent("mousedown"),
        });
        await nextTick();
        const fromScreen = attackedPitches();
        chordKeys[index].vm.$emit("release", {
          inputId: `pointer:${index}`,
          event: new MouseEvent("mouseup"),
        });
        await nextTick();

        expect(fromNumberRow.length).toBeGreaterThanOrEqual(3);
        expect(fromNumberRow).toEqual(fromScreen);
      }
      wrapper.unmount();
    });
  }

  it("is not vacuous: the alterations produce different pitches somewhere", () => {
    const pitchSets = new Set(
      HARMONY_ALTERATIONS.map((alteration) =>
        buildHarmony({ tonic: "C", scaleType: "major", octave: 4, alteration })
          .map((chord) => chord.voicing.pitches.map((pitch) => pitch.name).join(","))
          .join("|"),
      ),
    );
    expect(pitchSets.size).toBeGreaterThan(1);
  });

  it("re-reads the alteration when the Joystick changes it", async () => {
    const wrapper = mount(Keyboard, {
      props: { harmonyAlteration: "auto" },
      global: { stubs: { Key: KeyStub, ChordKey: ChordKeyStub } },
    });
    await pressNumberRow("Digit1");
    const auto = attackedPitches();

    mocks.musicStore.attackExactPitch.mockClear();
    await wrapper.setProps({ harmonyAlteration: "dark" });
    await pressNumberRow("Digit1");

    expect(attackedPitches()).not.toEqual(auto);
    wrapper.unmount();
  });
});
