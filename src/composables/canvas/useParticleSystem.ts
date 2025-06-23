/**
 * Particle System
 * Handles particle creation, pooling, and rendering with optimizations
 */

import type { Particle } from "@/types/canvas";
import type { SolfegeData } from "@/types/music";
import type { ParticleConfig } from "@/types/visual";
import { useColorSystem } from "../useColorSystem";

export function useParticleSystem() {
  const { getFleckColor } = useColorSystem();

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
      shape: "circle",
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
    musicStore: any,
    count?: number
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
      particle.color = getFleckColor(note.name, musicStore.currentMode);
      particle.shape = note.fleckShape || "circle";
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

      // Draw based on shape
      switch (particle.shape) {
        case "circle":
          drawCircle(ctx, particle.size);
          break;
        case "star":
          drawStar(ctx, particle.size);
          break;
        case "diamond":
          drawDiamond(ctx, particle.size);
          break;
        case "sparkle":
          drawSparkle(ctx, particle.size);
          break;
        case "mist":
          drawMist(ctx, particle.size);
          break;
        default:
          drawCircle(ctx, particle.size);
      }

      ctx.restore();
    }
  };

  // Helper functions for drawing shapes
  const drawCircle = (ctx: CanvasRenderingContext2D, size: number) => {
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawStar = (ctx: CanvasRenderingContext2D, size: number) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5;
      const outerRadius = size;
      const innerRadius = size * 0.4;

      if (i === 0) {
        ctx.moveTo(
          outerRadius * Math.cos(angle),
          outerRadius * Math.sin(angle)
        );
      } else {
        ctx.lineTo(
          outerRadius * Math.cos(angle),
          outerRadius * Math.sin(angle)
        );
      }

      const innerAngle = angle + Math.PI / 5;
      ctx.lineTo(
        innerRadius * Math.cos(innerAngle),
        innerRadius * Math.sin(innerAngle)
      );
    }
    ctx.closePath();
    ctx.fill();
  };

  const drawDiamond = (ctx: CanvasRenderingContext2D, size: number) => {
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size, 0);
    ctx.closePath();
    ctx.fill();
  };

  const drawSparkle = (ctx: CanvasRenderingContext2D, size: number) => {
    // Draw a sparkle as a combination of lines
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    ctx.moveTo(0, -size);
    ctx.lineTo(0, size);
    ctx.moveTo(-size * 0.7, -size * 0.7);
    ctx.lineTo(size * 0.7, size * 0.7);
    ctx.moveTo(size * 0.7, -size * 0.7);
    ctx.lineTo(-size * 0.7, size * 0.7);
    ctx.stroke();
  };

  const drawMist = (ctx: CanvasRenderingContext2D, size: number) => {
    // Draw mist as multiple small circles
    const mistParticles = 3;
    for (let i = 0; i < mistParticles; i++) {
      const angle = (i / mistParticles) * Math.PI * 2;
      const radius = size * 0.5;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      ctx.beginPath();
      ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
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
