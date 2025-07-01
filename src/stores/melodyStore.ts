// @ts-nocheck
// Simplified melody store with minimal dependencies
import { defineStore } from "pinia";
import { ref } from "vue";
import { melodies } from "../data/melodies";
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

// Simple duration mapping for basic playback
const durationMap: Record<string, number> = {
  '1n': 4000,   // whole note
  '2n': 2000,   // half note
  '4n': 1000,   // quarter note
  '8n': 500,    // eighth note
  '16n': 250,   // sixteenth note
};

export const useMelodyStore = defineStore("melody", () => {
  const selectedMelody = ref<string>(Object.keys(melodies)[0]);
  const isPlaying = ref<boolean>(false);
  const bpm = ref<number>(melodies[selectedMelody.value].defaultBpm || 120);
  const highlightedNote = ref<string | null>(null);

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
  }

  async function playMelody(): Promise<void> {
    if (isPlaying.value) {
      stopPlayback();
    }

    const melody = melodies[selectedMelody.value];
    if (!melody) return;

    isPlaying.value = true;

    try {
      // Simple sequential playback
      for (const { note, duration } of melody.notes) {
        if (!isPlaying.value) break;
        
        highlightedNote.value = getBaseNote(note);
        
        // Calculate duration in milliseconds using BPM adjustment
        const baseDurationMs = durationMap[duration] || 1000;
        const adjustedDurationMs = (baseDurationMs * 120) / bpm.value;
        
        // Wait for the note duration
        await new Promise<void>(resolve => setTimeout(resolve, adjustedDurationMs));
        
        highlightedNote.value = null;
      }
      
      stopPlayback();
    } catch (error) {
      logger.error("Error playing melody:", error);
      stopPlayback();
    }
  }

  function stopPlayback(): void {
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