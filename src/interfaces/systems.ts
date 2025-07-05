/**
 * System Interfaces for Clean Architecture
 * Defines clear boundaries between major systems
 */

// Audio System Interface
export interface AudioSystem {
  // Core audio operations
  playNote(note: string, duration?: string): Promise<void>
  attackNote(note: string, noteId?: string): Promise<string>
  releaseNote(noteId?: string): Promise<void>
  
  // Instrument management
  setInstrument(instrumentName: string): void
  getCurrentInstrument(): any
  
  // State queries
  isAudioReady(): boolean
  getActiveNotes(): Array<{ note: string; noteId: string }>
  
  // Lifecycle
  initialize(): Promise<void>
  dispose(): Promise<void>
}

// Music Theory System Interface  
export interface MusicSystem {
  // Scale and key operations
  setCurrentKey(key: string): void
  setCurrentMode(mode: string): void
  getCurrentScaleNotes(): string[]
  
  // Note calculations
  getNoteFrequency(solfegeIndex: number, octave?: number): number
  getNoteName(solfegeIndex: number, octave?: number): string
  
  // Scale and melody data
  getCurrentScale(): any
  getMelodicPatterns(): any[]
  searchMelodies(query: string): any[]
}

// Visual System Interface
export interface VisualSystem {
  // Color operations
  getNoteColor(noteName: string, octave?: number): string
  createGradient(noteNames: string[]): string
  
  // Canvas operations
  renderNoteEvent(noteData: NoteEvent): void
  clearEffects(): void
  updateConfig(config: any): void
  
  // Animation lifecycle
  startAnimations(): void
  stopAnimations(): void
}

// UI System Interface
export interface UISystem {
  // State management
  getCurrentState(): UIState
  updateState(changes: Partial<UIState>): void
  
  // User interactions
  handleNoteClick(noteIndex: number): void
  handleNoteRelease(noteIndex: number): void
  
  // Configuration
  getUIConfig(): UIConfig
  setUIConfig(config: Partial<UIConfig>): void
}

// Common event types
export interface NoteEvent {
  noteName: string
  solfege: string
  frequency: number
  octave: number
  noteId?: string
  instrument?: string
  timestamp: number
}

export interface UIState {
  currentKey: string
  currentMode: string
  isPlaying: boolean
  activeNotes: string[]
  sequencerState: any
}

export interface UIConfig {
  visualsEnabled: boolean
  showPopups: boolean
  animationSpeed: number
  colorScheme: string
}

// System registry for dependency injection
export interface SystemRegistry {
  audio: AudioSystem
  music: MusicSystem
  visual: VisualSystem
  ui: UISystem
}