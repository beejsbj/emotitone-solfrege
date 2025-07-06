/**
 * Simple Event Bus for System Communication
 * Enables loose coupling between major systems
 */

import type { NoteEvent } from "@/interfaces/systems";
import { logger } from "@/utils/logger";

export type EventType = 
  | 'note-played'
  | 'note-released'  
  | 'key-changed'
  | 'mode-changed'
  | 'instrument-changed'
  | 'config-updated'
  | 'system-ready';

export interface EventData {
  'note-played': NoteEvent
  'note-released': { noteId: string; noteName: string }
  'key-changed': { key: string; previousKey: string }
  'mode-changed': { mode: string; previousMode: string }
  'instrument-changed': { instrument: string; previousInstrument: string }
  'config-updated': { section: string; config: any }
  'system-ready': { system: string }
}

type EventCallback<T extends EventType> = (data: EventData[T]) => void;

class EventBus {
  private listeners: Map<EventType, Set<Function>> = new Map();

  // Subscribe to events
  on<T extends EventType>(event: T, callback: EventCallback<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  // Unsubscribe from events
  off<T extends EventType>(event: T, callback: EventCallback<T>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  // Emit events
  emit<T extends EventType>(event: T, data: EventData[T]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Remove all listeners for an event
  removeAllListeners(event: EventType): void {
    this.listeners.delete(event);
  }

  // Clear all listeners
  clear(): void {
    this.listeners.clear();
  }

  // Get listener count for debugging
  getListenerCount(event: EventType): number {
    return this.listeners.get(event)?.size || 0;
  }
}

// Export singleton instance
export const eventBus = new EventBus();