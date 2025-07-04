import { defineStore } from "pinia";
import { ref, computed, readonly } from "vue";
import { musicTheory, CHROMATIC_NOTES } from "@/services/music";
import type {
  SolfegeData,
  Melody,
  MusicalMode,
  ActiveNote,
  ChromaticNote,
  CategorizedMelody,
  MelodyCategory,
} from "@/types/music";
import { audioService } from "@/services/audio";
import { useInstrumentStore } from "@/stores/instrument";
import {
  MAJOR_SOLFEGE,
  MINOR_SOLFEGE,
  type Scale,
  getAllMelodicPatterns,
} from "@/data";

// Type for note input - either a chromatic note with octave or solfege index
type NoteInput = string | { solfegeIndex: number; octave: number };

// Type for chromatic note with octave (e.g., "C4", "F#5")
type ChromaticNoteWithOctave = `${ChromaticNote}${number}`;

export const useMusicStore = defineStore(
  "music",
  () => {
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
      musicTheory.setCurrentKey(currentKey.value as ChromaticNote);
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

    // Melody-related getters
    const allMelodies = computed<CategorizedMelody[]>(() => {
      return musicTheory.getAllMelodies();
    });

    const melodiesByCategory = computed(() => {
      return (category: MelodyCategory) =>
        musicTheory.getMelodiesByCategory(category);
    });

    // Helper function to convert note input to solfege index and octave
    function parseNoteInput(
      note: NoteInput
    ): { solfegeIndex: number; octave: number } | null {
      if (typeof note === "string") {
        // Handle chromatic note with octave (e.g., "C4", "F#5")
        const noteName = note.slice(0, -1);
        const octave = parseInt(note.slice(-1));

        // Get current scale notes
        const scaleNotes = currentScaleNotes.value;

        // Try to find exact match in scale
        const noteInScale = scaleNotes.find((n) => {
          const normalizedNote = n.replace("#", "").replace("b", "");
          const normalizedInput = noteName.replace("#", "").replace("b", "");
          return normalizedNote === normalizedInput;
        });

        if (noteInScale) {
          return {
            solfegeIndex: scaleNotes.indexOf(noteInScale),
            octave,
          };
        }

        // If not in scale, find closest scale degree
        const chromaticIndex = CHROMATIC_NOTES.indexOf(
          noteName as ChromaticNote
        );
        if (chromaticIndex !== -1) {
          const keyIndex = CHROMATIC_NOTES.indexOf(
            currentKey.value as ChromaticNote
          );
          const relativeIndex = (chromaticIndex - keyIndex + 12) % 12;
          return {
            solfegeIndex: Math.floor(relativeIndex / 2),
            octave,
          };
        }

        return null;
      }

      // Already in solfege index format
      return note;
    }

    // Helper function to convert chromatic note to solfege index and octave
    function parseChromatic(
      note: ChromaticNoteWithOctave
    ): { solfegeIndex: number; octave: number } | null {
      const noteName = note.slice(0, -1) as ChromaticNote;
      const octave = parseInt(note.slice(-1));

      // Get current scale notes
      const scaleNotes = currentScaleNotes.value;

      // Try to find exact match in scale
      const noteInScale = scaleNotes.find((n) => {
        const normalizedNote = n.replace("#", "").replace("b", "");
        const normalizedInput = noteName.replace("#", "").replace("b", "");
        return normalizedNote === normalizedInput;
      });

      if (noteInScale) {
        return {
          solfegeIndex: scaleNotes.indexOf(noteInScale),
          octave,
        };
      }

      // If not in scale, find closest scale degree
      const chromaticIndex = CHROMATIC_NOTES.indexOf(noteName);
      if (chromaticIndex !== -1) {
        const keyIndex = CHROMATIC_NOTES.indexOf(
          currentKey.value as ChromaticNote
        );
        const relativeIndex = (chromaticIndex - keyIndex + 12) % 12;
        return {
          solfegeIndex: Math.floor(relativeIndex / 2),
          octave,
        };
      }

      return null;
    }

    // Actions
    function setKey(key: string) {
      currentKey.value = key;
      musicTheory.setCurrentKey(key as ChromaticNote);
    }

    function setMode(mode: MusicalMode) {
      currentMode.value = mode;
      musicTheory.setCurrentMode(mode);
    }

    // Play note with either format
    async function playNoteWithFormat(
      input: number | ChromaticNoteWithOctave,
      octave: number = 4
    ): Promise<void> {
      let solfegeIndex: number;
      let finalOctave: number;

      if (typeof input === "number") {
        solfegeIndex = input;
        finalOctave = octave;
      } else {
        const parsed = parseChromatic(input);
        if (!parsed) {
          console.warn(`Invalid note: ${input}`);
          return;
        }
        solfegeIndex = parsed.solfegeIndex;
        finalOctave = parsed.octave;
      }

      const solfege = solfegeData.value[solfegeIndex];
      if (solfege) {
        currentNote.value = solfege.name;
        isPlaying.value = true;

        const frequency = musicTheory.getNoteFrequency(
          solfegeIndex,
          finalOctave
        );
        const noteName = musicTheory.getNoteName(solfegeIndex, finalOctave);

        await audioService.playNote(noteName, "1n");

        const notePlayedEvent = new CustomEvent("note-played", {
          detail: {
            note: solfege,
            frequency,
            noteName,
            solfegeIndex,
            octave: finalOctave,
            instrument: instrumentStore.currentInstrument,
            instrumentConfig: instrumentStore.currentInstrumentConfig,
          },
        });
        window.dispatchEvent(notePlayedEvent);

        setTimeout(() => {
          currentNote.value = null;
          isPlaying.value = false;
        }, 2000);
      }
    }

    // Attack note with either format
    async function attackNoteWithFormat(
      input: number | ChromaticNoteWithOctave,
      octave: number = 4
    ): Promise<string | null> {
      let solfegeIndex: number;
      let finalOctave: number;

      if (typeof input === "number") {
        solfegeIndex = input;
        finalOctave = octave;
      } else {
        const parsed = parseChromatic(input);
        if (!parsed) {
          console.warn(`Invalid note: ${input}`);
          return null;
        }
        solfegeIndex = parsed.solfegeIndex;
        finalOctave = parsed.octave;
      }

      const solfege = solfegeData.value[solfegeIndex];
      if (solfege) {
        const frequency = musicTheory.getNoteFrequency(
          solfegeIndex,
          finalOctave
        );
        const noteName = musicTheory.getNoteName(solfegeIndex, finalOctave);

        const cleanNoteId = `${noteName}_${solfegeIndex}_${finalOctave}`;
        const noteId = await audioService.attackNote(
          noteName,
          cleanNoteId,
          frequency
        );

        if (noteId) {
          const activeNote: ActiveNote = {
            solfegeIndex,
            solfege,
            frequency,
            octave: finalOctave,
            noteId,
            noteName,
          };

          activeNotes.value.set(noteId, activeNote);
          currentNote.value = solfege.name;
          isPlaying.value = true;

          const notePlayedEvent = new CustomEvent("note-played", {
            detail: {
              note: solfege,
              frequency,
              solfegeIndex,
              octave: finalOctave,
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

    // Play note with duration with either format
    async function playNoteWithDurationFormat(
      input: number | ChromaticNoteWithOctave,
      octaveOrDuration: number | string,
      durationOrTime?: string | number,
      timeOrInstrument?: number | string,
      specificInstrument?: string
    ): Promise<string> {
      let solfegeIndex: number;
      let finalOctave: number;
      let duration: string;
      let time: number | undefined;
      let instrument: string | undefined;

      if (typeof input === "number") {
        solfegeIndex = input;
        finalOctave = octaveOrDuration as number;
        duration = durationOrTime as string;
        time = timeOrInstrument as number;
        instrument = specificInstrument;
      } else {
        const parsed = parseChromatic(input);
        if (!parsed) {
          console.warn(`Invalid note: ${input}`);
          return "";
        }
        solfegeIndex = parsed.solfegeIndex;
        finalOctave = parsed.octave;
        duration = octaveOrDuration as string;
        time = durationOrTime as number;
        instrument = timeOrInstrument as string;
      }

      const solfege = solfegeData.value[solfegeIndex];
      if (solfege) {
        const noteName = musicTheory.getNoteName(solfegeIndex, finalOctave);
        const frequency = musicTheory.getNoteFrequency(
          solfegeIndex,
          finalOctave
        );

        const noteId = await audioService.playNoteWithDuration(
          noteName,
          duration,
          time
        );

        const instrumentToReport =
          instrument || instrumentStore.currentInstrument;
        const { getInstrumentConfig } = await import("@/data/instruments");
        const instrumentConfig = instrument
          ? getInstrumentConfig(instrument)
          : instrumentStore.currentInstrumentConfig;

        const notePlayedEvent = new CustomEvent("note-played", {
          detail: {
            note: solfege,
            frequency,
            noteName,
            solfegeIndex,
            octave: finalOctave,
            duration,
            time,
            instrument: instrumentToReport,
            instrumentConfig: instrumentConfig,
            sequencerInstrument: instrument,
          },
        });
        window.dispatchEvent(notePlayedEvent);

        return noteId;
      }
      return "";
    }

    // Public API with overloads
    async function playNote(solfegeIndex: number): Promise<void>;
    async function playNote(note: ChromaticNoteWithOctave): Promise<void>;
    async function playNote(
      input: number | ChromaticNoteWithOctave
    ): Promise<void> {
      return playNoteWithFormat(input);
    }

    async function attackNote(
      solfegeIndex: number,
      octave?: number
    ): Promise<string | null>;
    async function attackNote(
      note: ChromaticNoteWithOctave
    ): Promise<string | null>;
    async function attackNote(
      input: number | ChromaticNoteWithOctave,
      octave?: number
    ): Promise<string | null> {
      return attackNoteWithFormat(input, octave);
    }

    async function playNoteWithDuration(
      solfegeIndex: number,
      octave: number,
      duration: string,
      time?: number,
      specificInstrument?: string
    ): Promise<string>;
    async function playNoteWithDuration(
      note: ChromaticNoteWithOctave,
      duration: string,
      time?: number,
      specificInstrument?: string
    ): Promise<string>;
    async function playNoteWithDuration(
      input: number | ChromaticNoteWithOctave,
      octaveOrDuration: number | string,
      durationOrTime?: string | number,
      timeOrInstrument?: number | string,
      specificInstrument?: string
    ): Promise<string> {
      return playNoteWithDurationFormat(
        input,
        octaveOrDuration,
        durationOrTime,
        timeOrInstrument,
        specificInstrument
      );
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

    function getNoteFrequency(
      solfegeIndex: number,
      octave: number = 4
    ): number {
      return musicTheory.getNoteFrequency(solfegeIndex, octave);
    }

    function getNoteName(solfegeIndex: number, octave: number = 4): string {
      return musicTheory.getNoteName(solfegeIndex, octave);
    }

    function getMelodicPatterns(): Melody[] {
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
      return attackNoteWithFormat(solfegeIndex, octave);
    }

    // Methods for melody management
    function searchMelodies(query: string): CategorizedMelody[] {
      return musicTheory.searchMelodies(query);
    }

    function getMelodiesByEmotion(emotion: string): CategorizedMelody[] {
      return musicTheory.getMelodiesByEmotion(emotion);
    }

    function addUserMelody(
      melody: Omit<Melody, "category">
    ): CategorizedMelody {
      return musicTheory.addUserMelody(melody);
    }

    function removeUserMelody(melodyName: string): void {
      musicTheory.removeUserMelody(melodyName);
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
      allMelodies,
      melodiesByCategory,

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
      getNoteName,
      getMelodicPatterns,

      // Polyphonic helpers
      getActiveNotes,
      getActiveNoteNames,
      isNoteActive,
      playNoteWithDuration,

      // Add new melody management methods
      searchMelodies,
      getMelodiesByEmotion,
      addUserMelody,
      removeUserMelody,

      parseNoteInput, // Export for testing/debugging
    };
  },
  {
    persist: true,
  }
);
