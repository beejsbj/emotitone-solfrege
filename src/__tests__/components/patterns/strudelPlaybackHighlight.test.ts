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

import {
  strudelPlaybackHighlightExtension,
  updatePlaybackHighlightOptions,
} from "@/components/patterns/strudelPlaybackHighlight";

const NEUTRAL_FALLBACK = "hsla(0, 0%, 16%, 1)";

describe("strudelPlaybackHighlight", () => {
  const mountedViews: EditorView[] = [];

  afterEach(() => {
    mountedViews.splice(0).forEach((view) => view.destroy());
    document.body.innerHTML = "";
  });

  it("recomputes note token colors when playback options change", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const view = new EditorView({
      state: EditorState.create({
        doc: "<C#4>",
        extensions: [strudelPlaybackHighlightExtension],
      }),
      parent: host,
    });

    mountedViews.push(view);

    const getRenderedTokenColor = () =>
      host
        .querySelector(".cm-live-strip-token")
        ?.getAttribute("data-strudel-note-color");

    expect(getRenderedTokenColor()).toBe(NEUTRAL_FALLBACK);

    updatePlaybackHighlightOptions(view, {
      musicColorMode: "fixed",
      scaleKey: "C",
      scaleMode: "major",
      noteSkins: [],
    });
    await Promise.resolve();

    expect(getRenderedTokenColor()).not.toBe(NEUTRAL_FALLBACK);

    updatePlaybackHighlightOptions(view, {
      musicColorMode: "movable",
      scaleKey: "C",
      scaleMode: "major",
      noteSkins: [],
    });
    await Promise.resolve();

    expect(getRenderedTokenColor()).toBe(NEUTRAL_FALLBACK);
  });
});
