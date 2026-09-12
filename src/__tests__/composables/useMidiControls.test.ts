import { describe, expect, it, vi } from "vitest";
import {
  createMidiNoteOwnerScheduler,
  createMidiNoteReferenceCounter,
  hasActiveTouchPress,
  midiNoteNumberToName,
  resolveMirroredEventDurationMs,
  resolveMirroredMidiNoteNumber,
  resolvePlayableMidiNote,
  resolveVisualNoteKey,
  shouldMirrorNoteEvent,
} from "@/composables/useMidiControls";

vi.mock("@/services/superdoughAudio", () => ({
  attackNote: vi.fn().mockResolvedValue(undefined),
  releaseNote: vi.fn(),
  releaseAll: vi.fn(),
  playNoteWithDuration: vi.fn().mockResolvedValue(undefined),
}));

describe("useMidiControls helpers", () => {
  it("keeps overlapping scheduled owners sounding until the last release", () => {
    let clock = 0;
    const sendNow = vi.fn();
    const replaceScheduled = vi.fn();
    const scheduler = createMidiNoteOwnerScheduler(sendNow, replaceScheduled, () => clock);

    scheduler.attack("held-chord", 60, 30);
    scheduler.release("held-chord", 60, 100);
    scheduler.attack("melody", 60, 65);
    scheduler.release("melody", 60, 300);

    expect(replaceScheduled).toHaveBeenLastCalledWith([
      { midiNote: 60, phase: "attack", timestamp: 30 },
      { midiNote: 60, phase: "release", timestamp: 300 },
    ]);
    expect(sendNow).not.toHaveBeenCalled();

    clock = 301;
    scheduler.attack("next", 62);
    expect(sendNow).toHaveBeenCalledWith({ midiNote: 62, phase: "attack" });
  });

  it("shares pitch ownership between immediate and scheduled MIDI voices", () => {
    let clock = 0;
    const sendNow = vi.fn();
    const replaceScheduled = vi.fn();
    const scheduler = createMidiNoteOwnerScheduler(sendNow, replaceScheduled, () => clock);

    scheduler.attack("mirrored-strudel", 60);
    scheduler.attack("styled", 60, 30);
    scheduler.release("styled", 60, 100);

    expect(sendNow).toHaveBeenCalledTimes(1);
    expect(sendNow).toHaveBeenCalledWith({ midiNote: 60, phase: "attack" });
    expect(replaceScheduled).not.toHaveBeenCalled();

    clock = 150;
    scheduler.release("mirrored-strudel", 60);
    expect(sendNow).toHaveBeenLastCalledWith({ midiNote: 60, phase: "release" });
  });

  it("does not release a scheduled pitch when an immediate owner ends first", () => {
    let clock = 0;
    const sendNow = vi.fn();
    const replaceScheduled = vi.fn();
    const scheduler = createMidiNoteOwnerScheduler(sendNow, replaceScheduled, () => clock);

    scheduler.attack("styled", 60, 30);
    scheduler.release("styled", 60, 100);
    clock = 50;
    scheduler.attack("mirrored-strudel", 60);
    scheduler.release("mirrored-strudel", 60);

    expect(sendNow).not.toHaveBeenCalled();
    expect(replaceScheduled).toHaveBeenLastCalledWith([
      { midiNote: 60, phase: "release", timestamp: 100 },
    ]);
  });

  it("rebuilds the future queue before sending a newly due transition", () => {
    let clock = 0;
    const operations: string[] = [];
    const scheduler = createMidiNoteOwnerScheduler(
      ({ phase }) => operations.push(`send:${phase}`),
      () => operations.push("replace"),
      () => clock,
    );

    scheduler.attack("voice", 60, 30);
    scheduler.release("voice", 60, 230);
    operations.length = 0;
    clock = 100;
    scheduler.release("voice", 60, 99);

    expect(operations).toEqual(["replace", "send:release"]);
  });

  it("keeps due attacks queued across clock drift within one output batch", () => {
    let clock = 30;
    const sendNow = vi.fn();
    const replaceScheduled = vi.fn();
    const scheduler = createMidiNoteOwnerScheduler(sendNow, replaceScheduled, () => clock);

    scheduler.beginBatch();
    scheduler.attack("voice", 60, 30);
    clock = 30.1;
    scheduler.release("voice", 60, 230);
    scheduler.endBatch();

    expect(sendNow).not.toHaveBeenCalled();
    expect(replaceScheduled).toHaveBeenLastCalledWith([
      { midiNote: 60, phase: "attack", timestamp: 30 },
      { midiNote: 60, phase: "release", timestamp: 230 },
    ]);
  });

  it("pairs an attack canceled at its deadline despite within-batch clock drift", () => {
    let clock = 30;
    const replaceScheduled = vi.fn();
    const scheduler = createMidiNoteOwnerScheduler(vi.fn(), replaceScheduled, () => clock);

    scheduler.beginBatch();
    scheduler.attack("voice", 60, 30);
    clock = 30.1;
    scheduler.release("voice", 60, 30);
    scheduler.endBatch();

    expect(replaceScheduled).toHaveBeenLastCalledWith([
      { midiNote: 60, phase: "attack", timestamp: 30 },
      { midiNote: 60, phase: "release", timestamp: 30 },
    ]);
  });

  it("keeps a mirrored unison sounding until its final owner releases", () => {
    const noteOn = vi.fn();
    const noteOff = vi.fn();
    const notes = createMidiNoteReferenceCounter(noteOn, noteOff);

    notes.acquire(60);
    notes.acquire(60);
    notes.release(60);

    expect(noteOn).toHaveBeenCalledOnce();
    expect(noteOff).not.toHaveBeenCalled();

    notes.release(60);
    expect(noteOff).toHaveBeenCalledOnce();
    expect(noteOff).toHaveBeenCalledWith(60);
  });

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
        { solfegeIndex: 1, octave: 5, keyboardOctave: 4, noteName: "D5" },
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

    expect(
      resolveVisualNoteKey(
        { solfegeIndex: -1, octave: 4, noteName: "D#4" },
        noteResolver,
      ),
    ).toBeNull();
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

  it("mirrors borrowed notes from their exact pitch instead of the scale-degree sentinel", () => {
    const noteResolver = {
      parseNoteInput: vi.fn(),
      getNoteName: vi.fn().mockReturnValue("C4"),
    };

    expect(
      resolveMirroredMidiNoteNumber(
        {
          solfegeIndex: -1,
          octave: 4,
          noteName: "D#4",
          isBorrowed: true,
        },
        noteResolver,
      ),
    ).toBe(63);
    expect(noteResolver.getNoteName).not.toHaveBeenCalled();
  });

  it("mirrors exact in-scale notes from scientific pitch identity", () => {
    const noteResolver = {
      parseNoteInput: vi.fn(),
      getNoteName: vi.fn().mockReturnValue("B4"),
    };

    expect(
      resolveMirroredMidiNoteNumber(
        {
          solfegeIndex: 3,
          octave: 5,
          keyboardOctave: 4,
          noteName: "C5",
        },
        noteResolver,
      ),
    ).toBe(72);
    expect(noteResolver.getNoteName).not.toHaveBeenCalled();
  });

  it("omits exact harmony pitches outside MIDI's 0-127 note range", () => {
    const noteResolver = {
      parseNoteInput: vi.fn(),
      getNoteName: vi.fn(),
    };

    expect(
      resolveMirroredMidiNoteNumber(
        {
          solfegeIndex: -1,
          octave: 10,
          noteName: "C#10",
          isBorrowed: true,
        },
        noteResolver,
      ),
    ).toBeNull();
  });

  it("keeps visual-only humming notes off connected MIDI outputs", () => {
    expect(shouldMirrorNoteEvent({ mirrorMidi: false })).toBe(false);
    expect(shouldMirrorNoteEvent({})).toBe(true);
    expect(shouldMirrorNoteEvent(undefined)).toBe(true);
  });
});
