import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  performanceMonitor,
  getOptimizationSuggestions,
  autoAdjustPerformance,
} from "@/utils/performanceMonitor";
import type { PerformanceMetrics } from "@/types/canvas";

describe("Performance Monitor", () => {
  beforeEach(() => {
    performanceMonitor.reset();
    vi.clearAllMocks();
  });

  describe("PerformanceMonitor", () => {
    it("should initialize with default metrics", () => {
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.fps).toBe(0);
      expect(metrics.frameTime).toBe(0);
      expect(metrics.memoryUsage).toBe(0);
      expect(metrics.activeObjects).toBe(0);
    });

    it("should calculate FPS correctly", () => {
      const timestamp1 = 1000;
      const timestamp2 = 1016.67; // 60 FPS = 16.67ms per frame
      const timestamp3 = 1033.33;

      performanceMonitor.update(timestamp1, 10);
      performanceMonitor.update(timestamp2, 15);
      const metrics = performanceMonitor.update(timestamp3, 20);

      expect(metrics.fps).toBeCloseTo(60, 1);
      expect(metrics.frameTime).toBeCloseTo(16.67, 1);
      expect(metrics.activeObjects).toBe(20);
    });

    it("should calculate different FPS rates", () => {
      const timestamp1 = 1000;
      const timestamp2 = 1033.33; // 30 FPS = 33.33ms per frame
      const timestamp3 = 1066.67;

      performanceMonitor.update(timestamp1, 10);
      performanceMonitor.update(timestamp2, 15);
      const metrics = performanceMonitor.update(timestamp3, 20);

      expect(metrics.fps).toBeCloseTo(30, 1);
      expect(metrics.frameTime).toBeCloseTo(33.33, 1);
    });

    it("should maintain frame time history", () => {
      const baseTime = 1000;
      const frameInterval = 16.67; // 60 FPS

      // Update multiple times
      for (let i = 0; i < 10; i++) {
        performanceMonitor.update(baseTime + (i * frameInterval), i * 2);
      }

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.fps).toBeCloseTo(60, 1);
      expect(metrics.activeObjects).toBe(18); // Last value
    });

    it("should limit frame history size", () => {
      const baseTime = 1000;
      const frameInterval = 16.67;

      // Update more than max history size (60)
      for (let i = 0; i < 100; i++) {
        performanceMonitor.update(baseTime + (i * frameInterval), i);
      }

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.fps).toBeCloseTo(60, 1);
      // Should still calculate correctly with limited history
    });

    it("should estimate memory usage", () => {
      const metrics = performanceMonitor.update(1000, 50);
      expect(metrics.memoryUsage).toBeGreaterThan(1); // Base memory
      expect(metrics.memoryUsage).toBeCloseTo(1.05, 2); // ~1MB base + 50 objects
    });

    it("should reset correctly", () => {
      performanceMonitor.update(1000, 10);
      performanceMonitor.update(1016.67, 15);
      
      let metrics = performanceMonitor.getMetrics();
      expect(metrics.fps).toBeGreaterThan(0);
      
      performanceMonitor.reset();
      metrics = performanceMonitor.getMetrics();
      
      expect(metrics.fps).toBe(0);
      expect(metrics.frameTime).toBe(0);
      expect(metrics.memoryUsage).toBe(0);
      expect(metrics.activeObjects).toBe(0);
    });

    describe("Performance status", () => {
      it("should identify excellent performance", () => {
        // Simulate 60 FPS
        performanceMonitor.update(1000, 10);
        performanceMonitor.update(1016.67, 10);
        
        expect(performanceMonitor.getPerformanceStatus()).toBe("excellent");
        expect(performanceMonitor.isPerformanceGood()).toBe(true);
        expect(performanceMonitor.isPerformancePoor()).toBe(false);
      });

      it("should identify good performance", () => {
        // Simulate 50 FPS
        performanceMonitor.update(1000, 10);
        performanceMonitor.update(1020, 10);
        
        expect(performanceMonitor.getPerformanceStatus()).toBe("good");
        expect(performanceMonitor.isPerformanceGood()).toBe(false);
        expect(performanceMonitor.isPerformancePoor()).toBe(false);
      });

      it("should identify fair performance", () => {
        // Simulate 35 FPS
        performanceMonitor.update(1000, 10);
        performanceMonitor.update(1028.57, 10);
        
        expect(performanceMonitor.getPerformanceStatus()).toBe("fair");
        expect(performanceMonitor.isPerformanceGood()).toBe(false);
        expect(performanceMonitor.isPerformancePoor()).toBe(false);
      });

      it("should identify poor performance", () => {
        // Simulate 20 FPS
        performanceMonitor.update(1000, 10);
        performanceMonitor.update(1050, 10);
        
        expect(performanceMonitor.getPerformanceStatus()).toBe("poor");
        expect(performanceMonitor.isPerformanceGood()).toBe(false);
        expect(performanceMonitor.isPerformancePoor()).toBe(true);
      });
    });

    describe("Performance warnings", () => {
      it("should log warning for poor performance", () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        // Simulate poor performance for 300 frames
        for (let i = 0; i < 300; i++) {
          performanceMonitor.update(1000 + (i * 50), 10); // 20 FPS
        }
        
        performanceMonitor.checkAndWarnPerformance();
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Performance Warning")
        );
        
        consoleSpy.mockRestore();
      });

      it("should log info for fair performance", () => {
        const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        
        // Simulate fair performance for 300 frames
        for (let i = 0; i < 300; i++) {
          performanceMonitor.update(1000 + (i * 28.57), 10); // 35 FPS
        }
        
        performanceMonitor.checkAndWarnPerformance();
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Performance Notice")
        );
        
        consoleSpy.mockRestore();
      });

      it("should not log for good performance", () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        
        // Simulate good performance for 300 frames
        for (let i = 0; i < 300; i++) {
          performanceMonitor.update(1000 + (i * 16.67), 10); // 60 FPS
        }
        
        performanceMonitor.checkAndWarnPerformance();
        
        expect(consoleSpy).not.toHaveBeenCalled();
        expect(infoSpy).not.toHaveBeenCalled();
        
        consoleSpy.mockRestore();
        infoSpy.mockRestore();
      });
    });
  });

  describe("getOptimizationSuggestions", () => {
    it("should suggest optimizations for low FPS", () => {
      const metrics: PerformanceMetrics = {
        fps: 25,
        frameTime: 20,
        memoryUsage: 10,
        activeObjects: 50,
      };

      const suggestions = getOptimizationSuggestions(metrics);
      
      expect(suggestions).toContain("Consider reducing particle count or visual effect complexity");
      expect(suggestions).toContain("Enable performance mode in visual effects settings");
    });

    it("should suggest optimizations for high frame time", () => {
      const metrics: PerformanceMetrics = {
        fps: 60,
        frameTime: 40,
        memoryUsage: 10,
        activeObjects: 50,
      };

      const suggestions = getOptimizationSuggestions(metrics);
      
      expect(suggestions).toContain("Reduce canvas resolution or visual quality");
      expect(suggestions).toContain("Disable expensive effects like blur or gradients");
    });

    it("should suggest optimizations for too many objects", () => {
      const metrics: PerformanceMetrics = {
        fps: 60,
        frameTime: 16,
        memoryUsage: 10,
        activeObjects: 150,
      };

      const suggestions = getOptimizationSuggestions(metrics);
      
      expect(suggestions).toContain("Too many active objects - consider object pooling");
      expect(suggestions).toContain("Implement culling for off-screen objects");
    });

    it("should suggest optimizations for high memory usage", () => {
      const metrics: PerformanceMetrics = {
        fps: 60,
        frameTime: 16,
        memoryUsage: 60,
        activeObjects: 50,
      };

      const suggestions = getOptimizationSuggestions(metrics);
      
      expect(suggestions).toContain("High memory usage detected - check for memory leaks");
      expect(suggestions).toContain("Clear caches more frequently");
    });

    it("should return empty array for good performance", () => {
      const metrics: PerformanceMetrics = {
        fps: 60,
        frameTime: 16,
        memoryUsage: 10,
        activeObjects: 50,
      };

      const suggestions = getOptimizationSuggestions(metrics);
      
      expect(suggestions).toEqual([]);
    });

    it("should combine multiple suggestions", () => {
      const metrics: PerformanceMetrics = {
        fps: 20,
        frameTime: 50,
        memoryUsage: 60,
        activeObjects: 150,
      };

      const suggestions = getOptimizationSuggestions(metrics);
      
      expect(suggestions.length).toBeGreaterThan(4);
      expect(suggestions).toContain("Consider reducing particle count or visual effect complexity");
      expect(suggestions).toContain("Reduce canvas resolution or visual quality");
      expect(suggestions).toContain("High memory usage detected - check for memory leaks");
      expect(suggestions).toContain("Too many active objects - consider object pooling");
    });
  });

  describe("autoAdjustPerformance", () => {
    beforeEach(() => {
      performanceMonitor.reset();
    });

    it("should return excellent settings for good performance", () => {
      // Simulate excellent performance (60+ FPS)
      performanceMonitor.update(1000, 10);
      performanceMonitor.update(1016.67, 10);
      
      const settings = autoAdjustPerformance(performanceMonitor.getMetrics());
      
      expect(settings.particleCount).toBe(1.0);
      expect(settings.stringSegments).toBe(100);
      expect(settings.enableBlur).toBe(true);
      expect(settings.cacheLifetime).toBe(300);
    });

    it("should return good settings for decent performance", () => {
      // Simulate good performance (45-58 FPS)
      performanceMonitor.update(1000, 10);
      performanceMonitor.update(1020, 10); // 50 FPS
      
      const settings = autoAdjustPerformance(performanceMonitor.getMetrics());
      
      expect(settings.particleCount).toBe(0.8);
      expect(settings.stringSegments).toBe(80);
      expect(settings.enableBlur).toBe(true);
      expect(settings.cacheLifetime).toBe(180);
    });

    it("should return fair settings for moderate performance", () => {
      // Simulate fair performance (30-44 FPS)
      performanceMonitor.update(1000, 10);
      performanceMonitor.update(1028.57, 10); // 35 FPS
      
      const settings = autoAdjustPerformance(performanceMonitor.getMetrics());
      
      expect(settings.particleCount).toBe(0.6);
      expect(settings.stringSegments).toBe(60);
      expect(settings.enableBlur).toBe(false);
      expect(settings.cacheLifetime).toBe(120);
    });

    it("should return poor settings for bad performance", () => {
      // Simulate poor performance (<30 FPS)
      performanceMonitor.update(1000, 10);
      performanceMonitor.update(1050, 10); // 20 FPS
      
      const settings = autoAdjustPerformance(performanceMonitor.getMetrics());
      
      expect(settings.particleCount).toBe(0.3);
      expect(settings.stringSegments).toBe(30);
      expect(settings.enableBlur).toBe(false);
      expect(settings.cacheLifetime).toBe(60);
    });

    it("should adjust settings based on performance changes", () => {
      // Start with good performance
      performanceMonitor.update(1000, 10);
      performanceMonitor.update(1016.67, 10); // 60 FPS
      
      let settings = autoAdjustPerformance(performanceMonitor.getMetrics());
      expect(settings.particleCount).toBe(1.0);
      expect(settings.enableBlur).toBe(true);
      
      // Degrade to poor performance
      performanceMonitor.reset();
      performanceMonitor.update(2000, 10);
      performanceMonitor.update(2050, 10); // 20 FPS
      
      settings = autoAdjustPerformance(performanceMonitor.getMetrics());
      expect(settings.particleCount).toBe(0.3);
      expect(settings.enableBlur).toBe(false);
    });
  });

  describe("Integration tests", () => {
    it("should maintain performance state across multiple updates", () => {
      const frameTimes = [16.67, 16.67, 33.33, 16.67, 16.67]; // Mixed performance
      let timestamp = 1000;
      
      frameTimes.forEach((frameTime, index) => {
        timestamp += frameTime;
        performanceMonitor.update(timestamp, index * 5);
      });
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.fps).toBeGreaterThan(0);
      expect(metrics.frameTime).toBeGreaterThan(0);
      expect(metrics.activeObjects).toBe(20); // Last value
    });

    it("should provide consistent performance assessment", () => {
      // Simulate consistent 30 FPS
      for (let i = 0; i < 10; i++) {
        performanceMonitor.update(1000 + (i * 33.33), 25);
      }
      
      const metrics = performanceMonitor.getMetrics();
      const status = performanceMonitor.getPerformanceStatus();
      const suggestions = getOptimizationSuggestions(metrics);
      const settings = autoAdjustPerformance(metrics);
      
      expect(status).toBe("fair");
      expect(suggestions.length).toBe(0); // 30 FPS is at the threshold
      expect(settings.particleCount).toBe(0.6);
      expect(settings.enableBlur).toBe(false);
    });
  });
});