/**
 * Performance Monitoring Utility
 * Tracks performance metrics for visual effects and animations
 */

import type { PerformanceMetrics } from '@/types/canvas';

class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = 0;
  private frameTimeHistory: number[] = [];
  private maxHistorySize = 60; // Track last 60 frames
  
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    activeObjects: 0,
  };

  /**
   * Update performance metrics
   */
  update(timestamp: number, activeObjects: number = 0): PerformanceMetrics {
    this.frameCount++;
    
    if (this.lastTime > 0) {
      const frameTime = timestamp - this.lastTime;
      this.frameTimeHistory.push(frameTime);
      
      // Keep history size manageable
      if (this.frameTimeHistory.length > this.maxHistorySize) {
        this.frameTimeHistory.shift();
      }
      
      // Calculate average frame time and FPS
      const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
      this.metrics.frameTime = avgFrameTime;
      this.metrics.fps = 1000 / avgFrameTime;
    }
    
    this.lastTime = timestamp;
    this.metrics.activeObjects = activeObjects;
    
    // Estimate memory usage (rough approximation)
    this.metrics.memoryUsage = this.estimateMemoryUsage();
    
    return { ...this.metrics };
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if performance is good
   */
  isPerformanceGood(): boolean {
    return this.metrics.fps >= 55 && this.metrics.frameTime <= 18;
  }

  /**
   * Check if performance is poor
   */
  isPerformancePoor(): boolean {
    return this.metrics.fps < 30 || this.metrics.frameTime > 33;
  }

  /**
   * Get performance status
   */
  getPerformanceStatus(): 'excellent' | 'good' | 'fair' | 'poor' {
    if (this.metrics.fps >= 58) return 'excellent';
    if (this.metrics.fps >= 45) return 'good';
    if (this.metrics.fps >= 30) return 'fair';
    return 'poor';
  }

  /**
   * Reset performance tracking
   */
  reset(): void {
    this.frameCount = 0;
    this.lastTime = 0;
    this.frameTimeHistory = [];
    this.metrics = {
      fps: 0,
      frameTime: 0,
      memoryUsage: 0,
      activeObjects: 0,
    };
  }

  /**
   * Estimate memory usage (rough approximation)
   */
  private estimateMemoryUsage(): number {
    // This is a rough estimation based on active objects and frame history
    const baseMemory = 1; // 1MB base
    const objectMemory = this.metrics.activeObjects * 0.001; // ~1KB per object
    const historyMemory = this.frameTimeHistory.length * 0.00001; // Minimal for numbers
    
    return baseMemory + objectMemory + historyMemory;
  }

  /**
   * Log performance warning if needed
   */
  checkAndWarnPerformance(): void {
    if (this.frameCount % 300 === 0) { // Check every 5 seconds at 60fps
      const status = this.getPerformanceStatus();
      
      if (status === 'poor') {
        console.warn(`Performance Warning: FPS: ${this.metrics.fps.toFixed(1)}, Frame Time: ${this.metrics.frameTime.toFixed(1)}ms`);
      } else if (status === 'fair') {
        console.info(`Performance Notice: FPS: ${this.metrics.fps.toFixed(1)}, Frame Time: ${this.metrics.frameTime.toFixed(1)}ms`);
      }
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Performance optimization suggestions based on current metrics
 */
export function getOptimizationSuggestions(metrics: PerformanceMetrics): string[] {
  const suggestions: string[] = [];
  
  if (metrics.fps < 30) {
    suggestions.push('Consider reducing particle count or visual effect complexity');
    suggestions.push('Enable performance mode in visual effects settings');
  }
  
  if (metrics.frameTime > 33) {
    suggestions.push('Reduce canvas resolution or visual quality');
    suggestions.push('Disable expensive effects like blur or gradients');
  }
  
  if (metrics.activeObjects > 100) {
    suggestions.push('Too many active objects - consider object pooling');
    suggestions.push('Implement culling for off-screen objects');
  }
  
  if (metrics.memoryUsage > 50) {
    suggestions.push('High memory usage detected - check for memory leaks');
    suggestions.push('Clear caches more frequently');
  }
  
  return suggestions;
}

/**
 * Auto-adjust visual effects based on performance
 */
export function autoAdjustPerformance(metrics: PerformanceMetrics): {
  particleCount: number;
  stringSegments: number;
  enableBlur: boolean;
  cacheLifetime: number;
} {
  const status = performanceMonitor.getPerformanceStatus();
  
  switch (status) {
    case 'excellent':
      return {
        particleCount: 1.0,
        stringSegments: 100,
        enableBlur: true,
        cacheLifetime: 300, // 5 minutes
      };
    case 'good':
      return {
        particleCount: 0.8,
        stringSegments: 80,
        enableBlur: true,
        cacheLifetime: 180, // 3 minutes
      };
    case 'fair':
      return {
        particleCount: 0.6,
        stringSegments: 60,
        enableBlur: false,
        cacheLifetime: 120, // 2 minutes
      };
    case 'poor':
      return {
        particleCount: 0.3,
        stringSegments: 30,
        enableBlur: false,
        cacheLifetime: 60, // 1 minute
      };
  }
}
