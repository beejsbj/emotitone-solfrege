/**
 * Blob Rendering System
 * Handles blob creation, rendering, and management with fluid animations
 * Now uses Circle of Fifths positioning for harmonic visualization
 */

import type { ActiveBlob, PreparedBlobFrame } from "@/types/canvas";
import type { ChromaticNote, MusicalMode, SolfegeData } from "@/types/music";
import type { BlobConfig } from "@/types/visual";
import { useMusicColor } from "../useMusicColor";
import { createVisualFrequency } from "@/utils/visualEffects";
import { CHROMATIC_NOTES, getScaleForMode } from "@/data";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { Note as TonalNote } from "@tonaljs/tonal";
import {
  projectCircleOfFifths,
  type StageComposition,
  type StageRect,
} from "./stageRuntime";

export function resolveBlobPitchClass(
  solfegeData: SolfegeData,
  currentKey: string,
  currentMode: string,
  exactNoteName?: string,
): string {
  const exactPitchClass = exactNoteName
    ? TonalNote.get(exactNoteName).pc
    : "";
  if (exactPitchClass) return exactPitchClass;

  const scale = getScaleForMode(currentMode as MusicalMode);
  const solfegeIndex = (
    (solfegeData.number - 1) % scale.degreeCount + scale.degreeCount
  ) % scale.degreeCount;
  const interval = scale.intervals[solfegeIndex] ?? 0;
  const keyIndex = CHROMATIC_NOTES.indexOf(currentKey as ChromaticNote);
  return CHROMATIC_NOTES[(keyIndex + interval + 12) % 12];
}

interface BlobRenderState {
  blobElapsed: number;
  currentScale: number;
  bounceScale: number;
  currentOpacity: number;
  glowIntensity: number;
  scaledRadius: number;
  vibrationAmplitude: number;
  visualFrequency: number;
  reducedMotion: boolean;
}

export function useBlobRenderer() {
  const {
    getPrimaryColorForPitch,
    getStaticPrimaryColorForPitch,
    withAlpha,
  } = useMusicColor({ animated: true });
  const keyboardDrawerStore = useKeyboardDrawerStore();

  // Circle of Fifths progression (starting from C at position 0)
  // Going clockwise: C(0), G(1), D(2), A(3), E(4), B(5), F#(6), C#(7), Ab(8), Eb(9), Bb(10), F(11)
  const CIRCLE_OF_FIFTHS = [
    "C", // 0
    "G", // 1
    "D", // 2
    "A", // 3
    "E", // 4
    "B", // 5
    "F#", // 6
    "C#", // 7 (or Db)
    "Ab", // 8 (or G#)
    "Eb", // 9 (or D#)
    "Bb", // 10 (or A#)
    "F", // 11 (or -1 from C)
  ];

  // Map chromatic notes to their circle of fifths positions
  const NOTE_TO_CIRCLE_POSITION = new Map<string, number>();
  CIRCLE_OF_FIFTHS.forEach((note, index) => {
    NOTE_TO_CIRCLE_POSITION.set(note, index);
    // Handle enharmonic equivalents
    switch (note) {
      case "F#":
        NOTE_TO_CIRCLE_POSITION.set("Gb", index);
        break;
      case "C#":
        NOTE_TO_CIRCLE_POSITION.set("Db", index);
        break;
      case "Bb":
        NOTE_TO_CIRCLE_POSITION.set("A#", index);
        break;
      case "Eb":
        NOTE_TO_CIRCLE_POSITION.set("D#", index);
        break;
      case "Ab":
        NOTE_TO_CIRCLE_POSITION.set("G#", index);
        break;
    }
  });

  /**
   * Calculate position on circle of fifths for a given note
   * Uses the actual circle of fifths positions relative to the current key
   * Supports octave-based vertical offset
   */
  const getCircleOfFifthsPosition = (
    noteName: string,
    currentKey: string,
    currentMode: string,
    canvasWidth: number,
    canvasHeight: number,
    topMargin: number = 30,
    blobRadius: number = 50,
    solfegeIndex: number = 0, // Use solfege index for positioning
    octave: number = 4, // Current octave
    highestVisibleOctave: number = 5 // Highest visible octave (reference point)
  ): { x: number; y: number } => {
    // Get the position of the current key in the circle of fifths
    const keyPosition = NOTE_TO_CIRCLE_POSITION.get(currentKey) || 0;

    // Get the position of the note in the circle of fifths
    const notePosition = NOTE_TO_CIRCLE_POSITION.get(noteName) || 0;

    // Calculate the relative position (how many steps from the key)
    let relativePosition = notePosition - keyPosition;

    // The circle of fifths positions are absolute - mode doesn't change the direction
    // What changes is which notes are selected for the scale (handled in getChromaticNoteFromSolfege)
    // So we remove the mode-based direction reversal

    // Normalize to 0-11 range
    relativePosition = ((relativePosition % 12) + 12) % 12;

    // Convert to angle - position key at 12 o'clock (top)
    // In circle of fifths: F(-1), C(0), G(+1), D(+2), A(+3), E(+4), B(+5)
    const angle = relativePosition * ((2 * Math.PI) / 12) - Math.PI / 2; // -π/2 to start at top

    // Calculate circle radius based on available space
    const availableHeight = canvasHeight - topMargin - blobRadius;
    const maxRadius = Math.min(canvasWidth * 0.4, availableHeight * 0.4);
    const radius = maxRadius;

    // Calculate octave offset - higher octaves appear slightly higher
    // Each octave difference creates a small vertical offset
    const octaveDifference = highestVisibleOctave - octave;
    const octaveOffsetPerStep = 15; // pixels per octave step - adjust as needed
    const octaveOffset = octaveDifference * octaveOffsetPerStep;

    // Calculate center position with octave offset
    const centerX = canvasWidth / 2;
    const centerY = topMargin + blobRadius + radius + octaveOffset;

    // Calculate position on circle
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    return { x, y };
  };

  // Blob state - now supports both note names and noteIds for polyphonic tracking
  const activeBlobs = new Map<string, ActiveBlob>();
  const blobRenderStates = new Map<string, BlobRenderState>();
  const preparedBlobFrames = new Map<string, PreparedBlobFrame>();
  const orbitOffsets = new Map<string, { x: number; y: number }>();
  let compositionFitScale = 1;

  /**
   * Remove blobs only after their release animation completes. A sounding note
   * may be held indefinitely, so age alone cannot distinguish stale state from
   * a legitimate sustained blob.
   */
  const cleanupStaleBlobs = (blobConfig?: BlobConfig) => {
    const now = Date.now();
    const fadeOutDuration = blobConfig?.fadeOutDuration || 1;

    activeBlobs.forEach((blob, key) => {
      if (
        blob.isFadingOut &&
        blob.fadeOutStartTime &&
        now - blob.fadeOutStartTime > fadeOutDuration * 1000 + 100
      ) {
        activeBlobs.delete(key);
        blobRenderStates.delete(key);
        orbitOffsets.delete(key);
      }
    });
  };

  /**
   * Create a persistent blob with Circle of Fifths positioning
   */
  const createBlob = (
    note: SolfegeData,
    frequency: number,
    _x: number, // Legacy parameter - now ignored
    _y: number, // Legacy parameter - now ignored
    canvasWidth: number,
    canvasHeight: number,
    blobConfig: BlobConfig,
    noteId?: string,
    currentKey?: string,
    currentMode?: string,
    octave?: number, // Add octave parameter for vertical offset
    exactNoteName?: string,
  ) => {
    if (!blobConfig.isEnabled) return;

    // Cleanup stale blobs before creating new ones
    cleanupStaleBlobs(blobConfig);

    // Use noteId for polyphonic tracking, fallback to note name for backward compatibility
    const blobKey = noteId || note.name;

    // Remove existing blob for this key if it exists
    if (activeBlobs.has(blobKey)) {
      removeBlob(blobKey);
    }

    // Get the chromatic note name from solfege data
    const chromaticNote = resolveBlobPitchClass(
      note,
      currentKey || "C",
      currentMode || "major",
      exactNoteName,
    );

    // Calculate blob size first so we can account for it in positioning
    const screenBasedSize =
      Math.min(canvasWidth, canvasHeight) * blobConfig.baseSizeRatio;
    const clampedSize = Math.max(
      blobConfig.minSize,
      Math.min(blobConfig.maxSize, screenBasedSize)
    );

    // Calculate position using Circle of Fifths with blob size consideration
    // Use solfege index directly for more accurate positioning
    const scale = getScaleForMode((currentMode || "major") as MusicalMode);
    const solfegeIndex =
      ((note.number - 1) % scale.degreeCount + scale.degreeCount) %
      scale.degreeCount;

    // Get the highest visible octave for octave offset calculation
    const visibleOctaves = keyboardDrawerStore.visibleOctaves;
    const highestVisibleOctave = Math.max(...visibleOctaves);
    const currentOctave = octave || 4; // Default to octave 4 if not provided

    const circlePosition = getCircleOfFifthsPosition(
      chromaticNote,
      currentKey || "C",
      currentMode || "major",
      canvasWidth,
      canvasHeight,
      blobConfig.circleTopMargin || 30, // Use configured top margin
      clampedSize, // Pass blob radius to account for blob size
      solfegeIndex, // Pass solfege index for proper positioning
      currentOctave, // Pass current octave
      highestVisibleOctave // Pass highest visible octave as reference
    );

    // Add slight randomization to avoid overlapping blobs for same note
    const randomOffset = 20; // pixels
    const pixelX = circlePosition.x + (Math.random() - 0.5) * randomOffset;
    const pixelY = circlePosition.y + (Math.random() - 0.5) * randomOffset;

    // Create blob data with circle of fifths positioning
    const blob: ActiveBlob = {
      x: pixelX,
      y: pixelY,
      note,
      frequency,
      startTime: Date.now(),
      baseRadius: clampedSize,
      opacity: blobConfig.opacity,
      isFadingOut: false,
      fadeOutStartTime: undefined,
      // Reduced drift for circle positioning - keep blobs near their harmonic positions
      driftVx: (Math.random() - 0.5) * blobConfig.driftSpeed * 0.3, // 30% of normal drift
      driftVy: (Math.random() - 0.5) * blobConfig.driftSpeed * 0.3, // 30% of normal drift
      vibrationPhase: Math.random() * Math.PI * 2,
      scale: 0, // Start at zero scale for grow-in animation
      renderScale: 0,
      renderOpacity: blobConfig.opacity,
      mode: (currentMode || "major") as MusicalMode,
      key: (currentKey || "C") as ChromaticNote,
      octave: currentOctave,
      pitchClassIndex: TonalNote.chroma(chromaticNote) ?? undefined,
    };

    // Store the active blob using the appropriate key
    activeBlobs.set(blobKey, blob);
    orbitOffsets.set(blobKey, {
      x: (Math.random() - 0.5) * 12,
      y: (Math.random() - 0.5) * 12,
    });
  };

  /**
   * Remove blob for a specific note or noteId
   */
  const removeBlob = (key: string) => {
    activeBlobs.delete(key);
    blobRenderStates.delete(key);
    orbitOffsets.delete(key);
  };

  /**
   * Start fade-out for a blob by note name (legacy)
   */
  const startBlobFadeOut = (noteName: string) => {
    const blob = activeBlobs.get(noteName);
    if (blob && !blob.isFadingOut) {
      blob.isFadingOut = true;
      blob.fadeOutStartTime = Date.now();
    }
  };

  /**
   * Start fade-out for a blob by noteId (polyphonic)
   */
  const startBlobFadeOutById = (noteId: string) => {
    const blob = activeBlobs.get(noteId);
    if (blob && !blob.isFadingOut) {
      blob.isFadingOut = true;
      blob.fadeOutStartTime = Date.now();
    }
  };

  /**
   * Advance blob lifecycle state before any canvas layer paints this frame.
   */
  const prepareBlobs = (
    ctx: CanvasRenderingContext2D,
    blobConfig: BlobConfig,
    options: { reducedMotion?: boolean; bounds?: StageRect } = {},
  ) => {
    if (!ctx) return;

    cleanupStaleBlobs(blobConfig);
    blobRenderStates.clear();
    preparedBlobFrames.clear();

    const blobsToRemove: string[] = [];

    activeBlobs.forEach((blob, blobKey) => {
      const blobElapsed = (Date.now() - blob.startTime) / 1000;

      if (!options.reducedMotion) {
        blob.x += blob.driftVx * (1 / 60);
        blob.y += blob.driftVy * (1 / 60);
      }

      const bounds = options.bounds ?? {
        x: 0,
        y: 0,
        width: ctx.canvas.width,
        height: ctx.canvas.height,
      };
      const fittedRadius = blob.baseRadius * compositionFitScale;
      const left = bounds.x + fittedRadius;
      const right = bounds.x + bounds.width - fittedRadius;
      const top = bounds.y + fittedRadius;
      const bottom = bounds.y + bounds.height - fittedRadius;

      if (
        blob.x < left ||
        blob.x > right
      ) {
        blob.driftVx *= -0.8;
        blob.x = Math.max(left, Math.min(right, blob.x));
      }
      if (
        blob.y < top ||
        blob.y > bottom
      ) {
        blob.driftVy *= -0.8;
        blob.y = Math.max(top, Math.min(bottom, blob.y));
      }

      const scaleInElapsed = blobElapsed;
      let currentScale = blob.scale;
      let bounceScale = 1;

      if (options.reducedMotion) {
        currentScale = 1;
        bounceScale = 1;
      } else if (scaleInElapsed < blobConfig.scaleInDuration) {
        const progress = Math.min(
          scaleInElapsed / blobConfig.scaleInDuration,
          1
        );
        const c1 = 1.70158;
        const c3 = c1 + 1;

        currentScale =
          1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
        blob.scale = currentScale;
      } else if (!blob.isFadingOut) {
        const oscillation =
          Math.sin(blobElapsed * 3) *
          0.02 *
          blobConfig.oscillationAmplitude;
        bounceScale = 1 + oscillation;
        currentScale = 1;
      }

      let currentOpacity = blob.opacity;
      let vibrationIntensity = 1;
      const glowIntensity = blobConfig.glowIntensity || 0;

      if (blob.isFadingOut && blob.fadeOutStartTime) {
        const fadeElapsed = (Date.now() - blob.fadeOutStartTime) / 1000;
        const fadeProgress = Math.min(
          fadeElapsed / blobConfig.fadeOutDuration,
          1
        );
        const scaleOutProgress = Math.min(
          fadeElapsed / blobConfig.scaleOutDuration,
          1
        );

        if (!options.reducedMotion) {
          currentScale = 1 - Math.pow(scaleOutProgress, 2);
          const fadeMultiplier = Math.cos(fadeProgress * Math.PI * 0.5);
          currentOpacity = blob.opacity * fadeMultiplier;
          vibrationIntensity = fadeMultiplier;
        }

        if (fadeProgress >= 1) {
          blobsToRemove.push(blobKey);
          return;
        }
      }

      const visualFrequency = createVisualFrequency(
        blob.frequency,
        blobConfig.vibrationFrequencyDivisor
      );
      const scaledRadius = blob.baseRadius * compositionFitScale * currentScale * bounceScale;
      const vibrationAmplitude =
        (options.reducedMotion ? 0 : blobConfig.vibrationAmplitude) *
        scaledRadius *
        0.01 *
        vibrationIntensity;

      blob.renderScale = scaledRadius / blob.baseRadius;
      blob.renderOpacity = currentOpacity;

      if (
        !isFinite(blob.x) ||
        !isFinite(blob.y) ||
        !isFinite(scaledRadius) ||
        currentOpacity <= 0 ||
        currentScale < 0.01
      ) {
        return;
      }

      const state = {
        blobElapsed,
        currentScale,
        bounceScale,
        currentOpacity,
        glowIntensity,
        scaledRadius,
        vibrationAmplitude,
        visualFrequency,
        reducedMotion: Boolean(options.reducedMotion),
      };

      blobRenderStates.set(blobKey, state);
      preparedBlobFrames.set(
        blobKey,
        createPreparedBlobFrame(blobKey, blob, blobConfig, state)
      );
    });

    blobsToRemove.forEach((blobKey) => {
      activeBlobs.delete(blobKey);
      blobRenderStates.delete(blobKey);
      preparedBlobFrames.delete(blobKey);
      orbitOffsets.delete(blobKey);
    });
  };

  /** Reprojects existing musical bodies without replacing their lifecycle state. */
  const reprojectBlobs = (
    composition: StageComposition,
    blobConfig: BlobConfig,
    reducedMotion = false,
  ) => {
    compositionFitScale = composition.blobFitScale;
    activeBlobs.forEach((blob, key) => {
      // Keep the public Body Size control live for already-held notes instead
      // of applying it only to notes created after the edit.
      blob.baseRadius = Math.max(
        blobConfig.minSize,
        Math.min(
          blobConfig.maxSize,
          Math.min(composition.usable.width, composition.usable.height) *
            blobConfig.baseSizeRatio,
        ),
      );
      const pitchClass = blob.pitchClassIndex
        ?? TonalNote.chroma(resolveBlobPitchClass(blob.note, blob.key, blob.mode))
        ?? 0;
      const keyPitchClass = TonalNote.chroma(blob.key) ?? 0;
      const projected = projectCircleOfFifths(composition, pitchClass, keyPitchClass);
      const offset = orbitOffsets.get(key) ?? { x: 0, y: 0 };
      const targetX = projected.x + offset.x * compositionFitScale;
      const targetY = projected.y + offset.y * compositionFitScale;
      if (reducedMotion) {
        blob.x = targetX;
        blob.y = targetY;
      } else {
        blob.x += (targetX - blob.x) * 0.12;
        blob.y += (targetY - blob.y) * 0.12;
      }
    });
  };

  const createBlobContour = (
    blob: ActiveBlob,
    blobConfig: BlobConfig,
    state: BlobRenderState
  ) => {
    const points: Array<{ x: number; y: number }> = [];
    const segments = blobConfig.edgeSegments;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const primaryVibration =
        Math.sin(
          state.blobElapsed * state.visualFrequency * 2 * Math.PI +
            angle * 4 +
            blob.vibrationPhase
        ) *
        state.vibrationAmplitude *
        0.7;
      const secondaryVibration =
        Math.sin(
          state.blobElapsed * state.visualFrequency * 3.7 * Math.PI +
            angle * 7 +
            blob.vibrationPhase * 1.6
        ) *
        state.vibrationAmplitude *
        0.4;
      const tertiaryVibration =
        Math.sin(
          state.blobElapsed * state.visualFrequency * 1.3 * Math.PI +
            angle * 2.3 +
            blob.vibrationPhase * 0.8
        ) *
        state.vibrationAmplitude *
        0.2;
      const chaoticVibration =
        Math.sin(
          state.blobElapsed * state.visualFrequency * 5.1 * Math.PI +
            angle * 11 +
            blob.vibrationPhase * 2.1
        ) *
        state.vibrationAmplitude *
        0.15;
      const dampingFactor =
        0.6 +
        0.4 *
          Math.sin(angle * 3.7 + blob.vibrationPhase) *
          Math.cos(angle * 1.9 + blob.vibrationPhase * 0.5);
      const vibratingRadius =
        state.scaledRadius +
        (primaryVibration +
          secondaryVibration +
          tertiaryVibration +
          chaoticVibration) *
          dampingFactor;

      points.push({
        x: blob.x + Math.cos(angle) * vibratingRadius,
        y: blob.y + Math.sin(angle) * vibratingRadius,
      });
    }

    return points;
  };

  const createPreparedBlobFrame = (
    key: string,
    blob: ActiveBlob,
    blobConfig: BlobConfig,
    state: BlobRenderState
  ): PreparedBlobFrame => ({
    key,
    blob,
    contour: createBlobContour(blob, blobConfig, state),
    primaryColor: (state.reducedMotion
      ? getStaticPrimaryColorForPitch
      : getPrimaryColorForPitch)(
        blob.note.number - 1,
        blob.pitchClassIndex,
        blob.mode,
        blob.key,
        blob.octave
      ),
    scaledRadius: state.scaledRadius,
    opacity: state.currentOpacity,
    glowIntensity: state.glowIntensity,
    elapsed: state.blobElapsed,
  });

  const tracePreparedBlob = (
    ctx: CanvasRenderingContext2D,
    frame: PreparedBlobFrame
  ) => {
    ctx.beginPath();
    frame.contour.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.closePath();
  };

  const drawPreparedBlob = (
    ctx: CanvasRenderingContext2D,
    frame: PreparedBlobFrame,
    blobConfig: BlobConfig,
    state: BlobRenderState
  ) => {
    const { blob } = frame;
    const {
      blobElapsed,
      currentScale,
      bounceScale,
      currentOpacity,
      glowIntensity,
      scaledRadius,
      vibrationAmplitude,
    } = state;
    const gradient = ctx.createRadialGradient(
      blob.x,
      blob.y,
      0,
      blob.x,
      blob.y,
      scaledRadius + vibrationAmplitude
    );
    const primaryColor = frame.primaryColor;
    const primaryWithOpacity = withAlpha(primaryColor, currentOpacity);
    const primary2WithOpacity = withAlpha(primaryColor, currentOpacity - 1);

    gradient.addColorStop(0, primaryWithOpacity);
    gradient.addColorStop(0.9, primary2WithOpacity);
    gradient.addColorStop(1, "transparent");

    if (blobConfig.blurRadius > 0) {
      ctx.filter = `blur(${blobConfig.blurRadius}px)`;
    }

    if (blobConfig.glowEnabled && blobConfig.glowIntensity > 0) {
      const bounceGlow =
        blobElapsed < blobConfig.scaleInDuration
          ? glowIntensity * (1 + (1 - currentScale) * 0.5)
          : glowIntensity * bounceScale;

      ctx.shadowColor = primaryWithOpacity;
      ctx.shadowBlur = bounceGlow;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    ctx.fillStyle = gradient;
    tracePreparedBlob(ctx, frame);
    ctx.fill();

    if (blobConfig.blurRadius > 0) {
      ctx.filter = "none";
    }
    if (blobConfig.glowEnabled && blobConfig.glowIntensity > 0) {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }
  };

  /**
   * Paint blobs from the state prepared for this frame.
   */
  const renderBlobs = (
    ctx: CanvasRenderingContext2D,
    _elapsed: number,
    blobConfig: BlobConfig,
    _musicStore: any,
    framePrepared = false
  ) => {
    if (!ctx) return;

    if (!framePrepared) {
      prepareBlobs(ctx, blobConfig);
    }

    activeBlobs.forEach((blob, blobKey) => {
      const state = blobRenderStates.get(blobKey);
      const frame = preparedBlobFrames.get(blobKey);
      if (state && frame) {
        drawPreparedBlob(ctx, frame, blobConfig, state);
      }
    });
  };

  const getPreparedBlobFrames = () => [...preparedBlobFrames.values()];

  const createFixtureFrame = (
    key: string,
    blob: ActiveBlob,
    blobConfig: BlobConfig,
    elapsed = 1.2
  ) => {
    const currentScale = Math.max(0, blob.renderScale ?? blob.scale);
    const scaledRadius = blob.baseRadius * currentScale;
    const state: BlobRenderState = {
      blobElapsed: elapsed,
      currentScale,
      bounceScale: 1,
      currentOpacity: blob.renderOpacity ?? blob.opacity,
      glowIntensity: blobConfig.glowIntensity || 0,
      scaledRadius,
      vibrationAmplitude:
        blobConfig.vibrationAmplitude * scaledRadius * 0.01,
      visualFrequency: createVisualFrequency(
        blob.frequency,
        blobConfig.vibrationFrequencyDivisor
      ),
      reducedMotion: false,
    };

    return createPreparedBlobFrame(key, blob, blobConfig, state);
  };

  /**
   * Get active blob count
   */
  const getActiveBlobCount = () => activeBlobs.size;

  /**
   * Clear all blobs
   */
  const clearAllBlobs = () => {
    activeBlobs.clear();
    blobRenderStates.clear();
    preparedBlobFrames.clear();
    orbitOffsets.clear();
  };

  return {
    // State
    activeBlobs,

    // Methods
    createBlob,
    removeBlob,
    startBlobFadeOut,
    startBlobFadeOutById,
    prepareBlobs,
    reprojectBlobs,
    renderBlobs,
    getPreparedBlobFrames,
    createFixtureFrame,
    tracePreparedBlob,
    getActiveBlobCount,
    clearAllBlobs,
    // Expose cleanup for external use if needed
    cleanupStaleBlobs,
  };
}
