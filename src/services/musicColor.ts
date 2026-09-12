import { CHROMATIC_NOTES, getScaleForMode } from "@/data";
import type {
  ChromaticNote,
  DynamicColorConfig,
  MusicalMode,
  NoteColorRelationships,
} from "@/types";
import {
  mapOklchToSrgb,
  resolveMusicColor,
  sampleMusicColor,
  type MusicColorContext,
  type MusicColorOffScalePolicy,
  type MusicColorRecipe,
  type MusicColorResolution,
  type MusicColorSample,
  type MusicColorValue,
  type ResolvedMusicColor,
  type SrgbColor,
} from "@/services/musicColorCore";

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

export interface ResolvedMusicColorSample {
  resolution: ResolvedMusicColor;
  sample: MusicColorSample;
}

export function normalizeIndex(index: number, base: number): number {
  if (base <= 0) return 0;
  return ((index % base) + base) % base;
}

export function normalizeChromaticNote(noteName: string): ChromaticNote | null {
  const cleanName = noteName.replace(/[0-9']/g, "");
  if (CHROMATIC_NOTES.includes(cleanName as ChromaticNote)) {
    return cleanName as ChromaticNote;
  }
  return EDGE_CASE_MAP[cleanName] ?? FLAT_TO_SHARP_MAP[cleanName] ?? null;
}

export function getChromaticNoteForScaleIndex(
  scaleIndex: number,
  mode: MusicalMode,
  key: ChromaticNote,
): ChromaticNote | null {
  const scale = getScaleForMode(mode);
  const normalizedScaleIndex = normalizeIndex(scaleIndex, scale.degreeCount);
  const semitoneOffset = scale.intervals[normalizedScaleIndex];
  const tonicIndex = CHROMATIC_NOTES.indexOf(key);
  if (tonicIndex === -1 || semitoneOffset == null) return null;
  return CHROMATIC_NOTES[(tonicIndex + semitoneOffset) % 12];
}

export function getScaleIndexForSolfegeName(
  noteName: string,
  mode: MusicalMode,
): number | null {
  const scale = getScaleForMode(mode);
  const cleanName = noteName.replace("'", "");
  const matchIndex = scale.solfege.findIndex(
    (note) => note.name.toLowerCase() === cleanName.toLowerCase(),
  );
  return matchIndex === -1 ? null : matchIndex;
}

type SolfegeInputType = "scaleIndex" | "solfegeIndex" | "solfegeName";

export function resolveSolfegeName(
  input: number | string,
  inputType: SolfegeInputType = "scaleIndex",
  mode: MusicalMode = "major",
): string {
  const scale = getScaleForMode(mode);
  if (inputType === "solfegeName") {
    const name = String(input).replace("'", "");
    const match = scale.solfege.find(
      (note) => note.name.toLowerCase() === name.toLowerCase(),
    );
    return match?.name || scale.solfege[0]?.name || "Do";
  }
  if (inputType === "solfegeIndex") {
    const normalized = normalizeIndex(Number(input) - 1, scale.degreeCount);
    return scale.solfege[normalized]?.name || scale.solfege[0]?.name || "Do";
  }
  const normalized = normalizeIndex(Number(input), scale.degreeCount);
  return scale.solfege[normalized]?.name || scale.solfege[0]?.name || "Do";
}

export function getScaleDegreeIndexForPitchClass(
  noteName: ChromaticNote,
  currentKey: ChromaticNote,
  currentMode: MusicalMode,
): number | null {
  const noteIndex = CHROMATIC_NOTES.indexOf(noteName);
  const keyIndex = CHROMATIC_NOTES.indexOf(currentKey);
  if (noteIndex === -1 || keyIndex === -1) return null;
  const relativePitchClass = normalizeIndex(noteIndex - keyIndex, 12);
  const degreeIndex = getScaleForMode(currentMode).intervals.indexOf(
    relativePitchClass,
  );
  return degreeIndex === -1 ? null : degreeIndex;
}

export function musicColorRecipeFromConfig(
  config: DynamicColorConfig,
): MusicColorRecipe {
  const span = Math.max(0, config.lightnessSpan);
  const lightnessPerOctave = span / 8;
  const lightnessAtOctaveOne = config.lightnessCenter - span / 2;
  return {
    version: 1,
    chroma: Math.max(0, config.chroma),
    minOctave: 1,
    maxOctave: 9,
    lightnessAtOctaveZero: lightnessAtOctaveOne - lightnessPerOctave,
    lightnessPerOctave,
  };
}

export function musicColorContext(
  mode: MusicalMode,
  key: ChromaticNote,
): MusicColorContext | null {
  const tonicPitchClass = CHROMATIC_NOTES.indexOf(key);
  if (tonicPitchClass === -1) return null;
  return { tonicPitchClass, intervals: getScaleForMode(mode).intervals };
}

function phaseForTime(
  config: DynamicColorConfig,
  time: number | undefined,
): number | null {
  if (time === undefined || !config.hueMotionEnabled) return null;
  return time * config.animationSpeed / (Math.PI * 2 * 1000);
}

function resolveAndSample(
  resolution: MusicColorResolution,
  phaseCycles: number | null,
): ResolvedMusicColorSample | null {
  if (resolution.kind !== "color") return null;
  return {
    resolution,
    sample: sampleMusicColor(resolution, phaseCycles),
  };
}

export function resolveMusicColorSampleByScaleIndex(
  scaleIndex: number,
  mode: MusicalMode,
  key: ChromaticNote,
  octave: number,
  config: DynamicColorConfig,
  phaseCycles: number | null = null,
): ResolvedMusicColorSample | null {
  const context = musicColorContext(mode, key);
  if (!context) return null;
  const interval = context.intervals[scaleIndex];
  const tonicOctave = interval === undefined
    ? octave
    : octave - Math.floor((context.tonicPitchClass + interval) / 12);
  return resolveAndSample(
    resolveMusicColor(
      { kind: "degree", degreeIndex: scaleIndex, tonicOctave },
      context,
      config.musicColorMode,
      musicColorRecipeFromConfig(config),
      "omit",
    ),
    phaseCycles,
  );
}

export function resolveMusicColorSampleByPitchClass(
  noteName: ChromaticNote,
  mode: MusicalMode,
  key: ChromaticNote,
  octave: number,
  config: DynamicColorConfig,
  offScalePolicy: MusicColorOffScalePolicy = "omit",
  phaseCycles: number | null = null,
): ResolvedMusicColorSample | null {
  const context = musicColorContext(mode, key);
  const pitchClass = CHROMATIC_NOTES.indexOf(noteName);
  if (!context || pitchClass === -1) return null;
  return resolveAndSample(
    resolveMusicColor(
      { kind: "pitch", pitchClass, octave },
      context,
      config.musicColorMode,
      musicColorRecipeFromConfig(config),
      offScalePolicy,
    ),
    phaseCycles,
  );
}

function roundChannel(value: number): number {
  return Math.round(value * 255 * 1000) / 1000;
}

export function srgbToCss(color: SrgbColor): string {
  return `rgba(${roundChannel(color.r)}, ${roundChannel(color.g)}, ${roundChannel(color.b)}, ${Math.round(color.alpha * 1000) / 1000})`;
}

export function musicColorValueToCss(value: MusicColorValue): string {
  return srgbToCss(value.srgb);
}

export function tuneMusicColorValue(
  value: MusicColorValue,
  options: {
    lightnessMultiplier?: number;
    chromaMultiplier?: number;
    alpha?: number;
  },
): MusicColorValue {
  const oklch = {
    l: Math.min(1, Math.max(0, value.oklch.l * (options.lightnessMultiplier ?? 1))),
    c: Math.max(0, value.oklch.c * (options.chromaMultiplier ?? 1)),
    h: value.oklch.h,
    alpha: Math.min(1, Math.max(0, options.alpha ?? value.oklch.alpha)),
  };
  return { oklch, srgb: mapOklchToSrgb(oklch) };
}

export function musicColorRelationships(
  sample: MusicColorSample,
): NoteColorRelationships {
  return {
    primary: musicColorValueToCss(sample.primary),
    accent: musicColorValueToCss(sample.accent),
  };
}

export function resolveMusicColorsByScaleIndex(
  scaleIndex: number,
  mode: MusicalMode,
  key: ChromaticNote,
  octave: number,
  config: DynamicColorConfig,
  time?: number,
): NoteColorRelationships | null {
  const resolved = resolveMusicColorSampleByScaleIndex(
    scaleIndex,
    mode,
    key,
    octave,
    config,
    phaseForTime(config, time),
  );
  return resolved ? musicColorRelationships(resolved.sample) : null;
}

export function resolveMusicColorsByPitchClass(
  noteName: ChromaticNote,
  mode: MusicalMode,
  key: ChromaticNote,
  octave: number,
  config: DynamicColorConfig,
  time?: number,
): NoteColorRelationships | null {
  const resolved = resolveMusicColorSampleByPitchClass(
    noteName,
    mode,
    key,
    octave,
    config,
    "omit",
    phaseForTime(config, time),
  );
  return resolved ? musicColorRelationships(resolved.sample) : null;
}

export function resolveExactMusicColorsByPitchClass(
  noteName: ChromaticNote,
  mode: MusicalMode,
  key: ChromaticNote,
  octave: number,
  config: DynamicColorConfig,
  time?: number,
): NoteColorRelationships | null {
  const resolved = resolveMusicColorSampleByPitchClass(
    noteName,
    mode,
    key,
    octave,
    config,
    "fixed-chromatic",
    phaseForTime(config, time),
  );
  return resolved ? musicColorRelationships(resolved.sample) : null;
}

export function resolveMusicColorsByNoteName(
  noteName: string,
  mode: MusicalMode,
  key: ChromaticNote,
  octave: number,
  config: DynamicColorConfig,
  time?: number,
): NoteColorRelationships | null {
  const scaleIndex = getScaleIndexForSolfegeName(noteName, mode);
  if (scaleIndex !== null) {
    return resolveMusicColorsByScaleIndex(
      scaleIndex,
      mode,
      key,
      octave,
      config,
      time,
    );
  }
  const chromaticNote = normalizeChromaticNote(noteName);
  return chromaticNote
    ? resolveMusicColorsByPitchClass(
        chromaticNote,
        mode,
        key,
        octave,
        config,
        time,
      )
    : null;
}
