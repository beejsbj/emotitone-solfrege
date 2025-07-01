import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { melodies } from "../data/melodies";
import * as Tone from "tone";
import { logger } from "@/utils/logger";

// Define types for melody data
interface MelodyNote {
  note: string;
  duration: string;
}

interface Melody {
  notes: MelodyNote[];
  defaultBpm?: number;
  name?: string;
  description?: string;
}

type MelodyCollection = Record<string, Melody>;

export const useMelodyStore = defineStore("melody", () => {
  const selectedMelody = ref<string>(Object.keys(melodies)[0]);
  const isPlaying = ref<boolean>(false);
  const bpm = ref<number>(melodies[selectedMelody.value].defaultBpm || 120);
  const highlightedNote = ref<string | null>(null);
  let currentScheduleId: number[] | null = null;

  // Helper function to get base note without octave
  function getBaseNote(note: string): string {
    return note.replace(/\d+$/, "");
  }

  logger.dev(melodies);

  function setSelectedMelody(melodyName: string): void {
    selectedMelody.value = melodyName;
    const melody = melodies[melodyName];
    if (melody && melody.defaultBpm) {
      setBpm(melody.defaultBpm);
    }
  }

  function setBpm(newBpm: number): void {
    const validBpm = Math.max(40, Math.min(240, newBpm));
    bpm.value = validBpm;
    Tone.getTransport().bpm.value = validBpm;
  }

  async function playMelody(): Promise<void> {
    if (isPlaying.value) {
      // If already playing, stop the current playback first
      stopPlayback();
    }

    const melody = melodies[selectedMelody.value];
    if (!melody) return;

    isPlaying.value = true;

    // Make sure Transport is started
    await Tone.start();
    const transport = Tone.getTransport();
    transport.cancel(); // Clear any previous schedules
    transport.stop(); // Stop transport if it was running
    transport.position = 0; // Reset position
    transport.start();

    let currentTime = 0;

    try {
      melody.notes.forEach(({ note, duration }) => {
        // Schedule note start
        const startId = transport.schedule((time) => {
          // Note: Using basic synth for melody playback - could be enhanced
          const synth = new Tone.Synth().toDestination();
          synth.triggerAttackRelease(note, duration, time);
          highlightedNote.value = getBaseNote(note);
        }, currentTime);

        // Schedule note stop and calculate next time
        const durationSeconds = new Tone.Time(duration).toSeconds();
        const stopId = transport.schedule((time) => {
          highlightedNote.value = null;
        }, currentTime + durationSeconds);

        // Store schedule IDs for cleanup
        if (!currentScheduleId) currentScheduleId = [];
        currentScheduleId.push(startId, stopId);

        currentTime += durationSeconds;
      });

      // Schedule playback stop
      const finalId = transport.schedule((time) => {
        stopPlayback();
      }, currentTime);

      if (currentScheduleId) currentScheduleId.push(finalId);
    } catch (error) {
      logger.error("Error playing melody:", error);
      stopPlayback();
    }
  }

  function stopPlayback(): void {
    const transport = Tone.getTransport();

    // Clear all scheduled events
    if (currentScheduleId) {
      currentScheduleId.forEach((id) => transport.clear(id));
      currentScheduleId = null;
    }

    transport.cancel(); // Clear all scheduled events
    transport.stop(); // Stop the transport
    transport.position = 0; // Reset position

    isPlaying.value = false;
    highlightedNote.value = null;
  }

  return {
    selectedMelody,
    setSelectedMelody,
    isPlaying,
    bpm,
    highlightedNote,
    melodies: melodies as MelodyCollection,
    playMelody,
    stopPlayback,
    setBpm,
  };
});