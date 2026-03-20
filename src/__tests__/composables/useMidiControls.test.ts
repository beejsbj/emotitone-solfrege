import { describe, expect, it, vi } from "vitest";
import {
  hasActiveTouchPress,
  midiNoteNumberToName,
  resolveMirroredEventDurationMs,
  resolveMirroredMidiNoteNumber,
  resolvePlayableMidiNote,
  resolveVisualNoteKey,
} from "@/composables/useMidiControls";

vi.mock("@/services/superdoughAudio", () => ({
  attackNote: vi.fn().mockResolvedValue(undefined),
  releaseNote: vi.fn(),
  releaseAll: vi.fn(),
  playNoteWithDuration: vi.fn().mockResolvedValue(undefined),
}));

describe("useMidiControls helpers", () => {
  it("detects active touches from both hydrated maps and plain persisted objects", () => {
    expect(
      hasActiveTouchPress(
        new Map([
          ["midi:test:1:60", "0_4"],
        ]),
        "midi:test:1:60"
      )
    ).toBe(true);

    expect(
      hasActiveTouchPress(
        { "midi:test:1:61": "1_4" },
        "midi:test:1:61"
      )
    ).toBe(true);

    expect(hasActiveTouchPress(null, "midi:test:1:62")).toBe(false);
  });

  it("converts MIDI note numbers into chromatic note names", () => {
    expect(midiNoteNumberToName(21)).toBe("A0");
    expect(midiNoteNumberToName(60)).toBe("C4");
    expect(midiNoteNumberToName(73)).toBe("C#5");
  });

  it("accepts MIDI notes that round-trip exactly into the current scale", () => {
    const noteResolver = {
      parseNoteInput: vi.fn().mockReturnValue({ solfegeIndex: 0, octave: 4 }),
      getNoteName: vi.fn().mockReturnValue("C4"),
    };

    expect(resolvePlayableMidiNote(60, noteResolver)).toEqual({
      solfegeIndex: 0,
      octave: 4,
    });
    expect(noteResolver.parseNoteInput).toHaveBeenCalledWith("C4");
  });

  it("rejects MIDI notes that would be quantized to a different scale tone", () => {
    const noteResolver = {
      parseNoteInput: vi.fn().mockReturnValue({ solfegeIndex: 0, octave: 4 }),
      getNoteName: vi.fn().mockReturnValue("C4"),
    };

    expect(resolvePlayableMidiNote(61, noteResolver)).toBeNull();
    expect(noteResolver.parseNoteInput).toHaveBeenCalledWith("C#4");
  });

  it("resolves visual note keys from explicit solfege data or chromatic note names", () => {
    const noteResolver = {
      parseNoteInput: vi.fn().mockReturnValue({ solfegeIndex: 2, octave: 5 }),
      getNoteName: vi.fn(),
    };

    expect(
      resolveVisualNoteKey(
        { solfegeIndex: 1, octave: 4, noteName: "D4" },
        noteResolver
      )
    ).toBe("1_4");

    expect(
      resolveVisualNoteKey(
        { noteName: "E5" },
        noteResolver
      )
    ).toBe("2_5");
    expect(noteResolver.parseNoteInput).toHaveBeenCalledWith("E5");
  });

  it("derives mirrored durations from durationMs, notation, or fallback defaults", () => {
    expect(resolveMirroredEventDurationMs({ durationMs: 240 })).toBe(240);
    expect(resolveMirroredEventDurationMs({ duration: "8n" })).toBe(250);
    expect(resolveMirroredEventDurationMs({})).toBe(500);
  });

  it("resolves mirrored MIDI notes from solfege data before falling back to note names", () => {
    const noteResolver = {
      parseNoteInput: vi.fn(),
      getNoteName: vi.fn().mockReturnValue("F#4"),
    };

    expect(
      resolveMirroredMidiNoteNumber(
        { solfegeIndex: 3, octave: 4, noteName: "ignored" },
        noteResolver
      )
    ).toBe(66);

    expect(
      resolveMirroredMidiNoteNumber(
        { noteName: "Bb3" },
        noteResolver
      )
    ).toBe(58);
  });
});
