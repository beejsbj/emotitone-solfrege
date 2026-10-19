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
import { bendNotes } from "@/domain/modeRemap";
import { resolveBpm } from "@/domain/phraseBook";
import { getAudioContext } from "@/services/audioRuntime";
import { outputTimeToAudioTime } from "@/services/liveAudioTiming";
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
import type { Looper, PlayingPattern } from "@/types/looper";
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

const LATCH_POLL_MS = 100;
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
  /** The transport is running a Looper session. */
  const running = ref(false);
  const lastError = ref<string | null>(null);
  /** Members the transport holds, by phrase id. */
  const joined = reactive(new Set<string>());
  const swapPolicy = ref<TakeSwapPolicy>(readSwapPolicy());

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
  /** Where each played take's phrase time 0 sounded, in AudioContext seconds. */
  const origins = new Map<string, number>();
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

  function report(error: unknown) {
    lastError.value = error instanceof Error ? error.message : String(error);
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
    stopInterrupted = player?.onInterrupted((error) => {
      if (!looper.value.members.length && !starting) return;
      report(error);
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
  /**
   * Play can start: the pattern player is there, the audio engine has booted,
   * and no rebuilt renderer is being restored (Burooj, 2026-10-19: "play
   * shouldn't be startable if engine isn't started").
   */
  const engineReady = computed(() => playerReady.value && !engineRecovering.value && !instrument.isInitializing);

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
    origins.clear();
    clearLooper(looper.value);
    stopLatchTimer();
  }

  function stopTransport() {
    resetSession();
    player?.stop();
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
        if (!current) throw new Error("The pattern player is not ready");
        if (!phrase || !member) return false;
        const origin = origins.get(phraseId);
        const sent = requestFor(phrase, member);
        const receipt = await current.start({
          bpm: loopBpm(),
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
          report(error);
          // Nothing started: every member waiting on this start is gone too.
          const keepLatch = looper.value.latched;
          abandon();
          if (keepLatch) toggleLatch();
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

  /** After a start: what was tapped while its banks loaded (mute, solo) reaches the transport. */
  function settleStarted(sent: readonly LooperMemberRequest[], current: PatternPlayer) {
    for (const request of sent) {
      const member = memberFor(request.id);
      if (member && member.muted !== request.muted) void current.setMember(request.id, { muted: member.muted }).catch(report);
    }
    if (looper.value.soloId) void current.solo(looper.value.soloId).catch(report);
    // The knob shows the loop's tempo; turning it bends the loop from here on.
    if (liveBpm() !== loopBpm()) visualConfig.updateConfig("codeStrip", { bpm: loopBpm() });
  }

  async function joinRunning(phraseId: string, token: number) {
    const captured = epoch;
    const stale = () => epoch !== captured || intents.get(phraseId) !== token;
    if (starting && !(await starting)) return;
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
        // A latched take is no longer the open one, so "Tap Play again" joins it.
        if (openTakeId.value === phraseId) openTakeId.value = null;
        report(new Error("Audio is restarting, so this take could not join where you played it. Tap Play again."));
        return;
      }
      setOffset(looper.value, phraseId, bar - (looper.value.barOriginBars ?? 0));
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
        if (!looper.value.members.length) stopTransport();
        return;
      }
      joined.add(phrase.id);
    } catch (error) {
      if (epoch !== captured || intents.get(phrase.id) !== token || latestJoin.get(phrase.id) !== serial) return;
      report(error);
      // A refused bank never sounds: the pattern is not playing.
      if (!joined.has(phrase.id)) {
        leave(looper.value, phrase.id);
        intents.delete(phrase.id);
        if (!looper.value.members.length) stopTransport();
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
    if (originAudio === null) origins.delete(phrase.id);
    else origins.set(phrase.id, originAudio);
    const first = !looper.value.members.length;
    // A first take's bar one is its own first note; a later one is placed when it joins.
    const member = join(looper.value, phrase, originAudio === null
      ? { kind: "pinned-to-bar-one" }
      : { kind: "played", phraseOriginBars: first ? 0 : (looper.value.barOriginBars ?? 0) });
    member.lengthBars = loopLengthBars(phrase);
    // Looping is deliberate: the take is kept even after it stops playing.
    phrases.markLooped(phrase.id);
    bringIn(phrase.id);
  }

  function leaveMember(phraseId: string): void {
    if (!leave(looper.value, phraseId)) return;
    intents.delete(phraseId);
    origins.delete(phraseId);
    builtFrom.delete(phraseId);
    if (openTakeId.value === phraseId) openTakeId.value = null;
    if (!looper.value.members.length) {
      stopTransport();
      return;
    }
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
    looper.value.latched = !looper.value.latched;
    stopLatchTimer();
    if (looper.value.latched) latchTimer = setInterval(() => checkLatch(), LATCH_POLL_MS);
    else openTakeId.value = null;
  }

  /** Each note that lands joins the open take, so it sounds from the next lap. */
  function growOpenTake(): void {
    const take = phrases.take;
    const origin = takeOrigin(take.id);
    if (origin === null || !take.notes.length) return;
    if (openTakeId.value !== take.id) {
      if (isPlaying(looper.value, take.id)) return;
      openTakeId.value = take.id;
      joinPhrase(take, origin);
      return;
    }
    const member = memberFor(take.id);
    if (!member) return;
    member.lengthBars = loopLengthBars(take);
    rejoin(take.id);
  }

  /**
   * When live input last moved, on the main thread's own clock. Note stamps
   * are on the audio clock, whose wall anchor drifts from `performance.now()`.
   */
  let lastLiveActivity = 0;

  /** While latched, one bar of silence closes the open take; the next note opens another. */
  function checkLatch(now = performance.now()): void {
    const take = phrases.take;
    if (!looper.value.latched || openTakeId.value !== take.id || phrases.isTakeSounding) return;
    if (now - lastLiveActivity < barMsAt(loopBpm())) return;
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

  /** Stop All: nothing playing, and nothing joining by itself. */
  function stopAll(): void {
    stopLatchTimer();
    openTakeId.value = null;
    origins.clear();
    clearLooper(looper.value);
    stopTransport();
  }

  // ─── Saved Loops (rule 4) ──────────────────────────────────────────────────
  function saveLoop(name: string): string | null {
    return saveBookLoop(phrases.book, looper.value, name, Date.now());
  }

  /** Sets a saved Loop's patterns playing from bar one, replacing what plays. */
  function openLoop(id: string): boolean {
    const next = openBookLoop(phrases.book, id, phrases.library);
    if (!next) return false;
    stopLatchTimer();
    openTakeId.value = null;
    origins.clear();
    stopTransport();
    looper.value = next;
    const captured = epoch;
    const current = player;
    const order = next.members.map((member) => member.phraseId);
    for (const phraseId of order) intents.set(phraseId, ++intentSerial);
    startingId = order[0] ?? null;
    starting = (async () => {
      try {
        if (!current) throw new Error("The pattern player is not ready");
        const requests = order.flatMap((phraseId) => {
          const phrase = phrases.findPhrase(phraseId);
          const member = memberFor(phraseId);
          return phrase && member ? [requestFor(phrase, member)] : [];
        });
        const receipt = await current.start({ bpm: loopBpm(), target: { key: liveKey(), mode: liveMode() }, members: requests });
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
    if (next === looper.value.bpm) return;
    looper.value.bpm = next;
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
  // Rule 3, decided at press time: a playing desk pattern is read-only.
  phrases.setLivePressGuard(({ deskPhraseId }) =>
    deskPhraseId !== openTakeId.value && mustOpenFreshTake(looper.value, deskPhraseId));
  // Retention: a playing or saved-Loop phrase is never purged.
  phrases.setProtectedIds(() => protectedPhraseIds(phrases.book, looper.value));

  // Registered after the phrases store's own listener, so the press has
  // already landed in its take when its audio time is recorded against it.
  const isLive = (detail: { noteId?: string; record?: boolean; source?: string } | undefined) =>
    Boolean(detail?.noteId) && detail!.record !== false && !NON_LIVE_SOURCES.has(detail!.source ?? "");
  const onNoteReleased = (event: Event) => {
    if (isLive((event as CustomEvent).detail)) lastLiveActivity = performance.now();
  };
  const onNotePlayed = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (!isLive(detail)) return;
    lastLiveActivity = performance.now();
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
    isDeskPlaying,
    deskMemberId,
    engineReady,
    loops,
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
    removeMember: leaveMember,
    stopAll,
    clearError,
    saveLoop,
    openLoop,
    deleteLoop,
    dispose,

    /** For tests: resolves once a start in flight has settled. */
    settled: async () => { await starting; },
  };
});
