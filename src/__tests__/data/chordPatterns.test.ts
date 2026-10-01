import { describe, expect, it } from "vitest";
import { defaultPatterns } from "@/data/patterns";
import { CHORD_PROGRESSIONS } from "@/data/chordProgressions";
import { buildHarmony } from "@/domain/harmony";

/** The chords each library progression must spell, independent of its degree/Joystick recipe. */
const EXPECTED_SYMBOLS: Record<string, string[]> = {
  "pattern-chords-four-chords-1": [
    "C", "G", "Am", "F", "Cmaj7", "G", "Am7", "F6",
  ],
  "pattern-chords-canon-1": ["D", "A", "Bm", "F#m", "G", "D", "G", "A"],
  "pattern-chords-doo-wop-1": ["G", "Em", "C", "D", "G", "Em", "C", "D7"],
  "pattern-chords-ii-v-i-1": ["Dm7", "G7", "Cmaj7"],
  "pattern-chords-turnaround-1": [
    "Fmaj7", "Dm7", "Gm7", "C7", "Fmaj7", "Dm7", "Gm7", "C7", "Fmaj9",
  ],
  "pattern-chords-twelve-bar-blues-1": [
    "A7", "A7", "A7", "A7", "D7", "D7", "A7", "A7", "E7", "D7", "A7", "E7",
  ],
  "pattern-chords-andalusian-1": ["Am", "G", "F", "E", "Am", "G", "F", "E7"],
  "pattern-chords-desert-highway-1": ["Bm", "F#", "A", "E", "G", "D", "Em", "F#7"],
  "pattern-chords-royal-road-1": ["Fmaj7", "G7", "Em7", "Am7"],
  "pattern-chords-bittersweet-turn-1": ["G", "B", "C", "Cm"],
  "pattern-chords-mixolydian-rock-1": ["G", "F", "C", "G"],
  "pattern-chords-epic-minor-1": [
    "Am", "F", "C", "G", "Am9", "Fmaj7", "Cmaj9", "Gsus4",
  ],
  "pattern-chords-lydian-lift-1": ["Fmaj9", "G", "Am7", "G"],
  "pattern-chords-nine-colors-1": [
    "Am", "Asus2", "Am7", "Am9", "Asus4", "Aaug", "A7", "A", "Adim",
  ],
  "pattern-chords-circle-of-fifths-1": [
    "Am7", "Dm7", "G7", "Cmaj7", "Fmaj7", "Bdim", "E7", "Am7",
  ],
  "pattern-chords-sonata-cadence-1": ["C", "F", "G7", "C"],
  "pattern-chords-dorian-vamp-1": ["Dm7", "G7", "Dm7", "G7"],
  "pattern-chords-gothic-cathedral-1": ["Am", "Dm", "E", "F", "E7", "Am"],
  "pattern-chords-interstellar-1": [
    "Fmaj7", "Em", "Am", "Em7", "Fmaj7", "Em", "Am", "Em7",
  ],
};

function symbolsOf(progression: (typeof CHORD_PROGRESSIONS)[number]) {
  return progression.chords.map((step) => {
    const bank = buildHarmony({
      tonic: progression.key,
      scaleType: progression.mode,
      octave: progression.octave ?? 4,
      alteration: step.alteration ?? "auto",
    });
    return bank[step.degree - 1].symbol;
  });
}

describe("chord library patterns", () => {
  it("spells every famous progression with the chords it is known for", () => {
    for (const progression of CHORD_PROGRESSIONS) {
      expect(symbolsOf(progression), progression.name).toEqual(EXPECTED_SYMBOLS[progression.id]);
    }
    expect(Object.keys(EXPECTED_SYMBOLS).sort()).toEqual(
      CHORD_PROGRESSIONS.map((progression) => progression.id).sort(),
    );
  });

  it("joins the library with unique ids and default/kept flags", () => {
    const ids = defaultPatterns.map((pattern) => pattern.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const progression of CHORD_PROGRESSIONS) {
      const pattern = defaultPatterns.find((candidate) => candidate.id === progression.id);
      expect(pattern, progression.name).toBeDefined();
      expect(pattern).toMatchObject({
        isDefault: true,
        isKept: true,
        key: progression.key,
        mode: progression.mode,
        bpm: progression.bpm,
        instrument: progression.instrument,
      });
    }
  });

  it("is polyphonic: every pattern strikes more than one tone at once or in a figure", () => {
    for (const progression of CHORD_PROGRESSIONS) {
      const pattern = defaultPatterns.find((candidate) => candidate.id === progression.id)!;
      const pitchesAtFirstBeat = pattern.notes.filter(
        (note) => note.pressTime < 60000 / progression.bpm,
      );
      expect(new Set(pitchesAtFirstBeat.map((note) => note.note)).size, progression.name)
        .toBeGreaterThan(1);
    }
  });

  it("times each pattern to the exact beats of its chords", () => {
    for (const progression of CHORD_PROGRESSIONS) {
      const pattern = defaultPatterns.find((candidate) => candidate.id === progression.id)!;
      const beats = progression.chords.reduce((sum, step) => sum + step.beats, 0);
      const beatMs = 60000 / progression.bpm;
      expect(pattern.duration, progression.name).toBeGreaterThanOrEqual(Math.round(beats * beatMs) - progression.chords.length);
      expect(pattern.duration, progression.name).toBeLessThanOrEqual(Math.round(beats * beatMs) + progression.chords.length);
      expect(pattern.noteCount).toBe(pattern.notes.length);
      for (const note of pattern.notes) {
        expect(note.duration).toBeGreaterThan(0);
        expect(note.releaseTime).toBe(note.pressTime + note.duration);
        expect(note.releaseTime, `${progression.name} ${note.note}`).toBeLessThanOrEqual(pattern.duration!);
      }
      const sorted = [...pattern.notes].sort((a, b) => a.pressTime - b.pressTime);
      expect(pattern.notes).toEqual(sorted);
      expect(new Set(pattern.notes.map((note) => note.id)).size).toBe(pattern.notes.length);
    }
  });

  it("marks flipped and bent tones outside the key as borrowed", () => {
    const andalusian = defaultPatterns.find((pattern) => pattern.id === "pattern-chords-andalusian-1")!;
    const sharpened = andalusian.notes.filter((note) => note.pitchClassIndex === 8);
    expect(sharpened.length).toBeGreaterThan(0);
    expect(sharpened.every((note) => note.isBorrowed && note.scaleDegree === 0)).toBe(true);

    const rock = defaultPatterns.find((pattern) => pattern.id === "pattern-chords-mixolydian-rock-1")!;
    expect(rock.notes.some((note) => note.isBorrowed)).toBe(false);
  });

  it("gives each texture its own shape", () => {
    const byId = (id: string) => defaultPatterns.find((pattern) => pattern.id === id)!;
    const firstBar = (id: string, bars: number) => {
      const pattern = byId(id);
      const barMs = (60000 / pattern.bpm!) * 4 * bars;
      return pattern.notes.filter((note) => note.pressTime < barMs);
    };

    // block: three tones struck together for one A minor chord
    const block = byId("pattern-chords-nine-colors-1").notes.slice(0, 3);
    expect(block.map((note) => note.note)).toEqual(["A4", "C5", "E5"]);
    expect(new Set(block.map((note) => note.pressTime)).size).toBe(1);

    // strum: same tones, staggered low to high
    const strum = byId("pattern-chords-ii-v-i-1").notes.slice(0, 4);
    expect(strum.map((note) => note.note)).toEqual(["D4", "F4", "A4", "C5"]);
    expect(strum.map((note) => note.pressTime)).toEqual([0, 32, 64, 96]);

    // pulse: the chord returns every beat
    const pulse = firstBar("pattern-chords-four-chords-1", 1);
    expect(new Set(pulse.map((note) => note.pressTime)).size).toBe(4);

    // arpeggio: one tone at a time, rising then falling
    const arp = byId("pattern-chords-canon-1").notes.slice(0, 4);
    expect(arp.map((note) => note.note)).toEqual(["D4", "F#4", "A4", "F#4"]);

    // alberti: low, high, middle, high
    const alberti = byId("pattern-chords-sonata-cadence-1").notes.slice(0, 4);
    expect(alberti.map((note) => note.note)).toEqual(["C4", "G4", "E4", "G4"]);
  });

  it("voices inversions with the named bass tone lowest", () => {
    const theme = defaultPatterns.find((pattern) => pattern.id === "pattern-chords-interstellar-1")!;
    const barMs = (60000 / theme.bpm!) * 3;
    const bassOf = (bar: number) => {
      const bar_ = theme.notes.filter(
        (note) => note.pressTime >= bar * barMs && note.pressTime < (bar + 1) * barMs,
      );
      const pitches = bar_.map((note) => note.note).map((name) => ({
        name,
        midi: Number(name.slice(-1)) * 12 + ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
          .indexOf(name.slice(0, -1)),
      }));
      return pitches.sort((a, b) => a.midi - b.midi)[0].name;
    };

    // Fmaj7 / Em over G / Am / Em7 over G: F, G, A, G
    expect([0, 1, 2, 3].map(bassOf)).toEqual(["F3", "G3", "A3", "G3"]);
  });
});
