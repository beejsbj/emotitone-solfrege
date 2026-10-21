import { Note } from "@tonaljs/tonal";
import type { Pattern, PatternNote } from "@/types/patterns";
import type { LiveArticulation } from "@/services/liveArticulation";

// Editable approximate transcription, not a MIDI capture. Source evidence and
// the authored loop boundaries are in docs/patterns/hijaq-performance.md.
const BPM = 416 / 3;
const FIGURE_SECONDS = 90 / 13; // Four bars at the measured source tempo.
const HARMONY_SECONDS = FIGURE_SECONDS * 9; // 36 bars, aligned with the figure.
const SCALE = [0, 2, 4, 5, 7, 9, 11];

const loopEnvelope: LiveArticulation = {
  attack: 0.12, decay: 0.08, sustain: 0.85, release: 0.12,
};
const chordEnvelope: LiveArticulation = {
  attack: 0.18, decay: 0.25, sustain: 0.8, release: 0.35,
};

function addNote(
  notes: PatternNote[],
  patternId: string,
  pitch: string,
  start: number,
  end: number,
  velocity: number,
  articulation: LiveArticulation,
  loopSeconds: number,
): void {
  const parsed = Note.get(pitch);
  const scaleIndex = SCALE.indexOf(parsed.chroma);
  const pressTime = Math.round(start * 1000);
  // Cap rounded note endpoints at the exact fractional cycle boundary so
  // millisecond rounding cannot extend the authored loop.
  const releaseTime = Math.min(Math.round(end * 1000), loopSeconds * 1000);
  notes.push({
    id: `${patternId}-note-${notes.length + 1}`,
    note: pitch,
    octave: parsed.oct!,
    frequency: parsed.freq!,
    pitchClassIndex: parsed.chroma,
    scaleIndex,
    scaleDegree: scaleIndex + 1,
    isBorrowed: false,
    pressTime,
    releaseTime,
    duration: releaseTime - pressTime,
    velocity,
    articulation: { ...articulation },
  });
}

function makePattern(id: string, part: string, notes: PatternNote[], seconds: number): Pattern {
  notes.sort((a, b) => a.pressTime - b.pressTime || a.octave - b.octave);
  return {
    id,
    name: `hijaq. — ${part} (approximation)`,
    tags: ["hijaq", "HiChord", "loop", "transcription"],
    notes,
    duration: seconds * 1000,
    noteCount: notes.length,
    key: "C",
    mode: "major",
    bpm: BPM,
    timeSignature: "4/4",
    instrument: "sawtooth",
    shape: { cutoff: 9000, resonance: 0, room: 0.18, delay: 0, attack: null, release: null },
    createdAt: 0,
    isDefault: true,
    isKept: true,
  };
}

const ostinatoId = "pattern-hijaq-ostinato-1";
const ostinatoNotes: PatternNote[] = [];
// One measured phrase, starting around source 00:17.2. Its small timing
// variations repeat naturally with the looper instead of a baked arrangement.
const attacks = [
  0, 0.44, 0.66, 0.88, 1.3, 1.52, 1.76, 2.18, 2.38, 2.62, 3.04, 3.26,
  3.5, 3.94, 4.12, 4.34, 4.78, 5, 5.2, 5.66, 5.86, 6.08, 6.52, 6.72,
];
attacks.forEach((offset, index) => {
  const pitch = index % 3 === 0 ? (index < 12 ? "C3" : "E3")
    : index % 3 === 1 ? "G3" : "B3";
  addNote(ostinatoNotes, ostinatoId, pitch, offset,
    attacks[index + 1] ?? FIGURE_SECONDS, 0.36, loopEnvelope, FIGURE_SECONDS);
});
export const hijaqOstinato = makePattern(ostinatoId, "Ostinato", ostinatoNotes, FIGURE_SECONDS);

const voicings = {
  C: ["C1", "C3", "E3", "G3"],
  Em: ["E1", "E3", "G3", "B3"],
  Am: ["A1", "A3", "C4", "E4"],
  Em7: ["E1", "E3", "G3", "B3", "D4"],
  Fmaj7: ["F1", "F3", "A3", "C4", "E4"],
  Cmaj7: ["C1", "C3", "E3", "G3", "B3"],
  Dm7: ["D1", "D3", "F3", "A3", "C4"],
} as const;

// Approximate live chord changes in source-video seconds. The display's
// chord labels and the audio's fundamentals establish the main voicings;
// short transitions and the HiChord's glide remain an approximation.
const chords: [number, keyof typeof voicings][] = [
  [44.82, "C"], [48.24, "Em"], [51.72, "C"],
  [54.76, "Am"], [55.18, "Em"], [58.64, "C"],
  [62.1, "Em"], [65.58, "C"], [68.78, "Am"],
  [69.08, "Em"], [71.84, "Em7"], [72.64, "Fmaj7"],
  [76.12, "Cmaj7"], [79.58, "Fmaj7"], [83.04, "Cmaj7"],
  [86.5, "Dm7"], [89.96, "Cmaj7"], [93.42, "Em7"],
  [96.88, "Fmaj7"], [100.34, "Cmaj7"],
];

const rootsId = "pattern-hijaq-low-roots-1";
const chordsId = "pattern-hijaq-chords-1";
const rootNotes: PatternNote[] = [];
const chordNotes: PatternNote[] = [];
const HARMONY_SOURCE_START = 44.82;
chords.forEach(([start, quality], index) => {
  const end = chords[index + 1]?.[0] ?? 103.8;
  voicings[quality].forEach((pitch, voice) => {
    addNote(voice === 0 ? rootNotes : chordNotes, voice === 0 ? rootsId : chordsId,
      pitch, start - HARMONY_SOURCE_START, end - HARMONY_SOURCE_START,
      voice === 0 ? 0.5 : 0.22, chordEnvelope, HARMONY_SECONDS);
  });
});
export const hijaqLowRoots = makePattern(rootsId, "Low roots", rootNotes, HARMONY_SECONDS);
export const hijaqChords = makePattern(chordsId, "Chords", chordNotes, HARMONY_SECONDS);

const openingId = "pattern-hijaq-opening-1";
const openingNotes: PatternNote[] = [];
// The exploratory source opening is optional and loops like every other part;
// loading it does not introduce a once-only intro or an automatic arrangement.
addNote(openingNotes, openingId, "C3", 0, 0.65, 0.32, loopEnvelope, FIGURE_SECONDS);
addNote(openingNotes, openingId, "E3", 0.65, 0.85, 0.32, loopEnvelope, FIGURE_SECONDS);
addNote(openingNotes, openingId, "G3", 0.85, 1.05, 0.32, loopEnvelope, FIGURE_SECONDS);
addNote(openingNotes, openingId, "B3", 1.05, 1.29, 0.32,
  { ...loopEnvelope, release: 2.5 }, FIGURE_SECONDS);
export const hijaqOpening = makePattern(openingId, "Opening · optional", openingNotes, FIGURE_SECONDS);

export const hijaqPatterns: Pattern[] = [
  hijaqOstinato, hijaqLowRoots, hijaqChords, hijaqOpening,
];
