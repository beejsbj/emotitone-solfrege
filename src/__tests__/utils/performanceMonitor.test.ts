import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  performanceMonitor,
} from "@/utils/performanceMonitor";

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

    it("should limit frame history size by evicting old slow frames", () => {
      const baseTime = 1000;

      // First, feed 100 slow frames (50ms each = 20 FPS)
      for (let i = 0; i < 100; i++) {
        performanceMonitor.update(baseTime + (i * 50), i);
      }

      let metrics = performanceMonitor.getMetrics();
      expect(metrics.fps).toBeCloseTo(20, 1);

      // Now feed 70 fast frames (16.67ms each = 60 FPS) to completely evict all slow frames
      // With maxHistorySize of 60, we need to add 70 frames to guarantee all slow frames are gone
      for (let i = 100; i < 170; i++) {
        performanceMonitor.update(baseTime + (5000 + ((i - 100) * 16.67)), i);
      }

      metrics = performanceMonitor.getMetrics();
      // Should now be close to 60 FPS, proving old slow frames were evicted from the bounded history
      expect(metrics.fps).toBeCloseTo(60, 0);
      expect(metrics.frameTime).toBeCloseTo(16.67, 1);
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
      it("should avoid repeated console messages for poor performance", () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        
        // Simulate poor performance for 300 frames
        for (let i = 0; i < 300; i++) {
          performanceMonitor.update(1000 + (i * 50), 10); // 20 FPS
        }
        
        performanceMonitor.checkAndWarnPerformance();
        
        expect(consoleSpy).not.toHaveBeenCalled();
        expect(infoSpy).not.toHaveBeenCalled();
        
        consoleSpy.mockRestore();
        infoSpy.mockRestore();
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
  });
});
