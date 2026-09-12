import { defineStore } from "pinia";
import { ref, computed, readonly, watch } from "vue";
import { musicTheory, CHROMATIC_NOTES } from "@/services/music";
import { getModeDefinition } from "@/data";
import type {
  SolfegeData,
  MusicalMode,
  ActiveNote,
  ChromaticNote,
} from "@/types/music";
import * as superdoughAudio from "@/services/superdoughAudio";
import { useInstrumentStore } from "@/stores/instrument";
import { Note as TonalNote } from "@tonaljs/tonal";

// Type for note input - either a chromatic note with octave or solfege index
type NoteInput = string | { solfegeIndex: number; octave: number };

/**
 * Convert a Tone.js duration notation string to milliseconds.
 * Uses 120 BPM as the default (whole note = 2 000 ms).
 * e.g. "1n" → 2000, "2n" → 1000, "4n" → 500, "8n" → 250, "16n" → 125
 */
function toneNotationToMs(notation: string, bpm: number = 120): number {
  const match = notation.match(/^(\d+)n$/);
  if (match) {
    const noteValue = parseInt(match[1], 10);
    // wholeNoteDuration = (60 / bpm) * 4 seconds
    const wholeNoteMs = (60 / bpm) * 4 * 1000;
    return wholeNoteMs / noteValue;
  }
  // Fallback: treat as 500ms (quarter note at 120 BPM)
  return 500;
}

// Type for chromatic note with octave (e.g., "C4", "F#5")
type ChromaticNoteWithOctave = `${ChromaticNote}${number}`;

function normalizePitchClass(noteName: string): ChromaticNote | null {
  const candidates = [noteName, TonalNote.enharmonic(noteName)]
    .map((candidate) => TonalNote.get(candidate).pc)
    .filter(Boolean);

  for (const candidate of candidates) {
    if (CHROMATIC_NOTES.includes(candidate as ChromaticNote)) {
      return candidate as ChromaticNote;
    }
  }

  return null;
}

function parseNoteWithOctave(
  note: string
): { noteName: ChromaticNote; octave: number } | null {
  const match = note.trim().match(/^([A-Ga-g](?:#|b)?)(-?\d+)$/);
  if (!match) {
    return null;
  }

  const [, rawNoteName, rawOctave] = match;
  const noteName = normalizePitchClass(rawNoteName);
  const octave = Number.parseInt(rawOctave, 10);

  if (!noteName || Number.isNaN(octave)) {
    return null;
  }

  return { noteName, octave };
}

function borrowedPitchSolfege(noteName: ChromaticNote): SolfegeData {
  return {
    name: noteName,
    number: 0,
    emotion: "Borrowed harmony tone",
    description: "An explicit chord alteration outside the active scale.",
    texture: "harmonic",
  };
}

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
    const currentScale = computed(() => {
      // Bind the singleton service to reactive store state so downstream
      // consumers like the keyboard and visual systems actually refresh
      // when mode or key changes after initial mount.
      musicTheory.setCurrentKey(currentKey.value as ChromaticNote);
      musicTheory.setCurrentMode(currentMode.value);
      return musicTheory.getCurrentScale();
    });
    const currentModeDefinition = computed(() =>
      getModeDefinition(currentMode.value)
    );

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
      return `${currentKey.value} ${currentModeDefinition.value.label}`;
    });

    function getCurrentNoteContext() {
      return {
        mode: currentMode.value,
        key: currentKey.value as ChromaticNote,
      };
    }

    // Melody-related getters (removed)

    function getBaseOctave(
      noteName: ChromaticNote,
      actualOctave: number
    ): number {
      const noteIndex = CHROMATIC_NOTES.indexOf(noteName);
      const keyIndex = CHROMATIC_NOTES.indexOf(
        currentKey.value as ChromaticNote
      );

      if (noteIndex === -1 || keyIndex === -1) {
        return actualOctave;
      }

      return noteIndex < keyIndex ? actualOctave - 1 : actualOctave;
    }

    // Helper function to convert note input to solfege index and octave
    function parseNoteInput(
      note: NoteInput
    ): { solfegeIndex: number; octave: number } | null {
      if (typeof note === "string") {
        const parsedNote = parseNoteWithOctave(note);
        if (!parsedNote) {
          return null;
        }

        const { noteName, octave } = parsedNote;
        const solfegeIndex = musicTheory.getScaleIndexForChromaticNote(noteName);
        return solfegeIndex === null
          ? null
          : {
              solfegeIndex,
              octave: getBaseOctave(noteName, octave),
            };
      }

      return note;
    }

    // Helper function to convert chromatic note to solfege index and octave
    function parseChromatic(
      note: ChromaticNoteWithOctave
    ): { solfegeIndex: number; octave: number } | null {
      const parsedNote = parseNoteWithOctave(note);
      if (!parsedNote) {
        return null;
      }

      const { noteName, octave } = parsedNote;
      const solfegeIndex = musicTheory.getScaleIndexForChromaticNote(noteName);
      return solfegeIndex === null
        ? null
        : {
            solfegeIndex,
            octave: getBaseOctave(noteName, octave),
          };
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

    // Keep the MusicTheoryService singleton in sync with Pinia-persisted state.
    // Pinia's persist plugin restores ref values directly (bypassing setKey/setMode),
    // so a watcher with immediate:true ensures the service is always up-to-date
    // before any component calls getNoteName().
    watch(
      [currentKey, currentMode],
      ([key, mode]) => {
        musicTheory.setCurrentKey(key as ChromaticNote);
        musicTheory.setCurrentMode(mode);
      },
      { immediate: true }
    );

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
          return;
        }
        solfegeIndex = parsed.solfegeIndex;
        finalOctave = parsed.octave;
      }

      const solfege = solfegeData.value[solfegeIndex];
      if (solfege) {
        const noteContext = getCurrentNoteContext();
        currentNote.value = solfege.name;
        isPlaying.value = true;

        const frequency = musicTheory.getNoteFrequency(
          solfegeIndex,
          finalOctave
        );
        const noteName = musicTheory.getNoteName(solfegeIndex, finalOctave);
        const parsedNote = parseNoteWithOctave(noteName);
        const scientificOctave = parsedNote?.octave ?? finalOctave;
        const pitchClassIndex = parsedNote
          ? CHROMATIC_NOTES.indexOf(parsedNote.noteName)
          : undefined;

        await superdoughAudio.attackNote(
          `play_${noteName}_${Date.now()}`,
          noteName,
          instrumentStore.currentInstrument
        );

        const notePlayedEvent = new CustomEvent("note-played", {
          detail: {
            note: solfege,
            frequency,
            noteName,
            solfegeIndex,
            pitchClassIndex,
            octave: scientificOctave,
            keyboardOctave: finalOctave,
            durationMs: 2000,
            ...noteContext,
            instrument: instrumentStore.currentInstrument,
            instrumentConfig: null,
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
      octave: number = 4,
      isCancelled: () => boolean = () => false,
    ): Promise<string | null> {
      if (instrumentStore.isInteractionLocked || isCancelled()) {
        return null;
      }

      let solfegeIndex: number;
      let finalOctave: number;

      if (typeof input === "number") {
        solfegeIndex = input;
        finalOctave = octave;
      } else {
        const parsed = parseChromatic(input);
        if (!parsed) {
          return null;
        }
        solfegeIndex = parsed.solfegeIndex;
        finalOctave = parsed.octave;
      }

      const solfege = solfegeData.value[solfegeIndex];
      if (solfege) {
        const noteContext = getCurrentNoteContext();
        const frequency = musicTheory.getNoteFrequency(
          solfegeIndex,
          finalOctave
        );
        const noteName = musicTheory.getNoteName(solfegeIndex, finalOctave);
        const parsedNote = parseNoteWithOctave(noteName);
        const scientificOctave = parsedNote?.octave ?? finalOctave;
        const pitchClassIndex = parsedNote
          ? CHROMATIC_NOTES.indexOf(parsedNote.noteName)
          : undefined;

        const cleanNoteId = [
          noteName,
          solfegeIndex,
          finalOctave,
          Date.now(),
          Math.random().toString(36).slice(2, 8),
        ].join("_");
        const instrumentSelectionEpoch = instrumentStore.selectionEpoch;
        const attackInstrument = instrumentStore.currentInstrument;

        // Fire-and-forget via superdough — it manages its own voice lifecycle
        await superdoughAudio.attackNote(
          cleanNoteId,
          noteName,
          attackInstrument,
        );

        // A selection can begin warming while the asynchronous audio attack is
        // still starting. Never publish that stale voice into app state.
        if (
          isCancelled() ||
          instrumentStore.isInteractionLocked ||
          instrumentStore.selectionEpoch !== instrumentSelectionEpoch ||
          instrumentStore.currentInstrument !== attackInstrument
        ) {
          superdoughAudio.releaseNote(cleanNoteId);
          return null;
        }

        const noteId: string = cleanNoteId;

        if (noteId) {
          const activeNote: ActiveNote = {
            solfegeIndex,
            pitchClassIndex,
            solfege,
            frequency,
            octave: scientificOctave,
            keyboardOctave: finalOctave,
            noteId,
            noteName,
            ...noteContext,
          };

          activeNotes.value.set(noteId, activeNote);
          currentNote.value = solfege.name;
          isPlaying.value = true;

          const notePlayedEvent = new CustomEvent("note-played", {
            detail: {
              note: solfege,
              frequency,
              solfegeIndex,
              pitchClassIndex,
              octave: scientificOctave,
              keyboardOctave: finalOctave,
              noteId,
              noteName,
              ...noteContext,
              instrument: instrumentStore.currentInstrument,
              instrumentConfig: null,
            },
          });
          window.dispatchEvent(notePlayedEvent);

          return noteId;
        }
      }
      return null;
    }

    /**
     * Attack scientific pitch notation exactly. Unlike the compatibility
     * string overload on attackNote(), this never floors an out-of-scale pitch
     * to the preceding scale degree.
     */
    async function attackExactPitch(
      note: string,
      isCancelled: () => boolean = () => false,
    ): Promise<string | null> {
      if (instrumentStore.isInteractionLocked || isCancelled()) return null;

      const parsed = parseNoteWithOctave(note);
      if (!parsed) return null;

      const { noteName: pitchClass, octave } = parsed;
      const exactNoteName = `${pitchClass}${octave}`;
      const tonalNote = TonalNote.get(exactNoteName);
      if (!tonalNote.freq) return null;

      const solfegeIndex = currentScaleNotes.value.indexOf(pitchClass);
      const pitchClassIndex = CHROMATIC_NOTES.indexOf(pitchClass);
      const keyboardOctave = solfegeIndex === -1
        ? octave
        : parseNoteInput(exactNoteName)?.octave ?? octave;
      const solfege = solfegeIndex === -1
        ? borrowedPitchSolfege(pitchClass)
        : solfegeData.value[solfegeIndex];
      if (!solfege) return null;

      const noteContext = getCurrentNoteContext();
      const instrumentSelectionEpoch = instrumentStore.selectionEpoch;
      const attackInstrument = instrumentStore.currentInstrument;
      const cleanNoteId = [
        "exact",
        exactNoteName,
        Date.now(),
        Math.random().toString(36).slice(2, 8),
      ].join("_");

      await superdoughAudio.attackNote(
        cleanNoteId,
        exactNoteName,
        attackInstrument,
      );

      if (
        isCancelled()
        || instrumentStore.isInteractionLocked
        || instrumentStore.selectionEpoch !== instrumentSelectionEpoch
        || instrumentStore.currentInstrument !== attackInstrument
      ) {
        superdoughAudio.releaseNote(cleanNoteId);
        return null;
      }

      const activeNote: ActiveNote = {
        solfegeIndex,
        pitchClassIndex,
        solfege,
        frequency: tonalNote.freq,
        octave,
        keyboardOctave,
        noteId: cleanNoteId,
        noteName: exactNoteName,
        ...noteContext,
      };
      activeNotes.value.set(cleanNoteId, activeNote);
      currentNote.value = solfege.name;
      isPlaying.value = true;

      window.dispatchEvent(new CustomEvent("note-played", {
        detail: {
          note: solfege,
          frequency: tonalNote.freq,
          solfegeIndex,
          pitchClassIndex,
          isBorrowed: solfegeIndex === -1,
          octave,
          keyboardOctave,
          noteId: cleanNoteId,
          noteName: exactNoteName,
          ...noteContext,
          instrument: attackInstrument,
          instrumentConfig: null,
        },
      }));

      return cleanNoteId;
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
        const noteContext = getCurrentNoteContext();
        const noteName = musicTheory.getNoteName(solfegeIndex, finalOctave);
        const frequency = musicTheory.getNoteFrequency(
          solfegeIndex,
          finalOctave
        );
        const parsedNote = parseNoteWithOctave(noteName);
        const scientificOctave = parsedNote?.octave ?? finalOctave;
        const pitchClassIndex = parsedNote
          ? CHROMATIC_NOTES.indexOf(parsedNote.noteName)
          : undefined;

        // Convert Tone.js duration notation to milliseconds for superdough
        const durationMs = toneNotationToMs(duration);
        const noteId = `sdplay_${noteName}_${Date.now()}`;
        await superdoughAudio.playNoteWithDuration(
          noteName,
          durationMs,
          instrument || instrumentStore.currentInstrument
        );

        const instrumentToReport =
          instrument || instrumentStore.currentInstrument;

        const notePlayedEvent = new CustomEvent("note-played", {
          detail: {
            note: solfege,
            frequency,
            noteName,
            solfegeIndex,
            pitchClassIndex,
            octave: scientificOctave,
            keyboardOctave: finalOctave,
            duration,
            durationMs,
            time,
            ...noteContext,
            instrument: instrumentToReport,
            instrumentConfig: null,
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

    async function releaseNote(noteId?: string) {
      if (noteId && activeNotes.value.has(noteId)) {
        // Release specific note
        const activeNote = activeNotes.value.get(noteId);
        if (activeNote) {
          superdoughAudio.releaseNote(noteId);

          // Dispatch custom event for background effects
          const noteReleasedEvent = new CustomEvent("note-released", {
            detail: {
              note: activeNote.solfege.name,
              noteId,
              noteName: activeNote.noteName,
              frequency: activeNote.frequency,
              octave: activeNote.octave,
              keyboardOctave: activeNote.keyboardOctave,
              solfegeIndex: activeNote.solfegeIndex,
              pitchClassIndex: activeNote.pitchClassIndex,
              isBorrowed: activeNote.solfegeIndex === -1,
              mode: activeNote.mode,
              key: activeNote.key,
              instrument: instrumentStore.currentInstrument,
              instrumentConfig: null,
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
        superdoughAudio.releaseAll();

        // Dispatch events for all released notes
        allActiveNotes.forEach((activeNote) => {
          const noteReleasedEvent = new CustomEvent("note-released", {
            detail: {
              note: activeNote.solfege.name,
              noteId: activeNote.noteId,
              noteName: activeNote.noteName,
              frequency: activeNote.frequency,
              octave: activeNote.octave,
              keyboardOctave: activeNote.keyboardOctave,
              solfegeIndex: activeNote.solfegeIndex,
              pitchClassIndex: activeNote.pitchClassIndex,
              isBorrowed: activeNote.solfegeIndex === -1,
              mode: activeNote.mode,
              key: activeNote.key,
              instrument: instrumentStore.currentInstrument,
              instrumentConfig: null,
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

    // getMelodicPatterns removed

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

    async function releaseAllNotes() {
      await releaseNote(); // Call without noteId to release all
    }

    // Enhanced attack note with octave support
    async function attackNoteWithOctave(
      solfegeIndex: number,
      octave: number,
      isCancelled: () => boolean = () => false,
    ): Promise<string | null> {
      return attackNoteWithFormat(solfegeIndex, octave, isCancelled);
    }

    // Melody management methods removed

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
      currentModeDefinition,
      currentScaleNotes,
      solfegeData,
      currentKeyDisplay,

      // Actions
      setKey,
      setMode,
      playNote,
      attackNote,
      attackNoteWithOctave,
      attackExactPitch,
      releaseNote,
      releaseAllNotes,
      addToSequence,
      clearSequence,
      removeLastFromSequence,
      getSolfegeByName,
      getNoteFrequency,
      getNoteName,

      // Polyphonic helpers
      getActiveNotes,
      getActiveNoteNames,
      isNoteActive,
      playNoteWithDuration,


      parseNoteInput, // Export for testing/debugging
    };
  },
  {
    persist: true,
  }
);
