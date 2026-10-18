import { Note } from "@tonaljs/tonal";
import type { Pattern, PatternNote } from "@/types/patterns";
import type { LiveArticulation } from "@/services/liveArticulation";

// A reconstruction, not a MIDI capture. Source timings, evidence and audible
// limitations are documented in docs/patterns/hijaq-performance.md.
const ID = "pattern-hijaq-just-turn-it-on-1";
const SOURCE_START = 12;
const LOOP_START = 17.2;
const LOOP_SECONDS = 90 / 13; // Measured repeated phrase: ~6.923 seconds.
const SCALE = [0, 2, 4, 5, 7, 9, 11];
const notes: PatternNote[] = [];

const loopEnvelope: LiveArticulation = {
  attack: 0.12, decay: 0.08, sustain: 0.85, release: 0.12,
};
const chordEnvelope: LiveArticulation = {
  attack: 0.18, decay: 0.25, sustain: 0.8, release: 0.35,
};

function addNote(
  pitch: string,
  sourceTime: number,
  seconds: number,
  velocity: number,
  articulation: LiveArticulation,
): void {
  const parsed = Note.get(pitch);
  const scaleIndex = SCALE.indexOf(parsed.chroma);
  const pressTime = Math.round((sourceTime - SOURCE_START) * 1000);
  const releaseTime = Math.round((sourceTime + seconds - SOURCE_START) * 1000);
  notes.push({
    id: `${ID}-note-${notes.length + 1}`,
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

// The initial exploratory notes precede the recorded loop.
addNote("C3", 12, 0.65, 0.32, loopEnvelope);
addNote("E3", 12.65, 0.2, 0.32, loopEnvelope);
addNote("G3", 12.85, 0.2, 0.32, loopEnvelope);
addNote("B3", 13.05, 0.24, 0.32, { ...loopEnvelope, release: 2.5 });

// Measured attacks within the first recorded phrase. Repeating its small
// timing variations preserves the hand-played loop instead of quantizing it.
const attacks = [
  0, 0.44, 0.66, 0.88, 1.3, 1.52, 1.76, 2.18, 2.38, 2.62, 3.04, 3.26,
  3.5, 3.94, 4.12, 4.34, 4.78, 5, 5.2, 5.66, 5.86, 6.08, 6.52, 6.72,
];
for (let repeat = 0; repeat < 15; repeat++) {
  attacks.forEach((offset, index) => {
    const sourceTime = LOOP_START + repeat * LOOP_SECONDS + offset;
    const pitch = index % 3 === 0 ? (index < 12 ? "C3" : "E3")
      : index % 3 === 1 ? "G3" : "B3";
    const nextAttack = attacks[index + 1] ?? LOOP_SECONDS;
    // The performer lowers the volume in the closing loop. Approximate that
    // continuous motion at each attack, keeping these notes fully editable.
    const fade = Math.min(1, Math.max(0.025, (121.15 - sourceTime) / 7.5));
    addNote(pitch, sourceTime, nextAttack - offset, 0.36 * fade, loopEnvelope);
  });
}

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
chords.forEach(([start, quality], index) => {
  const end = chords[index + 1]?.[0] ?? 103.8;
  voicings[quality].forEach((pitch, voice) => {
    addNote(pitch, start, end - start, voice === 0 ? 0.5 : 0.22, chordEnvelope);
  });
});

notes.sort((a, b) => a.pressTime - b.pressTime || a.octave - b.octave);

export const hijaqPerformance: Pattern = {
  id: ID,
  name: "just turn it on and make something. — hijaq. (reconstruction)",
  tags: ["hijaq", "HiChord", "performance", "reconstruction"],
  notes,
  duration: 110000,
  noteCount: notes.length,
  key: "C",
  mode: "major",
  bpm: 416 / 3,
  timeSignature: "4/4",
  instrument: "sawtooth",
  shape: { cutoff: 9000, resonance: 0, room: 0.18, delay: 0, attack: null, release: null },
  createdAt: 0,
  isDefault: true,
  isKept: true,
};
