import { defineStore } from "pinia";
import { ref, computed, readonly, watch, onScopeDispose } from "vue";
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
import { useVisualConfigStore } from "@/stores/visualConfig";
import { createPlayStyleEngine, PLAY_STYLE_OPTIONS, PLAY_MODE_OPTIONS, playModeValue, type PlayStyle, type PlayStyleRate } from "@/services/playStyles";
import { createScheduledLiveVoice } from "@/services/scheduledLiveVoice";

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
    const playStyle = ref<PlayStyle>("together");
    const playRate = ref<PlayStyleRate>(8);
    const playMode = computed(() => playModeValue(playStyle.value, playRate.value));
    let settingPlayMode = false;
    const visualConfigStore = useVisualConfigStore();

    type HeldPitch = {
      snapshot: Omit<ActiveNote, "noteId">;
      instrument: string;
      isCancelled: () => boolean;
      firstAttack?: (cancelled: () => boolean) => Promise<string | null>;
      initialVoice?: Promise<string | null>;
    };
    let heldCounter = 0;
    let generatedCounter = 0;
    const heldAliases = new Map<string, string>();
    const heldOwners = new Set<string>();
    const now = () => performance.now();

    const playEngine = createPlayStyleEngine<HeldPitch>({
      now,
      start(held, at, style) {
        if (held.isCancelled() || instrumentStore.isInteractionLocked) {
          return { release() {} };
        }

        // Preserve the original immediate attack and returned voice ID for
        // ordinary playing. Subsequent mode changes keep the captured pitch.
        if (style === "together" && held.firstAttack) {
          const attack = held.firstAttack;
          held.firstAttack = undefined;
          let released = false;
          let resolvedId: string | null = null;
          const initialVoice = attack(() => released || held.isCancelled());
          held.initialVoice = initialVoice;
          void initialVoice.then((id) => {
            resolvedId = id;
            if (released && id) void releaseSoundingNote(id);
          }).catch((error) => console.error("[Play Mode] Attack failed", error));
          return {
            release() {
              released = true;
              if (resolvedId) void releaseSoundingNote(resolvedId);
            },
          };
        }

        held.firstAttack = undefined;
        const noteId = `style_${++generatedCounter}`;
        const activeNote: ActiveNote = { ...held.snapshot, noteId };
        const detail = {
          ...activeNote,
          note: activeNote.solfege,
          isBorrowed: activeNote.solfegeIndex === -1,
          instrument: held.instrument,
          instrumentConfig: null,
          source: "live-play-style",
        };
        return createScheduledLiveVoice({
          noteId,
          noteName: activeNote.noteName,
          instrument: held.instrument,
          at,
          releaseSeconds: style === "together" || style.startsWith("strum") ? 1.5 : 0.03,
          now,
          onStart(timestamp) {
            activeNotes.value.set(noteId, activeNote);
            currentNote.value = activeNote.solfege.name;
            isPlaying.value = true;
            window.dispatchEvent(new CustomEvent("note-played", { detail: { ...detail, timestamp } }));
          },
          onEnd(timestamp) {
            window.dispatchEvent(new CustomEvent("note-released", {
              detail: { ...detail, note: activeNote.solfege.name, timestamp },
            }));
            activeNotes.value.delete(noteId);
            currentNote.value = activeNotes.value.values().next().value?.solfege.name ?? null;
            isPlaying.value = activeNotes.value.size > 0;
          },
          onError(error) { console.error("[Play Mode] Attack failed", error); },
        });
      },
    });

    function clearLiveInputs() {
      playEngine.clear();
      heldAliases.clear();
      heldOwners.clear();
    }

    function setPlayStyle(value: string) {
      if (PLAY_STYLE_OPTIONS.some((option) => option.value === value)) playStyle.value = value as PlayStyle;
    }

    function setPlayRate(value: number) {
      if (value === 4 || value === 8 || value === 16) playRate.value = value;
    }

    function setPlayMode(value: string) {
      const option = PLAY_MODE_OPTIONS.find((candidate) => candidate.value === value);
      if (!option) return;
      // Apply the selected style and rate in one engine update, avoiding an
      // intermediate attack at the old rate when a held chord changes modes.
      settingPlayMode = true;
      playStyle.value = option.style;
      if (option.rate !== undefined) playRate.value = option.rate;
      settingPlayMode = false;
      playEngine.configure({ style: playStyle.value, rate: playRate.value, bpm: visualConfigStore.config.codeStrip.bpm });
    }

    watch([playStyle, playRate, () => visualConfigStore.config.codeStrip.bpm], ([style, rate, bpm]) => {
      if (settingPlayMode) return;
      playEngine.configure({ style, rate, bpm });
    }, { immediate: true, flush: "sync" });
    watch(() => instrumentStore.selectionEpoch, clearLiveInputs, { flush: "sync" });
    watch(() => instrumentStore.isInteractionLocked, (locked) => {
      if (locked) clearLiveInputs();
    }, { flush: "sync" });
    const onHidden = () => { if (document.hidden) clearLiveInputs(); };
    window.addEventListener("blur", clearLiveInputs);
    document.addEventListener("visibilitychange", onHidden);
    onScopeDispose(() => {
      clearLiveInputs();
      window.removeEventListener("blur", clearLiveInputs);
      document.removeEventListener("visibilitychange", onHidden);
    });

    async function holdPitch(
      noteName: string,
      firstAttack: HeldPitch["firstAttack"],
      isCancelled: () => boolean,
    ): Promise<string | null> {
      if (instrumentStore.isInteractionLocked || isCancelled()) return null;
      const parsed = parseNoteWithOctave(noteName);
      if (!parsed) return null;
      const exactName = `${parsed.noteName}${parsed.octave}`;
      const tonal = TonalNote.get(exactName);
      if (tonal.midi == null || !tonal.freq) return null;
      const solfegeIndex = currentScaleNotes.value.indexOf(parsed.noteName);
      const solfege = solfegeIndex === -1 ? borrowedPitchSolfege(parsed.noteName) : solfegeData.value[solfegeIndex];
      if (!solfege) return null;
      const owner = `held_${++heldCounter}`;
      const held: HeldPitch = {
        snapshot: {
          noteName: exactName,
          frequency: tonal.freq,
          octave: parsed.octave,
          keyboardOctave: solfegeIndex === -1 ? parsed.octave : getBaseOctave(parsed.noteName, parsed.octave),
          solfegeIndex,
          pitchClassIndex: CHROMATIC_NOTES.indexOf(parsed.noteName),
          solfege,
          ...getCurrentNoteContext(),
        },
        instrument: instrumentStore.currentInstrument,
        isCancelled,
        firstAttack,
      };
      heldOwners.add(owner);
      playEngine.press(owner, [{ pitch: tonal.midi, value: held }]);
      try {
        // A mode change may replace a pending Together voice before it
        // resolves. The physical input still owns the replacement output.
        const id = held.initialVoice ? (await held.initialVoice ?? owner) : owner;
        if (!id || isCancelled() || !heldOwners.has(owner)) {
          playEngine.release(owner);
          heldOwners.delete(owner);
          return null;
        }
        heldAliases.set(id, owner);
        return id;
      } catch (error) {
        playEngine.release(owner);
        heldOwners.delete(owner);
        throw error;
      }
    }

    function attackNoteWithFormat(
      input: number | ChromaticNoteWithOctave,
      octave = 4,
      isCancelled: () => boolean = () => false,
    ) {
      const parsed = typeof input === "number" ? { solfegeIndex: input, octave } : parseChromatic(input);
      if (!parsed || !solfegeData.value[parsed.solfegeIndex]) return Promise.resolve(null);
      return holdPitch(
        musicTheory.getNoteName(parsed.solfegeIndex, parsed.octave),
        (cancelled) => attackSoundingNoteWithFormat(input, octave, cancelled),
        isCancelled,
      );
    }

    function attackExactPitch(note: string, isCancelled: () => boolean = () => false) {
      return holdPitch(note, (cancelled) => attackSoundingExactPitch(note, cancelled), isCancelled);
    }

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
        const scientificOctave = parseNoteWithOctave(noteName)?.octave ?? finalOctave;

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
    async function attackSoundingNoteWithFormat(
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
        const scientificOctave = parseNoteWithOctave(noteName)?.octave ?? finalOctave;

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
    async function attackSoundingExactPitch(
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
        const scientificOctave = parseNoteWithOctave(noteName)?.octave ?? finalOctave;

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
      if (!noteId) {
        clearLiveInputs();
        return releaseSoundingNote();
      }
      const owner = heldAliases.get(noteId);
      if (owner) {
        heldAliases.delete(noteId);
        heldOwners.delete(owner);
        playEngine.release(owner);
        return;
      }
      return releaseSoundingNote(noteId);
    }

    async function releaseSoundingNote(noteId?: string) {
      // Late releases from cancelled owners must never release other inputs.
      if (noteId && !activeNotes.value.has(noteId)) return;
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
      playStyle,
      playRate,
      playMode,

      // Getters
      currentScale,
      currentModeDefinition,
      currentScaleNotes,
      solfegeData,
      currentKeyDisplay,

      // Actions
      setKey,
      setMode,
      setPlayStyle,
      setPlayRate,
      setPlayMode,
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
