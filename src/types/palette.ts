/**
 * Palette Types and Constants
 * Centralized type definitions for the canvas palette system
 */

/**
 * Palette configuration and state
 */
export interface PaletteState {
  // Position and dimensions
  x: number;
  y: number;
  width: number;
  height: number;

  // Palette settings
  mainOctave: number;
  showLastSolfege: boolean; //being Do', you keep confusing it with Ti

  // Visual properties
  controlsHeight: number;
  buttonGap: number;

  // Interaction state
  isDragging: boolean;
  isResizing: boolean;
  dragStartY: number;
  resizeStartHeight: number;

  // Touch/mouse tracking
  lastTouchY: number;
  touchStartTime: number;

  // Sustain hooks
  sustainHooksHeight: number;
  activeSustainHooks: Set<string>; // Track which hooks are active
}

/**
 * Button layout and rendering data
 */
export interface ButtonLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  solfegeIndex: number;
  octave: number;
  isMainOctave: boolean;
  isVisible: boolean;
}

/**
 * Control element layout
 */
export interface ControlLayout {
  leftFlick: { x: number; y: number; width: number; height: number };
  rightFlick: { x: number; y: number; width: number; height: number };
  dragHandle: { x: number; y: number; width: number; height: number };
  resizeHandle: { x: number; y: number; width: number; height: number };
  solfegeToggle: { x: number; y: number; width: number; height: number };
}

/**
 * Animation state for smooth transitions
 */
export interface AnimationState {
  octaveOffset: number; // Current animated offset
  targetOctaveOffset: number; // Target offset for animation
  isAnimating: boolean;
  animationStartTime: number;
  pressedButtons: Set<string>; // Track pressed buttons for visual feedback
  buttonAnimations: Map<
    string,
    {
      scale: number;
      targetScale: number;
      isAnimating: boolean;
      startTime: number;
      isPressed: boolean;
    }
  >; // Track individual button animations
}

/**
 * Octave height calculations
 */
export interface OctaveHeights {
  main: number;
  other: number;
}

/**
 * Sustain hook configuration
 */
export interface SustainHook {
  x: number;
  y: number;
  radius: number;
  solfegeIndex: number;
  isActive: boolean;
  isDragging: boolean;
}
