/**
 * Musical scales generated from the centralized mode catalog and Tonal.js.
 */

import { Interval, Scale as TonalScale } from "@tonaljs/tonal";
import type { MusicalMode, Scale } from "@/types/music";
import { MODE_DEFINITIONS, MODE_ORDER } from "./modes";
import { createSolfegeData } from "./solfege";

export type { Scale };

function fallbackScale(mode: MusicalMode): Scale {
  const definition = MODE_DEFINITIONS[mode];
  const intervalNames =
    mode === "major"
      ? ["1P", "2M", "3M", "4P", "5P", "6M", "7M"]
      : mode === "minor"
        ? ["1P", "2M", "3m", "4P", "5P", "6m", "7m"]
        : ["1P"];
  const intervals = intervalNames.map((intervalName) => {
    const semitones = Interval.semitones(intervalName);
    return semitones ?? 0;
  });

  return {
    name: definition.label,
    mode,
    tonalName: definition.tonalName,
    family: definition.family,
    degreeCount: intervalNames.length,
    intervalNames,
    intervals,
    solfege: createSolfegeData(intervalNames, intervals, mode),
  };
}

function createScale(mode: MusicalMode): Scale {
  const definition = MODE_DEFINITIONS[mode];

  try {
    const scale = TonalScale.get(`C ${definition.tonalName}`);
    const intervalNames = scale.intervals.length
      ? scale.intervals
      : fallbackScale(mode).intervalNames;
    const intervals = intervalNames.map((intervalName) => {
      const semitones = Interval.semitones(intervalName);
      return semitones ?? 0;
    });

    return {
      name: definition.label,
      mode,
      tonalName: definition.tonalName,
      family: definition.family,
      degreeCount: intervalNames.length,
      intervalNames,
      intervals,
      solfege: createSolfegeData(intervalNames, intervals, mode),
    };
  } catch {
    return fallbackScale(mode);
  }
}

export const SCALE_MAP: Record<MusicalMode, Scale> = MODE_ORDER.reduce(
  (map, mode) => {
    map[mode] = createScale(mode);
    return map;
  },
  {} as Record<MusicalMode, Scale>
);

export const MAJOR_SCALE = SCALE_MAP.major;
export const MINOR_SCALE = SCALE_MAP.minor;

export function getScaleForMode(mode: MusicalMode): Scale {
  return SCALE_MAP[mode] ?? MAJOR_SCALE;
}

export function getSolfegeNameForMode(
  mode: MusicalMode,
  scaleIndex: number
): string {
  return getScaleForMode(mode).solfege[scaleIndex]?.name ?? "Do";
}
