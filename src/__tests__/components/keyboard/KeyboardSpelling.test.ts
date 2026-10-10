import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Keyboard from "@/components/compounds/Keyboard.vue";
import {
  noteColorResolverKey,
  staticNoteColorResolver,
} from "@/components/primatives/noteColorContext";
import { getScaleForMode } from "@/data";
import { MusicTheoryService } from "@/services/music";
import type { ChromaticNote, MusicalMode } from "@/types/music";

// The real theory service produces the stored, sharps-only pitches the
// Keyboard receives in production; only store plumbing is replaced.
const mocks = vi.hoisted(() => ({
  keyboardStore: {
    keyboardConfig: {
      mainOctave: 4,
      rowCount: 1,
      primaryLabel: "raw" as const,
      keyboardPadding: false,
      keyGaps: "small" as const,
      showLabels: true,
      keySize: 1,
      angledStyle: true,
      surfaceStyle: "colored" as const,
      keyBrightness: 1,
      keySaturation: 1,
      hapticFeedback: false,
    },
    visibleOctaves: [4],
    solfegeData: [] as unknown[],
    isKeyPressed: () => false,
    isVisualNoteActive: () => false,
    addTouch: () => undefined,
    removeTouch: () => undefined,
    clearAllTouches: () => undefined,
  },
  musicStore: {
    currentKey: "C",
    currentMode: "major",
    getNoteName: (() => "C4") as (scaleIndex: number, octave: number) => string,
    getActiveNotes: () => [],
    attackExactPitch: async () => "note",
    attackNoteWithOctave: async () => "note",
    releaseNote: () => undefined,
  },
}));

vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => mocks.keyboardStore,
}));
vi.mock("@/stores/music", () => ({ useMusicStore: () => mocks.musicStore }));
vi.mock("@/stores/instrument", () => ({
  useInstrumentStore: () => ({ isInteractionLocked: false }),
}));
vi.mock("@/composables/useKeyboardControls", () => ({ useKeyboardControls: () => undefined }));
vi.mock("@/utils/hapticFeedback", () => ({ triggerNoteHaptic: () => undefined }));

function playIn(key: ChromaticNote, mode: MusicalMode) {
  const theory = new MusicTheoryService();
  theory.setCurrentKey(key);
  theory.setCurrentMode(mode);
  mocks.musicStore.currentKey = key;
  mocks.musicStore.currentMode = mode;
  mocks.musicStore.getNoteName = (scaleIndex, octave) => theory.getNoteName(scaleIndex, octave);
  mocks.keyboardStore.solfegeData = getScaleForMode(mode).solfege;
}

function mountKeyboard() {
  return mount(Keyboard, {
    global: { provide: { [noteColorResolverKey as symbol]: staticNoteColorResolver } },
  });
}

const visible = (text: string) => text.replace(/\s+/g, "");

function keyLabels(wrapper: ReturnType<typeof mountKeyboard>) {
  return wrapper.findAll(".keyboard__row .note__label--rank-primary")
    .map((label) => visible(label.text()));
}

function chordSymbols(wrapper: ReturnType<typeof mountKeyboard>) {
  return wrapper.findAll(".keyboard__chord-row .chord__symbol").map((symbol) => symbol.text());
}

describe("Keyboard spelling by key", () => {
  beforeEach(() => {
    playIn("C", "major");
  });

  it("shows Bb, not A#, on the fourth Key and chord in F major", () => {
    playIn("F", "major");
    const wrapper = mountKeyboard();

    expect(keyLabels(wrapper)).toEqual(["F4", "G4", "A4", "B♭4", "C5", "D5", "E5"]);
    expect(chordSymbols(wrapper)).toEqual(["F", "Gm", "Am", "Bb", "C", "Dm", "E°"]);
    const fourth = wrapper.findAll(".keyboard__row button")[3];
    expect(fourth.attributes("aria-label")).toContain("B flat four");
    expect(wrapper.text()).not.toMatch(/A#|A♯/);
    wrapper.unmount();
  });

  it("spells Eb major by flats from the stored D# key", () => {
    playIn("D#", "major");
    const wrapper = mountKeyboard();

    expect(keyLabels(wrapper)).toEqual(["E♭4", "F4", "G4", "A♭4", "B♭4", "C5", "D5"]);
    expect(chordSymbols(wrapper)).toEqual(["Eb", "Fm", "Gm", "Ab", "Bb", "Cm", "D°"]);
    const chordNames = wrapper.findAll(".keyboard__chord-row button")
      .map((chord) => chord.attributes("aria-label"));
    expect(chordNames[0]).toBe("E flat major chord");
    expect(wrapper.text()).not.toMatch(/[DGA]#|[DGA]♯/);
    wrapper.unmount();
  });
});
