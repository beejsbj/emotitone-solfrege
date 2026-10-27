import { pitchSolfegeData } from "@/domain/musicalIdentity";
import { resumeAudioContext, registerAudioActivity } from "@/services/audioLifecycle";
import { defineStore } from "pinia";
import { ref, computed, readonly, watch, onScopeDispose } from "vue";
import { musicTheory, CHROMATIC_NOTES } from "@/services/music";
import type {
  SolfegeData,
  MusicalMode,
  ActiveNote,
  ChromaticNote,
} from "@/types/music";
import { getAudioContext } from "@/services/audioRuntime";
import { useInstrumentStore } from "@/stores/instrument";
import { Note as TonalNote } from "@tonaljs/tonal";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { PLAY_STYLE_OPTIONS, PLAY_MODE_OPTIONS, playModeValue, type PlayStyle, type PlayStyleRate } from "@/data/playStyles";
import { audioTimeToOutputTime } from "@/services/liveAudioTiming";
import { createLiveAudioClock } from "@/services/liveAudioClock";
import { getLivePlayback, getLivePlaybackFailure, waitForLivePlayback } from "@/services/livePlayback";
import { resolveLiveSoundName } from "@/services/liveInstrumentNames";
import type { LiveVoiceEvent } from "@/audio/liveRenderer";
import { createLivePerformance, SCHEDULED_LIVE_MIDI_EVENT } from "@/services/livePerformance";
import type { LiveArticulation } from "@/services/liveArticulation";
import { resolveLiveEnvelope } from "@/services/shape";
import type { Shape } from "@/types/instrument";

// Type for note input - either a chromatic note with octave or solfege index
type NoteInput = string | { solfegeIndex: number; octave: number };

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

let liveStoreId = 0;

export const useMusicStore = defineStore(
  "music",
  () => {
    // Get instrument store for current instrument info
    const instrumentStore = useInstrumentStore();

    // State
    const currentKey = ref<string>("C");
    const currentMode = ref<MusicalMode>("major");
    // Sole writer of the shared theory context. Persistence and $patch bypass
    // the actions, so synchronize before any audio or display reader can run.
    watch(
      [currentKey, currentMode],
      ([key, mode]) => {
        const normalizedKey = (typeof key === "string" ? normalizePitchClass(key) : null) ?? "C";
        if (key !== normalizedKey) {
          currentKey.value = normalizedKey;
          return;
        }
        musicTheory.setCurrentKey(normalizedKey);
        musicTheory.setCurrentMode(mode);
      },
      { immediate: true, flush: "sync" },
    );
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
      /** Shape at input onset: pattern context for every note this hold logs. */
      shape: Shape;
      velocity?: number;
      /** False for a controller press that already shows itself (ROLI echo). */
      mirrorMidi?: false;
      isCancelled: () => boolean;
    };
    const storeId = ++liveStoreId;
    let heldCounter = 0;
    const heldAliases = new Map<string, string>();
    const heldOwners = new Set<string>();
    const stopActivity = registerAudioActivity(() => heldOwners.size > 0);
    const liveAudioClock = createLiveAudioClock(getAudioContext, { onSuspend: boundary => { clearLiveInputs(); livePerformance.close(boundary); } });
    const now = liveAudioClock.now;
    // Scheduled voices sound with the live Shape at scheduling time; record that.
    function styleArticulation(instrument: string, style: PlayStyle): LiveArticulation {
      const articulation = resolveLiveEnvelope(instrument, instrumentStore.shape);
      if (style !== "together" && !style.startsWith("strum")) articulation.release = 0.03;
      return articulation;
    }

    function liveDetail(event: LiveVoiceEvent, held: HeldPitch) {
      return {
        ...held.snapshot, noteId: event.noteId, note: held.snapshot.solfege,
        isBorrowed: held.snapshot.solfegeIndex === -1,
        instrument: held.instrument, shape: held.shape, velocity: event.velocity ?? held.velocity, instrumentConfig: null, source: "live-play-style",
        articulation: { ...(event.articulation ?? styleArticulation(held.instrument, event.style)) },
        timestamp: liveAudioClock.toEpochTime(event.at * 1000),
        midiTimestamp: liveAudioClock.toPerformanceTime(event.at * 1000),
        audibleAt: audioTimeToOutputTime(getAudioContext(), event.at),
        // The attack's own AudioContext time: the Looper places takes on the transport by it.
        audioTime: event.at,
      };
    }
    const livePerformance = createLivePerformance<HeldPitch>({
      now: () => getAudioContext().currentTime,
      onMirror(event, held, phase) {
        // An ordinary press from a controller that shows its own keys is not
        // echoed back to it. Styled pulses are a new performance and mirror,
        // and so is any Together voice after them, as on the fallback path.
        // (A late off for the unmirrored first voice is ignored downstream.)
        if (held.mirrorMidi === false) {
          if (event.style === "together") return;
          delete held.mirrorMidi;
        }
        window.dispatchEvent(new CustomEvent(SCHEDULED_LIVE_MIDI_EVENT, {
          detail: { ...liveDetail(event, held), phase },
        }));
      },
      onEvent(event, held, boundary) {
        const detail = liveDetail(event, held);
        if (event.phase === "attack") {
          activeNotes.value.set(event.noteId, { ...held.snapshot,
            noteId: event.noteId, audibleAt: detail.audibleAt });
        } else activeNotes.value.delete(event.noteId);
        currentNote.value = activeNotes.value.values().next().value?.solfege.name ?? null;
        isPlaying.value = activeNotes.value.size > 0;
        window.dispatchEvent(new CustomEvent(event.phase === "attack" ? "note-played" : "note-released", {
          detail: { ...detail, note: event.phase === "attack" ? detail.note : detail.note.name, mirrorMidi: false,
            ...(boundary ? { timestamp: boundary.epochTime, midiTimestamp: boundary.performanceTime } : {}),
          },
        }));
      },
      onExpression(noteId, cents, at) {
        const note = activeNotes.value.get(noteId);
        if (note) activeNotes.value.set(noteId, { ...note, pitchBendCents: cents });
        window.dispatchEvent(new CustomEvent("note-expression", {
          detail: { noteId, cents, timestamp: liveAudioClock.toEpochTime(at * 1000),
            audibleAt: audioTimeToOutputTime(getAudioContext(), at) },
        }));
      },
      onGainExpression(noteId, gain, at) {
        window.dispatchEvent(new CustomEvent("note-expression", {
          detail: { noteId, gain, timestamp: liveAudioClock.toEpochTime(at * 1000),
            audibleAt: audioTimeToOutputTime(getAudioContext(), at) },
        }));
      },
      onOwnerClosed(owner) {
        heldOwners.delete(owner);
        for (const [alias, aliasedOwner] of heldAliases) if (aliasedOwner === owner) heldAliases.delete(alias);
      },
      onError(error) { console.error("[Live Audio] Renderer failed", error); },
      onLoadError(instrumentId, reason) {
        if (instrumentId !== resolveLiveSoundName(instrumentStore.currentInstrument)) return;
        instrumentStore.lastWarmupError = reason;
        instrumentStore.lastWarmupErrorInstrument = instrumentStore.currentInstrument;
      },
    });

    function clearLiveInputs() {
      livePerformance.releaseAll();
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
      configureEngines({ style: playStyle.value, rate: playRate.value, bpm: visualConfigStore.config.codeStrip.bpm });
    }

    function configureEngines(config: { style: PlayStyle; rate: PlayStyleRate; bpm: number }) {
      livePerformance.configure(config);
    }

    watch([playStyle, playRate, () => visualConfigStore.config.codeStrip.bpm], ([style, rate, bpm]) => {
      if (settingPlayMode) return;
      configureEngines({ style, rate, bpm });
    }, { immediate: true, flush: "sync" });
    watch(() => instrumentStore.selectionEpoch, clearLiveInputs, { flush: "sync" });
    watch(() => instrumentStore.isInteractionLocked, (locked) => {
      if (locked) clearLiveInputs();
    }, { flush: "sync" });
    const onHidden = () => { if (document.hidden) clearLiveInputs(); };
    window.addEventListener("blur", clearLiveInputs);
    document.addEventListener("visibilitychange", onHidden);
    onScopeDispose(() => {
      stopActivity();
      clearLiveInputs();
      livePerformance.dispose();
      liveAudioClock.dispose();
      window.removeEventListener("blur", clearLiveInputs);
      document.removeEventListener("visibilitychange", onHidden);
    });

    async function holdPitch(
      noteName: string,
      isCancelled: () => boolean,
      velocity?: number,
      mirrorMidi = true,
    ): Promise<string | null> {
      if (instrumentStore.isInteractionLocked || isCancelled()) return null;
      const parsed = parseNoteWithOctave(noteName);
      if (!parsed) return null;
      const exactName = `${parsed.noteName}${parsed.octave}`;
      const tonal = TonalNote.get(exactName);
      if (tonal.midi == null || !tonal.freq) return null;
      const solfegeIndex = currentScaleNotes.value.indexOf(parsed.noteName);
      // Read through the reactive singleton; caching its raw context here would stale live-input cues.
      const solfege = pitchSolfegeData(parsed.noteName, { tonic: musicTheory.getCurrentKey(), mode: musicTheory.getCurrentMode() }, visualConfigStore.laBasedMinor);
      if (!solfege) return null;
      // A sleeping/interrupted graph (or route rebuild) must finish before the
      // renderer is selected or the input is submitted. Keep running input sync.
      const selectionEpoch = instrumentStore.selectionEpoch;
      const selectedInstrument = instrumentStore.currentInstrument;
      const resumption = resumeAudioContext(getAudioContext());
      const recover = () => {
        if (!isCancelled() && !instrumentStore.isInteractionLocked && instrumentStore.selectionEpoch === selectionEpoch) {
          return waitForLivePlayback(selectedInstrument);
        }
      };
      const recovery = resumption ? resumption.then(recover) : recover();
      if (recovery) await instrumentStore.waitForRecovery(recovery);
      if (instrumentStore.selectionEpoch === selectionEpoch && getLivePlayback(selectedInstrument)
        && instrumentStore.lastWarmupErrorInstrument === selectedInstrument) {
        instrumentStore.lastWarmupError = null;
        instrumentStore.lastWarmupErrorInstrument = null;
      }
      if (isCancelled() || instrumentStore.isInteractionLocked || instrumentStore.selectionEpoch !== selectionEpoch) return null;
      const owner = `held_${storeId}_${++heldCounter}`;
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
        shape: instrumentStore.shape,
        velocity,
        ...(mirrorMidi ? {} : { mirrorMidi: false as const }),
        isCancelled,
      };
      const renderer = getLivePlayback(held.instrument);
      if (!renderer) {
        // The worklet is the only renderer. A sound it does not hold (every
        // bank held by Looper members, or no AudioWorklet) cannot play: say
        // why on the deck instead of failing silently.
        instrumentStore.lastWarmupError = getLivePlaybackFailure(held.instrument)?.reason ?? "This instrument is not loaded";
        instrumentStore.lastWarmupErrorInstrument = held.instrument;
        return null;
      }
      heldOwners.add(owner);
      // The running path submits without yielding to unrelated microtasks.
      liveAudioClock.now();
      heldAliases.set(owner, owner);
      livePerformance.press(owner, [{ pitch: tonal.midi, instrumentId: resolveLiveSoundName(held.instrument), ...(velocity === undefined ? {} : { velocity }) }], held, renderer,
        { style: playStyle.value, rate: playRate.value, bpm: visualConfigStore.config.codeStrip.bpm });
      return owner;
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
        isCancelled,
      );
    }

    function attackExactPitch(
      note: string,
      isCancelled: () => boolean = () => false,
      velocity?: number,
      options: { mirrorMidi?: boolean } = {},
    ) {
      return holdPitch(note, isCancelled, velocity, options.mirrorMidi !== false);
    }

    // Getters
    const currentScale = computed(() => musicTheory.getCurrentScale());
    const currentModeDefinition = computed(() =>
      musicTheory.getCurrentModeDefinition()
    );

    const currentScaleNotes = computed(() => musicTheory.getCurrentScaleNotes());

    const solfegeData = computed(() => {
      return currentScaleNotes.value.map((pitch) => pitchSolfegeData(
        pitch, { tonic: musicTheory.getCurrentKey(), mode: musicTheory.getCurrentMode() }, visualConfigStore.laBasedMinor,
      )!);
    });

    const currentKeyDisplay = computed(() => {
      return `${musicTheory.getCurrentKey()} ${currentModeDefinition.value.label}`;
    });

    function getCurrentNoteContext() {
      return {
        mode: musicTheory.getCurrentMode(),
        key: musicTheory.getCurrentKey() as ChromaticNote,
      };
    }

    // Melody-related getters (removed)

    function getBaseOctave(
      noteName: ChromaticNote,
      actualOctave: number
    ): number {
      const noteIndex = CHROMATIC_NOTES.indexOf(noteName);
      const keyIndex = CHROMATIC_NOTES.indexOf(
        musicTheory.getCurrentKey() as ChromaticNote
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
    }

    function setMode(mode: MusicalMode) {
      currentMode.value = mode;
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

    /** Prototype expression is available on prepared oscillator/sample voices. */
    function expressionSampleAt(performanceTimestamp?: number): number | undefined {
      return performanceTimestamp !== undefined && Number.isFinite(performanceTimestamp)
        ? liveAudioClock.toAudioTime(liveAudioClock.fromPerformanceTime(performanceTimestamp))
        : undefined;
    }

    function setNotePitchBend(noteId: string, cents: number, performanceTimestamp?: number): boolean {
      const owner = heldAliases.get(noteId);
      return owner ? livePerformance.setPitchBend(owner, cents, expressionSampleAt(performanceTimestamp)) : false;
    }

    /** Volume expression follows the same held owner as live pitch bends. */
    function setNoteGain(noteId: string, gain: number, performanceTimestamp?: number): boolean {
      const owner = heldAliases.get(noteId);
      return owner ? livePerformance.setGain(owner, gain, expressionSampleAt(performanceTimestamp)) : false;
    }

    async function releaseNote(noteId?: string) {
      if (!noteId) {
        clearLiveInputs();
        return;
      }
      const owner = heldAliases.get(noteId);
      if (owner) {
        heldAliases.delete(noteId);
        heldOwners.delete(owner);
        livePerformance.release(owner);
      }
      // Any other id (a late release from a cancelled input) never touches another owner.
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
      laBasedMinor: computed(() => visualConfigStore.laBasedMinor),
      currentKeyDisplay,

      // Actions
      setKey,
      setMode,
      setPlayStyle,
      setPlayRate,
      setPlayMode,
      attackNote,
      attackNoteWithOctave,
      attackExactPitch,
      releaseNote,
      setNotePitchBend,
      setNoteGain,
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


      parseNoteInput, // Export for testing/debugging
    };
  },
  {
    persist: true,
  }
);
