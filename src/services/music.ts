// Music Theory Service for Emotitone Solfege
// Handles all music theory calculations, scales, and emotional mappings

export interface Note {
  name: string;
  frequency: number;
  midiNumber: number;
}

export interface SolfegeData {
  name: string;
  number: number;
  emotion: string;
  description: string;
  colorGradient: string;
  colorFlecks: string;
  texture: string;
}

export interface Scale {
  name: string;
  intervals: number[]; // Semitone intervals from root
  solfege: SolfegeData[];
}

export interface MelodicPattern {
  name: string;
  description: string;
  emotion: string;
  sequence: string[]; // Array of solfege names
  intervals?: number[]; // Optional interval pattern
}

// The 12 chromatic notes
export const CHROMATIC_NOTES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

// Major scale solfege data with emotional descriptions and colors
export const MAJOR_SOLFEGE: SolfegeData[] = [
  {
    name: "Do",
    number: 1,
    emotion: "Home, rest, stability",
    description: "The foundation. Complete resolution.",
    colorGradient:
      "linear-gradient(135deg, #1e3a8a 0%, #f97316 50%, #fbbf24 100%)",
    colorFlecks: "soft radiance",
    texture: "foundation, trust, warmth from peace",
  },
  {
    name: "Re",
    number: 2,
    emotion: "Forward motion, stepping up",
    description: "Moving away from home with purpose.",
    colorGradient:
      "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #e5e7eb 100%)",
    colorFlecks: "airy flecks",
    texture: "hopeful lift, gentle curiosity",
  },
  {
    name: "Mi",
    number: 3,
    emotion: "Bright, joyful optimism",
    description: "Sunny and optimistic, wants to rise.",
    colorGradient:
      "linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #f59e0b 100%)",
    colorFlecks: "glowing points",
    texture: "clarity and rising joy",
  },
  {
    name: "Fa",
    number: 4,
    emotion: "Tension, unease",
    description: "Unstable, wants to fall back to Mi.",
    colorGradient:
      "linear-gradient(135deg, #16a34a 0%, #dc2626 30%, #ea580c 100%)",
    colorFlecks: "pulling Orange-Red streaks",
    texture: "inward pull, leaning fall, yearning",
  },
  {
    name: "Sol",
    number: 5,
    emotion: "Strength, confidence, dominance",
    description: "Confident and stable, but not quite home.",
    colorGradient:
      "linear-gradient(135deg, #dc2626 0%, #fbbf24 50%, #1e40af 100%)",
    colorFlecks: "hints of Royal Blue",
    texture: "a triumphant beacon",
  },
  {
    name: "La",
    number: 6,
    emotion: "Longing, wistfulness",
    description: "Beautiful sadness, reaching for Do.",
    colorGradient:
      "linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #7c3aed 100%)",
    colorFlecks: "flecks of Deep Purple",
    texture: "emotional openness, romantic ache",
  },
  {
    name: "Ti",
    number: 7,
    emotion: "Urgency, restlessness",
    description: "Restless, must resolve up to Do!",
    colorGradient:
      "linear-gradient(135deg, #fbbf24 0%, #8b5cf6 50%, #a855f7 100%)",
    colorFlecks: "sparkling intensity",
    texture: "spiritual tension, strong upward pull",
  },
  {
    name: "Do'",
    number: 8,
    emotion: "Resolution, completion",
    description: "Octave completion, return home at higher level",
    colorGradient:
      "linear-gradient(135deg, #1e3a8a 0%, #f97316 50%, #fbbf24 100%)",
    colorFlecks: "elevated radiance",
    texture: "elevated foundation, triumphant return",
  },
];

// Minor scale solfege data (using movable Do system)
export const MINOR_SOLFEGE: SolfegeData[] = [
  {
    name: "Do",
    number: 1,
    emotion: "Grounded, somber home",
    description: "Dark but stable foundation.",
    colorGradient:
      "linear-gradient(135deg, #475569 0%, #64748b 50%, #fbbf24 100%)",
    colorFlecks: "Faint Gold flecks",
    texture: "dignified stability with emotional weight",
  },
  {
    name: "Re",
    number: 2,
    emotion: "Gentle, uncertain step",
    description: "Cautious movement forward.",
    colorGradient:
      "linear-gradient(135deg, #166534 0%, #64748b 50%, #0891b2 100%)",
    colorFlecks: "Teal mist",
    texture: "cautious, introverted motion",
  },
  {
    name: "Me",
    number: 3,
    emotion: "Melancholy, introspection",
    description: "Minor third - tender sadness.",
    colorGradient:
      "linear-gradient(135deg, #be185d 0%, #f59e0b 50%, #6b7280 100%)",
    colorFlecks: "Flecks of Gray",
    texture: "tender vulnerability",
  },
  {
    name: "Fa",
    number: 4,
    emotion: "Tension, yearning",
    description: "Same tension, deeper in minor.",
    colorGradient:
      "linear-gradient(135deg, #166534 0%, #ea580c 30%, #f97316 100%)",
    colorFlecks: "slow drip of warmth",
    texture: "a shadowed inward pull",
  },
  {
    name: "Sol",
    number: 5,
    emotion: "Bittersweet strength",
    description: "Strong but tinged with sadness.",
    colorGradient:
      "linear-gradient(135deg, #581c87 0%, #fbbf24 50%, #1e40af 100%)",
    colorFlecks: "brushed with stormy blue",
    texture: "noble sorrow with resilience",
  },
  {
    name: "Le",
    number: 6,
    emotion: "Deep longing, sorrow",
    description: "Minor sixth - profound yearning.",
    colorGradient:
      "linear-gradient(135deg, #1e1b4b 0%, #7c2d12 50%, #78716c 100%)",
    colorFlecks: "matte texture",
    texture: "grounded grief, ancient ache",
  },
  {
    name: "Te",
    number: 7,
    emotion: "Gentle leading, subdued",
    description: "Softer leading tone than Ti.",
    colorGradient:
      "linear-gradient(135deg, #7c3aed 0%, #475569 50%, #f43f5e 100%)",
    colorFlecks: "subtle sparkles",
    texture: "shadowed anticipation",
  },
  {
    name: "Do'",
    number: 8,
    emotion: "Somber resolution, completion",
    description: "Octave completion in minor - dignified return",
    colorGradient:
      "linear-gradient(135deg, #475569 0%, #64748b 50%, #fbbf24 100%)",
    colorFlecks: "elevated gold flecks",
    texture: "elevated dignified stability with emotional depth",
  },
];

// Scale definitions
export const MAJOR_SCALE: Scale = {
  name: "Major",
  intervals: [0, 2, 4, 5, 7, 9, 11, 12], // W-W-H-W-W-W-H pattern + octave
  solfege: MAJOR_SOLFEGE,
};

export const MINOR_SCALE: Scale = {
  name: "Minor",
  intervals: [0, 2, 3, 5, 7, 8, 10, 12], // W-H-W-W-H-W-W pattern (natural minor) + octave
  solfege: MINOR_SOLFEGE,
};

// Common melodic patterns and intervals
export const MELODIC_PATTERNS: MelodicPattern[] = [
  // Emotional Character of Intervals
  {
    name: "Unison/Octave",
    description: "Unity, completion",
    emotion: "Unity, completion",
    sequence: ["Do", "Do"],
    intervals: [0],
  },
  {
    name: "Minor 2nd",
    description: "Dissonance, yearning, pain",
    emotion: "Dissonance, yearning, pain",
    sequence: ["Do", "Re"],
    intervals: [1],
  },
  {
    name: "Major 2nd",
    description: "Gentle tension, stepping forward",
    emotion: "Gentle tension, stepping forward",
    sequence: ["Do", "Re"],
    intervals: [2],
  },
  {
    name: "Minor 3rd",
    description: "Sadness, introspection",
    emotion: "Sadness, introspection",
    sequence: ["Do", "Me"],
    intervals: [3],
  },
  {
    name: "Major 3rd",
    description: "Joy, brightness",
    emotion: "Joy, brightness",
    sequence: ["Do", "Mi"],
    intervals: [4],
  },
  {
    name: "Perfect 4th",
    description: "Stability, openness",
    emotion: "Stability, openness",
    sequence: ["Do", "Fa"],
    intervals: [5],
  },
  {
    name: "Tritone",
    description: "Tension, mystery, unrest",
    emotion: "Tension, mystery, unrest",
    sequence: ["Do", "Fi"],
    intervals: [6],
  },
  {
    name: "Perfect 5th",
    description: "Power, openness, clarity",
    emotion: "Power, openness, clarity",
    sequence: ["Do", "Sol"],
    intervals: [7],
  },
  // Common Melodic Patterns
  {
    name: "Scale Ascent",
    description: "The classic scale journey up",
    emotion: "Rising, building energy",
    sequence: ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti", "Do"],
  },
  {
    name: "Scale Descent",
    description: "The classic scale journey down",
    emotion: "Falling, releasing energy",
    sequence: ["Do", "Ti", "La", "Sol", "Fa", "Mi", "Re", "Do"],
  },
  {
    name: "Do-Sol-Do",
    description: "Perfect fifth leap, triumphant",
    emotion: "Triumphant, powerful",
    sequence: ["Do", "Sol", "Do"],
  },
  {
    name: "Do-Ti-Do",
    description: "Leading tone resolution, urgent",
    emotion: "Urgent resolution",
    sequence: ["Do", "Ti", "Do"],
  },
  {
    name: "Do-La-Sol",
    description: "Descending sadness",
    emotion: "Melancholic descent",
    sequence: ["Do", "La", "Sol"],
  },
  {
    name: "Sol-Ti-Do",
    description: "Dominant resolution, satisfying",
    emotion: "Satisfying resolution",
    sequence: ["Sol", "Ti", "Do"],
  },
  {
    name: "La-Ti-Do",
    description: "Longing to resolution",
    emotion: "Yearning to home",
    sequence: ["La", "Ti", "Do"],
  },
  {
    name: "Do-Mi-Sol",
    description: "Major triad, bright and stable",
    emotion: "Bright, stable harmony",
    sequence: ["Do", "Mi", "Sol"],
  },
  {
    name: "Do-Re-Mi",
    description: "Optimistic ascent",
    emotion: "Optimistic, rising",
    sequence: ["Do", "Re", "Mi"],
  },
  {
    name: "Mi-Re-Do",
    description: "Gentle descent home",
    emotion: "Gentle return",
    sequence: ["Mi", "Re", "Do"],
  },
  {
    name: "Fa-Mi",
    description: "Tension release, sigh",
    emotion: "Relief, sighing",
    sequence: ["Fa", "Mi"],
  },
  {
    name: "Ti-Do-Ti-Do",
    description: "Restless resolution",
    emotion: "Restless, unsettled",
    sequence: ["Ti", "Do", "Ti", "Do"],
  },
];

export class MusicTheoryService {
  private currentKey: string = "C";
  private currentMode: "major" | "minor" = "major";

  constructor() {}

  // Get the current key
  getCurrentKey(): string {
    return this.currentKey;
  }

  // Set the current key
  setCurrentKey(key: string): void {
    if (CHROMATIC_NOTES.includes(key)) {
      this.currentKey = key;
    } else {
      throw new Error(`Invalid key: ${key}`);
    }
  }

  // Get the current mode
  getCurrentMode(): "major" | "minor" {
    return this.currentMode;
  }

  // Set the current mode
  setCurrentMode(mode: "major" | "minor"): void {
    this.currentMode = mode;
  }

  // Get the current scale
  getCurrentScale(): Scale {
    return this.currentMode === "major" ? MAJOR_SCALE : MINOR_SCALE;
  }

  // Get note names for the current scale
  getCurrentScaleNotes(): string[] {
    const scale = this.getCurrentScale();
    const keyIndex = CHROMATIC_NOTES.indexOf(this.currentKey);

    return scale.intervals.map((interval) => {
      const noteIndex = (keyIndex + interval) % 12;
      return CHROMATIC_NOTES[noteIndex];
    });
  }

  // Get frequency for a note in the current scale
  getNoteFrequency(solfegeIndex: number, octave: number = 4): number {
    const scaleNotes = this.getCurrentScaleNotes();
    const noteName = scaleNotes[solfegeIndex];

    // Handle octave note (Do') - use the root note but one octave higher
    let actualOctave = octave;
    let actualNoteName = noteName;

    if (solfegeIndex === 7) {
      // The octave Do'
      actualOctave = octave + 1;
      actualNoteName = scaleNotes[0]; // Use the root note (Do)
    }

    const noteIndex = CHROMATIC_NOTES.indexOf(actualNoteName);

    // Calculate frequency using A4 = 440Hz as reference
    const A4_INDEX = 9; // A is at index 9 in CHROMATIC_NOTES
    const A4_FREQUENCY = 440;

    const semitonesFromA4 = (actualOctave - 4) * 12 + (noteIndex - A4_INDEX);
    return A4_FREQUENCY * Math.pow(2, semitonesFromA4 / 12);
  }

  // Get solfege data for a specific degree
  getSolfegeData(degree: number): SolfegeData | null {
    const scale = this.getCurrentScale();
    return scale.solfege[degree] || null;
  }

  // Get all melodic patterns
  getMelodicPatterns(): MelodicPattern[] {
    return MELODIC_PATTERNS;
  }

  // Get melodic patterns by category
  getMelodicPatternsByCategory(
    category: "intervals" | "patterns"
  ): MelodicPattern[] {
    if (category === "intervals") {
      return MELODIC_PATTERNS.filter(
        (pattern) => pattern.intervals && pattern.intervals.length === 1
      );
    } else {
      return MELODIC_PATTERNS.filter(
        (pattern) => !pattern.intervals || pattern.intervals.length !== 1
      );
    }
  }
}

// Export a singleton instance
export const musicTheory = new MusicTheoryService();
