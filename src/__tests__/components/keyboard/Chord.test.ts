import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Chord from "@/components/compounds/Chord.vue";
import type { ChordMember } from "@/components/compounds/Chord.vue";
import Note from "@/components/primatives/Note.vue";
import chordSource from "@/components/compounds/Chord.vue?raw";
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

  it("surfaces the structure, identity, and responsive proportion axes", () => {
    const combinations = [
      ["fused", "symbol", "compact"],
      ["fused", "members", "balanced"],
      ["clustered", "symbol", "wide"],
      ["clustered", "members", "compact"],
    ] as const;

    for (const [structure, identity, proportion] of combinations) {
      const wrapper = mount(Chord, {
        props: { members: triad, structure, identity, proportion, symbol: "C" },
      });

      expect(wrapper.attributes()).toMatchObject({
        "data-structure": structure,
        "data-identity": identity,
        "data-proportion": proportion,
      });
      expect(wrapper.classes()).toContain(`chord--${structure}`);
      expect(wrapper.classes()).toContain(`chord--identity-${identity}`);
      expect(wrapper.classes()).toContain(`chord--proportion-${proportion}`);
    }

    expect(chordSource).toContain("--chord-block-size");
    expect(chordSource).toContain("--chord-member-inline-size");
  });

  it("composes real zero-gap Note instances for clustered structure", () => {
    const wrapper = mount(Chord, {
      props: {
        members: triad,
        structure: "clustered",
        identity: "members",
        symbol: "C",
      },
    });
    const notes = wrapper.findAllComponents(Note);

    expect(notes).toHaveLength(3);
    expect(notes.map((note) => note.props("proportion"))).toEqual([
      "glyph",
      "glyph",
      "glyph",
    ]);
    expect(notes[1].props()).toMatchObject({
      syllable: "Mi",
      degree: "III",
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

  it("derives independent member colors and clamps controlled progress to 0–1", () => {
    const members: ChordMember[] = [
      { ...triad[0], progress: -.25 },
      { ...triad[1], progress: .375 },
      { ...triad[2], progress: 1.4 },
      { ...triad[0], id: "not-a-number", progress: Number.NaN },
    ];
    const wrapper = mount(Chord, {
      props: { members, structure: "fused", identity: "members", symbol: "C7" },
    });
    const memberStyles = wrapper
      .findAll(".chord__fused-member")
      .map((member) => member.attributes("style"));

    expect(memberStyles[0]).toContain("--chord-member-progress: 0%");
    expect(memberStyles[1]).toContain("--chord-member-progress: 37.5%");
    expect(memberStyles[2]).toContain("--chord-member-progress: 100%");
    expect(memberStyles[3]).toContain("--chord-member-progress: 0%");
    expect(memberStyles[1]).toContain("--chord-member-surface: member-surface-2");
    expect(memberStyles[2]).toContain("--chord-member-primary: member-primary-4");
    expect(mocks.getKeyBackground).toHaveBeenCalledTimes(4);

    const clustered = mount(Chord, {
      props: { members, structure: "clustered", identity: "members", symbol: "C7" },
    });
    expect(clustered.findAll(".chord__cluster-member")[1].attributes("style"))
      .toContain("--chord-member-progress: 37.5%");
    expect(chordSource).toContain("transition: height 72ms linear");
    expect(chordSource).toContain("transition: background-size 72ms linear");
  });

  it("is a named noninteractive group with inert visual descendants", () => {
    const wrapper = mount(Chord, {
      props: {
        members: triad,
        structure: "clustered",
        identity: "symbol",
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

  it("mounts a real-source specimen with the full accepted matrix", () => {
    expect(styleGuideSource).toContain('id="compound-chord"');
    expect(styleGuideSource).toContain('import CompoundChord from "./compounds/CompoundChord.vue"');
    expect(specimenSource).toContain('import Chord from "@/components/compounds/Chord.vue"');
    expect(specimenSource).toContain("Structure × identity");
    expect(specimenSource).toContain("Responsive proportion");
    expect(specimenSource).toContain("Simultaneous attack");
    expect(specimenSource).toContain("Rolled attack");
    expect(specimenSource).toContain("Staggered release");
    expect(specimenSource).toContain("Distinct partial progress");
    expect(specimenSource).toContain("window.requestAnimationFrame");
    expect(specimenSource).toContain("window.cancelAnimationFrame");
    expect(specimenSource).toContain('window.matchMedia("(prefers-reduced-motion: reduce)")');
    expect(chordSource).not.toContain("requestAnimationFrame");
  });
});
