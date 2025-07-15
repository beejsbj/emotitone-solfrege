import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { usePalette } from "@/composables/palette/usePalette";
import { createTestPinia } from "@/helpers/test-utils";

// Mock dependencies
vi.mock("@/stores/music", () => ({
  useMusicStore: vi.fn(() => ({
    currentKey: "C",
    currentMode: "major",
    currentOctave: 4,
    solfege: Array.from({ length: 7 }, (_, i) => ({
      name: ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"][i],
      number: i + 1,
      emotion: "happy",
      description: `Note ${i + 1}`,
      fleckShape: "circle",
      texture: "smooth",
    })),
    playNote: vi.fn(),
    releaseNote: vi.fn(),
    updateOctave: vi.fn(),
  })),
}));

vi.mock("@/composables/palette/useLayout", () => ({
  usePaletteLayout: vi.fn(() => ({
    calculateNotePosition: vi.fn(() => ({ x: 100, y: 100, width: 80, height: 60 })),
    calculateControlPosition: vi.fn(() => ({ x: 50, y: 20, width: 40, height: 20 })),
    updateLayout: vi.fn(),
    getNoteAtPosition: vi.fn(),
    getControlAtPosition: vi.fn(),
  })),
}));

vi.mock("@/composables/palette/useAnimation", () => ({
  usePaletteAnimation: vi.fn(() => ({
    startNoteAnimation: vi.fn(),
    stopNoteAnimation: vi.fn(),
    updateAnimations: vi.fn(),
    clearAnimations: vi.fn(),
    isAnimating: ref(false),
  })),
}));

vi.mock("@/composables/palette/useRenderer", () => ({
  usePaletteRenderer: vi.fn(() => ({
    renderPalette: vi.fn(),
    renderNote: vi.fn(),
    renderControls: vi.fn(),
    clearCanvas: vi.fn(),
  })),
}));

vi.mock("@/composables/palette/useInteraction", () => ({
  usePaletteInteraction: vi.fn(() => ({
    handleTouchStart: vi.fn(),
    handleTouchMove: vi.fn(),
    handleTouchEnd: vi.fn(),
    handleMouseDown: vi.fn(),
    handleMouseMove: vi.fn(),
    handleMouseUp: vi.fn(),
    setupEventListeners: vi.fn(),
    removeEventListeners: vi.fn(),
  })),
}));

vi.mock("@/composables/palette/index", () => ({
  PALETTE_STYLES: {
    dimensions: {
      controlsHeight: 20,
      buttonGap: 4,
      sustainHooksHeight: 24,
    },
  },
}));

describe("usePalette", () => {
  let palette: ReturnType<typeof usePalette>;
  let mockKeyboardLetterFunction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
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

    mockKeyboardLetterFunction = vi.fn((solfegeIndex: number, octave: number) => {
      const letters = ["A", "S", "D", "F", "G", "H", "J"];
      return letters[solfegeIndex] || null;
    });

    palette = usePalette(mockKeyboardLetterFunction);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with correct default state", () => {
      expect(palette.paletteState.value.x).toBe(0);
      expect(palette.paletteState.value.y).toBe(0);
      expect(palette.paletteState.value.width).toBe(800);
      expect(palette.paletteState.value.height).toBe(264);
      expect(palette.paletteState.value.mainOctave).toBe(4);
      expect(palette.paletteState.value.isDragging).toBe(false);
      expect(palette.paletteState.value.isResizing).toBe(false);
    });

    it("should initialize with empty active touches", () => {
      expect(palette.paletteState.value.activeTouches.size).toBe(0);
    });

    it("should initialize with empty sustain hooks", () => {
      expect(palette.paletteState.value.activeSustainHooks.size).toBe(0);
    });

    it("should initialize with correct control dimensions", () => {
      expect(palette.paletteState.value.controlsHeight).toBe(20);
      expect(palette.paletteState.value.buttonGap).toBe(4);
      expect(palette.paletteState.value.sustainHooksHeight).toBe(24);
    });
  });

  describe("keyboard letter function", () => {
    it("should handle keyboard letter function correctly", () => {
      const result = palette.getKeyboardLetter(0, 4);
      expect(result).toBe("A");
      expect(mockKeyboardLetterFunction).toHaveBeenCalledWith(0, 4);
    });

    it("should handle missing keyboard letter function", () => {
      const paletteWithoutKeyboard = usePalette();
      const result = paletteWithoutKeyboard.getKeyboardLetter(0, 4);
      expect(result).toBeNull();
    });

    it("should handle invalid solfege index", () => {
      const result = palette.getKeyboardLetter(10, 4);
      expect(result).toBeNull();
    });
  });

  describe("palette state management", () => {
    it("should update palette position", () => {
      palette.updatePosition(100, 200);
      
      expect(palette.paletteState.value.x).toBe(100);
      expect(palette.paletteState.value.y).toBe(200);
    });

    it("should update palette size", () => {
      palette.updateSize(900, 300);
      
      expect(palette.paletteState.value.width).toBe(900);
      expect(palette.paletteState.value.height).toBe(300);
    });

    it("should update main octave", () => {
      palette.updateMainOctave(5);
      
      expect(palette.paletteState.value.mainOctave).toBe(5);
    });

    it("should clamp octave to valid range", () => {
      palette.updateMainOctave(10);
      expect(palette.paletteState.value.mainOctave).toBe(7); // Should be clamped to max

      palette.updateMainOctave(-1);
      expect(palette.paletteState.value.mainOctave).toBe(2); // Should be clamped to min
    });

    it("should handle drag state", () => {
      palette.startDrag(150);
      
      expect(palette.paletteState.value.isDragging).toBe(true);
      expect(palette.paletteState.value.dragStartY).toBe(150);
    });

    it("should handle resize state", () => {
      palette.startResize(300);
      
      expect(palette.paletteState.value.isResizing).toBe(true);
      expect(palette.paletteState.value.resizeStartHeight).toBe(300);
    });

    it("should end drag and resize", () => {
      palette.startDrag(150);
      palette.startResize(300);
      
      palette.endDragAndResize();
      
      expect(palette.paletteState.value.isDragging).toBe(false);
      expect(palette.paletteState.value.isResizing).toBe(false);
    });
  });

  describe("touch management", () => {
    it("should add active touch", () => {
      palette.addActiveTouch(1, "note-0");
      
      expect(palette.paletteState.value.activeTouches.has(1)).toBe(true);
      expect(palette.paletteState.value.activeTouches.get(1)).toBe("note-0");
    });

    it("should remove active touch", () => {
      palette.addActiveTouch(1, "note-0");
      palette.removeActiveTouch(1);
      
      expect(palette.paletteState.value.activeTouches.has(1)).toBe(false);
    });

    it("should clear all active touches", () => {
      palette.addActiveTouch(1, "note-0");
      palette.addActiveTouch(2, "note-1");
      
      palette.clearActiveTouches();
      
      expect(palette.paletteState.value.activeTouches.size).toBe(0);
    });

    it("should handle multiple touches", () => {
      palette.addActiveTouch(1, "note-0");
      palette.addActiveTouch(2, "note-1");
      palette.addActiveTouch(3, "note-2");
      
      expect(palette.paletteState.value.activeTouches.size).toBe(3);
    });

    it("should get active touch", () => {
      palette.addActiveTouch(1, "note-0");
      
      const touchNote = palette.getActiveTouch(1);
      expect(touchNote).toBe("note-0");
    });
  });

  describe("sustain hooks", () => {
    it("should add sustain hook", () => {
      palette.addSustainHook("note-0");
      
      expect(palette.paletteState.value.activeSustainHooks.has("note-0")).toBe(true);
    });

    it("should remove sustain hook", () => {
      palette.addSustainHook("note-0");
      palette.removeSustainHook("note-0");
      
      expect(palette.paletteState.value.activeSustainHooks.has("note-0")).toBe(false);
    });

    it("should clear all sustain hooks", () => {
      palette.addSustainHook("note-0");
      palette.addSustainHook("note-1");
      
      palette.clearSustainHooks();
      
      expect(palette.paletteState.value.activeSustainHooks.size).toBe(0);
    });

    it("should check if sustain hook is active", () => {
      palette.addSustainHook("note-0");
      
      expect(palette.hasSustainHook("note-0")).toBe(true);
      expect(palette.hasSustainHook("note-1")).toBe(false);
    });

    it("should toggle sustain hook", () => {
      palette.toggleSustainHook("note-0");
      expect(palette.hasSustainHook("note-0")).toBe(true);
      
      palette.toggleSustainHook("note-0");
      expect(palette.hasSustainHook("note-0")).toBe(false);
    });
  });

  describe("note interaction", () => {
    it("should play note", () => {
      palette.playNote(0, 4);
      
      // Should call music store playNote
      expect(require("@/stores/music").useMusicStore().playNote).toHaveBeenCalledWith(0, 4);
    });

    it("should release note", () => {
      palette.releaseNote("note-0");
      
      // Should call music store releaseNote
      expect(require("@/stores/music").useMusicStore().releaseNote).toHaveBeenCalledWith("note-0");
    });

    it("should handle note press", () => {
      palette.handleNotePress(0, 4, 100, 100);
      
      // Should start animation and play note
      expect(require("@/composables/palette/useAnimation").usePaletteAnimation().startNoteAnimation).toHaveBeenCalled();
      expect(require("@/stores/music").useMusicStore().playNote).toHaveBeenCalledWith(0, 4);
    });

    it("should handle note release", () => {
      palette.handleNotePress(0, 4, 100, 100);
      palette.handleNoteRelease("note-0");
      
      // Should stop animation and release note
      expect(require("@/composables/palette/useAnimation").usePaletteAnimation().stopNoteAnimation).toHaveBeenCalled();
      expect(require("@/stores/music").useMusicStore().releaseNote).toHaveBeenCalledWith("note-0");
    });
  });

  describe("octave controls", () => {
    it("should increase octave", () => {
      palette.increaseOctave();
      
      expect(palette.paletteState.value.mainOctave).toBe(5);
      expect(require("@/stores/music").useMusicStore().updateOctave).toHaveBeenCalledWith(5);
    });

    it("should decrease octave", () => {
      palette.decreaseOctave();
      
      expect(palette.paletteState.value.mainOctave).toBe(3);
      expect(require("@/stores/music").useMusicStore().updateOctave).toHaveBeenCalledWith(3);
    });

    it("should not exceed octave limits", () => {
      // Set to max octave
      palette.updateMainOctave(7);
      palette.increaseOctave();
      
      expect(palette.paletteState.value.mainOctave).toBe(7);
      
      // Set to min octave
      palette.updateMainOctave(2);
      palette.decreaseOctave();
      
      expect(palette.paletteState.value.mainOctave).toBe(2);
    });
  });

  describe("rendering", () => {
    it("should render palette", () => {
      const mockCanvas = document.createElement("canvas");
      const mockCtx = mockCanvas.getContext("2d");
      
      palette.render(mockCtx, 1000);
      
      expect(require("@/composables/palette/useRenderer").usePaletteRenderer().renderPalette).toHaveBeenCalledWith(
        mockCtx,
        palette.paletteState.value,
        1000
      );
    });

    it("should handle null canvas context", () => {
      expect(() => palette.render(null, 1000)).not.toThrow();
    });

    it("should clear canvas", () => {
      const mockCanvas = document.createElement("canvas");
      const mockCtx = mockCanvas.getContext("2d");
      
      palette.clearCanvas(mockCtx);
      
      expect(require("@/composables/palette/useRenderer").usePaletteRenderer().clearCanvas).toHaveBeenCalledWith(mockCtx);
    });
  });

  describe("layout", () => {
    it("should calculate note position", () => {
      const position = palette.getNotePosition(0, 4);
      
      expect(position).toEqual({ x: 100, y: 100, width: 80, height: 60 });
      expect(require("@/composables/palette/useLayout").usePaletteLayout().calculateNotePosition).toHaveBeenCalledWith(
        0,
        4,
        palette.paletteState.value
      );
    });

    it("should get note at position", () => {
      const note = palette.getNoteAtPosition(100, 100);
      
      expect(require("@/composables/palette/useLayout").usePaletteLayout().getNoteAtPosition).toHaveBeenCalledWith(
        100,
        100,
        palette.paletteState.value
      );
    });

    it("should get control at position", () => {
      const control = palette.getControlAtPosition(50, 20);
      
      expect(require("@/composables/palette/useLayout").usePaletteLayout().getControlAtPosition).toHaveBeenCalledWith(
        50,
        20,
        palette.paletteState.value
      );
    });

    it("should update layout", () => {
      palette.updateLayout();
      
      expect(require("@/composables/palette/useLayout").usePaletteLayout().updateLayout).toHaveBeenCalledWith(
        palette.paletteState.value
      );
    });
  });

  describe("animation", () => {
    it("should update animations", () => {
      palette.updateAnimations(1000);
      
      expect(require("@/composables/palette/useAnimation").usePaletteAnimation().updateAnimations).toHaveBeenCalledWith(1000);
    });

    it("should clear animations", () => {
      palette.clearAnimations();
      
      expect(require("@/composables/palette/useAnimation").usePaletteAnimation().clearAnimations).toHaveBeenCalled();
    });

    it("should check if animating", () => {
      const isAnimating = palette.isAnimating();
      
      expect(typeof isAnimating).toBe("boolean");
    });
  });

  describe("event handling", () => {
    it("should setup event listeners", () => {
      const mockCanvas = document.createElement("canvas");
      
      palette.setupEventListeners(mockCanvas);
      
      expect(require("@/composables/palette/useInteraction").usePaletteInteraction().setupEventListeners).toHaveBeenCalledWith(mockCanvas);
    });

    it("should remove event listeners", () => {
      const mockCanvas = document.createElement("canvas");
      
      palette.removeEventListeners(mockCanvas);
      
      expect(require("@/composables/palette/useInteraction").usePaletteInteraction().removeEventListeners).toHaveBeenCalledWith(mockCanvas);
    });
  });

  describe("responsive behavior", () => {
    it("should handle window resize", () => {
      // Mock window resize
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800,
      });
      
      palette.handleWindowResize();
      
      expect(palette.paletteState.value.width).toBe(1200);
      // Height should be recalculated but maintain aspect ratio
      expect(palette.paletteState.value.height).toBeGreaterThan(0);
    });

    it("should handle orientation change", () => {
      // Portrait to landscape
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800,
      });
      
      palette.handleOrientationChange();
      
      expect(palette.paletteState.value.width).toBe(600);
    });
  });

  describe("integration", () => {
    it("should work with complete interaction flow", () => {
      // Simulate complete note interaction
      palette.handleNotePress(0, 4, 100, 100);
      palette.addActiveTouch(1, "note-0");
      
      expect(palette.paletteState.value.activeTouches.size).toBe(1);
      expect(require("@/stores/music").useMusicStore().playNote).toHaveBeenCalledWith(0, 4);
      
      palette.handleNoteRelease("note-0");
      palette.removeActiveTouch(1);
      
      expect(palette.paletteState.value.activeTouches.size).toBe(0);
      expect(require("@/stores/music").useMusicStore().releaseNote).toHaveBeenCalledWith("note-0");
    });

    it("should handle multiple simultaneous notes", () => {
      palette.handleNotePress(0, 4, 100, 100);
      palette.handleNotePress(1, 4, 200, 100);
      palette.handleNotePress(2, 4, 300, 100);
      
      palette.addActiveTouch(1, "note-0");
      palette.addActiveTouch(2, "note-1");
      palette.addActiveTouch(3, "note-2");
      
      expect(palette.paletteState.value.activeTouches.size).toBe(3);
      expect(require("@/stores/music").useMusicStore().playNote).toHaveBeenCalledTimes(3);
    });

    it("should handle sustain hooks with notes", () => {
      palette.handleNotePress(0, 4, 100, 100);
      palette.addSustainHook("note-0");
      
      expect(palette.hasSustainHook("note-0")).toBe(true);
      
      palette.handleNoteRelease("note-0");
      
      // Note should still be sustained
      expect(palette.hasSustainHook("note-0")).toBe(true);
    });
  });

  describe("cleanup", () => {
    it("should cleanup all state", () => {
      palette.addActiveTouch(1, "note-0");
      palette.addSustainHook("note-0");
      
      palette.cleanup();
      
      expect(palette.paletteState.value.activeTouches.size).toBe(0);
      expect(palette.paletteState.value.activeSustainHooks.size).toBe(0);
    });

    it("should clear animations on cleanup", () => {
      palette.cleanup();
      
      expect(require("@/composables/palette/useAnimation").usePaletteAnimation().clearAnimations).toHaveBeenCalled();
    });
  });
});