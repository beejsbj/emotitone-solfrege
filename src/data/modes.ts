import type { ModeDefinition, MusicalMode } from "@/types/music";

export const MODE_ORDER: MusicalMode[] = [
  "major",
  "minor",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "locrian",
  "harmonic minor",
  "melodic minor",
  "major pentatonic",
  "minor pentatonic",
  "major blues",
  "minor blues",
  "chromatic",
];

export const MODE_DEFINITIONS: Record<MusicalMode, ModeDefinition> = {
  major: {
    mode: "major",
    label: "Major",
    tonalName: "major",
    family: "heptatonic",
    degreeCount: 7,
  },
  minor: {
    mode: "minor",
    label: "Minor",
    tonalName: "minor",
    family: "heptatonic",
    degreeCount: 7,
  },
  dorian: {
    mode: "dorian",
    label: "Dorian",
    tonalName: "dorian",
    family: "heptatonic",
    degreeCount: 7,
  },
  phrygian: {
    mode: "phrygian",
    label: "Phrygian",
    tonalName: "phrygian",
    family: "heptatonic",
    degreeCount: 7,
  },
  lydian: {
    mode: "lydian",
    label: "Lydian",
    tonalName: "lydian",
    family: "heptatonic",
    degreeCount: 7,
  },
  mixolydian: {
    mode: "mixolydian",
    label: "Mixolydian",
    tonalName: "mixolydian",
    family: "heptatonic",
    degreeCount: 7,
  },
  locrian: {
    mode: "locrian",
    label: "Locrian",
    tonalName: "locrian",
    family: "heptatonic",
    degreeCount: 7,
  },
  "harmonic minor": {
    mode: "harmonic minor",
    label: "Harmonic Minor",
    tonalName: "harmonic minor",
    family: "heptatonic",
    degreeCount: 7,
  },
  "melodic minor": {
    mode: "melodic minor",
    label: "Melodic Minor",
    tonalName: "melodic minor",
    family: "heptatonic",
    degreeCount: 7,
  },
  "major pentatonic": {
    mode: "major pentatonic",
    label: "Major Pentatonic",
    tonalName: "major pentatonic",
    family: "pentatonic",
    degreeCount: 5,
  },
  "minor pentatonic": {
    mode: "minor pentatonic",
    label: "Minor Pentatonic",
    tonalName: "minor pentatonic",
    family: "pentatonic",
    degreeCount: 5,
  },
  "major blues": {
    mode: "major blues",
    label: "Major Blues",
    tonalName: "major blues",
    family: "hexatonic",
    degreeCount: 6,
  },
  "minor blues": {
    mode: "minor blues",
    label: "Minor Blues",
    tonalName: "minor blues",
    family: "hexatonic",
    degreeCount: 6,
  },
  chromatic: {
    mode: "chromatic",
    label: "Chromatic",
    tonalName: "chromatic",
    family: "chromatic",
    degreeCount: 12,
  },
};

const MODE_OPTION_COLORS: Record<MusicalMode, string> = {
  major: "hsl(22, 60%, 72%)",
  minor: "hsl(210, 48%, 72%)",
  dorian: "hsl(164, 40%, 68%)",
  phrygian: "hsl(350, 42%, 72%)",
  lydian: "hsl(56, 62%, 72%)",
  mixolydian: "hsl(132, 42%, 70%)",
  locrian: "hsl(280, 34%, 72%)",
  "harmonic minor": "hsl(328, 48%, 72%)",
  "melodic minor": "hsl(188, 42%, 72%)",
  "major pentatonic": "hsl(40, 68%, 72%)",
  "minor pentatonic": "hsl(230, 48%, 72%)",
  "major blues": "hsl(20, 72%, 68%)",
  "minor blues": "hsl(215, 58%, 68%)",
  chromatic: "hsl(302, 40%, 74%)",
};

export const MODE_OPTIONS = MODE_ORDER.map((mode) => ({
  label: MODE_DEFINITIONS[mode].label,
  value: mode,
  color: MODE_OPTION_COLORS[mode],
}));

export function getModeDefinition(mode: MusicalMode): ModeDefinition {
  return MODE_DEFINITIONS[mode];
}
