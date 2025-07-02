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
  playNoteCallback: (
    solfegeIndex: number,
    octave: number,
    duration: string,
    time: number
  ) => void
): Tone.Part {
  // Convert beats to [time, value] pairs for Tone.Part
  const events: [string, any][] = beats.map((beat) => {
    // Calculate the time position in Tone.js notation
    // Each step is a 16th note, so step 0 = "0:0:0", step 1 = "0:0:1", etc.
    const timePosition = `0:0:${beat.step}`; // Bars:Quarters:Sixteenths

    // Calculate proper duration
    const noteDuration = calculateNoteDuration(beat.duration, steps, tempo);

    return [
      timePosition,
      {
        solfegeIndex: beat.solfegeIndex,
        octave: beat.octave,
        duration: noteDuration.toneNotation,
        beat: beat,
      },
    ];
  });

  // Create Tone.Part with the events
  const part = new Tone.Part((time: number, value: any) => {
    playNoteCallback(value.solfegeIndex, value.octave, value.duration, time);
  }, events);

  // Enable looping and set the loop end based on sequence length
  part.loop = true;
  part.loopEnd = `0:0:${steps}`; // Loop for the full sequence length (16 steps = 1 bar)

  return part;
}

/**
 * Create a Tone.js Sequence for simpler, rhythmic patterns
 * Good for basic sequencing with regular timing
 */
export function createToneSequence(
  beats: SequencerBeat[],
  steps: number,
  playNoteCallback: (beat: SequencerBeat | null, time: number) => void
): Tone.Sequence {
  // Create an array representing each step
  const sequence: (SequencerBeat | null)[] = [];
  for (let i = 0; i < steps; i++) {
    sequence.push(null);
  }

  // Place beats at their step positions
  beats.forEach((beat) => {
    if (beat.step < steps) {
      sequence[beat.step] = beat;
    }
  });

  // Create Tone.Sequence
  const toneSequence = new Tone.Sequence(
    (time: number, value: SequencerBeat | null) => {
      playNoteCallback(value, time);
    },
    sequence,
    "16n"
  );

  // Enable looping
  toneSequence.loop = true;

  return toneSequence;
}

/**
 * Create a Tone.js Loop for custom timing control
 * Most flexible option for complex sequencing
 * REACTIVE VERSION - reads beats dynamically from a getter function
 */
export function createReactiveToneLoop(
  getBeats: () => SequencerBeat[], // Function that returns current beats
  steps: number,
  tempo: number,
  playNoteCallback: (beat: SequencerBeat, time: number) => void,
  onStepCallback?: (step: number, time: number) => void
): Tone.Loop {
  let currentStep = 0;

  const loop = new Tone.Loop((time: number) => {
    // Call step callback if provided
    if (onStepCallback) {
      onStepCallback(currentStep, time);
    }

    // Get current beats dynamically - this makes it reactive! 🎉
    // This is called EVERY step, so live edits are immediately reflected in playback
    const currentBeats = getBeats();
    const beatsToPlay = currentBeats.filter(
      (beat) => beat.step === currentStep
    );

    // Play each beat
    beatsToPlay.forEach((beat) => {
      playNoteCallback(beat, time);
    });

    // Advance to next step
    currentStep = (currentStep + 1) % steps;
  }, "16n"); // 16th note timing

  // Enable infinite looping
  loop.iterations = Infinity;

  return loop;
}

/**
 * Legacy non-reactive version (keeping for compatibility)
 */
export function createToneLoop(
  beats: SequencerBeat[],
  steps: number,
  tempo: number,
  playNoteCallback: (beat: SequencerBeat, time: number) => void,
  onStepCallback?: (step: number, time: number) => void
): Tone.Loop {
  let currentStep = 0;

  const loop = new Tone.Loop((time: number) => {
    // Call step callback if provided
    if (onStepCallback) {
      onStepCallback(currentStep, time);
    }

    // Find beats that start on this step
    const beatsToPlay = beats.filter((beat) => beat.step === currentStep);

    // Play each beat
    beatsToPlay.forEach((beat) => {
      playNoteCallback(beat, time);
    });

    // Advance to next step
    currentStep = (currentStep + 1) % steps;
  }, "16n"); // 16th note timing

  // Enable infinite looping (it's a loop by default, but being explicit)
  loop.iterations = Infinity;

  return loop;
}

/**
 * Improved Part implementation with better timing
 */
export function createImprovedPart(
  beats: SequencerBeat[],
  steps: number,
  tempo: number,
  playNoteCallback: (beat: SequencerBeat, time: number) => void,
  onStepCallback?: (step: number, time: number) => void
): { part: Tone.Part; stepTracker: Tone.Loop } {
  // Create events for the Part
  const events: [string, SequencerBeat][] = beats.map((beat) => {
    const timePosition = `0:0:${beat.step}`;
    return [timePosition, beat];
  });

  // Create the Part for note scheduling
  const part = new Tone.Part((time: number, beat: any) => {
    playNoteCallback(beat, time);
  }, events);

  part.loop = true;
  part.loopEnd = `0:0:${steps}`;

  // Create a separate Loop for step tracking
  let currentStep = 0;
  const stepTracker = new Tone.Loop((time: number) => {
    if (onStepCallback) {
      onStepCallback(currentStep, time);
    }
    currentStep = (currentStep + 1) % steps;
  }, "16n");

  stepTracker.iterations = Infinity;

  return { part, stepTracker };
}

/**
 * Sequencer Transport Manager
 * Manages Tone.js transport state and provides sequencer-specific controls
 */
export class SequencerTransport {
  private part: Tone.Part | null = null;
  private sequence: Tone.Sequence | null = null;
  private loop: Tone.Loop | null = null;
  private stepTracker: Tone.Loop | null = null;
  private isInitialized = false;

  constructor() {}

  /**
   * Initialize with beats using Tone.Part (recommended for complex sequences)
   */
  initWithPart(
    beats: SequencerBeat[],
    steps: number,
    tempo: number,
    playNoteCallback: (
      solfegeIndex: number,
      octave: number,
      duration: string,
      time: number
    ) => void
  ) {
    this.cleanup();
    this.part = beatsToTonePart(beats, steps, tempo, playNoteCallback);
    this.isInitialized = true;
    this.setTempo(tempo);
  }

  /**
   * Initialize with improved Part implementation
   */
  initWithImprovedPart(
    beats: SequencerBeat[],
    steps: number,
    tempo: number,
    playNoteCallback: (beat: SequencerBeat, time: number) => void,
    onStepCallback?: (step: number, time: number) => void
  ) {
    this.cleanup();
    const { part, stepTracker } = createImprovedPart(
      beats,
      steps,
      tempo,
      playNoteCallback,
      onStepCallback
    );
    this.part = part;
    this.stepTracker = stepTracker;
    this.isInitialized = true;
    this.setTempo(tempo);
  }

  /**
   * Initialize with beats using Tone.Sequence (good for simple patterns)
   */
  initWithSequence(
    beats: SequencerBeat[],
    steps: number,
    playNoteCallback: (beat: SequencerBeat | null, time: number) => void
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
    this.loop = createToneLoop(
      beats,
      steps,
      tempo,
      playNoteCallback,
      onStepCallback
    );
    this.isInitialized = true;
    this.setTempo(tempo);
  }

  /**
   * Initialize with REACTIVE Loop - beats are read dynamically each step
   * This is what you want for live editing! 🔥
   */
  initWithReactiveLoop(
    getBeats: () => SequencerBeat[],
    steps: number,
    tempo: number,
    playNoteCallback: (beat: SequencerBeat, time: number) => void,
    onStepCallback?: (step: number, time: number) => void
  ) {
    this.cleanup();
    this.loop = createReactiveToneLoop(
      getBeats,
      steps,
      tempo,
      playNoteCallback,
      onStepCallback
    );
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
      if (this.stepTracker) {
        this.stepTracker.start(0);
      }
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
    }
    if (this.stepTracker) {
      this.stepTracker.stop();
    }
    if (this.sequence) {
      this.sequence.stop();
    }
    if (this.loop) {
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
    if (this.stepTracker) {
      this.stepTracker.dispose();
      this.stepTracker = null;
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
