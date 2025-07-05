/**
 * Utils Index
 * Centralized export of all utility functions
 */

// Haptic Feedback
export {
  triggerHapticFeedback,
  triggerNoteHaptic,
  triggerControlHaptic,
  triggerUIHaptic,
  type HapticIntensity,
} from "./hapticFeedback";

// Performance Monitoring
export * from "./performanceMonitor";

// Visual Effects
export * from "./visualEffects";

// Device Detection
export * from "./deviceDetection";

// Logging
export { logger, performanceLogger } from "./logger";

// Colors
export * from "./colors";

// Event Bus
export { eventBus } from "./eventBus";
export type { EventType, EventData } from "./eventBus";
