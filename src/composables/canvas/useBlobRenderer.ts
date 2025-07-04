/**
 * Blob Rendering System
 * Handles blob creation, rendering, and management with fluid animations
 */

import type { ActiveBlob } from "@/types/canvas";
import type { SolfegeData } from "@/types/music";
import type { BlobConfig } from "@/types/visual";
import { useColorSystem } from "../useColorSystem";
import { createVisualFrequency } from "@/utils/visualEffects";

export function useBlobRenderer() {
  const { getPrimaryColor, getAccentColor, withAlpha } = useColorSystem();

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
   * Create a persistent blob
   */
  const createBlob = (
    note: SolfegeData,
    frequency: number,
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
    blobConfig: BlobConfig,
    noteId?: string
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

    // Adjust y coordinate to favor top half of screen
    // Map y from 0-100 to 0-70 to keep blobs in top 70% of screen
    const adjustedY = (y / 100) * 70;

    // Convert percentage to pixel coordinates
    const pixelX = (x / 100) * canvasWidth;
    // Apply additional upward bias by reducing the y coordinate by 20%
    const pixelY = (adjustedY / 100) * canvasHeight * 0.8;

    // Calculate blob size based on screen size with min/max constraints
    const screenBasedSize =
      Math.min(canvasWidth, canvasHeight) * blobConfig.baseSizeRatio;
    const clampedSize = Math.max(
      blobConfig.minSize,
      Math.min(blobConfig.maxSize, screenBasedSize)
    );

    // Create blob data with new properties
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
      // Adjust drift to favor upward movement
      driftVx: (Math.random() - 0.5) * blobConfig.driftSpeed,
      driftVy: (Math.random() - 0.8) * blobConfig.driftSpeed, // Bias upward drift
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
      const accentWithOpacity = withAlpha(accentColor, currentOpacity);

      gradient.addColorStop(0, primaryWithOpacity);
      gradient.addColorStop(0.9, accentWithOpacity);
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
