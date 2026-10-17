/**
 * Solfege Data
 * Interval emotion data. Syllables come only from the identity vocabulary.
 */

import type { MusicalMode, SolfegeData } from "@/types/music";
import { getSolfegeLabelForInterval } from "@/domain/solfege";

export type { SolfegeData };

type SolfegeIdentity = Omit<SolfegeData, "name" | "number" | "intervalName" | "semitones">;

export { INTERVAL_TO_SOLFEGE, MOVABLE_DO_SOLFEGE_NOTES, getSolfegeLabelForInterval } from "@/domain/solfege";

export const INTERVAL_IDENTITY_MAP: Record<string, SolfegeIdentity> = {
  "1P": {
    emotion: "Home, rest, stability",
    description: "The tonic center. It makes the rest of the mode make sense.",
    texture: "foundation, trust, warmth from peace",
  },
  "2m": {
    emotion: "Close friction, raw ache",
    description: "A tight rub above home. It glows with uneasy closeness.",
    texture: "grainy tension, urgent nearness",
  },
  "2M": {
    emotion: "Forward motion, stepping up",
    description: "Movement away from home with momentum and curiosity.",
    texture: "hopeful lift, gentle curiosity",
  },
  "3m": {
    emotion: "Melancholy, introspection",
    description: "A tender inward turn that darkens the tonic without breaking it.",
    texture: "tender vulnerability",
  },
  "3M": {
    emotion: "Bright, joyful optimism",
    description: "A clear brightening that opens the mode into warmth.",
    texture: "clarity and rising joy",
  },
  "4P": {
    emotion: "Tension, unease",
    description: "A leaning tone that wants to fall or resolve.",
    texture: "inward pull, leaning fall, yearning",
  },
  "4A": {
    emotion: "Lift, shimmer, surprise",
    description: "A sharpened fourth that opens a bright suspended skylight.",
    texture: "electric lift, suspended shine",
  },
  "5d": {
    emotion: "Blue strain, instability",
    description: "A narrowed fifth that sounds split, smoky, and unresolved.",
    texture: "smoke, grit, bent tension",
  },
  "5P": {
    emotion: "Strength, confidence, dominance",
    description: "Stable and outward-facing. It gathers energy without landing home.",
    texture: "a triumphant beacon",
  },
  "6m": {
    emotion: "Deep longing, sorrow",
    description: "A dark reach outward, full of memory and ache.",
    texture: "grounded grief, ancient ache",
  },
  "6M": {
    emotion: "Longing, wistfulness",
    description: "Open yearning with tenderness and reach.",
    texture: "emotional openness, romantic ache",
  },
  "7m": {
    emotion: "Shadowed anticipation",
    description: "A softer leading pull that circles the tonic instead of piercing it.",
    texture: "shadowed anticipation",
  },
  "7M": {
    emotion: "Urgency, restlessness",
    description: "A bright leading edge that urgently resolves upward to home.",
    texture: "spiritual tension, strong upward pull",
  },
};

const MAJOR_INTERVAL_OVERRIDES: Record<string, SolfegeIdentity> = {
  "1P": {
    emotion: "Home, rest, stability",
    description: "The foundation. Complete resolution.",
    texture: "foundation, trust, warmth from peace",
  },
  "2M": {
    emotion: "Forward motion, stepping up",
    description: "Moving away from home with purpose.",
    texture: "hopeful lift, gentle curiosity",
  },
  "3M": {
    emotion: "Bright, joyful optimism",
    description: "Sunny and optimistic, wants to rise.",
    texture: "clarity and rising joy",
  },
  "4P": {
    emotion: "Tension, unease",
    description: "Unstable, wants to fall back to Mi.",
    texture: "inward pull, leaning fall, yearning",
  },
  "5P": {
    emotion: "Strength, confidence, dominance",
    description: "Confident and stable, but not quite home.",
    texture: "a triumphant beacon",
  },
  "6M": {
    emotion: "Longing, wistfulness",
    description: "Beautiful sadness, reaching for Do.",
    texture: "emotional openness, romantic ache",
  },
  "7M": {
    emotion: "Urgency, restlessness",
    description: "Restless, must resolve up to Do!",
    texture: "spiritual tension, strong upward pull",
  },
};

const MINOR_INTERVAL_OVERRIDES: Record<string, SolfegeIdentity> = {
  "1P": {
    emotion: "Grounded, somber home",
    description: "Dark but stable foundation.",
    texture: "dignified stability with emotional weight",
  },
  "2M": {
    emotion: "Gentle, uncertain step",
    description: "Cautious movement forward.",
    texture: "cautious, introverted motion",
  },
  "3m": {
    emotion: "Melancholy, introspection",
    description: "Minor third - tender sadness.",
    texture: "tender vulnerability",
  },
  "4P": {
    emotion: "Tension, yearning",
    description: "Same tension, deeper in minor.",
    texture: "a shadowed inward pull",
  },
  "5P": {
    emotion: "Bittersweet strength",
    description: "Strong but tinged with sadness.",
    texture: "noble sorrow with resilience",
  },
  "6m": {
    emotion: "Deep longing, sorrow",
    description: "Minor sixth - profound yearning.",
    texture: "grounded grief, ancient ache",
  },
  "7m": {
    emotion: "Gentle leading, subdued",
    description: "Softer leading tone than Ti.",
    texture: "shadowed anticipation",
  },
};

const MODE_IDENTITY_OVERRIDES: Partial<Record<MusicalMode, Record<string, SolfegeIdentity>>> = {
  major: MAJOR_INTERVAL_OVERRIDES,
  minor: MINOR_INTERVAL_OVERRIDES,
};

const C_MAJOR_INTERVAL_NAMES = ["1P", "2M", "3M", "4P", "5P", "6M", "7M"];
const C_MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const C_MINOR_INTERVAL_NAMES = ["1P", "2M", "3m", "4P", "5P", "6m", "7m"];
const C_MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

function getIdentityForInterval(
  intervalName: string,
  mode?: MusicalMode
): SolfegeIdentity {
  return (
    (mode && MODE_IDENTITY_OVERRIDES[mode]?.[intervalName]) ||
    INTERVAL_IDENTITY_MAP[intervalName] ||
    INTERVAL_IDENTITY_MAP["1P"]
  );
}

export function createSolfegeData(
  intervalNames: string[],
  semitoneIntervals: number[],
  mode?: MusicalMode
): SolfegeData[] {
  return intervalNames.map((intervalName, index) => {
    const identity = getIdentityForInterval(intervalName, mode);

    return {
      ...identity,
      name: getSolfegeLabelForInterval(intervalName),
      number: index + 1,
      intervalName,
      semitones: semitoneIntervals[index] ?? 0,
    };
  });
}

export const MAJOR_SOLFEGE = createSolfegeData(
  C_MAJOR_INTERVAL_NAMES,
  C_MAJOR_INTERVALS,
  "major"
);

export const MINOR_SOLFEGE = createSolfegeData(
  C_MINOR_INTERVAL_NAMES,
  C_MINOR_INTERVALS,
  "minor"
);
