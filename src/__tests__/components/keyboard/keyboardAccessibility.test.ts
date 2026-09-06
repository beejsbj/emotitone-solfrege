import { describe, expect, it } from "vitest";
import {
  accessiblePitch,
  accessibleScaleDegree,
} from "@/components/compounds/keyboardAccessibility";

describe("keyboard accessible musical labels", () => {
  it("speaks scale indexes as one-based words", () => {
    expect(accessibleScaleDegree(0)).toBe("one");
    expect(accessibleScaleDegree(6)).toBe("seven");
    expect(accessibleScaleDegree(11)).toBe("twelve");
  });

  it("normalizes sharp, flat, and octave spellings for speech", () => {
    expect(accessiblePitch("C#4")).toBe("C sharp four");
    expect(accessiblePitch("D♭4")).toBe("D flat four");
    expect(accessiblePitch("F##5")).toBe("F double sharp five");
    expect(accessiblePitch("B♭-1")).toBe("B flat minus one");
  });
});
