/**
 * Unified Color System
 * Dynamic colors are scale-relative; the persisted chromaticMapping toggle
 * is reinterpreted as static 12-pitch-class coloring.
 */

import { computed, onUnmounted, ref } from "vue";
import { useVisualConfig } from "./useVisualConfig";
import type {
  ChromaticNote,
  DynamicColorConfig,
  MusicalMode,
  NoteColorRelationships,
} from "@/types";
import {
  ALL_SOLFEGE_NOTES,
  CHROMATIC_NOTES,
  getScaleForMode,
} from "@/data";

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

function normalizeIndex(index: number, base: number): number {
  return ((index % base) + base) % base;
}

function calculateChromaticBaseHue(noteIndex: number): number {
  const hueInterval = 360 / 12;
  return (noteIndex * hueInterval + hueInterval / 2) % 360;
}

function calculateDegreeBaseHue(
  scaleIndex: number,
  degreeCount: number,
  key: ChromaticNote
): number {
  const tonicIndex = CHROMATIC_NOTES.indexOf(key);
  const tonicHue = calculateChromaticBaseHue(Math.max(0, tonicIndex));
  const hueInterval = 360 / degreeCount;
  return (tonicHue + normalizeIndex(scaleIndex, degreeCount) * hueInterval) % 360;
}

function calculateOctaveLightness(
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

function generateColorRelationships(
  hue: number,
  saturation: number,
  lightness: number
): NoteColorRelationships {
  const primary = `hsla(${hue}, ${saturation * 100}%, ${lightness * 100}%, 1)`;
  const accentHue = (hue + 180) % 360;
  const accent = `hsla(${accentHue}, ${saturation * 100}%, ${
    lightness * 100
  }%, 1)`;
  const secondaryHue = (hue + 120) % 360;
  const secondary = `hsla(${secondaryHue}, ${saturation * 100}%, ${
    lightness * 100
  }%, 1)`;
  const tertiaryHue = (hue + 240) % 360;
  const tertiary = `hsla(${tertiaryHue}, ${saturation * 100}%, ${
    lightness * 100
  }%, 1)`;

  return { primary, accent, secondary, tertiary };
}

function generateAnimatedHue(
  baseHue: number,
  amplitude: number,
  time: number,
  speed: number,
  intervalCount: number
): number {
  const hueInterval = 360 / intervalCount;
  const clampedAmplitude = Math.min(amplitude, hueInterval / 2);
  const animationOffset = Math.sin(time * speed * 0.001) * clampedAmplitude;
  return (baseHue + animationOffset + 360) % 360;
}

function normalizeChromaticNote(noteName: string): ChromaticNote | null {
  const cleanName = noteName.replace(/[0-9']/g, "");

  if (CHROMATIC_NOTES.includes(cleanName as ChromaticNote)) {
    return cleanName as ChromaticNote;
  }

  if (EDGE_CASE_MAP[cleanName]) {
    return EDGE_CASE_MAP[cleanName];
  }

  return FLAT_TO_SHARP_MAP[cleanName] ?? null;
}

function getChromaticNoteForScaleIndex(
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

function getScaleIndexForSolfegeName(
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

function getFallbackScaleIndexForChromaticNote(
  noteName: ChromaticNote,
  mode: MusicalMode,
  key: ChromaticNote
): number | null {
  const scale = getScaleForMode(mode);
  const chromaticIndex = CHROMATIC_NOTES.indexOf(noteName);
  const tonicIndex = CHROMATIC_NOTES.indexOf(key);

  if (chromaticIndex === -1 || tonicIndex === -1) {
    return null;
  }

  const relativeSemitone = (chromaticIndex - tonicIndex + 12) % 12;
  let fallbackIndex = 0;

  for (let index = 0; index < scale.intervals.length; index++) {
    if (scale.intervals[index] <= relativeSemitone) {
      fallbackIndex = index;
    } else {
      break;
    }
  }

  return fallbackIndex;
}

function getDynamicNoteColors(
  scaleIndex: number,
  octave: number,
  key: ChromaticNote,
  degreeCount: number,
  config: DynamicColorConfig,
  time?: number
): NoteColorRelationships {
  const baseHue = calculateDegreeBaseHue(scaleIndex, degreeCount, key);
  const hue =
    time !== undefined
      ? generateAnimatedHue(
          baseHue,
          config.hueAnimationAmplitude,
          time,
          config.animationSpeed,
          degreeCount
        )
      : baseHue;
  const lightness = calculateOctaveLightness(
    octave,
    config.baseLightness,
    config.lightnessRange
  );

  return generateColorRelationships(hue, config.saturation, lightness);
}

function getStaticChromaticNoteColors(
  chromaticNote: ChromaticNote,
  octave: number,
  config: DynamicColorConfig,
  time?: number
): NoteColorRelationships {
  const noteIndex = CHROMATIC_NOTES.indexOf(chromaticNote);
  const baseHue = calculateChromaticBaseHue(Math.max(0, noteIndex));
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

let animationId: number | null = null;
const animationTime = ref(0);

function startGlobalAnimation() {
  if (animationId) {
    return;
  }

  const animate = () => {
    animationTime.value = Date.now();
    animationId = requestAnimationFrame(animate);
  };

  animate();
}

export function useColorSystem() {
  const { dynamicColorConfig } = useVisualConfig();

  startGlobalAnimation();

  onUnmounted(() => {
    // Intentionally left running while the app is mounted.
  });

  const isStaticChromaticColors = computed(
    () => dynamicColorConfig.value.chromaticMapping
  );

  const getNoteColorsByScaleIndex = (
    scaleIndex: number,
    mode: MusicalMode = "major",
    key: ChromaticNote = "C",
    octave: number = 3,
    animated: boolean = true
  ): NoteColorRelationships => {
    const config = dynamicColorConfig.value;
    const scale = getScaleForMode(mode);
    const normalizedScaleIndex = normalizeIndex(scaleIndex, scale.degreeCount);
    const time = animated ? animationTime.value : undefined;

    if (isStaticChromaticColors.value) {
      const chromaticNote = getChromaticNoteForScaleIndex(
        normalizedScaleIndex,
        mode,
        key
      );

      if (chromaticNote) {
        return getStaticChromaticNoteColors(chromaticNote, octave, config, time);
      }
    }

    return getDynamicNoteColors(
      normalizedScaleIndex,
      octave,
      key,
      scale.degreeCount,
      config,
      time
    );
  };

  const getNoteColors = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3,
    animated: boolean = true,
    key: ChromaticNote = "C"
  ): NoteColorRelationships => {
    const scaleIndex = getScaleIndexForSolfegeName(noteName, mode);
    if (scaleIndex !== null) {
      return getNoteColorsByScaleIndex(scaleIndex, mode, key, octave, animated);
    }

    const chromaticNote = normalizeChromaticNote(noteName);
    if (chromaticNote) {
      if (isStaticChromaticColors.value) {
        return getStaticChromaticNoteColors(
          chromaticNote,
          octave,
          dynamicColorConfig.value,
          animated ? animationTime.value : undefined
        );
      }

      const fallbackIndex = getFallbackScaleIndexForChromaticNote(
        chromaticNote,
        mode,
        key
      );
      if (fallbackIndex !== null) {
        return getNoteColorsByScaleIndex(
          fallbackIndex,
          mode,
          key,
          octave,
          animated
        );
      }
    }

    return {
      primary: "hsla(0, 80%, 50%, 1)",
      accent: "hsla(180, 80%, 50%, 1)",
      secondary: "hsla(120, 80%, 50%, 1)",
      tertiary: "hsla(240, 80%, 50%, 1)",
    };
  };

  const getPrimaryColorByScaleIndex = (
    scaleIndex: number,
    mode: MusicalMode = "major",
    key: ChromaticNote = "C",
    octave: number = 3
  ): string => getNoteColorsByScaleIndex(scaleIndex, mode, key, octave, true).primary;

  const getStaticPrimaryColorByScaleIndex = (
    scaleIndex: number,
    mode: MusicalMode = "major",
    key: ChromaticNote = "C",
    octave: number = 3
  ): string =>
    getNoteColorsByScaleIndex(scaleIndex, mode, key, octave, false).primary;

  const getPrimaryColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3,
    key: ChromaticNote = "C"
  ): string => getNoteColors(noteName, mode, octave, true, key).primary;

  const getStaticPrimaryColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3,
    key: ChromaticNote = "C"
  ): string => getNoteColors(noteName, mode, octave, false, key).primary;

  const getAccentColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3,
    key: ChromaticNote = "C"
  ): string => getNoteColors(noteName, mode, octave, true, key).accent;

  const getStaticAccentColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3,
    key: ChromaticNote = "C"
  ): string => getNoteColors(noteName, mode, octave, false, key).accent;

  const getSecondaryColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3,
    key: ChromaticNote = "C"
  ): string => getNoteColors(noteName, mode, octave, true, key).secondary;

  const getStaticSecondaryColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3,
    key: ChromaticNote = "C"
  ): string => getNoteColors(noteName, mode, octave, false, key).secondary;

  const getTertiaryColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3,
    key: ChromaticNote = "C"
  ): string => getNoteColors(noteName, mode, octave, true, key).tertiary;

  const getStaticTertiaryColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3,
    key: ChromaticNote = "C"
  ): string => getNoteColors(noteName, mode, octave, false, key).tertiary;

  const getStringColor = getAccentColor;
  const getFleckColor = getAccentColor;
  const getHighlightColor = getAccentColor;

  const getGradient = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3,
    direction: number | string = 45,
    key: ChromaticNote = "C"
  ): string => {
    const colors = getNoteColors(noteName, mode, octave, true, key);
    const cssDirection =
      typeof direction === "number" ? `${direction}deg` : direction;
    return `linear-gradient(${cssDirection}, ${colors.primary} 60%, ${colors.accent}, ${colors.secondary}, ${colors.tertiary})`;
  };

  const withAlpha = (color: string, alpha: number): string => {
    if (color.startsWith("hsla(")) {
      return color.replace(/,\s*[\d.]+\)$/, `, ${alpha})`);
    }

    if (color.startsWith("hsl(")) {
      return color.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);
    }

    return color;
  };

  const isDynamicColorsEnabled = computed(() => true);

  const getColorPreview = (
    mode: MusicalMode = "major",
    octave: number = 3,
    key: ChromaticNote = "C"
  ) => {
    const scale = getScaleForMode(mode);

    return scale.solfege.map((note, index) => ({
      name: note.name,
      index,
      chromaticNote: getChromaticNoteForScaleIndex(index, mode, key),
      colors: getNoteColorsByScaleIndex(index, mode, key, octave, false),
    }));
  };

  const createGlassmorphBackground = (
    color: string,
    opacity: number = 0.4
  ): string => {
    const color1 = withAlpha(color, opacity * 1.425);
    const color2 = withAlpha(color, opacity * 0.15);
    return `radial-gradient(84.35% 70.19% at 50% 38.11%, ${color1}, ${color2})`;
  };

  const createGlassmorphShadow = (color: string): string => {
    const shadowColor = withAlpha(color, 0.09);
    return `hsla(0, 0%, 100%, 0.1) 0px 1px 0px 0px inset, hsla(0, 0%, 0%, 0.4) 0px 30px 50px 0px, ${shadowColor} 0px 4px 24px 0px, hsla(0, 0%, 100%, 0.06) 0px 0px 0px 1px inset`;
  };

  const createChordGlassmorphBackground = (
    colors: string[],
    opacity: number = 0.4
  ): string => {
    if (colors.length === 0) {
      return "rgba(255, 255, 255, 0.1)";
    }

    if (colors.length === 1) {
      return createGlassmorphBackground(colors[0], opacity);
    }

    const gradientColors = colors.map((color) => withAlpha(color, opacity));
    const gradientColorsLight = colors.map((color) =>
      withAlpha(color, opacity * 0.15)
    );

    return `linear-gradient(135deg, ${gradientColors.join(
      ", "
    )}, ${gradientColorsLight.join(", ")})`;
  };

  const createChordGlassmorphShadow = (colors: string[]): string => {
    if (colors.length === 0) {
      return createGlassmorphShadow("#ffffff");
    }

    return createGlassmorphShadow(colors[0]);
  };

  const createIntervalGlassmorphBackground = (
    fromColor: string,
    toColor: string,
    opacity: number = 0.4
  ): string => {
    const fromColorAlpha = withAlpha(fromColor, opacity);
    const toColorAlpha = withAlpha(toColor, opacity);
    return `linear-gradient(90deg, ${fromColorAlpha}, ${toColorAlpha})`;
  };

  const createGradient = (
    colors: string[],
    direction: string = "135deg"
  ): string => {
    if (colors.length === 1) {
      return colors[0];
    }

    return `linear-gradient(${direction}, ${colors.join(", ")})`;
  };

  const createConicGradient = (
    colors: string[],
    startAngle: string = "0deg"
  ): string => {
    if (colors.length === 1) {
      return colors[0];
    }

    return `conic-gradient(from ${startAngle}, ${colors.join(", ")})`;
  };

  const createConicGlassmorphBackground = (
    color: string,
    opacity: number = 0.4,
    startAngle: string = "0deg"
  ): string => {
    const color1 = withAlpha(color, opacity * 1.425);
    const color2 = withAlpha(color, opacity * 0.15);
    const color3 = withAlpha(color, opacity * 0.8);
    return `conic-gradient(from ${startAngle}, ${color1}, ${color2}, ${color3}, ${color1})`;
  };

  type SolfegeInputType = "scaleIndex" | "solfegeIndex" | "solfegeName";

  const resolveSolfegeName = (
    input: number | string,
    inputType: SolfegeInputType = "scaleIndex",
    mode: MusicalMode = "major"
  ): string => {
    const scale = getScaleForMode(mode);

    if (inputType === "solfegeName") {
      const name = String(input).replace("'", "");
      const match = scale.solfege.find(
        (note) => note.name.toLowerCase() === name.toLowerCase()
      );
      return match?.name || scale.solfege[0]?.name || ALL_SOLFEGE_NOTES[0];
    }

    if (inputType === "solfegeIndex") {
      const normalizedOneBased =
        normalizeIndex(Number(input) - 1, scale.degreeCount) + 1;
      return (
        scale.solfege[normalizedOneBased - 1]?.name ||
        scale.solfege[0]?.name ||
        ALL_SOLFEGE_NOTES[0]
      );
    }

    const normalizedIndex = normalizeIndex(Number(input), scale.degreeCount);
    return (
      scale.solfege[normalizedIndex]?.name ||
      scale.solfege[0]?.name ||
      ALL_SOLFEGE_NOTES[0]
    );
  };

  const getStaticPrimaryColorFromSolfegeInput = (
    input: number | string,
    inputType: SolfegeInputType = "scaleIndex",
    mode: MusicalMode = "major",
    octave: number = 3,
    key: ChromaticNote = "C"
  ): string => {
    const solfegeName = resolveSolfegeName(input, inputType, mode);
    return getStaticPrimaryColor(solfegeName, mode, octave, key);
  };

  const getSolfegeMappingInfo = (
    input: number | string,
    inputType: SolfegeInputType = "scaleIndex",
    mode: MusicalMode = "major"
  ) => {
    const scale = getScaleForMode(mode);
    const name = resolveSolfegeName(input, inputType, mode);
    const scaleIndex = scale.solfege.findIndex((note) => note.name === name);
    return {
      solfegeName: name,
      scaleIndex,
      solfegeIndex: scaleIndex + 1,
    };
  };

  const createChordConicGlassmorphBackground = (
    colors: string[],
    opacity: number = 0.4,
    startAngle: string = "0deg"
  ): string => {
    if (colors.length === 0) {
      return "rgba(255, 255, 255, 0.1)";
    }

    if (colors.length === 1) {
      return createConicGlassmorphBackground(colors[0], opacity, startAngle);
    }

    const gradientColors = colors.map((color) => withAlpha(color, opacity));
    const gradientColorsLight = colors.map((color) =>
      withAlpha(color, opacity * 0.15)
    );
    const interleavedColors: string[] = [];

    for (let index = 0; index < colors.length; index++) {
      interleavedColors.push(gradientColors[index]);
      interleavedColors.push(gradientColorsLight[index]);
    }

    interleavedColors.push(gradientColors[0]);

    return `conic-gradient(from ${startAngle}, ${interleavedColors.join(", ")})`;
  };

  const createIntervalConicGlassmorphBackground = (
    fromColor: string,
    toColor: string,
    opacity: number = 0.4,
    startAngle: string = "0deg"
  ): string => {
    const fromColorAlpha = withAlpha(fromColor, opacity);
    const toColorAlpha = withAlpha(toColor, opacity);
    const fromColorLight = withAlpha(fromColor, opacity * 0.15);
    const toColorLight = withAlpha(toColor, opacity * 0.15);

    return `conic-gradient(from ${startAngle}, ${fromColorAlpha}, ${toColorLight}, ${toColorAlpha}, ${fromColorLight}, ${fromColorAlpha})`;
  };

  const getConicGradient = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3,
    startAngle: number | string = 0,
    key: ChromaticNote = "C"
  ): string => {
    const colors = getNoteColors(noteName, mode, octave, true, key);
    const cssAngle =
      typeof startAngle === "number" ? `${startAngle}deg` : startAngle;
    return `conic-gradient(from ${cssAngle}, ${colors.primary}, ${colors.accent}, ${colors.secondary}, ${colors.tertiary}, ${colors.primary})`;
  };

  const adjustColorHSL = (
    color: string,
    brightness: number = 1,
    saturation: number = 1
  ): string => {
    const hslaMatch = color.match(
      /hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)/
    );
    if (!hslaMatch) {
      return color;
    }

    const [, h, s, l, a = "1"] = hslaMatch;
    const adjustedS = Math.max(0, Math.min(100, parseFloat(s) * saturation));
    const adjustedL = Math.max(0, Math.min(100, parseFloat(l) * brightness));

    return `hsla(${h}, ${adjustedS}%, ${adjustedL}%, ${a})`;
  };

  const getKeyBackground = (
    scaleIndex: number,
    mode: MusicalMode,
    key: ChromaticNote,
    octave: number,
    colorMode: "colored" | "monochrome" | "glassmorphism",
    isAccidental: boolean,
    config: {
      keyBrightness?: number;
      keySaturation?: number;
      glassmorphOpacity?: number;
    } = {}
  ): { background: string; primaryColor: string } => {
    const {
      keyBrightness = 1,
      keySaturation = 1,
      glassmorphOpacity = 0.4,
    } = config;

    if (colorMode === "monochrome") {
      const baseColor = isAccidental
        ? "hsla(0, 0%, 100%, 1)"
        : "hsla(0, 0%, 10%, 1)";
      const adjustedColor = adjustColorHSL(
        baseColor,
        keyBrightness,
        keySaturation
      );
      return {
        background: adjustedColor,
        primaryColor: adjustedColor,
      };
    }

    const primaryColor = getStaticPrimaryColorByScaleIndex(
      scaleIndex,
      mode,
      key,
      octave
    );

    if (colorMode === "glassmorphism") {
      return {
        background: createGlassmorphBackground(primaryColor, glassmorphOpacity),
        primaryColor,
      };
    }

    const adjustedColor = adjustColorHSL(
      primaryColor,
      keyBrightness,
      keySaturation
    );
    return {
      background: adjustedColor,
      primaryColor: adjustedColor,
    };
  };

  const getKeyTextColor = (
    colorMode: "colored" | "monochrome" | "glassmorphism",
    isAccidental: boolean
  ): string => {
    if (colorMode === "monochrome") {
      return isAccidental ? "text-black" : "text-white";
    }

    return isAccidental ? "text-black" : "text-white";
  };

  return {
    getNoteColors,
    getNoteColorsByScaleIndex,
    getPrimaryColor,
    getPrimaryColorByScaleIndex,
    getAccentColor,
    getSecondaryColor,
    getTertiaryColor,
    getStaticPrimaryColor,
    getStaticPrimaryColorByScaleIndex,
    getStaticAccentColor,
    getStaticSecondaryColor,
    getStaticTertiaryColor,
    getStringColor,
    getFleckColor,
    getHighlightColor,
    getGradient,
    getConicGradient,
    withAlpha,
    createGradient,
    createConicGradient,
    resolveSolfegeName,
    getStaticPrimaryColorFromSolfegeInput,
    getSolfegeMappingInfo,
    createGlassmorphBackground,
    createGlassmorphShadow,
    createChordGlassmorphBackground,
    createChordGlassmorphShadow,
    createIntervalGlassmorphBackground,
    createConicGlassmorphBackground,
    createChordConicGlassmorphBackground,
    createIntervalConicGlassmorphBackground,
    getColorPreview,
    getKeyBackground,
    getKeyTextColor,
    isDynamicColorsEnabled,
    isStaticChromaticColors,
  };
}
