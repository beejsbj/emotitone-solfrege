import { describe, expect, it } from "vitest";
import { CHROMATIC_NOTES, getScaleForMode } from "@/data";
import { classifyDetectedPitch, pitchSolfege } from "@/domain/musicalIdentity";
import { createLivePitchStageBridge, getActiveLivePitchStageNotes } from "@/services/hummingStage";
import { pitchAnalysisToPatternCandidates, type PitchAnalysisNoteEvent, type PitchAnalysisResult } from "@/services/pitchAnalysis";
import type { ChromaticNote, MusicalMode } from "@/types/music";

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

function take(pitches: { midi: number; pitch_hz?: number }[]): PitchAnalysisResult {
  const events: PitchAnalysisNoteEvent[] = pitches.map((pitch, index) => ({
    type: "note", note: "", ...pitch,
    start_seconds: index / 4, end_seconds: (index + 1) / 4, duration_seconds: 0.25,
  }));
  return {
    schema_version: 1, product: "Melograph", tracker: "praat-ac",
    duration_seconds: pitches.length / 4, frames: [],
    phrases: [{ number: 1, start_seconds: 0, end_seconds: pitches.length / 4,
      duration_seconds: pitches.length / 4, events }],
    strudel: "", strudel_midi: "", takes: [], warnings: [],
  };
}

function livePitch(midi: number, key: ChromaticNote, mode: MusicalMode) {
  const events: CustomEvent[] = [];
  const bridge = createLivePitchStageBridge({ key, mode, instrument: "piano" }, {
    dispatchEvent: (event) => events.push(event as CustomEvent) > 0,
  });
  try {
    for (const timestampSeconds of [0, 0.05]) {
      bridge.push({ timestampSeconds, midi, frequencyHz: hz(midi),
        clarity: 0.95, rms: 0.04, voiced: true });
    }
    expect(events).toHaveLength(1);
    return events[0].detail;
  } finally {
    bridge.stop();
    expect(getActiveLivePitchStageNotes()).toEqual([]);
  }
}

describe("humming classification through live and import lanes", () => {
  it.each([
    ["C", "major"], ["F", "major"], ["D#", "harmonic minor"],
    ["F#", "lydian"], ["A", "minor pentatonic"], ["A#", "minor blues"],
    ["C#", "chromatic"],
  ] as const)("keeps a chromatic vocal sweep in %s %s with identical live identity", (key, mode) => {
    // C2–C7, every semitone at 0, ±30 and ±49 cents, in one retained take.
    const pitches = Array.from({ length: 61 }, (_, index) => index + 36)
      .flatMap((midi) => [-49, -30, 0, 30, 49].map((cents) => ({ midi, cents })));
    const detected = pitches.map(({ midi, cents }) => midi + cents / 100);
    // Exercise both fractional MIDI and Hz from a provider with rounded MIDI.
    const fromMidi = pitchAnalysisToPatternCandidates(take(detected.map((midi) => ({ midi }))), { key, mode });
    const fromHz = pitchAnalysisToPatternCandidates(take(detected.map((midi) => ({
      midi: Math.round(midi), pitch_hz: hz(midi),
    }))), { key, mode });
    expect(fromMidi).toHaveLength(1);
    expect(fromHz).toHaveLength(1);
    expect(fromMidi[0].notes).toHaveLength(pitches.length);
    expect(fromHz[0].notes).toHaveLength(pitches.length);

    pitches.forEach(({ midi, cents }, index) => {
      const scaleIndex = getScaleForMode(mode).intervals.indexOf(
        ((midi - CHROMATIC_NOTES.indexOf(key)) % 12 + 12) % 12,
      );
      const borrowed = scaleIndex < 0 || Math.abs(cents) > 40;
      const expectedIndex = borrowed ? -1 : scaleIndex;
      const octave = Math.floor(midi / 12) - 1;
      const note = `${CHROMATIC_NOTES[midi % 12]}${octave}`;
      for (const imported of [fromMidi[0].notes[index], fromHz[0].notes[index]]) {
        expect(imported).toMatchObject({
          note, octave, scaleIndex: expectedIndex, scaleDegree: expectedIndex + 1,
          isBorrowed: borrowed, pitchClassIndex: midi % 12, frequency: hz(midi),
          pressTime: index * 250, releaseTime: (index + 1) * 250, duration: 250,
        });
      }
      const live = livePitch(detected[index], key, mode);
      expect(live).toMatchObject({
        noteName: note, octave, solfegeIndex: expectedIndex, pitchClassIndex: midi % 12,
        frequency: fromHz[0].notes[index].frequency,
        note: { number: expectedIndex + 1,
          name: pitchSolfege(fromHz[0].notes[index].note, { tonic: key, mode }) },
      });
    });
  });

  it.each([-1, 1])("includes exactly 40 cents but borrows just beyond it (direction %i)", (direction) => {
    for (const cents of [40, 40.001, 49, 50, 59, 60]) {
      const midi = 60 + direction * cents / 100;
      const imported = pitchAnalysisToPatternCandidates(take([{ midi: Math.round(midi), pitch_hz: hz(midi) }]),
        { key: "C", mode: "major" })[0].notes[0];
      // Below C, 60 cents is also exactly 40 cents above B, another scale tone.
      const borrowed = cents > 40 && !(direction === -1 && cents === 60);
      expect(imported.isBorrowed).toBe(borrowed);
      expect(livePitch(midi, "C", "major").solfegeIndex).toBe(imported.scaleIndex);
      expect(classifyDetectedPitch({ midi: 60, cents: direction * cents }, { tonic: "C", mode: "major" })?.borrowed)
        .toBe(borrowed);
    }
  });

  it.each([[61, "Ra"], [63, "Me"], [66, "Fi"], [68, "Le"], [70, "Te"]] as const)(
    "carries the chromatic syllable %s → %s", (midi, syllable) => {
      const imported = pitchAnalysisToPatternCandidates(take([{ midi }]), { key: "C", mode: "major" })[0].notes[0];
      expect(imported.isBorrowed).toBe(true);
      expect(pitchSolfege(imported.note, { tonic: "C", mode: "major" })).toBe(syllable);
      expect(livePitch(midi, "C", "major").note).toMatchObject({ name: syllable, number: 0 });
    },
  );

  it("falls back to MIDI for invalid Hz and keeps valid Hz when MIDI is absent", () => {
    const notes = pitchAnalysisToPatternCandidates(take([
      { midi: 61, pitch_hz: 0 }, { midi: 63, pitch_hz: NaN },
      { midi: 66, pitch_hz: -1 }, { midi: NaN, pitch_hz: hz(68) },
    ]), { key: "C", mode: "major" })[0].notes;
    expect(notes.map((note) => note.note)).toEqual(["C#4", "D#4", "F#4", "G#4"]);
    expect(notes.every((note) => note.isBorrowed)).toBe(true);
  });
});
