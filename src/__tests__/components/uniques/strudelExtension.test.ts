import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { showMiniLocations } from "@strudel/codemirror";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  codeStripStrudelExtension,
  parseCodeStripEvents,
  setCodeStripPlaying,
  updateCodeStripPresentation,
} from "@/components/uniques/CodeStrip/strudelExtension";
import type { CodeStripToken } from "@/components/uniques/CodeStrip/types";

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
  getSolfegeNameForMode: (_mode: string, scaleIndex: number) =>
    ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"][scaleIndex] ?? "Do",
  normalizeScaleIndex: (_mode: string, scaleIndex: number) => scaleIndex,
}));

vi.mock("@/services/musicColor", () => ({
  getScaleDegreeIndexForPitchClass: (pitchClass: string) =>
    ({ C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 })[pitchClass],
}));

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    getKeyBackground: (scaleIndex: number) => ({
      background: `color-${scaleIndex}`,
      primaryColor: `color-${scaleIndex}`,
    }),
  }),
}));

const source = "`< C4@0.25 ~@0.25 {E4, G4}@0.5 >`.as(\"note\").sound(\"sine\")";
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
  const mountedViews: EditorView[] = [];

  afterEach(() => {
    mountedViews.splice(0).forEach((view) => view.destroy());
    document.body.innerHTML = "";
  });

  function createView() {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const view = new EditorView({
      state: EditorState.create({ doc: source, extensions: [codeStripStrudelExtension] }),
      parent: host,
    });
    mountedViews.push(view);
    updateCodeStripPresentation(view, { tokens, durationMode: "stacked" });
    return { host, view, events: parseCodeStripEvents(view.state.doc) };
  }

  it("styles semantic ranges inside the unchanged CodeMirror document", async () => {
    const { host, view } = createView();
    await Promise.resolve();

    expect(view.state.doc.toString()).toBe(source);
    expect(host.querySelectorAll(".cm-code-strip-event")).toHaveLength(3);
    expect(host.querySelector(".cm-code-strip-widget")).toBeNull();
    expect(host.querySelector(".note__identity-core")?.textContent).toBe("Do");
    expect(progress(host, ".code-strip__note")).toBe("1");
    expect(host.querySelector<HTMLElement>(".code-strip__rest")?.style
      .getPropertyValue("--code-strip-progress")).toBe("1");
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
});
