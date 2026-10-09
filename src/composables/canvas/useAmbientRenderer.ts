/**
 * Atmosphere · the Diffused Band
 *
 * The poster's tilted highlight band as a soft wash of light behind the
 * Stage: Ink-3 in silence, the sounding pitch's own Music Color once it plays,
 * its height breathing in silence and following the shared envelope in sound.
 * Adopted from the reimagining pass's Stage lab (#131). Burooj: "Drop
 * spotlight. Band is just better" and "I'm against complement".
 */

import type { AmbientConfig } from "@/types/visual";
import type { ActiveNote, ChromaticNote, MusicalMode } from "@/types/music";
import { CHROMATIC_NOTES } from "@/data";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { useMusicColor } from "../useMusicColor";
import { useMusicColorProvider } from "../useMusicColorConfig";
import {
  musicColorValueToCss,
  resolveMusicColorSampleByPitchClass,
  resolveMusicColorSampleByScaleIndex,
  tuneMusicColorValue,
} from "@/services/musicColor";
import type { MusicColorValue } from "@/services/musicColorCore";
import {
  resolveAtmosphereBand,
  type StageAudioFrame,
  type StageComposition,
} from "./stageRuntime";

const LEAN = -0.105; // ≈ -6°, the poster's highlight-band lean
const SOFT_SCALE = 1 / 12;
const SOFT_BLUR = 2.2; // px at the reduced scale; ≈ 26px on the Stage
// The lab's accepted band colour, calibrated against the canonical knobs so
// the default Atmosphere paints exactly what was accepted.
const BAND_LIGHTNESS = 0.55;
const BAND_CHROMA = 0.78;
// Strength above the canonical default widens the band, up to twice its
// accepted height at full Strength; below it, the pitch colour fades.
const BAND_WIDEST = 2;
// Once the envelope has decayed this far the release tail is over (its colour
// would be ~1% visible), so the band forgets the pitch it was holding.
const LEAD_RELEASED_ENVELOPE = 0.001;

type LeadNote = Pick<
  ActiveNote,
  "pitchClassIndex" | "solfegeIndex" | "octave" | "mode" | "key"
>;

interface AtmosphereTokens {
  ink: string;
  ink3: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizePitchClass(value: number) {
  return ((value % CHROMATIC_NOTES.length) + CHROMATIC_NOTES.length)
    % CHROMATIC_NOTES.length;
}

function readTokens(ctx: CanvasRenderingContext2D): AtmosphereTokens {
  const style = typeof HTMLCanvasElement !== "undefined"
    && ctx.canvas instanceof HTMLCanvasElement
    ? getComputedStyle(ctx.canvas)
    : null;
  return {
    ink: style?.getPropertyValue("--ink").trim() || "#0a0908",
    ink3: style?.getPropertyValue("--ink-3").trim() || "#1c1916",
  };
}

/** Knob ratio against the canonical default, so the default reads as 1. */
function knobRatio(value: number, canonical: number) {
  return canonical > 0 ? Math.max(0, value) / canonical : 1;
}

export function useAmbientRenderer() {
  const { config: dynamicColorConfig } = useMusicColorProvider();
  const { sampleHuePhase } = useMusicColor({ animated: true });
  const tokensByCanvas = new WeakMap<object, AtmosphereTokens>();
  let softCanvas: HTMLCanvasElement | null = null;
  let softCtx: CanvasRenderingContext2D | null = null;
  // The band keeps the last sounding pitch's colour through its release tail,
  // and only that long: unpitched sound never invents or revives a hue.
  let lead: LeadNote | null = null;

  const resolveLeadColor = (
    lead: LeadNote,
    musicStore: any,
  ): MusicColorValue | null => {
    const mode = (lead.mode ?? musicStore?.currentMode ?? "major") as MusicalMode;
    const key = (lead.key ?? musicStore?.currentKey ?? "C") as ChromaticNote;
    const octave = lead.octave ?? 4;
    const phase = sampleHuePhase();
    if (typeof lead.pitchClassIndex === "number") {
      return resolveMusicColorSampleByPitchClass(
        CHROMATIC_NOTES[normalizePitchClass(lead.pitchClassIndex)],
        mode,
        key,
        octave,
        dynamicColorConfig.value,
        "fixed-chromatic",
        phase,
      )?.sample.primary ?? null;
    }
    return resolveMusicColorSampleByScaleIndex(
      lead.solfegeIndex ?? 0,
      mode,
      key,
      octave,
      dynamicColorConfig.value,
      phase,
    )?.sample.primary ?? null;
  };

  /**
   * Paint shapes small, soften them, and scale them up: diffusion without a
   * per-frame full-size blur. Falls back to a crisp band without a 2D canvas.
   */
  const paintSoftly = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    draw: (target: CanvasRenderingContext2D) => void,
  ) => {
    if (!softCanvas && typeof document !== "undefined") {
      softCanvas = document.createElement("canvas");
      softCtx = softCanvas.getContext("2d");
    }
    if (!softCanvas || !softCtx) {
      draw(ctx);
      return;
    }
    const w = Math.max(2, Math.ceil(width * SOFT_SCALE));
    const h = Math.max(2, Math.ceil(height * SOFT_SCALE));
    if (softCanvas.width !== w || softCanvas.height !== h) {
      softCanvas.width = w;
      softCanvas.height = h;
    }
    softCtx.setTransform(1, 0, 0, 1, 0, 0);
    softCtx.clearRect(0, 0, w, h);
    softCtx.filter = `blur(${SOFT_BLUR}px)`;
    softCtx.setTransform(SOFT_SCALE, 0, 0, SOFT_SCALE, 0, 0);
    draw(softCtx);
    softCtx.filter = "none";
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(softCanvas, 0, 0, width, height);
    ctx.restore();
  };

  /**
   * Render the Atmosphere.
   *
   * The config keeps its legacy "major/minor" field names so persisted
   * configs stay compatible. The band reads the "major" trio against the
   * canonical defaults: Strength fades the pitch colour below the default and
   * widens the band above it; Brightness and Saturation scale the colour. The
   * "minor" trio no longer paints.
   */
  const renderAmbientBackground = (
    ctx: CanvasRenderingContext2D,
    elapsed: number,
    ambientConfig: AmbientConfig,
    canvasWidth: number,
    canvasHeight: number,
    musicStore: any,
    composition: StageComposition,
    audioFrame: StageAudioFrame = { envelope: 0, hasSignal: false },
    reducedMotion = false,
    activeNotes?: readonly ActiveNote[],
  ) => {
    // Pitch lifetime follows sampled audio even while the band cannot paint.
    const notes = activeNotes ?? (
      typeof musicStore?.getActiveNotes === "function"
        ? musicStore.getActiveNotes()
        : []
    );
    if (notes[0]) lead = notes[0];
    else if (audioFrame.envelope < LEAD_RELEASED_ENVELOPE) lead = null;

    if (!ctx || !ambientConfig.isEnabled) return;

    const tokens = tokensByCanvas.get(ctx) ?? readTokens(ctx);
    tokensByCanvas.set(ctx, tokens);

    ctx.fillStyle = tokens.ink;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    if (composition.suspended) return;

    const { usable, centerX: cx, centerY: cy } = composition;
    const defaults = DEFAULT_CONFIG.ambient;
    const band = resolveAtmosphereBand(audioFrame, elapsed, reducedMotion);
    const widen = 1 + (BAND_WIDEST - 1) * clamp(
      (ambientConfig.opacityMajor - defaults.opacityMajor) / (1 - defaults.opacityMajor),
      0,
      1,
    );
    const half = Math.min(usable.width, usable.height) * band.halfHeight * widen;
    const reach = usable.width * 0.62 + 60;
    const lean = LEAN * reach;

    // Sound without a pitch grows the band but leaves it Ink-3.
    const color = lead && band.sounding > 0 ? resolveLeadColor(lead, musicStore) : null;
    const colorAlpha = band.sounding
      * clamp(knobRatio(ambientConfig.opacityMajor, defaults.opacityMajor), 0, 1);

    paintSoftly(ctx, canvasWidth, canvasHeight, (target) => {
      target.beginPath();
      target.moveTo(cx - reach, cy - half - lean);
      target.lineTo(cx + reach, cy - half + lean);
      target.lineTo(cx + reach, cy + half + lean);
      target.lineTo(cx - reach, cy + half - lean);
      target.closePath();
      target.fillStyle = tokens.ink3;
      target.fill();
      if (!color || colorAlpha <= 0) return;
      target.fillStyle = musicColorValueToCss(tuneMusicColorValue(color, {
        lightnessMultiplier: BAND_LIGHTNESS
          * knobRatio(ambientConfig.brightnessMajor, defaults.brightnessMajor),
        chromaMultiplier: BAND_CHROMA
          * knobRatio(ambientConfig.saturationMajor, defaults.saturationMajor),
        alpha: colorAlpha,
      }));
      target.fill();
    });
  };

  return {
    renderAmbientBackground,
  };
}
