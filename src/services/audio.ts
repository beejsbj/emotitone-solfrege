import * as Tone from "tone";

export class AudioService {
  private polySynth: Tone.PolySynth;
  private isInitialized = false;
  private activeNotes: Map<string, { frequency: number; noteId: string }> =
    new Map();

  constructor() {
    // Create a polyphonic synth for multiple simultaneous notes
    this.polySynth = new Tone.PolySynth(Tone.Synth, {
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

    // Set polyphony limit to 8 voices for performance
    this.polySynth.maxPolyphony = 8;
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
      this.polySynth.triggerAttackRelease(frequency, duration);
    } catch (error) {
      console.error("Error playing note:", error);
    }
  }

  async attackNote(frequency: number, noteId?: string): Promise<string> {
    try {
      await this.initialize();
      const id = noteId || `note_${frequency}_${Date.now()}`;
      this.polySynth.triggerAttack(frequency);
      this.activeNotes.set(id, { frequency, noteId: id });
      return id;
    } catch (error) {
      console.error("Error attacking note:", error);
      return "";
    }
  }

  releaseNote(noteId?: string) {
    try {
      if (noteId && this.activeNotes.has(noteId)) {
        const noteData = this.activeNotes.get(noteId);
        if (noteData) {
          this.polySynth.triggerRelease(noteData.frequency);
          this.activeNotes.delete(noteId);
        }
      } else {
        // Release all notes if no specific noteId provided
        this.polySynth.releaseAll();
        this.activeNotes.clear();
      }
    } catch (error) {
      console.error("Error releasing note:", error);
    }
  }

  // New method to release a specific frequency
  releaseNoteByFrequency(frequency: number) {
    try {
      this.polySynth.triggerRelease(frequency);
      // Remove from active notes
      for (const [id, noteData] of this.activeNotes.entries()) {
        if (noteData.frequency === frequency) {
          this.activeNotes.delete(id);
          break;
        }
      }
    } catch (error) {
      console.error("Error releasing note by frequency:", error);
    }
  }

  // Get currently active notes
  getActiveNotes(): Array<{ frequency: number; noteId: string }> {
    return Array.from(this.activeNotes.values());
  }

  // Check if a specific note is active
  isNoteActive(noteId: string): boolean {
    return this.activeNotes.has(noteId);
  }

  async playNoteByName(
    noteName: string,
    octave: number = 4,
    duration: string = "1n"
  ) {
    try {
      await this.initialize();
      const noteWithOctave = `${noteName}${octave}`;
      this.polySynth.triggerAttackRelease(noteWithOctave, duration);
    } catch (error) {
      console.error("Error playing note by name:", error);
    }
  }

  async playSequence(notes: string[], tempo: number = 120) {
    try {
      await this.initialize();

      // Set the tempo
      const transport = Tone.getTransport();
      transport.bpm.value = tempo;

      // Create a sequence
      const sequence = new Tone.Sequence(
        (time, note) => {
          this.polySynth.triggerAttackRelease(note, "8n", time);
        },
        notes,
        "4n"
      );

      // Start the sequence
      sequence.start(0);
      transport.start();

      // Stop after the sequence completes
      setTimeout(() => {
        sequence.stop();
        transport.stop();
        sequence.dispose();
      }, notes.length * (60 / tempo) * 1000);
    } catch (error) {
      console.error("Error playing sequence:", error);
    }
  }

  stop() {
    this.polySynth.releaseAll();
    this.activeNotes.clear();
  }

  dispose() {
    this.polySynth.dispose();
  }
}

// Export a singleton instance
export const audioService = new AudioService();
