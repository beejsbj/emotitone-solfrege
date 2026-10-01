import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Chord from "@/components/compounds/Chord.vue";
import type { ChordMember } from "@/components/compounds/Chord.vue";
import Note from "@/components/primatives/Note.vue";
import chordSource from "@/components/compounds/Chord.vue?raw";
import noteSource from "@/components/primatives/Note.vue?raw";
import specimenSource from "@/style-guide/compounds/CompoundChord.vue?raw";
import guideCatalogSource from "@/style-guide/guideCatalog.ts?raw";
import { guideLayer } from "@/style-guide/guideCatalog";

const mocks = vi.hoisted(() => ({
  getKeyBackground: vi.fn((scaleIndex: number) => ({
    background: `member-surface-${scaleIndex}`,
    primaryColor: `member-primary-${scaleIndex}`,
  })),
  getKeyBackgroundByPitchClass: vi.fn((pitchClassIndex: number) => ({
    background: `member-pitch-surface-${pitchClassIndex}`,
    primaryColor: `member-pitch-primary-${pitchClassIndex}`,
  })),
}));

vi.mock("@/composables/useMusicColor", () => ({
  useMusicColor: () => ({
    getKeyBackground: mocks.getKeyBackground,
    getKeyBackgroundByPitchClass: mocks.getKeyBackgroundByPitchClass,
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
    mocks.getKeyBackgroundByPitchClass.mockClear();
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
    expect(
      (fused.findAll(".chord__fused-member")[1].element as HTMLElement).style
        .getPropertyValue("--chord-member-surface"),
    ).toBe("member-pitch-primary-4");
    expect(memberStyles.join(" ")).not.toContain("gradient");
    expect(mocks.getKeyBackgroundByPitchClass).toHaveBeenCalledTimes(4);

    const clustered = mount(Chord, {
      props: { members, display: "notes", symbol: "C7" },
    });
    expect(clustered.findAll(".chord__cluster-member")[1].attributes("style"))
      .toContain("--chord-member-progress: 0.375");

    expect(chordSource).toContain("background: var(--ink)");
    expect(chordSource).toContain("clip-path: inset(calc((1 - var(--chord-member-progress)) * 100%) 0 0)");
    expect(chordSource).toContain("transform: scaleY(calc(1 - var(--chord-member-progress)))");
    expect(chordSource).toContain("transition: transform var(--dur-press) linear");
    expect(chordSource).not.toContain("color-mix(in srgb");
    expect(chordSource).not.toContain("linear-gradient");
  });

  it("uses voicing order for fused bands and press order for clustered Notes", () => {
    const voicing = [
      { ...triad[0], voicingOrder: 0, pressOrder: 2, progress: .15 },
      { ...triad[1], voicingOrder: 1, pressOrder: 0, progress: .9 },
      { ...triad[2], voicingOrder: 2, pressOrder: 1, progress: .45 },
    ];
    const fused = mount(Chord, {
      props: { members: voicing, display: "symbol", symbol: "C" },
    });
    const clustered = mount(Chord, {
      props: { members: voicing, display: "notes", symbol: "C/G" },
    });

    const fusedMembers = fused.findAll(".chord__fused-member")
      .map((member) => member.element as HTMLElement);
    const fusedProp = (name: string) => fusedMembers
      .map((member) => member.style.getPropertyValue(name));
    expect(fusedProp("--chord-member-surface")).toEqual([
      "member-pitch-primary-0",
      "member-pitch-primary-4",
      "member-pitch-primary-7",
    ]);
    expect(fusedProp("--chord-member-progress")).toEqual(["0.15", "0.9", "0.45"]);
    expect(fusedProp("--chord-member-rotation")).toEqual(["-3deg", "0deg", "3deg"]);
    expect(clustered.findAllComponents(Note).map((note) => note.props("rawPitch"))).toEqual([
      "E4",
      "G4",
      "C4",
    ]);
    expect(clustered.findAll(".chord__cluster-member").map((member) => member.attributes("style")))
      .toEqual([
        "--chord-member-surface: member-pitch-surface-4; --chord-member-progress: 0.9;",
        "--chord-member-surface: member-pitch-surface-7; --chord-member-progress: 0.45;",
        "--chord-member-surface: member-pitch-surface-0; --chord-member-progress: 0.15;",
      ]);
  });

  it("re-fans bands and keeps independent progress when membership or order changes", async () => {
    const wrapper = mount(Chord, {
      props: { members: triad, display: "symbol", symbol: "C" },
    });
    const read = () => wrapper.findAll(".chord__fused-member").map((member) => {
      const style = (member.element as HTMLElement).style;
      return {
        surface: style.getPropertyValue("--chord-member-surface"),
        progress: style.getPropertyValue("--chord-member-progress"),
        rotation: style.getPropertyValue("--chord-member-rotation"),
        progressInBand: member.findAll(".chord__fused-progress > .chord__fused-band").length,
      };
    });

    expect(read().map((member) => member.rotation)).toEqual(["-3deg", "0deg", "3deg"]);

    const seventh: ChordMember = {
      ...triad[0],
      id: "b4",
      rawPitch: "B4",
      scaleIndex: 6,
      pitchClassIndex: 11,
      progress: .6,
    };
    await wrapper.setProps({ members: [triad[0], triad[1], triad[2], seventh] });
    expect(read()).toEqual([
      { surface: "member-pitch-primary-0", progress: "0.25", rotation: "-4.5deg", progressInBand: 1 },
      { surface: "member-pitch-primary-4", progress: "0.5", rotation: "-1.5deg", progressInBand: 1 },
      { surface: "member-pitch-primary-7", progress: "0.75", rotation: "1.5deg", progressInBand: 1 },
      { surface: "member-pitch-primary-11", progress: "0.6", rotation: "4.5deg", progressInBand: 1 },
    ]);

    // Reorder and change one member's progress: tilt follows position, progress follows the member.
    await wrapper.setProps({
      members: [triad[2], { ...triad[0], progress: .1 }, seventh, triad[1]],
    });
    expect(read()).toEqual([
      { surface: "member-pitch-primary-7", progress: "0.75", rotation: "-4.5deg", progressInBand: 1 },
      { surface: "member-pitch-primary-0", progress: "0.1", rotation: "-1.5deg", progressInBand: 1 },
      { surface: "member-pitch-primary-11", progress: "0.6", rotation: "1.5deg", progressInBand: 1 },
      { surface: "member-pitch-primary-4", progress: "0.5", rotation: "4.5deg", progressInBand: 1 },
    ]);

    // Clustered Notes never take a fan tilt.
    await wrapper.setProps({ display: "notes" });
    expect(wrapper.find(".chord__fused-band").exists()).toBe(false);
    expect(wrapper.findAll(".chord__cluster-member").every(
      (member) => (member.element as HTMLElement).style.getPropertyValue("--chord-member-rotation") === "",
    )).toBe(true);
  });

  it("keeps the flat fused face cut while clustered Notes retain their material", () => {
    expect(noteSource).toContain("background: var(--paper-surface-sheen)");
    expect(chordSource).not.toContain(".chord__fused::after");
    expect(chordSource).toContain("clip-path: var(--chord-geometry-override-clip, var(--chord-clip))");
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

  it("guards guide registration, removed identity/structure props, reduced-motion and animation ownership", () => {
    // Structural guard: style guide adoption contract pinning guide-only animation ownership,
    // retired props removal, and reduced-motion boundary
    expect(guideLayer("compounds")?.units.map((unit) => unit.id)).toContain("chord");
    expect(guideCatalogSource).toContain('import("./compounds/CompoundChord.vue")');
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
