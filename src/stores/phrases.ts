import { defineStore } from "pinia";
import { computed, onScopeDispose, ref, shallowRef, watch } from "vue";
import { useInstrumentStore } from "@/stores/instrument";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { defaultPatterns, retiredDefaultPatternIds } from "@/data/patterns";
import { selectableReplacement } from "@/data/instrumentCatalog";
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
  markLooped as markBookLooped,
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
import { createPhrasePersistence, encodedPhraseBytes, shelfOverBudget } from "@/services/phrasePersistence";
import { installPhraseBackupConsole } from "@/services/phraseBackups";
import { createDeskClaims } from "@/services/deskClaims";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import type { HeldNote, Phrase, PhraseBook, PhraseBookConfig, PhraseContext } from "@/types/phrases";

const LEGACY_STORAGE_KEY = "patterns";
const STORAGE_KEY = "phrases";
// Transport notes also carry record: false; the source keeps older senders out.
const NON_RECORDING_EVENT_SOURCES = new Set(["pattern-playback", "strudel-playback", "live-pitch"]);
const MAX_EXPRESSION_POINTS = 8192;
/** Without Web Locks: another tab's take this old was left behind. */
const ABANDONED_TAKE_MS = 24 * 60 * 60 * 1000;

/**
 * Asked at every live press, before the recorder writes anything. Returning
 * true opens a fresh take first: the Looper's rule 3, a playing pattern is
 * read-only. `deskPhraseId` is what the desk stands for (an untouched
 * Kept/Library copy stands for its source); `wallTime` is the press stamp.
 */
export type LivePressGuard = (press: { deskPhraseId: string; wallTime: number }) => boolean;

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
    // Phrases another part of the app still points at (the Looper's playing
    // set, PR 202). Retention and delete never drop one, the shelf notice never
    // names or releases one, and a merge with another tab's shelf never drops
    // one (BJS-575). Declared first: the book config reads it.
    const protectedIdsProvider = shallowRef<() => ReadonlySet<string>>(() => new Set());
    const config: PhraseBookConfig = Object.defineProperty(
      { ...DEFAULT_PHRASE_BOOK_CONFIG },
      "protectedIds",
      { get: () => protectedIdsProvider.value(), enumerable: true },
    );
    const livePressGuard = shallowRef<LivePressGuard | null>(null);
    /** Edits refused because a saved Loop owns the phrase (Backspace); the notice reads it. */
    const refusedLoopEdits = ref(0);

    const liveContext = computed<PhraseContext>(() => ({
      key: musicStore.currentKey as ChromaticNote,
      mode: musicStore.currentMode as MusicalMode,
      instrument: instrumentStore.currentInstrument,
      bpm: resolveBpm(visualConfigStore.config.codeStrip.bpm),
      shape: { ...instrumentStore.shape },
      octave: keyboardStore.keyboardConfig.mainOctave,
    }));

    // ─── State ───────────────────────────────────────────────────────────────
    // Measured by the save path itself (one encode per save), not re-encoded here.
    const encodedBytes = ref(0);
    // The browser refused the last write of the shelf (or the backup it needs).
    const saveFailed = ref(false);
    // Counts every refused write, so a notice put away comes back on the next one.
    const refusedSaves = ref(0);
    // A save of new work waits on the migration backup: not a failure, but
    // not on disk yet either (the leave-page guard covers it).
    const saveQueued = ref(false);
    const persistence = createPhrasePersistence(() => ({
      book: readLegacyBook(liveContext.value) ?? createPhraseBook(liveContext.value, Date.now()),
      isRecordingEnabled: true,
    }), () => liveContext.value, {
      onMeasure: (bytes) => { encodedBytes.value = bytes; },
      onStored: (stored) => {
        saveFailed.value = !stored;
        if (!stored) refusedSaves.value += 1;
      },
      onPending: (pending) => { saveQueued.value = pending; },
      protectedIds: () => protectedIdsProvider.value(),
      // Another tab's sketches, merged in (BJS-575); see docs/persistence-codec.md.
      adopt: (state) => {
        book.value = state.book;
        isRecordingEnabled.value = state.isRecordingEnabled;
      },
    });
    const restored = persistence.load();
    const book = ref<PhraseBook>(restored.book);
    const isRecordingEnabled = ref(restored.isRecordingEnabled);
    const savedState = () => ({ book: book.value, isRecordingEnabled: isRecordingEnabled.value });
    const stopListening = typeof window === "undefined" ? () => {} : persistence.listen(savedState, window);
    // Hold this tab's take while it is on the desk; shelve takes left behind
    // by tabs that are gone (src/services/deskClaims.ts).
    const desk = createDeskClaims();
    watch(() => book.value.takeId, (id) => desk.claim(id), { immediate: true });
    const otherDesks = book.value.phrases
      .filter((phrase) => phrase.shelf === "take" && phrase.id !== book.value.takeId);
    // Without Web Locks, a fresh take opened more than a day ago (or longer
    // than the Recent retention, if shorter) counts as left behind. A Recent
    // phrase reopened on another desk carries its old dates, so its age says
    // nothing about its tab: it is left alone. A misjudged live take is
    // harmless: its own tab's merge puts it back on its desk, unchanged.
    const leftBehind = desk.available
      ? desk.unclaimed(otherDesks.map((phrase) => phrase.id))
      : Promise.resolve(otherDesks
        .filter((phrase) => phrase.closedAt === undefined
          && Date.now() - phrase.createdAt > Math.min(config.recentRetentionMs, ABANDONED_TAKE_MS))
        .map((phrase) => phrase.id));
    void leftBehind.then((ids) => {
      const gone = new Set(ids);
      const now = Date.now();
      book.value.phrases = book.value.phrases.flatMap((phrase) => {
        if (!gone.has(phrase.id) || phrase.shelf !== "take" || phrase.id === book.value.takeId) return [phrase];
        if (!phrase.notes.length) return [];
        // Only the shelf changes (and a fresh take's close time): if its tab is
        // in fact alive, it gets its take back whole, modeBase included.
        return [{ ...phrase, shelf: "recent" as const, closedAt: phrase.closedAt ?? now }];
      });
    });
    // An oversized shelf loads intact, so measure once before any save happens.
    encodedBytes.value = encodedPhraseBytes(persistence.encode(savedState()));
    /**
     * What the shelf notice says, if anything. Over budget only warns and keeps
     * saving; "failed" means storage itself refused, so new sketches live only
     * in this tab until a write succeeds.
     */
    const shelfNotice = computed<"failed" | "over-budget" | null>(() => {
      if (saveFailed.value) return "failed";
      return shelfOverBudget(encodedBytes.value) ? "over-budget" : null;
    });
    // While nothing saves, closing or reloading the tab loses what was played
    // since: the browser asks first. The guard goes as soon as a save lands.
    // A save queued behind the migration backup counts too, without the notice.
    const askBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const guardTab = (failed: boolean) => {
      if (typeof window === "undefined") return;
      if (failed) window.addEventListener("beforeunload", askBeforeLeaving);
      else window.removeEventListener("beforeunload", askBeforeLeaving);
    };
    watch(() => saveFailed.value || saveQueued.value, guardTab, { immediate: true });
    onScopeDispose(() => guardTab(false));
    // The oldest Recent phrases, the ones to delete first when the shelf is
    // full (the notice names the first). Never a phrase another part of the
    // app still points at: the Looper's playing set (through the provider) and
    // every saved Loop's members (read from the book itself, so this holds
    // before the Looper store exists).
    const releaseCandidates = computed(() => {
      const protectedIds = protectedIdsProvider.value();
      const inLoops = new Set(book.value.loops.flatMap((loop) => loop.members.map((member) => member.phraseId)));
      return book.value.phrases
        .filter((phrase) => phrase.shelf === "recent" && !protectedIds.has(phrase.id) && !inLoops.has(phrase.id))
        .sort((a, b) => (a.closedAt ?? a.createdAt) - (b.closedAt ?? b.createdAt));
    });
    watch([book, isRecordingEnabled], () => persistence.save(savedState()), { deep: true });
    if (typeof window !== "undefined") installPhraseBackupConsole(window);
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
    /** What the desk stands for: an untouched Kept/Library copy is its source. */
    const deskPhraseId = computed(() =>
      untouchedCopySource(book.value, isTakeTouched.value) ?? book.value.takeId);
    /** The reel, deepest first; the desk is drawn where you found it. */
    const reel = computed(() => arrangeReel(book.value, libraryPhrases, isTakeTouched.value));

    /**
     * A saved Loop points at the phrase, so its notes and context are the
     * Loop's (rule 3, docs/looper.md): every path that would write into it
     * asks this first. A new note opens a fresh take on top; Backspace and a
     * control change leave it alone; opening it does not rewrite its sound.
     * Its name and shelf (rename, Keep) are not the pattern and stay free.
     */
    function isLoopOwned(id: string): boolean {
      return book.value.loops.some((loop) => loop.members.some((member) => member.phraseId === id));
    }

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
      // A Loop's pattern on the desk keeps its key, mode and sound (rule 3).
      if (isLoopOwned(book.value.takeId)) return;
      followControls(book.value, held, live);
    });

    /** Point the live controls at a phrase that just landed on the desk. */
    function syncControlsTo(phrase: Phrase): void {
      const { context } = phrase;
      // A phrase recorded on a sound the picker no longer offers opens on its
      // nearest working one, so Play can sound it. The saved phrase (its Kept
      // or Library source) is not rewritten; only the copy on the desk, or a
      // Recent phrase opened in place, takes the working id. Notes are untouched.
      const instrument = selectableReplacement(context.instrument);
      // A Loop's pattern is not rewritten (rule 3): only the controls take the working sound.
      if (context.instrument !== instrument && !isLoopOwned(phrase.id)) context.instrument = instrument;
      isContextSyncing = true;
      try {
        musicStore.setKey(context.key);
        musicStore.setMode(context.mode);
        keyboardStore.setMainOctave(context.octave);
        visualConfigStore.updateConfig("codeStrip", { bpm: resolveBpm(context.bpm) });
        // Selecting the instrument recalls its remembered Shape; the phrase's
        // Shape then wins and becomes that instrument's memory.
        void instrumentStore.setInstrument(instrument).then((result) => {
          if (
            result.status === "failed"
            && result.fallback
            && book.value.takeId === phrase.id
            && take.value.context.instrument === result.instrument
            && !isLoopOwned(phrase.id)
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
      const protectedIds = protectedIdsProvider.value();
      if (protectedIds.has(id)) return false;
      // A take a saved Loop points at (a pattern put in a Loop from the desk) is
      // the Loop's: deleting it would leave the Loop pointing at nothing.
      if (isLoopOwned(id)) return false;
      if (id === book.value.takeId && isTakeTouched.value) {
        // A confirmed delete of the take you played into: gone, fresh desk.
        discardTake(book.value, Date.now(), liveContext.value);
        return true;
      }
      const target = lookedAtSource(id)?.id ?? id;
      const lookedAt = !isTakeTouched.value
        && (target === book.value.takeId
          || target === untouchedCopySource(book.value, isTakeTouched.value));
      if (protectedIds.has(target)) return false;
      // A saved Loop's member is refused before the desk is touched.
      if (isLoopOwned(target)) return false;
      // Deleting what you're looking at clears the desk first.
      if (lookedAt) startBlankTake();
      return deleteBookPhrase(book.value, target, protectedIds);
    }

    /** Play set this phrase looping: it is kept from now on (see `Phrase.looped`). */
    function markLooped(id: string): boolean {
      return markBookLooped(book.value, id);
    }

    function renamePhrase(id: string, name: string): boolean {
      const target = lookedAtSource(id)?.id ?? id;
      return renameBookPhrase(book.value, target, name, libraryPhrases);
    }

    /**
     * Backspace. Refused on a Loop's pattern (rule 3): there is no note of
     * this take's own to take back. Each refusal counts, so the Looper's
     * notice can say why.
     */
    function undoLastNote(): void {
      if (isLoopOwned(book.value.takeId)) {
        refusedLoopEdits.value += 1;
        return;
      }
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
      const wallTime = Number.isFinite(detail.timestamp) ? detail.timestamp : Date.now();
      // Rule 3: never write into a Loop's pattern, or into what the Looper's guard says is read-only.
      if (isLoopOwned(deskPhraseId.value) || livePressGuard.value?.({ deskPhraseId: deskPhraseId.value, wallTime })) {
        startBlankTake();
      }
      const isBorrowed = detail.isBorrowed === true || detail.solfegeIndex < 0;
      const live = liveContext.value;
      pressNote(book.value, held, {
        noteId: detail.noteId,
        wallTime,
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

    // ─── Seams for the Looper ────────────────────────────────────────────────
    function setLivePressGuard(guard: LivePressGuard | null): void {
      livePressGuard.value = guard;
    }

    /** Seam for the Looper (PR 202): phrases it is playing may not be released. */
    function setProtectedIds(provider: (() => ReadonlySet<string>) | null): void {
      protectedIdsProvider.value = provider ?? (() => new Set());
    }

    /** Hydration hook: repair "exactly one take" and expire Recent. */
    function repairAfterHydrate(): void {
      ensureSingleTake(book.value, liveContext.value, Date.now());
      pruneRecent(book.value, Date.now(), config);
    }

    setupEventListeners();
    onScopeDispose(() => {
      removeEventListeners();
      stopListening();
      desk.dispose();
      persistence.holdUntilReload();
      persistence.unregister();
    });
    pruneRecent(book.value, Date.now(), config);

    return {
      // Persisted
      book,
      isRecordingEnabled,

      encodedBytes,
      shelfNotice,
      refusedSaves,
      releaseCandidates,

      // Shelves and the take
      library: libraryPhrases,
      shelves,
      reel,
      isTakeTouched,
      deskPhraseId,
      take,
      takeId,
      takeNotes,
      takeContext,
      takeDuration,
      lastLiveNoteId,
      isTakeSounding,
      findPhrase,
      isLoopOwned,
      refusedLoopEdits,

      // Actions
      keepTake,
      startBlankTake,
      openPhrase,
      keepPhrase,
      deletePhrase,
      renamePhrase,
      undoLastNote,
      importPhrases,
      setLivePressGuard,
      setProtectedIds,
      markLooped,

      // Recorder plumbing (exposed for tests)
      handleNotePressed,
      handleNoteExpression,
      handleNoteReleased,
      setupEventListeners,
      removeEventListeners,
      repairAfterHydrate,
    };
  },
);
