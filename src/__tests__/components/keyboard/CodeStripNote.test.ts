import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Chord from "@/components/compounds/Chord.vue";
import CodeStripSequence from "@/components/uniques/CodeStrip/Sequence.vue";
import Note from "@/components/primatives/Note.vue";

vi.mock("@/composables/useMusicColor", async () => {
  const { staticNoteColorResolver } = await import("@/components/primatives/noteColorContext");
  return { useMusicColor: () => staticNoteColorResolver };
});

const chordMembers = [
  { syllable: "Do", rawPitch: "C4", scaleIndex: 0, progress: 1 },
  { syllable: "Mi", rawPitch: "E4", scaleIndex: 2, progress: .6 },
  { syllable: "Sol", rawPitch: "G4", scaleIndex: 4, progress: .2 },
];

describe("CodeStrip event rendering", () => {
  it("composes Note and Chord through their public sources", () => {
    const wrapper = mount(CodeStripSequence, {
      props: {
        tokens: [
          {
            type: "note",
            note: "mi",
            text: "3̂",
            glyph: "deg",
            lit: true,
            progress: .7,
            mode: "dorian",
            musicKey: "D",
            surfaceStyle: "monochrome",
            isAccidental: true,
            keyBrightness: .8,
            keySaturation: .7,
          },
          { type: "rest", duration: "@0.25", progress: .4 },
          { type: "chord", symbol: "C", members: chordMembers, display: "notes" },
          { type: "note", note: "sol", text: "G", glyph: "raw", accidental: "#" },
        ],
      },
    });

    const notes = wrapper.findAllComponents(Note);
    expect(notes).toHaveLength(5);
    expect(notes[0].props()).toMatchObject({
      primary: "degree",
      visibleLabels: ["degree"],
      proportion: "glyph",
      sounding: true,
      scaleIndex: 2,
      mode: "dorian",
      musicKey: "D",
      surfaceStyle: "monochrome",
      accidental: true,
      keyBrightness: .8,
      keySaturation: .7,
    });
    expect(notes[0].attributes("shape")).toBeUndefined();
    expect(wrapper.findComponent(Chord).props()).toMatchObject({
      display: "notes",
      symbol: "C",
      proportion: "compact",
    });
    expect(wrapper.find(".code-strip__accidental").text()).toBe("#");
    expect(wrapper.findAll("[data-code-strip-index]").map((event) => event.attributes("data-code-strip-index")))
      .toEqual(["0", "1", "2", "3"]);
  });

  it("colors a standalone borrowed note from its exact pitch class", () => {
    const wrapper = mount(CodeStripSequence, {
      props: {
        tokens: [{
          type: "note",
          note: "do",
          text: "D#4",
          glyph: "raw",
          rawPitch: "D#4",
          scaleIndex: -1,
          pitchClassIndex: 3,
          mode: "major",
          musicKey: "C",
          octave: 4,
          isAccidental: true,
          progress: 1,
        }],
      },
    });

    const note = wrapper.getComponent(Note);
    expect(note.props("pitchClassIndex")).toBe(3);
    const headColor = (note.element as HTMLElement).style.getPropertyValue("--note-surface");
    expect(headColor).not.toBe("");
    expect((wrapper.get(".code-strip__event").element as HTMLElement).style
      .getPropertyValue("--code-strip-sustain")).toBe(headColor);
  });

  it.each([0, .25, .75, 1])("keeps a long sustain in its head's colour at progress %s", async (progress) => {
    const token = { type: "note" as const, note: "mi" as const, text: "Mi", duration: "@3",
      mode: "dorian" as const, musicKey: "D" as const, octave: 5,
      keyBrightness: .8, keySaturation: .7, progress };
    const wrapper = mount(CodeStripSequence, { props: { tokens: [token, { type: "rest", duration: "@3", progress }] } });
    const paint = () => (wrapper.get(".code-strip__event--note").element as HTMLElement).style
      .getPropertyValue("--code-strip-sustain");
    const head = () => (wrapper.getComponent(Note).element as HTMLElement).style.getPropertyValue("--note-surface");
    expect(paint()).not.toBe("");
    expect(paint()).toBe(head());
    expect(wrapper.get(".code-strip__event--note .code-strip__duration-hold").exists()).toBe(true);
    expect(wrapper.get(".code-strip__event--rest").attributes("style")).toBeUndefined();
    const before = paint();
    await wrapper.setProps({ tokens: [{ ...token, pitchClassIndex: 3, scaleIndex: -1 }] });
    expect(paint()).toBe(head());
    expect(paint()).not.toBe(before);
    wrapper.unmount();
  });

  it.each(["symbol", "notes"] as const)("carries a %s chord's ordered member colours into its sustain", (display) => {
    const wrapper = mount(CodeStripSequence, { props: { tokens: [{ type: "chord", symbol: "C",
      display, duration: "@3", members: [
        { ...chordMembers[0], voicingOrder: 2, pressOrder: 1 },
        { ...chordMembers[1], voicingOrder: 0, pressOrder: 2 },
        { ...chordMembers[2], voicingOrder: 1, pressOrder: 0 },
      ] }] } });
    const members = wrapper.findAll(display === "symbol" ? ".chord__fused-member" : ".chord__cluster-member");
    const colors = members.map(member => (member.element as HTMLElement).style.getPropertyValue("--chord-member-surface"));
    expect(colors).toHaveLength(3);
    expect(new Set(colors).size).toBe(3);
    const sustain = (wrapper.get(".code-strip__event--chord").element as HTMLElement).style.getPropertyValue("--code-strip-sustain");
    expect(sustain).toBe(`linear-gradient(to top, ${colors.map((color, index) =>
      `${color} ${index / colors.length * 100}% ${(index + 1) / colors.length * 100}%`).join(", ")})`);
    wrapper.unmount();
  });

  it("keeps Rest local and controlled from Ink to Ivory", () => {
    const wrapper = mount(CodeStripSequence, {
      props: {
        tokens: [{ type: "rest", duration: "@0.5", progress: 1.4 }],
      },
    });

    expect(wrapper.find(".code-strip__rest-mark").text()).toBe("~");
    expect(wrapper.find(".code-strip__stack-duration").exists()).toBe(false);
    expect(wrapper.find(".code-strip__rest").attributes("style")).toContain("--code-strip-progress: 1");
    expect(wrapper.find(".code-strip__rest-fill").exists()).toBe(true);
  });

  it("always shows meter-aware duration bars", async () => {
    const wrapper = mount(CodeStripSequence, {
      props: {
        tokens: [{ type: "note", note: "do", text: "Do", duration: "@0.5" }],
      },
    });

    const bar = wrapper.get(".code-strip__duration-bar");
    expect(bar.element.parentElement?.classList.contains("code-strip__event-line")).toBe(true);
    expect(bar.attributes("style")).toContain("--code-strip-duration-ratio: 0.5");
    expect(wrapper.findAll(".code-strip__duration-mark")).toHaveLength(8);
    expect(wrapper.findAll(".code-strip__duration-mark--beat")).toHaveLength(2);

    await wrapper.setProps({ timeSignature: "3/4" });
    expect(wrapper.findAll(".code-strip__duration-mark")).toHaveLength(6);

    expect(wrapper.find(".code-strip__stack-duration").exists()).toBe(false);
    expect(wrapper.find(".code-strip__duration-bar").exists()).toBe(true);
  });

  it("shows meter-aware duration marks for Rest without printing its duration", () => {
    const wrapper = mount(CodeStripSequence, {
      props: {
        timeSignature: "4/4",
        tokens: [{ type: "rest", duration: "@0.25", progress: .4 }],
      },
    });

    expect(wrapper.find(".code-strip__stack-duration").exists()).toBe(false);
    expect(wrapper.get(".code-strip__duration-bar").element.parentElement?.classList.contains("code-strip__event-line")).toBe(true);
    expect(wrapper.get(".code-strip__duration-bar").attributes("style")).toContain("--code-strip-duration-ratio: 0.25");
    expect(wrapper.findAll(".code-strip__duration-mark")).toHaveLength(4);
    expect(wrapper.findAll(".code-strip__duration-mark--beat")).toHaveLength(1);
  });

  it("lights each Stave stem once playback enters its segment of the event's time", () => {
    const stemsLit = (wrapper: ReturnType<typeof mount>) => wrapper
      .findAll(".code-strip__duration-mark")
      .map((mark) => mark.classes("code-strip__duration-mark--lit"));

    const note = mount(CodeStripSequence, {
      props: {
        timeSignature: "4/4",
        tokens: [{ type: "note", note: "do", text: "Do", duration: "@0.25", progress: .6 }],
      },
    });
    // Four sixteenth segments at 60%: two passed and the third entered light; the fourth is ahead.
    expect(stemsLit(note)).toEqual([true, true, true, false]);

    // A chord's time passes with its members: here their mean progress is 0.6.
    const chord = mount(CodeStripSequence, {
      props: {
        timeSignature: "4/4",
        tokens: [{ type: "chord", symbol: "C", members: chordMembers, duration: "@0.125" }],
      },
    });
    expect(stemsLit(chord)).toEqual([true, true]);
  });

  it("visualizes an omitted base duration as one full bar", () => {
    const wrapper = mount(CodeStripSequence, {
      props: {
        timeSignature: "4/4",
        tokens: [{ type: "note", note: "do", text: "Do" }],
      },
    });

    const bar = wrapper.get(".code-strip__duration-bar");
    expect(bar.attributes("style")).toContain("--code-strip-duration-ratio: 1");
    expect(bar.attributes("aria-label")).toBe("Duration proportion: 1");
    expect(wrapper.findAll(".code-strip__duration-mark")).toHaveLength(16);
    expect(wrapper.findAll(".code-strip__duration-mark--beat")).toHaveLength(4);
    expect(wrapper.find(".code-strip__duration-overflow").exists()).toBe(false);
  });

  it("does not reinterpret an explicit zero duration as the implicit base", () => {
    const wrapper = mount(CodeStripSequence, {
      props: {
        tokens: [{ type: "note", note: "do", text: "Do", duration: "@0" }],
      },
    });

    expect(wrapper.get(".code-strip__duration-bar").attributes("style"))
      .toContain("--code-strip-duration-ratio: 0");
    expect(wrapper.findAll(".code-strip__duration-mark")).toHaveLength(0);
  });

  it("shows a length past one bar as a hold after its stems, never as a number", () => {
    const wrapper = mount(CodeStripSequence, {
      props: {
        tokens: [
          { type: "note", note: "do", text: "Do", duration: "@1.5" },
          { type: "note", note: "re", text: "Re", duration: "@2" },
          { type: "rest", duration: "@2.1449" },
          { type: "rest", duration: "@7" },
        ],
      },
    });

    // No duration figure anywhere on the line.
    expect(wrapper.text()).not.toMatch(/[0-9×]/);
    // The first bar is stems, as for any event; the bars past it are a hold.
    const bars = wrapper.findAll(".code-strip__duration-bar");
    expect(bars.map((bar) => bar.findAll(".code-strip__duration-mark").length)).toEqual([16, 16, 16, 16]);
    const holds = wrapper.findAll(".code-strip__duration-hold");
    expect(holds.map((hold) => (hold.element as HTMLElement).style.getPropertyValue("--code-strip-hold-bars")))
      .toEqual(["0.5", "1", String(2.1449 - 1), "4"]);
    // A barline marks each whole bar held, up to the rail's cap.
    expect(holds.map((hold) => hold.findAll(".code-strip__duration-hold-bar").length)).toEqual([0, 1, 1, 4]);
    // Longer than the rail can show: it fades out at its end instead of growing.
    expect(holds.map((hold) => hold.classes("code-strip__duration-hold--fades"))).toEqual([false, false, false, true]);
    expect(bars.map((bar) => bar.attributes("aria-label"))).toEqual([
      "Duration proportion: 1.5",
      "Duration proportion: 2",
      "Duration proportion: 2.14",
      "Duration proportion: 7",
    ]);
  });

  it("lights a long event's stems over its first bar and its hold over the rest", () => {
    const at = (progress: number) => {
      const wrapper = mount(CodeStripSequence, {
        props: {
          tokens: [{ type: "note", note: "do", text: "Do", duration: "@2", progress }],
        },
      });
      const hold = wrapper.get(".code-strip__duration-hold");
      return {
        stems: wrapper.findAll(".code-strip__duration-mark--lit").length,
        hold: Number((hold.element as HTMLElement).style.getPropertyValue("--code-strip-hold-progress")),
        barline: hold.get(".code-strip__duration-hold-bar").classes("code-strip__duration-hold-bar--lit"),
      };
    };

    expect(at(0.25)).toEqual({ stems: 8, hold: 0, barline: false });
    expect(at(0.75)).toEqual({ stems: 16, hold: 0.5, barline: false });
    expect(at(1)).toEqual({ stems: 16, hold: 1, barline: true });
  });

  it("exposes density without changing notation anatomy", async () => {
    const wrapper = mount(CodeStripSequence, {
      props: {
        density: "dense",
        tokens: [{ type: "note", note: "do", text: "Do" }],
      },
    });

    expect(wrapper.classes()).toContain("code-strip-sequence--dense");
    expect(wrapper.findAllComponents(Note)).toHaveLength(1);

    await wrapper.setProps({ density: "spaced" });
    expect(wrapper.classes()).toContain("code-strip-sequence--spaced");
    expect(wrapper.findAllComponents(Note)).toHaveLength(1);
  });

  it("exposes a production scroll surface without changing the default specimen", () => {
    const clipped = mount(CodeStripSequence, {
      props: { tokens: [{ type: "note", note: "do", text: "Do" }] },
    });
    const scrollable = mount(CodeStripSequence, {
      props: {
        scrollable: true,
        tokens: [{ type: "note", note: "do", text: "Do" }],
      },
    });

    expect(clipped.classes()).not.toContain("code-strip-sequence--scrollable");
    expect(scrollable.classes()).toContain("code-strip-sequence--scrollable");
  });
});
