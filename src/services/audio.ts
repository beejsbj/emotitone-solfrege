import * as Tone from "tone";
import { logger, performanceLogger } from "@/utils/logger";

/**
 * Enhanced Audio Service that can handle both note names and frequencies
 * Prefers note names for better Tone.js compatibility, but supports frequencies for visual effects
 */
export class AudioService {
  private isInitialized = false;
  private activeNotes: Map<
    string,
    { note: string | number; noteId: string; frequency?: number }
  > = new Map();
  private instrumentStore: any = null;
  private userInteractionReceived = false;

  constructor() {
    // Don't initialize instruments here to avoid Pinia issues
    // Instruments will be initialized lazily when needed

    // Listen for user interaction to enable audio context
    this.setupUserInteractionListener();
  }

  private setupUserInteractionListener() {
    const enableAudio = () => {
      this.userInteractionReceived = true;
      document.removeEventListener("click", enableAudio);
      document.removeEventListener("keydown", enableAudio);
      document.removeEventListener("touchstart", enableAudio);
    };

    document.addEventListener("click", enableAudio);
    document.addEventListener("keydown", enableAudio);
    document.addEventListener("touchstart", enableAudio);
  }

  private async getInstrumentStore() {
    if (!this.instrumentStore) {
      try {
        // Lazy import to avoid Pinia initialization issues
        const { useInstrumentStore } = await import("@/stores/instrument");
        this.instrumentStore = useInstrumentStore();
        // Initialize instruments if not already done
        await this.instrumentStore.initializeInstruments();
      } catch (error) {
        logger.error("Failed to initialize instrument store:", error);
        throw new Error("Instrument system unavailable");
      }
    }
    return this.instrumentStore;
  }

  async initialize() {
    if (!this.isInitialized) {
      try {
        // Wait for user interaction if not received yet
        if (!this.userInteractionReceived) {
          logger.dev("Waiting for user interaction to enable audio...");
          return;
        }

        // Check if audio context is already running
        const context = Tone.getContext();
        if (context.state === "suspended") {
          logger.dev("Starting Tone.js audio context...");
          await Tone.start();
        } else if (context.state === "running") {
          logger.dev("Audio context already running");
        }

        this.isInitialized = true;
        logger.dev("Audio context state:", context.state);
      } catch (error) {
        logger.error("Failed to start audio context:", error);
        // Don't throw error, just log it and continue
        this.isInitialized = false;
      }
    }
  }

  // Method to manually start audio context (can be called from UI)
  async startAudioContext(): Promise<boolean> {
    try {
      this.userInteractionReceived = true;
      const context = Tone.getContext();

      if (context.state === "suspended") {
        await Tone.start();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this.isInitialized = true;
      logger.dev("Audio context manually started, state:", context.state);
      return context.state === "running";
    } catch (error) {
      logger.error("Failed to manually start audio context:", error);
      return false;
    }
  }

  // Check if audio is ready to use
  isAudioReady(): boolean {
    return this.isInitialized && Tone.getContext().state === "running";
  }

  // Get audio context state
  getAudioState(): string {
    return Tone.getContext().state;
  }

  async playNote(note: string | number, duration: string = "1n") {
    try {
      // Force user interaction and audio context start
      if (!this.userInteractionReceived) {
        this.userInteractionReceived = true;
      }

      await this.initialize();

      // Ensure audio context is properly started
      const context = Tone.getContext();
      if (context.state === "suspended") {
        logger.dev("Audio context suspended, starting...");
        await Tone.start();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const instrumentStore = await this.getInstrumentStore();
      const instrument = instrumentStore.getCurrentInstrument();

      if (instrument && Tone.getContext().state === "running") {
        try {
          // Use note name directly if provided, otherwise use frequency
          const noteToPlay = typeof note === "string" ? note : note;

          // All instruments now have consistent API
          instrument.triggerAttackRelease(noteToPlay, duration);
        } catch (triggerError) {
          logger.error(
            "Error triggering instrument in playNote:",
            triggerError
          );
          logger.dev(
            "Instrument type:",
            instrument.constructor?.name || "Unknown"
          );
          logger.dev("Note:", note);
        }
              } else {
          logger.warn(
            "Cannot play note - audio context not ready or no instrument"
          );
        }
      } catch (error) {
        logger.error("Error playing note:", error);
      }
  }

  async playNoteWithDuration(note: string | number, duration: string, time?: number): Promise<string> {
    try {
      // Force user interaction and audio context start
      if (!this.userInteractionReceived) {
        this.userInteractionReceived = true;
      }

      await this.initialize();

      // Ensure audio context is properly started
      const context = Tone.getContext();
      if (context.state === "suspended") {
        console.log("Audio context suspended, starting...");
        await Tone.start();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const instrumentStore = await this.getInstrumentStore();
      const instrument = instrumentStore.getCurrentInstrument();

      if (instrument && Tone.getContext().state === "running") {
        try {
          // Use note name directly if provided, otherwise use frequency
          const noteToPlay = typeof note === "string" ? note : note;
          
          // Create a unique note ID for tracking
          const noteId = `note_${typeof note === "string" ? note : note}_${Date.now()}_${Math.random()}`;

          // Schedule the note with proper duration and timing
          if (time !== undefined) {
            // Schedule for future playback
            instrument.triggerAttackRelease(noteToPlay, duration, time);
          } else {
            // Play immediately
            instrument.triggerAttackRelease(noteToPlay, duration);
          }

          return noteId;
        } catch (triggerError) {
          console.error(
            "Error triggering instrument in playNoteWithDuration:",
            triggerError
          );
          console.log(
            "Instrument type:",
            instrument.constructor?.name || "Unknown"
          );
          console.log("Note:", note, "Duration:", duration);
        }
      } else {
        console.warn(
          "Cannot play note - audio context not ready or no instrument"
        );
      }
    } catch (error) {
      console.error("Error playing note with duration:", error);
    }
    return "";
  }

  async attackNote(
    note: string | number,
    noteId?: string,
    frequency?: number
  ): Promise<string> {
    try {
      // Force user interaction and audio context start
      if (!this.userInteractionReceived) {
        this.userInteractionReceived = true;
      }

      await this.initialize();

      // Ensure audio context is properly started
      const context = Tone.getContext();
      if (context.state === "suspended") {
        logger.dev("Audio context suspended, starting...");
        await Tone.start();
        // Wait a bit for context to fully start
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const instrumentStore = await this.getInstrumentStore();
      const instrument = instrumentStore.getCurrentInstrument();

      if (instrument && typeof instrument.triggerAttack === "function") {
        const id =
          noteId ||
          `note_${typeof note === "string" ? note : note}_${Date.now()}`;

        // Additional safety check before triggering
        if (Tone.getContext().state === "running") {
          try {
            // Use note name directly if provided, otherwise use frequency
            const noteToPlay = typeof note === "string" ? note : note;

            // All instruments now have consistent API
            instrument.triggerAttack(noteToPlay);
            this.activeNotes.set(id, {
              note: noteToPlay,
              noteId: id,
              frequency,
            });
            return id;
          } catch (triggerError) {
            logger.error("Error triggering instrument:", triggerError);
            logger.dev(
              "Instrument type:",
              instrument.constructor?.name || "Unknown"
            );
            logger.dev("Note:", note);
          }
                  } else {
            logger.warn("Audio context not running, cannot attack note");
          }
        } else {
          logger.warn("No valid instrument available for note attack");
        }
        return "";
      } catch (error) {
        logger.error("Error attacking note:", error);
      return "";
    }
  }

  async releaseNote(noteId?: string) {
    try {
      const instrumentStore = await this.getInstrumentStore();
      const instrument = instrumentStore.getCurrentInstrument();
      if (!instrument) return;

      if (noteId && this.activeNotes.has(noteId)) {
        const noteData = this.activeNotes.get(noteId);
        if (noteData) {
          try {
            // All instruments now have consistent API
            instrument.triggerRelease(noteData.note);
            this.activeNotes.delete(noteId);
          } catch (releaseError) {
            logger.error("Error releasing note:", releaseError);
            // Still remove from active notes even if release failed
            this.activeNotes.delete(noteId);
          }
        }
      } else {
        // Release all notes if no specific noteId provided
        try {
          instrument.releaseAll();
        } catch (releaseError) {
          logger.error("Error releasing all notes:", releaseError);
        }
        this.activeNotes.clear();
      }
          } catch (error) {
        logger.error("Error releasing note:", error);
      }
  }

  // New method to release a specific frequency
  async releaseNoteByFrequency(frequency: number) {
    try {
      const instrumentStore = await this.getInstrumentStore();
      const instrument = instrumentStore.getCurrentInstrument();
      if (instrument) {
        try {
          // All instruments now have consistent API
          instrument.triggerRelease(frequency);

          // Remove from active notes
          for (const [id, noteData] of this.activeNotes.entries()) {
            if (noteData.frequency === frequency) {
              this.activeNotes.delete(id);
              break;
            }
          }
        } catch (releaseError) {
          logger.error("Error releasing note by frequency:", releaseError);
        }
      }
          } catch (error) {
        logger.error("Error releasing note by frequency:", error);
      }
  }

  // Get currently active notes
  getActiveNotes(): Array<{
    note: string | number;
    noteId: string;
    frequency?: number;
  }> {
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
      const instrumentStore = await this.getInstrumentStore();
      const instrument = instrumentStore.getCurrentInstrument();
      if (instrument) {
        const noteWithOctave = `${noteName}${octave}`;
        instrument.triggerAttackRelease(noteWithOctave, duration);
      }
    } catch (error) {
      logger.error("Error playing note by name:", error);
    }
  }

  async playSequence(notes: string[], tempo: number = 120) {
    try {
      await this.initialize();
      const instrumentStore = await this.getInstrumentStore();
      const instrument = instrumentStore.getCurrentInstrument();
      if (!instrument) return;

      // Set the tempo
      const transport = Tone.getTransport();
      transport.bpm.value = tempo;

      // Create a sequence
      const sequence = new Tone.Sequence(
        (time, note) => {
          instrument.triggerAttackRelease(note, "8n", time);
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
      logger.error("Error playing sequence:", error);
    }
  }

  async stop() {
    try {
      const instrumentStore = await this.getInstrumentStore();
      const instrument = instrumentStore.getCurrentInstrument();
      if (instrument) {
        instrument.releaseAll();
      }
      this.activeNotes.clear();
    } catch (error) {
      logger.error("Error stopping audio:", error);
    }
  }

  async dispose() {
    try {
      const instrumentStore = await this.getInstrumentStore();
      instrumentStore.dispose();
    } catch (error) {
      logger.error("Error disposing audio service:", error);
    }
  }
}

// Export a singleton instance
export const audioService = new AudioService();
