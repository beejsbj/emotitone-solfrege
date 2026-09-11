import { computed } from "vue";
import { CHROMATIC_NOTES } from "@/data";
import { useMusicColorClock } from "@/composables/useMusicColorClock";
import { useMusicColorConfig } from "@/composables/useMusicColorConfig";
import {
  musicColorRelationships,
  musicColorValueToCss,
  resolveMusicColorSampleByPitchClass,
  resolveMusicColorSampleByScaleIndex,
  resolveMusicColorsByNoteName,
  tuneMusicColorValue,
} from "@/services/musicColor";
import type {
  ChromaticNote,
  MusicalMode,
  NoteColorRelationships,
} from "@/types";

const FALLBACK_NOTE_COLORS: NoteColorRelationships = {
  primary: "hsla(0, 0%, 16%, 1)",
  accent: "hsla(0, 0%, 26%, 1)",
};

export function useColorSystem(options: { animated?: boolean } = {}) {
  const dynamicColorConfig = useMusicColorConfig();
  const clock = useMusicColorClock(
    () => options.animated === true && dynamicColorConfig.value.hueMotionEnabled,
    () => dynamicColorConfig.value.animationSpeed,
  );

  const samplePhase = (animated: boolean) =>
    animated &&
    options.animated &&
    dynamicColorConfig.value.hueMotionEnabled &&
    !clock.reducedMotion.value
      ? clock.phaseCycles.value
      : null;
  const legacyTime = (animated: boolean) => {
    const phase = samplePhase(animated);
    const speed = dynamicColorConfig.value.animationSpeed;
    return phase === null || speed <= 0
      ? undefined
      : phase * Math.PI * 2 * 1000 / speed;
  };

  const getNoteColorsByScaleIndex = (
    scaleIndex: number,
    mode: MusicalMode = "major",
    key: ChromaticNote = "C",
    octave = 3,
    animated = true,
  ): NoteColorRelationships => {
    const resolved = resolveMusicColorSampleByScaleIndex(
      scaleIndex,
      mode,
      key,
      octave,
      dynamicColorConfig.value,
      samplePhase(animated),
    );
    return resolved
      ? musicColorRelationships(resolved.sample)
      : FALLBACK_NOTE_COLORS;
  };

  const getNoteColorsByPitchClass = (
    pitchClassIndex: number,
    mode: MusicalMode = "major",
    key: ChromaticNote = "C",
    octave = 3,
    animated = true,
  ): NoteColorRelationships => {
    const normalized = ((pitchClassIndex % 12) + 12) % 12;
    const resolved = resolveMusicColorSampleByPitchClass(
      CHROMATIC_NOTES[normalized],
      mode,
      key,
      octave,
      dynamicColorConfig.value,
      "fixed-chromatic",
      samplePhase(animated),
    );
    return resolved
      ? musicColorRelationships(resolved.sample)
      : FALLBACK_NOTE_COLORS;
  };

  const getNoteColors = (
    noteName: string,
    mode: MusicalMode = "major",
    octave = 3,
    animated = true,
    key: ChromaticNote = "C",
  ): NoteColorRelationships => resolveMusicColorsByNoteName(
    noteName,
    mode,
    key,
    octave,
    dynamicColorConfig.value,
    legacyTime(animated),
  ) ?? FALLBACK_NOTE_COLORS;

  const getPrimaryColorByScaleIndex = (
    scaleIndex: number,
    mode: MusicalMode = "major",
    key: ChromaticNote = "C",
    octave = 3,
  ) => getNoteColorsByScaleIndex(scaleIndex, mode, key, octave, true).primary;

  const getStaticPrimaryColorByScaleIndex = (
    scaleIndex: number,
    mode: MusicalMode = "major",
    key: ChromaticNote = "C",
    octave = 3,
  ) => getNoteColorsByScaleIndex(scaleIndex, mode, key, octave, false).primary;

  const getStaticPrimaryColorByPitchClass = (
    pitchClassIndex: number,
    mode: MusicalMode = "major",
    key: ChromaticNote = "C",
    octave = 3,
  ) => getNoteColorsByPitchClass(pitchClassIndex, mode, key, octave, false).primary;

  const getPrimaryColorForPitch = (
    scaleIndex: number,
    pitchClassIndex: number | undefined,
    mode: MusicalMode = "major",
    key: ChromaticNote = "C",
    octave = 3,
  ) => typeof pitchClassIndex === "number" && Number.isInteger(pitchClassIndex)
    ? getNoteColorsByPitchClass(pitchClassIndex, mode, key, octave, true).primary
    : getPrimaryColorByScaleIndex(scaleIndex, mode, key, octave);

  const getStaticPrimaryColorForPitch = (
    scaleIndex: number,
    pitchClassIndex: number | undefined,
    mode: MusicalMode = "major",
    key: ChromaticNote = "C",
    octave = 3,
  ) => typeof pitchClassIndex === "number" && Number.isInteger(pitchClassIndex)
    ? getStaticPrimaryColorByPitchClass(pitchClassIndex, mode, key, octave)
    : getStaticPrimaryColorByScaleIndex(scaleIndex, mode, key, octave);

  const getPrimaryColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave = 3,
    key: ChromaticNote = "C",
  ) => getNoteColors(noteName, mode, octave, true, key).primary;

  const getStaticPrimaryColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave = 3,
    key: ChromaticNote = "C",
  ) => getNoteColors(noteName, mode, octave, false, key).primary;

  const getFleckColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave = 3,
    key: ChromaticNote = "C",
  ) => getNoteColors(noteName, mode, octave, true, key).accent;

  const getFleckColorByPitchClass = (
    pitchClassIndex: number,
    mode: MusicalMode = "major",
    key: ChromaticNote = "C",
    octave = 3,
  ) => getNoteColorsByPitchClass(
    pitchClassIndex,
    mode,
    key,
    octave,
    true,
  ).accent;

  const withAlpha = (color: string, alpha: number): string => {
    if (color.startsWith("rgba(")) {
      return color.replace(/,\s*[\d.]+\)$/, `, ${alpha})`);
    }
    if (color.startsWith("rgb(")) {
      return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
    }
    if (color.startsWith("hsla(")) {
      return color.replace(/,\s*[\d.]+\)$/, `, ${alpha})`);
    }
    if (color.startsWith("hsl(")) {
      return color.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);
    }
    return color;
  };

  const createGlassmorphBackground = (color: string, opacity = 0.4) => {
    const strong = withAlpha(color, opacity * 1.425);
    const faint = withAlpha(color, opacity * 0.15);
    return `radial-gradient(84.35% 70.19% at 50% 38.11%, ${strong}, ${faint})`;
  };

  const coloredSurface = (
    resolved: ReturnType<typeof resolveMusicColorSampleByScaleIndex>,
    brightness: number,
    saturation: number,
  ) => {
    if (!resolved) {
      return {
        background: FALLBACK_NOTE_COLORS.primary,
        primaryColor: FALLBACK_NOTE_COLORS.primary,
      };
    }
    const adjusted = musicColorValueToCss(tuneMusicColorValue(
      resolved.sample.primary,
      {
        lightnessMultiplier: brightness,
        chromaMultiplier: saturation,
      },
    ));
    return { background: adjusted, primaryColor: adjusted };
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
    } = {},
  ): { background: string; primaryColor: string } => {
    const brightness = config.keyBrightness ?? 1;
    const saturation = config.keySaturation ?? 1;
    if (surfaceStyle === "monochrome") {
      const lightness = Math.min(100, Math.max(0, (isAccidental ? 100 : 10) * brightness));
      const color = `hsla(0, 0%, ${lightness}%, 1)`;
      return { background: color, primaryColor: color };
    }

    const resolved = resolveMusicColorSampleByScaleIndex(
      scaleIndex,
      mode,
      key,
      octave,
      dynamicColorConfig.value,
      samplePhase(true),
    );
    const colors = coloredSurface(resolved, brightness, saturation);
    return surfaceStyle === "glassmorphism"
      ? {
          background: createGlassmorphBackground(
            colors.primaryColor,
            config.glassmorphOpacity ?? 0.4,
          ),
          primaryColor: colors.primaryColor,
        }
      : colors;
  };

  const getKeyBackgroundByPitchClass = (
    pitchClassIndex: number,
    mode: MusicalMode,
    key: ChromaticNote,
    octave: number,
    surfaceStyle: "colored" | "monochrome" | "glassmorphism",
    isAccidental: boolean,
    config: {
      keyBrightness?: number;
      keySaturation?: number;
      glassmorphOpacity?: number;
    } = {},
  ): { background: string; primaryColor: string } => {
    if (surfaceStyle === "monochrome") {
      return getKeyBackground(0, mode, key, octave, surfaceStyle, isAccidental, config);
    }
    const normalized = ((pitchClassIndex % 12) + 12) % 12;
    const resolved = resolveMusicColorSampleByPitchClass(
      CHROMATIC_NOTES[normalized],
      mode,
      key,
      octave,
      dynamicColorConfig.value,
      "fixed-chromatic",
      samplePhase(true),
    );
    const colors = coloredSurface(
      resolved,
      config.keyBrightness ?? 1,
      config.keySaturation ?? 1,
    );
    return surfaceStyle === "glassmorphism"
      ? {
          background: createGlassmorphBackground(
            colors.primaryColor,
            config.glassmorphOpacity ?? 0.4,
          ),
          primaryColor: colors.primaryColor,
        }
      : colors;
  };

  return {
    getNoteColors,
    getNoteColorsByScaleIndex,
    getNoteColorsByPitchClass,
    getPrimaryColor,
    getStaticPrimaryColor,
    getPrimaryColorByScaleIndex,
    getPrimaryColorForPitch,
    getStaticPrimaryColorByScaleIndex,
    getStaticPrimaryColorByPitchClass,
    getStaticPrimaryColorForPitch,
    getFleckColor,
    getFleckColorByPitchClass,
    withAlpha,
    createGlassmorphBackground,
    getKeyBackground,
    getKeyBackgroundByPitchClass,
    isFixedMusicColorMode: computed(
      () => dynamicColorConfig.value.musicColorMode === "fixed",
    ),
  };
}
