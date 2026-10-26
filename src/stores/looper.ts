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
  /** Every pattern of the Loop whose reel shows is playing. */
  const isReelLoopPlaying = computed(() => Boolean(reelLoop.value && isLoopPlaying(looper.value, reelLoop.value)));
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
  /** On a Loop's reel its patterns are read-only from the desk (rule 3): Loops hold pointers. */
  const isReelMember = (phraseId: string) => Boolean(reelLoop.value?.members.some((member) => member.phraseId === phraseId));
  watch([reelLoop, () => phrases.deskPhraseId], ([loop, desk]) => {
    if (loop && isReelMember(desk)) reelFocus.set(loop.id, desk);
  }, { immediate: true });
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

  function stopTransport() {
    resetSession();
    player?.stop();
  }

  /** The loop emptied: the transport stops, unless the latch keeps its grid running. */
  function stopIfEmpty(): boolean {
    if (looper.value.members.length || looper.value.latched) return false;
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
  function bringIn(phraseId: string) {
    const token = ++intentSerial;
    intents.set(phraseId, token);
    if (!running.value && !starting) startSession(phraseId, token);
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
        const receipt = await current.start({
          bpm: transportBpm,
          target: { key: liveKey(), mode: liveMode() },
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
        settleStarted([sent], current);
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
  function settleStarted(sent: readonly LooperMemberRequest[], current: PatternPlayer) {
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
    // The knob shows the loop's tempo; turning it bends the loop from here on.
    if (liveBpm() !== loopBpm()) visualConfig.updateConfig("codeStrip", { bpm: loopBpm() });
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
    // A first take's bar one is its own first note; a later one is placed when it joins.
    const member = join(looper.value, phrase, originAudio === null
      ? { kind: "pinned-to-bar-one" }
      : { kind: "played", phraseOriginBars: first ? 0 : (looper.value.barOriginBars ?? 0) });
    // Joining the latch's grid: it set the tempo, and its bar 0 is bar one.
    if (first && (running.value || starting)) looper.value.bpm = transportBpm;
    member.lengthBars = loopLengthBars(phrase);
    // Looping is deliberate: the take is kept even after it stops playing.
    phrases.markLooped(phrase.id);
    bringIn(phrase.id);
  }

  function leaveMember(phraseId: string): void {
    if (heldSolos.includes(phraseId)) releaseSolo(phraseId);
    if (!leave(looper.value, phraseId)) return;
    intents.delete(phraseId);
    origins.delete(phraseId);
    playedBars.delete(phraseId);
    builtFrom.delete(phraseId);
    if (openTakeId.value === phraseId) openTakeId.value = null;
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
    // Tapping Play while a latched take grows closes it; it keeps playing.
    if (openTakeId.value && openTakeId.value === take.id) {
      openTakeId.value = null;
      return;
    }
    // On a Loop's reel, Play is the Loop's: its patterns start, or stop, together.
    if (reelLoop.value) {
      toggleLoop(reelLoop.value.id);
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
    // An empty grid goes with the latch that started it.
    if (!looper.value.members.length && (running.value || starting)) stopTransport();
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
    latchCountdown.value = null;
    openTakeId.value = null;
    phrases.startBlankTake();
  }

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

  /** Stop All: nothing playing, and nothing joining by itself. */
  function stopAll(): void {
    stopLatchTimer();
    forgetHolds();
    openTakeId.value = null;
    latchCountdown.value = null;
    origins.clear();
    playedBars.clear();
    clearLooper(looper.value);
    stopTransport();
  }

  // ─── Saved Loops (rule 4) ──────────────────────────────────────────────────
  /** Saves what is playing as a Loop, named "Loop n" unless a name is given. Its reel exists from then on. */
  function saveLoop(name?: string): string | null {
    const id = saveBookLoop(phrases.book, looper.value, name, Date.now());
    // A take put in a Loop is filed (it plays on): what you play next opens a
    // new take instead of growing the Loop's pattern. A key still held keeps it.
    if (id && isPlaying(looper.value, phrases.takeId) && !phrases.isTakeSounding) {
      if (openTakeId.value === phrases.takeId) openTakeId.value = null;
      phrases.startBlankTake();
    }
    return id;
  }

  /** Which reel the deck shows: null for the home reel, or a saved Loop's id. */
  function showReel(loopId: string | null): void {
    reelLoopId.value = loopId && phrases.book.loops.some((loop) => loop.id === loopId) ? loopId : null;
  }

  /** A saved Loop's patterns that can still sound (another tab may have taken one away). */
  function presentMembers(loop: Loop): PlayingPattern[] {
    return loop.members.filter((member) => phrases.findPhrase(member.phraseId)?.notes.length);
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
    if (isLoopPlaying(looper.value, loop)) {
      for (const member of loop.members) leaveMember(member.phraseId);
      return true;
    }
    if (!looper.value.members.length && !running.value && !starting) {
      const latched = looper.value.latched;
      if (!openLoop(id)) return false;
      // Opening a Loop does not let go of a held latch.
      if (latched) latchOn({ freshDesk: false });
      return true;
    }
    const members = presentMembers(loop);
    if (!members.length) return false;
    joinSaved(loop, members);
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
      leaveMember(targetId);
    }
    if (phraseId === phrases.takeId) {
      if (openTakeId.value === phraseId) openTakeId.value = null;
      phrases.startBlankTake();
    }
    return true;
  }

  /** Sets a saved Loop's patterns playing from bar one, replacing what plays. */
  function openLoop(id: string): boolean {
    const next = openBookLoop(phrases.book, id, phrases.library);
    if (!next) return false;
    stopLatchTimer();
    openTakeId.value = null;
    origins.clear();
    playedBars.clear();
    stopTransport();
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
        const receipt = await current.start({ bpm: transportBpm, target: { key: liveKey(), mode: liveMode() }, members: requests });
        if (epoch !== captured || receipt.cancelled) return false;
        running.value = true;
        for (const request of requests) joined.add(request.id);
        settleStarted(requests, current);
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
  // Rule 3, decided at press time: a playing desk pattern is read-only, and so
  // is a Loop's pattern on that Loop's reel (a new take opens on top of it).
  phrases.setLivePressGuard(({ deskPhraseId }) =>
    deskPhraseId !== openTakeId.value
      && (mustOpenFreshTake(looper.value, deskPhraseId) || isReelMember(deskPhraseId)));
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
    stopAll();
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

  return {
    // State
    looper,
    members,
    memberViews,
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
