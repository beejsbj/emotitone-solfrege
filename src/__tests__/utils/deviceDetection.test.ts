import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isTouchDevice,
  isMobileDevice,
  isDesktopDevice,
  hasPhysicalKeyboard,
  getDeviceType,
  shouldShowKeyboardShortcuts,
} from "@/utils/deviceDetection";

describe("Device Detection Utilities", () => {
  // Mock window properties
  const originalWindow = { ...window };
  const originalNavigator = { ...navigator };

  beforeEach(() => {
    // Reset window properties
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768
    });
    
    // Reset navigator properties
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0
    });
    
    // Remove touch event support
    delete (window as any).ontouchstart;
    delete (navigator as any).msMaxTouchPoints;
  });

  afterEach(() => {
    // Restore original properties
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalWindow.innerWidth
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalWindow.innerHeight
    });
    
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: originalNavigator.maxTouchPoints
    });
  });

  describe("isTouchDevice", () => {
    it("should detect touch device with ontouchstart", () => {
      (window as any).ontouchstart = {};
      expect(isTouchDevice()).toBe(true);
    });

    it("should detect touch device with maxTouchPoints", () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 1
      });
      expect(isTouchDevice()).toBe(true);
    });

    it("should detect touch device with msMaxTouchPoints", () => {
      (navigator as any).msMaxTouchPoints = 1;
      expect(isTouchDevice()).toBe(true);
    });

    it("should return false for non-touch devices", () => {
      expect(isTouchDevice()).toBe(false);
    });

    it("should handle undefined msMaxTouchPoints", () => {
      (navigator as any).msMaxTouchPoints = undefined;
      expect(isTouchDevice()).toBe(false);
    });
  });

  describe("isMobileDevice", () => {
    it("should detect mobile device with small screen", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600
      });
      expect(isMobileDevice()).toBe(true);
    });

    it("should detect mobile device with touch on medium screen", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 900
      });
      (window as any).ontouchstart = {};
      expect(isMobileDevice()).toBe(true);
    });

    it("should not detect mobile on large screen without touch", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200
      });
      expect(isMobileDevice()).toBe(false);
    });

    it("should not detect mobile on large touch screen", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200
      });
      (window as any).ontouchstart = {};
      expect(isMobileDevice()).toBe(false);
    });

    it("should handle edge case at 768px", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });
      expect(isMobileDevice()).toBe(true);
    });

    it("should handle edge case at 1024px with touch", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });
      (window as any).ontouchstart = {};
      expect(isMobileDevice()).toBe(true);
    });
  });

  describe("isDesktopDevice", () => {
    it("should detect desktop device", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200
      });
      expect(isDesktopDevice()).toBe(true);
    });

    it("should not detect desktop on mobile", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600
      });
      expect(isDesktopDevice()).toBe(false);
    });

    it("should be inverse of isMobileDevice", () => {
      const testCases = [
        { width: 600, touch: false },
        { width: 900, touch: true },
        { width: 1200, touch: false },
        { width: 1200, touch: true },
      ];

      testCases.forEach(({ width, touch }) => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width
        });
        if (touch) {
          (window as any).ontouchstart = {};
        } else {
          delete (window as any).ontouchstart;
        }
        
        expect(isDesktopDevice()).toBe(!isMobileDevice());
      });
    });
  });

  describe("hasPhysicalKeyboard", () => {
    it("should detect physical keyboard on desktop", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200
      });
      expect(hasPhysicalKeyboard()).toBe(true);
    });

    it("should not detect physical keyboard on mobile", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600
      });
      expect(hasPhysicalKeyboard()).toBe(false);
    });

    it("should detect physical keyboard on large screen without touch", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200
      });
      expect(hasPhysicalKeyboard()).toBe(true);
    });

    it("should not detect physical keyboard on large touch screen", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200
      });
      (window as any).ontouchstart = {};
      expect(hasPhysicalKeyboard()).toBe(false);
    });
  });

  describe("getDeviceType", () => {
    it("should return 'mobile' for small screens", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600
      });
      expect(getDeviceType()).toBe("mobile");
    });

    it("should return 'tablet' for medium touch screens", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 900
      });
      (window as any).ontouchstart = {};
      expect(getDeviceType()).toBe("tablet");
    });

    it("should return 'desktop' for large screens", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200
      });
      expect(getDeviceType()).toBe("desktop");
    });

    it("should return 'desktop' for medium screens without touch", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 900
      });
      expect(getDeviceType()).toBe("desktop");
    });

    it("should handle edge cases", () => {
      // Exactly 768px
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });
      expect(getDeviceType()).toBe("mobile");

      // Exactly 1024px with touch
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });
      (window as any).ontouchstart = {};
      expect(getDeviceType()).toBe("tablet");

      // Exactly 1024px without touch
      delete (window as any).ontouchstart;
      expect(getDeviceType()).toBe("desktop");
    });
  });

  describe("shouldShowKeyboardShortcuts", () => {
    it("should show keyboard shortcuts on desktop", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200
      });
      expect(shouldShowKeyboardShortcuts()).toBe(true);
    });

    it("should not show keyboard shortcuts on mobile", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600
      });
      expect(shouldShowKeyboardShortcuts()).toBe(false);
    });

    it("should match hasPhysicalKeyboard result", () => {
      const testCases = [
        { width: 600, touch: false },
        { width: 900, touch: true },
        { width: 1200, touch: false },
      ];

      testCases.forEach(({ width, touch }) => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width
        });
        if (touch) {
          (window as any).ontouchstart = {};
        } else {
          delete (window as any).ontouchstart;
        }
        
        expect(shouldShowKeyboardShortcuts()).toBe(hasPhysicalKeyboard());
      });
    });
  });

  describe("Integration tests", () => {
    it("should maintain consistency between device detection functions", () => {
      const testCases = [
        { width: 600, touch: false, expectedType: "mobile" },
        { width: 900, touch: true, expectedType: "tablet" },
        { width: 1200, touch: false, expectedType: "desktop" },
      ];

      testCases.forEach(({ width, touch, expectedType }) => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width
        });
        if (touch) {
          (window as any).ontouchstart = {};
        } else {
          delete (window as any).ontouchstart;
        }
        
        expect(getDeviceType()).toBe(expectedType);
        expect(isDesktopDevice()).toBe(expectedType === "desktop");
        expect(isMobileDevice()).toBe(expectedType === "mobile" || expectedType === "tablet");
      });
    });

    it("should handle dynamic screen resize", () => {
      // Start with mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600
      });
      expect(getDeviceType()).toBe("mobile");

      // Resize to tablet
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 900
      });
      (window as any).ontouchstart = {};
      expect(getDeviceType()).toBe("tablet");

      // Resize to desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200
      });
      delete (window as any).ontouchstart;
      expect(getDeviceType()).toBe("desktop");
    });
  });
});