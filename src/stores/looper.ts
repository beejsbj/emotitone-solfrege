/**
 * The Looper: Play is the loop (docs/looper.md, rules 1–4), on the worklet
 * transport (BJS-491) through the app's single pattern player.
 *
 * The domain (src/domain/looper.ts) decides membership synchronously, so the
 * Play key answers at once; the player then prepares banks and joins. Every
 * asynchronous step is guarded by intent: Stop, a released player (the Code
 * Strip unmounted) or a newer request for the same member makes a bank that
 * finishes loading late start nothing.
 *
 * Bar clocks. Transport bar 0 is the loop's bar one: a first pattern from the
 * reel starts the run at bar 0; a first take played live starts it at the bar
 * that puts the take's first note on bar 0 ("it has been looping since its
 * first note"). The domain's `barOriginBars` is that bar (0, or within a few
 * milliseconds of it, corrected from the tempo map), and a member's transport
 * offset is `barOriginBars + offsetBars`.
 *
 * The latch's grid (Burooj, 2026-10-26). Latching with nothing running starts
 * the transport at bar 0 there and then, silently, at the current tempo, so
 * the beat dots and Play's ring tick before any note. A take played into it
 * joins where its notes fell on that grid: its offset is its first note's bar
 * (a take begun on beat 3 stays on beat 3), and its length is its own,
 * rounded up to whole bars (rule 2, #139's `phraseLengthBars`), so every lap
 * starts on that same beat. Latching over a running loop joins its grid. While
 * latched, the grid outlives its last member; releasing the latch stops an
 * empty one.
 *
 * Recorded offsets come from the audio clock: each live attack's audio time
 * (recovered from its heard time) converts to a transport bar on the published
 * tempo map when the take joins, minus the per-device Loop Timing calibration.
 */
import { defineStore } from "pinia";
import { computed, reactive, ref, watch } from "vue";
import {
  clear as clearLooper,
  createLooper,
  deleteLoop as deleteBookLoop,
  effectiveKeyMode,
  isLoopPlaying,
  isPlaying,
  join,
  joinLoop,
  leave,
  loopOfPlayingSet,
  mustOpenFreshTake,
  openLoop as openBookLoop,
  phraseLengthBars,
  playingPhraseIds,
  replaceLoopMember,
  saveLoop as saveBookLoop,
  setOffset,
  toggleMute,
  toggleSolo,
} from "@/domain/looper";
import { bendNotes } from "@/domain/modeRemap";
import { resolveBpm } from "@/domain/phraseBook";
import { getAudioContext } from "@/services/audioRuntime";
import { outputTimeToAudioTime } from "@/services/liveAudioTiming";
import { LooperNotReady, looperFailureOf, looperMessage, type LooperFailureKind } from "@/services/looperMessages";
import { resolveLiveSoundName } from "@/services/liveInstrumentNames";
import {
  getProductionPatternPlayer,
  onProductionPatternPlayer,
  PATTERN_PLAYBACK_SOURCE,
  type LooperKeyMode,
  type LooperMemberRequest,
  type PatternPlayer,
} from "@/services/patternTransport";
import { planRecordedPattern, type StrudelConfig } from "@/services/StrudelNotation";
import { useInstrumentStore } from "@/stores/instrument";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { useLoopTimingStore } from "@/stores/performanceSettings";
import { usePhrasesStore } from "@/stores/phrases";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type { Loop, Looper, PlayingPattern } from "@/types/looper";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import type { LogNote, PatternNote } from "@/types/patterns";
import type { Phrase } from "@/types/phrases";

/**
 * A loop's length (Burooj's open question 13). "whole-bars" rounds each
 * pattern to whole bars (#139's `phraseLengthBars`), so every loop cycles on
 * bar lines. "recorded" plays the take's own length, as the Code Strip plays a
 * lone pattern.
 */
export const LOOP_LENGTH: "whole-bars" | "recorded" = "whole-bars";

/**
 * A take edited while it loops (carried note 4). "next-change" (Burooj's A):
 * the playing table is not swapped; it rebuilds on the next key, mode,
 * octave, instrument or tempo change. "every-change" (B) swaps on every edit.
 * B is hidden behind `localStorage["emotitone.looper.swap"] = "every-change"`.
 */
export type TakeSwapPolicy = "next-change" | "every-change";
const SWAP_STORAGE_KEY = "emotitone.looper.swap";

// Fine enough that the closing bar's countdown steps on the beat you hear.
const LATCH_POLL_MS = 25;
const BEATS_PER_BAR = 4;
/** Stop All fades out over this many bars at the loop's tempo (BJS-598). */
const FADE_BARS = 1;
const NON_LIVE_SOURCES = new Set([PATTERN_PLAYBACK_SOURCE, "strudel-playback", "live-pitch"]);
const barMsAt = (bpm: number) => 240_000 / resolveBpm(bpm);

function readSwapPolicy(): TakeSwapPolicy {
  try {
    return globalThis.localStorage?.getItem(SWAP_STORAGE_KEY) === "every-change" ? "every-change" : "next-change";
  } catch {
    return "next-change";
  }
}

/** A member as the surfaces draw it: notes as they sound now, in phrase ms. */
export interface LooperMemberView {
  phraseId: string;
  label: string;
  notes: PatternNote[];
  /** Key and mode the notes sound in now (the live pair unless pinned). */
  key: ChromaticNote;
  mode: MusicalMode;
  lengthBars: number;
  /** Where phrase time 0 sits on the transport's bar clock. */
  originBars: number;
  rate: number;
  /** One bar of the phrase at its own tempo: the dial's time unit. */
  phraseBarMs: number;
  muted: boolean;
  audible: boolean;
  soloed: boolean;
  /** The latch's growing take. */
  open: boolean;
}

/** A dial as the column draws it: a member, or a pattern fading out (BJS-598). */
export interface LooperDialView extends LooperMemberView {
  /** Fading out over `endingMs`, then gone; its gestures do nothing. */
  ending: boolean;
  endingMs: number;
}

/** What a start was sent with, to follow a knob turned while its banks load. */
interface StartAsked {
  knob: number;
  target: LooperKeyMode;
}

/** A pattern fading out, held where its dial was until it has left. */
interface Ending {
  view: LooperMemberView;
  /** Which fade-out it belongs to. */
  fade: number;
  endingMs: number;
  /** When its ramp reaches silence, on `performance.now()`'s clock. */
  endsAt: number;
  /** Stop All's fade: its next tap cuts. */
  stopAll: boolean;
}

/** What the notes are, for deciding whether a member's table is stale. */
function signature(phrase: Phrase): string {
  const { context } = phrase;
  return [phrase.duration, context.instrument, context.bpm, JSON.stringify(context.shape),
    ...phrase.notes.map((note) => `${note.id}:${note.note}:${note.pressTime}:${note.duration}`)].join("|");
}

export const useLooperStore = defineStore("looper", () => {
  const phrases = usePhrasesStore();
  const music = useMusicStore();
  const visualConfig = useVisualConfigStore();
  const keyboard = useKeyboardDrawerStore();
  const instrument = useInstrumentStore();
  const loopTiming = useLoopTimingStore();

  // ─── State ─────────────────────────────────────────────────────────────────
  const looper = ref<Looper>(createLooper());
  /** The latch's take: a member that grows as its notes land. */
  const openTakeId = ref<string | null>(null);
  /**
   * While latched with a take open: the beats left of the closing bar, which
   * the beat dots above Play show. Full while a note sounds, draining beat by
   * beat across the silent bar, null once the take closes (or not latched).
   */
  const latchCountdown = ref<number | null>(null);
  /** The transport is running a Looper session. */
  const running = ref(false);
  const lastError = ref<string | null>(null);
  /** Members the transport holds, by phrase id. */
  const joined = reactive(new Set<string>());
  const swapPolicy = ref<TakeSwapPolicy>(readSwapPolicy());
  /**
   * The reel the deck shows (BJS-572): null is the home reel, every phrase;
   * otherwise a saved Loop's id, whose reel holds only that Loop's patterns.
   * Per tab and not saved: a reload opens on the home reel.
   */
  const reelLoopId = ref<string | null>(null);
  /** Per Loop reel, the pattern last on its desk: the one "Replace in Loop" replaces. */
  const reelFocus = reactive(new Map<string, string>());
  /**
   * Patterns fading out (BJS-598): no longer members (nothing reads them as
   * playing), but still sounding for a bar, so their dials show them ending.
   */
  const ending = ref<Ending[]>([]);
  /** Stop All is fading everything out: its next tap cuts at once. */
  const stopping = computed(() => ending.value.some((entry) => entry.stopAll));
  let fadeSerial = 0;
  /** Endings whose dials outlive the run they faded in: removed when their ramp reaches silence. */
  const endingTimers = new Set<ReturnType<typeof setTimeout>>();

  /** A take now in a Loop, held open by a key down when it was saved: filed when that key lets go. */
  let fileOnRelease: string | null = null;
  /** Moves on Stop, on a released player, and when the loop empties: a session's identity. */
  let epoch = 0;
  /** Each member's current request; a newer request or a leave makes older work stale. */
  const intents = new Map<string, number>();
  let intentSerial = 0;
  /** The first member's start, while its banks load. */
  let starting: Promise<boolean> | null = null;
  let startingId: string | null = null;
  /** The newest join sent per member, so a superseded join's cancellation is not read as a failure. */
  const latestJoin = new Map<string, number>();
  let joinSerial = 0;
  /** The tempo the transport runs at (the latch's grid has no member to carry one). */
  let transportBpm = 120;
  /** Where each played take's phrase time 0 sounded, in AudioContext seconds. */
  const origins = new Map<string, number>();
  /**
   * Where each played take's phrase time 0 landed on the transport's bar
   * clock, unwrapped: a growing take's offset is wrapped again from it each
   * time its length changes, so a first note on bar 2 stays on bar 2.
   */
  const playedBars = new Map<string, number>();
  /** The note data each member's table was built from. */
  const builtFrom = new Map<string, string>();
  let player: PatternPlayer | undefined;
  let stopInterrupted: (() => void) | undefined;
  let stopRecoveryWatch: (() => void) | undefined;
  /** The pattern player exists (the Code Strip is mounted). */
  const playerReady = ref(false);
  /** The engine is restoring a rebuilt renderer. */
  const engineRecovering = ref(false);

  const liveKey = () => music.currentKey as ChromaticNote;
  const liveMode = () => music.currentMode as MusicalMode;
  const liveBpm = () => resolveBpm(visualConfig.config.codeStrip.bpm);
  const loopBpm = () => looper.value.bpm ?? liveBpm();
  const calibrationMs = () => {
    const value = Number(loopTiming.value);
    return Number.isFinite(value) ? value : 0;
  };

  /** Say why, in the one plain line its cause maps to (src/services/looperMessages.ts). */
  function report(error: unknown, instrument?: string) {
    lastError.value = looperMessage(looperFailureOf(error, instrument));
  }

  function reportKind(kind: LooperFailureKind) {
    lastError.value = looperMessage({ kind });
  }

  /** The player read the failure (the deck's notice was dismissed). */
  function clearError() {
    lastError.value = null;
  }

  function attach(next: PatternPlayer | undefined) {
    if (next === player) return;
    // A different (or no) player: nothing this session started is playing any more.
    if (player) abandon();
    stopInterrupted?.();
    stopInterrupted = undefined;
    stopRecoveryWatch?.();
    stopRecoveryWatch = undefined;
    player = next;
    playerReady.value = Boolean(next);
    engineRecovering.value = Boolean(next?.getLooper().recovering);
    stopRecoveryWatch = player?.onRecoveryChange((recovering) => { engineRecovering.value = recovering; });
    stopInterrupted = player?.onInterrupted(() => {
      // A start with no member waiting on it is the grid's own.
      if (!looper.value.members.length && (!starting || startingId === null)) {
        // Only the latch's silent grid stopped (or was starting): nothing was
        // heard, so nothing is reported, and the latch holds (its next note
        // starts a run).
        if (running.value || starting) resetSession();
        return;
      }
      reportKind("interrupted");
      abandon();
    });
  }
  const stopWatchingPlayer = onProductionPatternPlayer(attach);
  attach(getProductionPatternPlayer());

  // ─── Getters ───────────────────────────────────────────────────────────────
  const members = computed(() => looper.value.members);
  const hasMembers = computed(() => looper.value.members.length > 0);
  const latched = computed(() => looper.value.latched);
  const soloId = computed(() => looper.value.soloId);
  /** The desk's pattern is playing (the latch's growing take does not count). */
  const isDeskPlaying = computed(() => {
    const id = phrases.deskPhraseId;
    return id !== openTakeId.value && isPlaying(looper.value, id);
  });
  /** The desk's pattern sounds on the transport now: the Code Strip follows it. */
  const deskMemberId = computed(() => {
    const id = phrases.deskPhraseId;
    return running.value && joined.has(id) ? id : null;
  });
  const loops = computed(() => phrases.book.loops);
  /** The Loop whose reel shows (null on the home reel, or once that Loop is gone). */
  const reelLoop = computed<Loop | null>(() => reelLoopId.value
    ? phrases.book.loops.find((loop) => loop.id === reelLoopId.value) ?? null
    : null);
  /**
   * Every pattern of the Loop whose reel shows that can still sound is
   * playing: a member another tab took away does not keep its Loop from
   * reading as playing, or from stopping.
   */
  const isReelLoopPlaying = computed(() => Boolean(reelLoop.value && isPresentLoopPlaying(reelLoop.value)));
  /** What Play shows: on a Loop's reel the Loop, otherwise the desk's pattern. */
  const isPlayPlaying = computed(() => (reelLoop.value ? isReelLoopPlaying.value : isDeskPlaying.value));
  /** Two or more patterns play together and no saved Loop holds exactly them. */
  const canSaveLoop = computed(() => looper.value.members.length >= 2 && !loopOfPlayingSet(phrases.book, looper.value));
  /** On a Loop's reel, the pattern the desk's would replace: the one last on the desk there. */
  const replaceTarget = computed<string | null>(() => {
    const loop = reelLoop.value;
    if (!loop?.members.length) return null;
    const focus = reelFocus.get(loop.id);
    return focus && loop.members.some((member) => member.phraseId === focus) ? focus : loop.members[0].phraseId;
  });
  /** A saved Loop points at the phrase: it is read-only from the desk on every reel (rule 3). */
  const inAnyLoop = (phraseId: string) => phrases.isLoopOwned(phraseId);
  /** The pattern is one of the Loop's whose reel shows. */
  const isReelMember = (phraseId: string) => Boolean(reelLoop.value?.members.some((member) => member.phraseId === phraseId));
  watch([reelLoop, () => phrases.deskPhraseId], ([loop, desk]) => {
    if (loop && isReelMember(desk)) reelFocus.set(loop.id, desk);
  }, { immediate: true });
  /** Each saved Loop's pointers, in order: what a merge with another tab is read against. */
  const loopPointers = computed(() => new Map(phrases.book.loops.map((loop) =>
    [loop.id, loop.members.map((member) => member.phraseId)] as const)));
  watch(loopPointers, (now, before) => {
    // A Loop deleted here or in another tab: its reel goes, and with it what it remembered.
    for (const id of [...reelFocus.keys()]) if (!now.has(id)) reelFocus.delete(id);
    if (reelLoopId.value !== null && !now.has(reelLoopId.value)) reelLoopId.value = null;
    for (const [id, was] of before ?? []) {
      const pointers = now.get(id);
      if (pointers) followSwap(id, was, pointers);
    }
  });
  /**
   * Play can start: the pattern player is there, the audio engine has booted,
   * and no rebuilt renderer is being restored (Burooj, 2026-10-19: "play
   * shouldn't be startable if engine isn't started").
   */
  const engineReady = computed(() => playerReady.value && !engineRecovering.value && instrument.engineBooted);

  function memberFor(phraseId: string): PlayingPattern | undefined {
    return looper.value.members.find((member) => member.phraseId === phraseId);
  }

  function loopLengthBars(phrase: Phrase): number {
    if (LOOP_LENGTH === "whole-bars") return phraseLengthBars(phrase);
    return planRecordedPattern(phrase.notes as LogNote[], configFor(phrase)).lengthBars || phraseLengthBars(phrase);
  }

  // ─── Requests ──────────────────────────────────────────────────────────────
  function configFor(phrase: Phrase): Partial<StrudelConfig> {
    const { context } = phrase;
    // The Code Strip's export configuration for the same phrase: one plan for text and sound.
    return {
      bpm: loopBpm(),
      sourceBpm: resolveBpm(context.bpm),
      notationType: visualConfig.config.codeStrip.notation === "note" ? "absolute" : "relative",
      scaleKey: context.key,
      scaleMode: context.mode,
      scaleOctave: context.octave,
      patternDurationMs: phrase.duration,
      sound: resolveLiveSoundName(context.instrument ?? "triangle"),
      shape: context.shape,
      inline: true,
    };
  }

  function requestFor(phrase: Phrase, member: PlayingPattern): LooperMemberRequest {
    builtFrom.set(phrase.id, signature(phrase));
    return {
      id: phrase.id,
      // A copy: the table is built from the notes as they are now (rule 3).
      notes: phrase.notes.map((note) => ({ ...note })) as LogNote[],
      config: configFor(phrase),
      instrument: phrase.context.instrument ?? "triangle",
      key: phrase.context.key,
      mode: phrase.context.mode,
      laBasedMinor: visualConfig.laBasedMinor,
      offsetBars: (looper.value.barOriginBars ?? 0) + member.offsetBars,
      rate: member.rate,
      muted: member.muted,
      pinned: member.pinned,
      lengthBars: member.lengthBars,
    };
  }

  // ─── Recorded offsets ──────────────────────────────────────────────────────
  /** The newest live attack: its take, its wall stamp and its audio time. */
  let lastAttack: { takeId: string; wallTime: number; audioTime: number } | null = null;

  /** Where phrase time 0 of the take sounded (AudioContext seconds); null if it was not played live. */
  function takeOrigin(takeId: string): number | null {
    const { recorder, takeId: current } = phrases.book;
    if (takeId !== current || recorder.wallOrigin === null || !recorder.liveNoteIds.length) return null;
    if (lastAttack?.takeId !== takeId) return null;
    // Stamps within a take share one clock, so their differences are exact.
    return lastAttack.audioTime - (lastAttack.wallTime - recorder.wallOrigin) / 1000;
  }

  /** The transport bar a played take's phrase time 0 lands on, minus the device calibration. */
  function playedOriginBar(originAudio: number): number | null {
    const bar = player?.barAtAudioTime(originAudio);
    if (bar === null || bar === undefined) return null;
    return bar - calibrationMs() / barMsAt(loopBpm());
  }

  // ─── Session lifecycle ─────────────────────────────────────────────────────
  /** Forget the session's transport side; the domain is cleared by the caller. */
  function resetSession() {
    epoch++;
    running.value = false;
    ending.value = [];
    for (const timer of endingTimers) clearTimeout(timer);
    endingTimers.clear();
    starting = null;
    startingId = null;
    joined.clear();
    intents.clear();
    latestJoin.clear();
    builtFrom.clear();
  }

  /** The player went away or stopped by itself: nothing plays, nothing will. */
  function abandon() {
    resetSession();
    openTakeId.value = null;
    latchCountdown.value = null;
    origins.clear();
    playedBars.clear();
    clearLooper(looper.value);
    stopLatchTimer();
  }

  /** `cut`: Stop All's second tap, which also silences fading notes and release tails (BJS-598). */
  function stopTransport({ cut = false }: { cut?: boolean } = {}) {
    resetSession();
    player?.stop({ cut });
  }

  /**
   * Only patterns fading out are left (BJS-598): the run is ending. Something
   * started now starts as it would with nothing playing (its own tempo, its
   * bar one, its first note); the fading patterns ramp out on their own.
   */
  function runEnding(): boolean {
    return running.value && !looper.value.members.length && !looper.value.latched && ending.value.length > 0;
  }

  /**
   * A run starts over patterns still fading out (BJS-598): their notes ramp out
   * on their own, so their dials stay, ending, until the ramp reaches silence.
   */
  function outliveRun(entries: readonly Ending[]): void {
    const captured = epoch;
    for (const fade of new Set(entries.map((entry) => entry.fade))) {
      const endsAt = Math.max(...entries.filter((entry) => entry.fade === fade).map((entry) => entry.endsAt));
      const timer = setTimeout(() => {
        endingTimers.delete(timer);
        if (epoch !== captured) return;
        ending.value = ending.value.filter((entry) => entry.fade !== fade);
        stopIfEmpty();
      }, Math.max(0, endsAt - performance.now()));
      endingTimers.add(timer);
    }
  }

  /**
   * The loop emptied: the transport stops, unless the latch keeps its grid
   * running or a pattern is still fading out (the last fade to end stops it).
   */
  function stopIfEmpty(): boolean {
    if (looper.value.members.length || looper.value.latched || ending.value.length) return false;
    stopTransport();
    return true;
  }

  /**
   * The latch's grid: with nothing running, the transport starts at bar 0 now,
   * at the current tempo, with no member, so it is silent. A grid that cannot
   * start leaves the latch as it was before (its first note starts the run).
   */
  function startGrid(): void {
    if (running.value || starting || !player) return;
    const captured = epoch;
    const current = player;
    transportBpm = liveBpm();
    startingId = null;
    starting = (async () => {
      try {
        const receipt = await current.start({
          bpm: transportBpm,
          target: { key: liveKey(), mode: liveMode() },
          members: [],
          grid: { instrument: instrument.currentInstrument },
        });
        if (epoch !== captured || receipt.cancelled) return false;
        running.value = true;
        // The knob turned while it started: the grid follows it.
        if (liveBpm() !== transportBpm) {
          transportBpm = liveBpm();
          if (looper.value.members.length) looper.value.bpm = transportBpm;
          void current.setTempo(transportBpm).catch(report);
        }
        return true;
      } catch {
        return false;
      } finally {
        if (epoch === captured) starting = null;
      }
    })();
  }

  /** Bring a domain member into the transport (asynchronously, guarded by intent). */
  /** `fresh`: it starts a new run over one that is ending (BJS-598), as if nothing played. */
  function bringIn(phraseId: string, fresh = false) {
    // Played again while it fades: it is a member again, at full level.
    ending.value = ending.value.filter((entry) => entry.view.phraseId !== phraseId);
    const token = ++intentSerial;
    intents.set(phraseId, token);
    // The ending run stops as the new one starts: nothing reads it as running while the new one's banks load.
    if (fresh) running.value = false;
    if (fresh || (!running.value && !starting)) startSession(phraseId, token);
    else void joinRunning(phraseId, token);
  }

  function startSession(phraseId: string, token: number) {
    const captured = epoch;
    const current = player;
    startingId = phraseId;
    starting = (async () => {
      try {
        const phrase = phrases.findPhrase(phraseId);
        const member = memberFor(phraseId);
        if (!current) throw new LooperNotReady();
        if (!phrase || !member) return false;
        const origin = origins.get(phraseId);
        const sent = requestFor(phrase, member);
        transportBpm = loopBpm();
        const asked = startAsked();
        const receipt = await current.start({
          bpm: transportBpm,
          target: asked.target,
          members: [sent],
          ...(origin === undefined ? {} : { at: { originAudioTime: origin } }),
        });
        if (epoch !== captured || receipt.cancelled) return false;
        running.value = true;
        joined.add(phraseId);
        if (origin !== undefined) {
          // The run was started at the bar read when it was sent; the tempo map
          // says exactly where the take's first note landed. Bar one is there.
          const bar = current.barAtAudioTime(origin);
          if (bar !== null && Math.abs(bar - (looper.value.barOriginBars ?? 0)) > 1e-9) {
            looper.value.barOriginBars = bar;
            await current.setMember(phraseId, { offsetBars: bar + (memberFor(phraseId)?.offsetBars ?? 0) });
          }
          // Its first note is bar one.
          playedBars.set(phraseId, looper.value.barOriginBars ?? 0);
        }
        if (epoch !== captured) return false;
        settleStarted([sent], current, asked);
        if (intents.get(phraseId) !== token) {
          // Left while its bank loaded, with others waiting to join.
          joined.delete(phraseId);
          void current.leave(phraseId).catch(report);
        }
        return true;
      } catch (error) {
        if (epoch === captured) {
          report(error, phrases.findPhrase(phraseId)?.context.instrument);
          // Nothing started: every member waiting on this start is gone too.
          const keepLatch = looper.value.latched;
          abandon();
          if (keepLatch) latchOn({ freshDesk: false });
        }
        return false;
      } finally {
        if (epoch === captured) {
          starting = null;
          startingId = null;
        }
      }
    })();
  }

  /**
   * After a start: what was tapped or dragged while its banks loaded (mute,
   * solo, a turn of the dial) reaches the transport, checked against what the
   * transport now holds.
   */
  function settleStarted(sent: readonly LooperMemberRequest[], current: PatternPlayer, asked: StartAsked) {
    const held = new Map(current.getLooper().members.map((settings) => [settings.id, settings]));
    for (const request of sent) {
      const member = memberFor(request.id);
      const now = held.get(request.id);
      if (!member || !now) continue;
      const offsetBars = (looper.value.barOriginBars ?? 0) + member.offsetBars;
      const patch = {
        ...(member.muted !== now.muted ? { muted: member.muted } : {}),
        ...(Math.abs(offsetBars - now.offsetBars) > 1e-9 ? { offsetBars } : {}),
      };
      if (Object.keys(patch).length) void current.setMember(request.id, patch).catch(report);
    }
    if (looper.value.soloId) void current.solo(looper.value.soloId).catch(report);
    if (liveBpm() !== asked.knob) {
      // The knob turned while the banks loaded: the run follows it.
      transportBpm = liveBpm();
      looper.value.bpm = transportBpm;
      void current.setTempo(transportBpm).catch(report);
    } else if (liveBpm() !== loopBpm()) {
      // The knob shows the loop's tempo; turning it bends the loop from here on.
      visualConfig.updateConfig("codeStrip", { bpm: loopBpm() });
    }
    // So did the key or mode: the run bends to them now.
    if (liveKey() !== asked.target.key || liveMode() !== asked.target.mode) {
      void current.bend({ key: liveKey(), mode: liveMode() }).catch(report);
    }
  }

  /** What a start was sent with: the tempo knob and the key and mode at that moment. */
  function startAsked(): StartAsked {
    return { knob: liveBpm(), target: { key: liveKey(), mode: liveMode() } };
  }

  async function joinRunning(phraseId: string, token: number) {
    const captured = epoch;
    const stale = () => epoch !== captured || intents.get(phraseId) !== token;
    while (starting) {
      const started = await starting;
      if (stale()) return;
      if (started) break;
      // A start that fails or is cancelled ends the session (stale above), except
      // the latch's silent grid: without it, this member starts the run itself.
      if (!starting && !running.value) {
        startSession(phraseId, token);
        return;
      }
    }
    if (stale() || !running.value || !player) return;
    const current = player;
    const phrase = phrases.findPhrase(phraseId);
    const member = memberFor(phraseId);
    if (!phrase || !member) return;
    const origin = origins.get(phraseId);
    if (origin !== undefined) {
      const bar = playedOriginBar(origin);
      if (bar === null) {
        // The engine is restarting: there is no bar to place it on. It stays
        // unjoined (and kept) rather than landing silently at bar one.
        leave(looper.value, phraseId);
        intents.delete(phraseId);
        origins.delete(phraseId);
        playedBars.delete(phraseId);
        // A latched take is no longer the open one, so "Tap Play again" joins it.
        if (openTakeId.value === phraseId) openTakeId.value = null;
        reportKind("restarting");
        return;
      }
      playedBars.set(phraseId, bar);
      setOffset(looper.value, phraseId, wrapOffset(member, bar - (looper.value.barOriginBars ?? 0)));
    }
    await sendJoin(current, phrase, memberFor(phraseId)!, captured, token);
  }

  /** Send a join (or a re-join) to the player and settle the domain by its receipt. */
  async function sendJoin(current: PatternPlayer, phrase: Phrase, member: PlayingPattern, captured: number, token: number) {
    const serial = ++joinSerial;
    latestJoin.set(phrase.id, serial);
    try {
      const receipt = await current.join(requestFor(phrase, member));
      if (epoch !== captured || latestJoin.get(phrase.id) !== serial) return;
      if (intents.get(phrase.id) !== token) return;
      if (receipt.cancelled || receipt.refused) {
        leave(looper.value, phrase.id);
        intents.delete(phrase.id);
        stopIfEmpty();
        return;
      }
      joined.add(phrase.id);
    } catch (error) {
      if (epoch !== captured || intents.get(phrase.id) !== token || latestJoin.get(phrase.id) !== serial) return;
      report(error, phrase.context.instrument);
      // A refused bank never sounds: the pattern is not playing.
      if (!joined.has(phrase.id)) {
        leave(looper.value, phrase.id);
        intents.delete(phrase.id);
        stopIfEmpty();
      }
    }
  }

  /** Rebuild a playing member's table from its phrase as it is now. */
  function rejoin(phraseId: string) {
    const phrase = phrases.findPhrase(phraseId);
    const member = memberFor(phraseId);
    const token = intents.get(phraseId);
    if (!phrase || !member || token === undefined || !running.value || !player) return;
    if (!joined.has(phraseId) && !latestJoin.has(phraseId)) return;
    void sendJoin(player, phrase, member, epoch, token);
  }

  /** The domain's member joins: from the reel (pinned to bar one) or as a played take. */
  function joinPhrase(phrase: Phrase, originAudio: number | null): void {
    if (!phrase.notes.length || isPlaying(looper.value, phrase.id)) return;
    lastError.value = null;
    playedBars.delete(phrase.id);
    if (originAudio === null) origins.delete(phrase.id);
    else origins.set(phrase.id, originAudio);
    const first = !looper.value.members.length;
    // Over a run that is only fading out, it starts its own run (BJS-598).
    const fresh = runEnding();
    // A first take's bar one is its own first note; a later one is placed when it joins.
    const member = join(looper.value, phrase, originAudio === null
      ? { kind: "pinned-to-bar-one" }
      : { kind: "played", phraseOriginBars: first ? 0 : (looper.value.barOriginBars ?? 0) });
    // Joining the latch's grid: it set the tempo, and its bar 0 is bar one.
    if (first && !fresh && (running.value || starting)) looper.value.bpm = transportBpm;
    member.lengthBars = loopLengthBars(phrase);
    // Looping is deliberate: the take is kept even after it stops playing.
    phrases.markLooped(phrase.id);
    bringIn(phrase.id, fresh);
  }

  /** The member leaves the domain and this session's bookkeeping; the transport is the caller's. */
  function forgetMember(phraseId: string): boolean {
    if (heldSolos.includes(phraseId)) releaseSolo(phraseId);
    if (!leave(looper.value, phraseId)) return false;
    intents.delete(phraseId);
    origins.delete(phraseId);
    playedBars.delete(phraseId);
    builtFrom.delete(phraseId);
    if (openTakeId.value === phraseId) openTakeId.value = null;
    return true;
  }

  function leaveMember(phraseId: string): void {
    if (!forgetMember(phraseId)) return;
    if (stopIfEmpty()) return;
    if (startingId === phraseId) return; // the start leaves it once it has started
    const wasJoined = joined.delete(phraseId);
    // A join still loading is withdrawn by the leave, so its bank starts nothing.
    if ((wasJoined || latestJoin.has(phraseId)) && running.value && player) {
      latestJoin.delete(phraseId);
      void player.leave(phraseId).catch(report);
    }
    latestJoin.delete(phraseId);
  }

  // ─── Play ──────────────────────────────────────────────────────────────────
  /** The Play key: the desk's pattern joins what is playing, or leaves it. */
  function togglePlay(): void {
    const take = phrases.take;
    // On a Loop's reel, Play is the Loop's: its patterns start, or stop,
    // together. A latched take growing there closes and is filed first, as a
    // silent bar would close it (it plays on, and the latch holds): Play
    // never only closes a take on a Loop's reel.
    if (reelLoop.value) {
      if (openTakeId.value && openTakeId.value === take.id) closeOpenTake();
      toggleLoop(reelLoop.value.id);
      return;
    }
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
    joinPhrase(phrase, id === take.id ? takeOrigin(id) : null);
  }

  // ─── Latch ─────────────────────────────────────────────────────────────────
  let latchTimer: ReturnType<typeof setInterval> | undefined;

  function stopLatchTimer() {
    clearInterval(latchTimer);
    latchTimer = undefined;
  }

  /** Pedal-style overdub: hold Play to latch, hold again to release. */
  function toggleLatch(): void {
    if (!looper.value.latched) {
      latchOn({ freshDesk: true });
      return;
    }
    looper.value.latched = false;
    stopLatchTimer();
    openTakeId.value = null;
    latchCountdown.value = null;
    // An empty grid goes with the latch that started it (a fading pattern's end stops it instead).
    if (!looper.value.members.length && !ending.value.length && (running.value || starting)) stopTransport();
  }

  /**
   * Latch (Burooj, 2026-10-26): the desk moves to a new, empty take, and the
   * bar grid starts now if nothing runs. What was at the front goes back to
   * the reel untouched (rule 3), and plays on if it was playing. A key still
   * held keeps its take, so no note is cut from the take it sounds in.
   */
  function latchOn({ freshDesk }: { freshDesk: boolean }): void {
    looper.value.latched = true;
    stopLatchTimer();
    latchTimer = setInterval(() => checkLatch(), LATCH_POLL_MS);
    if (freshDesk && phrases.take.notes.length && !phrases.isTakeSounding) phrases.startBlankTake();
    startGrid();
  }

  /** Each note that lands joins the open take, so it sounds from the next lap. */
  function growOpenTake(): void {
    const take = phrases.take;
    const origin = takeOrigin(take.id);
    if (origin === null || !take.notes.length) return;
    if (openTakeId.value !== take.id) {
      if (isPlaying(looper.value, take.id)) return;
      openTakeId.value = take.id;
      latchCountdown.value = BEATS_PER_BAR;
      joinPhrase(take, origin);
      return;
    }
    const member = memberFor(take.id);
    if (!member) return;
    const lengthBars = loopLengthBars(take);
    if (lengthBars !== member.lengthBars) {
      member.lengthBars = lengthBars;
      // A longer cycle: the offset is wrapped again from where the first note
      // fell, not from the shorter cycle's wrap of it.
      const bar = playedBars.get(take.id);
      if (bar !== undefined) setOffset(looper.value, take.id, wrapOffset(member, bar - (looper.value.barOriginBars ?? 0)));
    }
    rejoin(take.id);
  }

  /**
   * When live input last moved, on the main thread's own clock. Note stamps
   * are on the audio clock, whose wall anchor drifts from `performance.now()`.
   */
  let lastLiveActivity = 0;
  /** The bar the listener heard when live input last moved (null: no run then). */
  let lastLiveBar: number | null = null;

  function liveActivity() {
    lastLiveActivity = performance.now();
    lastLiveBar = running.value ? player?.heardBar() ?? null : null;
  }

  /**
   * Bars of silence since live input last moved, on the transport's heard bar
   * (what UIBeat shows) while a run plays, else on the main thread's clock.
   */
  function silentBars(now: number): number {
    const heard = lastLiveBar !== null && running.value ? player?.heardBar() ?? null : null;
    if (heard !== null) return heard - lastLiveBar!;
    return (now - lastLiveActivity) / barMsAt(loopBpm());
  }

  /**
   * While latched, one bar of silence closes the open take; the next note
   * opens another. The beat dots count that bar down as it passes.
   */
  function checkLatch(now = performance.now()): void {
    const take = phrases.take;
    if (!looper.value.latched || openTakeId.value !== take.id) {
      latchCountdown.value = null;
      return;
    }
    if (phrases.isTakeSounding) {
      latchCountdown.value = BEATS_PER_BAR;
      return;
    }
    const silent = silentBars(now);
    // Bars are differences of grid positions: float noise right under a whole bar is the bar.
    if (silent < 1 - 1e-9) {
      // A beat drains as it passes: four left on the bar's first beat, one on its last.
      latchCountdown.value = Math.min(BEATS_PER_BAR, Math.max(1, Math.ceil(BEATS_PER_BAR * (1 - silent) - 1e-9)));
      return;
    }
    // Empty: the take closes, and the dots go back to the beat.
    closeOpenTake();
  }

  /** The latch's take closes (it plays on, filed on its shelf); the desk is a fresh take. */
  function closeOpenTake(): void {
    latchCountdown.value = null;
    openTakeId.value = null;
    phrases.startBlankTake();
  }

  // An edit the phrases store refused on a Loop's pattern (Backspace) says why.
  watch(() => phrases.refusedLoopEdits, () => reportKind("loop-owned"));

  watch(() => phrases.lastLiveNoteId, (id) => {
    if (id && looper.value.latched) growOpenTake();
  });

  // ─── Per member ────────────────────────────────────────────────────────────
  function toggleMemberMute(phraseId: string): void {
    if (!toggleMute(looper.value, phraseId)) return;
    const muted = memberFor(phraseId)!.muted;
    // A member still loading carries the flag in its join.
    if (running.value && player && (joined.has(phraseId) || latestJoin.has(phraseId))) {
      void player.setMember(phraseId, { muted }).catch(report);
    }
  }

  function toggleMemberSolo(phraseId: string): void {
    if (!toggleSolo(looper.value, phraseId)) return;
    if (running.value && player) void player.solo(looper.value.soloId).catch(report);
  }

  function setMemberMuted(phraseId: string, muted: boolean): void {
    if (memberFor(phraseId)?.muted !== muted) toggleMemberMute(phraseId);
  }

  function setSoloTo(phraseId: string | null): void {
    const next = phraseId && memberFor(phraseId) ? phraseId : null;
    if (looper.value.soloId === next) return;
    looper.value.soloId = next;
    if (running.value && player) void player.solo(next).catch(report);
  }

  // ─── Hold to solo (Burooj, 2026-10-19) ─────────────────────────────────────
  // A held dial solos its pattern (unmuted) for as long as it is held. Letting
  // go puts back the solo from before the first hold, and the held pattern's
  // own mute; a mute or unmute tapped on another dial meanwhile is a
  // deliberate act and is kept (the orchestrator's call on review nit 5).
  // Two held dials: the latest holds the solo.
  const heldSolos: string[] = [];
  let beforeHold: { soloId: string | null; heldMuted: Map<string, boolean> } | null = null;

  function holdSolo(phraseId: string): void {
    const member = memberFor(phraseId);
    if (!member) return;
    beforeHold ??= { soloId: looper.value.soloId, heldMuted: new Map() };
    if (!beforeHold.heldMuted.has(phraseId)) beforeHold.heldMuted.set(phraseId, member.muted);
    if (!heldSolos.includes(phraseId)) heldSolos.push(phraseId);
    setMemberMuted(phraseId, false);
    setSoloTo(phraseId);
  }

  function releaseSolo(phraseId: string): void {
    const at = heldSolos.indexOf(phraseId);
    if (at < 0) return;
    heldSolos.splice(at, 1);
    const before = beforeHold!;
    const muted = before.heldMuted.get(phraseId);
    before.heldMuted.delete(phraseId);
    if (muted !== undefined) setMemberMuted(phraseId, muted);
    if (heldSolos.length) {
      // Another dial is still held: it keeps the solo.
      setSoloTo(heldSolos[heldSolos.length - 1]);
      return;
    }
    beforeHold = null;
    setSoloTo(before.soloId);
  }

  function forgetHolds(): void {
    heldSolos.length = 0;
    beforeHold = null;
  }

  /**
   * Bring a playing pattern to the desk, the front of the reel (a Looper Dial
   * double-tap); the Code Strip then follows it.
   */
  function bringToDesk(phraseId: string): boolean {
    if (!memberFor(phraseId)) return false;
    if (phrases.deskPhraseId === phraseId) return true;
    return phrases.openPhrase(phraseId) !== null;
  }

  /**
   * An offset within the member's own cycle (its length at its rate): the
   * transport is phase-based, so this sounds the same, and saved Loops keep
   * small numbers instead of growing ones.
   */
  function wrapOffset(member: PlayingPattern, offsetBars: number): number {
    const cycle = member.lengthBars / member.rate;
    if (!(cycle > 0)) return offsetBars;
    const wrapped = ((offsetBars % cycle) + cycle) % cycle;
    // Float noise right under a whole cycle is the cycle's start.
    return cycle - wrapped < 1e-9 ? 0 : wrapped;
  }

  /**
   * Turn a playing pattern within the loop (kept for the desk's pattern-strip
   * dial, a follow-up; the small Looper Dial's drag is now reserved for volume): move its
   * offset by whole beats from where it is, so a played take keeps its own
   * timing against the beat. Applied at the next render quantum.
   */
  function shiftMember(phraseId: string, beats: number): void {
    const member = memberFor(phraseId);
    if (!member || !Number.isFinite(beats) || !beats) return;
    if (!setOffset(looper.value, phraseId, wrapOffset(member, member.offsetBars + beats / BEATS_PER_BAR))) return;
    const played = playedBars.get(phraseId);
    if (played !== undefined) playedBars.set(phraseId, played + beats / BEATS_PER_BAR);
    if (running.value && player && (joined.has(phraseId) || latestJoin.has(phraseId))) {
      void player.setMember(phraseId, { offsetBars: (looper.value.barOriginBars ?? 0) + member.offsetBars }).catch(report);
    }
  }

  // ─── Ending (BJS-598) ──────────────────────────────────────────────────────
  /** The members the transport sounds now (one still loading has made no sound). */
  function soundingIds(): string[] {
    if (!running.value || !player) return [];
    return looper.value.members.map((member) => member.phraseId).filter((phraseId) => joined.has(phraseId));
  }

  /**
   * Fade sounding members out over a bar, then they leave: they stop being
   * members at once (Play, the reel and Save read them as stopped), and their
   * dials stay, ending, until they have left. The last fade to end stops an
   * empty transport, unless the latch holds its grid.
   */
  function fadeOutMembers(phraseIds: string[], { stopAll = false } = {}): void {
    const current = player!;
    const captured = epoch;
    const fade = ++fadeSerial;
    const endingMs = barMsAt(transportBpm) * FADE_BARS;
    const endsAt = performance.now() + endingMs;
    // The column as it stands, dials already ending included: each fading dial keeps this place.
    void dialViews.value;
    const marked = phraseIds.flatMap((phraseId) => {
      const view = viewFor(phraseId);
      return view ? [{ view: { ...view }, fade, endingMs, endsAt, stopAll }] : [];
    });
    for (const phraseId of phraseIds) {
      forgetMember(phraseId);
      joined.delete(phraseId);
      latestJoin.delete(phraseId);
    }
    ending.value = [...ending.value.filter((entry) => !phraseIds.includes(entry.view.phraseId)), ...marked];
    void current.fadeOut(phraseIds, FADE_BARS).then((receipt) => {
      if (epoch !== captured) return;
      const still = ending.value.filter((entry) => entry.fade === fade);
      // A new run started over the fade (or the pattern came back): what still fades ramps out on its own.
      if (receipt.cancelled && still.length) {
        outliveRun(still);
        return;
      }
      ending.value = ending.value.filter((entry) => entry.fade !== fade);
      stopIfEmpty();
    }, (error) => {
      report(error);
      if (epoch !== captured) return;
      ending.value = ending.value.filter((entry) => entry.fade !== fade);
      stopIfEmpty();
    });
  }

  /**
   * A solo (held or tapped) ends with Stop All, in the transport too: the
   * patterns it silenced are muted first, so the fade stays what was heard,
   * and nothing started meanwhile is silenced by it.
   */
  function endSolo(): void {
    const soloed = looper.value.soloId;
    if (soloed === null || !running.value || !player) return;
    for (const member of looper.value.members) {
      if (member.phraseId === soloed || member.muted || !joined.has(member.phraseId)) continue;
      void player.setMember(member.phraseId, { muted: true }).catch(report);
    }
    void player.solo(null).catch(report);
  }

  /**
   * Stop All (BJS-598): everything fades out over one bar at the loop's tempo,
   * then stops, and nothing joins by itself; the latch and any solo let go at
   * once. Something started during the fade starts its own run at full level.
   * Tapped again while it fades (or with only fading patterns left), it cuts
   * everything at once.
   */
  function stopAll(): void {
    const sounding = stopping.value ? [] : soundingIds();
    if (!sounding.length) {
      cutAll();
      return;
    }
    stopLatchTimer();
    fileOnRelease = null;
    endSolo();
    forgetHolds();
    openTakeId.value = null;
    latchCountdown.value = null;
    looper.value.latched = false;
    fadeOutMembers(sounding, { stopAll: true });
    // Members still loading have made no sound: they are withdrawn, as a leave withdraws them.
    for (const member of [...looper.value.members]) leaveMember(member.phraseId);
    origins.clear();
    playedBars.clear();
    clearLooper(looper.value);
  }

  /**
   * The panic stop: nothing playing or fading, and nothing joining by itself,
   * at once. With patterns fading it is a cut: their notes and every release
   * tail stop in the same 10 ms. Otherwise it is a plain stop, whose release
   * tails ring out.
   */
  function cutAll(): void {
    const cut = ending.value.length > 0;
    stopLatchTimer();
    fileOnRelease = null;
    forgetHolds();
    openTakeId.value = null;
    latchCountdown.value = null;
    origins.clear();
    playedBars.clear();
    clearLooper(looper.value);
    stopTransport({ cut });
  }

  // ─── Saved Loops (rule 4) ──────────────────────────────────────────────────
  /** Saves what is playing as a Loop, named "Loop n" unless a name is given. Its reel exists from then on. */
  function saveLoop(name?: string): string | null {
    const id = saveBookLoop(phrases.book, looper.value, name, Date.now());
    // A take put in a Loop is filed (it plays on): what you play next opens a
    // new take instead of growing the Loop's pattern. A key still held keeps
    // it until that key is let go; then it is filed, once.
    if (id && isPlaying(looper.value, phrases.takeId)) {
      if (phrases.isTakeSounding) fileOnRelease = phrases.takeId;
      else fileTake(phrases.takeId);
    }
    return id;
  }

  /** Close the take (it plays on, filed on its shelf): the desk moves to a fresh one. */
  function fileTake(takeId: string): void {
    if (phrases.takeId !== takeId) return;
    if (openTakeId.value === takeId) openTakeId.value = null;
    phrases.startBlankTake();
  }

  watch(() => phrases.isTakeSounding, (sounding) => {
    if (sounding || fileOnRelease === null) return;
    const takeId = fileOnRelease;
    fileOnRelease = null;
    if (inAnyLoop(takeId)) fileTake(takeId);
  });

  /** Which reel the deck shows: null for the home reel, or a saved Loop's id. */
  function showReel(loopId: string | null): void {
    reelLoopId.value = loopId && phrases.book.loops.some((loop) => loop.id === loopId) ? loopId : null;
  }

  /** A saved Loop's patterns that can still sound (another tab may have taken one away). */
  function presentMembers(loop: Loop): PlayingPattern[] {
    return loop.members.filter((member) => isPresent(member.phraseId));
  }

  function isPresent(phraseId: string): boolean {
    return Boolean(phrases.findPhrase(phraseId)?.notes.length);
  }

  /** Every pattern of the Loop that can still sound is playing (and there is one). */
  function isPresentLoopPlaying(loop: Loop): boolean {
    return isLoopPlaying(looper.value, { ...loop, members: presentMembers(loop) });
  }

  /**
   * Another tab swapped a pointer of a Loop this tab plays (Replace in Loop
   * there; BJS-572). The swap reaches the transport as this tab's own Replace
   * does: the swapped-in pattern joins the running grid at once in its saved
   * place, then the swapped-out one leaves, so the Loop's Stop stops what the
   * Loop now holds and nothing it no longer holds plays on. A pattern that
   * leaves stays if another playing Loop still holds it. A Loop that was not
   * playing here is left alone: its next Play plays what it holds then. This
   * tab's own Replace has already moved the transport, so it is no swap here.
   */
  function followSwap(loopId: string, was: readonly string[], now: readonly string[]): void {
    const out = was.filter((phraseId) => !now.includes(phraseId));
    const into = now.filter((phraseId) => !was.includes(phraseId));
    if (!out.length && !into.length) return;
    const playedBefore = was.filter(isPresent);
    if (!playedBefore.length || !playedBefore.every((phraseId) => isPlaying(looper.value, phraseId))) return;
    const loop = phrases.book.loops.find((candidate) => candidate.id === loopId);
    if (!loop) return;
    const joining = loop.members.filter((member) => into.includes(member.phraseId) && isPresent(member.phraseId));
    if (joining.length) joinSaved(loop, joining);
    for (const phraseId of out) if (!heldByOtherPlayingLoop(loopId, was, phraseId)) leaveMember(phraseId);
  }

  /**
   * Another saved Loop, playing in full here, still holds the pattern, so it
   * plays on for that Loop. Only a Loop with a pattern of its own outside
   * Loop `loopId` (whose patterns were `own`) counts: one whose patterns all
   * lie within it (the same set, or a part of it) plays only because Loop
   * `loopId` does, and goes with it.
   */
  function heldByOtherPlayingLoop(loopId: string, own: readonly string[], phraseId: string): boolean {
    return phrases.book.loops.some((other) => {
      if (other.id === loopId || !other.members.some((member) => member.phraseId === phraseId)) return false;
      const present = presentMembers(other);
      return present.some((member) => !own.includes(member.phraseId)) && isPresentLoopPlaying(other);
    });
  }

  /** Bring saved members into the running session in their saved places (rule 2). */
  function joinSaved(loop: Loop, members: PlayingPattern[]): void {
    lastError.value = null;
    for (const member of joinLoop(looper.value, { ...loop, members }, transportBpm)) {
      origins.delete(member.phraseId);
      playedBars.delete(member.phraseId);
      phrases.markLooped(member.phraseId);
      bringIn(member.phraseId);
    }
  }

  /**
   * A saved Loop's Play, its reel's Play key (BJS-572). With all its patterns
   * playing, they all stop (anything else playing plays on). With nothing
   * playing, the Loop starts from its bar one as it was saved. Otherwise its
   * other patterns join the running bar grid in their saved places (rule 2),
   * so a Loop can come in over what already loops.
   */
  function toggleLoop(id: string): boolean {
    const loop = phrases.book.loops.find((candidate) => candidate.id === id);
    if (!loop?.members.length) return false;
    const members = presentMembers(loop);
    // Judged by the patterns that are there: a missing one cannot hold the Loop on.
    if (isPresentLoopPlaying(loop)) {
      // A pattern another Loop playing in full still holds plays on for that Loop.
      const own = loop.members.map((member) => member.phraseId);
      for (const member of members) if (!heldByOtherPlayingLoop(id, own, member.phraseId)) leaveMember(member.phraseId);
      return true;
    }
    if (!members.length) {
      reportKind("loop-missing");
      return false;
    }
    // With nothing playing (or only patterns fading out, BJS-598) it starts from its own bar one.
    if (runEnding() || (!looper.value.members.length && !running.value && !starting)) {
      const latched = looper.value.latched;
      if (!openLoop(id)) return false;
      // Opening a Loop does not let go of a held latch.
      if (latched) latchOn({ freshDesk: false });
      return true;
    }
    joinSaved(loop, members);
    if (members.length < loop.members.length) reportKind("loop-missing");
    return true;
  }

  /**
   * "Replace in Loop" (BJS-572, rule 3 on a Loop's reel): the desk's pattern
   * takes the place of one of the Loop's, as a pointer swap; neither phrase
   * changes. If the replaced pattern is playing, the replacement sounds in its
   * stead: where it already plays (a take played over the loop joined where it
   * was played), else in the replaced pattern's place. A take is then closed,
   * so nothing more is written into a Loop's pattern from the desk.
   */
  function replaceInLoop(loopId: string, targetId: string, phraseId: string = phrases.deskPhraseId): boolean {
    const loop = phrases.book.loops.find((candidate) => candidate.id === loopId);
    const phrase = phrases.findPhrase(phraseId);
    if (!loop || !phrase) return false;
    const sounding = Boolean(memberFor(targetId));
    // Read before the swap: a playing Loop that shares the replaced pattern keeps it sounding.
    const keepTarget = sounding && heldByOtherPlayingLoop(loopId, loop.members.map((member) => member.phraseId), targetId);
    // Heard in the loop's own frame only when the replaced pattern sounds with it.
    const live = sounding ? memberFor(phraseId) : undefined;
    const placement = live
      ? { offsetBars: live.offsetBars, lengthBars: live.lengthBars, muted: live.muted, pinned: live.pinned, rate: live.rate }
      : {};
    if (!replaceLoopMember(phrases.book, loopId, targetId, phrase, Date.now(), placement)) return false;
    reelFocus.set(loopId, phraseId);
    if (sounding) {
      // In first, then out: the loop never empties, so its clock runs on.
      if (!live) joinSaved(loop, loop.members.filter((member) => member.phraseId === phraseId));
      if (!keepTarget) leaveMember(targetId);
    }
    if (phraseId === phrases.takeId) {
      if (openTakeId.value === phraseId) openTakeId.value = null;
      phrases.startBlankTake();
    }
    return true;
  }

  /**
   * Sets a saved Loop's patterns playing from bar one, replacing what plays.
   * A pattern another tab took away is left out, and the notice says one is
   * missing; the others play in their saved places.
   */
  function openLoop(id: string): boolean {
    const loop = phrases.book.loops.find((candidate) => candidate.id === id);
    if (!loop) return false;
    const present = presentMembers(loop);
    const next = present.length === loop.members.length
      ? openBookLoop(phrases.book, id, phrases.library)
      : openPartial(present);
    if (!next) {
      if (loop.members.length) reportKind("loop-missing");
      return false;
    }
    lastError.value = present.length < loop.members.length ? looperMessage({ kind: "loop-missing" }) : null;
    stopLatchTimer();
    openTakeId.value = null;
    origins.clear();
    playedBars.clear();
    // Patterns fading out ramp out on their own under the new run (BJS-598): their dials stay until then.
    const fading = ending.value;
    stopTransport();
    if (fading.length) {
      ending.value = fading;
      outliveRun(fading);
    }
    looper.value = next;
    const captured = epoch;
    const current = player;
    const order = next.members.map((member) => member.phraseId);
    for (const phraseId of order) intents.set(phraseId, ++intentSerial);
    startingId = order[0] ?? null;
    starting = (async () => {
      try {
        if (!current) throw new LooperNotReady();
        const requests = order.flatMap((phraseId) => {
          const phrase = phrases.findPhrase(phraseId);
          const member = memberFor(phraseId);
          return phrase && member ? [requestFor(phrase, member)] : [];
        });
        transportBpm = loopBpm();
        const asked = startAsked();
        const receipt = await current.start({ bpm: transportBpm, target: asked.target, members: requests });
        if (epoch !== captured || receipt.cancelled) return false;
        running.value = true;
        for (const request of requests) joined.add(request.id);
        settleStarted(requests, current, asked);
        // Members left while the banks loaded.
        for (const request of requests) {
          if (!intents.has(request.id)) {
            joined.delete(request.id);
            void current.leave(request.id).catch(report);
          }
        }
        return true;
      } catch (error) {
        if (epoch === captured) {
          report(error);
          abandon();
        }
        return false;
      } finally {
        if (epoch === captured) {
          starting = null;
          startingId = null;
        }
      }
    })();
    return true;
  }

  /** The Loop's present patterns from its bar one, at the first one's tempo (as `openBookLoop`). */
  function openPartial(present: PlayingPattern[]): Looper | null {
    const first = present[0] && phrases.findPhrase(present[0].phraseId);
    if (!first) return null;
    const next = createLooper();
    joinLoop(next, { id: "", name: "", members: present, createdAt: 0, updatedAt: 0 }, first.context.bpm);
    return next;
  }

  function deleteLoop(id: string): boolean {
    return deleteBookLoop(phrases.book, id);
  }

  // ─── Bending, tempo and stale tables ───────────────────────────────────────
  /** Members whose phrase changed since their table was built rebuild now (policy A). */
  function refreshStale(): void {
    for (const phraseId of [...joined]) {
      const phrase = phrases.findPhrase(phraseId);
      if (phrase && builtFrom.get(phraseId) !== signature(phrase)) rejoin(phraseId);
    }
  }

  watch([() => music.currentKey, () => music.currentMode], ([key, mode]) => {
    if (!running.value || !player) return;
    void player.bend({ key: key as ChromaticNote, mode: mode as MusicalMode }).catch(report);
    refreshStale();
  });

  watch(() => visualConfig.config.codeStrip.bpm, (bpm) => {
    if (!running.value || !player) return;
    const next = resolveBpm(bpm);
    if (next === transportBpm && next === (looper.value.bpm ?? next)) return;
    transportBpm = next;
    if (looper.value.members.length) looper.value.bpm = next;
    void player.setTempo(next).catch(report);
    refreshStale();
  });

  watch([() => keyboard.keyboardConfig.mainOctave, () => instrument.currentInstrument], () => {
    if (running.value) refreshStale();
  });

  // Stage labels carry the solfège convention, fixed per table.
  watch(() => visualConfig.laBasedMinor, () => {
    if (running.value) for (const phraseId of [...joined]) rejoin(phraseId);
  });

  // Policy B: every edit of a playing phrase swaps its table at once.
  const memberSignatures = computed(() => looper.value.members.map((member) => {
    const phrase = phrases.findPhrase(member.phraseId);
    return phrase ? `${member.phraseId}#${signature(phrase)}` : member.phraseId;
  }).join("\n"));
  watch(memberSignatures, () => {
    if (swapPolicy.value === "every-change" && running.value) refreshStale();
  });

  // ─── Recorder seams ────────────────────────────────────────────────────────
  // Rule 3, decided at press time: a playing desk pattern is read-only (the
  // latch's growing take aside). A pattern any saved Loop points at is
  // read-only on every reel, playing or not; the phrases store asks that
  // itself (`isLoopOwned`), so a new press opens a new take on top. Keys
  // already down when a take went into a Loop finish sounding into it (a
  // release lands in the take its press did), and it is filed when they let go.
  phrases.setLivePressGuard(({ deskPhraseId }) =>
    deskPhraseId !== openTakeId.value && mustOpenFreshTake(looper.value, deskPhraseId));
  // What this tab is playing is never purged, deleted, released or dropped by
  // a merge. Saved Loops protect their own members from the book itself
  // (retention, delete, release and the take's close read `book.loops`), so
  // a Loop another tab deleted lets its member go here too (BJS-575).
  phrases.setProtectedIds(() => playingPhraseIds(looper.value));

  // Registered after the phrases store's own listener, so the press has
  // already landed in its take when its audio time is recorded against it.
  const isLive = (detail: { noteId?: string; record?: boolean; source?: string } | undefined) =>
    Boolean(detail?.noteId) && detail!.record !== false && !NON_LIVE_SOURCES.has(detail!.source ?? "");
  const onNoteReleased = (event: Event) => {
    if (isLive((event as CustomEvent).detail)) liveActivity();
  };
  const onNotePlayed = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (!isLive(detail)) return;
    liveActivity();
    // A note before the closing bar ends refills the dots at once (only while latched).
    if (looper.value.latched && latchCountdown.value !== null) latchCountdown.value = BEATS_PER_BAR;
    const wallTime = Number.isFinite(detail.timestamp) ? detail.timestamp : Date.now();
    let audioTime: number;
    try {
      // The attack's own audio time when the live path sends it; otherwise its
      // heard time, read in the event's own task, gives it back; otherwise the
      // event is the attack, now, on the same audio clock.
      const context = getAudioContext();
      audioTime = Number.isFinite(detail.audioTime) ? detail.audioTime
        : Number.isFinite(detail.audibleAt) ? outputTimeToAudioTime(context, detail.audibleAt)
          : context.currentTime;
    } catch {
      return;
    }
    if (Number.isFinite(audioTime)) lastAttack = { takeId: phrases.takeId, wallTime, audioTime };
  };
  if (typeof window !== "undefined") {
    window.addEventListener("note-played", onNotePlayed);
    window.addEventListener("note-released", onNoteReleased);
  }

  /** Detach from the window, the recorder and the player (tests, HMR). */
  function dispose(): void {
    cutAll();
    if (typeof window !== "undefined") {
      window.removeEventListener("note-played", onNotePlayed);
      window.removeEventListener("note-released", onNoteReleased);
    }
    phrases.setLivePressGuard(null);
    phrases.setProtectedIds(null);
    stopWatchingPlayer();
    stopInterrupted?.();
    stopInterrupted = undefined;
    stopRecoveryWatch?.();
    stopRecoveryWatch = undefined;
    player = undefined;
    playerReady.value = false;
  }

  // ─── What the surfaces draw ────────────────────────────────────────────────
  function labelFor(phrase: Phrase): string {
    return phrase.name
      ?? (phrase.shelf === "library" ? phrases.book.libraryNames[phrase.id] : undefined)
      ?? (phrase.number ? `Take ${phrase.number}` : phrase.derivedFrom?.name ?? "Pattern");
  }

  const memberViews = computed<LooperMemberView[]>(() => looper.value.members.flatMap((member) => {
    const phrase = phrases.findPhrase(member.phraseId);
    if (!phrase) return [];
    const target = effectiveKeyMode(member, phrase, { key: liveKey(), mode: liveMode() });
    const recorded = { key: phrase.context.key, mode: phrase.context.mode };
    const bent = target.key !== recorded.key || target.mode !== recorded.mode;
    return [{
      phraseId: member.phraseId,
      label: labelFor(phrase),
      notes: bent ? bendNotes(phrase.notes, recorded, target) : phrase.notes,
      key: target.key,
      mode: target.mode,
      lengthBars: member.lengthBars,
      originBars: (looper.value.barOriginBars ?? 0) + member.offsetBars,
      rate: member.rate,
      phraseBarMs: barMsAt(phrase.context.bpm),
      muted: member.muted,
      audible: !member.muted && (looper.value.soloId === null || looper.value.soloId === member.phraseId),
      soloed: looper.value.soloId === member.phraseId,
      open: member.phraseId === openTakeId.value,
    }];
  }));

  function viewFor(phraseId: string): LooperMemberView | undefined {
    return memberViews.value.find((view) => view.phraseId === phraseId);
  }

  /**
   * The column's order: each dial keeps its place while it plays and while it
   * fades (BJS-598), however many fade at once and in whatever order they go;
   * a new member comes in at the end.
   */
  let columnOrder: string[] = [];
  /** The dial column: the members, and each fading pattern where its dial was. */
  const dialViews = computed<LooperDialView[]>(() => {
    const dials = new Map<string, LooperDialView>();
    for (const view of memberViews.value) dials.set(view.phraseId, { ...view, ending: false, endingMs: 0 });
    for (const entry of ending.value) {
      if (!dials.has(entry.view.phraseId)) dials.set(entry.view.phraseId, { ...entry.view, ending: true, endingMs: entry.endingMs });
    }
    columnOrder = columnOrder.filter((phraseId) => dials.has(phraseId));
    for (const phraseId of dials.keys()) if (!columnOrder.includes(phraseId)) columnOrder.push(phraseId);
    return columnOrder.map((phraseId) => dials.get(phraseId)!);
  });

  return {
    // State
    looper,
    members,
    memberViews,
    dialViews,
    stopping,
    hasMembers,
    running,
    latched,
    soloId,
    openTakeId,
    latchCountdown,
    isDeskPlaying,
    isPlayPlaying,
    deskMemberId,
    engineReady,
    loops,
    reelLoopId,
    reelLoop,
    isReelLoopPlaying,
    canSaveLoop,
    replaceTarget,
    lastError,
    swapPolicy,

    // Queries
    memberFor,
    viewFor,

    // Actions
    togglePlay,
    toggleLatch,
    checkLatch,
    toggleMute: toggleMemberMute,
    toggleSolo: toggleMemberSolo,
    holdSolo,
    releaseSolo,
    bringToDesk,
    shiftMember,
    removeMember: leaveMember,
    stopAll,
    cutAll,
    clearError,
    saveLoop,
    openLoop,
    toggleLoop,
    replaceInLoop,
    showReel,
    deleteLoop,
    dispose,

    /** For tests: resolves once a start in flight has settled. */
    settled: async () => { await starting; },
  };
});
