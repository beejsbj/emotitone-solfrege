/**
 * Unified Color System
 * Music color assignment and keyboard surface styling share one runtime entry point.
 */

import { computed, onUnmounted, ref } from "vue";
import { useVisualConfig } from "./useVisualConfig";
import type {
  ChromaticNote,
  MusicalMode,
  NoteColorRelationships,
} from "@/types";
import { getScaleForMode } from "@/data";
import {
  getChromaticNoteForScaleIndex,
  resolveMusicColorsByNoteName,
  resolveMusicColorsByScaleIndex,
  resolveSolfegeName as resolveMusicSolfegeName,
} from "@/services/musicColor";

const FALLBACK_NOTE_COLORS: NoteColorRelationships = {
  primary: "hsla(0, 0%, 16%, 1)",
  accent: "hsla(0, 0%, 26%, 1)",
  secondary: "hsla(0, 0%, 22%, 1)",
  tertiary: "hsla(0, 0%, 30%, 1)",
};

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

  const isFixedMusicColorMode = computed(
    () => dynamicColorConfig.value.musicColorMode === "fixed"
  );

  const getNoteColorsByScaleIndex = (
    scaleIndex: number,
    mode: MusicalMode = "major",
    key: ChromaticNote = "C",
    octave: number = 3,
    animated: boolean = true
  ): NoteColorRelationships => {
    const config = dynamicColorConfig.value;
    const time = animated ? animationTime.value : undefined;
    return (
      resolveMusicColorsByScaleIndex(
        scaleIndex,
        mode,
        key,
        octave,
        config,
        time
      ) ?? FALLBACK_NOTE_COLORS
    );
  };

  const getNoteColors = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3,
    animated: boolean = true,
    key: ChromaticNote = "C"
  ): NoteColorRelationships => {
    return (
      resolveMusicColorsByNoteName(
        noteName,
        mode,
        key,
        octave,
        dynamicColorConfig.value,
        animated ? animationTime.value : undefined
      ) ?? FALLBACK_NOTE_COLORS
    );
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

  const getStaticPrimaryColorFromSolfegeInput = (
    input: number | string,
    inputType: SolfegeInputType = "scaleIndex",
    mode: MusicalMode = "major",
    octave: number = 3,
    key: ChromaticNote = "C"
  ): string => {
    const solfegeName = resolveMusicSolfegeName(input, inputType, mode);
    return getStaticPrimaryColor(solfegeName, mode, octave, key);
  };

  const getSolfegeMappingInfo = (
    input: number | string,
    inputType: SolfegeInputType = "scaleIndex",
    mode: MusicalMode = "major"
  ) => {
    const scale = getScaleForMode(mode);
    const name = resolveMusicSolfegeName(input, inputType, mode);
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
    surfaceStyle: "colored" | "monochrome" | "glassmorphism",
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

    if (surfaceStyle === "monochrome") {
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

    if (surfaceStyle === "glassmorphism") {
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
    surfaceStyle: "colored" | "monochrome" | "glassmorphism",
    isAccidental: boolean
  ): string => {
    if (surfaceStyle === "monochrome") {
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
    resolveSolfegeName: resolveMusicSolfegeName,
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
    isFixedMusicColorMode,
  };
}
