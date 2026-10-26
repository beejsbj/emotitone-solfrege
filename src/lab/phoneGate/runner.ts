/**
 * The phone gate run (BJS-494), on the real worklet engine in the phone's own
 * browser: the app's AudioContext and graph, the sampled piano prepared into
 * the worklet, the production pattern player running a four-member Looper,
 * live notes pressed straight into the worklet on top, and the real Stage
 * drawing behind the page. Nothing here is mocked; the calculations it feeds
 * are pure and tested on their own (metrics, ledger, oracle, report).
 *
 * The one tap that starts it is the gesture that unlocks audio. The automatic
 * part (load, then a twelve-bar soak) needs no further touch; the guided steps
 * that follow need Burooj's hands and ears: dial taps, pad taps, a route
 * change, and two yes/no answers.
 */
import { reactive, watch } from "vue";
import { summarizeRenderCost } from "@/audio/live/renderCost";
import { readTransportEvents, TransportEventKind, type DecodedTransportEvent } from "@/audio/live/transportEvents";
import { VOICE_RETIRE_SECONDS } from "@/audio/voicePolicy";
import type { LiveVoiceEvent } from "@/audio/liveRenderer";
import { holdAudioActivity, resumeAudioContext } from "@/services/audioLifecycle";
import { audioTimeToOutputTime } from "@/services/liveAudioTiming";
import { resolveLiveSoundName } from "@/services/liveInstrumentNames";
import {
  getLivePlayback, getLivePlaybackDiagnostics, getLivePlaybackFailure, prepareLivePlayback, readLiveRenderCost,
  subscribeLivePlayback,
} from "@/services/livePlayback";
import {
  createPatternPlayer, PATTERN_PLAYBACK_SOURCE, setProductionPatternPlayer, type PatternPlayer,
} from "@/services/patternTransport";
import { getAudioContext, getSuperdoughMasterGain, initSuperdoughAudio } from "@/services/superdoughAudio";
import { GATE_BEAT_MS, GATE_BPM, GATE_INSTRUMENT, GATE_MEMBER_LABELS, gateMembers, gateTables } from "./fixtures";
import { createAttackLedger, createLightLedger, createSoakAccount } from "./ledger";
import {
  createClockSlipMeter, describeUserAgent, playbackStatsDelta, readJsMemory, readPlaybackStats, summarizeFrames,
  freshOutputTimeMs, tallyMuteTap, tallySoloHold,
} from "./metrics";
import { expectedOnsets } from "./oracle";
import { formatGateSummary, MUTE_TAPS, SOLO_HOLDS, type GateResults } from "./report";
import { measureResume } from "./resume";
import { createRouteLog } from "./route";

export type GatePhase = "idle" | "loading" | "soak" | "ear" | "dials" | "tap" | "resume" | "route" | "done";

/** The soak window: bars [1, 13), after a bar to settle. */
export const SOAK_FROM_BAR = 1;
export const SOAK_BARS = 12;
export { MUTE_TAPS, SOLO_HOLDS };
export const PAD_TAPS = 10;
const PAUSE_MS = 5000;
const FADE_MS = VOICE_RETIRE_SECONDS * 1000;
/** How long a Stop waits for the worklet to answer a render-cost read (ms). */
const STOP_COST_READ_MS = 500;

export interface GateDial { id: string; label: string; muted: boolean; soloed: boolean }

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** An input event's time on the performance clock, or now when the browser's stamp is unusable. */
export function eventTime(event: Event | undefined, now = performance.now()): number {
  const stamp = event?.timeStamp;
  return typeof stamp === "number" && stamp > 0 && stamp <= now + 1 && now - stamp < 2000 ? stamp : now;
}

function environment(context: AudioContext | undefined): GateResults["environment"] {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const seconds = (value: number | undefined) => typeof value === "number" && Number.isFinite(value) ? value * 1000 : null;
  return {
    ...describeUserAgent(nav.userAgent, nav.maxTouchPoints ?? 0),
    userAgent: nav.userAgent,
    sampleRate: context?.sampleRate ?? null,
    baseLatencyMs: seconds(context?.baseLatency),
    outputLatencyMs: seconds(context?.outputLatency),
    devicePixelRatio: typeof window.devicePixelRatio === "number" ? window.devicePixelRatio : null,
    cores: typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null,
    deviceMemoryGb: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
  };
}

export function createPhoneGate() {
  const results: GateResults = reactive({
    startedAt: new Date().toISOString(),
    url: typeof location === "undefined" ? "" : location.href,
    // Literal access: vite.config.ts `define` replaces this exact expression.
    build: import.meta.env.VITE_COMMIT_SHA?.slice(0, 8) || null,
    environment: environment(undefined),
    bpm: GATE_BPM,
  });
  const state = reactive({
    phase: "idle" as GatePhase,
    status: "",
    progress: 0,
    dials: [] as GateDial[],
    muteTaps: 0,
    soloHolds: 0,
    padTaps: 0,
    needsResumeTap: false,
    routeObservations: [] as string[],
    /** Loop notes announced in the last two seconds (the route step's liveness). */
    loopAlive: 0,
    summary: "",
    results,
  });

  const instrumentId = resolveLiveSoundName(GATE_INSTRUMENT);
  const members = gateMembers();
  const tables = gateTables(members, instrumentId);
  let context: AudioContext | undefined;
  let player: PatternPlayer | undefined;
  let stopped = false;
  const cleanups: (() => void)[] = [];
  /** Transport records go to whichever recorders are listening. */
  const recorders = new Set<(event: DecodedTransportEvent) => void>();
  const generations = new Map<number, string>();
  const memberOf = (generation: number) => {
    if (!generations.has(generation)) {
      for (const member of player?.getLooper().members ?? []) {
        if (member.generation !== null) generations.set(member.generation, member.id);
      }
    }
    return generations.get(generation);
  };
  /** Live owners awaiting their first attack: when it was pressed, and whether its latency counts. */
  const livePending = new Map<string, { at: number; timed: boolean }>();
  const live = { pressed: 0, sounded: 0 };
  const tapSamples: number[] = [];
  let liveSerial = 0;
  let resumeTap: (() => void) | undefined;
  let routeAnswer: ((works: boolean | null) => void) | undefined;
  let earAnswer: ((heard: boolean | null) => void) | undefined;
  let advance: (() => void) | undefined;
  /** Publishes what the step in progress has measured; a Stop calls it before the summary is written. */
  let captureStep: (() => void) | undefined;
  /** The soak's render-cost read, awaited (briefly) by a Stop before the summary is written. */
  let captureCost: (() => Promise<boolean>) | undefined;
  let finishing = false;
  const lastLift = new Map<string, number>();
  const loopAttackTimes: number[] = [];

  function check() { if (stopped) throw new Error("Stopped"); }

  function onLiveEvent(event: LiveVoiceEvent) {
    if (event.phase !== "attack") return;
    const pending = livePending.get(event.ownerId);
    if (!pending) return;
    livePending.delete(event.ownerId);
    live.sounded++;
    results.live = { ...live };
    if (pending.timed && context) {
      tapSamples.push(audioTimeToOutputTime(context, event.at) - pending.at);
      results.tapToSound = [...tapSamples];
    }
  }

  function onRecord(event: DecodedTransportEvent) {
    if (event.kind === TransportEventKind.Attack && state.phase === "route") loopAttackTimes.push(performance.now());
    for (const record of recorders) record(event);
  }

  /** Press a live note straight into the worklet, as a key's input voice group does. */
  function pressLive(ownerId: string, pitches: number[], at: number, timed: boolean) {
    live.pressed += pitches.length;
    results.live = { ...live };
    const renderer = getLivePlayback(instrumentId);
    if (!renderer) return;
    // One pending entry per owner: a chord counts each of its notes as it sounds.
    for (let index = 0; index < pitches.length; index++) livePending.set(index ? `${ownerId}#${index}` : ownerId, { at, timed: timed && !index });
    pitches.forEach((pitch, index) => renderer.press(index ? `${ownerId}#${index}` : ownerId, [{ pitch, instrumentId, velocity: .6 }]));
  }

  function releaseLive(ownerId: string, notes = 1) {
    const renderer = getLivePlayback(instrumentId);
    for (let index = 0; index < notes; index++) renderer?.release(index ? `${ownerId}#${index}` : ownerId);
  }

  /**
   * Follow which rendered loop notes reach the Stage. Each record's note end is
   * read on the output clock in the same task the pattern player decodes it,
   * so a note it drops as already ended is seen the way the player saw it.
   * The window is chosen when it is read: a resume's is known only afterwards.
   */
  function watchLights(audio: AudioContext) {
    const records: { event: DecodedTransportEvent; endLeadMs: number }[] = [];
    const lit: { serial: number; leadMs: number }[] = [];
    const record = (event: DecodedTransportEvent) => {
      const endLeadMs = event.kind === TransportEventKind.Attack || event.kind === TransportEventKind.Active
        ? audioTimeToOutputTime(audio, (event.frame + event.length) / audio.sampleRate) - performance.now() : 0;
      records.push({ event: { ...event }, endLeadMs });
    };
    const onPlayed = (event: Event) => {
      const detail = (event as CustomEvent).detail as { source?: string; noteId?: string; audibleAt?: number } | undefined;
      if (detail?.source !== PATTERN_PLAYBACK_SOURCE || typeof detail.noteId !== "string") return;
      const serial = Number(detail.noteId.slice(detail.noteId.lastIndexOf("-") + 1));
      lit.push({ serial, leadMs: typeof detail.audibleAt === "number" ? detail.audibleAt - performance.now() : Number.NaN });
    };
    recorders.add(record);
    window.addEventListener("note-played", onPlayed);
    const stop = () => { recorders.delete(record); window.removeEventListener("note-played", onPlayed); };
    cleanups.push(stop);
    return {
      stop,
      result(fromBar: number, toBar: number, staleMs: number) {
        const ledger = createLightLedger({ memberOf, fromBar, toBar, staleMs });
        for (const entry of records) ledger.record(entry.event, entry.endLeadMs);
        for (const entry of lit) ledger.lit(entry.serial, entry.leadMs);
        return ledger.result();
      },
    };
  }

  /** Resolves once the rendered (not heard) bar reaches `bar`. */
  async function untilBar(bar: number, onProgress?: (bar: number) => void) {
    const deadline = performance.now() + Math.max(10000, (bar + 2) * GATE_BEAT_MS * 4 * 2);
    for (;;) {
      check();
      const now = context && player?.barAtAudioTime(context.currentTime);
      if (typeof now === "number") {
        onProgress?.(now);
        if (now >= bar) return;
      }
      if (performance.now() > deadline) throw new Error(`The loop did not reach bar ${bar} (audio ${context?.state ?? "missing"})`);
      await sleep(50);
    }
  }

  function readBank() {
    const diagnostics = getLivePlaybackDiagnostics(instrumentId);
    return {
      installedPcmBytes: diagnostics.installedPcmBytes,
      sourcePcmBytes: diagnostics.installedSourcePcmBytes,
      derivedPcmBytes: diagnostics.installedDerivedPcmBytes,
      budgetBytes: diagnostics.installedPcmBudgetBytes,
      preparationPcmBytes: diagnostics.cachedPreparationPcmBytes + diagnostics.preparingPcmBytes,
    };
  }

  // ─── The automatic part ────────────────────────────────────────────────────

  /** Call from the Run tap's handler, synchronously: the tap unlocks audio. */
  function run() {
    if (state.phase !== "idle") return;
    context = getAudioContext();
    const unlocked = resumeAudioContext(context);
    state.phase = "loading";
    state.status = "Loading the piano into the worklet…";
    void automatic(unlocked).catch(error => {
      if (stopped) return;
      results.error = error instanceof Error ? error.message : String(error);
      void finish();
    });
  }

  async function automatic(unlocked: Promise<void> | undefined) {
    const audio = context!;
    // The idle manager suspends a context silent for 30 s; a slow piano download
    // must not, or the loop could not start without another gesture. The
    // player holds its own lease once it starts.
    const releaseLoad = holdAudioActivity();
    cleanups.push(releaseLoad);
    const idle = readJsMemory();
    await unlocked;
    check();
    results.environment = environment(audio);
    // Peak JS heap while the bank decodes (Chrome only).
    let peak = idle.usedBytes;
    const peakTimer = setInterval(() => {
      const used = readJsMemory().usedBytes;
      if (used !== null && (peak === null || used > peak)) peak = used;
    }, 100);
    cleanups.push(() => clearInterval(peakTimer));
    const loadStart = performance.now();
    await initSuperdoughAudio();
    check();
    await prepareLivePlayback(audio, getSuperdoughMasterGain(), instrumentId);
    check();
    clearInterval(peakTimer);
    const failure = getLivePlaybackFailure(instrumentId);
    if (failure) throw new Error(`The piano is not in the worklet: ${failure.reason}`);
    results.loadMs = performance.now() - loadStart;
    const loaded = readJsMemory();
    results.memory = { idle, loaded, peakDuringLoadBytes: peak, afterLoop: null, bank: readBank() };

    cleanups.push(subscribeLivePlayback({
      onEvent: onLiveEvent,
      onTransport(response) { if (response.type === "transport-events") readTransportEvents(response, onRecord); },
    }));
    player = createPatternPlayer({
      audio: {
        getContext: () => getAudioContext(),
        async ensureReady() {
          await initSuperdoughAudio();
          return getSuperdoughMasterGain();
        },
      },
    });
    // The Stage hydrates loop notes from the production player, as in the app.
    setProductionPatternPlayer(player);
    cleanups.push(() => setProductionPatternPlayer(undefined));

    const toBar = SOAK_FROM_BAR + SOAK_BARS;
    const account = createSoakAccount({ tables, memberOf, fromBar: SOAK_FROM_BAR, sampleRate: audio.sampleRate });
    recorders.add(account.record);
    const soakLights = watchLights(audio);
    state.status = "Starting the loop…";
    await player.start({ bpm: GATE_BPM, target: { key: "C", mode: "major" }, members });
    releaseLoad();
    check();
    state.dials = members.map(member => ({ id: member.id, label: GATE_MEMBER_LABELS[member.id], muted: false, soloed: false }));
    results.environment = environment(audio);

    // ── The soak: twelve bars of the loop with live notes on top. ──
    await untilBar(SOAK_FROM_BAR - .1);
    state.phase = "soak";
    state.status = "Soak: the loop plays with live chords on top. Drum on the pad too.";
    void readLiveRenderCost(true)?.catch(() => {});
    /** Read the worklet's render cost into the results; false when no reading came (in time). */
    const readCost = async (timeoutMs?: number) => {
      const reading = readLiveRenderCost()?.catch(() => undefined);
      const cost = await (timeoutMs === undefined ? reading
        : Promise.race([reading, sleep(timeoutMs).then(() => undefined)]));
      if (cost) results.renderCost = summarizeRenderCost(cost, audio.sampleRate);
      return Boolean(cost);
    };
    // A Stop mid-soak still reads the cost of the quanta rendered so far.
    captureCost = () => readCost(STOP_COST_READ_MS);
    const statsBefore = readPlaybackStats(audio);
    const frames: number[] = [];
    // An OS interruption (a call, Siri) changes the context's state: the meter starts a fresh baseline.
    const slip = createClockSlipMeter({ context: audio });
    let recording = true;
    const frame = (time: number) => {
      if (!recording) return;
      frames.push(time);
      const stamp = audio.getOutputTimestamp?.();
      slip.sample(stamp?.contextTime, stamp?.performanceTime);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    const chords = [[64, 67, 72], [65, 69, 72], [62, 67, 71], [64, 67, 72]];
    let beat = 0;
    const livePresser = setInterval(() => {
      const owner = `gate-live-${++liveSerial}`;
      const chord = chords[beat++ % chords.length];
      pressLive(owner, chord, performance.now(), false);
      setTimeout(() => releaseLive(owner, chord.length), GATE_BEAT_MS * .45);
    }, GATE_BEAT_MS);
    const stopSoak = () => { recording = false; clearInterval(livePresser); slip.dispose(); };
    cleanups.push(stopSoak);
    /** The soak's results over bars [SOAK_FROM_BAR, until). */
    const publishSoak = (until: number) => {
      results.attacks = account.result(until);
      // No pause here: every unlit note is a late one.
      results.stage = soakLights.result(SOAK_FROM_BAR, until, Infinity);
      results.frames = summarizeFrames(frames);
      results.clockSlip = slip.result();
      results.playbackStats = playbackStatsDelta(statsBefore, readPlaybackStats(audio));
    };
    // A Stop mid-soak keeps the bars already rendered (less the last quantum's records still in flight).
    captureStep = () => {
      const reached = player?.barAtAudioTime(audio.currentTime);
      const until = typeof reached === "number" ? Math.min(toBar, reached - .05) : SOAK_FROM_BAR;
      if (!(until > SOAK_FROM_BAR)) return;
      publishSoak(until);
      results.stoppedDuring = "soak";
    };
    await untilBar(toBar + .05, bar => { state.progress = Math.min(1, Math.max(0, (bar - SOAK_FROM_BAR) / SOAK_BARS)); });
    stopSoak();
    // Let the last quantum's records cross the port.
    await sleep(200);
    check();
    captureStep = undefined;
    recorders.delete(account.record);
    soakLights.stop();
    publishSoak(toBar);
    const gotCost = await readCost();
    // A Stop while the read was pending has already summarised the run: don't move on to the ear step.
    check();
    if (!gotCost) results.renderCost = null;
    captureCost = undefined;
    results.memory = { ...results.memory!, afterLoop: readJsMemory(), bank: readBank() };
    results.environment = environment(audio);

    // ── Guided steps. ──
    state.phase = "ear";
    state.status = "";
    results.heardDropouts = await new Promise<boolean | null>(resolve => { earAnswer = resolve; });
    check();
    state.phase = "dials";
    await new Promise<void>(resolve => { advance = resolve; });
    check();
    await restoreDials();
    state.phase = "tap";
    await new Promise<void>(resolve => { advance = resolve; });
    check();
    state.phase = "resume";
    await resumeCheck(audio);
    check();
    state.phase = "route";
    await routeCheck(audio);
    check();
    await finish();
  }

  // ─── Mute and solo, from the real Looper Dial ───────────────────────────────

  /** A finger lifted off a dial: a tap mutes on that lift. */
  function dialLift(id: string, event: PointerEvent) {
    lastLift.set(id, eventTime(event));
  }

  async function dialMute(id: string) {
    const dial = state.dials.find(entry => entry.id === id);
    if (!dial || !player || !context) return;
    const lift = lastLift.get(id);
    const tapAt = lift !== undefined && performance.now() - lift < 1000 ? lift : performance.now();
    lastLift.delete(id);
    dial.muted = !dial.muted;
    const muted = dial.muted;
    const receipt = await player.setMember(id, { muted }).catch(() => undefined);
    const audio = context;
    // Read the speaker time in the task the receipt arrived in, as the clock stands now.
    const tally = tallyMuteTap(
      { mute: results.mute ?? [], unmute: results.unmute ?? [], refused: results.muteRefused ?? 0 },
      { muted, tapAtMs: tapAt }, receipt,
      { sampleRate: audio?.sampleRate ?? 0, fadeMs: FADE_MS,
        outputTimeMs: audioTime => audio ? freshOutputTimeMs(audio, audioTime, performance.now()) : Number.NaN });
    results.mute = tally.mute;
    results.unmute = tally.unmute;
    results.muteRefused = tally.refused;
    // A refused tap still counts as one of the step's taps: it measured nothing.
    if (state.phase === "dials") state.muteTaps++;
  }

  async function dialSolo(id: string, held: boolean) {
    if (!player || !context) return;
    const at = performance.now();
    for (const dial of state.dials) dial.soloed = held && dial.id === id;
    const receipt = await player.solo(held ? id : null).catch(() => undefined);
    const audio = context;
    const tally = tallySoloHold(
      { solo: results.solo ?? [], release: results.soloRelease ?? [], refused: results.soloRefused ?? 0 },
      { held, atMs: at }, receipt,
      { sampleRate: audio?.sampleRate ?? 0, fadeMs: FADE_MS,
        outputTimeMs: audioTime => audio ? freshOutputTimeMs(audio, audioTime, performance.now()) : Number.NaN });
    results.solo = tally.solo;
    results.soloRelease = tally.release;
    results.soloRefused = tally.refused;
    // A refused hold still counts as one of the step's holds: it measured nothing.
    if (held && state.phase === "dials") state.soloHolds++;
  }

  async function restoreDials() {
    if (!player) return;
    for (const dial of state.dials) {
      if (dial.muted) await player.setMember(dial.id, { muted: false });
      dial.muted = false;
      dial.soloed = false;
    }
    await player.solo(null);
  }

  // ─── The pad: live notes, and tap to sound ──────────────────────────────────

  let padOwner: string | undefined;
  // The pad leaves the page on a phase change, taking its pointer handlers with
  // it: a note still held then would sound on into the next step.
  const stopPadWatch = watch(() => state.phase, () => padUp(), { flush: "sync" });
  function padDown(event: PointerEvent) {
    if (!context || padOwner) return;
    const at = eventTime(event);
    padOwner = `gate-pad-${++liveSerial}`;
    const timed = state.phase === "tap";
    pressLive(padOwner, [60 + (liveSerial % 5) * 2], at, timed);
    if (timed) state.padTaps++;
  }

  function padUp() {
    if (!padOwner) return;
    releaseLive(padOwner);
    padOwner = undefined;
  }

  // ─── getOutputTimestamp after a suspend (carried from #198) ─────────────────

  async function resumeCheck(audio: AudioContext) {
    state.status = "Hands off: audio pauses for 5 seconds, then resumes on its own.";
    const records: DecodedTransportEvent[] = [];
    const record = (event: DecodedTransportEvent) => { records.push({ ...event }); };
    recorders.add(record);
    cleanups.push(() => recorders.delete(record));
    const lights = watchLights(audio);
    // Mid-loop, between notes or not: a real pause lands anywhere.
    results.resume = await measureResume({
      bpm: GATE_BPM,
      pauseMs: PAUSE_MS,
      now: () => performance.now(),
      sleep,
      nextFrame: () => new Promise<void>(resolve => requestAnimationFrame(() => resolve())),
      currentTime: () => audio.currentTime,
      outputTimestamp: () => audio.getOutputTimestamp?.(),
      suspend: () => audio.suspend(),
      async resume() {
        const attempt = resumeAudioContext(audio)?.catch(() => {});
        await Promise.race([attempt, sleep(3000)]);
        if ((audio.state as string) === "running") return false;
        // The browser wants a gesture: ask for one.
        state.needsResumeTap = true;
        state.status = "This browser needs a tap to resume audio.";
        await new Promise<void>(resolve => { resumeTap = resolve; });
        state.needsResumeTap = false;
        return true;
      },
      barAt: time => player?.barAtAudioTime(time),
      untilBar: bar => untilBar(bar),
      judge(fromBar, toBar, staleMs) {
        const ledger = createAttackLedger({ expected: expectedOnsets(tables, fromBar, toBar), memberOf, fromBar, toBar,
          sampleRate: audio.sampleRate });
        records.forEach(ledger.record);
        const sounded = ledger.result();
        return { light: lights.result(fromBar, toBar, staleMs), expected: sounded.expected, sounded: sounded.rendered };
      },
      expose(snapshot) {
        captureStep = () => {
          const partial = snapshot();
          if (partial) { results.resume = partial; results.stoppedDuring = "resume"; }
        };
      },
      check,
      onProgress: fraction => { state.progress = fraction; },
      onStatus: status => { state.status = status; },
    });
    captureStep = undefined;
    recorders.delete(record);
    lights.stop();
  }

  function resumeByTap() {
    if (!context || !resumeTap) return;
    void resumeAudioContext(context)?.then(() => { resumeTap?.(); resumeTap = undefined; }, () => {});
    if (context.state === "running") { resumeTap(); resumeTap = undefined; }
  }

  // ─── A route change (guided) ────────────────────────────────────────────────

  async function routeCheck(audio: AudioContext) {
    // Written into the results as seen: a Stop during this step keeps them.
    const log = createRouteLog(results);
    const note = (line: string) => {
      log.note(line);
      state.routeObservations = [...log.observations];
    };
    let rate = audio.sampleRate;
    let base = audio.baseLatency;
    let output = audio.outputLatency;
    const onState = () => note(`audio ${audio.state}`);
    audio.addEventListener("statechange", onState);
    const devices = navigator.mediaDevices;
    const onDevices = () => note("output device changed");
    devices?.addEventListener?.("devicechange", onDevices);
    const unsubscribe = subscribeLivePlayback({ onEvent() {}, onRendererReset: () => note("worklet rebuilt (banks reload)") });
    const stopRecovery = player?.onRecoveryChange(recovering => note(recovering ? "loop recovering" : "loop restored"));
    const stopInterrupted = player?.onInterrupted(error => note(`loop stopped: ${error.message}`));
    const poll = setInterval(() => {
      if (audio.sampleRate !== rate) { note(`sample rate ${rate} → ${audio.sampleRate} Hz`); rate = audio.sampleRate; }
      const ms = (value: number) => `${(value * 1000).toFixed(1)} ms`;
      if (Number.isFinite(audio.baseLatency) && audio.baseLatency !== base) { note(`base latency ${ms(audio.baseLatency)}`); base = audio.baseLatency; }
      if (Number.isFinite(audio.outputLatency) && Math.abs(audio.outputLatency - output) > .002) {
        note(`output latency ${ms(audio.outputLatency)}`);
        output = audio.outputLatency;
      }
      const now = performance.now();
      while (loopAttackTimes.length && loopAttackTimes[0] < now - 2000) loopAttackTimes.shift();
      state.loopAlive = loopAttackTimes.length;
    }, 250);
    const stop = () => {
      clearInterval(poll);
      audio.removeEventListener("statechange", onState);
      devices?.removeEventListener?.("devicechange", onDevices);
      unsubscribe();
      stopRecovery?.();
      stopInterrupted?.();
    };
    cleanups.push(stop);
    const works = await new Promise<boolean | null>(resolve => { routeAnswer = resolve; });
    stop();
    log.answer(works);
  }

  // ─── Answers, and the end ──────────────────────────────────────────────────

  function answerEar(heard: boolean | null) { earAnswer?.(heard); earAnswer = undefined; }
  function answerRoute(works: boolean | null) { routeAnswer?.(works); routeAnswer = undefined; }
  function next() { const go = advance; advance = undefined; go?.(); }

  async function finish() {
    if (state.phase === "done" || finishing) return;
    finishing = true;
    stopped = true;
    try { captureStep?.(); } catch { /* a capture never blocks the summary */ }
    captureStep = undefined;
    // The render cost is read across the worklet's port: the summary waits for it, briefly.
    const readCost = captureCost;
    captureCost = undefined;
    if (readCost) await readCost().catch(() => false);
    try { if (player && results.memory) results.memory = { ...results.memory, afterLoop: results.memory.afterLoop ?? readJsMemory() }; } catch { /* reading memory never blocks the summary */ }
    teardown();
    state.phase = "done";
    state.status = "";
    state.summary = formatGateSummary(results);
  }

  /** End the run now; whatever was measured is summarised. */
  function stop() {
    if (state.phase === "idle" || state.phase === "done") return;
    results.error ??= "Stopped before the end";
    void finish();
    // Wake anything waiting on an answer so it can see the stop.
    earAnswer?.(null); routeAnswer?.(null); resumeTap?.(); next();
  }

  function teardown() {
    for (const cleanup of cleanups.splice(0)) {
      try { cleanup(); } catch { /* keep tearing down */ }
    }
    if (padOwner) padUp();
    stopPadWatch();
    player?.dispose();
    player = undefined;
  }

  function dispose() {
    stopped = true;
    earAnswer?.(null); routeAnswer?.(null); resumeTap?.(); next();
    teardown();
  }

  return { state, run, stop, dispose, next, answerEar, answerRoute, resumeByTap, dialLift, dialMute, dialSolo, padDown, padUp };
}

export type PhoneGate = ReturnType<typeof createPhoneGate>;
