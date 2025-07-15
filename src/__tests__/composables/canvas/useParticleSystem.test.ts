import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useParticleSystem } from "@/composables/canvas/useParticleSystem";
import { mockCanvasContext } from "@/helpers/test-utils";
import type { Particle } from "@/types/canvas";

// Mock dependencies
vi.mock("@/composables/useVisualConfig", () => ({
  useVisualConfig: vi.fn(() => ({
    particleConfig: ref({
      enabled: true,
      count: 50,
      lifetime: 2000,
      speed: 100,
      sizeMin: 2,
      sizeMax: 8,
      fadeTime: 500,
      shapes: ["circle", "star", "diamond"],
    }),
  })),
}));

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: vi.fn(() => ({
    getPrimaryColor: vi.fn(() => "hsla(240, 80%, 60%, 1)"),
    getAccentColor: vi.fn(() => "hsla(60, 80%, 70%, 1)"),
    withAlpha: vi.fn((color, alpha) => color.replace(/[\d.]+\)$/, `${alpha})`)),
  })),
}));

describe("useParticleSystem", () => {
  let particleSystem: ReturnType<typeof useParticleSystem>;

  beforeEach(() => {
    vi.clearAllMocks();
    particleSystem = useParticleSystem();
  });

  afterEach(() => {
    particleSystem.clearParticles();
  });

  describe("initialization", () => {
    it("should initialize with empty particle array", () => {
      expect(particleSystem.activeParticles.value).toEqual([]);
      expect(particleSystem.getParticleCount()).toBe(0);
    });

    it("should be enabled by default", () => {
      expect(particleSystem.isEnabled()).toBe(true);
    });
  });

  describe("particle creation", () => {
    it("should create particle with correct properties", () => {
      const x = 100;
      const y = 200;
      const note = { name: "Do", emotion: "happy" };
      const frequency = 440;

      particleSystem.addParticle(x, y, note, frequency);

      expect(particleSystem.getParticleCount()).toBe(1);
      
      const particle = particleSystem.activeParticles.value[0];
      expect(particle.x).toBe(x);
      expect(particle.y).toBe(y);
      expect(particle.size).toBeGreaterThanOrEqual(2);
      expect(particle.size).toBeLessThanOrEqual(8);
      expect(particle.life).toBe(particle.maxLife);
      expect(particle.color).toBeDefined();
    });

    it("should create multiple particles", () => {
      const particleCount = 5;
      
      for (let i = 0; i < particleCount; i++) {
        particleSystem.addParticle(i * 50, i * 50, { name: "Do", emotion: "happy" }, 440);
      }

      expect(particleSystem.getParticleCount()).toBe(particleCount);
    });

    it("should create particles with different shapes", () => {
      const shapes = ["circle", "star", "diamond"];
      
      for (let i = 0; i < shapes.length; i++) {
        particleSystem.addParticle(i * 50, i * 50, { name: "Do", emotion: "happy" }, 440);
      }

      const particles = particleSystem.activeParticles.value;
      const uniqueShapes = new Set(particles.map(p => p.shape));
      expect(uniqueShapes.size).toBeGreaterThan(0);
    });

    it("should create particles with random velocities", () => {
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      particleSystem.addParticle(200, 200, { name: "Re", emotion: "sad" }, 493);

      const particles = particleSystem.activeParticles.value;
      expect(particles[0].vx).not.toBe(particles[1].vx);
      expect(particles[0].vy).not.toBe(particles[1].vy);
    });

    it("should limit particle count", () => {
      // Add more particles than the limit
      for (let i = 0; i < 100; i++) {
        particleSystem.addParticle(i, i, { name: "Do", emotion: "happy" }, 440);
      }

      expect(particleSystem.getParticleCount()).toBeLessThanOrEqual(50);
    });
  });

  describe("particle updates", () => {
    it("should update particle positions", () => {
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      
      const particle = particleSystem.activeParticles.value[0];
      const initialX = particle.x;
      const initialY = particle.y;
      
      particleSystem.updateParticles(16); // 16ms delta time
      
      expect(particle.x).not.toBe(initialX);
      expect(particle.y).not.toBe(initialY);
    });

    it("should decrease particle life", () => {
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      
      const particle = particleSystem.activeParticles.value[0];
      const initialLife = particle.life;
      
      particleSystem.updateParticles(16);
      
      expect(particle.life).toBeLessThan(initialLife);
    });

    it("should update particle rotation", () => {
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      
      const particle = particleSystem.activeParticles.value[0];
      const initialRotation = particle.rotation;
      
      particleSystem.updateParticles(16);
      
      expect(particle.rotation).not.toBe(initialRotation);
    });

    it("should remove dead particles", () => {
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      
      const particle = particleSystem.activeParticles.value[0];
      particle.life = 0; // Kill the particle
      
      particleSystem.updateParticles(16);
      
      expect(particleSystem.getParticleCount()).toBe(0);
    });

    it("should handle empty particle array", () => {
      expect(() => particleSystem.updateParticles(16)).not.toThrow();
    });

    it("should handle large delta time", () => {
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      
      expect(() => particleSystem.updateParticles(1000)).not.toThrow();
    });
  });

  describe("particle rendering", () => {
    it("should render particles on canvas", () => {
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      
      particleSystem.renderParticles(mockCanvasContext, 800, 600);
      
      expect(mockCanvasContext.save).toHaveBeenCalled();
      expect(mockCanvasContext.restore).toHaveBeenCalled();
    });

    it("should render different particle shapes", () => {
      // Add particles with different shapes
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      particleSystem.addParticle(200, 200, { name: "Re", emotion: "sad" }, 493);
      
      particleSystem.renderParticles(mockCanvasContext, 800, 600);
      
      expect(mockCanvasContext.save).toHaveBeenCalledTimes(2);
      expect(mockCanvasContext.restore).toHaveBeenCalledTimes(2);
    });

    it("should handle off-screen particles", () => {
      particleSystem.addParticle(-100, -100, { name: "Do", emotion: "happy" }, 440);
      particleSystem.addParticle(1000, 1000, { name: "Re", emotion: "sad" }, 493);
      
      expect(() => particleSystem.renderParticles(mockCanvasContext, 800, 600)).not.toThrow();
    });

    it("should apply opacity based on particle life", () => {
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      
      const particle = particleSystem.activeParticles.value[0];
      particle.life = particle.maxLife * 0.5; // Half life
      
      particleSystem.renderParticles(mockCanvasContext, 800, 600);
      
      expect(mockCanvasContext.globalAlpha).toBeLessThan(1);
    });

    it("should handle null canvas context", () => {
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      
      expect(() => particleSystem.renderParticles(null as any, 800, 600)).not.toThrow();
    });
  });

  describe("particle shapes", () => {
    it("should render circle particles", () => {
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      
      const particle = particleSystem.activeParticles.value[0];
      particle.shape = "circle";
      
      particleSystem.renderParticles(mockCanvasContext, 800, 600);
      
      expect(mockCanvasContext.arc).toHaveBeenCalled();
    });

    it("should render star particles", () => {
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      
      const particle = particleSystem.activeParticles.value[0];
      particle.shape = "star";
      
      particleSystem.renderParticles(mockCanvasContext, 800, 600);
      
      expect(mockCanvasContext.moveTo).toHaveBeenCalled();
      expect(mockCanvasContext.lineTo).toHaveBeenCalled();
    });

    it("should render diamond particles", () => {
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      
      const particle = particleSystem.activeParticles.value[0];
      particle.shape = "diamond";
      
      particleSystem.renderParticles(mockCanvasContext, 800, 600);
      
      expect(mockCanvasContext.moveTo).toHaveBeenCalled();
      expect(mockCanvasContext.lineTo).toHaveBeenCalled();
    });

    it("should handle unknown particle shapes", () => {
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      
      const particle = particleSystem.activeParticles.value[0];
      particle.shape = "unknown";
      
      expect(() => particleSystem.renderParticles(mockCanvasContext, 800, 600)).not.toThrow();
    });
  });

  describe("particle effects", () => {
    it("should create burst effect", () => {
      particleSystem.createBurst(100, 100, { name: "Do", emotion: "happy" }, 440, 10);
      
      expect(particleSystem.getParticleCount()).toBe(10);
      
      const particles = particleSystem.activeParticles.value;
      particles.forEach(particle => {
        expect(particle.x).toBeCloseTo(100, 1);
        expect(particle.y).toBeCloseTo(100, 1);
      });
    });

    it("should create trail effect", () => {
      particleSystem.createTrail(50, 50, 150, 150, { name: "Do", emotion: "happy" }, 440, 5);
      
      expect(particleSystem.getParticleCount()).toBe(5);
    });

    it("should create explosion effect", () => {
      particleSystem.createExplosion(100, 100, { name: "Do", emotion: "happy" }, 440, 15);
      
      expect(particleSystem.getParticleCount()).toBe(15);
      
      const particles = particleSystem.activeParticles.value;
      particles.forEach(particle => {
        expect(Math.abs(particle.vx) + Math.abs(particle.vy)).toBeGreaterThan(0);
      });
    });
  });

  describe("particle management", () => {
    it("should clear all particles", () => {
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      particleSystem.addParticle(200, 200, { name: "Re", emotion: "sad" }, 493);
      
      expect(particleSystem.getParticleCount()).toBe(2);
      
      particleSystem.clearParticles();
      
      expect(particleSystem.getParticleCount()).toBe(0);
    });

    it("should remove specific particles", () => {
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      particleSystem.addParticle(200, 200, { name: "Re", emotion: "sad" }, 493);
      
      const particleToRemove = particleSystem.activeParticles.value[0];
      particleSystem.removeParticle(particleToRemove);
      
      expect(particleSystem.getParticleCount()).toBe(1);
    });

    it("should get particles by area", () => {
      particleSystem.addParticle(50, 50, { name: "Do", emotion: "happy" }, 440);
      particleSystem.addParticle(150, 150, { name: "Re", emotion: "sad" }, 493);
      particleSystem.addParticle(250, 250, { name: "Mi", emotion: "joy" }, 523);
      
      const particlesInArea = particleSystem.getParticlesInArea(0, 0, 100, 100);
      
      expect(particlesInArea).toHaveLength(1);
      expect(particlesInArea[0].x).toBe(50);
      expect(particlesInArea[0].y).toBe(50);
    });

    it("should count particles by type", () => {
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      particleSystem.addParticle(200, 200, { name: "Do", emotion: "happy" }, 440);
      particleSystem.addParticle(300, 300, { name: "Re", emotion: "sad" }, 493);
      
      const doParticles = particleSystem.getParticlesByNote("Do");
      const reParticles = particleSystem.getParticlesByNote("Re");
      
      expect(doParticles).toHaveLength(2);
      expect(reParticles).toHaveLength(1);
    });
  });

  describe("performance", () => {
    it("should handle many particles efficiently", () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        particleSystem.addParticle(i % 800, i % 600, { name: "Do", emotion: "happy" }, 440);
      }
      
      particleSystem.updateParticles(16);
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });

    it("should limit particle count for performance", () => {
      // Add more particles than the system can handle
      for (let i = 0; i < 200; i++) {
        particleSystem.addParticle(i, i, { name: "Do", emotion: "happy" }, 440);
      }
      
      expect(particleSystem.getParticleCount()).toBeLessThanOrEqual(50);
    });

    it("should recycle particles when possible", () => {
      // Fill up to limit
      for (let i = 0; i < 50; i++) {
        particleSystem.addParticle(i, i, { name: "Do", emotion: "happy" }, 440);
      }
      
      // Kill all particles
      particleSystem.activeParticles.value.forEach(particle => {
        particle.life = 0;
      });
      
      particleSystem.updateParticles(16); // This should clear dead particles
      
      // Add new particles
      for (let i = 0; i < 10; i++) {
        particleSystem.addParticle(i, i, { name: "Re", emotion: "sad" }, 493);
      }
      
      expect(particleSystem.getParticleCount()).toBe(10);
    });
  });

  describe("configuration", () => {
    it("should respect enabled/disabled state", () => {
      particleSystem.setEnabled(false);
      
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      
      expect(particleSystem.getParticleCount()).toBe(0);
    });

    it("should update configuration", () => {
      const newConfig = {
        enabled: true,
        count: 25,
        lifetime: 1000,
        speed: 50,
        sizeMin: 1,
        sizeMax: 4,
        fadeTime: 200,
        shapes: ["circle"],
      };
      
      particleSystem.updateConfig(newConfig);
      
      expect(particleSystem.getMaxParticles()).toBe(25);
    });

    it("should handle invalid configuration", () => {
      const invalidConfig = {
        enabled: true,
        count: -10,
        lifetime: 0,
        speed: -100,
        sizeMin: 10,
        sizeMax: 1,
        fadeTime: -500,
        shapes: [],
      };
      
      expect(() => particleSystem.updateConfig(invalidConfig)).not.toThrow();
    });
  });

  describe("integration", () => {
    it("should work with animation loop", () => {
      let frameCount = 0;
      const maxFrames = 60;
      
      particleSystem.addParticle(100, 100, { name: "Do", emotion: "happy" }, 440);
      
      const animationLoop = () => {
        if (frameCount < maxFrames) {
          particleSystem.updateParticles(16);
          particleSystem.renderParticles(mockCanvasContext, 800, 600);
          frameCount++;
          requestAnimationFrame(animationLoop);
        }
      };
      
      expect(() => animationLoop()).not.toThrow();
    });

    it("should handle rapid particle creation and destruction", () => {
      for (let i = 0; i < 100; i++) {
        particleSystem.addParticle(Math.random() * 800, Math.random() * 600, { name: "Do", emotion: "happy" }, 440);
        
        if (i % 10 === 0) {
          particleSystem.updateParticles(16);
        }
        
        if (i % 20 === 0) {
          particleSystem.clearParticles();
        }
      }
      
      expect(() => particleSystem.updateParticles(16)).not.toThrow();
    });
  });
});