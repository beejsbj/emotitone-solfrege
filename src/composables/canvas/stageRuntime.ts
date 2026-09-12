import { UNIFIED_CONFIG } from "@/data/visual-config-metadata";

export interface StageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StageComposition {
  usable: StageRect;
  centerX: number;
  centerY: number;
  hilbertRadius: number;
  orbitRadiusX: number;
  orbitRadiusY: number;
  blobFitScale: number;
  /** Canonical 10%-ratio radius before responsive fitting. */
  blobBaseRadius?: number;
  suspended: boolean;
}

export interface StageAudioFrame {
  envelope: number;
  hasSignal: boolean;
}

const EDGE_PADDING = 20;
const MIN_DRAWABLE_EDGE = 96;
const HILBERT_PRIMARY_SCALE = 1.8;
const FOCAL_GAP = 8;
const AMBIENT_RELEASE_BLEND_ENVELOPE = 0.08;

export function fullStageRect(width: number, height: number): StageRect {
  return { x: 0, y: 0, width: Math.max(0, width), height: Math.max(0, height) };
}

export function resolveStageComposition(
  usable: StageRect,
  desiredBlobRadius: number,
  hilbertSizeRatio: number,
  bodySizeScale = 1,
): StageComposition {
  const width = Math.max(0, usable.width);
  const height = Math.max(0, usable.height);
  const centerX = usable.x + width / 2;
  const centerY = usable.y + height / 2;
  const suspended = width < MIN_DRAWABLE_EDGE || height < MIN_DRAWABLE_EDGE;
  const paddedWidth = Math.max(0, width - EDGE_PADDING * 2);
  const paddedHeight = Math.max(0, height - EDGE_PADDING * 2);
  const desiredBodyExtent = Math.max(1, desiredBlobRadius * 1.3);
  const fitRadius = Math.max(8, Math.min(paddedWidth, paddedHeight) * 0.115);
  const initialFittedExtent = Math.min(desiredBodyExtent, fitRadius);
  const initialOrbitRadiusX = Math.max(
    0,
    paddedWidth / 2 - initialFittedExtent,
  );
  const initialOrbitRadiusY = Math.max(
    0,
    paddedHeight / 2 - initialFittedExtent,
  );
  const innerClearance = Math.max(
    18,
    Math.min(initialOrbitRadiusX, initialOrbitRadiusY) * 0.28,
  );
  const previousHilbertLimit = Math.max(
    8,
    Math.min(initialOrbitRadiusX, initialOrbitRadiusY) -
      initialFittedExtent -
      innerClearance,
  );
  const previousDefaultHilbertRadius = Math.min(
    (Math.min(width, height) * UNIFIED_CONFIG.hilbertScope.sizeRatio.value) / 2,
    previousHilbertLimit,
  );
  // Apply live Size changes after the accepted 60%-default baseline is fitted;
  // capping the configured value first makes most of the Knob range inert.
  const configuredScale =
    Math.max(0, hilbertSizeRatio) / UNIFIED_CONFIG.hilbertScope.sizeRatio.value;
  const desiredHilbertRadius =
    previousDefaultHilbertRadius * HILBERT_PRIMARY_SCALE * configuredScale;
  const baselineFittedExtent = Math.min(
    initialFittedExtent,
    Math.max(
      8,
      Math.min(initialOrbitRadiusX, initialOrbitRadiusY) -
        desiredHilbertRadius -
        FOCAL_GAP,
    ),
  );
  // Body Size is a relative presentation scale around the accepted 10%
  // baseline. Applying it after the baseline fit prevents the responsive fit
  // from algebraically cancelling every knob value on short Stage regions.
  const fittedExtent = baselineFittedExtent * Math.max(0, bodySizeScale);
  // Body Size does not change the accepted orbit. Only consume the reserved
  // edge padding when necessary, moving centres inward as a last-resort bound.
  const edgeOverflow = Math.max(
    0,
    fittedExtent - initialFittedExtent - EDGE_PADDING,
  );
  const orbitRadiusX = Math.max(0, initialOrbitRadiusX - edgeOverflow);
  const orbitRadiusY = Math.max(0, initialOrbitRadiusY - edgeOverflow);
  const blobFitScale = fittedExtent / desiredBodyExtent;
  const hilbertRadius = Math.min(
    desiredHilbertRadius,
    Math.max(
      8,
      Math.min(orbitRadiusX, orbitRadiusY) - fittedExtent - FOCAL_GAP,
    ),
  );

  return {
    usable: { ...usable, width, height },
    centerX,
    centerY,
    hilbertRadius,
    orbitRadiusX,
    orbitRadiusY,
    blobFitScale,
    blobBaseRadius: desiredBlobRadius,
    suspended,
  };
}

export function projectCircleOfFifths(
  composition: StageComposition,
  pitchClassIndex: number,
  keyPitchClassIndex: number,
) {
  // Moving clockwise around the circle adds seven chromatic semitones.
  const fifthPosition = modulo(pitchClassIndex * 7, 12);
  const keyPosition = modulo(keyPitchClassIndex * 7, 12);
  const relativePosition = modulo(fifthPosition - keyPosition, 12);
  const angle = relativePosition * (Math.PI * 2 / 12) - Math.PI / 2;

  return {
    x: composition.centerX + Math.cos(angle) * composition.orbitRadiusX,
    y: composition.centerY + Math.sin(angle) * composition.orbitRadiusY,
  };
}

export function resolveAmbientLevel(
  audio: StageAudioFrame,
  elapsedSeconds: number,
  reducedMotion: boolean,
) {
  if (reducedMotion) return 0.72;
  const breath = (Math.sin(elapsedSeconds * Math.PI * 2 / 10 - Math.PI / 2) + 1) / 2;
  const breathLevel = 0.68 + breath * 0.08;
  const audioLevel = 0.72 + audio.envelope * 0.28;
  if (audio.envelope >= AMBIENT_RELEASE_BLEND_ENVELOPE) {
    return audioLevel;
  }
  const releaseBlend = audio.envelope / AMBIENT_RELEASE_BLEND_ENVELOPE;
  return breathLevel + (audioLevel - breathLevel) * releaseBlend;
}

function modulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}
