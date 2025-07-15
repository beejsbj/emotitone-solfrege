import { describe, it, expect } from "vitest";
import {
  mapFrequencyToValue,
  createFontWeightMapping,
  createVisualFrequency,
  clamp,
  createOscillation,
  createStringDamping,
  createHarmonicVibration,
  calculateBlobSize,
  createParticleProperties,
} from "@/utils/visualEffects";
import type { FrequencyMapping, VisualEffectsConfig } from "@/types/visual";

describe("Visual Effects Utilities", () => {
  describe("mapFrequencyToValue", () => {
    const testMapping: FrequencyMapping = {
      minFreq: 200,
      maxFreq: 600,
      minValue: 100,
      maxValue: 900,
    };

    it("should map minimum frequency to minimum value", () => {
      const result = mapFrequencyToValue(200, testMapping);
      expect(result).toBe(100);
    });

    it("should map maximum frequency to maximum value", () => {
      const result = mapFrequencyToValue(600, testMapping);
      expect(result).toBe(900);
    });

    it("should map middle frequency to middle value", () => {
      const result = mapFrequencyToValue(400, testMapping);
      expect(result).toBe(500);
    });

    it("should clamp frequencies below minimum", () => {
      const result = mapFrequencyToValue(100, testMapping);
      expect(result).toBe(100);
    });

    it("should clamp frequencies above maximum", () => {
      const result = mapFrequencyToValue(800, testMapping);
      expect(result).toBe(900);
    });

    it("should handle linear interpolation correctly", () => {
      const result = mapFrequencyToValue(300, testMapping); // 25% of range
      expect(result).toBe(300); // 25% of output range (100 + 200)
    });

    it("should round to nearest integer", () => {
      const mapping: FrequencyMapping = {
        minFreq: 200,
        maxFreq: 600,
        minValue: 100,
        maxValue: 101,
      };
      const result = mapFrequencyToValue(333, mapping); // Should be 100.33, rounded
      expect(result).toBe(100);
    });

    it("should handle zero range", () => {
      const mapping: FrequencyMapping = {
        minFreq: 400,
        maxFreq: 400,
        minValue: 500,
        maxValue: 500,
      };
      const result = mapFrequencyToValue(400, mapping);
      expect(result).toBe(500);
    });
  });

  describe("createFontWeightMapping", () => {
    it("should use config when provided", () => {
      const config: VisualEffectsConfig = {
        frequencyMapping: {
          minFreq: 100,
          maxFreq: 800,
          minValue: 300,
          maxValue: 900,
        },
        // Add other required properties
        blobs: {
          baseSizeRatio: 0.2,
          minSize: 50,
          maxSize: 200,
        },
        particles: {
          sizeMin: 2,
          sizeMax: 8,
          speed: 100,
          lifetimeMin: 1000,
          lifetimeMax: 3000,
        },
      };

      const mapping = createFontWeightMapping(config);
      expect(mapping.minFreq).toBe(100);
      expect(mapping.maxFreq).toBe(800);
      expect(mapping.minValue).toBe(300);
      expect(mapping.maxValue).toBe(900);
    });

    it("should use default values when no config provided", () => {
      const mapping = createFontWeightMapping();
      expect(mapping.minFreq).toBe(200);
      expect(mapping.maxFreq).toBe(600);
      expect(mapping.minValue).toBe(400);
      expect(mapping.maxValue).toBe(700);
    });

    it("should use default values when undefined config provided", () => {
      const mapping = createFontWeightMapping(undefined);
      expect(mapping.minFreq).toBe(200);
      expect(mapping.maxFreq).toBe(600);
      expect(mapping.minValue).toBe(400);
      expect(mapping.maxValue).toBe(700);
    });
  });

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

  describe("clamp", () => {
    it("should return value when within bounds", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it("should clamp to minimum when below bounds", () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(-100, 0, 10)).toBe(0);
    });

    it("should clamp to maximum when above bounds", () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(100, 0, 10)).toBe(10);
    });

    it("should handle negative bounds", () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(-15, -10, -1)).toBe(-10);
      expect(clamp(0, -10, -1)).toBe(-1);
    });

    it("should handle equal min and max", () => {
      expect(clamp(5, 10, 10)).toBe(10);
      expect(clamp(15, 10, 10)).toBe(10);
    });
  });

  describe("createOscillation", () => {
    it("should return base value at phase 0", () => {
      const result = createOscillation(0, 1, 10, 50);
      expect(result).toBeCloseTo(50, 5);
    });

    it("should oscillate around base value", () => {
      const baseValue = 100;
      const amplitude = 20;
      const frequency = 1;
      
      const result1 = createOscillation(0.25, frequency, amplitude, baseValue);
      const result2 = createOscillation(0.75, frequency, amplitude, baseValue);
      
      expect(result1).toBeCloseTo(baseValue + amplitude, 1);
      expect(result2).toBeCloseTo(baseValue - amplitude, 1);
    });

    it("should handle phase offset", () => {
      const result1 = createOscillation(0, 1, 10, 50, 0);
      const result2 = createOscillation(0, 1, 10, 50, Math.PI);
      
      expect(result1).toBeCloseTo(50, 5);
      expect(result2).toBeCloseTo(50, 5); // 180° phase shift at t=0
    });

    it("should handle different frequencies", () => {
      const baseValue = 100;
      const amplitude = 20;
      
      const slowOsc = createOscillation(0.5, 0.5, amplitude, baseValue);
      const fastOsc = createOscillation(0.5, 2, amplitude, baseValue);
      
      // Different frequencies should give different results
      expect(slowOsc).not.toBeCloseTo(fastOsc, 1);
    });

    it("should handle zero amplitude", () => {
      const result = createOscillation(1, 2, 0, 75);
      expect(result).toBe(75);
    });

    it("should handle negative amplitude", () => {
      const result1 = createOscillation(0.25, 1, 10, 50);
      const result2 = createOscillation(0.25, 1, -10, 50);
      
      expect(result1).toBeCloseTo(60, 1);
      expect(result2).toBeCloseTo(40, 1);
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

    it("should handle edge cases", () => {
      expect(createStringDamping(-0.1)).toBeCloseTo(0, 1); // Negative values
      expect(createStringDamping(1.1)).toBeCloseTo(0, 1); // Values > 1
    });
  });

  describe("createHarmonicVibration", () => {
    it("should return non-zero vibration", () => {
      const result = createHarmonicVibration(1, 2, 10, 100);
      expect(result).not.toBe(0);
    });

    it("should vary with time", () => {
      const result1 = createHarmonicVibration(0, 2, 10, 100);
      const result2 = createHarmonicVibration(1, 2, 10, 100);
      
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

  describe("calculateBlobSize", () => {
    const testConfig: VisualEffectsConfig = {
      frequencyMapping: {
        minFreq: 200,
        maxFreq: 600,
        minValue: 400,
        maxValue: 700,
      },
      blobs: {
        baseSizeRatio: 0.2,
        minSize: 50,
        maxSize: 200,
      },
      particles: {
        sizeMin: 2,
        sizeMax: 8,
        speed: 100,
        lifetimeMin: 1000,
        lifetimeMax: 3000,
      },
    };

    it("should calculate size based on screen dimensions", () => {
      const size = calculateBlobSize(800, 600, testConfig);
      expect(size).toBe(120); // min(800, 600) * 0.2 = 120
    });

    it("should use minimum screen dimension", () => {
      const size1 = calculateBlobSize(1000, 500, testConfig);
      const size2 = calculateBlobSize(500, 1000, testConfig);
      
      expect(size1).toBe(100); // 500 * 0.2
      expect(size2).toBe(100); // 500 * 0.2
    });

    it("should respect minimum size limit", () => {
      const size = calculateBlobSize(100, 100, testConfig);
      expect(size).toBe(50); // max(20, 50) = 50
    });

    it("should respect maximum size limit", () => {
      const size = calculateBlobSize(2000, 2000, testConfig);
      expect(size).toBe(200); // min(400, 200) = 200
    });

    it("should handle zero screen dimensions", () => {
      const size = calculateBlobSize(0, 0, testConfig);
      expect(size).toBe(50); // Should fallback to minimum
    });

    it("should handle different ratios", () => {
      const configSmall = {
        ...testConfig,
        blobs: {
          ...testConfig.blobs,
          baseSizeRatio: 0.1,
        },
      };
      
      const configLarge = {
        ...testConfig,
        blobs: {
          ...testConfig.blobs,
          baseSizeRatio: 0.5,
        },
      };
      
      const sizeSmall = calculateBlobSize(400, 400, configSmall);
      const sizeLarge = calculateBlobSize(400, 400, configLarge);
      
      expect(sizeSmall).toBe(50); // 40 clamped to min 50
      expect(sizeLarge).toBe(200); // 200 exactly
    });
  });

  describe("createParticleProperties", () => {
    const testConfig: VisualEffectsConfig = {
      frequencyMapping: {
        minFreq: 200,
        maxFreq: 600,
        minValue: 400,
        maxValue: 700,
      },
      blobs: {
        baseSizeRatio: 0.2,
        minSize: 50,
        maxSize: 200,
      },
      particles: {
        sizeMin: 2,
        sizeMax: 8,
        speed: 100,
        lifetimeMin: 1000,
        lifetimeMax: 3000,
      },
    };

    it("should create particle properties within configured ranges", () => {
      const props = createParticleProperties(testConfig);
      
      expect(props.size).toBeGreaterThanOrEqual(2);
      expect(props.size).toBeLessThanOrEqual(8);
      expect(props.lifetime).toBeGreaterThanOrEqual(1000);
      expect(props.lifetime).toBeLessThanOrEqual(3000);
    });

    it("should create velocity within speed range", () => {
      const props = createParticleProperties(testConfig);
      
      expect(props.velocity.x).toBeGreaterThanOrEqual(-50);
      expect(props.velocity.x).toBeLessThanOrEqual(50);
      expect(props.velocity.y).toBeGreaterThanOrEqual(-50);
      expect(props.velocity.y).toBeLessThanOrEqual(50);
    });

    it("should create different properties each time", () => {
      const props1 = createParticleProperties(testConfig);
      const props2 = createParticleProperties(testConfig);
      
      // Very unlikely to get identical random values
      expect(props1.size).not.toBe(props2.size);
      expect(props1.lifetime).not.toBe(props2.lifetime);
    });

    it("should handle edge case configurations", () => {
      const edgeConfig = {
        ...testConfig,
        particles: {
          sizeMin: 5,
          sizeMax: 5,
          speed: 0,
          lifetimeMin: 2000,
          lifetimeMax: 2000,
        },
      };
      
      const props = createParticleProperties(edgeConfig);
      
      expect(props.size).toBe(5);
      expect(props.lifetime).toBe(2000);
      expect(props.velocity.x).toBe(0);
      expect(props.velocity.y).toBe(0);
    });

    it("should handle inverted min/max values gracefully", () => {
      const invertedConfig = {
        ...testConfig,
        particles: {
          sizeMin: 8,
          sizeMax: 2,
          speed: 100,
          lifetimeMin: 3000,
          lifetimeMax: 1000,
        },
      };
      
      const props = createParticleProperties(invertedConfig);
      
      // Should still create valid properties (Math.random handles negative ranges)
      expect(typeof props.size).toBe("number");
      expect(typeof props.lifetime).toBe("number");
    });
  });

  describe("Integration tests", () => {
    it("should work together for frequency-based effects", () => {
      const frequency = 440; // A4
      const mapping = createFontWeightMapping();
      
      const fontWeight = mapFrequencyToValue(frequency, mapping);
      const visualFreq = createVisualFrequency(frequency);
      const oscillation = createOscillation(1, visualFreq, 10, fontWeight);
      
      expect(fontWeight).toBeGreaterThan(0);
      expect(visualFreq).toBeGreaterThan(0);
      expect(oscillation).toBeGreaterThan(0);
    });

    it("should create coherent visual effects", () => {
      const config: VisualEffectsConfig = {
        frequencyMapping: {
          minFreq: 200,
          maxFreq: 600,
          minValue: 400,
          maxValue: 700,
        },
        blobs: {
          baseSizeRatio: 0.2,
          minSize: 50,
          maxSize: 200,
        },
        particles: {
          sizeMin: 2,
          sizeMax: 8,
          speed: 100,
          lifetimeMin: 1000,
          lifetimeMax: 3000,
        },
      };
      
      const blobSize = calculateBlobSize(800, 600, config);
      const particleProps = createParticleProperties(config);
      const damping = createStringDamping(0.5);
      
      expect(blobSize).toBeGreaterThan(0);
      expect(particleProps.size).toBeGreaterThan(0);
      expect(damping).toBeGreaterThan(0);
    });
  });
});