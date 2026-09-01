import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Chord from "@/components/compounds/Chord.vue";
import type { ChordMember } from "@/components/compounds/Chord.vue";
import Note from "@/components/primatives/Note.vue";
import chordSource from "@/components/compounds/Chord.vue?raw";
import noteSource from "@/components/primatives/Note.vue?raw";
import specimenSource from "@/style-guide/compounds/CompoundChord.vue?raw";
import styleGuideSource from "@/style-guide/StyleGuide.vue?raw";

const mocks = vi.hoisted(() => ({
  getKeyBackground: vi.fn((scaleIndex: number) => ({
    background: `member-surface-${scaleIndex}`,
    primaryColor: `member-primary-${scaleIndex}`,
  })),
}));

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    getKeyBackground: mocks.getKeyBackground,
  }),
}));

const triad: ChordMember[] = [
  {
    id: "c4",
    syllable: "Do",
    degree: "I",
    rawPitch: "C4",
    primary: "raw",
    scaleIndex: 0,
    pitchClassIndex: 0,
    octave: 4,
    progress: .25,
  },
  {
    id: "e4",
    syllable: "Mi",
    degree: "III",
    rawPitch: "E4",
    primary: "raw",
    scaleIndex: 2,
    pitchClassIndex: 4,
    octave: 4,
    progress: .5,
  },
  {
    id: "g4",
    syllable: "Sol",
    degree: "V",
    rawPitch: "G4",
    primary: "raw",
    scaleIndex: 4,
    pitchClassIndex: 7,
    octave: 4,
    progress: .75,
  },
];

describe("Chord compound", () => {
  beforeEach(() => {
    mocks.getKeyBackground.mockClear();
  });

  it("couples chord symbols to fused surfaces and note identities to clusters", () => {
    const symbol = mount(Chord, {
      props: { members: triad, display: "symbol", symbol: "C" },
    });
    const notes = mount(Chord, {
      props: { members: triad, display: "notes", symbol: "C" },
    });

    expect(symbol.attributes("data-display")).toBe("symbol");
    expect(symbol.find(".chord__fused").exists()).toBe(true);
    expect(symbol.findAllComponents(Note)).toHaveLength(0);
    expect(symbol.get(".chord__symbol").text()).toBe("C");

    expect(notes.attributes("data-display")).toBe("notes");
    expect(notes.find(".chord__fused").exists()).toBe(false);
    expect(notes.find(".chord__symbol").exists()).toBe(false);
    expect(notes.findAllComponents(Note)).toHaveLength(3);

    expect(chordSource).not.toContain("ChordStructure");
    expect(chordSource).not.toContain("ChordIdentity");
    expect(chordSource).not.toContain("chord__member-label");
  });

  it("composes zero-gap glyph Notes and shares the Note geometry family", () => {
    const wrapper = mount(Chord, {
      props: {
        members: triad,
        display: "notes",
        symbol: "C",
        geometry: "tab",
        proportion: "compact",
      },
    });
    const notes = wrapper.findAllComponents(Note);

    expect(wrapper.attributes()).toMatchObject({
      "data-display": "notes",
      "data-proportion": "compact",
      "data-geometry": "tab",
    });
    expect(wrapper.classes()).toContain("chord--geometry-tab");
    expect(notes).toHaveLength(3);
    expect(notes.map((note) => note.props("proportion"))).toEqual([
      "glyph",
      "glyph",
      "glyph",
    ]);
    expect(notes.map((note) => note.props("geometry"))).toEqual([
      "tab",
      "tab",
      "tab",
    ]);
    expect(notes[1].props()).toMatchObject({
      rawPitch: "E4",
      primary: "raw",
      visibleLabels: ["raw"],
      scaleIndex: 2,
      pitchClassIndex: 4,
      octave: 4,
    });
    expect(chordSource).toContain("gap: 0");
    expect(chordSource).not.toContain("note__label note__label");
  });

  it("reveals unchanged music color upward from Ink with clamped progress", () => {
    const members: ChordMember[] = [
      { ...triad[0], progress: -.25 },
      { ...triad[1], progress: .375 },
      { ...triad[2], progress: 1.4 },
      { ...triad[0], id: "not-a-number", progress: Number.NaN },
    ];
    const fused = mount(Chord, {
      props: { members, display: "symbol", symbol: "C7" },
    });
    const memberStyles = fused
      .findAll(".chord__fused-member")
      .map((member) => member.attributes("style"));

    expect(memberStyles[0]).toContain("--chord-member-progress: 0");
    expect(memberStyles[1]).toContain("--chord-member-progress: 0.375");
    expect(memberStyles[2]).toContain("--chord-member-progress: 1");
    expect(memberStyles[3]).toContain("--chord-member-progress: 0");
    expect(memberStyles[1]).toContain("--chord-member-surface: member-surface-2");
    expect(mocks.getKeyBackground).toHaveBeenCalledTimes(4);

    const clustered = mount(Chord, {
      props: { members, display: "notes", symbol: "C7" },
    });
    expect(clustered.findAll(".chord__cluster-member")[1].attributes("style"))
      .toContain("--chord-member-progress: 0.375");

    expect(chordSource).toContain("background: var(--ink)");
    expect(chordSource).toContain("transform: scaleY(var(--chord-member-progress))");
    expect(chordSource).toContain("transform: scaleY(calc(1 - var(--chord-member-progress)))");
    expect(chordSource).toContain("transition: transform 72ms linear");
    expect(chordSource).not.toContain("color-mix");
  });

  it("consumes one shared paper material recipe without changing Note styling", () => {
    expect(noteSource).toContain("background: var(--paper-surface-sheen)");
    expect(chordSource).toContain("background: var(--paper-surface-sheen)");
    expect(chordSource).toContain("clip-path: var(--chord-clip)");
    expect(chordSource).toContain("box-shadow: var(--shadow-key)");
    expect(chordSource).toContain("font-size: clamp(17px");
  });

  it("is a named noninteractive group with inert visual descendants", () => {
    const wrapper = mount(Chord, {
      props: {
        members: triad,
        display: "notes",
        symbol: "C",
        accessibleName: "C major chord",
      },
    });

    expect(wrapper.attributes("role")).toBe("group");
    expect(wrapper.attributes("aria-label")).toBe("C major chord");
    expect(wrapper.attributes("tabindex")).toBeUndefined();
    expect(wrapper.get(".chord__cluster").attributes("aria-hidden")).toBe("true");
    expect(wrapper.find("button, input, [tabindex], [aria-pressed]").exists()).toBe(false);
    expect(wrapper.emitted()).toEqual({});
  });

  it("mounts a real-source specimen with the corrected display and motion matrix", () => {
    expect(styleGuideSource).toContain('id="compound-chord"');
    expect(styleGuideSource).toContain('import CompoundChord from "./compounds/CompoundChord.vue"');
    expect(specimenSource).toContain('import Chord from "@/components/compounds/Chord.vue"');
    expect(specimenSource).toContain("Whole-surface geometry");
    expect(specimenSource).toContain("Ink → music-color progress");
    expect(specimenSource).toContain("Simultaneous attack");
    expect(specimenSource).toContain("Rolled attack");
    expect(specimenSource).toContain("Staggered release");
    expect(specimenSource).not.toContain('identity="members"');
    expect(specimenSource).not.toContain('structure="fused"');
    expect(specimenSource).toContain("window.requestAnimationFrame");
    expect(specimenSource).toContain("window.cancelAnimationFrame");
    expect(specimenSource).toContain('window.matchMedia("(prefers-reduced-motion: reduce)")');
    expect(chordSource).not.toContain("requestAnimationFrame");
  });
});
