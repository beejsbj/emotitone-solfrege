import { describe, it, expect } from "vitest";
import {
  calculateNoteDuration,
  getDurationDescription,
  stepsFromToneNotation,
} from "@/utils/duration";

describe("Duration Utilities", () => {
  describe("calculateNoteDuration", () => {
    it("should calculate correct duration for 1 step (16th note)", () => {
      const result = calculateNoteDuration(1, 16, 120);
      expect(result.toneNotation).toBe("16n");
      expect(result.seconds).toBe(0.125); // 1/16 of 2 seconds at 120 BPM
      expect(result.fraction).toBe(0.0625); // 1/16
    });

    it("should calculate correct duration for 2 steps (8th note)", () => {
      const result = calculateNoteDuration(2, 16, 120);
      expect(result.toneNotation).toBe("8n");
      expect(result.seconds).toBe(0.25); // 2/16 of 2 seconds
      expect(result.fraction).toBe(0.125); // 2/16
    });

    it("should calculate correct duration for 4 steps (quarter note)", () => {
      const result = calculateNoteDuration(4, 16, 120);
      expect(result.toneNotation).toBe("4n");
      expect(result.seconds).toBe(0.5); // 4/16 of 2 seconds
      expect(result.fraction).toBe(0.25); // 4/16
    });

    it("should calculate correct duration for 8 steps (half note)", () => {
      const result = calculateNoteDuration(8, 16, 120);
      expect(result.toneNotation).toBe("2n");
      expect(result.seconds).toBe(1.0); // 8/16 of 2 seconds
      expect(result.fraction).toBe(0.5); // 8/16
    });

    it("should calculate correct duration for 16 steps (whole note)", () => {
      const result = calculateNoteDuration(16, 16, 120);
      expect(result.toneNotation).toBe("1n");
      expect(result.seconds).toBe(2.0); // 16/16 of 2 seconds
      expect(result.fraction).toBe(1.0); // 16/16
    });

    it("should handle different tempos correctly", () => {
      const slow = calculateNoteDuration(4, 16, 60); // 60 BPM
      const fast = calculateNoteDuration(4, 16, 240); // 240 BPM
      
      expect(slow.seconds).toBe(1.0); // Slower tempo = longer duration
      expect(fast.seconds).toBe(0.25); // Faster tempo = shorter duration
      expect(slow.toneNotation).toBe("4n"); // Same note value
      expect(fast.toneNotation).toBe("4n"); // Same note value
    });

    it("should handle different total steps", () => {
      const result8 = calculateNoteDuration(2, 8, 120);
      const result32 = calculateNoteDuration(2, 32, 120);
      
      expect(result8.fraction).toBe(0.25); // 2/8
      expect(result32.fraction).toBe(0.0625); // 2/32
    });

    it("should default to 16 steps when not specified", () => {
      const result = calculateNoteDuration(4); // No totalSteps provided
      expect(result.fraction).toBe(0.25); // 4/16
    });

    it("should default to 120 BPM when not specified", () => {
      const result = calculateNoteDuration(4, 16); // No tempo provided
      expect(result.seconds).toBe(0.5); // At 120 BPM, quarter note = 0.5 seconds
    });

    it("should handle edge cases", () => {
      // Zero step duration
      const zeroStep = calculateNoteDuration(0, 16, 120);
      expect(zeroStep.toneNotation).toBe("16n");
      expect(zeroStep.seconds).toBe(0);
      expect(zeroStep.fraction).toBe(0);

      // Very large step duration
      const largeStep = calculateNoteDuration(32, 16, 120);
      expect(largeStep.toneNotation).toBe("1n");
      expect(largeStep.seconds).toBe(4.0);
      expect(largeStep.fraction).toBe(2.0);
    });
  });

  describe("getDurationDescription", () => {
    it("should return correct descriptions for standard note values", () => {
      expect(getDurationDescription(1, 16)).toBe("Sixteenth note");
      expect(getDurationDescription(2, 16)).toBe("Eighth note");
      expect(getDurationDescription(4, 16)).toBe("Quarter note");
      expect(getDurationDescription(8, 16)).toBe("Half note");
      expect(getDurationDescription(16, 16)).toBe("Whole note");
    });

    it("should handle edge cases", () => {
      expect(getDurationDescription(0, 16)).toBe("Sixteenth note"); // Division by zero protection
      expect(getDurationDescription(32, 16)).toBe("32 steps"); // Longer than whole note
      expect(getDurationDescription(3, 16)).toBe("Quarter note"); // Between 16th and 8th (3 steps = 16/3 = 5.33, which is >=4)
    });

    it("should work with different total steps", () => {
      expect(getDurationDescription(4, 8)).toBe("Half note"); // 4/8 = 2
      expect(getDurationDescription(2, 8)).toBe("Quarter note"); // 2/8 = 4
    });

    it("should default to 16 steps when not specified", () => {
      expect(getDurationDescription(4)).toBe("Quarter note");
    });
  });

  describe("stepsFromToneNotation", () => {
    it("should convert tone notation to correct step counts", () => {
      expect(stepsFromToneNotation("16n", 16)).toBe(1);
      expect(stepsFromToneNotation("8n", 16)).toBe(2);
      expect(stepsFromToneNotation("4n", 16)).toBe(4);
      expect(stepsFromToneNotation("2n", 16)).toBe(8);
      expect(stepsFromToneNotation("1n", 16)).toBe(16);
    });

    it("should handle different total steps", () => {
      expect(stepsFromToneNotation("4n", 8)).toBe(2); // 8/4 = 2
      expect(stepsFromToneNotation("4n", 32)).toBe(8); // 32/4 = 8
    });

    it("should handle invalid notation", () => {
      expect(stepsFromToneNotation("invalid", 16)).toBe(1); // Default to 1 step
      expect(stepsFromToneNotation("", 16)).toBe(1);
      expect(stepsFromToneNotation("4x", 16)).toBe(1); // Wrong format
    });

    it("should handle numeric edge cases", () => {
      expect(stepsFromToneNotation("32n", 16)).toBe(1); // Minimum 1 step
      expect(stepsFromToneNotation("64n", 16)).toBe(1); // Minimum 1 step
    });

    it("should default to 16 steps when not specified", () => {
      expect(stepsFromToneNotation("4n")).toBe(4);
    });
  });

  describe("Integration tests", () => {
    it("should maintain consistency between conversion functions", () => {
      const originalSteps = 4;
      const totalSteps = 16;
      const tempo = 120;
      
      // Calculate duration
      const duration = calculateNoteDuration(originalSteps, totalSteps, tempo);
      
      // Convert back to steps
      const convertedSteps = stepsFromToneNotation(duration.toneNotation, totalSteps);
      
      expect(convertedSteps).toBe(originalSteps);
    });

    it("should handle round-trip conversion for all standard note values", () => {
      const testCases = [1, 2, 4, 8, 16];
      
      testCases.forEach(steps => {
        const duration = calculateNoteDuration(steps, 16, 120);
        const convertedSteps = stepsFromToneNotation(duration.toneNotation, 16);
        expect(convertedSteps).toBe(steps);
      });
    });
  });
});