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
  activeTouches: Map<number, string>; // Map touch identifier to button key

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

/*
 * ========================================
 * UI COMPONENT CONFIGURATIONS
 * ========================================
 * Visual configuration interfaces for UI components
 */

/**
 * Palette visual configuration
 * Controls the visual effects for the solfege palette interface
 */
export interface PaletteConfig {
  /** Whether palette gradient effects are enabled */
  isEnabled: boolean;
  /** Gradient direction in degrees (0-360) */
  gradientDirection: number;
  /** Whether to use glassmorphism effects for palette keys */
  useGlassmorphism: boolean;
  /** Glassmorphism effect opacity for palette keys (0-1) */
  glassmorphOpacity: number;
}

/**
 * Floating popup configuration
 * Controls the information popup for played chords and intervals
 */
export interface FloatingPopupConfig {
  /** Whether floating popup is enabled */
  isEnabled: boolean;
  /** Accumulation window for notes in milliseconds */
  accumulationWindow: number;
  /** Hide delay after last note stops in milliseconds */
  hideDelay: number;
  /** Maximum number of notes to display simultaneously */
  maxNotes: number;
  /** Whether to show chord information */
  showChord: boolean;
  /** Whether to show interval information */
  showIntervals: boolean;
  /** Whether to show emotional descriptions */
  showEmotionalDescription: boolean;
  /** Backdrop blur intensity in pixels */
  backdropBlur: number;
  /** Glassmorphism effect opacity (0-1) */
  glassmorphOpacity: number;
  /** Animation duration for show/hide transitions in milliseconds */
  animationDuration: number;
}

/**
 * Font oscillation configuration for different sizes
 * Controls dynamic font weight changes based on audio frequency
 */
export interface FontOscillationConfig {
  /** Whether font oscillation is enabled */
  isEnabled: boolean;
  /** Small text oscillation settings */
  sm: { amplitude: number; baseWeight: number };
  /** Medium text oscillation settings */
  md: { amplitude: number; baseWeight: number };
  /** Large text oscillation settings */
  lg: { amplitude: number; baseWeight: number };
  /** Full range oscillation settings */
  full: { amplitude: number; baseWeight: number };
}

export default {};
