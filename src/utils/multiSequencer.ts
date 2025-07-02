import * as Tone from "tone";
import type { SequencerInstance, SequencerBeat } from "@/types/music";
import { SequencerTransport } from "@/utils/sequencer";
import { calculateNoteDuration } from "@/utils/duration";
import { useMusicStore } from "@/stores/music";
import { useInstrumentStore } from "@/stores/instrument";
import { useMultiSequencerStore } from "@/stores/multiSequencer";

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
      const multiSequencerStore = useMultiSequencerStore();
      const currentSequencer = multiSequencerStore.sequencers.find(
        (s) => s.id === sequencerId
      );
      return currentSequencer?.beats || [];
    };

    const getReactiveSequencer = () => {
      const multiSequencerStore = useMultiSequencerStore();
      return multiSequencerStore.sequencers.find((s) => s.id === sequencerId);
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
        const multiSequencerStore = useMultiSequencerStore();
        multiSequencerStore.updateSequencerStep(sequencerId, step);
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
        // Apply volume to the instrument (convert 0-1 range to dB)
        const originalVolume = sequencerInstrument.volume?.value || 0;
        if (sequencerInstrument.volume && sequencer.volume !== 1) {
          // Convert linear volume (0-1) to dB and apply
          const volumeDb = 20 * Math.log10(Math.max(0.001, sequencer.volume));
          sequencerInstrument.volume.value = originalVolume + volumeDb;
        }

        // Trigger the note on the sequencer's specific instrument
        sequencerInstrument.triggerAttackRelease(
          noteName,
          noteDuration.toneNotation,
          time
        );

        // Restore original volume after note (if volume was changed)
        if (sequencerInstrument.volume && sequencer.volume !== 1) {
          // Use a slight delay to ensure note has started
          setTimeout(() => {
            if (sequencerInstrument.volume) {
              sequencerInstrument.volume.value = originalVolume;
            }
          }, 50);
        }

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
          `🎵 Playing ${noteName} on ${sequencer.instrument} (sequencer ${sequencer.id})`
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
