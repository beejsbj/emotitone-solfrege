/**
 * Ambient Background Renderer
 * Handles ambient background effects and atmospheric visuals
 */

import type { AmbientConfig } from "@/types/visual";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import { CHROMATIC_NOTES, getScaleForMode } from "@/data";
import { useVisualConfig } from "../useVisualConfig";
import {
  musicColorValueToCss,
  resolveMusicColorSampleByPitchClass,
  resolveMusicColorSampleByScaleIndex,
  tuneMusicColorValue,
} from "@/services/musicColor";
import type { MusicColorValue } from "@/services/musicColorCore";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizePitchClass(value: number) {
  return ((value % CHROMATIC_NOTES.length) + CHROMATIC_NOTES.length)
    % CHROMATIC_NOTES.length;
}

function tuneAmbientColor(
  color: MusicColorValue,
  saturationMultiplier: number,
  brightnessMultiplier: number,
  alpha: number
): string {
  return musicColorValueToCss(tuneMusicColorValue(color, {
    chromaMultiplier: saturationMultiplier,
    lightnessMultiplier: brightnessMultiplier,
    alpha: clamp(alpha, 0, 1),
  }));
}

function resolveAmbientContext(musicStore: any) {
  const activeNotes =
    typeof musicStore?.getActiveNotes === "function"
      ? musicStore.getActiveNotes()
      : [];
  const firstActiveNote = activeNotes[0];
  const mode = (firstActiveNote?.mode ?? musicStore?.currentMode ?? "major") as MusicalMode;
  const key = (firstActiveNote?.key ?? musicStore?.currentKey ?? "C") as ChromaticNote;
  const scale = getScaleForMode(mode);
  const accentIndex = scale.degreeCount > 1 ? Math.floor(scale.degreeCount / 2) : 0;
  const highlightIndex = firstActiveNote?.solfegeIndex ?? accentIndex;

  return {
    mode,
    key,
    accentIndex,
    highlightIndex,
    highlightPitchClassIndex: firstActiveNote?.pitchClassIndex,
    highlightOctave: firstActiveNote?.octave ?? 4,
  };
}

export function useAmbientRenderer() {
  const { dynamicColorConfig } = useVisualConfig();

  /**
   * Render subtle texture overlay
   */
  const renderSubtleTexture = (
    ctx: CanvasRenderingContext2D,
    elapsed: number,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    ctx.globalAlpha = 0.03;

    // Create subtle grain texture using random dots
    const density = 0.0008; // Lower density for subtlety
    const timeOffset = elapsed * 0.00005;

    for (let i = 0; i < canvasWidth * canvasHeight * density; i++) {
      const x = Math.random() * canvasWidth;
      const y = Math.random() * canvasHeight;

      // Add slight animation to the grain
      const animatedX = x + Math.sin(timeOffset + i * 0.01) * 0.5;
      const animatedY = y + Math.cos(timeOffset + i * 0.01) * 0.5;

      // Vary the brightness slightly
      const brightness = 200 + Math.random() * 55;
      ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, 0.8)`;

      ctx.fillRect(animatedX, animatedY, 1, 1);
    }

    ctx.globalAlpha = 1;
  };

  /**
   * Render ambient background
   *
   * Note: the config field names retain their legacy "major/minor" keys so
   * persisted configs remain compatible, but they now control a tonic/accent
   * ambient wash rather than a binary major/minor split.
   */
  const renderAmbientBackground = (
    ctx: CanvasRenderingContext2D,
    elapsed: number,
    ambientConfig: AmbientConfig,
    canvasWidth: number,
    canvasHeight: number,
    musicStore: any,
    getCachedGradient: (
      key: string,
      createFn: () => CanvasGradient
    ) => CanvasGradient
  ) => {
    if (!ctx) return;

    const context = resolveAmbientContext(musicStore);
    const tonicColor = resolveMusicColorSampleByScaleIndex(
      0,
      context.mode,
      context.key,
      4,
      dynamicColorConfig.value,
    )?.sample.primary;
    const exactPitch = typeof context.highlightPitchClassIndex === "number"
      ? CHROMATIC_NOTES[normalizePitchClass(context.highlightPitchClassIndex)]
      : null;
    const accentColor = exactPitch
      ? resolveMusicColorSampleByPitchClass(
          exactPitch,
          context.mode,
          context.key,
          context.highlightOctave,
          dynamicColorConfig.value,
          "fixed-chromatic",
        )?.sample.primary
      : resolveMusicColorSampleByScaleIndex(
          context.highlightIndex,
          context.mode,
          context.key,
          context.highlightOctave,
          dynamicColorConfig.value,
        )?.sample.primary;
    const supportColor = resolveMusicColorSampleByScaleIndex(
      context.accentIndex,
      context.mode,
      context.key,
      3,
      dynamicColorConfig.value,
    )?.sample.primary;
    if (!tonicColor || !accentColor || !supportColor) return;

    const gradientKey = [
      "ambient",
      context.key,
      context.mode,
      context.highlightIndex,
      context.highlightPitchClassIndex,
      context.highlightOctave,
      musicColorValueToCss(tonicColor),
      musicColorValueToCss(accentColor),
      musicColorValueToCss(supportColor),
      canvasWidth,
      canvasHeight,
      ambientConfig.opacityMajor,
      ambientConfig.opacityMinor,
      ambientConfig.brightnessMajor,
      ambientConfig.brightnessMinor,
      ambientConfig.saturationMajor,
      ambientConfig.saturationMinor,
    ].join("-");

    const gradient = getCachedGradient(gradientKey, () => {
      const grad = ctx.createRadialGradient(
        canvasWidth * 0.5,
        canvasHeight * 0.3,
        0,
        canvasWidth * 0.5,
        canvasHeight * 0.3,
        Math.max(canvasWidth, canvasHeight) * 0.8
      );

      grad.addColorStop(
        0,
        tuneAmbientColor(
          tonicColor,
          ambientConfig.saturationMajor,
          ambientConfig.brightnessMajor,
          ambientConfig.opacityMajor * 0.55
        )
      );
      grad.addColorStop(
        0.45,
        tuneAmbientColor(
          accentColor,
          ambientConfig.saturationMinor,
          ambientConfig.brightnessMinor,
          ambientConfig.opacityMinor * 0.45
        )
      );
      grad.addColorStop(
        0.72,
        tuneAmbientColor(
          supportColor,
          ambientConfig.saturationMinor,
          ambientConfig.brightnessMinor,
          ambientConfig.opacityMinor * 0.2
        )
      );
      grad.addColorStop(1, "rgba(0, 0, 0, 0.94)");

      return grad;
    });

    // Fill with black first
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Apply mode-aware ambient lighting gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Add subtle texture
    renderSubtleTexture(ctx, elapsed, canvasWidth, canvasHeight);
  };

  return {
    renderAmbientBackground,
  };
}
