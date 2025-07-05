/**
 * System Registry
 * Central registry for all system adapters
 * Provides dependency injection and system coordination
 */

import type { SystemRegistry } from "@/interfaces/systems";
import { audioSystem } from "./audioSystemAdapter";
import { musicSystem } from "./musicSystemAdapter";
import { visualSystem } from "./visualSystemAdapter";
import { eventBus, logger } from "@/utils";

// Simple UI system implementation for now
const uiSystem = {
  getCurrentState: () => ({}),
  updateState: (changes: any) => {},
  handleNoteClick: (noteIndex: number) => {},
  handleNoteRelease: (noteIndex: number) => {},
  getUIConfig: () => ({}),
  setUIConfig: (config: any) => {}
};

// Create system registry
export const systems: SystemRegistry = {
  audio: audioSystem,
  music: musicSystem,
  visual: visualSystem,
  ui: uiSystem as any
};

// System initialization
export async function initializeSystems(): Promise<void> {
  logger.dev("Initializing systems...");
  
  try {
    // Initialize systems in order
    await systems.audio.initialize();
    logger.dev("Audio system initialized");
    
    // Set up cross-system event listeners
    setupSystemCommunication();
    
    logger.dev("All systems initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize systems:", error);
    throw error;
  }
}

// Set up communication between systems
function setupSystemCommunication(): void {
  // Audio events trigger visual effects
  eventBus.on('note-played', (noteData) => {
    systems.visual.renderNoteEvent(noteData);
  });

  // Key/mode changes update visuals
  eventBus.on('key-changed', (data) => {
    logger.dev(`Key changed from ${data.previousKey} to ${data.key}`);
  });

  eventBus.on('mode-changed', (data) => {
    logger.dev(`Mode changed from ${data.previousMode} to ${data.mode}`);
  });

  // System ready notifications
  eventBus.on('system-ready', (data) => {
    logger.dev(`System ready: ${data.system}`);
  });
}

// System disposal
export async function disposeSystems(): Promise<void> {
  logger.dev("Disposing systems...");
  
  try {
    await systems.audio.dispose();
    eventBus.clear();
    
    logger.dev("All systems disposed successfully");
  } catch (error) {
    logger.error("Error disposing systems:", error);
  }
}

// Export individual systems for direct access if needed
export { audioSystem, musicSystem, visualSystem };