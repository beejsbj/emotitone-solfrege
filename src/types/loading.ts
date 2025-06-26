/**
 * Loading and Initialization Types
 * Types for managing app loading states, splash screens, and initialization progress
 */

/**
 * Different phases of app loading
 */
export type LoadingPhase = 
  | 'initial'           // App just started
  | 'audio-context'     // Waiting for audio context enablement
  | 'instruments'       // Loading instruments and samples
  | 'visual-effects'    // Initializing visual effects
  | 'complete'          // All loading complete
  | 'error';            // Error occurred during loading

/**
 * Loading state for individual components/systems
 */
export interface LoadingState {
  phase: LoadingPhase;
  progress: number;     // 0-100
  message: string;
  error?: string;
  isComplete: boolean;
}

/**
 * Overall initialization progress tracking
 */
export interface InitializationProgress {
  audioContext: LoadingState;
  instruments: LoadingState;
  visualEffects: LoadingState;
  overall: LoadingState;
}

/**
 * Configuration for the splash screen
 */
export interface SplashConfig {
  showLogo: boolean;
  showProgress: boolean;
  showMessages: boolean;
  autoHideDelay: number;        // ms to wait before auto-hiding after complete
  enableAnimations: boolean;
  theme: 'dark' | 'light' | 'auto';
}

/**
 * Complete app loading state
 */
export interface AppLoadingState {
  isLoading: boolean;
  isVisible: boolean;           // Whether splash is visible
  progress: InitializationProgress;
  config: SplashConfig;
  startTime: number;
  endTime?: number;
}

/**
 * Loading event data for custom events
 */
export interface LoadingEvent {
  phase: LoadingPhase;
  progress: number;
  message: string;
  timestamp: number;
}
