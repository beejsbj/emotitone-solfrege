/**
 * Plays recorded or library patterns on the live worklet's transport
 * (BJS-485), alone or as Looper members (BJS-491). No Strudel scheduler: the
 * audio thread schedules every note.
 *
 * The main thread owns four things here:
 * - preparation: each member's instrument must be resident in the worklet
 *   (and stay pinned while it is a member, sounding, resting or muted) before
 *   any table refers to it;
 * - tables: which table a member plays. Bending to the Looper's key and mode
 *   goes through the musical-identity remap; a pinned member keeps its
 *   recorded key and mode. The transport itself never bends;
 * - note events: numeric worklet records become the app's `note-played` /
 *   `note-released` events with each note's immutable identity, plus an
 *   active-note registry that Stage hydration reads;
 * - UIBeat: the bar the listener hears, from the published tempo anchors.
 */
import { holdAudioActivity, onAudioRunning, resumeAudioContext } from "@/services/audioLifecycle";
import { audioTimeToOutputTime } from "@/services/liveAudioTiming";
import {
  getLivePlaybackFailure,
  getLiveTransport,
  pinLivePlayback,
  prepareLivePlayback,
  subscribeLivePlayback,
  type LiveTransportPort,
} from "@/services/livePlayback";
import { resolveLiveSoundName } from "@/services/liveInstrumentNames";
import { buildPatternMember, type PatternMember, type PatternMemberRequest } from "@/services/patternMember";
import { setTransportGridSource } from "@/services/transportGrid";
import { bendNotes } from "@/domain/modeRemap";
import { barAtFrame, bpmAtFrame, type TempoAnchor } from "@/audio/live/tempoMap";
import type {
  TransportBoundary, TransportChange, TransportCommand, TransportReceipt, TransportResponse, TransportSingleChange,
} from "@/audio/live/transport";
import { readTransportEvents, TransportEventKind, type DecodedTransportEvent } from "@/audio/live/transportEvents";
import { uiBeatClock as defaultUIBeatClock, type UIBeatClock } from "@/composables/useUIBeat";
import type { ActiveNote, ChromaticNote, MusicalMode } from "@/types/music";
import type { LogNote } from "@/types/patterns";

/** Event source of transport notes; the recorder ignores it (it is never a performance). */
export const PATTERN_PLAYBACK_SOURCE = "pattern-playback";
const PIN_HOLDER = "pattern-transport";
const BEATS_PER_BAR = 4;

/** The pattern's instrument could not be put in the worklet. */
export class PatternLoadError extends Error {
  constructor(message: string, readonly retryable: boolean, readonly budget = false) {
    super(message);
    this.name = "PatternLoadError";
  }
}

export interface PatternRequest extends Omit<PatternMemberRequest, "generation" | "instrumentId"> {
  /** Playback tempo in BPM (one bar is four beats). */
  bpm: number;
}

/** A Looper member: a phrase's recorded notes and context, and how it sits in the loop. */
export interface LooperMemberRequest extends Omit<PatternMemberRequest, "generation" | "instrumentId"> {
  /** Where phrase time 0 sits on the bar grid. Default 0. */
  offsetBars?: number;
  /** 0.5, 1 or 2. Default 1. */
  rate?: number;
  muted?: boolean;
  /** Play in the recorded key and mode (the request's) instead of bending to the Looper's. */
  pinned?: boolean;
  /** Loop length in bars at rate 1; default the take's authored length (the caller may round). */
  lengthBars?: number;
}

export interface LooperMemberSettings {
  offsetBars: number;
  rate: number;
  muted: boolean;
  pinned: boolean;
}

export interface LooperKeyMode {
  key: ChromaticNote;
  mode: MusicalMode;
}

/** What happens to a muted (or solo-silenced) member's reverb and delay tail. */
export type MuteTailPolicy = "ring" | "cut";

export interface PatternAudio {
  getContext(): AudioContext;
  /** Load the audio graph and catalog the instrument needs; no PCM for superdough. */
  ensureReady(instrument: string): Promise<AudioNode | null>;
  /**
   * Fade out what the shared room and delay already hold. Called after a mute
   * or solo applies when the tail policy is "cut"; it cuts every member's
   * tail, not only the silenced one (the buses are shared).
   */
  cutWetTails?(): void;
}

interface Registered {
  note: ActiveNote;
  detail: Record<string, unknown>;
  generation: number;
}

interface Membership {
  request: LooperMemberRequest;
  settings: LooperMemberSettings;
  instrumentId?: string;
  /** The table the transport plays; undefined while the instrument loads (a cold join). */
  member?: PatternMember;
  releasePin?: () => void;
}

export interface PatternPlayerOptions {
  audio: PatternAudio;
  uiBeat?: UIBeatClock;
  /** The transport stopped without being asked (renderer failure or rebuild). */
  onInterrupted?: (error: Error) => void;
  /** Where note events are dispatched; the window in production. */
  target?: EventTarget;
  /**
   * "ring" (default): mute and solo fade the member's dry sound in 10 ms and
   * let what it already sent to the shared reverb and delay ring out.
   * "cut": also fade the shared buses (every member's tail) at that moment.
   */
  muteTails?: MuteTailPolicy;
  now?: () => number;
  requestFrame?: (callback: () => void) => number;
  cancelFrame?: (handle: number) => void;
}

const cancelledReceipt = (requestId: number): TransportReceipt => ({ type: "transport-applied", requestId,
  arrivalFrame: 0, appliedFrame: 0, appliedBar: null, late: false, cancelled: true });

export function createPatternPlayer(options: PatternPlayerOptions) {
  const target = options.target ?? window;
  const uiBeat = options.uiBeat ?? defaultUIBeatClock;
  const now = options.now ?? (() => performance.now());
  const requestFrame = options.requestFrame ?? ((callback: () => void) => requestAnimationFrame(callback));
  const cancelFrame = options.cancelFrame ?? ((handle: number) => cancelAnimationFrame(handle));
  const muteTails = options.muteTails ?? "ring";

  let port: LiveTransportPort | undefined;
  let context: AudioContext | undefined;
  let run = 0;
  let generation = 0;
  let requestId = 0;
  let playing = false;
  /** A Looper session recovers from a renderer rebuild; a lone pattern (the Code Strip) stops. */
  let session: { looper: boolean; bpm: number; target?: LooperKeyMode; soloId: string | null } | undefined;
  /** Set while a rebuilt renderer is awaited: the bar to continue from. */
  let recovery: { bar: number } | undefined;
  /** The bar the current run started at (0, or where a recovered run continued). */
  let startBar = 0;
  let stopRecovery: (() => void) | undefined;
  let releaseActivity: (() => void) | undefined;
  let releaseGrid: (() => void) | undefined;
  const memberships = new Map<string, Membership>();
  /** Every table of the current run, by generation: events resolve identity here. */
  const members = new Map<number, PatternMember>();
  const registry = new Map<string, Registered>();
  /** Released notes, kept briefly so a forced earlier release can still correct them. */
  const released = new Map<string, { audibleAt: number; detail: Record<string, unknown> }>();
  const receipts = new Map<number, (receipt: TransportReceipt) => void>();
  let anchors: TempoAnchor[] = [];
  let snapshot: { remaining: number; present: Set<string> } | undefined;
  let beatGeneration: number | undefined;
  let beatBpm: number | undefined;
  let lastBar = -Infinity;
  let frame: number | null = null;
  let changes: Promise<unknown> = Promise.resolve();

  const noteIdOf = (serial: number) => `pattern-${run}-${serial}`;
  const send = (command: TransportCommand) => port?.send(command);
  const outputTime = (frameIndex: number) => audioTimeToOutputTime(context!, frameIndex / port!.sampleRate, now());

  /** Send a change; resolves with its receipt (matched by request id, never by order). */
  function change(change: TransportChange, boundary: TransportBoundary = "immediate"): Promise<TransportReceipt> {
    const id = ++requestId;
    const receipt = new Promise<TransportReceipt>(resolve => receipts.set(id, resolve));
    send({ type: "transport-change", requestId: id, change, boundary });
    return receipt;
  }

  function settle(receipt: TransportReceipt) {
    const resolve = receipts.get(receipt.requestId);
    receipts.delete(receipt.requestId);
    resolve?.(receipt);
  }

  function dispatch(type: "note-played" | "note-released", detail: Record<string, unknown>) {
    target.dispatchEvent(new CustomEvent(type, { detail }));
  }

  function eventDetail(event: DecodedTransportEvent, member: PatternMember, noteId: string, audibleAt: number) {
    const note = member.notes[event.noteIndex];
    const sampleRate = port!.sampleRate;
    return {
      note: note.solfege,
      noteId,
      noteName: note.noteName,
      frequency: note.frequency,
      octave: note.octave,
      keyboardOctave: note.keyboardOctave,
      solfegeIndex: note.solfegeIndex,
      pitchClassIndex: note.pitchClassIndex,
      isBorrowed: note.isBorrowed,
      mode: note.mode,
      key: note.key,
      instrument: note.instrument,
      instrumentConfig: null,
      velocity: note.velocity,
      articulation: { ...note.articulation },
      durationMs: event.length / sampleRate * 1000,
      audibleAt,
      // MIDI follows what is heard, on the performance clock.
      midiTimestamp: audibleAt,
      timestamp: Date.now() + (audibleAt - now()),
      source: PATTERN_PLAYBACK_SOURCE,
      record: false,
      sourceNoteId: note.sourceNoteId,
      phraseId: member.table.id,
      memberId: member.table.id,
      frame: event.frame,
      bar: event.bar,
    };
  }

  function attack(event: DecodedTransportEvent) {
    const member = members.get(event.generation);
    if (!member || !port) return;
    const noteId = noteIdOf(event.serial);
    if (registry.has(noteId)) return;
    const audibleAt = outputTime(event.frame);
    const endsAt = outputTime(event.frame + event.length);
    // After a stall, a note that has already ended is history, not news.
    if (endsAt <= now()) return;
    const detail = eventDetail(event, member, noteId, audibleAt);
    const note: ActiveNote = {
      noteId, audibleAt, solfege: detail.note, frequency: detail.frequency, octave: detail.octave,
      keyboardOctave: detail.keyboardOctave, solfegeIndex: detail.solfegeIndex,
      pitchClassIndex: detail.pitchClassIndex, noteName: detail.noteName, mode: detail.mode, key: detail.key,
    };
    registry.set(noteId, { note, detail, generation: event.generation });
    dispatch("note-played", detail);
  }

  function release(noteId: string, audibleAt: number, extra: Record<string, unknown> = {}) {
    const entry = registry.get(noteId);
    const timing = { audibleAt, midiTimestamp: audibleAt, timestamp: Date.now() + (audibleAt - now()) };
    if (entry) {
      registry.delete(noteId);
      const detail = { ...entry.detail, note: entry.note.solfege.name, ...extra };
      released.set(noteId, { audibleAt, detail });
      dispatch("note-released", { ...detail, ...timing });
      return;
    }
    // An earlier release than the one already announced (a forced fade):
    // consumers keep the earliest ending they are told.
    const previous = released.get(noteId);
    if (previous && audibleAt < previous.audibleAt) {
      previous.audibleAt = audibleAt;
      dispatch("note-released", { ...previous.detail, ...extra, ...timing });
    }
  }

  /** Overflow recovery: anything the worklet's snapshot does not list has ended. */
  function finishSnapshot() {
    const present = snapshot!.present;
    snapshot = undefined;
    for (const noteId of [...registry.keys()]) if (!present.has(noteId)) endNow(noteId);
  }

  /**
   * End a note now, but never before its own onset: an announced note may not
   * be heard yet, and the MIDI scheduler ignores a note-off earlier than its
   * pending note-on (it would stick).
   */
  function endNow(noteId: string) {
    const onset = registry.get(noteId)?.note.audibleAt;
    release(noteId, Math.max(now(), onset ?? -Infinity));
  }

  function onEvent(event: DecodedTransportEvent) {
    switch (event.kind) {
      case TransportEventKind.Attack: attack(event); return;
      case TransportEventKind.Release: {
        const noteId = noteIdOf(event.serial);
        const articulation = registry.get(noteId)?.detail.articulation as object | undefined;
        release(noteId, outputTime(event.frame), articulation ? { articulation: { ...articulation, release: event.length } } : {});
        return;
      }
      case TransportEventKind.Cancel: {
        // The note will never sound: release it at its own onset.
        const noteId = noteIdOf(event.serial);
        const entry = registry.get(noteId);
        if (entry) release(noteId, entry.note.audibleAt ?? now());
        return;
      }
      case TransportEventKind.SnapshotBegin:
        snapshot = { remaining: event.serial, present: new Set() };
        if (!snapshot.remaining) finishSnapshot();
        return;
      case TransportEventKind.Active:
        if (!snapshot) return;
        snapshot.present.add(noteIdOf(event.serial));
        attack(event);
        if (--snapshot.remaining <= 0) finishSnapshot();
        return;
    }
  }

  function onTransport(response: TransportResponse) {
    if (!playing || recovery) return;
    if (response.type === "transport-events") {
      readTransportEvents(response, onEvent);
      // Keep only recent release corrections.
      if (released.size > 256) for (const noteId of [...released.keys()].slice(0, released.size - 256)) released.delete(noteId);
    } else if (response.type === "transport-anchors" && response.run === run) {
      anchors = response.anchors;
    } else if (response.type === "transport-applied") {
      settle(response);
    }
  }

  const unsubscribe = subscribeLivePlayback({
    onEvent() {},
    onTransport,
    onRendererReset() {
      if (!playing) return;
      if (session?.looper && context && port) {
        suspendForRecovery();
        return;
      }
      halt(false);
      options.onInterrupted?.(new Error("The audio engine restarted; playback stopped"));
    },
  });

  // --- UIBeat: the heard bar, never the rendered one ---------------------

  function heardFrame(): number | null {
    if (!context || !port) return null;
    const timestamp = context.getOutputTimestamp?.();
    if (timestamp && Number.isFinite(timestamp.contextTime) && Number.isFinite(timestamp.performanceTime)
      && timestamp.performanceTime! > 0) {
      return (timestamp.contextTime! + (now() - timestamp.performanceTime!) / 1000) * port.sampleRate;
    }
    const latency = (value: number | undefined) => Number.isFinite(value) && value! > 0 ? value! : 0;
    return (context.currentTime - latency(context.baseLatency) - latency(context.outputLatency)) * port.sampleRate;
  }

  function publishBeat() {
    frame = null;
    if (!playing || beatGeneration === undefined) return;
    frame = requestFrame(publishBeat);
    if (!anchors.length) return;
    if (context?.state !== "running" || recovery) {
      uiBeat.suspend(beatGeneration);
      return;
    }
    const heard = heardFrame();
    if (heard === null) return;
    const bpm = bpmAtFrame(anchors, heard);
    if (bpm !== beatBpm) {
      beatBpm = bpm;
      uiBeat.retime(beatGeneration, bpm);
    }
    // The heard clock can jitter by a quantum; the bar never steps backward.
    const bar = Math.max(lastBar, barAtFrame(anchors, heard, port!.sampleRate));
    lastBar = bar;
    uiBeat.publish(beatGeneration, { rawPosition: bar, barPosition: Math.max(0, bar) });
  }

  function startBeat(bpm: number) {
    beatGeneration = uiBeat.arm({ mappingAvailable: true, bpm, meter: { beatsPerBar: BEATS_PER_BAR, beatUnit: 4 } });
    beatBpm = bpm;
    lastBar = -Infinity;
    if (frame === null) frame = requestFrame(publishBeat);
    // Live Repeat/Arp on the fallback renderer read the same grid (S111).
    releaseGrid?.();
    releaseGrid = setTransportGridSource(() => {
      if (!playing || recovery || !context || !port || !anchors.length) return undefined;
      const current = context.currentTime * port.sampleRate;
      let anchor = anchors[0];
      for (const next of anchors) if (next.frame <= current) anchor = next;
      return { at: anchor.frame / port.sampleRate * 1000, bar: anchor.bar, bpm: anchor.bpm };
    });
  }

  function stopBeat() {
    if (frame !== null) cancelFrame(frame);
    frame = null;
    if (beatGeneration !== undefined) uiBeat.stop(beatGeneration);
    beatGeneration = undefined;
    releaseGrid?.();
    releaseGrid = undefined;
  }

  // --- Tables --------------------------------------------------------------

  /** Put `instrument` in the worklet; the transport port that holds it. */
  async function prepare(instrument: string): Promise<{ port: LiveTransportPort; instrumentId: string }> {
    const instrumentId = resolveLiveSoundName(instrument);
    const destination = await options.audio.ensureReady(instrumentId);
    context = options.audio.getContext();
    await prepareLivePlayback(context, destination, instrumentId);
    const ready = getLiveTransport(instrumentId);
    if (ready) return { port: ready, instrumentId };
    const failure = getLivePlaybackFailure(instrumentId);
    // A transport member has no fallback renderer: a bank refused for budget
    // is an explicit error, never a member whose notes make no sound.
    throw new PatternLoadError(
      failure?.kind === "load"
        ? `${instrument} could not load: ${failure.reason}`
        : failure?.budget
          ? `${instrument} cannot join: every instrument slot is held by a playing pattern or key`
          : `${instrument} cannot play patterns on the worklet engine (${failure?.reason ?? "not prepared"})`,
      failure?.kind === "load",
      Boolean(failure?.budget),
    );
  }

  /** The member's table under the current target: bent through the identity remap, or pinned. */
  function build(entry: Membership): PatternMember {
    const { request, settings } = entry;
    const bendTo = !settings.pinned && session?.target;
    const bent = bendTo && (bendTo.key !== request.key || bendTo.mode !== request.mode);
    const keyMode = bendTo || request;
    const member = buildPatternMember({
      ...request,
      notes: bent ? bendNotes(request.notes as LogNote[], request, bendTo) : request.notes,
      key: keyMode.key,
      mode: keyMode.mode,
      generation: ++generation,
      instrumentId: entry.instrumentId!,
    });
    if (request.lengthBars !== undefined && Number.isFinite(request.lengthBars) && request.lengthBars > 0) {
      member.table.lengthBars = request.lengthBars;
    }
    members.set(member.table.generation, member);
    entry.member = member;
    return member;
  }

  function joinChange(entry: Membership): TransportSingleChange {
    const { offsetBars, rate, muted } = entry.settings;
    return { type: "join", member: { table: entry.member!.table, offsetBars, rate, muted } };
  }

  function pin(id: string, entry: Membership, instrumentId: string) {
    // Resting and muted members keep their bank: a member must come back on
    // its next note, and a reload cannot fit inside the lookahead.
    entry.releasePin?.();
    entry.instrumentId = instrumentId;
    entry.releasePin = pinLivePlayback(`${PIN_HOLDER}:${id}`, [instrumentId]);
  }

  function settingsOf(request: LooperMemberRequest, previous?: LooperMemberSettings): LooperMemberSettings {
    return {
      offsetBars: request.offsetBars ?? previous?.offsetBars ?? 0,
      rate: request.rate ?? previous?.rate ?? 1,
      muted: request.muted ?? previous?.muted ?? false,
      pinned: request.pinned ?? previous?.pinned ?? false,
    };
  }

  // --- Lifecycle -----------------------------------------------------------

  function resolvePending() {
    for (const id of [...receipts.keys()]) settle(cancelledReceipt(id));
  }

  /** Stop everything local; with `command`, also stop the worklet transport. */
  function halt(command: boolean) {
    const wasPlaying = playing;
    if (command && port) send({ type: "transport-stop", requestId: ++requestId });
    playing = false;
    run++;
    for (const noteId of [...registry.keys()]) endNow(noteId);
    registry.clear();
    released.clear();
    members.clear();
    for (const entry of memberships.values()) entry.releasePin?.();
    memberships.clear();
    resolvePending();
    snapshot = undefined;
    anchors = [];
    session = undefined;
    recovery = undefined;
    startBar = 0;
    stopRecovery?.();
    stopRecovery = undefined;
    stopBeat();
    releaseActivity?.();
    releaseActivity = undefined;
    return wasPlaying;
  }

  /**
   * The renderer was rebuilt under a running Looper (a route or sample-rate
   * change, or a processor failure): its transport state is gone. Keep the
   * membership and the bar the clock had reached, and restore through the
   * existing interruption gate: the next `resumeAudioContext` (a gesture, or
   * the rebuild's own) runs every `onAudioRunning` recovery.
   */
  function suspendForRecovery() {
    // Before the new run's anchors arrive, the bar it was told to start from stands.
    const bar = anchors.length && context && port
      ? barAtFrame(anchors, context.currentTime * port.sampleRate, port.sampleRate) : recovery?.bar ?? startBar;
    for (const noteId of [...registry.keys()]) endNow(noteId);
    registry.clear();
    released.clear();
    snapshot = undefined;
    resolvePending();
    recovery = { bar };
    if (beatGeneration !== undefined) uiBeat.suspend(beatGeneration);
    watchRecovery();
    // Knock on the gate rather than unlocking here: inside a rebuild it joins
    // the rebuild's own pass; otherwise a running context restores at once and
    // a suspended one waits for the next gesture.
    const audioContext = context!;
    queueMicrotask(() => { if (recovery) void resumeAudioContext(audioContext)?.catch(() => {}); });
  }

  /** Registered at start, so a rebuild inside the gate's pass is restored in that same pass. */
  function watchRecovery() {
    stopRecovery ??= onAudioRunning(context!, () => recovery ? restore() : undefined);
  }

  let restoring: Promise<void> | undefined;
  function restore(): Promise<void> {
    return restoring ??= (async () => {
      const attempt = run;
      try {
        const entries = [...memberships.entries()].filter(([, entry]) => entry.member);
        let ready: LiveTransportPort | undefined;
        // Every bank first (each instrument once), then playback: the rebuilt
        // processor starts empty and the one-copy contract moved the PCM away.
        for (const instrument of new Set(entries.map(([, entry]) => entry.request.instrument))) {
          ready = (await prepare(instrument)).port;
          if (attempt !== run) return;
        }
        if (!ready || !session || !recovery) return;
        port = ready;
        anchors = [];
        run++;
        // Tables are rebuilt so their generations belong to the new run.
        members.clear();
        const joins = entries.map(([, entry]) => { build(entry); return joinChange(entry); });
        const solo = session.soloId;
        if (joins.length) send({ type: "transport-change", requestId: ++requestId, boundary: "immediate",
          change: { type: "batch", changes: solo ? [...joins, { type: "solo", memberId: solo }] : joins } });
        startBar = recovery.bar;
        send({ type: "transport-start", requestId: ++requestId, run, bpm: session.bpm, bar: startBar });
        recovery = undefined;
      } catch (error) {
        if (attempt === run) {
          halt(false);
          options.onInterrupted?.(error instanceof Error ? error : new Error(String(error)));
        }
      } finally {
        restoring = undefined;
      }
    })();
  }

  function requireSession(): NonNullable<typeof session> {
    if (!playing || !session?.looper) throw new Error("The Looper is not running");
    return session;
  }

  /** After a receipt that silenced members, apply the tail policy. */
  function afterSilence(receipt: Promise<TransportReceipt>) {
    if (muteTails !== "cut") return receipt;
    return receipt.then(applied => {
      if (!applied.cancelled) options.audio.cutWetTails?.();
      return applied;
    });
  }

  return {
    get isPlaying() { return playing; },
    /** Active transport notes, for Stage hydration. */
    getActiveNotes(): readonly ActiveNote[] {
      return [...registry.values()].map(entry => entry.note);
    },
    /**
     * Start the pattern. Resolves once the transport has been told to start.
     * Throws PatternLoadError (and starts nothing) when the instrument cannot
     * be prepared; a retry after a load failure prepares it again.
     */
    async play(request: PatternRequest): Promise<void> {
      halt(true);
      const attempt = run;
      const audioContext = options.audio.getContext();
      // The Play tap is the unlock gesture.
      const unlocked = resumeAudioContext(audioContext);
      releaseActivity = holdAudioActivity();
      try {
        await unlocked;
        const prepared = await prepare(request.instrument);
        if (attempt !== run) return;
        port = prepared.port;
        session = { looper: false, bpm: request.bpm, soloId: null };
        const entry: Membership = { request, settings: settingsOf({ ...request, pinned: true }) };
        memberships.set(request.id, entry);
        pin(request.id, entry, prepared.instrumentId);
        build(entry);
        playing = true;
        void change(joinChange(entry));
        send({ type: "transport-start", requestId: ++requestId, run, bpm: request.bpm });
        startBeat(request.bpm);
      } catch (error) {
        if (attempt === run) halt(false);
        throw error;
      }
    },
    /**
     * Rebuild the playing pattern (key, mode, octave, instrument or tempo
     * changed) and swap it at the next quantum. A cold instrument loads first;
     * if it fails, the old table and instrument keep playing.
     */
    update(request: PatternRequest): Promise<void> {
      const attempt = run;
      const task = changes.then(async () => {
        const previous = [...memberships.values()][0];
        if (!playing || attempt !== run || !previous || session?.looper) return;
        let instrumentId = previous.instrumentId!;
        if (resolveLiveSoundName(request.instrument) !== instrumentId) {
          const prepared = await prepare(request.instrument);
          if (!playing || attempt !== run) return;
          if (prepared.port.generation !== port?.generation) throw new PatternLoadError("The audio engine restarted", true);
          instrumentId = prepared.instrumentId;
        }
        const previousBpm = session!.bpm;
        memberships.delete(previous.request.id);
        previous.releasePin?.();
        const entry: Membership = { request, settings: settingsOf({ ...request, pinned: true }) };
        memberships.set(request.id, entry);
        pin(request.id, entry, instrumentId);
        build(entry);
        session!.bpm = request.bpm;
        if (request.bpm !== previousBpm) void change({ type: "tempo", bpm: request.bpm });
        void change(joinChange(entry));
      });
      changes = task.catch(() => undefined);
      return task;
    },

    // --- The Looper (BJS-491): several members on one bar grid ------------

    /**
     * Start the Looper with its first members: the first sets tempo and bar
     * one (the caller passes its tempo, key and mode as `bpm` and `target`).
     * The tap that calls this is the unlock gesture. Every member's bank is
     * prepared first; then all join and the transport starts at bar 0.
     */
    async start(request: { bpm: number; target: LooperKeyMode; members: readonly LooperMemberRequest[] }): Promise<TransportReceipt> {
      halt(true);
      const attempt = run;
      const audioContext = options.audio.getContext();
      const unlocked = resumeAudioContext(audioContext);
      releaseActivity = holdAudioActivity();
      try {
        await unlocked;
        session = { looper: true, bpm: request.bpm, target: { ...request.target }, soloId: null };
        const entries: [string, Membership][] = [];
        for (const memberRequest of request.members) {
          const prepared = await prepare(memberRequest.instrument);
          if (attempt !== run) return cancelledReceipt(0);
          port = prepared.port;
          const entry: Membership = { request: memberRequest, settings: settingsOf(memberRequest) };
          memberships.set(memberRequest.id, entry);
          pin(memberRequest.id, entry, prepared.instrumentId);
          entries.push([memberRequest.id, entry]);
        }
        if (!port) throw new Error("The Looper needs a member to start");
        playing = true;
        watchRecovery();
        const joins = entries.map(([, entry]) => { build(entry); return joinChange(entry); });
        if (joins.length) void change({ type: "batch", changes: joins });
        const id = ++requestId;
        const started = new Promise<TransportReceipt>(resolve => receipts.set(id, resolve));
        send({ type: "transport-start", requestId: id, run, bpm: request.bpm });
        startBeat(request.bpm);
        return started;
      } catch (error) {
        if (attempt === run) halt(false);
        throw error;
      }
    },

    /**
     * Join a member (or replace one with the same id). A cold instrument
     * loads first while the others keep playing; a bank refused for budget
     * throws PatternLoadError with `budget` set and nothing joins.
     */
    async join(request: LooperMemberRequest, boundary: TransportBoundary = "immediate"): Promise<TransportReceipt> {
      requireSession();
      const attempt = run;
      const previous = memberships.get(request.id);
      const entry: Membership = { request, settings: settingsOf(request, previous?.settings),
        releasePin: previous?.releasePin, instrumentId: previous?.instrumentId };
      memberships.set(request.id, entry);
      const undo = () => {
        if (memberships.get(request.id) !== entry) return;
        if (previous) memberships.set(request.id, previous);
        else memberships.delete(request.id);
      };
      let prepared: Awaited<ReturnType<typeof prepare>>;
      try {
        prepared = await prepare(request.instrument);
      } catch (error) {
        undo();
        throw error;
      }
      // Left, replaced or stopped while loading: nothing to join.
      if (attempt !== run || memberships.get(request.id) !== entry) return cancelledReceipt(0);
      if (prepared.port.generation !== port?.generation || recovery) {
        undo();
        throw new PatternLoadError("The audio engine restarted", true);
      }
      pin(request.id, entry, prepared.instrumentId);
      build(entry);
      const solo = session!.soloId === request.id ? [{ type: "solo", memberId: request.id } as const] : [];
      return change(solo.length ? { type: "batch", changes: [joinChange(entry), ...solo] } : joinChange(entry), boundary);
    },

    /** Leave: the member's sounding notes finish their gates; its bank is unpinned. */
    leave(id: string, boundary: TransportBoundary = "immediate"): Promise<TransportReceipt> {
      const looper = requireSession();
      const entry = memberships.get(id);
      memberships.delete(id);
      if (looper.soloId === id) looper.soloId = null;
      const receipt = change({ type: "leave", memberId: id }, boundary);
      // Unpin once the leave has applied: until then the member still sounds.
      void receipt.then(() => { if (memberships.get(id) !== entry) entry?.releasePin?.(); });
      return receipt;
    },

    /**
     * Shift (offset), rate, mute or pin a member. Pinning swaps its table to
     * the recorded key and mode (or back to the bend) in the same change.
     */
    setMember(id: string, patch: Partial<LooperMemberSettings>, boundary: TransportBoundary = "immediate"): Promise<TransportReceipt> {
      requireSession();
      const entry = memberships.get(id);
      if (!entry) return Promise.resolve(cancelledReceipt(0));
      const silencing = patch.muted === true && !entry.settings.muted;
      const repin = patch.pinned !== undefined && patch.pinned !== entry.settings.pinned;
      entry.settings = { ...entry.settings, ...patch };
      // Still loading: the join carries the new settings when it is sent.
      if (!entry.member) return Promise.resolve(cancelledReceipt(0));
      const parts: TransportSingleChange[] = [];
      const { offsetBars, rate, muted } = patch;
      if (offsetBars !== undefined || rate !== undefined || muted !== undefined) {
        parts.push({ type: "update", memberId: id, patch: {
          ...(offsetBars === undefined ? {} : { offsetBars }), ...(rate === undefined ? {} : { rate }),
          ...(muted === undefined ? {} : { muted }) } });
      }
      if (repin) parts.push({ type: "replace", table: build(entry).table });
      if (!parts.length) return Promise.resolve(cancelledReceipt(0));
      const receipt = change(parts.length === 1 ? parts[0] : { type: "batch", changes: parts }, boundary);
      return silencing ? afterSilence(receipt) : receipt;
    },

    /** Solo one member (others fade, keeping phase), or null to restore all. */
    solo(id: string | null, boundary: TransportBoundary = "immediate"): Promise<TransportReceipt> {
      const looper = requireSession();
      looper.soloId = id;
      const receipt = change({ type: "solo", memberId: id }, boundary);
      return id === null ? receipt : afterSilence(receipt);
    },

    setTempo(bpm: number, boundary: TransportBoundary = "immediate"): Promise<TransportReceipt> {
      const looper = requireSession();
      looper.bpm = bpm;
      return change({ type: "tempo", bpm }, boundary);
    },

    /**
     * Bend every unpinned member to a new key and mode, all at one frame or
     * bar: one batch, so no quantum plays old and new harmony together.
     * Resolves with null when no member needed a new table.
     */
    bend(target: LooperKeyMode, boundary: TransportBoundary = "immediate"): Promise<TransportReceipt | null> {
      const looper = requireSession();
      looper.target = { ...target };
      const parts: TransportSingleChange[] = [];
      for (const entry of memberships.values()) {
        if (!entry.member || entry.settings.pinned) continue;
        parts.push({ type: "replace", table: build(entry).table });
      }
      return parts.length ? change({ type: "batch", changes: parts }, boundary) : Promise.resolve(null);
    },

    /** The Looper as the transport plays it, for UI and tests. */
    getLooper() {
      return {
        running: playing && Boolean(session?.looper) && !recovery,
        recovering: Boolean(recovery),
        bpm: session?.bpm ?? null,
        target: session?.target ? { ...session.target } : null,
        soloId: session?.soloId ?? null,
        members: [...memberships.entries()].map(([id, entry]) => ({ id, ...entry.settings,
          generation: entry.member?.table.generation ?? null, loading: !entry.member })),
      };
    },

    stop() { halt(true); },
    dispose() {
      halt(true);
      unsubscribe();
    },
  };
}

export type PatternPlayer = ReturnType<typeof createPatternPlayer>;

let productionPlayer: PatternPlayer | undefined;
/** The app's single pattern player, created by the first Code Strip. */
export function setProductionPatternPlayer(player: PatternPlayer | undefined) { productionPlayer = player; }
/** Sounding pattern notes, for the Stage's production note sources. */
export function getActivePatternStageNotes(): readonly ActiveNote[] {
  return productionPlayer?.getActiveNotes() ?? [];
}

export function getPatternPlaybackDiagnostics() {
  return { activeTransports: productionPlayer ? 1 : 0, playing: productionPlayer?.isPlaying ?? false };
}
