import * as Tone from "tone";
import type { SequencerBeat } from "@/types/music";
import { calculateNoteDuration } from "./duration";

/**
 * Tone.js-powered Sequencer Utilities
 * Leverages Tone.js Part, Sequence, and Transport for more efficient playback
 */

/**
 * Convert SequencerBeat array to Tone.js Part-compatible events
 */
export function beatsToTonePart(
  beats: SequencerBeat[],
  steps: number,
  tempo: number,
  playNoteCallback: (solfegeIndex: number, octave: number, duration: string, time: number) => void
): Tone.Part {
  // Convert beats to [time, value] pairs for Tone.Part
  const events = beats.map(beat => {
    // Calculate the time position as a fraction of the sequence
    const timePosition = `${beat.step}:16n`; // Use Tone.js time notation
    
    // Calculate proper duration
    const noteDuration = calculateNoteDuration(beat.duration, steps, tempo);
    
    return [
      timePosition,
      {
        solfegeIndex: beat.solfegeIndex,
        octave: beat.octave,
        duration: noteDuration.toneNotation,
        beat: beat
      }
    ];
  });

  // Create Tone.Part with the events
  const part = new Tone.Part((time, value) => {
    playNoteCallback(
      value.solfegeIndex,
      value.octave,
      value.duration,
      time
    );
  }, events);

  return part;
}

/**
 * Create a Tone.js Sequence for simpler, rhythmic patterns
 * Good for basic sequencing with regular timing
 */
export function createToneSequence(
  beats: SequencerBeat[],
  steps: number,
  playNoteCallback: (beat: SequencerBeat | null, time: number, step: number) => void
): Tone.Sequence {
  // Create an array representing each step
  const sequence: (SequencerBeat | null)[] = [];
  for (let i = 0; i < steps; i++) {
    sequence.push(null);
  }
  
  // Place beats at their step positions
  beats.forEach(beat => {
    if (beat.step < steps) {
      sequence[beat.step] = beat;
    }
  });

  // Create Tone.Sequence
  const toneSequence = new Tone.Sequence((time, value, step) => {
    playNoteCallback(value, time, step);
  }, sequence, "16n");

  return toneSequence;
}

/**
 * Create a Tone.js Loop for custom timing control
 * Most flexible option for complex sequencing
 */
export function createToneLoop(
  beats: SequencerBeat[],
  steps: number,
  tempo: number,
  playNoteCallback: (beat: SequencerBeat, time: number) => void,
  onStepCallback?: (step: number, time: number) => void
): Tone.Loop {
  let currentStep = 0;
  
  const loop = new Tone.Loop((time) => {
    // Call step callback if provided
    if (onStepCallback) {
      onStepCallback(currentStep, time);
    }

    // Find beats that start on this step
    const beatsToPlay = beats.filter(beat => beat.step === currentStep);
    
    // Play each beat
    beatsToPlay.forEach(beat => {
      playNoteCallback(beat, time);
    });

    // Advance to next step
    currentStep = (currentStep + 1) % steps;
  }, "16n"); // 16th note timing

  return loop;
}

/**
 * Sequencer Transport Manager
 * Manages Tone.js transport state and provides sequencer-specific controls
 */
export class SequencerTransport {
  private part: Tone.Part | null = null;
  private sequence: Tone.Sequence | null = null;
  private loop: Tone.Loop | null = null;
  private isInitialized = false;

  constructor() {}

  /**
   * Initialize with beats using Tone.Part (recommended for complex sequences)
   */
  initWithPart(
    beats: SequencerBeat[],
    steps: number,
    tempo: number,
    playNoteCallback: (solfegeIndex: number, octave: number, duration: string, time: number) => void
  ) {
    this.cleanup();
    this.part = beatsToTonePart(beats, steps, tempo, playNoteCallback);
    this.isInitialized = true;
    this.setTempo(tempo);
  }

  /**
   * Initialize with beats using Tone.Sequence (good for simple patterns)
   */
  initWithSequence(
    beats: SequencerBeat[],
    steps: number,
    playNoteCallback: (beat: SequencerBeat | null, time: number, step: number) => void
  ) {
    this.cleanup();
    this.sequence = createToneSequence(beats, steps, playNoteCallback);
    this.isInitialized = true;
  }

  /**
   * Initialize with beats using Tone.Loop (most flexible)
   */
  initWithLoop(
    beats: SequencerBeat[],
    steps: number,
    tempo: number,
    playNoteCallback: (beat: SequencerBeat, time: number) => void,
    onStepCallback?: (step: number, time: number) => void
  ) {
    this.cleanup();
    this.loop = createToneLoop(beats, steps, tempo, playNoteCallback, onStepCallback);
    this.isInitialized = true;
    this.setTempo(tempo);
  }

  /**
   * Start playback
   */
  async start() {
    if (!this.isInitialized) return;

    // Ensure audio context is running
    if (Tone.getContext().state === "suspended") {
      await Tone.start();
    }

    // Start the appropriate transport object
    if (this.part) {
      this.part.start(0);
    } else if (this.sequence) {
      this.sequence.start(0);
    } else if (this.loop) {
      this.loop.start(0);
    }

    // Start the global transport
    Tone.getTransport().start();
  }

  /**
   * Stop playback
   */
  stop() {
    // Stop the global transport
    Tone.getTransport().stop();

    // Stop and reset individual objects
    if (this.part) {
      this.part.stop();
    } else if (this.sequence) {
      this.sequence.stop();
    } else if (this.loop) {
      this.loop.stop();
    }

    // Reset transport position
    Tone.getTransport().position = 0;
  }

  /**
   * Pause playback (can be resumed)
   */
  pause() {
    Tone.getTransport().pause();
  }

  /**
   * Resume playback
   */
  resume() {
    Tone.getTransport().start();
  }

  /**
   * Set tempo
   */
  setTempo(bpm: number) {
    Tone.getTransport().bpm.value = bpm;
  }

  /**
   * Get current playback position
   */
  getPosition(): string {
    return Tone.getTransport().position.toString();
  }

  /**
   * Set playback position
   */
  setPosition(position: string | number) {
    Tone.getTransport().position = position;
  }

  /**
   * Check if playing
   */
  get isPlaying(): boolean {
    return Tone.getTransport().state === "started";
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stop();

    if (this.part) {
      this.part.dispose();
      this.part = null;
    }
    if (this.sequence) {
      this.sequence.dispose();
      this.sequence = null;
    }
    if (this.loop) {
      this.loop.dispose();
      this.loop = null;
    }

    this.isInitialized = false;
  }

  /**
   * Dispose all resources
   */
  dispose() {
    this.cleanup();
  }
}