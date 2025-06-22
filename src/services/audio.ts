import * as Tone from "tone";

export class AudioService {
  private synth: Tone.Synth;
  private isInitialized = false;

  constructor() {
    // Create a warm, rich synth for solfege notes
    this.synth = new Tone.Synth({
      oscillator: {
        type: "sine",
      },
      envelope: {
        attack: 0.05,
        decay: 0.2,
        sustain: 0.8,
        release: 0.8,
      },
    }).toDestination();
  }

  async initialize() {
    if (!this.isInitialized) {
      try {
        console.log("Starting Tone.js audio context...");
        await Tone.start();
        this.isInitialized = true;
        console.log("Audio context started successfully");
        console.log("Audio context state:", Tone.context.state);
      } catch (error) {
        console.error("Failed to start audio context:", error);
        throw error;
      }
    } else {
      console.log("Audio context already initialized");
    }
  }

  async playNote(frequency: number, duration: string = "1n") {
    try {
      await this.initialize();
      this.synth.triggerAttackRelease(frequency, duration);
    } catch (error) {
      console.error("Error playing note:", error);
    }
  }

  async attackNote(frequency: number) {
    try {
      await this.initialize();
      this.synth.triggerAttack(frequency);
    } catch (error) {
      console.error("Error attacking note:", error);
    }
  }

  releaseNote() {
    try {
      this.synth.triggerRelease();
    } catch (error) {
      console.error("Error releasing note:", error);
    }
  }

  async playNoteByName(
    noteName: string,
    octave: number = 4,
    duration: string = "1n"
  ) {
    try {
      await this.initialize();
      const noteWithOctave = `${noteName}${octave}`;
      this.synth.triggerAttackRelease(noteWithOctave, duration);
    } catch (error) {
      console.error("Error playing note by name:", error);
    }
  }

  async playSequence(notes: string[], tempo: number = 120) {
    try {
      await this.initialize();

      // Set the tempo
      Tone.Transport.bpm.value = tempo;

      // Create a sequence
      const sequence = new Tone.Sequence(
        (time, note) => {
          this.synth.triggerAttackRelease(note, "8n", time);
        },
        notes,
        "4n"
      );

      // Start the sequence
      sequence.start(0);
      Tone.Transport.start();

      // Stop after the sequence completes
      setTimeout(() => {
        sequence.stop();
        Tone.Transport.stop();
        sequence.dispose();
      }, notes.length * (60 / tempo) * 1000);
    } catch (error) {
      console.error("Error playing sequence:", error);
    }
  }

  stop() {
    this.synth.triggerRelease();
  }

  dispose() {
    this.synth.dispose();
  }
}

// Export a singleton instance
export const audioService = new AudioService();
