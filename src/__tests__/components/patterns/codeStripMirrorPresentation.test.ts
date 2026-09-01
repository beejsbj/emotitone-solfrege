import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@strudel/core", () => ({
  isNote: (value: string) => /^[a-g](?:[#bsf]+)?\d$/i.test(value),
}));

vi.mock("@/data", () => ({
  CHROMATIC_NOTES: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
  getSolfegeNameForMode: () => "Do",
  getScaleForMode: () => ({
    notes: ["C", "D", "E", "F", "G", "A", "B"],
    solfege: [
      { name: "Do" },
      { name: "Re" },
      { name: "Mi" },
      { name: "Fa" },
      { name: "Sol" },
      { name: "La" },
      { name: "Ti" },
    ],
    intervals: [0, 2, 4, 5, 7, 9, 11],
    degreeCount: 7,
  }),
}));

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    getKeyBackground: () => ({
      background: "linear-gradient(rgb(0, 180, 180), rgb(0, 140, 140))",
      primaryColor: "rgb(0, 180, 180)",
    }),
  }),
}));

import {
  codeStripMirrorPresentationExtension,
  updateCodeStripPresentation,
} from "@/components/patterns/codeStripMirrorPresentation";

describe("codeStripMirrorPresentation", () => {
  const mountedViews: EditorView[] = [];

  afterEach(() => {
    mountedViews.splice(0).forEach((view) => view.destroy());
    document.body.innerHTML = "";
  });

  it("renders and updates the real CodeStrip inside the Strudel mirror", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const view = new EditorView({
      state: EditorState.create({
        doc: "`< C#4@0.25 >`.as(\"note\").sound(\"sine\")",
        extensions: [codeStripMirrorPresentationExtension],
      }),
      parent: host,
    });

    mountedViews.push(view);

    const token = {
      type: "note" as const,
      note: "do" as const,
      text: "Do",
      glyph: "syl" as const,
      rawPitch: "C#4",
      syllable: "Do",
      degree: "1",
      scaleIndex: 0,
      octave: 4,
      isAccidental: true,
      duration: "@0.25",
      progress: 0,
    };

    updateCodeStripPresentation(view, {
      tokens: [token],
      activeTokenIndex: null,
      durationMode: "stacked",
    });
    await Promise.resolve();

    expect(host.querySelector(".cm-code-strip-widget .code-strip")).not.toBeNull();
    expect(host.querySelector(".cm-live-strip-token")).toBeNull();
    expect(host.querySelector(".note__identity-core")?.textContent).toBe("Do");
    expect(host.querySelector<HTMLElement>(".code-strip__note")?.style
      .getPropertyValue("--code-strip-progress")).toBe("0");

    updateCodeStripPresentation(view, {
      tokens: [{ ...token, progress: 0.65 }],
      activeTokenIndex: 0,
      durationMode: "stacked",
    });
    await Promise.resolve();

    expect(host.querySelector(".cm-code-strip-widget")?.getAttribute("data-active-token-index"))
      .toBe("0");
    expect(host.querySelector<HTMLElement>(".code-strip__note")?.style
      .getPropertyValue("--code-strip-progress")).toBe("0.65");

    view.contentDOM.dispatchEvent(new FocusEvent("focus"));
    await Promise.resolve();

    expect(host.querySelector(".cm-code-strip-widget")).toBeNull();
    expect(view.state.doc.toString()).toContain("C#4@0.25");

    view.contentDOM.dispatchEvent(new FocusEvent("blur"));
    await Promise.resolve();

    expect(host.querySelector(".cm-code-strip-widget .code-strip")).not.toBeNull();
  });
});
