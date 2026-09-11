/**
 * Particle System
 * Handles particle creation, pooling, and rendering with optimizations
 */

import type { Particle } from "@/types/canvas";
import type { ChromaticNote, MusicalMode, SolfegeData } from "@/types/music";
import type { ParticleConfig } from "@/types/visual";
import { drawMarkOnCanvas, MARK_NAMES } from "@/components/primatives/marks";
import { useColorSystem } from "../useColorSystem";

export function useParticleSystem() {
  const { getFleckColor, getFleckColorByPitchClass } = useColorSystem({ animated: true });

  // Particle state
  const particles: Particle[] = [];
  const particlePool: Particle[] = [];
  const maxPoolSize = 100;

  /**
   * Get particle from pool or create new one
   */
  const getParticleFromPool = (): Particle => {
    if (particlePool.length > 0) {
      return particlePool.pop()!;
    }

    // Create new particle if pool is empty
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      color: "",
      mark: "disk",
      size: 1,
      life: 0,
      maxLife: 1000,
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
   * Create particles (optimized with object pooling)
   */
  const createParticles = (
    note: SolfegeData,
    particleConfig: ParticleConfig,
    canvasWidth: number,
    canvasHeight: number,
    mode: MusicalMode,
    key: ChromaticNote,
    count?: number,
    pitch?: { pitchClassIndex?: number; octave?: number },
  ) => {
    if (!particleConfig.isEnabled) return;

    const particleCount = count ?? particleConfig.count;

    for (let i = 0; i < particleCount; i++) {
      const particle = getParticleFromPool();

      // Initialize particle properties
      particle.x = Math.random() * canvasWidth;
      particle.y = Math.random() * canvasHeight;
      particle.vx = (Math.random() - 0.5) * particleConfig.speed;
      particle.vy = (Math.random() - 0.5) * particleConfig.speed;
      particle.color = typeof pitch?.pitchClassIndex === "number"
        && Number.isInteger(pitch.pitchClassIndex)
        ? getFleckColorByPitchClass(
            pitch.pitchClassIndex,
            mode,
            key,
            pitch?.octave ?? 3,
          )
        : getFleckColor(note.name, mode, pitch?.octave ?? 3, key);
      particle.mark = MARK_NAMES[Math.floor(Math.random() * MARK_NAMES.length)] ?? "disk";
      particle.size =
        particleConfig.sizeMin +
        Math.random() * (particleConfig.sizeMax - particleConfig.sizeMin);
      particle.life = 0;
      particle.maxLife =
        particleConfig.lifetimeMin +
        Math.random() *
          (particleConfig.lifetimeMax - particleConfig.lifetimeMin);
      particle.rotation = 0;
      particle.rotationSpeed = (Math.random() - 0.5) * 0.1;

      particles.push(particle);
    }
  };

  /**
   * Render particles (optimized)
   */
  const renderParticles = (
    ctx: CanvasRenderingContext2D,
    _elapsed: number,
    particleConfig: ParticleConfig
  ) => {
    if (!ctx) return;

    // Update and render particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];

      // Update particle
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life += 16; // Assume ~60fps
      particle.rotation += particle.rotationSpeed;

      // Apply gravity if enabled
      if (particleConfig.gravity > 0) {
        particle.vy += particleConfig.gravity;
      }

      // Apply air resistance
      particle.vx *= particleConfig.airResistance;
      particle.vy *= particleConfig.airResistance;

      // Calculate alpha based on life
      const lifeRatio = particle.life / particle.maxLife;
      const alpha = Math.max(0, 1 - lifeRatio);

      // Remove dead particles
      if (alpha <= 0) {
        returnParticleToPool(particle);
        particles.splice(i, 1);
        continue;
      }

      // Render particle
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;

      // Move to particle position
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);

      drawMarkOnCanvas(ctx, particle.mark, particle.size);

      ctx.restore();
    }
  };

  /**
   * Get active particle count
   */
  const getActiveParticleCount = () => particles.length;

  /**
   * Clear all particles
   */
  const clearAllParticles = () => {
    particles.forEach((particle) => returnParticleToPool(particle));
    particles.length = 0;
  };

  return {
    // State
    particles,

    // Methods
    createParticles,
    renderParticles,
    getActiveParticleCount,
    clearAllParticles,
  };
}
