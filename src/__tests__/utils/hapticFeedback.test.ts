import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  triggerHapticFeedback,
  triggerNoteHaptic,
  triggerControlHaptic,
  triggerUIHaptic,
  type HapticIntensity,
} from "@/utils/hapticFeedback";

describe("Haptic Feedback Utilities", () => {
  // Mock navigator.vibrate
  const mockVibrate = vi.fn();
  const originalNavigator = { ...navigator };
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(navigator, 'vibrate', {
      value: originalNavigator.vibrate,
      writable: true,
      configurable: true,
    });
    
    // Clean up window.hapticFeedback
    delete (window as any).hapticFeedback;
  });

  describe("triggerHapticFeedback", () => {
    it("should trigger vibration with lighter intensity by default", () => {
      triggerHapticFeedback();
      expect(mockVibrate).toHaveBeenCalledWith([10]);
    });

    it("should trigger vibration with light intensity", () => {
      triggerHapticFeedback("light");
      expect(mockVibrate).toHaveBeenCalledWith([50]);
    });

    it("should trigger vibration with medium intensity", () => {
      triggerHapticFeedback("medium");
      expect(mockVibrate).toHaveBeenCalledWith([70]);
    });

    it("should trigger vibration with heavy intensity", () => {
      triggerHapticFeedback("heavy");
      expect(mockVibrate).toHaveBeenCalledWith([100]);
    });

    it("should trigger vibration with string pattern", () => {
      triggerHapticFeedback("string");
      expect(mockVibrate).toHaveBeenCalledWith([20, 10, 20, 10]);
    });

    it("should handle missing vibrate API gracefully", () => {
      // Remove vibrate from navigator
      delete (navigator as any).vibrate;
      
      expect(() => triggerHapticFeedback("light")).not.toThrow();
      expect(mockVibrate).not.toHaveBeenCalled();
    });

    it("should use advanced haptic feedback when available", () => {
      const mockHapticFeedback = {
        impact: vi.fn(),
      };
      
      (window as any).hapticFeedback = mockHapticFeedback;
      
      triggerHapticFeedback("medium");
      
      expect(mockHapticFeedback.impact).toHaveBeenCalledWith("medium");
      expect(mockVibrate).toHaveBeenCalledWith([70]); // Should still call vibrate as well
    });

    it("should fallback to vibration when advanced haptic feedback fails", () => {
      const mockHapticFeedback = {
        impact: vi.fn().mockImplementation(() => {
          throw new Error("Haptic feedback failed");
        }),
      };
      
      (window as any).hapticFeedback = mockHapticFeedback;
      
      // Mock console.debug to verify fallback message
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      
      triggerHapticFeedback("heavy");
      
      expect(mockHapticFeedback.impact).toHaveBeenCalledWith("heavy");
      expect(mockVibrate).toHaveBeenCalledWith([100]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Advanced haptic feedback not available, using vibration fallback"
      );
      
      consoleSpy.mockRestore();
    });

    it("should work with all intensity types", () => {
      const intensities: HapticIntensity[] = ["lighter", "light", "medium", "heavy", "string"];
      const expectedPatterns = [
        [10],
        [50],
        [70],
        [100],
        [20, 10, 20, 10],
      ];
      
      intensities.forEach((intensity, index) => {
        mockVibrate.mockClear();
        triggerHapticFeedback(intensity);
        expect(mockVibrate).toHaveBeenCalledWith(expectedPatterns[index]);
      });
    });
  });

  describe("triggerNoteHaptic", () => {
    it("should trigger light intensity haptic feedback", () => {
      triggerNoteHaptic();
      expect(mockVibrate).toHaveBeenCalledWith([50]);
    });

    it("should work with advanced haptic feedback", () => {
      const mockHapticFeedback = {
        impact: vi.fn(),
      };
      
      (window as any).hapticFeedback = mockHapticFeedback;
      
      triggerNoteHaptic();
      
      expect(mockHapticFeedback.impact).toHaveBeenCalledWith("light");
    });
  });

  describe("triggerControlHaptic", () => {
    it("should trigger medium intensity haptic feedback", () => {
      triggerControlHaptic();
      expect(mockVibrate).toHaveBeenCalledWith([70]);
    });

    it("should work with advanced haptic feedback", () => {
      const mockHapticFeedback = {
        impact: vi.fn(),
      };
      
      (window as any).hapticFeedback = mockHapticFeedback;
      
      triggerControlHaptic();
      
      expect(mockHapticFeedback.impact).toHaveBeenCalledWith("medium");
    });
  });

  describe("triggerUIHaptic", () => {
    it("should trigger lighter intensity haptic feedback", () => {
      triggerUIHaptic();
      expect(mockVibrate).toHaveBeenCalledWith([10]);
    });

    it("should work with advanced haptic feedback", () => {
      const mockHapticFeedback = {
        impact: vi.fn(),
      };
      
      (window as any).hapticFeedback = mockHapticFeedback;
      
      triggerUIHaptic();
      
      expect(mockHapticFeedback.impact).toHaveBeenCalledWith("lighter");
    });
  });

  describe("Browser compatibility", () => {
    it("should handle different browser implementations", () => {
      // Test with different navigator implementations
      const testCases = [
        {
          name: "Chrome/Firefox",
          setup: () => {
            Object.defineProperty(navigator, 'vibrate', {
              value: mockVibrate,
              writable: true,
              configurable: true,
            });
          },
        },
        {
          name: "Safari without vibrate",
          setup: () => {
            delete (navigator as any).vibrate;
          },
        },
        {
          name: "IE/Edge with msMaxTouchPoints",
          setup: () => {
            (navigator as any).msMaxTouchPoints = 1;
          },
        },
      ];

      testCases.forEach(({ name, setup }) => {
        setup();
        expect(() => triggerHapticFeedback("light")).not.toThrow();
      });
    });

    it("should handle undefined window.hapticFeedback gracefully", () => {
      (window as any).hapticFeedback = undefined;
      
      expect(() => triggerHapticFeedback("medium")).not.toThrow();
      expect(mockVibrate).toHaveBeenCalledWith([70]);
    });

    it("should handle null window.hapticFeedback gracefully", () => {
      (window as any).hapticFeedback = null;
      
      expect(() => triggerHapticFeedback("heavy")).not.toThrow();
      expect(mockVibrate).toHaveBeenCalledWith([100]);
    });
  });

  describe("Integration tests", () => {
    it("should provide different feedback for different contexts", () => {
      // Test that each context provides different feedback
      triggerUIHaptic();
      expect(mockVibrate).toHaveBeenLastCalledWith([10]);
      
      triggerNoteHaptic();
      expect(mockVibrate).toHaveBeenLastCalledWith([50]);
      
      triggerControlHaptic();
      expect(mockVibrate).toHaveBeenLastCalledWith([70]);
    });

    it("should work consistently across multiple calls", () => {
      // Test that multiple calls work consistently
      for (let i = 0; i < 5; i++) {
        triggerNoteHaptic();
        expect(mockVibrate).toHaveBeenCalledWith([50]);
      }
      
      expect(mockVibrate).toHaveBeenCalledTimes(5);
    });

    it("should handle rapid successive calls", () => {
      // Test rapid successive calls
      triggerNoteHaptic();
      triggerControlHaptic();
      triggerUIHaptic();
      
      expect(mockVibrate).toHaveBeenCalledTimes(3);
      expect(mockVibrate).toHaveBeenNthCalledWith(1, [50]);
      expect(mockVibrate).toHaveBeenNthCalledWith(2, [70]);
      expect(mockVibrate).toHaveBeenNthCalledWith(3, [10]);
    });

    it("should work with both vibration and advanced haptic feedback", () => {
      const mockHapticFeedback = {
        impact: vi.fn(),
      };
      
      (window as any).hapticFeedback = mockHapticFeedback;
      
      // Test all context functions
      triggerUIHaptic();
      triggerNoteHaptic();
      triggerControlHaptic();
      
      // Should call both vibration and advanced haptic feedback
      expect(mockVibrate).toHaveBeenCalledTimes(3);
      expect(mockHapticFeedback.impact).toHaveBeenCalledTimes(3);
      
      expect(mockHapticFeedback.impact).toHaveBeenNthCalledWith(1, "lighter");
      expect(mockHapticFeedback.impact).toHaveBeenNthCalledWith(2, "light");
      expect(mockHapticFeedback.impact).toHaveBeenNthCalledWith(3, "medium");
    });
  });

  describe("Error handling", () => {
    it("should handle vibrate API throwing errors", () => {
      Object.defineProperty(navigator, 'vibrate', {
        value: vi.fn().mockImplementation(() => {
          throw new Error("Vibration not supported");
        }),
        writable: true,
        configurable: true,
      });
      
      expect(() => triggerHapticFeedback("light")).not.toThrow();
    });

    it("should handle vibrate API returning false", () => {
      Object.defineProperty(navigator, 'vibrate', {
        value: vi.fn().mockReturnValue(false),
        writable: true,
        configurable: true,
      });
      
      expect(() => triggerHapticFeedback("medium")).not.toThrow();
    });

    it("should handle malformed haptic feedback object", () => {
      (window as any).hapticFeedback = {
        // Missing impact method
      };
      
      expect(() => triggerHapticFeedback("heavy")).not.toThrow();
      expect(mockVibrate).toHaveBeenCalledWith([100]);
    });
  });
});