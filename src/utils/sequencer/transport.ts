import * as Tone from "tone";
import type { SequencerBeat, SequencerInstance } from "@/types/music";
import { calculateNoteDuration } from "@/utils/duration";
import { useMusicStore } from "@/stores/music";
import { useInstrumentStore } from "@/stores/instrument";
import { useSequencerStore } from "@/stores/sequencer";

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
   * Set tempo
   */
  setTempo(bpm: number) {
    Tone.getTransport().bpm.value = bpm;
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

/**
 * Multi-Sequencer Transport System
 * Coordinates playback of multiple sequencers with synchronized timing
 */
export class MultiSequencerTransport {
  private sequencerTransports: Map<string, SequencerTransport> = new Map();
  private masterTransport: typeof Tone.Transport;
  private isInitialized = false;

  constructor() {
    this.masterTransport = Tone.getTransport();
  }

  /**
   * Start all sequencers with synchronized playback
   */
  async startAll(
    sequencers: SequencerInstance[],
    globalTempo: number,
    steps: number
  ) {
    // Set master tempo
    this.masterTransport.bpm.value = globalTempo;

    // Initialize Tone.js if needed
    if (!this.isInitialized) {
      await Tone.start();
      this.isInitialized = true;
    }

    // Clear any existing transports
    this.stopAll();

    // Create transports for each active sequencer
    for (const sequencer of sequencers) {
      if (
        sequencer.isPlaying &&
        !sequencer.isMuted &&
        sequencer.beats.length > 0
      ) {
        await this.initSequencerTransport(sequencer, steps);
      }
    }

    // Start master transport
    this.masterTransport.start();
  }

  /**
   * Start a single sequencer
   */
  async startSequencer(sequencer: SequencerInstance, steps: number) {
    if (!sequencer.isMuted && sequencer.beats.length > 0) {
      if (!this.isInitialized) {
        await Tone.start();
        this.isInitialized = true;
      }

      await this.initSequencerTransport(sequencer, steps);

      // Start master transport if not already running
      if (this.masterTransport.state !== "started") {
        this.masterTransport.start();
      }
    }
  }

  /**
   * Initialize transport for a specific sequencer
   */
  private async initSequencerTransport(
    sequencer: SequencerInstance,
    steps: number
  ) {
    const transport = new SequencerTransport();
    const sequencerId = sequencer.id;

    // Store reference to sequencer ID and initial properties on transport
    (transport as any).sequencerId = sequencerId;
    (transport as any).sequencerInstrument = sequencer.instrument;
    (transport as any).sequencerOctave = sequencer.octave;
    (transport as any).sequencerVolume = sequencer.volume;

    // REACTIVE FIX: Get fresh sequencer data from store each time!
    // This ensures we always get the latest beats, even after store updates
    const getReactiveBeats = () => {
      const sequencerStore = useSequencerStore();
      const currentSequencer = sequencerStore.sequencers.find(
        (s) => s.id === sequencerId
      );
      return currentSequencer?.beats || [];
    };

    const getReactiveSequencer = () => {
      const sequencerStore = useSequencerStore();
      return sequencerStore.sequencers.find((s) => s.id === sequencerId);
    };

    // Initialize with reactive loop that fetches fresh data
    transport.initWithReactiveLoop(
      getReactiveBeats, // 🎯 This now gets fresh beats every step!
      steps,
      this.masterTransport.bpm.value,
      (beat, time) => {
        // Get fresh sequencer data for note playing
        const currentSequencer = getReactiveSequencer();
        if (currentSequencer) {
          this.playSequencerNote(currentSequencer, beat, time, steps);
        }
      },
      (step) => {
        // Update step in the store properly for reactivity
        const sequencerStore = useSequencerStore();
        sequencerStore.updateSequencerStep(sequencerId, step);
      }
    );

    this.sequencerTransports.set(sequencerId, transport);
    await transport.start();
  }

  /**
   * Play a note with sequencer-specific settings
   */
  private playSequencerNote(
    sequencer: SequencerInstance,
    beat: SequencerBeat,
    time: number,
    steps: number
  ) {
    const musicStore = useMusicStore();
    const instrumentStore = useInstrumentStore();

    // Calculate duration
    const noteDuration = calculateNoteDuration(
      beat.duration,
      steps,
      this.masterTransport.bpm.value
    );

    // Get the specific instrument for this sequencer
    const sequencerInstrument = instrumentStore.getInstrument(
      sequencer.instrument
    );
    const noteName = musicStore.getNoteName(
      beat.solfegeIndex,
      sequencer.octave
    );

    if (sequencerInstrument) {
      try {
        // Apply volume to the instrument persistently (convert 0-1 range to dB)
        if (sequencerInstrument.volume) {
          // Convert linear volume (0-1) to dB
          const volumeDb =
            sequencer.volume <= 0
              ? -Infinity
              : 20 * Math.log10(sequencer.volume);
          sequencerInstrument.volume.value = Math.max(-60, volumeDb); // Cap at -60dB
        }

        // Trigger the note on the sequencer's specific instrument
        sequencerInstrument.triggerAttackRelease(
          noteName,
          noteDuration.toneNotation,
          time
        );

        // Dispatch event for visual effects with sequencer-specific data
        const notePlayedEvent = new CustomEvent("note-played", {
          detail: {
            note: musicStore.getSolfegeByName(beat.solfegeName),
            frequency: musicStore.getNoteFrequency(
              beat.solfegeIndex,
              sequencer.octave
            ),
            noteName,
            solfegeIndex: beat.solfegeIndex,
            octave: sequencer.octave,
            duration: noteDuration.toneNotation,
            time,
            instrument: sequencer.instrument, // This is now the actual sequencer instrument!
            sequencerId: sequencer.id,
            isSequencerNote: true, // Flag to distinguish from global notes
          },
        });
        window.dispatchEvent(notePlayedEvent);

        console.log(
          `🎵 Playing ${noteName} on ${sequencer.instrument} (sequencer ${sequencer.id}) at volume ${sequencer.volume}`
        );
      } catch (error) {
        console.error(
          `Error playing note for sequencer ${sequencer.id}:`,
          error
        );
        console.error(`Instrument: ${sequencer.instrument}, Note: ${noteName}`);
      }
    } else {
      // Instrument not loaded yet - fallback to global instrument with sequencer-specific parameters
      console.warn(
        `Instrument ${sequencer.instrument} not loaded for sequencer ${sequencer.id}, using fallback`
      );

      // Use music store but pass the sequencer instrument name for event dispatch
      musicStore.playNoteWithDuration(
        beat.solfegeIndex,
        sequencer.octave,
        noteDuration.toneNotation,
        time,
        sequencer.instrument // Pass sequencer instrument for event dispatch
      );
    }
  }

  /**
   * Stop all sequencers
   */
  stopAll() {
    // Stop all individual transports
    this.sequencerTransports.forEach((transport) => {
      transport.stop();
      transport.dispose();
    });
    this.sequencerTransports.clear();

    // Stop and clear master transport
    this.masterTransport.stop();
    this.masterTransport.cancel();
    this.masterTransport.position = 0;

    // Release all notes
    const musicStore = useMusicStore();
    musicStore.releaseAllNotes();
  }

  /**
   * Stop a specific sequencer
   */
  stopSequencer(sequencerId: string) {
    const transport = this.sequencerTransports.get(sequencerId);
    if (transport) {
      transport.stop();
      transport.dispose();
      this.sequencerTransports.delete(sequencerId);
    }

    // If no more sequencers playing, stop master transport
    if (this.sequencerTransports.size === 0) {
      this.masterTransport.stop();
      this.masterTransport.cancel();
      this.masterTransport.position = 0;
    }
  }

  /**
   * Update tempo for all sequencers
   */
  updateTempo(tempo: number) {
    this.masterTransport.bpm.value = tempo;
  }

  /**
   * Check if any sequencers are playing
   */
  isPlaying(): boolean {
    return (
      this.sequencerTransports.size > 0 &&
      this.masterTransport.state === "started"
    );
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    this.stopAll();
  }
}
