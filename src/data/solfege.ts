/**
 * Solfege Data
 * Contains solfege note definitions for major and minor scales
 */

import type { SolfegeData } from "@/types/music";

// Re-export types for backward compatibility
export type { SolfegeData };

/**
 * Major scale solfege data with emotional descriptions and visual properties
 */
export const MAJOR_SOLFEGE: SolfegeData[] = [
  {
    name: "Do",
    number: 1,
    emotion: "Home, rest, stability",
    description: "The foundation. Complete resolution.",
    fleckShape: "circle",
    texture: "foundation, trust, warmth from peace",
  },
  {
    name: "Re",
    number: 2,
    emotion: "Forward motion, stepping up",
    description: "Moving away from home with purpose.",
    fleckShape: "mist",
    texture: "hopeful lift, gentle curiosity",
  },
  {
    name: "Mi",
    number: 3,
    emotion: "Bright, joyful optimism",
    description: "Sunny and optimistic, wants to rise.",
    fleckShape: "sparkle",
    texture: "clarity and rising joy",
  },
  {
    name: "Fa",
    number: 4,
    emotion: "Tension, unease",
    description: "Unstable, wants to fall back to Mi.",
    fleckShape: "diamond",
    texture: "inward pull, leaning fall, yearning",
  },
  {
    name: "Sol",
    number: 5,
    emotion: "Strength, confidence, dominance",
    description: "Confident and stable, but not quite home.",
    fleckShape: "star",
    texture: "a triumphant beacon",
  },
  {
    name: "La",
    number: 6,
    emotion: "Longing, wistfulness",
    description: "Beautiful sadness, reaching for Do.",
    fleckShape: "circle",
    texture: "emotional openness, romantic ache",
  },
  {
    name: "Ti",
    number: 7,
    emotion: "Urgency, restlessness",
    description: "Restless, must resolve up to Do!",
    fleckShape: "sparkle",
    texture: "spiritual tension, strong upward pull",
  },
];

/**
 * Minor scale solfege data (using movable Do system)
 */
export const MINOR_SOLFEGE: SolfegeData[] = [
  {
    name: "Do",
    number: 1,
    emotion: "Grounded, somber home",
    description: "Dark but stable foundation.",
    fleckShape: "circle",
    texture: "dignified stability with emotional weight",
  },
  {
    name: "Re",
    number: 2,
    emotion: "Gentle, uncertain step",
    description: "Cautious movement forward.",
    fleckShape: "mist",
    texture: "cautious, introverted motion",
  },
  {
    name: "Me",
    number: 3,
    emotion: "Melancholy, introspection",
    description: "Minor third - tender sadness.",
    fleckShape: "diamond",
    texture: "tender vulnerability",
  },
  {
    name: "Fa",
    number: 4,
    emotion: "Tension, yearning",
    description: "Same tension, deeper in minor.",
    fleckShape: "circle",
    texture: "a shadowed inward pull",
  },
  {
    name: "Sol",
    number: 5,
    emotion: "Bittersweet strength",
    description: "Strong but tinged with sadness.",
    fleckShape: "star",
    texture: "noble sorrow with resilience",
  },
  {
    name: "Le",
    number: 6,
    emotion: "Deep longing, sorrow",
    description: "Minor sixth - profound yearning.",
    fleckShape: "mist",
    texture: "grounded grief, ancient ache",
  },
  {
    name: "Te",
    number: 7,
    emotion: "Gentle leading, subdued",
    description: "Softer leading tone than Ti.",
    fleckShape: "sparkle",
    texture: "shadowed anticipation",
  },
];
