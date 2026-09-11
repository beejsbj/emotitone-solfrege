import type { InjectionKey } from "vue";
import { CHROMATIC_NOTES } from "@/data";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import {
  resolveExactMusicColorsByPitchClass,
  resolveMusicColorsByScaleIndex,
} from "@/services/musicColor";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import type { NoteSurfaceStyle } from "@/components/primatives/Note.vue";

interface KeySurfaceTuning {
  keyBrightness?: number;
  keySaturation?: number;
}

export interface KeyboardColorResolver {
  getKeyBackground: (
    scaleIndex: number,
    mode: MusicalMode,
    key: ChromaticNote,
    octave: number,
    surfaceStyle: NoteSurfaceStyle,
    isAccidental: boolean,
    tuning?: KeySurfaceTuning,
  ) => { background: string; primaryColor: string };
  getKeyBackgroundByPitchClass: (
    pitchClassIndex: number,
    mode: MusicalMode,
    key: ChromaticNote,
    octave: number,
    surfaceStyle: NoteSurfaceStyle,
    isAccidental: boolean,
    tuning?: KeySurfaceTuning,
  ) => { background: string; primaryColor: string };
}

export const keyboardColorResolverKey: InjectionKey<KeyboardColorResolver> =
  Symbol("keyboard-controlled-color-resolver");

const FALLBACK_COLOR = "hsla(0, 0%, 16%, 1)";

function adjustColor(
  color: string,
  brightness = 1,
  saturation = 1,
) {
  const match = color.match(
    /hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)/,
  );
  if (!match) return color;

  const [, hue, sourceSaturation, lightness, alpha = "1"] = match;
  const adjustedSaturation = Math.max(
    0,
    Math.min(100, Number(sourceSaturation) * saturation),
  );
  const adjustedLightness = Math.max(
    0,
    Math.min(100, Number(lightness) * brightness),
  );
  return `hsla(${hue}, ${adjustedSaturation}%, ${adjustedLightness}%, ${alpha})`;
}

function monochromeSurface(isAccidental: boolean, tuning: KeySurfaceTuning) {
  const color = adjustColor(
    isAccidental ? "hsla(0, 0%, 100%, 1)" : "hsla(0, 0%, 10%, 1)",
    tuning.keyBrightness,
    tuning.keySaturation,
  );
  return { background: color, primaryColor: color };
}

function coloredSurface(color: string, tuning: KeySurfaceTuning) {
  const adjusted = adjustColor(
    color,
    tuning.keyBrightness,
    tuning.keySaturation,
  );
  return { background: adjusted, primaryColor: adjusted };
}

export const controlledKeyboardColorResolver: KeyboardColorResolver = {
  getKeyBackground(
    scaleIndex,
    mode,
    key,
    octave,
    surfaceStyle,
    isAccidental,
    tuning = {},
  ) {
    if (surfaceStyle === "monochrome") {
      return monochromeSurface(isAccidental, tuning);
    }
    const color = resolveMusicColorsByScaleIndex(
      scaleIndex,
      mode,
      key,
      octave,
      DEFAULT_CONFIG.dynamicColors,
    )?.primary ?? FALLBACK_COLOR;
    return coloredSurface(color, tuning);
  },

  getKeyBackgroundByPitchClass(
    pitchClassIndex,
    mode,
    key,
    octave,
    surfaceStyle,
    isAccidental,
    tuning = {},
  ) {
    if (surfaceStyle === "monochrome") {
      return monochromeSurface(isAccidental, tuning);
    }
    const normalizedIndex = (
      (pitchClassIndex % CHROMATIC_NOTES.length) + CHROMATIC_NOTES.length
    ) % CHROMATIC_NOTES.length;
    const color = resolveExactMusicColorsByPitchClass(
      CHROMATIC_NOTES[normalizedIndex],
      mode,
      key,
      octave,
      DEFAULT_CONFIG.dynamicColors,
    )?.primary ?? FALLBACK_COLOR;
    return coloredSurface(color, tuning);
  },
};
