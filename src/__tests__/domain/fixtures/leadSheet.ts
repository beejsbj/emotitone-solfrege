import type { MusicalMode } from "@/types/music";

/**
 * A hand-written lead sheet: what a musician writes over each voicing in each
 * key. Expected symbols come from music theory, not from the code under test.
 *
 * `tonic` is the stored key (sharps-only, as the app persists it). `pitches`
 * are written as the app stores them where that matters (sharps-only, e.g.
 * D#4 for Eb4), low to high unless the case is about press order.
 */
export interface LeadSheetEntry {
  tonic: string;
  mode: MusicalMode;
  pitches: string[];
  symbol: string;
  /** What the chord is, for a reader of a failing test. */
  note: string;
}

export const LEAD_SHEET: readonly LeadSheetEntry[] = [
  // C major: diatonic triads, sevenths and inversions.
  { tonic: "C", mode: "major", pitches: ["C4", "E4", "G4"], symbol: "C", note: "I" },
  { tonic: "C", mode: "major", pitches: ["E3", "G3", "C4"], symbol: "C/E", note: "I6, first inversion" },
  { tonic: "C", mode: "major", pitches: ["G3", "C4", "E4"], symbol: "C/G", note: "I64, second inversion" },
  { tonic: "C", mode: "major", pitches: ["D4", "F4", "A4"], symbol: "Dm", note: "ii" },
  { tonic: "C", mode: "major", pitches: ["E4", "G4", "B4"], symbol: "Em", note: "iii" },
  { tonic: "C", mode: "major", pitches: ["F3", "A3", "C4"], symbol: "F", note: "IV" },
  { tonic: "C", mode: "major", pitches: ["G3", "B3", "D4", "F4"], symbol: "G7", note: "V7" },
  { tonic: "C", mode: "major", pitches: ["B3", "F4", "G4", "D5"], symbol: "G7/B", note: "V65" },
  { tonic: "C", mode: "major", pitches: ["A3", "C4", "E4"], symbol: "Am", note: "vi" },
  { tonic: "C", mode: "major", pitches: ["B3", "D4", "F4"], symbol: "B°", note: "vii°" },
  { tonic: "C", mode: "major", pitches: ["B3", "D4", "F4", "A4"], symbol: "Bø7", note: "viiø7" },
  { tonic: "C", mode: "major", pitches: ["C4", "E4", "G4", "B4"], symbol: "Cmaj7", note: "Imaj7" },
  { tonic: "C", mode: "major", pitches: ["D4", "F4", "A4", "C5"], symbol: "Dm7", note: "ii7" },
  { tonic: "C", mode: "major", pitches: ["C4", "E4", "G4", "A4"], symbol: "C6", note: "I6 (added sixth)" },
  { tonic: "C", mode: "major", pitches: ["C4", "E4", "G4", "D5"], symbol: "Cadd9", note: "I add 9" },
  { tonic: "C", mode: "major", pitches: ["G3", "C4", "D4", "F4"], symbol: "G7sus4", note: "V7sus4" },
  { tonic: "C", mode: "major", pitches: ["C4", "F4", "G4"], symbol: "Csus4", note: "Isus4" },
  { tonic: "C", mode: "major", pitches: ["C4", "D4", "G4"], symbol: "Csus2", note: "Isus2" },
  { tonic: "C", mode: "major", pitches: ["C4", "E4", "G#4"], symbol: "C+", note: "augmented I" },
  // C major: borrowed and applied chords, stored as sharps.
  { tonic: "C", mode: "major", pitches: ["C4", "D#4", "G4"], symbol: "Cm", note: "i, borrowed Eb" },
  { tonic: "C", mode: "major", pitches: ["F4", "G#4", "C5"], symbol: "Fm", note: "iv, borrowed Ab" },
  { tonic: "C", mode: "major", pitches: ["G#3", "C4", "D#4"], symbol: "Ab", note: "bVI" },
  { tonic: "C", mode: "major", pitches: ["A#3", "D4", "F4"], symbol: "Bb", note: "bVII" },
  { tonic: "C", mode: "major", pitches: ["C#4", "F4", "G#4"], symbol: "Db", note: "bII, Neapolitan" },
  { tonic: "C", mode: "major", pitches: ["E3", "G#3", "B3"], symbol: "E", note: "V/vi" },
  { tonic: "C", mode: "major", pitches: ["D4", "F#4", "A4", "C5"], symbol: "D7", note: "V7/V" },
  { tonic: "C", mode: "major", pitches: ["G#3", "B3", "D4", "F4"], symbol: "G#°7", note: "vii°7/vi" },
  { tonic: "C", mode: "major", pitches: ["C#4", "E4", "G4", "A#4"], symbol: "C#°7", note: "vii°7/ii" },

  // F major: the fourth degree is Bb.
  { tonic: "F", mode: "major", pitches: ["A#3", "D4", "F4"], symbol: "Bb", note: "IV" },
  { tonic: "F", mode: "major", pitches: ["D4", "F4", "A#4"], symbol: "Bb/D", note: "IV6" },
  { tonic: "F", mode: "major", pitches: ["A3", "C4", "F4"], symbol: "F/A", note: "I6" },
  { tonic: "F", mode: "major", pitches: ["F4", "A4", "C5", "E5"], symbol: "Fmaj7", note: "Imaj7" },
  { tonic: "F", mode: "major", pitches: ["A#3", "D4", "F4", "A4"], symbol: "Bbmaj7", note: "IVmaj7" },
  { tonic: "F", mode: "major", pitches: ["C4", "E4", "G4", "A#4"], symbol: "C7", note: "V7" },
  { tonic: "F", mode: "major", pitches: ["G3", "A#3", "D4"], symbol: "Gm", note: "ii" },
  { tonic: "F", mode: "major", pitches: ["E4", "G4", "A#4"], symbol: "E°", note: "vii°" },
  { tonic: "F", mode: "major", pitches: ["E4", "G4", "A#4", "D5"], symbol: "Eø7", note: "viiø7" },

  // Eb major, stored as D#.
  { tonic: "D#", mode: "major", pitches: ["D#4", "G4", "A#4"], symbol: "Eb", note: "I" },
  { tonic: "D#", mode: "major", pitches: ["G3", "A#3", "D#4"], symbol: "Eb/G", note: "I6" },
  { tonic: "D#", mode: "major", pitches: ["G#3", "C4", "D#4", "G4"], symbol: "Abmaj7", note: "IVmaj7" },
  { tonic: "D#", mode: "major", pitches: ["A#3", "D4", "F4", "G#4"], symbol: "Bb7", note: "V7" },
  { tonic: "D#", mode: "major", pitches: ["G#3", "A#3", "D4", "F4"], symbol: "Bb7/Ab", note: "V42" },
  { tonic: "D#", mode: "major", pitches: ["F4", "G#4", "C5"], symbol: "Fm", note: "ii" },
  { tonic: "D#", mode: "major", pitches: ["C4", "D#4", "G4", "A#4"], symbol: "Cm7", note: "vi7" },
  { tonic: "D#", mode: "major", pitches: ["D4", "F4", "G#4"], symbol: "D°", note: "vii°" },

  // Bb major, stored as A#.
  { tonic: "A#", mode: "major", pitches: ["A#3", "D4", "F4"], symbol: "Bb", note: "I" },
  { tonic: "A#", mode: "major", pitches: ["D#4", "G4", "A#4"], symbol: "Eb", note: "IV" },
  { tonic: "A#", mode: "major", pitches: ["F4", "A4", "C5", "D#5"], symbol: "F7", note: "V7" },
  { tonic: "A#", mode: "major", pitches: ["A4", "C5", "D#5"], symbol: "A°", note: "vii°" },

  // Db major, stored as C#.
  { tonic: "C#", mode: "major", pitches: ["F#3", "A#3", "C#4"], symbol: "Gb", note: "IV" },
  { tonic: "C#", mode: "major", pitches: ["G#3", "C4", "D#4", "F#4"], symbol: "Ab7", note: "V7" },
  { tonic: "C#", mode: "major", pitches: ["D#4", "F#4", "A#4"], symbol: "Ebm", note: "ii" },
  { tonic: "C#", mode: "major", pitches: ["C4", "D#4", "F#4"], symbol: "C°", note: "vii°" },

  // D major.
  { tonic: "D", mode: "major", pitches: ["F#4", "A4", "C#5"], symbol: "F#m", note: "iii" },
  { tonic: "D", mode: "major", pitches: ["A3", "C#4", "E4", "G4"], symbol: "A7", note: "V7" },
  { tonic: "D", mode: "major", pitches: ["C#4", "E4", "G4"], symbol: "C#°", note: "vii°" },

  // F# major (six sharps; the stored sharp spelling is kept). E# is stored as F.
  { tonic: "F#", mode: "major", pitches: ["C#4", "F4", "G#4"], symbol: "C#", note: "V, third E#" },
  { tonic: "F#", mode: "major", pitches: ["F4", "G#4", "B4"], symbol: "E#°", note: "vii°" },

  // Minor keys.
  { tonic: "E", mode: "minor", pitches: ["E4", "G4", "B4"], symbol: "Em", note: "i" },
  { tonic: "E", mode: "minor", pitches: ["C4", "E4", "G4"], symbol: "C", note: "VI" },
  { tonic: "E", mode: "minor", pitches: ["F#3", "A3", "C4"], symbol: "F#°", note: "ii°" },
  { tonic: "E", mode: "minor", pitches: ["B3", "D#4", "F#4"], symbol: "B", note: "V, borrowed leading tone" },
  { tonic: "E", mode: "minor", pitches: ["B3", "D#4", "F#4", "A4"], symbol: "B7", note: "V7" },
  { tonic: "C", mode: "minor", pitches: ["D#4", "G4", "A#4"], symbol: "Eb", note: "III" },
  { tonic: "C", mode: "minor", pitches: ["G#3", "C4", "D#4"], symbol: "Ab", note: "VI" },
  { tonic: "C", mode: "minor", pitches: ["G3", "B3", "D4"], symbol: "G", note: "V, borrowed B" },
  { tonic: "C", mode: "minor", pitches: ["B3", "D4", "F4", "G#4"], symbol: "B°7", note: "vii°7" },
  { tonic: "C", mode: "minor", pitches: ["D4", "F4", "G#4", "C5"], symbol: "Dø7", note: "iiø7" },
  { tonic: "G#", mode: "minor", pitches: ["G#3", "B3", "D#4"], symbol: "G#m", note: "i" },
  { tonic: "G#", mode: "minor", pitches: ["E4", "G#4", "B4"], symbol: "E", note: "VI" },
  { tonic: "G#", mode: "minor", pitches: ["D#4", "G4", "A#4"], symbol: "D#", note: "V, third F## stored as G" },
  { tonic: "A#", mode: "minor", pitches: ["F#3", "A#3", "C#4"], symbol: "Gb", note: "Bb minor VI" },
  { tonic: "A#", mode: "minor", pitches: ["F3", "A3", "C4"], symbol: "F", note: "Bb minor V" },

  // Other heptatonic modes.
  { tonic: "D", mode: "dorian", pitches: ["G3", "B3", "D4"], symbol: "G", note: "IV" },
  { tonic: "E", mode: "phrygian", pitches: ["F4", "A4", "C5"], symbol: "F", note: "bII" },
  { tonic: "F", mode: "lydian", pitches: ["G4", "B4", "D5"], symbol: "G", note: "II" },
  { tonic: "G", mode: "mixolydian", pitches: ["F4", "A4", "C5"], symbol: "F", note: "bVII" },
  { tonic: "B", mode: "locrian", pitches: ["C4", "E4", "G4"], symbol: "C", note: "bII" },
  { tonic: "A", mode: "harmonic minor", pitches: ["E4", "G#4", "B4", "D5"], symbol: "E7", note: "V7" },
  { tonic: "A", mode: "harmonic minor", pitches: ["C4", "E4", "G#4"], symbol: "C+", note: "III+" },
  { tonic: "C", mode: "harmonic minor", pitches: ["B3", "D4", "F4", "G#4"], symbol: "B°7", note: "vii°7" },

  // Pentatonic, blues and chromatic.
  { tonic: "C", mode: "major pentatonic", pitches: ["C4", "E4", "G4"], symbol: "C", note: "I" },
  { tonic: "A#", mode: "major pentatonic", pitches: ["A#3", "D4", "F4"], symbol: "Bb", note: "I in Bb" },
  { tonic: "A", mode: "minor pentatonic", pitches: ["A3", "C4", "E4"], symbol: "Am", note: "i" },
  { tonic: "D#", mode: "minor pentatonic", pitches: ["F#4", "A#4", "C#5"], symbol: "Gb", note: "III in Eb minor" },
  { tonic: "D#", mode: "minor", pitches: ["A#3", "D4", "F4"], symbol: "Bb", note: "Eb minor V, leading tone D" },
  { tonic: "A", mode: "harmonic minor", pitches: ["A3", "C4", "E4", "G#4"], symbol: "Am(maj7)", note: "i with raised seventh" },
  { tonic: "C", mode: "major blues", pitches: ["C4", "D#4", "G4"], symbol: "Cm", note: "blue third Eb" },
  { tonic: "C", mode: "minor blues", pitches: ["C4", "D#4", "F#4"], symbol: "C°", note: "blue fifth Gb" },
  { tonic: "C", mode: "chromatic", pitches: ["C#4", "F4", "G#4"], symbol: "Db", note: "Db major" },
  { tonic: "C", mode: "chromatic", pitches: ["F#4", "A#4", "C#5"], symbol: "F#", note: "F# major" },
];
