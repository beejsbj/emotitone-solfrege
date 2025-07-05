/**
 * Visual System Adapter
 * Implements VisualSystem interface and provides clean API for visual operations
 */

import type { VisualSystem, NoteEvent } from "@/interfaces/systems";
import { getNoteColor, createNoteGradient } from "@/utils";
import { eventBus } from "@/utils";

export class VisualSystemAdapter implements VisualSystem {
  private isAnimating = false;
  private config: any = {};

  getNoteColor(noteName: string, octave = 4): string {
    return getNoteColor(noteName, octave);
  }

  createGradient(noteNames: string[]): string {
    return createNoteGradient(noteNames);
  }

  renderNoteEvent(noteData: NoteEvent): void {
    // This would coordinate with canvas systems
    // For now, just emit events that canvas renderers can listen to
    eventBus.emit('note-played', noteData);
  }

  clearEffects(): void {
    // Would clear all visual effects
    // This could coordinate with canvas renderers
  }

  updateConfig(config: any): void {
    this.config = { ...this.config, ...config };
    
    eventBus.emit('config-updated', {
      section: 'visual',
      config: this.config
    });
  }

  startAnimations(): void {
    if (this.isAnimating) return;
    this.isAnimating = true;
    
    // Start any visual animations
    // This would coordinate with canvas systems
  }

  stopAnimations(): void {
    this.isAnimating = false;
    
    // Stop visual animations
    // This would coordinate with canvas systems  
  }

  // Additional methods for visual operations
  getConfig(): any {
    return this.config;
  }

  isAnimatingActive(): boolean {
    return this.isAnimating;
  }
}

// Export singleton instance
export const visualSystem = new VisualSystemAdapter();