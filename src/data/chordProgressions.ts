import type { HarmonyAlteration } from "@/domain/harmony";
import type { ChordStep, ChordTexture } from "@/types/patterns";
import type { ChromaticNote, MusicalMode } from "@/types/music";

export interface ChordProgression {
  id: string;
  name: string;
  key: ChromaticNote;
  mode: MusicalMode;
  bpm: number;
  instrument: string;
  texture: ChordTexture;
  /** Octave of the key's tonic; chords stack upward from it. */
  octave?: number;
  chords: ChordStep[];
}

/** A chord on scale degree `degree`, optionally bent by a Joystick character. */
function chord(degree: number, beats: number, alteration?: HarmonyAlteration): ChordStep {
  return alteration ? { degree, beats, alteration } : { degree, beats };
}

/**
 * Famous progressions expressed as degrees plus Joystick characters, so each one
 * is playable on the Keyboard chord row. `flip` turns a minor degree major (or
 * the reverse), `jazzy7` adds sevenths, `dominant7` is the Bluesy stab.
 */
export const CHORD_PROGRESSIONS: readonly ChordProgression[] = [
  {
    id: "pattern-chords-four-chords-1",
    name: "Four Chords (I–V–vi–IV)",
    key: "C",
    mode: "major",
    bpm: 92,
    instrument: "piano",
    texture: "pulse",
    // Second pass dresses the same road: maj7, plain, m7, sixth.
    chords: [
      chord(1, 4), chord(5, 4), chord(6, 4), chord(4, 4),
      chord(1, 4, "jazzy7"), chord(5, 4), chord(6, 4, "jazzy7"), chord(4, 4, "sweet"),
    ],
  },
  {
    id: "pattern-chords-canon-1",
    name: "Canon in D (I–V–vi–iii–IV–I–IV–V)",
    key: "D",
    mode: "major",
    bpm: 72,
    instrument: "gm_string_ensemble_1",
    texture: "arpeggio",
    chords: [
      chord(1, 2), chord(5, 2), chord(6, 2), chord(3, 2),
      chord(4, 2), chord(1, 2), chord(4, 2), chord(5, 2),
    ],
  },
  {
    id: "pattern-chords-doo-wop-1",
    name: "Doo-Wop Turnaround (I–vi–IV–V)",
    key: "G",
    mode: "major",
    bpm: 78,
    instrument: "gm_epiano2",
    texture: "pulse",
    chords: [
      chord(1, 4), chord(6, 4), chord(4, 4), chord(5, 4),
      chord(1, 4), chord(6, 4), chord(4, 4), chord(5, 4, "dominant7"),
    ],
  },
  {
    id: "pattern-chords-ii-v-i-1",
    name: "ii–V–I (Dm7–G7–Cmaj7)",
    key: "C",
    mode: "major",
    bpm: 92,
    instrument: "gm_electric_guitar_jazz",
    texture: "strum",
    chords: [chord(2, 4, "jazzy7"), chord(5, 4, "dominant7"), chord(1, 8, "jazzy7")],
  },
  {
    id: "pattern-chords-turnaround-1",
    name: "Jazz Turnaround (I–vi–ii–V)",
    key: "F",
    mode: "major",
    bpm: 120,
    instrument: "gm_vibraphone",
    texture: "block",
    chords: [
      chord(1, 2, "jazzy7"), chord(6, 2, "jazzy7"), chord(2, 2, "jazzy7"), chord(5, 2, "dominant7"),
      chord(1, 2, "jazzy7"), chord(6, 2, "jazzy7"), chord(2, 2, "jazzy7"), chord(5, 2, "dominant7"),
      chord(1, 4, "lush9"),
    ],
  },
  {
    id: "pattern-chords-twelve-bar-blues-1",
    name: "Twelve-Bar Blues in A",
    key: "A",
    mode: "mixolydian",
    bpm: 128,
    instrument: "gm_overdriven_guitar",
    texture: "pulse",
    // I7 I7 I7 I7 | IV7 IV7 I7 I7 | V7 IV7 I7 V7
    chords: [
      chord(1, 4, "dominant7"), chord(1, 4, "dominant7"), chord(1, 4, "dominant7"), chord(1, 4, "dominant7"),
      chord(4, 4, "dominant7"), chord(4, 4, "dominant7"), chord(1, 4, "dominant7"), chord(1, 4, "dominant7"),
      chord(5, 4, "dominant7"), chord(4, 4, "dominant7"), chord(1, 4, "dominant7"), chord(5, 4, "dominant7"),
    ],
  },
  {
    id: "pattern-chords-andalusian-1",
    name: "Andalusian Cadence (i–VII–VI–V)",
    key: "A",
    mode: "minor",
    bpm: 96,
    instrument: "gm_acoustic_guitar_steel",
    texture: "strum",
    // The v is flipped to a major V; the second pass sharpens it into E7.
    chords: [
      chord(1, 4), chord(7, 4), chord(6, 4), chord(5, 4, "flip"),
      chord(1, 4), chord(7, 4), chord(6, 4), chord(5, 4, "dominant7"),
    ],
  },
  {
    id: "pattern-chords-desert-highway-1",
    name: "Desert Highway (i–V–VII–IV–VI–III–iv–V)",
    key: "B",
    mode: "minor",
    bpm: 82,
    instrument: "gm_acoustic_guitar_nylon",
    texture: "strum",
    // Flip makes the minor v and iv major; the last V is F#7, pulling back to i.
    chords: [
      chord(1, 4), chord(5, 4, "flip"), chord(7, 4), chord(4, 4, "flip"),
      chord(6, 4), chord(3, 4), chord(4, 4), chord(5, 4, "dominant7"),
    ],
  },
  {
    id: "pattern-chords-royal-road-1",
    name: "Royal Road (IVmaj7–V7–iii7–vi7)",
    key: "C",
    mode: "major",
    bpm: 124,
    instrument: "gm_orchestral_harp",
    texture: "arpeggio",
    chords: [
      chord(4, 4, "jazzy7"), chord(5, 4, "dominant7"), chord(3, 4, "jazzy7"), chord(6, 4, "jazzy7"),
    ],
  },
  {
    id: "pattern-chords-bittersweet-turn-1",
    name: "Bittersweet Turn (I–III–IV–iv)",
    key: "G",
    mode: "major",
    bpm: 88,
    instrument: "gm_electric_guitar_clean",
    texture: "strum",
    // Flip lifts iii to a major III, then turns the major IV minor.
    chords: [chord(1, 4), chord(3, 4, "flip"), chord(4, 4), chord(4, 4, "flip")],
  },
  {
    id: "pattern-chords-mixolydian-rock-1",
    name: "Mixolydian Rock (I–♭VII–IV–I)",
    key: "G",
    mode: "mixolydian",
    bpm: 116,
    instrument: "gm_distortion_guitar",
    texture: "pulse",
    chords: [chord(1, 4), chord(7, 4), chord(4, 4), chord(1, 4)],
  },
  {
    id: "pattern-chords-epic-minor-1",
    name: "Epic Minor (i–VI–III–VII)",
    key: "A",
    mode: "minor",
    bpm: 80,
    instrument: "gm_pad_choir",
    texture: "block",
    // Second pass: Lush, Jazzy, Lush, then Open to hang the last chord.
    chords: [
      chord(1, 4), chord(6, 4), chord(3, 4), chord(7, 4),
      chord(1, 4, "lush9"), chord(6, 4, "jazzy7"), chord(3, 4, "lush9"), chord(7, 4, "sus4"),
    ],
  },
  {
    id: "pattern-chords-lydian-lift-1",
    name: "Lydian Lift (I–II–iii–II)",
    key: "F",
    mode: "lydian",
    bpm: 76,
    instrument: "gm_pad_new_age",
    texture: "arpeggio",
    chords: [
      chord(1, 4, "lush9"), chord(2, 4), chord(3, 4, "jazzy7"), chord(2, 4),
    ],
  },
  {
    id: "pattern-chords-nine-colors-1",
    name: "Nine Colors of A (Joystick Tour)",
    key: "A",
    mode: "minor",
    bpm: 84,
    instrument: "gm_epiano2",
    texture: "block",
    // One root, every Joystick position: Auto, Sweet, Jazzy, Lush, Open,
    // Dreamy, Bluesy, Flip, Dark. A minor base, because on a major base
    // Dark and Flip both land on the same minor chord.
    chords: [
      chord(1, 2), chord(1, 2, "sweet"), chord(1, 2, "jazzy7"), chord(1, 2, "lush9"),
      chord(1, 2, "sus4"), chord(1, 2, "augmented"), chord(1, 2, "dominant7"),
      chord(1, 2, "flip"), chord(1, 2, "dark"),
    ],
  },
  {
    id: "pattern-chords-circle-of-fifths-1",
    name: "Circle of Fifths (vi–ii–V–I–IV–vii–III–vi)",
    key: "C",
    mode: "major",
    bpm: 108,
    instrument: "gm_epiano1",
    texture: "strum",
    chords: [
      chord(6, 4, "jazzy7"), chord(2, 4, "jazzy7"), chord(5, 4, "dominant7"), chord(1, 4, "jazzy7"),
      chord(4, 4, "jazzy7"), chord(7, 4, "dark"), chord(3, 4, "dominant7"), chord(6, 4, "jazzy7"),
    ],
  },
  {
    id: "pattern-chords-sonata-cadence-1",
    name: "Sonata Cadence (I–IV–V7–I)",
    key: "C",
    mode: "major",
    bpm: 96,
    instrument: "gm_harpsichord",
    texture: "alberti",
    chords: [chord(1, 4), chord(4, 4), chord(5, 4, "dominant7"), chord(1, 4)],
  },
  {
    id: "pattern-chords-dorian-vamp-1",
    name: "Dorian Vamp (i7–IV7)",
    key: "D",
    mode: "dorian",
    bpm: 104,
    instrument: "gm_clavinet",
    texture: "pulse",
    chords: [
      chord(1, 4, "jazzy7"), chord(4, 4, "dominant7"),
      chord(1, 4, "jazzy7"), chord(4, 4, "dominant7"),
    ],
  },
  {
    id: "pattern-chords-gothic-cathedral-1",
    name: "Gothic Cathedral (i–iv–V–VI–V–i)",
    key: "A",
    mode: "harmonic minor",
    bpm: 72,
    instrument: "gm_church_organ",
    texture: "block",
    chords: [
      chord(1, 4), chord(4, 4), chord(5, 4), chord(6, 4),
      chord(5, 4, "dominant7"), chord(1, 8),
    ],
  },
];
