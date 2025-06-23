import { ref, type Ref } from "vue";
import { useMusicStore } from "@/stores/music";
import { useVisualConfig } from "./useVisualConfig";
import { useDynamicColors } from "./useDynamicColors";
import { useAnimationLifecycle } from "./useAnimationLifecycle";
import type { SolfegeData } from "@/services/music";
import type { VibratingStringConfig } from "@/types/visual";
import type { ActiveBlob, Particle } from "@/types/canvas";
import {
  createVisualFrequency,
  createHarmonicVibration,
  createStringDamping,
} from "@/utils/visualEffects";
import {
  resolveCSSVariable,
  toRgbaWithAlpha,
  extractColorFromGradient,
} from "@/utils/cssVariableResolver";
import { performanceMonitor } from "@/utils/performanceMonitor";
import { gsap } from "gsap";

/**
 * Unified Canvas Management System
 * Manages a single canvas for all visual effects: blobs, particles, strings, and ambient
 */

export function useUnifiedCanvas(canvasRef: Ref<HTMLCanvasElement | null>) {
  const musicStore = useMusicStore();
  const {
    blobConfig,
    ambientConfig,
    particleConfig,
    stringConfig,
    animationConfig,
    dynamicColorConfig,
  } = useVisualConfig();
  const { generateSolfegeColors, isDynamicColorsEnabled } = useDynamicColors();

  // Canvas state
  const canvasWidth = ref(window.innerWidth);
  const canvasHeight = ref(window.innerHeight);
  let ctx: CanvasRenderingContext2D | null = null;

  // Visual effects state
  const activeBlobs = new Map<string, ActiveBlob>();
  const particles: Particle[] = [];
  const strings = ref<VibratingStringConfig[]>([]);

  // Performance optimization: Cache frequently used values
  let cachedConfigs = {
    blob: { ...blobConfig.value },
    ambient: { ...ambientConfig.value },
    particle: { ...particleConfig.value },
    string: { ...stringConfig.value },
    animation: { ...animationConfig.value },
  };

  // Performance optimization: Cache gradients and colors
  const gradientCache = new Map<string, CanvasGradient>();
  const colorCache = new Map<string, string>();

  // Performance optimization: Particle pool for reuse
  const particlePool: Particle[] = [];
  const maxPoolSize = 100;

  // Animation lifecycle using existing composable
  const { startAnimation, stopAnimation, isAnimating } = useAnimationLifecycle({
    onFrame: (timestamp, elapsed) => {
      renderFrame(elapsed);

      // Update performance metrics
      const activeObjectCount =
        activeBlobs.size + particles.length + strings.value.length;
      const metrics = performanceMonitor.update(timestamp, activeObjectCount);

      // Check for performance warnings
      performanceMonitor.checkAndWarnPerformance();
    },
    autoCleanup: true,
  });

  /**
   * Initialize the unified canvas system
   */
  const initializeCanvas = () => {
    if (!canvasRef.value) return;

    const canvas = canvasRef.value;
    ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvasWidth.value;
    canvas.height = canvasHeight.value;

    // Initialize strings
    initializeStrings();

    // Start animation if not already running
    if (!isAnimating.value) {
      startAnimation();
    }
  };

  /**
   * Initialize string configurations
   */
  const initializeStrings = () => {
    if (!stringConfig.value.isEnabled) return;

    const actualStringCount = stringConfig.value.count;

    strings.value = Array.from({ length: actualStringCount }, (_, index) => ({
      x: (canvasWidth.value / (actualStringCount + 1)) * (index + 1),
      baseY: 0,
      amplitude: 0,
      frequency: 0,
      phase: Math.random() * Math.PI * 2,
      color: "#ffffff",
      opacity: stringConfig.value.baseOpacity,
      isActive: false,
      noteIndex: index,
    }));
  };

  /**
   * Handle window resize
   */
  const handleResize = () => {
    canvasWidth.value = window.innerWidth;
    canvasHeight.value = window.innerHeight;

    if (canvasRef.value) {
      canvasRef.value.width = canvasWidth.value;
      canvasRef.value.height = canvasHeight.value;

      // Reinitialize strings with new dimensions
      initializeStrings();
    }
  };

  /**
   * Update cached configurations for performance
   */
  const updateCachedConfigs = () => {
    cachedConfigs = {
      blob: { ...blobConfig.value },
      ambient: { ...ambientConfig.value },
      particle: { ...particleConfig.value },
      string: { ...stringConfig.value },
      animation: { ...animationConfig.value },
    };
  };

  /**
   * Get or create cached gradient
   */
  const getCachedGradient = (
    key: string,
    createFn: () => CanvasGradient
  ): CanvasGradient => {
    if (!gradientCache.has(key)) {
      gradientCache.set(key, createFn());
    }
    return gradientCache.get(key)!;
  };

  /**
   * Get or create cached color
   */
  const getCachedColor = (key: string, createFn: () => string): string => {
    if (!colorCache.has(key)) {
      colorCache.set(key, createFn());
    }
    return colorCache.get(key)!;
  };

  /**
   * Get particle from pool or create new one
   */
  const getParticleFromPool = (): Particle => {
    if (particlePool.length > 0) {
      return particlePool.pop()!;
    }
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      color: "",
      shape: "",
      size: 0,
      life: 0,
      maxLife: 0,
      rotation: 0,
      rotationSpeed: 0,
    };
  };

  /**
   * Return particle to pool
   */
  const returnParticleToPool = (particle: Particle) => {
    if (particlePool.length < maxPoolSize) {
      particlePool.push(particle);
    }
  };

  /**
   * Main render frame function - coordinates all visual effects
   */
  const renderFrame = (elapsed: number) => {
    if (!ctx) return;

    const frameCount = Math.floor(elapsed * 60);

    // Update cached configs periodically (every 60 frames ≈ 1 second at 60fps)
    if (frameCount % 60 === 0) {
      updateCachedConfigs();
    }

    // Periodic cache cleanup to prevent memory growth (every 5 minutes)
    if (frameCount % (60 * 60 * 5) === 0 && frameCount > 0) {
      // Clear caches but keep recent entries
      if (gradientCache.size > 50) {
        gradientCache.clear();
      }
      if (colorCache.size > 100) {
        colorCache.clear();
      }
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);

    // Render effects in order (back to front)
    if (cachedConfigs.ambient.isEnabled) {
      renderAmbientBackground(elapsed);
    }

    if (cachedConfigs.blob.isEnabled) {
      renderBlobs(elapsed);
    }

    if (cachedConfigs.particle.isEnabled) {
      renderParticles(elapsed);
    }

    if (cachedConfigs.string.isEnabled) {
      updateStringProperties();
      renderStrings(elapsed);
    }
  };

  /**
   * Render ambient background
   */
  const renderAmbientBackground = (elapsed: number) => {
    if (!ctx) return;

    // Animate the gradient colors based on current mode
    const isMinor = musicStore.currentMode === "minor";
    const brightness = isMinor
      ? ambientConfig.value.brightnessMinor
      : ambientConfig.value.brightnessMajor;
    const saturation = isMinor
      ? ambientConfig.value.saturationMinor
      : ambientConfig.value.saturationMajor;
    const ambientOpacity = isMinor
      ? ambientConfig.value.opacityMinor
      : ambientConfig.value.opacityMajor;

    // Subtle color shift over time
    const hueShift = Math.sin(elapsed * 0.1) * 10;

    // Create animated gradient
    const gradient = ctx.createLinearGradient(
      0,
      0,
      canvasWidth.value,
      canvasHeight.value
    );
    gradient.addColorStop(
      0,
      `hsla(${240 + hueShift}, ${saturation * 100}%, ${
        brightness * 20
      }%, ${ambientOpacity})`
    );
    gradient.addColorStop(
      0.5,
      `hsla(${280 + hueShift}, ${saturation * 100}%, ${brightness * 15}%, ${
        ambientOpacity * 0.7
      })`
    );
    gradient.addColorStop(
      1,
      `hsla(${320 + hueShift}, ${saturation * 100}%, ${brightness * 10}%, ${
        ambientOpacity * 0.3
      })`
    );

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);
  };

  /**
   * Render blobs with fluid vibrating edges, fade-out, and drifting movement
   */
  const renderBlobs = (elapsed: number) => {
    if (!ctx) return;

    // Use iterator to safely remove blobs during iteration
    const blobsToRemove: string[] = [];

    activeBlobs.forEach((blob, noteName) => {
      const blobElapsed = elapsed - blob.startTime / 1000;

      // Update blob position with drifting movement
      blob.x += blob.driftVx * (1 / 60); // Assuming 60fps for smooth movement
      blob.y += blob.driftVy * (1 / 60);

      // Keep blobs within canvas bounds with gentle bouncing
      if (
        blob.x < blob.baseRadius ||
        blob.x > canvasWidth.value - blob.baseRadius
      ) {
        blob.driftVx *= -0.8; // Gentle bounce with some energy loss
        blob.x = Math.max(
          blob.baseRadius,
          Math.min(canvasWidth.value - blob.baseRadius, blob.x)
        );
      }
      if (
        blob.y < blob.baseRadius ||
        blob.y > canvasHeight.value - blob.baseRadius
      ) {
        blob.driftVy *= -0.8; // Gentle bounce with some energy loss
        blob.y = Math.max(
          blob.baseRadius,
          Math.min(canvasHeight.value - blob.baseRadius, blob.y)
        );
      }

      // Handle fade-out animation
      let currentOpacity = blob.opacity;
      let vibrationIntensity = 1.0;

      if (blob.isFadingOut && blob.fadeOutStartTime) {
        const fadeElapsed = (Date.now() - blob.fadeOutStartTime) / 1000;
        const fadeProgress = Math.min(
          fadeElapsed / cachedConfigs.blob.fadeOutDuration,
          1
        );

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

      // Create more fluid vibration parameters
      const visualFreq = createVisualFrequency(
        blob.frequency,
        cachedConfigs.blob.vibrationFrequencyDivisor
      );
      const vibrationAmplitude =
        cachedConfigs.blob.oscillationAmplitude *
        blob.baseRadius *
        0.15 *
        vibrationIntensity; // Increased for more visible vibration
      const baseRadius = blob.baseRadius;

      // Validate values before creating gradient
      if (
        !isFinite(blob.x) ||
        !isFinite(blob.y) ||
        !isFinite(baseRadius) ||
        baseRadius <= 0 ||
        currentOpacity <= 0
      ) {
        return;
      }

      // Create gradient at current position
      if (!ctx) return;

      const gradient = ctx.createRadialGradient(
        blob.x,
        blob.y,
        0,
        blob.x,
        blob.y,
        baseRadius + vibrationAmplitude
      );

      // Use current opacity for colors
      const primaryColor = toRgbaWithAlpha(
        blob.note.colorPrimary,
        0.4 * currentOpacity
      );
      const secondaryColor = toRgbaWithAlpha(
        blob.note.colorSecondary,
        0.2 * currentOpacity
      );

      gradient.addColorStop(0, primaryColor);
      gradient.addColorStop(0.7, secondaryColor);
      gradient.addColorStop(1, "transparent");

      // Draw the blob with fluid vibrating edges
      ctx.fillStyle = gradient;
      ctx.beginPath();

      // Create more organic vibrating circular path
      const segments = 48; // Fewer segments for smoother curves

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
        const vibratingRadius = baseRadius + dampedVibration;

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
    });

    // Remove completed fade-out blobs
    blobsToRemove.forEach((noteName) => {
      activeBlobs.delete(noteName);
    });
  };

  /**
   * Render particles (optimized)
   */
  const renderParticles = (_elapsed: number) => {
    if (!ctx) return;

    // Update particles using optimized loop
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < particles.length; readIndex++) {
      const particle = particles[readIndex];

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.rotationSpeed;

      // Update life (use frame-rate independent timing)
      particle.life += 16; // Assuming 60fps - could be improved with deltaTime

      // Check if particle is still alive
      if (particle.life <= particle.maxLife) {
        // Keep alive particle
        if (writeIndex !== readIndex) {
          particles[writeIndex] = particle;
        }
        writeIndex++;

        // Calculate opacity based on life
        const lifeRatio = particle.life / particle.maxLife;
        const opacity = Math.sin(lifeRatio * Math.PI) * 0.8;

        // Draw particle based on shape
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.globalAlpha = opacity;

        switch (particle.shape) {
          case "circle":
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
            ctx.fill();
            break;
          case "star":
            drawStar(ctx, 0, 0, particle.size, particle.color);
            break;
          case "diamond":
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.moveTo(0, -particle.size);
            ctx.lineTo(particle.size, 0);
            ctx.lineTo(0, particle.size);
            ctx.lineTo(-particle.size, 0);
            ctx.closePath();
            ctx.fill();
            break;
          case "sparkle":
            ctx.fillStyle = particle.color;
            ctx.fillRect(
              -particle.size / 2,
              -particle.size * 2,
              particle.size,
              particle.size * 4
            );
            ctx.fillRect(
              -particle.size * 2,
              -particle.size / 2,
              particle.size * 4,
              particle.size
            );
            break;
        }

        ctx.restore();
      } else {
        // Return dead particle to pool
        returnParticleToPool(particle);
      }
    }

    // Trim array to remove dead particles
    particles.length = writeIndex;
  };

  // Helper function to draw a star
  const drawStar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string
  ) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5;
      const outerRadius = size;
      const innerRadius = size * 0.4;

      if (i === 0) {
        ctx.moveTo(
          x + outerRadius * Math.cos(angle),
          y + outerRadius * Math.sin(angle)
        );
      } else {
        ctx.lineTo(
          x + outerRadius * Math.cos(angle),
          y + outerRadius * Math.sin(angle)
        );
      }

      const innerAngle = angle + Math.PI / 5;
      ctx.lineTo(
        x + innerRadius * Math.cos(innerAngle),
        y + innerRadius * Math.sin(innerAngle)
      );
    }
    ctx.closePath();
    ctx.fill();
  };

  /**
   * Update string properties based on current note
   */
  const updateStringProperties = () => {
    strings.value.forEach((string, index) => {
      const solfege = musicStore.solfegeData[index];
      if (!solfege) return;

      // Use dynamic colors if enabled, otherwise use static colors
      const enhancedSolfege = isDynamicColorsEnabled.value
        ? generateSolfegeColors(solfege, 3, true) // Use middle octave with animation
        : solfege;

      // Update string properties based on current note
      if (musicStore.currentNote === solfege.name) {
        string.isActive = true;
        string.amplitude = gsap.utils.interpolate(
          string.amplitude,
          stringConfig.value.maxAmplitude,
          stringConfig.value.interpolationSpeed
        );
        string.opacity = gsap.utils.interpolate(
          string.opacity,
          stringConfig.value.activeOpacity,
          stringConfig.value.opacityInterpolationSpeed
        );
        string.color = enhancedSolfege.colorGradient;

        // Get the actual musical frequency for this note and scale it for visual vibration
        const noteFrequency = musicStore.getNoteFrequency(index, 4);
        string.frequency = createVisualFrequency(
          noteFrequency,
          animationConfig.value.visualFrequencyDivisor
        );
      } else {
        string.isActive = false;
        string.amplitude = gsap.utils.interpolate(
          string.amplitude,
          0,
          stringConfig.value.dampingFactor
        );
        string.opacity = gsap.utils.interpolate(
          string.opacity,
          stringConfig.value.baseOpacity,
          0.05
        );

        // Keep a subtle base frequency when inactive
        const noteFrequency = musicStore.getNoteFrequency(index, 4);
        string.frequency = createVisualFrequency(noteFrequency, 200);
      }
    });
  };

  /**
   * Render strings
   */
  const renderStrings = (elapsed: number) => {
    if (!ctx) return;

    strings.value.forEach((string) => {
      if (!ctx) return;

      const baseColor = extractColorFromGradient(string.color);

      ctx.globalAlpha = string.opacity;
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Create vibrating line with realistic frequency-based movement
      const segments = 100;
      for (let i = 0; i <= segments; i++) {
        const y = i * (canvasHeight.value / segments);
        const normalizedY = y / canvasHeight.value;

        // Create harmonic vibration
        const totalVibration = createHarmonicVibration(
          elapsed,
          string.frequency,
          string.amplitude,
          y,
          string.phase
        );

        // Apply damping effect towards the ends (like a real string fixed at both ends)
        const damping = createStringDamping(normalizedY);
        const dampedVibration = totalVibration * damping;

        const x = string.x + dampedVibration;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Add glow effect for active strings
      if (string.isActive && string.amplitude > 5) {
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1;
    });
  };

  /**
   * Create a persistent blob
   */
  const createBlob = (
    note: SolfegeData,
    frequency: number,
    x: number,
    y: number
  ) => {
    if (!blobConfig.value.isEnabled) return;

    // Remove existing blob for this note if it exists
    if (activeBlobs.has(note.name)) {
      removeBlob(note.name);
    }

    // Convert percentage to pixel coordinates
    const pixelX = (x / 100) * canvasWidth.value;
    const pixelY = (y / 100) * canvasHeight.value;

    // Calculate blob size based on screen size with min/max constraints
    const screenBasedSize =
      Math.min(canvasWidth.value, canvasHeight.value) *
      blobConfig.value.baseSizeRatio;
    const clampedSize = Math.max(
      blobConfig.value.minSize,
      Math.min(blobConfig.value.maxSize, screenBasedSize)
    );

    // Create blob data with new properties
    const blob: ActiveBlob = {
      x: pixelX,
      y: pixelY,
      note,
      frequency,
      startTime: Date.now(),
      baseRadius: clampedSize,
      opacity: blobConfig.value.opacity,
      isFadingOut: false,
      fadeOutStartTime: undefined,
      driftVx: (Math.random() - 0.5) * blobConfig.value.driftSpeed,
      driftVy: (Math.random() - 0.5) * blobConfig.value.driftSpeed,
      vibrationPhase: Math.random() * Math.PI * 2,
    };

    // Store the active blob
    activeBlobs.set(note.name, blob);
  };

  /**
   * Remove blob for a specific note
   */
  const removeBlob = (noteName: string) => {
    activeBlobs.delete(noteName);
  };

  /**
   * Create particles (optimized with object pooling)
   */
  const createParticles = (note: SolfegeData, count?: number) => {
    if (!cachedConfigs.particle.isEnabled) return;

    const particleCount = count ?? cachedConfigs.particle.count;

    for (let i = 0; i < particleCount; i++) {
      const particle = getParticleFromPool();

      // Initialize particle properties
      particle.x = Math.random() * canvasWidth.value;
      particle.y = Math.random() * canvasHeight.value;
      particle.vx = (Math.random() - 0.5) * cachedConfigs.particle.speed;
      particle.vy = (Math.random() - 0.5) * cachedConfigs.particle.speed;
      particle.color = resolveCSSVariable(
        note.colorFlecks || note.colorPrimary
      );
      particle.shape = note.fleckShape || "circle";
      particle.size =
        cachedConfigs.particle.sizeMin +
        Math.random() *
          (cachedConfigs.particle.sizeMax - cachedConfigs.particle.sizeMin);
      particle.life = 0;
      particle.maxLife =
        cachedConfigs.particle.lifetimeMin +
        Math.random() *
          (cachedConfigs.particle.lifetimeMax -
            cachedConfigs.particle.lifetimeMin);
      particle.rotation = 0;
      particle.rotationSpeed = (Math.random() - 0.5) * 0.1;

      particles.push(particle);
    }
  };

  /**
   * Handle note played event
   */
  const handleNotePlayed = (note: SolfegeData, frequency: number) => {
    // Use dynamic colors if enabled, otherwise use static colors
    const enhancedNote = isDynamicColorsEnabled.value
      ? generateSolfegeColors(note, 3, true) // Use middle octave with animation
      : note;

    // Create persistent gradient blob at random position
    const x = 30 + Math.random() * 40;
    const y = 30 + Math.random() * 40;
    createBlob(enhancedNote, frequency, x, y);

    // Create particles
    createParticles(enhancedNote);
  };

  /**
   * Handle note released event - start fade-out instead of immediate removal
   */
  const handleNoteReleased = (noteName: string) => {
    const blob = activeBlobs.get(noteName);
    if (blob && !blob.isFadingOut) {
      blob.isFadingOut = true;
      blob.fadeOutStartTime = Date.now();
    }
  };

  /**
   * Clear caches to prevent memory leaks
   */
  const clearCaches = () => {
    gradientCache.clear();
    colorCache.clear();
    // Return all particles to pool
    particles.forEach((particle) => returnParticleToPool(particle));
    particles.length = 0;
  };

  /**
   * Get current performance metrics
   */
  const getPerformanceMetrics = () => {
    return performanceMonitor.getMetrics();
  };

  /**
   * Cleanup function (enhanced for memory management)
   */
  const cleanup = () => {
    stopAnimation();
    activeBlobs.clear();
    clearCaches();

    // Reset performance monitoring
    performanceMonitor.reset();

    // Clear any remaining references
    ctx = null;
  };

  return {
    // Canvas state
    canvasWidth,
    canvasHeight,

    // Methods
    initializeCanvas,
    handleResize,

    // Animation control
    startAnimation,
    stopAnimation,
    isAnimating,

    // Effect management
    createBlob,
    removeBlob,
    createParticles,
    handleNotePlayed,
    handleNoteReleased,

    // Performance monitoring
    getPerformanceMetrics,

    // Cleanup
    cleanup,
  };
}
