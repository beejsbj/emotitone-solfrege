import type { InjectionKey } from "vue";
import { CHROMATIC_NOTES } from "@/data";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import {
  resolveMusicColorKeySurface,
  resolveKeySurfaceColor,
  type KeySurfaceColor,
  type KeySurfaceTuning,
} from "@/services/keySurfaceColor";
import {
  resolveMusicColorSampleByPitchClass,
  resolveMusicColorSampleByScaleIndex,
} from "@/services/musicColor";
import type { ChromaticNote, MusicalMode } from "@/types/music";

export type NoteColorSurfaceStyle = "colored" | "monochrome";

export interface NoteColorResolver {
  getKeyBackground: (
    scaleIndex: number,
    mode: MusicalMode,
    key: ChromaticNote,
    octave: number,
    surfaceStyle: NoteColorSurfaceStyle,
    isAccidental: boolean,
    tuning?: KeySurfaceTuning,
  ) => KeySurfaceColor;
  getKeyBackgroundByPitchClass: (
    pitchClassIndex: number,
    mode: MusicalMode,
    key: ChromaticNote,
    octave: number,
    surfaceStyle: NoteColorSurfaceStyle,
    isAccidental: boolean,
    tuning?: KeySurfaceTuning,
  ) => KeySurfaceColor;
}

export const noteColorResolverKey: InjectionKey<NoteColorResolver> =
  Symbol("note-color-resolver");

function staticSurface(
  primaryColor: Parameters<typeof resolveMusicColorKeySurface>[0],
  surfaceStyle: NoteColorSurfaceStyle,
  isAccidental: boolean,
  tuning: KeySurfaceTuning,
) {
  return surfaceStyle === "monochrome"
    ? resolveKeySurfaceColor("", surfaceStyle, isAccidental, tuning)
    : resolveMusicColorKeySurface(primaryColor, tuning);
}

/** Static default-config color source for isolated real-source specimens. */
export const staticNoteColorResolver: NoteColorResolver = {
  getKeyBackground(
    scaleIndex,
    mode,
    key,
    octave,
    surfaceStyle,
    isAccidental,
    tuning = {},
  ) {
    const primaryColor = surfaceStyle === "monochrome"
      ? null
      : resolveMusicColorSampleByScaleIndex(
        scaleIndex,
        mode,
        key,
        octave,
        DEFAULT_CONFIG.dynamicColors,
      )?.sample.primary;
    return staticSurface(primaryColor, surfaceStyle, isAccidental, tuning);
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
    const normalizedIndex = (
      (pitchClassIndex % CHROMATIC_NOTES.length) + CHROMATIC_NOTES.length
    ) % CHROMATIC_NOTES.length;
    const primaryColor = surfaceStyle === "monochrome"
      ? null
      : resolveMusicColorSampleByPitchClass(
        CHROMATIC_NOTES[normalizedIndex],
        mode,
        key,
        octave,
        DEFAULT_CONFIG.dynamicColors,
        "fixed-chromatic",
      )?.sample.primary;
    return staticSurface(primaryColor, surfaceStyle, isAccidental, tuning);
  },
};
