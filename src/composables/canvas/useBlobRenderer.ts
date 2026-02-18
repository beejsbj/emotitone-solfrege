/**
 * Blob Rendering System
 * Handles blob creation, rendering, and management with fluid animations
 * Now uses Circle of Fifths positioning for harmonic visualization
 */

import type { ActiveBlob } from "@/types/canvas";
import type { SolfegeData } from "@/types/music";
import type { BlobConfig } from "@/types/visual";
import { useColorSystem } from "../useColorSystem";
import { createVisualFrequency } from "@/utils/visualEffects";
import { CHROMATIC_NOTES } from "@/data/notes";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";

export function useBlobRenderer() {
  const { getPrimaryColor, getAccentColor, withAlpha } = useColorSystem();
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

  /**
   * Get chromatic note name from solfege data
   */
  const getChromaticNoteFromSolfege = (
    solfegeData: SolfegeData,
    currentKey: string,
    currentMode: string
  ): string => {
    // Map solfege numbers to scale intervals
    const majorIntervals = [0, 2, 4, 5, 7, 9, 11]; // Do, Re, Mi, Fa, Sol, La, Ti
    const minorIntervals = [0, 2, 3, 5, 7, 8, 10]; // Do, Re, Me, Fa, Sol, Le, Te

    const intervals = currentMode === "major" ? majorIntervals : minorIntervals;
    const solfegeIndex = (solfegeData.number - 1) % 7; // Convert 1-8 to 0-6
    const interval = intervals[solfegeIndex];

    // Get the key's chromatic position
    const keyIndex = CHROMATIC_NOTES.indexOf(currentKey as any);

    // Calculate the note's chromatic position
    const noteIndex = (keyIndex + interval) % 12;

    return CHROMATIC_NOTES[noteIndex];
  };

  // Blob state - now supports both note names and noteIds for polyphonic tracking
  const activeBlobs = new Map<string, ActiveBlob>();

  // Maximum blob lifetime in milliseconds (10 seconds as safety)
  const MAX_BLOB_LIFETIME = 10000;

  /**
   * Safety cleanup for old blobs
   */
  const cleanupStaleBlobs = (blobConfig?: BlobConfig) => {
    const now = Date.now();
    const fadeOutDuration = blobConfig?.fadeOutDuration || 1;

    activeBlobs.forEach((blob, key) => {
      // Remove blobs that have existed longer than MAX_BLOB_LIFETIME
      if (now - blob.startTime > MAX_BLOB_LIFETIME) {
        activeBlobs.delete(key);
      }
      // Remove fully faded blobs that somehow weren't cleaned
      if (
        blob.isFadingOut &&
        blob.fadeOutStartTime &&
        now - blob.fadeOutStartTime > fadeOutDuration * 1000 + 100
      ) {
        activeBlobs.delete(key);
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
    octave?: number // Add octave parameter for vertical offset
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
    const chromaticNote = getChromaticNoteFromSolfege(
      note,
      currentKey || "C",
      currentMode || "major"
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
    const solfegeIndex = (note.number - 1) % 7; // Convert 1-8 to 0-6

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
    };

    // Store the active blob using the appropriate key
    activeBlobs.set(blobKey, blob);
  };

  /**
   * Remove blob for a specific note or noteId
   */
  const removeBlob = (key: string) => {
    activeBlobs.delete(key);
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
   * Render blobs with fluid vibrating edges, fade-out, and drifting movement
   */
  const renderBlobs = (
    ctx: CanvasRenderingContext2D,
    _elapsed: number,
    blobConfig: BlobConfig,
    musicStore: any
  ) => {
    if (!ctx) return;

    // Run safety cleanup before rendering
    cleanupStaleBlobs(blobConfig);

    const blobsToRemove: string[] = [];

    activeBlobs.forEach((blob, noteName) => {
      const blobElapsed = (Date.now() - blob.startTime) / 1000; // Time since blob creation in seconds

      // Update blob position with drifting movement (frame rate independent)
      blob.x += blob.driftVx * (1 / 60); // Assuming 60fps for smooth movement
      blob.y += blob.driftVy * (1 / 60);

      // Keep blobs within canvas bounds with gentle bouncing
      if (
        blob.x < blob.baseRadius ||
        blob.x > ctx.canvas.width - blob.baseRadius
      ) {
        blob.driftVx *= -0.8; // Gentle bounce with some energy loss
        blob.x = Math.max(
          blob.baseRadius,
          Math.min(ctx.canvas.width - blob.baseRadius, blob.x)
        );
      }
      if (
        blob.y < blob.baseRadius ||
        blob.y > ctx.canvas.height - blob.baseRadius
      ) {
        blob.driftVy *= -0.8; // Gentle bounce with some energy loss
        blob.y = Math.max(
          blob.baseRadius,
          Math.min(ctx.canvas.height - blob.baseRadius, blob.y)
        );
      }

      // Handle scale-in animation with bounce
      const scaleInElapsed = blobElapsed;
      let currentScale = blob.scale;
      let bounceScale = 1; // Default scale multiplier

      if (scaleInElapsed < blobConfig.scaleInDuration) {
        // Scale-in animation using easeOutBack for bounce effect
        const progress = Math.min(
          scaleInElapsed / blobConfig.scaleInDuration,
          1
        );
        const c1 = 1.70158; // Controls bounce size
        const c3 = c1 + 1;

        currentScale =
          1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
        blob.scale = currentScale;
      } else if (!blob.isFadingOut) {
        // Add subtle continuous scale oscillation after initial bounce
        const oscillation = Math.sin(blobElapsed * 3) * 0.02; // Subtle size oscillation
        bounceScale = 1 + oscillation;
        currentScale = bounceScale;
      }

      // Handle fade-out animation
      let currentOpacity = blob.opacity;
      let vibrationIntensity = 1.0;
      let glowIntensity = blobConfig.glowIntensity || 0;

      if (blob.isFadingOut && blob.fadeOutStartTime) {
        const fadeElapsed = (Date.now() - blob.fadeOutStartTime) / 1000;
        const fadeProgress = Math.min(
          fadeElapsed / blobConfig.fadeOutDuration,
          1
        );

        // Scale-out animation during fade-out
        const scaleOutProgress = Math.min(
          fadeElapsed / blobConfig.scaleOutDuration,
          1
        );
        const scaleOutEase = 1 - Math.pow(scaleOutProgress, 2); // Ease-in quad for smooth shrink
        currentScale = scaleOutEase;

        // Smooth fade-out curve
        const fadeMultiplier = Math.cos(fadeProgress * Math.PI * 0.5);
        currentOpacity = blob.opacity * fadeMultiplier;
        vibrationIntensity = fadeMultiplier; // Reduce vibration during fade-out

        // Mark for removal when fade-out is complete
        if (fadeProgress >= 1) {
          blobsToRemove.push(noteName);
          return;
        }
      }

      // Create more fluid vibration parameters with scale
      const visualFreq = createVisualFrequency(
        blob.frequency,
        blobConfig.vibrationFrequencyDivisor
      );
      const scaledRadius = blob.baseRadius * currentScale * bounceScale; // Apply bounce scale
      const vibrationAmplitude =
        blobConfig.vibrationAmplitude *
        scaledRadius *
        0.01 *
        vibrationIntensity;

      // Validate values before creating gradient
      if (
        !isFinite(blob.x) ||
        !isFinite(blob.y) ||
        !isFinite(scaledRadius) ||
        currentOpacity <= 0 ||
        currentScale < 0
      ) {
        return;
      }

      // Skip rendering if scale is effectively 0
      if (currentScale < 0.01) {
        return;
      }

      // Create gradient at current position
      const gradient = ctx.createRadialGradient(
        blob.x,
        blob.y,
        0,
        blob.x,
        blob.y,
        scaledRadius + vibrationAmplitude
      );

      // Use current opacity for colors
      const primaryColor = getPrimaryColor(
        blob.note.name,
        musicStore.currentMode
      );
      const accentColor = getAccentColor(
        blob.note.name,
        musicStore.currentMode
      );

      // Apply opacity to colors using withAlpha from color system
      const primaryWithOpacity = withAlpha(primaryColor, currentOpacity);
      const primary2WithOpacity = withAlpha(primaryColor, currentOpacity - 1);
      const accentWithOpacity = withAlpha(accentColor, currentOpacity);

      gradient.addColorStop(0, primaryWithOpacity);
      gradient.addColorStop(0.9, primary2WithOpacity);
      gradient.addColorStop(1, "transparent");

      // Apply blur effect if configured
      if (blobConfig.blurRadius > 0) {
        ctx.filter = `blur(${blobConfig.blurRadius}px)`;
      }

      // Apply glow effect with bounce
      if (blobConfig.glowEnabled && blobConfig.glowIntensity > 0) {
        // Increase glow during initial bounce
        const bounceGlow =
          scaleInElapsed < blobConfig.scaleInDuration
            ? glowIntensity * (1 + (1 - currentScale) * 0.5) // Stronger glow during expansion
            : glowIntensity * bounceScale; // Subtle glow oscillation after

        ctx.shadowColor = primaryWithOpacity;
        ctx.shadowBlur = bounceGlow;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // Draw the blob with fluid vibrating edges
      ctx.fillStyle = gradient;
      ctx.beginPath();

      // Create more organic vibrating circular path
      const segments = blobConfig.edgeSegments;

      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;

        // Create more dramatic vibration with irregular patterns
        const primaryVibration =
          Math.sin(
            blobElapsed * visualFreq * 2 * Math.PI +
              angle * 4 +
              blob.vibrationPhase
          ) *
          vibrationAmplitude *
          0.7;
        const secondaryVibration =
          Math.sin(
            blobElapsed * visualFreq * 3.7 * Math.PI +
              angle * 7 +
              blob.vibrationPhase * 1.6
          ) *
          vibrationAmplitude *
          0.4;
        const tertiaryVibration =
          Math.sin(
            blobElapsed * visualFreq * 1.3 * Math.PI +
              angle * 2.3 +
              blob.vibrationPhase * 0.8
          ) *
          vibrationAmplitude *
          0.2;

        // Add irregular, chaotic vibration for more organic feel
        const chaoticVibration =
          Math.sin(
            blobElapsed * visualFreq * 5.1 * Math.PI +
              angle * 11 +
              blob.vibrationPhase * 2.1
          ) *
          vibrationAmplitude *
          0.15;

        // Combine vibrations for dramatic, non-circular movement
        const totalVibration =
          primaryVibration +
          secondaryVibration +
          tertiaryVibration +
          chaoticVibration;

        // Apply more varied damping for irregular shape
        const dampingFactor =
          0.6 +
          0.4 *
            Math.sin(angle * 3.7 + blob.vibrationPhase) *
            Math.cos(angle * 1.9 + blob.vibrationPhase * 0.5);
        const dampedVibration = totalVibration * dampingFactor;

        // Calculate the vibrating radius for this point
        const vibratingRadius = scaledRadius + dampedVibration;

        // Calculate x, y coordinates
        const x = blob.x + Math.cos(angle) * vibratingRadius;
        const y = blob.y + Math.sin(angle) * vibratingRadius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.closePath();
      ctx.fill();

      // Reset effects after drawing
      if (blobConfig.blurRadius > 0) {
        ctx.filter = "none";
      }
      if (blobConfig.glowEnabled && blobConfig.glowIntensity > 0) {
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }
    });

    // Remove faded-out blobs
    blobsToRemove.forEach((noteName) => {
      activeBlobs.delete(noteName);
    });

    // Log warning if we have too many active blobs
    if (activeBlobs.size > 20) {
      console.warn(
        `High blob count detected: ${activeBlobs.size} active blobs`
      );
    }
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
  };

  return {
    // State
    activeBlobs,

    // Methods
    createBlob,
    removeBlob,
    startBlobFadeOut,
    startBlobFadeOutById,
    renderBlobs,
    getActiveBlobCount,
    clearAllBlobs,
    // Expose cleanup for external use if needed
    cleanupStaleBlobs,
  };
}
