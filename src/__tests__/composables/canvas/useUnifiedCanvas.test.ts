import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useUnifiedCanvas } from "@/composables/canvas/useUnifiedCanvas";
import { mockCanvasContext } from "@/helpers/test-utils";

// Mock dependencies
vi.mock("@/stores/music", () => ({
  useMusicStore: vi.fn(() => ({
    activeNotes: [],
    currentKey: "C",
    currentMode: "major",
  })),
}));

vi.mock("@/composables/useVisualConfig", () => ({
  useVisualConfig: vi.fn(() => ({
    blobConfig: ref({
      enabled: true,
      maxBlobs: 10,
      fadeOutTime: 1000,
      oscillationSpeed: 2,
      driftSpeed: 0.1,
    }),
    ambientConfig: ref({
      enabled: true,
      intensity: 0.5,
      colorShift: 0.1,
    }),
    particleConfig: ref({
      enabled: true,
      count: 50,
      lifetime: 2000,
      speed: 100,
    }),
    stringConfig: ref({
      enabled: true,
      segments: 50,
      tension: 0.5,
    }),
    animationConfig: ref({
      enabled: true,
      quality: "high",
    }),
  })),
}));

vi.mock("@/composables/useAnimationLifecycle", () => ({
  useAnimationLifecycle: vi.fn(() => ({
    startAnimation: vi.fn(),
    stopAnimation: vi.fn(),
    isAnimating: ref(false),
  })),
}));

vi.mock("@/composables/canvas/useBlobRenderer", () => ({
  useBlobRenderer: vi.fn(() => ({
    updateBlobs: vi.fn(),
    renderBlobs: vi.fn(),
    addBlob: vi.fn(),
    removeBlob: vi.fn(),
    clearBlobs: vi.fn(),
    activeBlobs: ref([]),
  })),
}));

vi.mock("@/composables/canvas/useParticleSystem", () => ({
  useParticleSystem: vi.fn(() => ({
    updateParticles: vi.fn(),
    renderParticles: vi.fn(),
    addParticle: vi.fn(),
    clearParticles: vi.fn(),
    activeParticles: ref([]),
  })),
}));

vi.mock("@/composables/canvas/useStringRenderer", () => ({
  useStringRenderer: vi.fn(() => ({
    updateStrings: vi.fn(),
    renderStrings: vi.fn(),
    addString: vi.fn(),
    clearStrings: vi.fn(),
    activeStrings: ref([]),
  })),
}));

vi.mock("@/composables/canvas/useAmbientRenderer", () => ({
  useAmbientRenderer: vi.fn(() => ({
    updateAmbient: vi.fn(),
    renderAmbient: vi.fn(),
    setAmbientColor: vi.fn(),
    clearAmbient: vi.fn(),
  })),
}));

vi.mock("@/utils/performanceMonitor", () => ({
  performanceMonitor: {
    update: vi.fn(() => ({
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 10,
      activeObjects: 25,
    })),
    getMetrics: vi.fn(() => ({
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 10,
      activeObjects: 25,
    })),
    isPerformanceGood: vi.fn(() => true),
    isPerformancePoor: vi.fn(() => false),
  },
}));

describe("useUnifiedCanvas", () => {
  let mockCanvas: HTMLCanvasElement;
  let canvasRef: ReturnType<typeof ref>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock canvas
    mockCanvas = {
      getContext: vi.fn(() => mockCanvasContext),
      width: 800,
      height: 600,
      style: {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    canvasRef = ref(mockCanvas);

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 600,
    });

    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => {
      setTimeout(cb, 16);
      return 1;
    });
    global.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with default values", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      
      expect(canvas).toBeDefined();
      expect(canvas.canvasWidth).toBe(800);
      expect(canvas.canvasHeight).toBe(600);
    });

    it("should initialize canvas context", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    });

    it("should handle null canvas ref", () => {
      const nullCanvasRef = ref<HTMLCanvasElement | null>(null);
      const canvas = useUnifiedCanvas(nullCanvasRef);
      
      expect(() => canvas.initializeCanvas()).not.toThrow();
    });

    it("should set up canvas dimensions", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      expect(mockCanvas.width).toBe(800);
      expect(mockCanvas.height).toBe(600);
    });

    it("should handle high DPI displays", () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: 2,
      });
      
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      expect(mockCanvas.width).toBe(1600); // 800 * 2
      expect(mockCanvas.height).toBe(1200); // 600 * 2
    });
  });

  describe("canvas management", () => {
    it("should resize canvas correctly", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      canvas.resizeCanvas(1000, 800);
      
      expect(canvas.canvasWidth).toBe(1000);
      expect(canvas.canvasHeight).toBe(800);
      expect(mockCanvas.width).toBe(1000);
      expect(mockCanvas.height).toBe(800);
    });

    it("should clear canvas", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      canvas.clearCanvas();
      
      expect(mockCanvasContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it("should handle window resize", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      // Mock window resize
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 900,
      });
      
      // Trigger resize
      window.dispatchEvent(new Event('resize'));
      
      // Should update dimensions
      expect(canvas.canvasWidth).toBe(1200);
      expect(canvas.canvasHeight).toBe(900);
    });
  });

  describe("rendering systems", () => {
    it("should render all systems", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      const mockTimestamp = 1000;
      canvas.render(mockTimestamp);
      
      // Should call all rendering systems
      expect(mockCanvasContext.clearRect).toHaveBeenCalled();
      // Additional assertions would depend on the mocked render functions
    });

    it("should handle rendering with performance monitoring", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      canvas.render(1000);
      
      // Should update performance metrics
      expect(require("@/utils/performanceMonitor").performanceMonitor.update).toHaveBeenCalled();
    });

    it("should skip rendering if canvas is not available", () => {
      const nullCanvasRef = ref<HTMLCanvasElement | null>(null);
      const canvas = useUnifiedCanvas(nullCanvasRef);
      
      expect(() => canvas.render(1000)).not.toThrow();
    });
  });

  describe("event handling", () => {
    it("should handle note played events", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      const mockEvent = new CustomEvent('note-played', {
        detail: {
          note: { name: 'Do', emotion: 'happy' },
          frequency: 440,
          noteName: 'C4',
          solfegeIndex: 0,
          octave: 4,
        },
      });
      
      expect(() => canvas.handleNotePlayedEvent(mockEvent)).not.toThrow();
    });

    it("should handle note released events", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      const mockEvent = new CustomEvent('note-released', {
        detail: {
          noteId: 'note-1',
          noteName: 'C4',
        },
      });
      
      expect(() => canvas.handleNoteReleasedEvent(mockEvent)).not.toThrow();
    });

    it("should add event listeners", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      canvas.setupEventListeners();
      
      expect(window.addEventListener).toHaveBeenCalledWith('note-played', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('note-released', expect.any(Function));
    });

    it("should remove event listeners on cleanup", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      canvas.setupEventListeners();
      
      canvas.cleanup();
      
      expect(window.removeEventListener).toHaveBeenCalledWith('note-played', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('note-released', expect.any(Function));
    });
  });

  describe("performance optimization", () => {
    it("should cache gradients", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      // Test gradient caching
      const gradient1 = canvas.createGradient('test-key', 0, 0, 100, 100);
      const gradient2 = canvas.createGradient('test-key', 0, 0, 100, 100);
      
      expect(gradient1).toBe(gradient2); // Should return cached gradient
    });

    it("should cache colors", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      // Test color caching
      const color1 = canvas.getCachedColor('Do', 'major', 4);
      const color2 = canvas.getCachedColor('Do', 'major', 4);
      
      expect(color1).toBe(color2); // Should return cached color
    });

    it("should clear caches when needed", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      // Add some cached items
      canvas.createGradient('test-key', 0, 0, 100, 100);
      canvas.getCachedColor('Do', 'major', 4);
      
      canvas.clearCaches();
      
      // Caches should be cleared
      expect(canvas.getCacheSize()).toBe(0);
    });

    it("should handle cache size limits", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      // Fill cache beyond limit
      for (let i = 0; i < 150; i++) {
        canvas.createGradient(`test-key-${i}`, 0, 0, 100, 100);
      }
      
      // Should limit cache size
      expect(canvas.getCacheSize()).toBeLessThanOrEqual(100);
    });
  });

  describe("configuration updates", () => {
    it("should update configurations reactively", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      // Update configuration
      canvas.updateConfigs();
      
      // Should update cached configs
      expect(canvas.getConfigVersion()).toBeGreaterThan(0);
    });

    it("should handle configuration changes", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      // Simulate configuration change
      const newConfig = {
        enabled: false,
        maxBlobs: 5,
        fadeOutTime: 500,
        oscillationSpeed: 1,
        driftSpeed: 0.05,
      };
      
      canvas.updateBlobConfig(newConfig);
      
      // Should update blob configuration
      expect(canvas.getBlobConfig()).toEqual(newConfig);
    });
  });

  describe("animation lifecycle", () => {
    it("should start animation loop", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      canvas.startAnimation();
      
      expect(canvas.isAnimating()).toBe(true);
      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it("should stop animation loop", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      canvas.startAnimation();
      canvas.stopAnimation();
      
      expect(canvas.isAnimating()).toBe(false);
      expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    it("should handle animation frame callback", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      canvas.startAnimation();
      
      // Trigger animation frame
      const callback = (requestAnimationFrame as any).mock.calls[0][0];
      callback(1000);
      
      expect(mockCanvasContext.clearRect).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should handle canvas context creation failure", () => {
      const failingCanvas = {
        getContext: vi.fn(() => null),
        width: 800,
        height: 600,
        style: {},
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;
      
      const failingCanvasRef = ref(failingCanvas);
      const canvas = useUnifiedCanvas(failingCanvasRef);
      
      expect(() => canvas.initializeCanvas()).not.toThrow();
    });

    it("should handle rendering errors gracefully", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      // Mock rendering error
      mockCanvasContext.clearRect.mockImplementation(() => {
        throw new Error("Rendering error");
      });
      
      expect(() => canvas.render(1000)).not.toThrow();
    });

    it("should handle event listener errors", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      
      // Mock event listener error
      window.addEventListener = vi.fn().mockImplementation(() => {
        throw new Error("Event listener error");
      });
      
      expect(() => canvas.setupEventListeners()).not.toThrow();
    });
  });

  describe("integration", () => {
    it("should work with all rendering systems", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      canvas.setupEventListeners();
      canvas.startAnimation();
      
      // Simulate note event
      const noteEvent = new CustomEvent('note-played', {
        detail: {
          note: { name: 'Do', emotion: 'happy' },
          frequency: 440,
          noteName: 'C4',
          solfegeIndex: 0,
          octave: 4,
        },
      });
      
      window.dispatchEvent(noteEvent);
      
      // Should handle event without errors
      expect(canvas.isAnimating()).toBe(true);
      
      canvas.cleanup();
    });

    it("should cleanup properly", () => {
      const canvas = useUnifiedCanvas(canvasRef);
      canvas.initializeCanvas();
      canvas.setupEventListeners();
      canvas.startAnimation();
      
      canvas.cleanup();
      
      expect(canvas.isAnimating()).toBe(false);
      expect(window.removeEventListener).toHaveBeenCalled();
      expect(cancelAnimationFrame).toHaveBeenCalled();
    });
  });
});