import { describe, expect, it, vi } from "vitest";
import {
  midiNoteNumberToName,
  resolvePlayableMidiNote,
} from "@/composables/useMidiControls";

vi.mock("@/services/superdoughAudio", () => ({
  attackNote: vi.fn().mockResolvedValue(undefined),
  releaseNote: vi.fn(),
  releaseAll: vi.fn(),
  playNoteWithDuration: vi.fn().mockResolvedValue(undefined),
}));

describe("useMidiControls helpers", () => {
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
});
