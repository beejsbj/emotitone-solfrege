import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useBlobRenderer } from "@/composables/canvas/useBlobRenderer";
import { mockCanvasContext } from "@/helpers/test-utils";
import type { ActiveBlob } from "@/types/canvas";

// Mock dependencies
vi.mock("@/composables/useVisualConfig", () => ({
  useVisualConfig: vi.fn(() => ({
    blobConfig: ref({
      enabled: true,
      maxBlobs: 10,
      fadeOutTime: 1000,
      oscillationSpeed: 2,
      driftSpeed: 0.1,
      baseSizeRatio: 0.15,
      minRadius: 30,
      maxRadius: 150,
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

vi.mock("@/utils/visualEffects", () => ({
  createHarmonicVibration: vi.fn(() => 5),
  createOscillation: vi.fn(() => 1.2),
  calculateBlobSize: vi.fn(() => 80),
}));

describe("useBlobRenderer", () => {
  let blobRenderer: ReturnType<typeof useBlobRenderer>;

  beforeEach(() => {
    vi.clearAllMocks();
    blobRenderer = useBlobRenderer();
  });

  afterEach(() => {
    blobRenderer.clearBlobs();
  });

  describe("initialization", () => {
    it("should initialize with empty blob array", () => {
      expect(blobRenderer.activeBlobs.value).toEqual([]);
      expect(blobRenderer.getBlobCount()).toBe(0);
    });

    it("should be enabled by default", () => {
      expect(blobRenderer.isEnabled()).toBe(true);
    });
  });

  describe("blob creation", () => {
    it("should create blob with correct properties", () => {
      const x = 100;
      const y = 200;
      const note = { name: "Do", emotion: "happy" };
      const frequency = 440;
      const timestamp = 1000;

      blobRenderer.addBlob(x, y, note, frequency, timestamp);

      expect(blobRenderer.getBlobCount()).toBe(1);
      
      const blob = blobRenderer.activeBlobs.value[0];
      expect(blob.x).toBe(x);
      expect(blob.y).toBe(y);
      expect(blob.note).toBe(note);
      expect(blob.frequency).toBe(frequency);
      expect(blob.startTime).toBe(timestamp);
      expect(blob.opacity).toBe(1);
      expect(blob.isFadingOut).toBe(false);
    });

    it("should create blobs with different properties", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      blobRenderer.addBlob(200, 200, { name: "Re", emotion: "sad" }, 493, 1100);

      expect(blobRenderer.getBlobCount()).toBe(2);
      
      const blobs = blobRenderer.activeBlobs.value;
      expect(blobs[0].note.name).toBe("Do");
      expect(blobs[1].note.name).toBe("Re");
      expect(blobs[0].frequency).toBe(440);
      expect(blobs[1].frequency).toBe(493);
    });

    it("should limit blob count", () => {
      // Add more blobs than the limit
      for (let i = 0; i < 20; i++) {
        blobRenderer.addBlob(i * 10, i * 10, { name: "Do", emotion: "happy" }, 440, 1000 + i);
      }

      expect(blobRenderer.getBlobCount()).toBeLessThanOrEqual(10);
    });

    it("should generate random drift velocities", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      blobRenderer.addBlob(200, 200, { name: "Re", emotion: "sad" }, 493, 1100);

      const blobs = blobRenderer.activeBlobs.value;
      expect(blobs[0].driftVx).not.toBe(blobs[1].driftVx);
      expect(blobs[0].driftVy).not.toBe(blobs[1].driftVy);
    });

    it("should generate random vibration phases", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      blobRenderer.addBlob(200, 200, { name: "Re", emotion: "sad" }, 493, 1100);

      const blobs = blobRenderer.activeBlobs.value;
      expect(blobs[0].vibrationPhase).not.toBe(blobs[1].vibrationPhase);
    });
  });

  describe("blob updates", () => {
    it("should update blob positions with drift", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      
      const blob = blobRenderer.activeBlobs.value[0];
      const initialX = blob.x;
      const initialY = blob.y;
      
      blobRenderer.updateBlobs(1100, 800, 600);
      
      // Position should change due to drift
      expect(blob.x).not.toBe(initialX);
      expect(blob.y).not.toBe(initialY);
    });

    it("should update blob scale with oscillation", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      
      const blob = blobRenderer.activeBlobs.value[0];
      const initialScale = blob.scale;
      
      blobRenderer.updateBlobs(1100, 800, 600);
      
      expect(blob.scale).not.toBe(initialScale);
    });

    it("should handle blob fade out", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      
      const blob = blobRenderer.activeBlobs.value[0];
      blob.isFadingOut = true;
      blob.fadeOutStartTime = 1000;
      
      blobRenderer.updateBlobs(1500, 800, 600); // 500ms later
      
      expect(blob.opacity).toBeLessThan(1);
    });

    it("should remove fully faded blobs", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      
      const blob = blobRenderer.activeBlobs.value[0];
      blob.isFadingOut = true;
      blob.fadeOutStartTime = 1000;
      
      blobRenderer.updateBlobs(2500, 800, 600); // After fade out time
      
      expect(blobRenderer.getBlobCount()).toBe(0);
    });

    it("should keep blobs within screen bounds", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      
      const blob = blobRenderer.activeBlobs.value[0];
      // Force blob to move outside bounds
      blob.x = -50;
      blob.y = 700;
      
      blobRenderer.updateBlobs(1100, 800, 600);
      
      expect(blob.x).toBeGreaterThan(-blob.baseRadius);
      expect(blob.y).toBeLessThan(600 + blob.baseRadius);
    });

    it("should handle empty blob array", () => {
      expect(() => blobRenderer.updateBlobs(1000, 800, 600)).not.toThrow();
    });
  });

  describe("blob rendering", () => {
    it("should render blobs on canvas", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      
      blobRenderer.renderBlobs(mockCanvasContext, 1100, 800, 600);
      
      expect(mockCanvasContext.save).toHaveBeenCalled();
      expect(mockCanvasContext.restore).toHaveBeenCalled();
    });

    it("should render multiple blobs", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      blobRenderer.addBlob(200, 200, { name: "Re", emotion: "sad" }, 493, 1100);
      
      blobRenderer.renderBlobs(mockCanvasContext, 1200, 800, 600);
      
      expect(mockCanvasContext.save).toHaveBeenCalledTimes(2);
      expect(mockCanvasContext.restore).toHaveBeenCalledTimes(2);
    });

    it("should apply opacity to blobs", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      
      const blob = blobRenderer.activeBlobs.value[0];
      blob.opacity = 0.5;
      
      blobRenderer.renderBlobs(mockCanvasContext, 1100, 800, 600);
      
      expect(mockCanvasContext.globalAlpha).toBe(0.5);
    });

    it("should handle null canvas context", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      
      expect(() => blobRenderer.renderBlobs(null as any, 1100, 800, 600)).not.toThrow();
    });

    it("should skip rendering invisible blobs", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      
      const blob = blobRenderer.activeBlobs.value[0];
      blob.opacity = 0;
      
      blobRenderer.renderBlobs(mockCanvasContext, 1100, 800, 600);
      
      expect(mockCanvasContext.save).not.toHaveBeenCalled();
    });
  });

  describe("blob management", () => {
    it("should clear all blobs", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      blobRenderer.addBlob(200, 200, { name: "Re", emotion: "sad" }, 493, 1100);
      
      expect(blobRenderer.getBlobCount()).toBe(2);
      
      blobRenderer.clearBlobs();
      
      expect(blobRenderer.getBlobCount()).toBe(0);
    });

    it("should remove specific blob", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      blobRenderer.addBlob(200, 200, { name: "Re", emotion: "sad" }, 493, 1100);
      
      const blobToRemove = blobRenderer.activeBlobs.value[0];
      blobRenderer.removeBlob(blobToRemove);
      
      expect(blobRenderer.getBlobCount()).toBe(1);
    });

    it("should start fade out for blob", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      
      const blob = blobRenderer.activeBlobs.value[0];
      blobRenderer.startFadeOut(blob, 1500);
      
      expect(blob.isFadingOut).toBe(true);
      expect(blob.fadeOutStartTime).toBe(1500);
    });

    it("should find blob by note", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      blobRenderer.addBlob(200, 200, { name: "Re", emotion: "sad" }, 493, 1100);
      
      const doBlob = blobRenderer.findBlobByNote("Do");
      const reBlob = blobRenderer.findBlobByNote("Re");
      const missingBlob = blobRenderer.findBlobByNote("Mi");
      
      expect(doBlob).toBeDefined();
      expect(reBlob).toBeDefined();
      expect(missingBlob).toBeUndefined();
    });

    it("should get blobs by area", () => {
      blobRenderer.addBlob(50, 50, { name: "Do", emotion: "happy" }, 440, 1000);
      blobRenderer.addBlob(150, 150, { name: "Re", emotion: "sad" }, 493, 1100);
      blobRenderer.addBlob(250, 250, { name: "Mi", emotion: "joy" }, 523, 1200);
      
      const blobsInArea = blobRenderer.getBlobsInArea(0, 0, 100, 100);
      
      expect(blobsInArea).toHaveLength(1);
      expect(blobsInArea[0].note.name).toBe("Do");
    });
  });

  describe("blob effects", () => {
    it("should create pulsing effect", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      
      const blob = blobRenderer.activeBlobs.value[0];
      const initialScale = blob.scale;
      
      blobRenderer.createPulse(blob, 1100, 2.0, 500);
      
      expect(blob.scale).not.toBe(initialScale);
    });

    it("should create growing effect", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      
      const blob = blobRenderer.activeBlobs.value[0];
      const initialRadius = blob.baseRadius;
      
      blobRenderer.startGrow(blob, 1.5, 500);
      
      expect(blob.baseRadius).toBeGreaterThan(initialRadius);
    });

    it("should create shrinking effect", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      
      const blob = blobRenderer.activeBlobs.value[0];
      const initialRadius = blob.baseRadius;
      
      blobRenderer.startShrink(blob, 0.5, 500);
      
      expect(blob.baseRadius).toBeLessThan(initialRadius);
    });

    it("should create color shift effect", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      
      const blob = blobRenderer.activeBlobs.value[0];
      const initialColor = blob.color;
      
      blobRenderer.shiftColor(blob, "hsla(120, 80%, 60%, 1)", 500);
      
      expect(blob.color).not.toBe(initialColor);
    });
  });

  describe("performance", () => {
    it("should handle many blobs efficiently", () => {
      const startTime = performance.now();
      
      // Add maximum number of blobs
      for (let i = 0; i < 10; i++) {
        blobRenderer.addBlob(i * 80, i * 60, { name: "Do", emotion: "happy" }, 440, 1000);
      }
      
      // Update all blobs
      blobRenderer.updateBlobs(1100, 800, 600);
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50); // Should complete quickly
    });

    it("should remove oldest blobs when at capacity", () => {
      // Fill to capacity
      for (let i = 0; i < 10; i++) {
        blobRenderer.addBlob(i * 80, i * 60, { name: "Do", emotion: "happy" }, 440, 1000 + i);
      }
      
      const oldestBlob = blobRenderer.activeBlobs.value[0];
      
      // Add one more blob
      blobRenderer.addBlob(500, 500, { name: "Re", emotion: "sad" }, 493, 1100);
      
      expect(blobRenderer.getBlobCount()).toBe(10);
      expect(blobRenderer.activeBlobs.value.includes(oldestBlob)).toBe(false);
    });

    it("should efficiently update blob positions", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      
      const blob = blobRenderer.activeBlobs.value[0];
      const initialX = blob.x;
      
      // Multiple updates should be efficient
      for (let i = 0; i < 100; i++) {
        blobRenderer.updateBlobs(1000 + i * 16, 800, 600);
      }
      
      expect(blob.x).not.toBe(initialX);
    });
  });

  describe("configuration", () => {
    it("should respect enabled/disabled state", () => {
      blobRenderer.setEnabled(false);
      
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      
      expect(blobRenderer.getBlobCount()).toBe(0);
    });

    it("should update configuration", () => {
      const newConfig = {
        enabled: true,
        maxBlobs: 5,
        fadeOutTime: 500,
        oscillationSpeed: 1,
        driftSpeed: 0.05,
        baseSizeRatio: 0.1,
        minRadius: 20,
        maxRadius: 100,
      };
      
      blobRenderer.updateConfig(newConfig);
      
      expect(blobRenderer.getMaxBlobs()).toBe(5);
    });

    it("should handle invalid configuration", () => {
      const invalidConfig = {
        enabled: true,
        maxBlobs: -5,
        fadeOutTime: -1000,
        oscillationSpeed: -1,
        driftSpeed: -0.1,
        baseSizeRatio: -0.1,
        minRadius: -20,
        maxRadius: -100,
      };
      
      expect(() => blobRenderer.updateConfig(invalidConfig)).not.toThrow();
    });
  });

  describe("integration", () => {
    it("should work with animation loop", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      
      let timestamp = 1000;
      
      for (let i = 0; i < 60; i++) {
        timestamp += 16;
        blobRenderer.updateBlobs(timestamp, 800, 600);
        blobRenderer.renderBlobs(mockCanvasContext, timestamp, 800, 600);
      }
      
      expect(blobRenderer.getBlobCount()).toBe(1);
    });

    it("should handle rapid blob creation and removal", () => {
      for (let i = 0; i < 50; i++) {
        blobRenderer.addBlob(
          Math.random() * 800,
          Math.random() * 600,
          { name: "Do", emotion: "happy" },
          440,
          1000 + i
        );
        
        if (i % 5 === 0) {
          blobRenderer.updateBlobs(1000 + i, 800, 600);
        }
        
        if (i % 10 === 0) {
          blobRenderer.clearBlobs();
        }
      }
      
      expect(() => blobRenderer.updateBlobs(1100, 800, 600)).not.toThrow();
    });

    it("should handle blob lifecycle correctly", () => {
      blobRenderer.addBlob(100, 100, { name: "Do", emotion: "happy" }, 440, 1000);
      
      const blob = blobRenderer.activeBlobs.value[0];
      
      // Start fade out
      blobRenderer.startFadeOut(blob, 1500);
      
      // Update through fade out
      blobRenderer.updateBlobs(2000, 800, 600); // Mid fade
      expect(blob.opacity).toBeLessThan(1);
      expect(blob.opacity).toBeGreaterThan(0);
      
      // Complete fade out
      blobRenderer.updateBlobs(2600, 800, 600); // After fade out time
      expect(blobRenderer.getBlobCount()).toBe(0);
    });
  });
});