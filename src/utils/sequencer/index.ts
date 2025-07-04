/**
 * Consolidated Sequencer Utilities
 * Clean exports for the refactored sequencer system
 */

// Export all transport-related utilities
export {
  SequencerTransport,
  MultiSequencerTransport,
  beatsToTonePart,
  createToneSequence,
  createReactiveToneLoop,
} from "./transport";

// Export timing utilities
export { calculateNoteDuration } from "@/utils/duration";

/**
 * ✅ COMPLETED: Transport consolidation
 * - All transport logic moved to transport.ts
 * - Clean exports structure
 * - No more circular dependencies
 */
