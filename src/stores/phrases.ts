import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { useInstrumentStore } from "@/stores/instrument";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { defaultPatterns, retiredDefaultPatternIds } from "@/data/patterns";
import {
  arrangeReel,
  closeTake as closeBookTake,
  createPhraseBook,
  DEFAULT_PHRASE_BOOK_CONFIG,
  deletePhrase as deleteBookPhrase,
  discardTake,
  ensureSingleTake,
  findPhrase as findBookPhrase,
  followControls,
  getTake,
  importPhrases as importBookPhrases,
  isTakeTouched as isBookTakeTouched,
  untouchedCopySource,
  keepPhrase as keepBookPhrase,
  keepTake as keepBookTake,
  openPhrase as openBookPhrase,
  phraseFromPattern,
  pressNote,
  pruneRecent,
  releaseNote,
  renamePhrase as renameBookPhrase,
  resolveBpm,
  shelveBook,
  undoLastNote as undoBookNote,
  type PhraseCandidate,
} from "@/domain/phraseBook";
import { migrateLegacyPatterns } from "@/domain/phraseMigration";
import {
  deserializePatternsState,
  serializePatternsState,
} from "@/services/patternPersistence";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import type { HeldNote, Phrase, PhraseBook, PhraseContext } from "@/types/phrases";

const LEGACY_STORAGE_KEY = "patterns";
const STORAGE_KEY = "phrases";
const NON_RECORDING_EVENT_SOURCES = new Set(["strudel-playback", "live-pitch"]);
const MAX_EXPRESSION_POINTS = 8192;

/** Built-in phrases. Static data: never stored, never edited. */
export const libraryPhrases: readonly Phrase[] = Object.freeze(
  defaultPatterns.map((pattern) => phraseFromPattern(pattern, "library")),
);
const libraryIds = new Set(libraryPhrases.map((phrase) => phrase.id));

function appendExpressionPoint<T extends { timeMs: number }>(
  existing: T[] | undefined,
  point: T,
  neutral: T,
  valueOf: (point: T) => number,
): T[] | undefined {
  const value = valueOf(point);
  if (!existing && value === valueOf(neutral)) return existing;
  const curve = existing ?? [neutral];
  const last = curve[curve.length - 1];
  if (point.timeMs < last.timeMs || value === valueOf(last)) return existing;
  if (point.timeMs === last.timeMs) curve[curve.length - 1] = point;
  else curve.push(point);
  // Bound a very long held note while retaining both endpoints.
  if (curve.length > MAX_EXPRESSION_POINTS) {
    const decimated = curve.filter((_, index) => index % 2 === 0);
    if (decimated[decimated.length - 1] !== curve[curve.length - 1]) decimated.push(curve[curve.length - 1]);
    curve.splice(0, curve.length, ...decimated);
  }
  return curve;
}

function readLegacyBook(liveContext: PhraseContext): PhraseBook | null {
  if (typeof localStorage === "undefined") return null;
  try {
    if (localStorage.getItem(STORAGE_KEY) !== null) return null;
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return migrateLegacyPatterns(JSON.parse(raw), {
      libraryIds,
      retiredLibraryIds: retiredDefaultPatternIds,
      liveContext,
      now: Date.now(),
    });
  } catch {
    return null;
  }
}

export const usePhrasesStore = defineStore(
  "phrases",
  () => {
    const musicStore = useMusicStore();
    const instrumentStore = useInstrumentStore();
    const keyboardStore = useKeyboardDrawerStore();
    const visualConfigStore = useVisualConfigStore();
    const config = { ...DEFAULT_PHRASE_BOOK_CONFIG };

    const liveContext = computed<PhraseContext>(() => ({
      key: musicStore.currentKey as ChromaticNote,
      mode: musicStore.currentMode as MusicalMode,
      instrument: instrumentStore.currentInstrument,
      bpm: resolveBpm(visualConfigStore.config.codeStrip.bpm),
      shape: { ...instrumentStore.shape },
      octave: keyboardStore.keyboardConfig.mainOctave,
    }));

    // ─── State ───────────────────────────────────────────────────────────────
    const book = ref<PhraseBook>(
      readLegacyBook(liveContext.value)
        ?? createPhraseBook(liveContext.value, Date.now()),
    );
    const isRecordingEnabled = ref(true);
    // Pressed-but-unreleased notes. Transient; `heldCount` makes it observable.
    const held = new Map<string, HeldNote>();
    const heldCount = ref(0);

    // ─── Getters ─────────────────────────────────────────────────────────────
    const shelves = computed(() => shelveBook(book.value, libraryPhrases));
    const take = computed(() => getTake(book.value));
    const takeId = computed(() => book.value.takeId);
    const takeNotes = computed(() => take.value.notes);
    const takeContext = computed(() => take.value.context);
    const takeDuration = computed(() => take.value.duration);
    const lastLiveNoteId = computed(() => {
      const ids = book.value.recorder.liveNoteIds;
      return ids[ids.length - 1] ?? null;
    });
    /** A key is down in the take right now. */
    const isTakeSounding = computed(() => heldCount.value > 0 && heldInTake());
    /** You have written into the take; until then it is only being looked at. */
    const isTakeTouched = computed(() => {
      void heldCount.value;
      return isBookTakeTouched(book.value, held);
    });
    /** The reel, deepest first; the desk is drawn where you found it. */
    const reel = computed(() => arrangeReel(book.value, libraryPhrases, isTakeTouched.value));

    function heldInTake(): boolean {
      for (const note of held.values()) if (note.phraseId === book.value.takeId) return true;
      return false;
    }

    function findPhrase(id: string): Phrase | undefined {
      return findBookPhrase(book.value, id, libraryPhrases);
    }

    // ─── Controls ↔ take ─────────────────────────────────────────────────────
    let isContextSyncing = false;

    watch(liveContext, (live) => {
      if (isContextSyncing) return;
      followControls(book.value, held, live);
    });

    /** Point the live controls at a phrase that just landed on the desk. */
    function syncControlsTo(phrase: Phrase): void {
      const { context } = phrase;
      isContextSyncing = true;
      try {
        musicStore.setKey(context.key);
        musicStore.setMode(context.mode);
        keyboardStore.setMainOctave(context.octave);
        visualConfigStore.updateConfig("codeStrip", { bpm: resolveBpm(context.bpm) });
        // Selecting the instrument recalls its remembered Shape; the phrase's
        // Shape then wins and becomes that instrument's memory.
        void instrumentStore.setInstrument(context.instrument).then((result) => {
          if (
            result.status === "failed"
            && result.fallback
            && book.value.takeId === phrase.id
            && take.value.context.instrument === result.instrument
          ) {
            followControls(book.value, held, liveContext.value);
          }
        });
        instrumentStore.applyShape(context.shape);
      } finally {
        isContextSyncing = false;
      }
    }

    // ─── Actions ─────────────────────────────────────────────────────────────
    /** Return: keep the take, open an empty one. */
    function keepTake(): string | null {
      return keepBookTake(
        book.value, Date.now(), liveContext.value, undefined, config, libraryPhrases,
      );
    }

    /** The blank slot at the front: put the take away and start fresh. */
    function startBlankTake(): void {
      const current = take.value;
      if (book.value.recorder.origin === "fresh" && !current.notes.length) return;
      closeBookTake(book.value, Date.now(), liveContext.value, undefined, config, "navigate");
    }

    /**
     * The phrase you are looking at when the desk is only being looked at: the
     * Kept/Library source of an untouched copy, else the take itself.
     */
    function lookedAtSource(id: string): Phrase | undefined {
      if (id !== book.value.takeId) return undefined;
      const sourceId = untouchedCopySource(book.value, isTakeTouched.value);
      return sourceId ? findPhrase(sourceId) : undefined;
    }

    /** Put a phrase on the desk (reopen Recent, fork Kept/Library). */
    function openPhrase(id: string): Phrase | null {
      const opened = openBookPhrase(book.value, id, libraryPhrases, Date.now(), undefined, config);
      if (opened) syncControlsTo(opened);
      return opened;
    }

    function keepPhrase(id: string): string | null {
      const source = lookedAtSource(id);
      if (source) return keepBookPhrase(book.value, source.id, libraryPhrases, Date.now());
      if (id !== book.value.takeId) {
        return keepBookPhrase(book.value, id, libraryPhrases, Date.now());
      }
      const lookingAtRecent = !isTakeTouched.value && book.value.recorder.origin === "recent";
      const keptId = keepTake();
      // You were only looking at it: keep looking at it, now on the Kept shelf.
      if (keptId && lookingAtRecent) openPhrase(keptId);
      return keptId;
    }

    function deletePhrase(id: string): boolean {
      if (id === book.value.takeId && isTakeTouched.value) {
        // A confirmed delete of the take you played into: gone, fresh desk.
        discardTake(book.value, Date.now(), liveContext.value);
        return true;
      }
      const target = lookedAtSource(id)?.id ?? id;
      const lookedAt = !isTakeTouched.value
        && (target === book.value.takeId
          || target === untouchedCopySource(book.value, isTakeTouched.value));
      // Deleting what you're looking at clears the desk first.
      if (lookedAt) startBlankTake();
      return deleteBookPhrase(book.value, target);
    }

    function renamePhrase(id: string, name: string): boolean {
      const target = lookedAtSource(id)?.id ?? id;
      return renameBookPhrase(book.value, target, name, libraryPhrases);
    }

    function undoLastNote(): void {
      undoBookNote(book.value);
    }

    /** Finalized external captures (humming) arrive in Recent; the first opens. */
    function importPhrases(
      candidates: PhraseCandidate[],
      context: Omit<PhraseContext, "octave">,
    ): string[] {
      const ids = importBookPhrases(book.value, candidates, context, Date.now(), undefined, config);
      if (ids.length) syncControlsTo(take.value);
      return ids;
    }

    // ─── Note events ─────────────────────────────────────────────────────────
    function isRecordable(event: CustomEvent): boolean {
      return isRecordingEnabled.value
        && event.detail?.record !== false
        && !NON_RECORDING_EVENT_SOURCES.has(event.detail?.source);
    }

    function handleNotePressed(event: CustomEvent): void {
      if (!isRecordable(event)) return;
      const detail = event.detail;
      if (!detail?.noteId) return;
      const isBorrowed = detail.isBorrowed === true || detail.solfegeIndex < 0;
      const live = liveContext.value;
      pressNote(book.value, held, {
        noteId: detail.noteId,
        wallTime: Number.isFinite(detail.timestamp) ? detail.timestamp : Date.now(),
        context: {
          key: (detail.key ?? live.key) as ChromaticNote,
          mode: (detail.mode ?? live.mode) as MusicalMode,
          // Scheduled Style pulses carry the instrument captured by their held
          // input; ordinary notes use the live instrument.
          instrument: detail.source === "live-play-style"
            ? detail.instrument ?? live.instrument
            : live.instrument,
          // Held inputs carry their press-time Shape, so a knob sweep during
          // one hold (repeat/arp pulses) stays inside one take.
          shape: { ...(detail.shape ?? live.shape) },
          bpm: live.bpm,
          octave: live.octave,
        },
        note: detail.noteName,
        scaleDegree: isBorrowed ? 0 : detail.solfegeIndex + 1,
        scaleIndex: detail.solfegeIndex,
        pitchClassIndex: detail.pitchClassIndex,
        isBorrowed,
        octave: detail.octave,
        frequency: detail.frequency,
        velocity: detail.velocity,
        articulation: detail.articulation ? { ...detail.articulation } : undefined,
      }, config);
      heldCount.value = held.size;
    }

    function handleNoteExpression(event: CustomEvent): void {
      if (!isRecordingEnabled.value) return;
      const { noteId, cents, gain, timestamp } = event.detail ?? {};
      const note = held.get(noteId);
      if (!note || !Number.isFinite(timestamp)) return;
      const timeMs = Math.max(0, timestamp - note.pressWall);
      if (Number.isFinite(cents)) {
        const value = Math.round(Math.max(-50, Math.min(50, cents)));
        note.pitchExpression = appendExpressionPoint(note.pitchExpression,
          { timeMs, cents: value }, { timeMs: 0, cents: 0 }, (point) => point.cents);
      }
      if (Number.isFinite(gain)) {
        const value = Math.max(0.25, Math.min(1.75, gain));
        note.gainExpression = appendExpressionPoint(note.gainExpression,
          { timeMs, gain: value }, { timeMs: 0, gain: 1 }, (point) => point.gain);
      }
    }

    function handleNoteReleased(event: CustomEvent): void {
      if (!isRecordable(event)) return;
      const detail = event.detail;
      if (!detail?.noteId) return;
      releaseNote(
        book.value,
        held,
        detail.noteId,
        Number.isFinite(detail.timestamp) ? detail.timestamp : Date.now(),
        { articulation: detail.articulation ? { ...detail.articulation } : undefined },
      );
      heldCount.value = held.size;
    }

    let listeners: Array<[string, EventListener]> = [];

    function setupEventListeners(): void {
      removeEventListeners();
      listeners = [
        ["note-played", (event) => handleNotePressed(event as CustomEvent)],
        ["note-expression", (event) => handleNoteExpression(event as CustomEvent)],
        ["note-released", (event) => handleNoteReleased(event as CustomEvent)],
      ];
      for (const [type, listener] of listeners) window.addEventListener(type, listener);
    }

    function removeEventListeners(): void {
      for (const [type, listener] of listeners) window.removeEventListener(type, listener);
      listeners = [];
    }

    /** Hydration hook: repair "exactly one take" and expire Recent. */
    function repairAfterHydrate(): void {
      ensureSingleTake(book.value, liveContext.value, Date.now());
      pruneRecent(book.value, Date.now(), config);
    }

    setupEventListeners();
    pruneRecent(book.value, Date.now(), config);

    return {
      // Persisted
      book,
      isRecordingEnabled,

      // Shelves and the take
      library: libraryPhrases,
      shelves,
      reel,
      isTakeTouched,
      take,
      takeId,
      takeNotes,
      takeContext,
      takeDuration,
      lastLiveNoteId,
      isTakeSounding,
      findPhrase,

      // Actions
      keepTake,
      startBlankTake,
      openPhrase,
      keepPhrase,
      deletePhrase,
      renamePhrase,
      undoLastNote,
      importPhrases,

      // Recorder plumbing (exposed for tests)
      handleNotePressed,
      handleNoteExpression,
      handleNoteReleased,
      setupEventListeners,
      removeEventListeners,
      repairAfterHydrate,
    };
  },
  {
    persist: {
      key: STORAGE_KEY,
      pick: ["book", "isRecordingEnabled"],
      serializer: {
        serialize: serializePatternsState,
        deserialize: deserializePatternsState,
      },
      afterHydrate: ({ store }) => {
        (store as unknown as { repairAfterHydrate: () => void }).repairAfterHydrate();
      },
    },
  },
);
