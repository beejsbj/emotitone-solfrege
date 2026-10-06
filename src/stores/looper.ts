/**
 * The Looper: Play is the loop (docs/looper.md, slice 4).
 *
 * One `Looper` domain state (src/domain/looper.ts) and one transport
 * (src/services/looperTransport.ts) attached to the Code Strip's single
 * pattern editor. The domain decides membership synchronously, so the Play key
 * answers at once; the transport work (prepare, start, join) is serialized
 * behind it.
 *
 * Bar clocks. The transport counts bars from its own start. The domain's
 * `barOriginBars` is where bar one of the loop sits on that clock, and member
 * offsets are relative to it, so a member's transport offset is
 * `barOriginBars + offsetBars`. UIBeat and the Stage are given loop bars
 * (transport bars minus the origin), so beat one is the loop's bar one.
 */
import { defineStore } from "pinia";
import { computed, markRaw, reactive, ref, watch } from "vue";
import {
  clear as clearLooper,
  createLooper,
  deleteLoop as deleteBookLoop,
  effectiveKeyMode,
  isPlaying,
  join,
  leave,
  mustOpenFreshTake,
  openLoop as openBookLoop,
  phraseLengthBars,
  protectedPhraseIds,
  saveLoop as saveBookLoop,
  setOffset,
  toggleMute,
  toggleSolo,
} from "@/domain/looper";
import { resolveBpm } from "@/domain/phraseBook";
import { getSemitoneShift, mutatePatternMode, transposePatternNotes } from "@/data/patterns";
import { uiBeatClock, type UIBeatClock } from "@/composables/useUIBeat";
import {
  looperBarMs,
  looperTurnMs,
  type LooperStageMember,
  type LooperStageNote,
  type LooperStageSource,
} from "@/composables/canvas/looperStageSource";
import {
  createLooperTransport,
  prepareLooperPhrase,
  type CachedLooperPhrase,
  type LooperTransport,
} from "@/services/looperTransport";
import {
  getActivePatternEditor,
  getLooperPlaybackPort,
  type PatternEditor,
} from "@/services/patternPlayback";
import { getAudioContext } from "@/services/superdoughAudio";
import { useMusicStore } from "@/stores/music";
import { usePhrasesStore } from "@/stores/phrases";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type { Looper, PlayingPattern } from "@/types/looper";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import type { PatternNote } from "@/types/patterns";
import type { Phrase } from "@/types/phrases";

const LATCH_POLL_MS = 100;
const NON_LIVE_SOURCES = new Set(["strudel-playback", "live-pitch"]);
const mod = (value: number, length: number) => ((value % length) + length) % length;

/** A member as the surfaces draw it: notes as they sound, in phrase ms. */
export interface LooperMemberView {
  phraseId: string;
  label: string;
  notes: PatternNote[];
  /** Key/mode the notes sound in now (the live pair unless pinned). */
  key: ChromaticNote;
  mode: MusicalMode;
  lengthBars: number;
  offsetBars: number;
  rate: number;
  /** One bar of the phrase at its own tempo; the dial's time unit. */
  phraseBarMs: number;
  muted: boolean;
  audible: boolean;
  soloed: boolean;
  open: boolean;
}

export const useLooperStore = defineStore("looper", () => {
  const phrases = usePhrasesStore();
  const music = useMusicStore();
  const visualConfig = useVisualConfigStore();

  // ─── State ─────────────────────────────────────────────────────────────────
  const looper = ref<Looper>(createLooper());
  /** Latch: the take still being played, a member that grows as notes land. */
  const openTakeId = ref<string | null>(null);
  /** The transport is running (the scheduler belongs to the Looper). */
  const running = ref(false);
  /** Set before the transport claims the editor; the Code Strip stands aside. */
  const ownsPlayback = ref(false);
  const lastError = ref<string | null>(null);

  let transport: LooperTransport | null = null;
  let transportEditor: PatternEditor | undefined;
  let unsubscribeStop: (() => void) | undefined;
  let stopping = false;
  /** Members the transport holds (realized), by phrase id. */
  const joined = reactive(new Set<string>());
  const regrowQueued = new Set<string>();
  let queue: Promise<unknown> = Promise.resolve();

  function enqueue<T>(job: () => Promise<T> | T): Promise<T | undefined> {
    const result = queue.then(job).catch((error) => {
      lastError.value = error instanceof Error ? error.message : String(error);
      console.error("[Looper]", error);
      return undefined;
    });
    queue = result;
    return result;
  }

  const liveKey = () => music.currentKey as ChromaticNote;
  const liveMode = () => music.currentMode as MusicalMode;
  const liveBpm = () => resolveBpm(visualConfig.config.codeStrip.bpm);
  const calibrationMs = () => {
    const value = Number(visualConfig.config.codeStrip.looperCalibrationMs);
    return Number.isFinite(value) ? value : 0;
  };

  // ─── Clocks ────────────────────────────────────────────────────────────────
  // Note stamps are wall-clock (Date.now, or the live audio clock's idea of
  // it). Map them onto the audio clock fresh at each use, and correct for the
  // gap between a press's stamp and when we heard about it: the smallest gap
  // seen in a take is the truest (the prototype's skew handling).
  const stampClock = {
    fromEpochTime: (epochMs: number) => getAudioContext().currentTime * 1000 - (Date.now() - epochMs),
  };
  let stampSkew = 0;
  let skewTakeId = "";

  /** UIBeat in loop bars: beat one is the loop's bar one, not transport start. */
  const loopBeat = {
    arm: (run: Parameters<UIBeatClock["arm"]>[0]) => uiBeatClock.arm(run),
    publish: (generation: number, frame: Parameters<UIBeatClock["publish"]>[1]) =>
      uiBeatClock.publish(generation, {
        ...frame,
        barPosition: frame.barPosition === undefined
          ? undefined
          : frame.barPosition - (looper.value.barOriginBars ?? 0),
      }),
    retime: (generation: number, bpm: number) => uiBeatClock.retime(generation, bpm),
    suspend: (generation: number) => uiBeatClock.suspend(generation),
    stop: (generation?: number) => uiBeatClock.stop(generation),
    // The transport only calls these five; the class has private fields.
  } as unknown as UIBeatClock;

  // ─── Getters ───────────────────────────────────────────────────────────────
  const members = computed(() => looper.value.members);
  const hasMembers = computed(() => looper.value.members.length > 0);
  const latched = computed(() => looper.value.latched);
  const soloId = computed(() => looper.value.soloId);
  /** The desk's pattern is playing (the growing latch take does not count). */
  const isDeskPlaying = computed(() => {
    const id = phrases.deskPhraseId;
    return id !== openTakeId.value && isPlaying(looper.value, id);
  });
  const loops = computed(() => phrases.book.loops);

  function memberFor(phraseId: string): PlayingPattern | undefined {
    return looper.value.members.find((member) => member.phraseId === phraseId);
  }

  function isAudible(member: PlayingPattern): boolean {
    return !member.muted && (looper.value.soloId === null || looper.value.soloId === member.phraseId);
  }

  /** Where phrase time 0 of the take was played, as a wall stamp; null if not played live. */
  function liveOrigin(takeId: string): number | null {
    const { recorder, takeId: current } = phrases.book;
    if (takeId !== current || !recorder.liveNoteIds.length || recorder.wallOrigin === null) return null;
    return recorder.wallOrigin + (skewTakeId === current ? stampSkew : 0);
  }

  function transportOffset(member: PlayingPattern): number {
    return (looper.value.barOriginBars ?? 0) + member.offsetBars;
  }

  function settingsFor(member: PlayingPattern) {
    return {
      offsetBars: transportOffset(member),
      rate: member.rate,
      pinned: member.pinned,
      muted: member.muted,
    };
  }

  // ─── Transport plumbing ────────────────────────────────────────────────────
  function ensureTransport(): LooperTransport {
    const editor = getActivePatternEditor();
    if (!editor) throw new Error("The Code Strip's pattern editor is not mounted");
    if (transport && transportEditor === editor) return transport;
    unsubscribeStop?.();
    void transport?.dispose().catch(() => undefined);
    const port = getLooperPlaybackPort(editor);
    transport = createLooperTransport({
      playback: port,
      audioContext: () => getAudioContext() as AudioContext,
      clock: stampClock,
      beat: loopBeat,
      bpm: looper.value.bpm ?? liveBpm(),
      key: liveKey(),
      mode: liveMode(),
    });
    transport.setCalibrationMs(calibrationMs());
    transportEditor = editor;
    // The editor stopped under us (Ctrl-., disposal): nothing is playing now.
    unsubscribeStop = port.onStop(() => {
      if (stopping || !running.value) return;
      running.value = false;
      ownsPlayback.value = false;
      joined.clear();
      openTakeId.value = null;
      clearLooper(looper.value);
      stopLatchTimer();
    });
    return transport;
  }

  async function startTransport(t: LooperTransport): Promise<void> {
    ownsPlayback.value = true;
    try {
      await t.start();
      running.value = true;
    } catch (error) {
      ownsPlayback.value = false;
      throw error;
    }
  }

  async function stopTransport(): Promise<void> {
    joined.clear();
    if (!transport || !running.value) {
      ownsPlayback.value = false;
      return;
    }
    stopping = true;
    try {
      await transport.stop();
    } finally {
      stopping = false;
      running.value = false;
      ownsPlayback.value = false;
    }
  }

  async function prepare(phrase: Phrase, member: PlayingPattern): Promise<CachedLooperPhrase> {
    return prepareLooperPhrase(phrase, { lengthBars: member.lengthBars });
  }

  /** The first member starts the clock; the loop's tempo and key come with it. */
  async function primeFirst(t: LooperTransport): Promise<void> {
    const bpm = looper.value.bpm ?? liveBpm();
    await t.setTempo(bpm);
    await t.setKeyMode(liveKey(), liveMode());
    // The knob shows the loop's tempo; turning it bends the loop from here on.
    if (liveBpm() !== bpm) visualConfig.updateConfig("codeStrip", { bpm });
  }

  /**
   * Bring a domain member into the transport. `originEpoch` is the wall stamp
   * of phrase time 0 for a take played live; null pins the pattern to bar one.
   */
  async function realize(phraseId: string, originEpoch: number | null): Promise<void> {
    const phrase = phrases.findPhrase(phraseId);
    let member = memberFor(phraseId);
    if (!phrase || !member) return;
    const t = ensureTransport();
    const cached = await prepare(phrase, member);
    member = memberFor(phraseId);
    if (!member) return;

    if (!running.value) {
      await primeFirst(t);
      if (originEpoch === null) {
        // Bar one is now: join before the clock starts so the top is heard.
        await t.join(cached, settingsFor(member));
        await startTransport(t);
      } else {
        // A take played before the loop existed has been "looping since its
        // first note": bar one is where that note was played.
        await startTransport(t);
        looper.value.barOriginBars = t.eventPosition(originEpoch);
        setOffset(looper.value, phraseId, 0);
        await t.join(cached, settingsFor(member));
      }
    } else {
      if (originEpoch !== null) {
        setOffset(looper.value, phraseId, t.eventPosition(originEpoch) - (looper.value.barOriginBars ?? 0));
      }
      await t.join(cached, settingsFor(member));
    }
    joined.add(phraseId);
    if (looper.value.soloId === phraseId) await t.solo(phraseId);
  }

  function joinPhrase(phrase: Phrase, originEpoch: number | null): void {
    if (!phrase.notes.length) return;
    // The provisional placement is corrected in realize(), once the clock exists.
    join(looper.value, phrase, originEpoch === null
      ? { kind: "pinned-to-bar-one" }
      : { kind: "played", phraseOriginBars: looper.value.barOriginBars ?? 0 });
    void enqueue(() => realize(phrase.id, originEpoch));
  }

  function leaveMember(phraseId: string): void {
    if (!leave(looper.value, phraseId)) return;
    if (openTakeId.value === phraseId) openTakeId.value = null;
    void enqueue(async () => {
      const wasJoined = joined.delete(phraseId);
      if (!looper.value.members.length) await stopTransport();
      else if (wasJoined && transport) await transport.leave(phraseId);
    });
  }

  // ─── Play ──────────────────────────────────────────────────────────────────
  /** The Play key: the desk's pattern joins what is playing, or leaves it. */
  function togglePlay(): void {
    const take = phrases.take;
    // Tapping Play while a latched take grows closes it; it keeps playing.
    if (openTakeId.value && openTakeId.value === take.id) {
      openTakeId.value = null;
      return;
    }
    const id = phrases.deskPhraseId;
    if (isPlaying(looper.value, id)) {
      leaveMember(id);
      return;
    }
    const phrase = phrases.findPhrase(id);
    if (!phrase?.notes.length) return;
    joinPhrase(phrase, id === take.id ? liveOrigin(id) : null);
  }

  // ─── Latch ─────────────────────────────────────────────────────────────────
  let latchTimer: ReturnType<typeof setInterval> | undefined;
  let quietSince: number | null = null;

  function stopLatchTimer() {
    clearInterval(latchTimer);
    latchTimer = undefined;
  }

  /** Pedal-style overdub: hold Play to latch, hold again to release. */
  function toggleLatch(): void {
    looper.value.latched = !looper.value.latched;
    stopLatchTimer();
    quietSince = null;
    if (looper.value.latched) latchTimer = setInterval(latchCheck, LATCH_POLL_MS);
    else openTakeId.value = null;
  }

  /** Each note that lands joins the open take, so it sounds on the next lap. */
  function growOpenTake(): void {
    const take = phrases.take;
    const origin = liveOrigin(take.id);
    if (origin === null || !take.notes.length) return;
    if (openTakeId.value !== take.id) {
      if (isPlaying(looper.value, take.id)) return;
      openTakeId.value = take.id;
      joinPhrase(take, origin);
      return;
    }
    const member = memberFor(take.id);
    if (!member) return;
    member.lengthBars = phraseLengthBars(take);
    if (regrowQueued.has(take.id)) return;
    regrowQueued.add(take.id);
    void enqueue(async () => {
      regrowQueued.delete(take.id);
      const phrase = phrases.findPhrase(take.id);
      const current = memberFor(take.id);
      if (!phrase || !current || !joined.has(take.id) || !transport) return;
      await transport.join(await prepare(phrase, current), settingsFor(current));
    });
  }

  /** After a bar of silence the open take closes; the next note starts another. */
  function latchCheck(): void {
    const take = phrases.take;
    if (isDeskPlaying.value || liveOrigin(take.id) === null || phrases.isTakeSounding) {
      quietSince = null;
      return;
    }
    quietSince ??= Date.now();
    if (Date.now() - quietSince < 240_000 / liveBpm()) return;
    quietSince = null;
    if (openTakeId.value === take.id) openTakeId.value = null;
    else if (!isPlaying(looper.value, take.id)) joinPhrase(take, liveOrigin(take.id));
    phrases.startBlankTake();
  }

  watch(() => phrases.lastLiveNoteId, (id) => {
    if (id && looper.value.latched) growOpenTake();
  });

  // ─── Per member ────────────────────────────────────────────────────────────
  function toggleMemberMute(phraseId: string): void {
    if (!toggleMute(looper.value, phraseId)) return;
    const muted = memberFor(phraseId)!.muted;
    void enqueue(async () => {
      if (joined.has(phraseId) && transport) await transport.update(phraseId, { muted });
    });
  }

  function toggleMemberSolo(phraseId: string): void {
    if (!toggleSolo(looper.value, phraseId)) return;
    const solo = looper.value.soloId;
    void enqueue(async () => {
      if (!transport || !running.value) return;
      await transport.solo(solo !== null && joined.has(solo) ? solo : null);
    });
  }

  function removeMember(phraseId: string): void {
    leaveMember(phraseId);
  }

  /** Stop All: nothing playing, and nothing joining by itself. */
  function stopAll(): void {
    stopLatchTimer();
    quietSince = null;
    openTakeId.value = null;
    clearLooper(looper.value);
    void enqueue(stopTransport);
  }

  // ─── Saved Loops ───────────────────────────────────────────────────────────
  function saveLoop(name: string): string | null {
    return saveBookLoop(phrases.book, looper.value, name, Date.now());
  }

  /** Sets a saved Loop's patterns playing from bar one, replacing what plays. */
  function openLoop(id: string): boolean {
    const next = openBookLoop(phrases.book, id, phrases.library);
    if (!next) return false;
    stopLatchTimer();
    openTakeId.value = null;
    looper.value = next;
    void enqueue(async () => {
      await stopTransport();
      const t = ensureTransport();
      const order = looper.value.members.map((member) => member.phraseId);
      for (const phraseId of order) {
        const phrase = phrases.findPhrase(phraseId);
        const member = memberFor(phraseId);
        if (!phrase || !member) continue;
        await t.join(await prepare(phrase, member), settingsFor(member));
        joined.add(phraseId);
      }
      if (!joined.size) return;
      await primeFirst(t);
      if (looper.value.soloId) await t.solo(looper.value.soloId);
      await startTransport(t);
    });
    return true;
  }

  function deleteLoop(id: string): boolean {
    return deleteBookLoop(phrases.book, id);
  }

  // ─── Bending and settings ──────────────────────────────────────────────────
  watch([() => music.currentKey, () => music.currentMode], ([key, mode]) => {
    if (!running.value) return;
    void enqueue(async () => {
      if (running.value && transport) await transport.setKeyMode(key as ChromaticNote, mode as MusicalMode);
    });
  });

  watch(() => visualConfig.config.codeStrip.bpm, (bpm) => {
    if (!running.value) return;
    void enqueue(async () => {
      if (running.value && transport) await transport.setTempo(resolveBpm(bpm));
    });
  });

  watch(calibrationMs, (value) => transport?.setCalibrationMs(value));

  // ─── Recorder seams ────────────────────────────────────────────────────────
  // Rule 3, decided at press time: a playing desk pattern is read-only.
  phrases.setLivePressGuard(({ deskPhraseId }) => {
    quietSince = null;
    return deskPhraseId !== openTakeId.value && mustOpenFreshTake(looper.value, deskPhraseId);
  });
  // Retention: a playing or saved-Loop phrase is never purged.
  phrases.setProtectedIds(() => protectedPhraseIds(phrases.book, looper.value));

  /** Live keys down now, for the Stage's growing notes. */
  const downNotes = new Map<string, { note: string; at: number }>();
  // Registered after the phrases store's own listener, so the press has
  // already landed in its take when the skew is recorded against it.
  const onNotePlayed = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail?.noteId || detail.record === false || NON_LIVE_SOURCES.has(detail.source)) return;
      if (Number.isFinite(detail.timestamp)) {
        const skew = Date.now() - detail.timestamp;
        if (skewTakeId !== phrases.takeId) {
          skewTakeId = phrases.takeId;
          stampSkew = skew;
        } else stampSkew = Math.min(stampSkew, skew);
      }
      if (detail.noteName) downNotes.set(detail.noteId, { note: detail.noteName, at: Date.now() });
  };
  const onNoteReleased = (event: Event) => {
    downNotes.delete((event as CustomEvent).detail?.noteId);
  };
  if (typeof window !== "undefined") {
    window.addEventListener("note-played", onNotePlayed);
    window.addEventListener("note-released", onNoteReleased);
  }

  /** Detach from the window, the recorder and the editor (tests, HMR). */
  function dispose(): void {
    stopLatchTimer();
    window.removeEventListener("note-played", onNotePlayed);
    window.removeEventListener("note-released", onNoteReleased);
    phrases.setLivePressGuard(null);
    phrases.setProtectedIds(null);
    unsubscribeStop?.();
    void transport?.dispose().catch(() => undefined);
    transport = null;
  }

  // ─── What the surfaces draw ────────────────────────────────────────────────
  /** Notes as they sound now: unpinned members follow the live key and mode. */
  function soundingNotes(phrase: Phrase, member: PlayingPattern) {
    const target = effectiveKeyMode(member, phrase, { key: liveKey(), mode: liveMode() });
    let notes = phrase.notes;
    if (target.key !== phrase.context.key) {
      notes = transposePatternNotes(notes, getSemitoneShift(phrase.context.key, target.key));
    }
    if (target.mode !== phrase.context.mode) notes = mutatePatternMode(notes, target.key, target.mode);
    return { notes, ...target };
  }

  function labelFor(phrase: Phrase): string {
    return phrase.name
      ?? (phrase.shelf === "library" ? phrases.book.libraryNames[phrase.id] : undefined)
      ?? (phrase.number ? `Take ${phrase.number}` : phrase.derivedFrom?.name ?? "Pattern");
  }

  const memberViews = computed<LooperMemberView[]>(() => looper.value.members.flatMap((member) => {
    const phrase = phrases.findPhrase(member.phraseId);
    if (!phrase) return [];
    const { notes, key, mode } = soundingNotes(phrase, member);
    return [{
      phraseId: member.phraseId,
      label: labelFor(phrase),
      notes,
      key,
      mode,
      lengthBars: member.lengthBars,
      offsetBars: member.offsetBars,
      rate: member.rate,
      phraseBarMs: 240_000 / resolveBpm(phrase.context.bpm),
      muted: member.muted,
      audible: isAudible(member),
      soloed: looper.value.soloId === member.phraseId,
      open: member.phraseId === openTakeId.value,
    }];
  }));

  function viewFor(phraseId: string): LooperMemberView | undefined {
    return memberViews.value.find((view) => view.phraseId === phraseId);
  }

  // ─── The Stage's view (src/composables/canvas/looperStageSource.ts) ───────
  const loopBpm = () => looper.value.bpm ?? liveBpm();
  let frozenPositionMs = 0;

  /** Loop bars since bar one. */
  function loopPositionBars(): number {
    if (!running.value || !transport) return 0;
    return transport.position() - (looper.value.barOriginBars ?? 0);
  }

  const stageMembers = computed<readonly LooperStageMember[]>(() => {
    const barMs = looperBarMs(loopBpm());
    return memberViews.value.map((view) => {
      const periodBars = view.lengthBars / view.rate;
      const periodMs = periodBars * barMs;
      return {
        id: view.phraseId,
        bars: periodBars,
        audible: view.audible,
        notes: view.notes.map((note) => ({
          note: note.note,
          pressTime: mod((view.offsetBars + note.pressTime / view.phraseBarMs / view.rate) * barMs, periodMs),
          duration: (note.duration / view.phraseBarMs / view.rate) * barMs,
        })),
      };
    });
  });

  const heldBuffer: LooperStageNote[] = [];
  const NO_NOTES: readonly LooperStageNote[] = Object.freeze([]);
  let pendingCache: { key: string; notes: readonly LooperStageNote[] } = { key: "", notes: NO_NOTES };

  // Raw: the Stage reads it every frame and keys on array identity.
  const stageSource: LooperStageSource = markRaw({
    get members() { return stageMembers.value; },
    get bpm() { return loopBpm(); },
    get running() { return running.value; },
    positionMs() {
      if (running.value && transport) frozenPositionMs = loopPositionBars() * looperBarMs(loopBpm());
      return frozenPositionMs;
    },
    heldNotes() {
      heldBuffer.length = 0;
      const turn = looperTurnMs(stageSource);
      if (!running.value || !turn || !downNotes.size) return heldBuffer;
      const now = Date.now();
      const speed = liveBpm() / loopBpm();
      const position = stageSource.positionMs();
      for (const { note, at } of downNotes.values()) {
        const duration = (now - at) * speed;
        heldBuffer.push({ note, pressTime: mod(position - duration, turn), duration });
      }
      return heldBuffer;
    },
    pendingNotes() {
      const take = phrases.take;
      const origin = liveOrigin(take.id);
      const turn = looperTurnMs(stageSource);
      if (!running.value || !transport || origin === null || !turn
        || isPlaying(looper.value, take.id) || !take.notes.length) return NO_NOTES;
      const key = `${take.id}:${take.notes.length}:${turn}:${looper.value.barOriginBars}`;
      if (pendingCache.key === key) return pendingCache.notes;
      const barMs = looperBarMs(loopBpm());
      const phraseBarMs = 240_000 / resolveBpm(take.context.bpm);
      const originBars = transport.eventPosition(origin) - (looper.value.barOriginBars ?? 0);
      pendingCache = {
        key,
        notes: take.notes.map((note) => ({
          note: note.note,
          pressTime: mod((originBars + note.pressTime / phraseBarMs) * barMs, turn),
          duration: (note.duration / phraseBarMs) * barMs,
        })),
      };
      return pendingCache.notes;
    },
  });

  return {
    // State
    looper,
    members,
    memberViews,
    hasMembers,
    running,
    ownsPlayback,
    latched,
    soloId,
    openTakeId,
    isDeskPlaying,
    loops,
    lastError,
    stageSource,

    // Queries
    memberFor,
    viewFor,
    loopPositionBars,

    // Actions
    togglePlay,
    toggleLatch,
    toggleMute: toggleMemberMute,
    toggleSolo: toggleMemberSolo,
    removeMember,
    stopAll,
    saveLoop,
    openLoop,
    deleteLoop,
    dispose,

    /** For tests and the browser harness: resolves once queued transport work is done. */
    settled: () => queue.then(() => undefined),
    /** Desk follow for the Code Strip highlight: the desk member's transport placement. */
    deskFollow(): { phraseId: string; offsetBars: number; rate: number; lengthBars: number } | null {
      const id = phrases.deskPhraseId;
      const member = memberFor(id);
      if (!member || !running.value || !joined.has(id)) return null;
      return { phraseId: id, offsetBars: transportOffset(member), rate: member.rate, lengthBars: member.lengthBars };
    },
  };
});
