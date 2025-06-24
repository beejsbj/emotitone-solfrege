import { defineStore } from "pinia";
import { ref, computed, readonly } from "vue";
import { musicTheory } from "@/services/music";
import type {
  SolfegeData,
  MelodicPattern,
  MusicalMode,
  ActiveNote,
} from "@/types/music";
import { audioService } from "@/services/audio";
import { useInstrumentStore } from "@/stores/instrument";

export const useMusicStore = defineStore("music", () => {
  // Get instrument store for current instrument info
  const instrumentStore = useInstrumentStore();

  // State
  const currentKey = ref<string>("C");
  const currentMode = ref<MusicalMode>("major");
  const currentNote = ref<string | null>(null); // Keep for backward compatibility
  const activeNotes = ref<Map<string, ActiveNote>>(new Map());
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
          octave: 4,
          instrument: instrumentStore.currentInstrument,
          instrumentConfig: instrumentStore.currentInstrumentConfig,
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

  async function attackNote(
    solfegeIndex: number,
    octave: number = 4
  ): Promise<string | null> {
    const solfege = solfegeData.value[solfegeIndex];
    if (solfege) {
      // Get the actual note name and frequency
      const frequency = musicTheory.getNoteFrequency(solfegeIndex, octave);
      const noteName = `${
        musicTheory.getCurrentScaleNotes()[solfegeIndex]
      }${octave}`;

      // Attack the audio and get note ID
      const noteId = await audioService.attackNote(frequency);

      if (noteId) {
        // Create active note object
        const activeNote: ActiveNote = {
          solfegeIndex,
          solfege,
          frequency,
          octave,
          noteId,
          noteName,
        };

        // Add to active notes
        activeNotes.value.set(noteId, activeNote);

        // Update legacy state for backward compatibility
        currentNote.value = solfege.name;
        isPlaying.value = true;

        // Dispatch custom event for background effects
        const notePlayedEvent = new CustomEvent("note-played", {
          detail: {
            note: solfege,
            frequency,
            solfegeIndex,
            octave,
            noteId,
            noteName,
            instrument: instrumentStore.currentInstrument,
            instrumentConfig: instrumentStore.currentInstrumentConfig,
          },
        });
        window.dispatchEvent(notePlayedEvent);

        return noteId;
      }
    }
    return null;
  }

  function releaseNote(noteId?: string) {
    if (noteId && activeNotes.value.has(noteId)) {
      // Release specific note
      const activeNote = activeNotes.value.get(noteId);
      if (activeNote) {
        audioService.releaseNote(noteId);

        // Dispatch custom event for background effects
        const noteReleasedEvent = new CustomEvent("note-released", {
          detail: {
            note: activeNote.solfege.name,
            noteId,
            noteName: activeNote.noteName,
            frequency: activeNote.frequency,
            octave: activeNote.octave,
            instrument: instrumentStore.currentInstrument,
            instrumentConfig: instrumentStore.currentInstrumentConfig,
          },
        });
        window.dispatchEvent(noteReleasedEvent);

        // Remove from active notes
        activeNotes.value.delete(noteId);

        // Update legacy state if this was the current note
        if (currentNote.value === activeNote.solfege.name) {
          // Set to another active note or null
          const remainingNotes = Array.from(activeNotes.value.values());
          currentNote.value =
            remainingNotes.length > 0 ? remainingNotes[0].solfege.name : null;
        }
      }
    } else {
      // Release all notes (legacy behavior)
      const allActiveNotes = Array.from(activeNotes.value.values());
      audioService.releaseNote();

      // Dispatch events for all released notes
      allActiveNotes.forEach((activeNote) => {
        const noteReleasedEvent = new CustomEvent("note-released", {
          detail: {
            note: activeNote.solfege.name,
            noteId: activeNote.noteId,
            noteName: activeNote.noteName,
            frequency: activeNote.frequency,
            octave: activeNote.octave,
            instrument: instrumentStore.currentInstrument,
            instrumentConfig: instrumentStore.currentInstrumentConfig,
          },
        });
        window.dispatchEvent(noteReleasedEvent);
      });

      // Clear all active notes
      activeNotes.value.clear();
      currentNote.value = null;
    }

    // Update playing state
    isPlaying.value = activeNotes.value.size > 0;
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

  // New polyphonic helper functions
  function getActiveNotes(): ActiveNote[] {
    return Array.from(activeNotes.value.values());
  }

  function getActiveNoteNames(): string[] {
    return getActiveNotes().map((note) => note.noteName);
  }

  function isNoteActive(noteId: string): boolean {
    return activeNotes.value.has(noteId);
  }

  function releaseAllNotes() {
    releaseNote(); // Call without noteId to release all
  }

  // Enhanced attack note with octave support
  async function attackNoteWithOctave(
    solfegeIndex: number,
    octave: number
  ): Promise<string | null> {
    return await attackNote(solfegeIndex, octave);
  }

  return {
    // State
    currentKey,
    currentMode,
    currentNote,
    activeNotes: readonly(activeNotes), // Make reactive but read-only
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
    attackNoteWithOctave,
    releaseNote,
    releaseAllNotes,
    addToSequence,
    clearSequence,
    removeLastFromSequence,
    getSolfegeByName,
    getNoteFrequency,
    getMelodicPatterns,

    // Polyphonic helpers
    getActiveNotes,
    getActiveNoteNames,
    isNoteActive,
  };
});
