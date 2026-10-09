import { describe, it, expect } from "vitest";
import {
  createVisualFrequency,
  createStringDamping,
  createHarmonicVibration,
} from "@/utils/visualEffects";

describe("Visual Effects Utilities", () => {
  describe("createVisualFrequency", () => {
    it("should divide audio frequency by default divisor", () => {
      const result = createVisualFrequency(1000);
      expect(result).toBe(10); // 1000 / 100
    });

    it("should divide audio frequency by custom divisor", () => {
      const result = createVisualFrequency(1000, 200);
      expect(result).toBe(5); // 1000 / 200
    });

    it("should handle zero frequency", () => {
      const result = createVisualFrequency(0);
      expect(result).toBe(0);
    });

    it("should handle fractional results", () => {
      const result = createVisualFrequency(333, 100);
      expect(result).toBe(3.33);
    });
  });

  describe("createStringDamping", () => {
    it("should return 0 at endpoints", () => {
      expect(createStringDamping(0)).toBeCloseTo(0, 5);
      expect(createStringDamping(1)).toBeCloseTo(0, 5);
    });

    it("should return maximum at center", () => {
      expect(createStringDamping(0.5)).toBeCloseTo(1, 5);
    });

    it("should be symmetric around center", () => {
      expect(createStringDamping(0.25)).toBeCloseTo(createStringDamping(0.75), 5);
      expect(createStringDamping(0.1)).toBeCloseTo(createStringDamping(0.9), 5);
    });

    it("should approach zero near the string endpoints", () => {
      const nearStart = createStringDamping(0.01);
      const nearEnd = createStringDamping(0.99);
      expect(nearStart).toBeGreaterThan(0);
      expect(nearStart).toBeLessThan(0.05);
      expect(nearEnd).toBeGreaterThan(0);
      expect(nearEnd).toBeLessThan(0.05);
    });
  });

  describe("createHarmonicVibration", () => {
    it("should return non-zero vibration", () => {
      const result = createHarmonicVibration(1, 2, 10, 100);
      expect(result).not.toBe(0);
    });

    it("should vary with time", () => {
      const result1 = createHarmonicVibration(0, 2, 10, 100);
      const result2 = createHarmonicVibration(0.125, 2, 10, 100); // Quarter period at 2 Hz
      
      expect(result1).not.toBeCloseTo(result2, 1);
    });

    it("should vary with position", () => {
      const result1 = createHarmonicVibration(1, 2, 10, 0);
      const result2 = createHarmonicVibration(1, 2, 10, 100);
      
      expect(result1).not.toBeCloseTo(result2, 1);
    });

    it("should scale with amplitude", () => {
      const result1 = createHarmonicVibration(1, 2, 5, 100);
      const result2 = createHarmonicVibration(1, 2, 10, 100);
      
      expect(Math.abs(result2)).toBeGreaterThan(Math.abs(result1));
    });

    it("should handle zero amplitude", () => {
      const result = createHarmonicVibration(1, 2, 0, 100);
      expect(result).toBe(0);
    });

    it("should handle phase offset", () => {
      const result1 = createHarmonicVibration(1, 2, 10, 100, 0);
      const result2 = createHarmonicVibration(1, 2, 10, 100, Math.PI);
      
      expect(result1).not.toBeCloseTo(result2, 1);
    });
  });
});
