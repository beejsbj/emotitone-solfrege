import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { musicTheory } from "@/services/music";
import type { SolfegeData, MelodicPattern, MusicalMode } from "@/types/music";
import { audioService } from "@/services/audio";

export const useMusicStore = defineStore("music", () => {
  // State
  const currentKey = ref<string>("C");
  const currentMode = ref<MusicalMode>("major");
  const currentNote = ref<string | null>(null);
  const isPlaying = ref<boolean>(false);
  const sequence = ref<string[]>([]);

  // Getters
  const currentScale = computed(() => musicTheory.getCurrentScale());

  const currentScaleNotes = computed(() => {
    musicTheory.setCurrentKey(currentKey.value);
    musicTheory.setCurrentMode(currentMode.value);
    return musicTheory.getCurrentScaleNotes();
  });

  const solfegeData = computed(() => {
    // Return the base solfege data - colors are now handled by ColorService
    return currentScale.value.solfege;
  });

  const currentKeyDisplay = computed(() => {
    return `${currentKey.value} ${
      currentMode.value.charAt(0).toUpperCase() + currentMode.value.slice(1)
    }`;
  });

  // Actions
  function setKey(key: string) {
    currentKey.value = key;
    musicTheory.setCurrentKey(key);
  }

  function setMode(mode: MusicalMode) {
    currentMode.value = mode;
    musicTheory.setCurrentMode(mode);
  }

  async function playNote(solfegeIndex: number) {
    const solfege = solfegeData.value[solfegeIndex];
    if (solfege) {
      currentNote.value = solfege.name;
      isPlaying.value = true;

      // Get the actual note name and play it
      const frequency = musicTheory.getNoteFrequency(solfegeIndex, 4);

      // Play the audio
      await audioService.playNote(frequency, "1n");

      // Dispatch custom event for background effects
      const notePlayedEvent = new CustomEvent("note-played", {
        detail: {
          note: solfege,
          frequency,
          solfegeIndex,
        },
      });
      window.dispatchEvent(notePlayedEvent);

      // Auto-reset after 2 seconds
      setTimeout(() => {
        currentNote.value = null;
        isPlaying.value = false;
      }, 2000);
    }
  }

  async function attackNote(solfegeIndex: number) {
    const solfege = solfegeData.value[solfegeIndex];
    if (solfege) {
      currentNote.value = solfege.name;
      isPlaying.value = true;

      // Get the actual note name and attack it
      const frequency = musicTheory.getNoteFrequency(solfegeIndex, 4);

      // Attack the audio
      await audioService.attackNote(frequency);

      // Dispatch custom event for background effects
      const notePlayedEvent = new CustomEvent("note-played", {
        detail: {
          note: solfege,
          frequency,
          solfegeIndex,
        },
      });
      window.dispatchEvent(notePlayedEvent);
    }
  }

  function releaseNote() {
    audioService.releaseNote();

    // Dispatch custom event for background effects before resetting state
    const noteReleasedEvent = new CustomEvent("note-released", {
      detail: {
        note: currentNote.value,
        isPlaying: isPlaying.value,
      },
    });
    window.dispatchEvent(noteReleasedEvent);

    // Reset state after a short delay to allow for release envelope
    setTimeout(() => {
      currentNote.value = null;
      isPlaying.value = false;
    }, 100);
  }

  function addToSequence(solfegeName: string) {
    if (sequence.value.length < 16) {
      // Max 4 sections of 4 notes
      sequence.value.push(solfegeName);
    }
  }

  function clearSequence() {
    sequence.value = [];
  }

  function removeLastFromSequence() {
    sequence.value.pop();
  }

  function getSolfegeByName(name: string): SolfegeData | undefined {
    return solfegeData.value.find((s: SolfegeData) => s.name === name);
  }

  function getNoteFrequency(solfegeIndex: number, octave: number = 4): number {
    return musicTheory.getNoteFrequency(solfegeIndex, octave);
  }

  function getMelodicPatterns(): MelodicPattern[] {
    return musicTheory.getMelodicPatterns();
  }

  return {
    // State
    currentKey,
    currentMode,
    currentNote,
    isPlaying,
    sequence,

    // Getters
    currentScale,
    currentScaleNotes,
    solfegeData,
    currentKeyDisplay,

    // Actions
    setKey,
    setMode,
    playNote,
    attackNote,
    releaseNote,
    addToSequence,
    clearSequence,
    removeLastFromSequence,
    getSolfegeByName,
    getNoteFrequency,
    getMelodicPatterns,
  };
});
