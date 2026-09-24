import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { showMiniLocations } from "@strudel/codemirror";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  codeStripStrudelExtension,
  codeStripStrudelExtensionWithPresentation,
  type CodeStripPresentation,
  parseCodeStripEvents,
  setCodeStripPlaying,
  updateCodeStripPresentation,
} from "@/components/uniques/CodeStrip/strudelExtension";
import type { CodeStripToken } from "@/components/uniques/CodeStrip/types";
import { CodeStripViewport } from "@/components/uniques/CodeStrip/viewport";

vi.mock("@strudel/codemirror", async () => {
  const { StateEffect } = await import("@codemirror/state");
  return {
    showMiniLocations: StateEffect.define(),
    setMiniLocations: StateEffect.define(),
  };
});

vi.mock("@strudel/core", () => ({
  isNote: (value: string) => /^[a-g](?:[#bsf]+)?\d$/i.test(value),
}));

vi.mock("@/data", () => ({
  CHROMATIC_NOTES: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
  ...(() => {
    const scaleData: Record<string, { intervalNames: string[]; intervals: number[] }> = {
      major: {
        intervalNames: ["1P", "2M", "3M", "4P", "5P", "6M", "7M"],
        intervals: [0, 2, 4, 5, 7, 9, 11],
      },
      minor: {
        intervalNames: ["1P", "2M", "3m", "4P", "5P", "6m", "7m"],
        intervals: [0, 2, 3, 5, 7, 8, 10],
      },
      "major pentatonic": {
        intervalNames: ["1P", "2M", "3M", "5P", "6M"],
        intervals: [0, 2, 4, 7, 9],
      },
      "major blues": {
        intervalNames: ["1P", "2M", "3m", "3M", "5P", "6M"],
        intervals: [0, 2, 3, 4, 7, 9],
      },
      chromatic: {
        intervalNames: ["1P", "2m", "2M", "3m", "3M", "4P", "5d", "5P", "6m", "6M", "7m", "7M"],
        intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      },
    };
    return {
      getScaleForMode: (mode: string) => {
        const selected = scaleData[mode] ?? scaleData.major;
        return { mode, degreeCount: selected.intervals.length, ...selected };
      },
      normalizeScaleIndex: (mode: string, scaleIndex: number) => {
        const degreeCount = scaleData[mode]?.intervals.length ?? scaleData.major.intervals.length;
        return ((scaleIndex % degreeCount) + degreeCount) % degreeCount;
      },
    };
  })(),
  getSolfegeNameForMode: (_mode: string, scaleIndex: number) =>
    ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"][scaleIndex] ?? "Do",
}));

vi.mock("@/services/musicColor", () => ({
  getScaleDegreeIndexForPitchClass: (pitchClass: string) =>
    ({ C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 })[pitchClass],
}));

const colorMocks = vi.hoisted(() => ({
  useMusicColor: vi.fn(() => ({
    getKeyBackground: (scaleIndex: number) => ({
      background: `color-${scaleIndex}`,
      primaryColor: `color-${scaleIndex}`,
    }),
    getKeyBackgroundByPitchClass: (pitchClassIndex: number) => ({
      background: `color-${pitchClassIndex}`,
      primaryColor: `color-${pitchClassIndex}`,
    }),
  })),
}));

vi.mock("@/composables/useMusicColor", () => ({
  useMusicColor: colorMocks.useMusicColor,
}));

const source = "`< [ C4@0.25 ~@0.25 {E4, G4}@0.5 ] >`.as(\"note\").sound(\"sine\")";
const tokens: CodeStripToken[] = [
  {
    type: "note",
    note: "do",
    text: "Do",
    glyph: "syl",
    rawPitch: "C4",
    scaleIndex: 0,
    duration: "@0.25",
  },
  { type: "rest", duration: "@0.25" },
  {
    type: "chord",
    symbol: "",
    display: "notes",
    duration: "@0.5",
    members: [
      { id: "e", rawPitch: "E4", syllable: "Mi", scaleIndex: 2, pressOrder: 0 },
      { id: "g", rawPitch: "G4", syllable: "Sol", scaleIndex: 4, pressOrder: 1 },
    ],
  },
];

const progress = (host: HTMLElement, selector: string) =>
  host.querySelector<HTMLElement>(selector)?.style.getPropertyValue("--code-strip-progress");

describe("CodeStrip Strudel source decorations", () => {
  it("keeps clip and envelope parameters out of the displayed notes", () => {
    const doc = EditorState.create({
      doc: '`< C4:0.96:0.003:0.001:1:0.12@0.13 {-7:1:0.03@0.25, 0:1:0.2@0.25} ~@0.25 >`.as("note:clip:attack:decay:sustain:release")',
    }).doc;
    const events = parseCodeStripEvents(doc);
    expect(events.map(event => event.notes.map(note => note.text))).toEqual([
      ["C4"], ["-7", "0"], [],
    ]);
    expect(events.map(event => [event.startWeight, event.endWeight])).toEqual([
      [0, 0.13], [0.13, 1.13], [1.13, 1.38],
    ]);
  });

  it("does not mistake short-decimal or exponent control values for pitches", () => {
    const doc = EditorState.create({
      doc: '`< 0:.5:1e-3@0.25 C4:1:-0.5@0.25 >`.as("note:clip:release")',
    }).doc;
    expect(parseCodeStripEvents(doc).map(event => event.notes.map(note => note.text)))
      .toEqual([["0"], ["C4"]]);
  });

  it("parses negative relative degrees as notes rather than rest aliases", () => {
    const doc = EditorState.create({
      doc: "`< [ -7@0.06 0@0.06 ] >`.as(\"n\").scale(\"C4:major\")",
    }).doc;

    expect(parseCodeStripEvents(doc)).toMatchObject([
      { kind: "note", notes: [{ text: "-7", isRelative: true }] },
      { kind: "note", notes: [{ text: "0", isRelative: true }] },
    ]);
  });

  it("keeps hand-edited relative degrees before mini-notation modifiers visible", () => {
    const doc = EditorState.create({
      doc: '`< 0*2 1! 2? >`.as("n").scale("C4:major")',
    }).doc;
    const events = parseCodeStripEvents(doc);
    expect(events[0].notes.some((note) => note.text === "0")).toBe(true);
    expect(events[1].notes.some((note) => note.text === "1")).toBe(true);
    expect(events[2].notes.some((note) => note.text === "2")).toBe(true);
  });

  it("does not parse absolute-note octaves as relative notes", () => {
    const doc = EditorState.create({
      doc: "`< [ {C#4, E4} ] >`.as(\"note\")",
    }).doc;

    expect(parseCodeStripEvents(doc)[0].notes.map((note) => note.text)).toEqual([
      "C#4",
      "E4",
    ]);
  });

  it("does not decorate vibrato metadata as phantom relative notes", () => {
    const doc = EditorState.create({
      doc: '`< [ {C4:5:0.25, E4:0:0}@0.5 2:6.5:0.3@0.25 ] >`.as(["note", "vib", "vibmod"])',
    }).doc;

    const events = parseCodeStripEvents(doc);
    expect(events).toHaveLength(2);
    expect(events[0].notes.map((note) => note.text)).toEqual(["C4", "E4"]);
    expect(events[1].notes).toMatchObject([{ text: "2", isRelative: true }]);
  });

  it("keeps combined articulation and expression controls out of overlapping pitches", () => {
    const doc = EditorState.create({
      doc: '`< {C4:.96:2e-2:.04:.6:.03:10:.25:10:.385@0.25, ~@0.125 -7:1:0:0:1:.12:0:0:0:0@0.25}@0.375 >`.as(["note", "clip", "attack", "decay", "sustain", "release", "vib", "vibmod", "tremolo", "tremolodepth"])',
    }).doc;
    const events = parseCodeStripEvents(doc);
    expect(events).toHaveLength(1);
    expect(events[0].notes.map(note => note.text)).toEqual(["C4", "-7"]);
    expect([events[0].startWeight, events[0].endWeight]).toEqual([0, 0.375]);
  });

  const mountedViews: EditorView[] = [];

  afterEach(() => {
    mountedViews.splice(0).forEach((view) => view.destroy());
    document.body.innerHTML = "";
    colorMocks.useMusicColor.mockReset();
    colorMocks.useMusicColor.mockImplementation(() => ({
      getKeyBackground: (scaleIndex: number) => ({
        background: `color-${scaleIndex}`,
        primaryColor: `color-${scaleIndex}`,
      }),
      getKeyBackgroundByPitchClass: (pitchClassIndex: number) => ({
        background: `color-${pitchClassIndex}`,
        primaryColor: `color-${pitchClassIndex}`,
      }),
    }));
  });

  function createView(
    extensions = codeStripStrudelExtension,
    presentation: CodeStripPresentation = { tokens, durationMode: "stacked" },
    doc = source,
  ) {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const view = new EditorView({
      state: EditorState.create({ doc, extensions: [extensions] }),
      parent: host,
    });
    mountedViews.push(view);
    updateCodeStripPresentation(view, presentation);
    return { host, view, events: parseCodeStripEvents(view.state.doc) };
  }

  it("styles semantic ranges inside the unchanged CodeMirror document", async () => {
    const { host, view } = createView();
    await Promise.resolve();

    expect(view.state.doc.toString()).toBe(source);
    expect(host.querySelectorAll(".cm-code-strip-event")).toHaveLength(3);
    expect(host.querySelectorAll(".cm-code-strip-structure")).toHaveLength(2);
    expect(host.querySelector(".cm-line")?.textContent).not.toContain("[");
    expect(host.querySelector(".cm-code-strip-widget")).toBeNull();
    expect(host.querySelector(".note__identity-core")?.textContent).toBe("Do");
    expect(progress(host, ".code-strip__note")).toBe("1");
    expect(host.querySelector<HTMLElement>(".code-strip__rest")?.style
      .getPropertyValue("--code-strip-progress")).toBe("1");
  });

  it("publishes appended source and metadata in one update while retaining historical widgets and selection", () => {
    const { host, view } = createView();
    const firstWidget = host.querySelector(".cm-code-strip-event");
    const firstNote = firstWidget?.querySelector(".note");
    const anchor = source.indexOf("C4");
    view.dispatch({ selection: { anchor } });
    const dispatch = vi.spyOn(view, "dispatch");
    const nextSource = source.replace(" ] >", " D4@0.25 ] >");
    const nextTokens: CodeStripToken[] = [...tokens, {
      type: "note", note: "re", text: "Re", rawPitch: "D4", scaleIndex: 1, duration: "@0.25",
    }];

    updateCodeStripPresentation(view, { tokens: nextTokens }, nextSource);

    expect(view.state.doc.toString()).toBe(nextSource);
    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch.mock.calls[0][0]).toMatchObject({
      changes: { from: source.indexOf(" ] >") + 1, to: source.indexOf(" ] >") + 1 },
    });
    expect(view.state.selection.main.anchor).toBe(anchor);
    expect(host.querySelector(".cm-code-strip-event")).toBe(firstWidget);
    expect(host.querySelector(".note")).toBe(firstNote);
    expect(host.querySelectorAll(".cm-code-strip-event")).toHaveLength(4);
    expect(host.textContent).toContain("Re");
  });

  it("updates focused source without replacing the unchanged selection prefix", () => {
    const { host, view } = createView();
    view.contentDOM.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    const anchor = source.indexOf("C4");
    view.dispatch({ selection: { anchor } });
    const nextSource = source.replace("sine", "piano");
    updateCodeStripPresentation(view, { tokens }, nextSource);
    expect(view.state.doc.toString()).toBe(nextSource);
    expect(view.state.selection.main.anchor).toBe(anchor);
    expect(host.querySelector(".cm-code-strip-event")).toBeNull();
  });

  it("injects a controlled color resolver into real Note and Chord descendants", async () => {
    colorMocks.useMusicColor.mockImplementation(() => {
      throw new Error("controlled CodeStrip descendants must not construct useMusicColor");
    });
    const colorResolver = {
      getKeyBackground: (scaleIndex: number) => ({
        background: `controlled-${scaleIndex}`,
        primaryColor: `controlled-${scaleIndex}`,
      }),
      getKeyBackgroundByPitchClass: (pitchClassIndex: number) => ({
        background: `controlled-${pitchClassIndex}`,
        primaryColor: `controlled-${pitchClassIndex}`,
      }),
    };
    const { host, view } = createView(
      codeStripStrudelExtensionWithPresentation({ colorResolver }),
      { tokens, durationMode: "stacked", colorResolver },
    );
    await Promise.resolve();

    expect(colorMocks.useMusicColor).not.toHaveBeenCalled();
    expect(host.querySelectorAll(".note").length).toBeGreaterThan(1);
    expect(host.querySelector<HTMLElement>(".note")?.style
      .getPropertyValue("--note-surface")).toBe("controlled-0");
  });

  it("keeps an octave-shifted relative source attached to its supplied token", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const relativeSource = "`< [ 28@0.25 ] >`.as(\"n\").scale(\"C4:major\")";
    const view = new EditorView({
      state: EditorState.create({
        doc: relativeSource,
        extensions: [codeStripStrudelExtension],
      }),
      parent: host,
    });
    mountedViews.push(view);
    updateCodeStripPresentation(view, {
      tokens: [{
        ...tokens[0],
        glyph: "raw",
        text: "C8",
        rawPitch: "C8",
        octave: 8,
        surfaceStyle: "monochrome",
      }],
      notation: "note",
      durationMode: "stacked",
    });
    await Promise.resolve();

    expect(host.querySelector(".note__identity-core")?.textContent).toBe("C8");
    expect(host.querySelector(".note")?.classList).toContain("note--surface-monochrome");
  });

  it("invalidates supplied metadata when a relative degree crosses an octave", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const relativeSource = "`< [ 7@0.25 ] >`.as(\"n\").scale(\"C4:major\")";
    const view = new EditorView({
      state: EditorState.create({
        doc: relativeSource,
        extensions: [codeStripStrudelExtension],
      }),
      parent: host,
    });
    mountedViews.push(view);
    updateCodeStripPresentation(view, {
      tokens: [{
        ...tokens[0],
        glyph: "raw",
        text: "C4",
        rawPitch: "C4",
        scaleIndex: 0,
        octave: 4,
      }],
      notation: "note",
      durationMode: "stacked",
    });
    await Promise.resolve();

    expect(host.querySelector(".note__identity-core")?.textContent).toBe("C5");
    expect(host.querySelector(".note")?.getAttribute("data-octave")).toBe("5");
  });

  it("resolves relative degrees against the source scale root octave", async () => {
    const renderRelative = async (degree: string) => {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const view = new EditorView({
        state: EditorState.create({
          doc: `\`< [ ${degree}@0.25 ] >\`.as("n").scale("C4:major")`,
          extensions: [codeStripStrudelExtension],
        }),
        parent: host,
      });
      mountedViews.push(view);
      updateCodeStripPresentation(view, { notation: "note", durationMode: "stacked" });
      await Promise.resolve();
      return host.querySelector(".note");
    };

    const high = await renderRelative("7");
    const low = await renderRelative("-7");
    expect(high?.querySelector(".note__identity-core")?.textContent).toBe("C5");
    expect(high?.getAttribute("data-octave")).toBe("5");
    expect(low?.querySelector(".note__identity-core")?.textContent).toBe("C3");
    expect(low?.getAttribute("data-octave")).toBe("3");
  });

  it("derives relative accidentals and root-crossing octaves from the source scale", async () => {
    const renderRelative = async (scale: string, degree: string) => {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const view = new EditorView({
        state: EditorState.create({
          doc: `\`< [ ${degree}@0.25 ] >\`.as("n").scale("${scale}")`,
          extensions: [codeStripStrudelExtension],
        }),
        parent: host,
      });
      mountedViews.push(view);
      updateCodeStripPresentation(view, { notation: "note", durationMode: "stacked" });
      await Promise.resolve();
      return host.querySelector(".note");
    };

    const sharp = await renderRelative("D4:major", "2");
    const crossing = await renderRelative("B4:major", "1");
    expect(sharp?.querySelector(".note__identity-core")?.textContent).toBe("F♯4");
    expect(sharp?.classList).toContain("note--accidental");
    expect(crossing?.querySelector(".note__identity-core")?.textContent).toBe("C♯5");
    expect(crossing?.getAttribute("data-octave")).toBe("5");
    expect(crossing?.classList).toContain("note--accidental");
  });

  it("does not reuse an absolute token outside the edited source scale", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const view = new EditorView({
      state: EditorState.create({
        doc: "`< [ 2@0.25 ] >`.as(\"n\").scale(\"C4:minor\")",
        extensions: [codeStripStrudelExtension],
      }),
      parent: host,
    });
    mountedViews.push(view);
    updateCodeStripPresentation(view, {
      tokens: [{
        ...tokens[0],
        glyph: "raw",
        text: "E4",
        rawPitch: "E4",
        scaleIndex: 2,
        octave: 4,
      }],
      notation: "note",
      durationMode: "stacked",
    });
    await Promise.resolve();

    expect(host.querySelector(".note__identity-core")?.textContent).toBe("E♭4");
  });

  it("uses Tonal scale spellings for flat roots and sparse scale octave steps", async () => {
    const renderRelative = async (scale: string, degree: string) => {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const view = new EditorView({
        state: EditorState.create({
          doc: `\`< [ ${degree}@0.25 ] >\`.as("n").scale("${scale}")`,
          extensions: [codeStripStrudelExtension],
        }),
        parent: host,
      });
      mountedViews.push(view);
      updateCodeStripPresentation(view, { notation: "note", durationMode: "stacked" });
      await Promise.resolve();
      return host.querySelector(".note__identity-core")?.textContent;
    };

    expect(await renderRelative("Bb4:major", "1")).toBe("C5");
    expect(await renderRelative("C4:major pentatonic", "3")).toBe("G4");
    expect(await renderRelative("C4:major blues", "6")).toBe("C5");
    expect(await renderRelative("C4:chromatic", "12")).toBe("C5");
  });

  it("keeps enharmonic root octave semantics when checking supplied metadata", async () => {
    const renderWithToken = async (scale: string, suppliedPitch: string) => {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const view = new EditorView({
        state: EditorState.create({
          doc: `\`< [ 0@0.25 ] >\`.as("n").scale("${scale}")`,
          extensions: [codeStripStrudelExtension],
        }),
        parent: host,
      });
      mountedViews.push(view);
      updateCodeStripPresentation(view, {
        tokens: [{
          ...tokens[0],
          glyph: "raw",
          text: suppliedPitch,
          rawPitch: suppliedPitch,
          duration: "@0.25",
        }],
        notation: "note",
        durationMode: "stacked",
      });
      await Promise.resolve();
      return host.querySelector(".note__identity-core")?.textContent;
    };

    expect(await renderWithToken("Cb4:major", "B4")).toBe("C♭4");
    expect(await renderWithToken("B#4:major", "C4")).toBe("B♯4");
  });

  it("normalizes only accidental suffixes in absolute metadata aliases", async () => {
    const renderWithToken = async (source: string, suppliedPitch: string) => {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const view = new EditorView({
        state: EditorState.create({
          doc: source,
          extensions: [codeStripStrudelExtension],
        }),
        parent: host,
      });
      mountedViews.push(view);
      updateCodeStripPresentation(view, {
        tokens: [{
          ...tokens[0],
          glyph: "raw",
          text: suppliedPitch,
          rawPitch: suppliedPitch,
          surfaceStyle: "monochrome",
        }],
        notation: "note",
        durationMode: "stacked",
      });
      await Promise.resolve();
      return host.querySelector(".note");
    };

    const naturalF = await renderWithToken(
      "`< [ 3@0.25 ] >`.as(\"n\").scale(\"C4:major\")",
      "f4",
    );
    const flatAlias = await renderWithToken(
      "`< [ 5@0.25 ] >`.as(\"n\").scale(\"C4:minor\")",
      "af4",
    );
    expect(naturalF?.classList).toContain("note--surface-monochrome");
    expect(flatAlias?.classList).toContain("note--surface-monochrome");
  });

  it("marks only pitched accidentals as accidental", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const naturalSource = "`< [ F4@0.25 B4@0.25 F#4@0.25 ] >`.as(\"note\")";
    const view = new EditorView({
      state: EditorState.create({
        doc: naturalSource,
        extensions: [codeStripStrudelExtension],
      }),
      parent: host,
    });
    mountedViews.push(view);
    updateCodeStripPresentation(view, { notation: "note", durationMode: "stacked" });
    await Promise.resolve();

    const notes = [...host.querySelectorAll<HTMLElement>(".note")];
    expect(notes).toHaveLength(3);
    expect(notes[0].classList).toContain("note--natural");
    expect(notes[1].classList).toContain("note--natural");
    expect(notes[2].classList).toContain("note--accidental");
  });

  it("turns Ink on at Play and consumes Strudel's native location highlight", async () => {
    const { host, view, events } = createView();
    const [noteEvent, restEvent, chordEvent] = events;

    setCodeStripPlaying(view, true);
    await Promise.resolve();
    expect(progress(host, ".code-strip__note")).toBe("0");
    expect(host.querySelector<HTMLElement>(".code-strip__rest")?.style
      .getPropertyValue("--code-strip-progress")).toBe("0");

    view.dispatch({
      effects: showMiniLocations.of({
        atTime: .125,
        haps: [{
          context: { locations: [{ start: noteEvent.notes[0].from, end: noteEvent.notes[0].to }] },
          whole: { begin: 0, duration: .25 },
        }],
      }),
    });
    await Promise.resolve();
    expect(progress(host, ".code-strip__note")).toBe("0.5");

    view.dispatch({ effects: showMiniLocations.of({ atTime: .375, haps: [] }) });
    await Promise.resolve();
    expect(host.querySelector<HTMLElement>(".code-strip__rest")?.style
      .getPropertyValue("--code-strip-progress")).toBe("0.5");

    view.dispatch({
      effects: showMiniLocations.of({
        atTime: .375,
        haps: chordEvent.notes.map((note, index) => ({
          context: { locations: [{ start: note.from, end: note.to }] },
          whole: { begin: index * .125, duration: .5 },
        })),
      }),
    });
    await Promise.resolve();
    const chordProgress = [...host.querySelectorAll<HTMLElement>(".chord__cluster-member")]
      .map((member) => member.style.getPropertyValue("--chord-member-progress"));
    expect(chordProgress).toEqual(["0.75", "0.5"]);

    setCodeStripPlaying(view, false);
    await Promise.resolve();
    expect(progress(host, ".code-strip__note")).toBe("1");
    expect(restEvent.kind).toBe("rest");
  });

  it.each([
    {
      name: "multi-cycle outer weights",
      doc: '`< C4@0.5 ~@1.5 D4@0.5 >`.as("note")',
      samples: [[0.25, 0, false], [0.5, 0, true], [1.25, 0.5, true], [2, 1, false], [2.5, 0, false], [3.75, 0.5, true]] as const,
    },
    {
      name: "fractional outer weights",
      doc: '`< C4@0.125 ~@0.25 D4@0.125 >`.as("note")',
      samples: [[0.125, 0, true], [0.25, 0.5, true], [0.375, 1, false], [0.5, 0, false], [0.75, 0.5, true]] as const,
    },
    {
      name: "legacy brackets normalized to one cycle",
      doc: '`< [ C4@0.5 ~@1 D4@0.5 ] >`.as("note")',
      samples: [[0.25, 0, true], [0.5, 0.5, true], [0.75, 1, false], [1, 0, false], [1.5, 0.5, true]] as const,
    },
  ])("times rests using $name", async ({ doc, samples }) => {
    const { host, view } = createView(codeStripStrudelExtension, { tokens: [] }, doc);
    setCodeStripPlaying(view, true);

    for (const [atTime, expectedProgress, active] of samples) {
      view.dispatch({ effects: showMiniLocations.of({ atTime, haps: [] }) });
      await Promise.resolve();
      expect(Number(progress(host, ".code-strip__rest"))).toBeCloseTo(expectedProgress);
      expect(host.querySelector(".code-strip__rest")?.closest(".cm-code-strip-event")
        ?.classList.contains("cm-code-strip-event--active")).toBe(active);
    }
    expect(view.state.doc.toString()).toBe(doc);
    expect(host.querySelectorAll(".cm-line")).toHaveLength(1);
    expect(host.querySelectorAll(".cm-code-strip-event")).toHaveLength(3);
  });

  it.each([
    { name: "multi-cycle", doc: '`< C4@0.25 ~@2.25 >`', begin: 0, within: [0.5, 1, 2.25], boundary: 2.5 },
    { name: "first fractional loop", doc: '`< C4@0.25 ~@0.5 >`', begin: 0, within: [0.25, 0.5], boundary: 0.75 },
    { name: "fractional", doc: '`< C4@0.25 ~@0.5 >`', begin: 0.75, within: [1, 1.25], boundary: 1.5 },
    { name: "decimal", doc: '`< C4@0.1 ~@0.2 >`', begin: 0, within: [0.2], boundary: 0.3 },
    { name: "legacy bracketed", doc: '`< [ C4@0.5 ~@1.5 ] >`', begin: 0, within: [0.5, 0.75], boundary: 1 },
  ])("resets $name played history only at the loop boundary", async ({ doc, begin, within, boundary }) => {
    const { host, view, events } = createView(codeStripStrudelExtension, { tokens: [] }, doc);
    const note = events[0].notes[0];
    setCodeStripPlaying(view, true);
    view.dispatch({ effects: showMiniLocations.of({
      atTime: begin + 0.05,
      haps: [{
        context: { locations: [{ start: note.from, end: note.to }] },
        whole: { begin, duration: 0.1 },
      }],
    }) });
    await Promise.resolve();
    expect(Number(progress(host, ".code-strip__note"))).toBeCloseTo(0.5);

    for (const atTime of within) {
      view.dispatch({ effects: showMiniLocations.of({ atTime, haps: [] }) });
      await Promise.resolve();
      expect(progress(host, ".code-strip__note")).toBe("1");
    }
    view.dispatch({ effects: showMiniLocations.of({ atTime: boundary, haps: [] }) });
    await Promise.resolve();
    expect(progress(host, ".code-strip__note")).toBe("0");
    expect(progress(host, ".code-strip__rest")).toBe("0");
  });

  it("retains chord member history and sustained progress across cycle ticks without remounting", async () => {
    const doc = '`< {C4@0.25, E4@2}@2 ~@0.5 >`.as("note")';
    const { host, view, events } = createView(codeStripStrudelExtension, { tokens: [] }, doc);
    const members = [...host.querySelectorAll(".chord__cluster-member .note")];
    const haps = events[0].notes.map((note, index) => ({
      context: { locations: [{ start: note.from, end: note.to }] },
      whole: { begin: 0, duration: index === 0 ? 0.25 : 2 },
    }));
    const memberProgress = () => [...host.querySelectorAll<HTMLElement>(".chord__cluster-member")]
      .map((member) => Number(member.style.getPropertyValue("--chord-member-progress")));
    setCodeStripPlaying(view, true);
    view.dispatch({ effects: showMiniLocations.of({ atTime: 0.125, haps }) });
    await Promise.resolve();
    expect(memberProgress()).toEqual([0.5, 0.0625]);

    view.dispatch({ effects: showMiniLocations.of({ atTime: 1.25, haps: [haps[1]] }) });
    await Promise.resolve();
    expect(memberProgress()).toEqual([1, 0.625]);
    host.querySelectorAll(".chord__cluster-member .note").forEach((member, index) => {
      expect(member).toBe(members[index]);
    });

    view.dispatch({ effects: showMiniLocations.of({ atTime: 2.25, haps: [] }) });
    await Promise.resolve();
    expect(memberProgress()).toEqual([1, 1]);
    view.dispatch({ effects: showMiniLocations.of({ atTime: 2.5, haps: [] }) });
    await Promise.resolve();
    expect(memberProgress()).toEqual([0, 0]);
  });

  it("defers hidden native playback updates and catches up on scroll without replacing the note", async () => {
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    let intersection!: IntersectionObserverCallback;
    vi.stubGlobal("IntersectionObserver", vi.fn(function (callback) {
      intersection ??= callback;
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    }));
    const viewport = new CodeStripViewport();
    try {
      const { host, view, events } = createView(
        codeStripStrudelExtensionWithPresentation({ viewport }),
        { tokens, viewport },
      );
      const root = host.querySelector<HTMLElement>(".cm-code-strip-event")!;
      const note = root.querySelector(".note");
      const intersect = (width: number) => intersection([{
        target: root, isIntersecting: true, intersectionRect: { width, height: 20 },
      } as IntersectionObserverEntry], {} as IntersectionObserver);
      intersect(20);
      expect(viewport.visibleCount.value).toBe(1);
      setCodeStripPlaying(view, true);
      await Promise.resolve();
      expect(progress(host, ".code-strip__note")).toBe("0");
      intersect(0);
      for (const atTime of [.0625, .125, .1875]) {
        view.dispatch({ effects: showMiniLocations.of({
          atTime,
          haps: [{
            context: { locations: [{ start: events[0].notes[0].from, end: events[0].notes[0].to }] },
            whole: { begin: 0, duration: .25 },
          }],
        }) });
        await Promise.resolve();
        expect(progress(host, ".code-strip__note")).toBe("0");
      }
      intersect(20);
      await Promise.resolve();
      expect(progress(host, ".code-strip__note")).toBe("0.75");
      expect(root.querySelector(".note")).toBe(note);
      setCodeStripPlaying(view, false);
      await Promise.resolve();
      expect(progress(host, ".code-strip__note")).toBe("1");
    } finally {
      viewport.destroy();
      visibility.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("reveals the same raw Strudel document while editing", async () => {
    const { host, view } = createView();
    view.contentDOM.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    await Promise.resolve();
    expect(host.querySelector(".cm-code-strip-event")).toBeNull();
    expect(view.state.doc.toString()).toBe(source);

    view.contentDOM.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    await Promise.resolve();
    expect(host.querySelectorAll(".cm-code-strip-event")).toHaveLength(3);
  });

  it("re-derives presentation and native highlight ranges after a source edit", async () => {
    const { host, view } = createView();
    const from = view.state.doc.toString().indexOf("C4");

    view.dispatch({ changes: { from, to: from + 2, insert: "D4" } });
    await Promise.resolve();

    expect(view.state.doc.toString()).toContain("D4@0.25");
    expect(host.querySelector(".note__identity-core")?.textContent).toBe("Re");

    setCodeStripPlaying(view, true);
    const editedNote = parseCodeStripEvents(view.state.doc)[0].notes[0];
    view.dispatch({
      effects: showMiniLocations.of({
        atTime: .125,
        haps: [{
          context: { locations: [{ start: editedNote.from, end: editedNote.to }] },
          whole: { begin: 0, duration: .25 },
        }],
      }),
    });
    await Promise.resolve();

    expect(progress(host, ".code-strip__note")).toBe("0.5");
  });

  it("keeps an edited borrowed note raw and chromatically colored", async () => {
    const { host, view } = createView();
    const from = view.state.doc.toString().indexOf("C4");

    view.dispatch({ changes: { from, to: from + 2, insert: "D#4" } });
    await Promise.resolve();

    const editedNote = host.querySelector<HTMLElement>(".code-strip__note .note");
    expect(editedNote?.dataset.primary).toBe("raw");
    expect(editedNote?.dataset.pitchClassIndex).toBe("3");
    expect(
      editedNote?.querySelector(".note__identity-core")?.textContent,
    ).toBe("D♯4");
  });

  it("keeps an edited borrowed chord member raw and chromatically colored", async () => {
    const { host, view } = createView();
    const from = view.state.doc.toString().indexOf("E4");

    view.dispatch({ changes: { from, to: from + 2, insert: "D#4" } });
    await Promise.resolve();

    const editedMember = host.querySelector<HTMLElement>(
      ".chord__cluster-member .note",
    );
    expect(editedMember?.dataset.primary).toBe("raw");
    expect(editedMember?.dataset.pitchClassIndex).toBe("3");
    expect(
      editedMember?.querySelector(".note__identity-core")?.textContent,
    ).toBe("D♯4");
  });

  it("takes edited event duration from the source instead of stale metadata", async () => {
    const { host, view } = createView();
    const sourceText = view.state.doc.toString();
    const from = sourceText.indexOf("@0.25");

    view.dispatch({ changes: { from, to: from + "@0.25".length, insert: "@0.5" } });
    await Promise.resolve();

    expect(host.querySelector(".code-strip__stack-duration")?.textContent).toBe("@0.5");
  });
});
