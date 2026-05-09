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

export const MODE_OPTIONS = MODE_ORDER.map((mode) => ({
  label: MODE_DEFINITIONS[mode].label,
  value: mode,
}));

export function getModeDefinition(mode: MusicalMode): ModeDefinition {
  return MODE_DEFINITIONS[mode];
}
