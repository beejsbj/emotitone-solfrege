import { CHROMATIC_NOTES, getScaleForMode } from "@/data";
import type {
  ChromaticNote,
  DynamicColorConfig,
  MusicalMode,
  NoteColorRelationships,
} from "@/types";

const FLAT_TO_SHARP_MAP: Record<string, ChromaticNote> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

const EDGE_CASE_MAP: Record<string, ChromaticNote> = {
  "E#": "F",
  "B#": "C",
  Fb: "E",
  Cb: "B",
};

export function normalizeIndex(index: number, base: number): number {
  if (base <= 0) {
    return 0;
  }

  return ((index % base) + base) % base;
}

export function calculateCenteredHue(index: number, intervalCount: number): number {
  const safeIntervalCount = Math.max(1, intervalCount);
  const hueInterval = 360 / safeIntervalCount;

  return (
    normalizeIndex(index, safeIntervalCount) * hueInterval + hueInterval / 2
  ) % 360;
}

export function calculateOctaveLightness(
  octave: number,
  baseLightness: number,
  lightnessRange: number
): number {
  const normalizedOctave = Math.max(2, Math.min(8, octave));
  const octaveRatio = (normalizedOctave - 2) / 6;
  const minLightness = Math.max(0.15, baseLightness - lightnessRange / 2);
  const maxLightness = Math.min(0.85, baseLightness + lightnessRange / 2);
  const curvedRatio = Math.pow(octaveRatio, 0.8);
  const lightness = minLightness + curvedRatio * (maxLightness - minLightness);

  return Math.max(0.1, Math.min(0.9, lightness));
}

export function generateColorRelationships(
  hue: number,
  saturation: number,
  lightness: number
): NoteColorRelationships {
  const primary = `hsla(${hue}, ${saturation * 100}%, ${lightness * 100}%, 1)`;
  const accentHue = (hue + 180) % 360;
  const accent = `hsla(${accentHue}, ${saturation * 100}%, ${lightness * 100}%, 1)`;
  const secondaryHue = (hue + 120) % 360;
  const secondary = `hsla(${secondaryHue}, ${saturation * 100}%, ${lightness * 100}%, 1)`;
  const tertiaryHue = (hue + 240) % 360;
  const tertiary = `hsla(${tertiaryHue}, ${saturation * 100}%, ${lightness * 100}%, 1)`;

  return { primary, accent, secondary, tertiary };
}

export function generateAnimatedHue(
  baseHue: number,
  amplitude: number,
  time: number,
  speed: number,
  intervalCount: number
): number {
  const safeIntervalCount = Math.max(1, intervalCount);
  const hueInterval = 360 / safeIntervalCount;
  const clampedAmplitude = Math.min(amplitude, hueInterval / 2);
  const animationOffset = Math.sin(time * speed * 0.001) * clampedAmplitude;

  return (baseHue + animationOffset + 360) % 360;
}

export function normalizeChromaticNote(noteName: string): ChromaticNote | null {
  const cleanName = noteName.replace(/[0-9']/g, "");

  if (CHROMATIC_NOTES.includes(cleanName as ChromaticNote)) {
    return cleanName as ChromaticNote;
  }

  if (EDGE_CASE_MAP[cleanName]) {
    return EDGE_CASE_MAP[cleanName];
  }

  return FLAT_TO_SHARP_MAP[cleanName] ?? null;
}

export function getChromaticNoteForScaleIndex(
  scaleIndex: number,
  mode: MusicalMode,
  key: ChromaticNote
): ChromaticNote | null {
  const scale = getScaleForMode(mode);
  const normalizedScaleIndex = normalizeIndex(scaleIndex, scale.degreeCount);
  const semitoneOffset = scale.intervals[normalizedScaleIndex];
  const tonicIndex = CHROMATIC_NOTES.indexOf(key);

  if (tonicIndex === -1 || semitoneOffset == null) {
    return null;
  }

  return CHROMATIC_NOTES[(tonicIndex + semitoneOffset) % 12];
}

export function getScaleIndexForSolfegeName(
  noteName: string,
  mode: MusicalMode
): number | null {
  const scale = getScaleForMode(mode);
  const cleanName = noteName.replace("'", "");
  const matchIndex = scale.solfege.findIndex(
    (note) => note.name.toLowerCase() === cleanName.toLowerCase()
  );

  return matchIndex === -1 ? null : matchIndex;
}

type SolfegeInputType = "scaleIndex" | "solfegeIndex" | "solfegeName";

export function resolveSolfegeName(
  input: number | string,
  inputType: SolfegeInputType = "scaleIndex",
  mode: MusicalMode = "major"
): string {
  const scale = getScaleForMode(mode);

  if (inputType === "solfegeName") {
    const name = String(input).replace("'", "");
    const match = scale.solfege.find(
      (note) => note.name.toLowerCase() === name.toLowerCase()
    );
    return match?.name || scale.solfege[0]?.name || "Do";
  }

  if (inputType === "solfegeIndex") {
    const normalizedOneBased =
      normalizeIndex(Number(input) - 1, scale.degreeCount) + 1;
    return scale.solfege[normalizedOneBased - 1]?.name || scale.solfege[0]?.name || "Do";
  }

  const normalizedIndex = normalizeIndex(Number(input), scale.degreeCount);
  return scale.solfege[normalizedIndex]?.name || scale.solfege[0]?.name || "Do";
}

export function getScaleDegreeIndexForPitchClass(
  noteName: ChromaticNote,
  currentKey: ChromaticNote,
  currentMode: MusicalMode
): number | null {
  const noteIndex = CHROMATIC_NOTES.indexOf(noteName);
  const keyIndex = CHROMATIC_NOTES.indexOf(currentKey);

  if (noteIndex === -1 || keyIndex === -1) {
    return null;
  }

  const relativePitchClass = (noteIndex - keyIndex + 12) % 12;
  const scale = getScaleForMode(currentMode);
  const scaleDegreeIndex = scale.intervals.indexOf(relativePitchClass);

  return scaleDegreeIndex === -1 ? null : scaleDegreeIndex;
}

function getIntervalCount(
  config: DynamicColorConfig,
  mode: MusicalMode
): number {
  return config.musicColorMode === "fixed"
    ? 12
    : getScaleForMode(mode).degreeCount;
}

function getBaseHueFromScaleIndex(
  scaleIndex: number,
  mode: MusicalMode,
  key: ChromaticNote,
  config: DynamicColorConfig
): number | null {
  if (config.musicColorMode === "fixed") {
    const chromaticNote = getChromaticNoteForScaleIndex(scaleIndex, mode, key);
    if (!chromaticNote) {
      return null;
    }

    const pitchClassIndex = CHROMATIC_NOTES.indexOf(chromaticNote);
    return pitchClassIndex === -1 ? null : calculateCenteredHue(pitchClassIndex, 12);
  }

  const scale = getScaleForMode(mode);
  return calculateCenteredHue(
    normalizeIndex(scaleIndex, scale.degreeCount),
    scale.degreeCount
  );
}

export function resolveMusicColorsByScaleIndex(
  scaleIndex: number,
  mode: MusicalMode,
  key: ChromaticNote,
  octave: number,
  config: DynamicColorConfig,
  time?: number
): NoteColorRelationships | null {
  const baseHue = getBaseHueFromScaleIndex(scaleIndex, mode, key, config);

  if (baseHue === null) {
    return null;
  }

  const intervalCount = getIntervalCount(config, mode);
  const hue =
    time !== undefined
      ? generateAnimatedHue(
          baseHue,
          config.hueAnimationAmplitude,
          time,
          config.animationSpeed,
          intervalCount
        )
      : baseHue;
  const lightness = calculateOctaveLightness(
    octave,
    config.baseLightness,
    config.lightnessRange
  );

  return generateColorRelationships(hue, config.saturation, lightness);
}

export function resolveMusicColorsByPitchClass(
  noteName: ChromaticNote,
  mode: MusicalMode,
  key: ChromaticNote,
  octave: number,
  config: DynamicColorConfig,
  time?: number
): NoteColorRelationships | null {
  if (config.musicColorMode === "fixed") {
    const pitchClassIndex = CHROMATIC_NOTES.indexOf(noteName);
    if (pitchClassIndex === -1) {
      return null;
    }

    const baseHue = calculateCenteredHue(pitchClassIndex, 12);
    const hue =
      time !== undefined
        ? generateAnimatedHue(
            baseHue,
            config.hueAnimationAmplitude,
            time,
            config.animationSpeed,
            12
          )
        : baseHue;
    const lightness = calculateOctaveLightness(
      octave,
      config.baseLightness,
      config.lightnessRange
    );

    return generateColorRelationships(hue, config.saturation, lightness);
  }

  const scaleDegreeIndex = getScaleDegreeIndexForPitchClass(noteName, key, mode);

  return scaleDegreeIndex === null
    ? null
    : resolveMusicColorsByScaleIndex(
        scaleDegreeIndex,
        mode,
        key,
        octave,
        config,
        time
      );
}

export function resolveMusicColorsByNoteName(
  noteName: string,
  mode: MusicalMode,
  key: ChromaticNote,
  octave: number,
  config: DynamicColorConfig,
  time?: number
): NoteColorRelationships | null {
  const scaleIndex = getScaleIndexForSolfegeName(noteName, mode);
  if (scaleIndex !== null) {
    return resolveMusicColorsByScaleIndex(
      scaleIndex,
      mode,
      key,
      octave,
      config,
      time
    );
  }

  const chromaticNote = normalizeChromaticNote(noteName);
  if (chromaticNote) {
    return resolveMusicColorsByPitchClass(
      chromaticNote,
      mode,
      key,
      octave,
      config,
      time
    );
  }

  return null;
}
