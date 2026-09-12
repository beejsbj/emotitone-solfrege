import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import Note from "@/components/primatives/Note.vue";
import { staticNoteColorResolver } from "@/components/primatives/noteColorContext";
import Sequence from "@/components/uniques/CodeStrip/Sequence.vue";
import PerformanceDeckPage from "@/style-guide/PerformanceDeckPage.vue";
import styleGuideSource from "@/style-guide/StyleGuide.vue?raw";

vi.mock("@/components/PerformanceDeck.vue", () => ({
  default: {
    name: "PerformanceDeck",
    props: [
      "patterns",
      "selectedPatternId",
      "patternEntrySignal",
      "codeStripTokens",
      "keyValue",
      "modeValue",
      "bpm",
      "octave",
      "playMode",
      "rowCount",
      "keyboardRows",
    ],
    emits: [
      "patternCopy",
      "patternDelete",
      "patternRename",
      "patternCommit",
      "patternOpenStrudel",
      "togglePlayback",
      "backspace",
      "return",
      "rowCountChange",
      "keyboardPress",
      "keyboardRelease",
      "chordPress",
      "chordRelease",
      "harmonyEffective",
      "update:drawerOpen",
      "update:keyValue",
      "update:modeValue",
      "update:bpm",
      "update:octave",
      "update:playMode",
      "update:harmonyValue",
    ],
    template: '<div data-testid="performance-deck" />',
  },
}));

describe("PerformanceDeck guide fixtures", () => {
  it("registers PerformanceDeck in the Compositions sink section", () => {
    const compositions = styleGuideSource.indexOf('id="compositions-heading"');
    const performanceDeck = styleGuideSource.indexOf('id="composition-performance-deck"');

    expect(compositions).toBeGreaterThan(-1);
    expect(performanceDeck).toBeGreaterThan(compositions);
  });

  it("models Return as a saved take plus an entering empty Current Take", async () => {
    const wrapper = mount(PerformanceDeckPage);
    const deck = wrapper.getComponent({ name: "PerformanceDeck" });

    expect(deck.props("patternEntrySignal")).toBe(0);
    deck.vm.$emit("patternCommit", "after-rain", "tap");
    await wrapper.vm.$nextTick();
    expect(deck.props("selectedPatternId")).toBe("after-rain");

    deck.vm.$emit("return");
    await wrapper.vm.$nextTick();

    expect(deck.props("patternEntrySignal")).toBe(1);
    expect(deck.props("selectedPatternId")).toBe("current");
    expect(deck.props("codeStripTokens")).toEqual([]);
    expect(deck.props("patterns").at(-2)).toMatchObject({
      id: "take-1",
      name: "Take 1",
      rootLabel: "F♯4",
      musicKey: "F#",
      mode: "dorian",
      bpm: 92,
      octave: 4,
      canDelete: true,
      canRename: true,
    });
    const current = deck.props("patterns").at(-1);
    expect(current).toMatchObject({
      id: "current",
      name: "Current Take",
      rootLabel: "F♯4",
      musicKey: "F#",
      mode: "dorian",
      bpm: 92,
      octave: 4,
      barTape: [],
      codeStripTokens: [],
      canCopy: false,
    });
    expect(current.spine).toBe(
      staticNoteColorResolver.getKeyBackgroundByPitchClass(
        6,
        "dorian",
        "F#",
        4,
        "colored",
        true,
      ).primaryColor,
    );

    deck.vm.$emit("patternCommit", "take-1", "tap");
    deck.vm.$emit("patternCommit", "current", "tap");
    await wrapper.vm.$nextTick();
    expect(deck.props("keyValue")).toBe("F#");
    expect(deck.props("modeValue")).toBe("dorian");
    expect(deck.props("bpm")).toBe(92);
    expect(deck.props("octave")).toBe(4);
    wrapper.unmount();
  });

  it("loads each selected fixture's CodeStrip and musical context", async () => {
    const wrapper = mount(PerformanceDeckPage);
    const deck = wrapper.getComponent({ name: "PerformanceDeck" });

    deck.vm.$emit("patternCommit", "after-rain", "tap");
    await wrapper.vm.$nextTick();

    expect(deck.props("selectedPatternId")).toBe("after-rain");
    expect(deck.props("codeStripTokens")).toMatchObject([
      { type: "note", rawPitch: "F#4", pitchClassIndex: 6, octave: 4, mode: "dorian", musicKey: "F#" },
      { type: "note", rawPitch: "A4", pitchClassIndex: 9, octave: 4, mode: "dorian", musicKey: "F#" },
      { type: "note", rawPitch: "C#5", pitchClassIndex: 1, octave: 5, mode: "dorian", musicKey: "F#" },
    ]);
    expect(deck.props("keyValue")).toBe("F#");
    expect(deck.props("modeValue")).toBe("dorian");
    expect(deck.props("bpm")).toBe(92);
    expect(deck.props("octave")).toBe(4);
    const fSharpFourRow = deck.props("keyboardRows").find(
      (row: { octave: number }) => row.octave === 4,
    );
    expect(fSharpFourRow.keys[4]).toMatchObject({
      rawPitch: "C#5",
      pitchClassIndex: 1,
      colorOctave: 5,
      mode: "dorian",
      musicKey: "F#",
    });

    const sequence = mount(Sequence, {
      props: {
        tokens: deck.props("codeStripTokens"),
        colorResolver: staticNoteColorResolver,
      },
    });
    let notes = sequence.findAllComponents(Note);
    expect(notes.map((note) => ({
      rawPitch: note.props("rawPitch"),
      pitchClassIndex: note.props("pitchClassIndex"),
      octave: note.props("octave"),
      mode: note.props("mode"),
      musicKey: note.props("musicKey"),
    }))).toEqual([
      { rawPitch: "F#4", pitchClassIndex: 6, octave: 4, mode: "dorian", musicKey: "F#" },
      { rawPitch: "A4", pitchClassIndex: 9, octave: 4, mode: "dorian", musicKey: "F#" },
      { rawPitch: "C#5", pitchClassIndex: 1, octave: 5, mode: "dorian", musicKey: "F#" },
    ]);
    expect(notes[2].attributes("style")).toContain(
      staticNoteColorResolver.getKeyBackgroundByPitchClass(
        1,
        "dorian",
        "F#",
        5,
        "colored",
        true,
      ).primaryColor,
    );

    deck.vm.$emit("patternCommit", "late-train", "tap");
    await wrapper.vm.$nextTick();
    await sequence.setProps({ tokens: deck.props("codeStripTokens") });
    notes = sequence.findAllComponents(Note);
    expect(notes.map((note) => ({
      rawPitch: note.props("rawPitch"),
      pitchClassIndex: note.props("pitchClassIndex"),
      octave: note.props("octave"),
      mode: note.props("mode"),
      musicKey: note.props("musicKey"),
    }))).toEqual([
      { rawPitch: "D3", pitchClassIndex: 2, octave: 3, mode: "minor", musicKey: "D" },
      { rawPitch: "F3", pitchClassIndex: 5, octave: 3, mode: "minor", musicKey: "D" },
      { rawPitch: "A3", pitchClassIndex: 9, octave: 3, mode: "minor", musicKey: "D" },
    ]);
    expect(notes[0].attributes("style")).toContain(
      staticNoteColorResolver.getKeyBackgroundByPitchClass(
        2,
        "minor",
        "D",
        3,
        "colored",
        false,
      ).primaryColor,
    );
    sequence.unmount();
  });

  it("clears Current when an emptied loaded fixture starts a new take", async () => {
    const wrapper = mount(PerformanceDeckPage);
    const deck = wrapper.getComponent({ name: "PerformanceDeck" });

    deck.vm.$emit("patternCommit", "after-rain", "tap");
    await wrapper.vm.$nextTick();
    for (let event = 0; event < 3; event += 1) deck.vm.$emit("backspace");
    deck.vm.$emit("return");
    await wrapper.vm.$nextTick();

    expect(deck.props("selectedPatternId")).toBe("current");
    expect(deck.props("codeStripTokens")).toEqual([]);
    expect(deck.props("patterns").at(-1)).toMatchObject({
      id: "current",
      barTape: [],
      codeStripTokens: [],
      canCopy: false,
    });
  });

  it("keeps Current and saved Bar Tape aligned with partial CodeStrip edits", async () => {
    const wrapper = mount(PerformanceDeckPage);
    const deck = wrapper.getComponent({ name: "PerformanceDeck" });

    deck.vm.$emit("backspace");
    await wrapper.vm.$nextTick();
    const editedCurrent = deck.props("patterns").at(-1);
    expect(editedCurrent).toMatchObject({
      id: "current",
      codeStripTokens: [
        { type: "note", rawPitch: "C4" },
        { type: "note", rawPitch: "E4" },
        { type: "rest" },
      ],
      barTape: [
        { durationMs: 250 },
        { durationMs: 125 },
      ],
    });
    expect(editedCurrent.barTape.map((segment: { color: string }) => segment.color)).toEqual([
      staticNoteColorResolver.getKeyBackgroundByPitchClass(
        0,
        "major",
        "C",
        4,
        "colored",
        false,
      ).primaryColor,
      staticNoteColorResolver.getKeyBackgroundByPitchClass(
        4,
        "major",
        "C",
        4,
        "colored",
        false,
      ).primaryColor,
    ]);

    deck.vm.$emit("patternCommit", "after-rain", "tap");
    deck.vm.$emit("backspace");
    deck.vm.$emit("return");
    await wrapper.vm.$nextTick();

    const saved = deck.props("patterns").find(
      (pattern: { id: string }) => pattern.id === "take-1",
    );
    expect(saved).toMatchObject({
      codeStripTokens: [
        { type: "note", rawPitch: "F#4" },
        { type: "note", rawPitch: "A4" },
      ],
      barTape: [
        { durationMs: 250 },
        { durationMs: 125 },
      ],
    });
    expect(saved.barTape.map((segment: { color: string }) => segment.color)).toEqual([
      staticNoteColorResolver.getKeyBackgroundByPitchClass(
        6,
        "dorian",
        "F#",
        4,
        "colored",
        true,
      ).primaryColor,
      staticNoteColorResolver.getKeyBackgroundByPitchClass(
        9,
        "dorian",
        "F#",
        4,
        "colored",
        false,
      ).primaryColor,
    ]);
    wrapper.unmount();
  });

  it("keeps copied pattern identities unique across delete and recopy", async () => {
    const wrapper = mount(PerformanceDeckPage);
    const deck = wrapper.getComponent({ name: "PerformanceDeck" });

    deck.vm.$emit("patternCopy", "after-rain");
    await wrapper.vm.$nextTick();
    const firstCopy = deck.props("patterns").find(
      (pattern: { id: string }) => pattern.id.startsWith("after-rain-copy-"),
    );

    deck.vm.$emit("patternDelete", firstCopy.id);
    await wrapper.vm.$nextTick();
    deck.vm.$emit("patternDelete", firstCopy.id);
    deck.vm.$emit("patternCopy", "after-rain");
    await wrapper.vm.$nextTick();

    const ids = deck.props("patterns").map((pattern: { id: string }) => pattern.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(firstCopy.id);
    wrapper.unmount();
  });

  it("does not copy an armed deletion state", async () => {
    const wrapper = mount(PerformanceDeckPage);
    const deck = wrapper.getComponent({ name: "PerformanceDeck" });

    deck.vm.$emit("patternDelete", "after-rain");
    await wrapper.vm.$nextTick();
    expect(deck.props("patterns").find(
      (pattern: { id: string }) => pattern.id === "after-rain",
    )).toMatchObject({ deleteArmed: true });

    deck.vm.$emit("patternCopy", "after-rain");
    await wrapper.vm.$nextTick();
    const copy = deck.props("patterns").find(
      (pattern: { id: string }) => pattern.id.startsWith("after-rain-copy-"),
    );
    expect(copy).toMatchObject({ deleteArmed: false });
  });

  it("drives the controlled row-count target from the specimen selector", async () => {
    const wrapper = mount(PerformanceDeckPage);
    const deck = wrapper.getComponent({ name: "PerformanceDeck" });

    await wrapper.get("select").setValue("5");

    expect(deck.props("rowCount")).toBe(5);
  });

  it("keeps first-tap deletion armed and accepts predecessor-first confirmation", async () => {
    const wrapper = mount(PerformanceDeckPage);
    const deck = wrapper.getComponent({ name: "PerformanceDeck" });

    deck.vm.$emit("patternCommit", "late-train", "tap");
    deck.vm.$emit("patternDelete", "late-train");
    await wrapper.vm.$nextTick();

    expect(deck.props("selectedPatternId")).toBe("late-train");
    expect(deck.props("patterns").find(
      (pattern: { id: string }) => pattern.id === "late-train",
    )).toMatchObject({ deleteArmed: true });

    deck.vm.$emit("patternCommit", "after-rain", "tap");
    deck.vm.$emit("patternDelete", "late-train");
    await wrapper.vm.$nextTick();

    expect(deck.props("selectedPatternId")).toBe("after-rain");
    expect(deck.props("patterns").some(
      (pattern: { id: string }) => pattern.id === "late-train",
    )).toBe(false);
    wrapper.unmount();
  });
});
