/**
 * Systems Module
 * Exports all system adapters and registry
 */

export { systems, initializeSystems, disposeSystems } from "./registry";
export { audioSystem } from "./audioSystemAdapter";
export { musicSystem } from "./musicSystemAdapter";
export { visualSystem } from "./visualSystemAdapter";

// Re-export types
export type * from "@/interfaces/systems";