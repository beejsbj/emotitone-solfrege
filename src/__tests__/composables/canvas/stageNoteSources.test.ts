import { describe, expect, it } from "vitest";
import { resolveStageActiveNotes } from "@/composables/canvas/stageNoteSources";
import type { ActiveNote } from "@/types/music";

function note(noteId: string): ActiveNote {
  return {
    noteId,
    noteName: "C4",
    pitchClassIndex: 0,
    solfegeIndex: 0,
    solfege: {
      name: "Do",
      number: 1,
      emotion: "grounded",
      description: "tonic",
      texture: "clear",
    },
    frequency: 261.63,
    octave: 4,
    keyboardOctave: 4,
    mode: "major",
    key: "C",
  };
}

describe("resolveStageActiveNotes", () => {
  it("uses the controlled view without leaking foreign production notes", () => {
    const controlled = [note("controlled")];

    expect(resolveStageActiveNotes(
      controlled,
      [note("music-store")],
      [note("live-pitch")],
      [note("strudel")],
    )).toEqual(controlled);
    expect(resolveStageActiveNotes([], [note("music-store")])).toEqual([]);
  });

  it("preserves the production merge and later-source replacement when uncontrolled", () => {
    const original = note("shared");
    const replacement = { ...note("shared"), noteName: "D4" };

    expect(resolveStageActiveNotes(
      undefined,
      [original, note("music-only")],
      [replacement, note("live-only")],
    )).toEqual([replacement, note("music-only"), note("live-only")]);
  });
});
