// Composables index file for organized exports
// This file provides a centralized way to import all composables

export { initializeFontWeightOscillation } from "./useOscillatingFontWeight";

export { useAnimationLifecycle } from "./useAnimationLifecycle";
// export { useVisualConfig } from "./useVisualConfig"; // DELETED - moved to visualConfig store
export { useColorSystem } from "./useColorSystem";
export { useKeyboardControls } from "./useKeyboardControls";
export { useSolfegeInteraction } from "./useSolfegeInteraction";
export { useAppLoading } from "./useAppLoading";
export { useTooltip } from "./useTooltip";

// Canvas modules
export * from "./canvas";
