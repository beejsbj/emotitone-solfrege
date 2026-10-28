/**
 * Plays recorded or library patterns on the live worklet's transport
 * (BJS-485) as Looper members (BJS-491). The audio thread schedules every
 * note.
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
  /** Start the audio graph and load the catalog the instrument needs; returns the output node. */
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
  /** The newest table sent for it; undefined while the instrument loads (a cold join). */
  member?: PatternMember;
  /** The generation the transport is known to play (from the last applied receipt), and the one before. */
  applied?: number;
  previous?: number;
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
  /**
   * A Looper session recovers from a renderer rebuild; a lone pattern (the
   * Code Strip) stops. `holder`: the instrument whose worklet port holds the
   * transport, so an empty Looper (the latch's grid) can be brought back too.
   */
  let session: { bpm: number; target?: LooperKeyMode; soloId: string | null; holder?: string } | undefined;
  /** Set while a rebuilt renderer is awaited: the bar to continue from, and which rebuild it is. */
  let recovery: { bar: number; epoch: number } | undefined;
  const recoveryListeners = new Set<(recovering: boolean) => void>();
  /** Every change of recovery goes through here, so the UI can follow it. */
  function setRecovery(next: { bar: number; epoch: number } | undefined) {
    const was = Boolean(recovery);
    recovery = next;
    if (was !== Boolean(next)) for (const listener of [...recoveryListeners]) listener(Boolean(next));
  }
  let recoveryEpoch = 0;
  let pinSerial = 0;
  /** The bar the current run started at (0, or where a recovered run continued). */
  let startBar = 0;
  /** After a rebuild with no member to restore: the bar the next join starts the new run at. */
  let idleBar: number | undefined;
  let stopRecovery: (() => void) | undefined;
  let releaseActivity: (() => void) | undefined;
  const memberships = new Map<string, Membership>();
  /** Members whose leave or replacing re-join has been sent but not applied: they still play until then. */
  const leaving = new Set<Membership>();
  /**
   * Tables events may still name, by generation: each member's newest and
   * applied tables, tables in changes not yet answered, and tables with a
   * sounding note. Others are dropped as receipts arrive, so bends and pins
   * do not grow memory over a session.
   */
  const members = new Map<number, PatternMember>();
  /** Tables carried by changes awaiting their receipt, by request id. */
  const carried = new Map<number, { id: string; generation: number }[]>();
  const registry = new Map<string, Registered>();
  /** Released notes, kept briefly so a forced earlier release can still correct them. */
  const released = new Map<string, { audibleAt: number; detail: Record<string, unknown> }>();
  const receipts = new Map<number, (receipt: TransportReceipt) => void>();
  const interruptedListeners = new Set<(error: Error) => void>();
  function interrupted(error: Error) {
    options.onInterrupted?.(error);
    for (const listener of [...interruptedListeners]) listener(error);
  }
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
    // No renderer to tell (an empty Looper after a rebuild): nothing applied.
    if (!port) return Promise.resolve(cancelledReceipt(id));
    const receipt = new Promise<TransportReceipt>(resolve => receipts.set(id, resolve));
    const tables = (change.type === "batch" ? change.changes : [change]).flatMap(part =>
      part.type === "join" ? [part.member.table] : part.type === "replace" ? [part.table] : []);
    if (tables.length) carried.set(id, tables.map(table => ({ id: table.id, generation: table.generation })));
    send({ type: "transport-change", requestId: id, change, boundary });
    return receipt;
  }

  function settle(receipt: TransportReceipt) {
    const resolve = receipts.get(receipt.requestId);
    receipts.delete(receipt.requestId);
    const tables = carried.get(receipt.requestId);
    carried.delete(receipt.requestId);
    if (tables && !receipt.cancelled) for (const { id, generation: applied } of tables) {
      const entry = memberships.get(id) ?? [...leaving].find(old => old.request.id === id);
      if (entry && (entry.applied === undefined || applied > entry.applied)) {
        // One step of history: an event batch held back by a stalled main thread may still name it.
        entry.previous = entry.applied;
        entry.applied = applied;
      }
    }
    if (tables) prune();
    resolve?.(receipt);
  }

  function prune() {
    const keep = new Set<number>();
    for (const entry of [...memberships.values(), ...leaving.values()]) {
      for (const held of [entry.previous, entry.applied, entry.member?.table.generation]) if (held !== undefined) keep.add(held);
    }
    for (const tables of carried.values()) for (const { generation: held } of tables) keep.add(held);
    for (const entry of registry.values()) keep.add(entry.generation);
    for (const held of [...members.keys()]) if (!keep.has(held)) members.delete(held);
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
      // `velocity` stays as performed (the phrase store reads it); MIDI out reads
      // `playbackVelocity`, the level the take is heard at.
      velocity: note.velocity,
      playbackVelocity: note.playbackVelocity,
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
    if (!playing) return;
    // A receipt is always answered; ids from before a rebuild were already settled.
    if (response.type === "transport-applied") { settle(response); return; }
    if (recovery) return;
    if (response.type === "transport-events") {
      readTransportEvents(response, onEvent);
      // Keep only recent release corrections.
      if (released.size > 256) for (const noteId of [...released.keys()].slice(0, released.size - 256)) released.delete(noteId);
    } else if (response.type === "transport-anchors" && response.run === run) {
      anchors = response.anchors;
    }
  }

  const unsubscribe = subscribeLivePlayback({
    onEvent() {},
    onTransport,
    onRendererReset() {
      if (!playing) return;
      // A Looper recovers, an empty one (after a rebuild with nobody to restore) included.
      if (session && context) {
        suspendForRecovery();
        return;
      }
      halt(false);
      interrupted(new Error("The audio engine restarted; playback stopped"));
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
  }

  function stopBeat() {
    if (frame !== null) cancelFrame(frame);
    frame = null;
    if (beatGeneration !== undefined) uiBeat.stop(beatGeneration);
    beatGeneration = undefined;
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
    // A transport member has no fallback renderer: a bank refused for sample
    // memory is an explicit error, never a member whose notes make no sound.
    throw new PatternLoadError(
      failure?.kind === "load"
        ? `${instrument} could not load: ${failure.reason}`
        : failure?.budget
          ? `${instrument} cannot join: ${failure.reason}`
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
    // its next note, and a reload cannot fit inside the lookahead. Each pin
    // has its own holder, so a re-join can hold the new bank while the old
    // one plays on until the re-join's bar.
    entry.releasePin?.();
    entry.instrumentId = instrumentId;
    entry.releasePin = pinLivePlayback(`${PIN_HOLDER}:${id}:${++pinSerial}`, [instrumentId]);
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

  /**
   * Stop everything local; with `command`, also stop the worklet transport.
   * Notes on a fade-out ramp out there on their own unless `cut` (Stop All's
   * second tap) stops them with every release tail (BJS-598).
   */
  function halt(command: boolean, cut = false) {
    const wasPlaying = playing;
    if (command && port) send({ type: "transport-stop", requestId: ++requestId, ...(cut ? { cut: true } : {}) });
    playing = false;
    run++;
    for (const noteId of [...registry.keys()]) endNow(noteId);
    registry.clear();
    released.clear();
    members.clear();
    resolvePending();
    for (const entry of [...memberships.values(), ...leaving.values()]) entry.releasePin?.();
    memberships.clear();
    leaving.clear();
    snapshot = undefined;
    anchors = [];
    session = undefined;
    setRecovery(undefined);
    startBar = 0;
    idleBar = undefined;
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
    // A rebuild during a restore keeps the bar the first outage stopped at (the
    // old anchors would skip ahead by the outage); before the new run's anchors
    // arrive, the bar it was told to start from stands.
    const bar = recovery?.bar ?? idleBar ?? (anchors.length && context && port
      ? barAtFrame(anchors, context.currentTime * port.sampleRate, port.sampleRate) : startBar);
    idleBar = undefined;
    for (const noteId of [...registry.keys()]) endNow(noteId);
    registry.clear();
    released.clear();
    snapshot = undefined;
    resolvePending();
    setRecovery({ bar, epoch: ++recoveryEpoch });
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
      // Always settle after `restoring` is set, so `finally` can clear it
      // (with no bank to load the body would otherwise finish synchronously).
      await Promise.resolve();
      const attempt = run;
      try {
        // A further rebuild while banks load starts the restore again on the newest renderer.
        for (let epoch = recovery?.epoch; recovery && epoch !== undefined; epoch = recovery?.epoch) {
          const entries = [...memberships.entries()].filter(([, entry]) => entry.member);
          // An empty Looper is the latch's silent grid: its holder's bank brings it back.
          const instruments = new Set(entries.length ? entries.map(([, entry]) => entry.request.instrument)
            : session?.holder ? [session.holder] : []);
          let ready: LiveTransportPort | undefined;
          try {
            // Every bank first (each instrument once), then playback: the rebuilt
            // processor starts empty and the one-copy contract moved the PCM away.
            for (const instrument of instruments) {
              ready = (await prepare(instrument)).port;
              if (session) session.holder = instrument;
              if (attempt !== run || recovery?.epoch !== epoch) break;
            }
          } catch (error) {
            if (attempt === run && recovery && recovery.epoch !== epoch) continue;
            // The grid's bank was refused: it idles at this bar, as below.
            if (entries.length || attempt !== run || !recovery) throw error;
            ready = undefined;
          }
          if (attempt !== run || !session || !recovery) return;
          if (recovery.epoch !== epoch) continue;
          if (!ready) {
            // Nothing to bring back on: the next join starts the new run at this bar.
            idleBar = recovery.bar;
            setRecovery(undefined);
            port = undefined;
            anchors = [];
            return;
          }
          port = ready;
          anchors = [];
          run++;
          // Tables are rebuilt so their generations belong to the new run.
          members.clear();
          const joins = entries.map(([, entry]) => {
            entry.applied = entry.previous = undefined;
            build(entry);
            return joinChange(entry);
          });
          const solo = session.soloId;
          if (joins.length) void change({ type: "batch", changes: solo ? [...joins, { type: "solo", memberId: solo }] : joins });
          startBar = recovery.bar;
          setRecovery(undefined);
          send({ type: "transport-start", requestId: ++requestId, run, bpm: session.bpm, bar: startBar });
          return;
        }
      } catch (error) {
        if (attempt === run) {
          halt(false);
          interrupted(error instanceof Error ? error : new Error(String(error)));
        }
      } finally {
        restoring = undefined;
      }
    })();
  }

  function requireSession(): NonNullable<typeof session> {
    if (!playing || !session) throw new Error("The Looper is not running");
    return session;
  }

  // Validated before any state changes, so a bad value is refused at once and
  // the player, the worklet and the pins never disagree about it.
  function checkBoundary(boundary: TransportBoundary) {
    if (boundary !== "immediate" && !(typeof boundary === "object" && Number.isFinite(boundary?.bar))) {
      throw new RangeError("A boundary is 'immediate' or { bar } with a finite bar");
    }
  }
  function checkSettings(patch: Partial<LooperMemberSettings> & { lengthBars?: number }) {
    const { offsetBars, rate, muted, pinned, lengthBars } = patch;
    if (offsetBars !== undefined && !Number.isFinite(offsetBars)) throw new RangeError("offsetBars must be finite");
    if (rate !== undefined && !(Number.isFinite(rate) && rate > 0)) throw new RangeError("rate must be a positive number");
    if (muted !== undefined && typeof muted !== "boolean") throw new TypeError("muted must be true or false");
    if (pinned !== undefined && typeof pinned !== "boolean") throw new TypeError("pinned must be true or false");
    if (lengthBars !== undefined && !(Number.isFinite(lengthBars) && lengthBars > 0)) throw new RangeError("lengthBars must be a positive number");
  }
  /** A member must have a length to loop: its own, or its take's (an empty take has none). */
  function checkLoops(request: LooperMemberRequest) {
    if (request.lengthBars !== undefined) return;
    const { table } = buildPatternMember({ ...request, generation: 0, instrumentId: request.instrument });
    if (!(table.lengthBars > 0)) throw new RangeError(`${request.id} has no length to loop`);
  }
  function checkBpm(bpm: number) {
    if (!(Number.isFinite(bpm) && bpm >= 1 && bpm <= 1000)) throw new RangeError("bpm must be between 1 and 1000");
  }
  /** Run `check`; a failure becomes a rejected promise before anything changes. */
  function refusal(check: () => void): Promise<never> | undefined {
    try { check(); return undefined; } catch (error) { return Promise.reject(error); }
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
    // --- The Looper (BJS-491): several members on one bar grid ------------

    /**
     * Start the Looper with its first members: the first sets tempo and bar
     * one (the caller passes its tempo, key and mode as `bpm` and `target`).
     * The tap that calls this is the unlock gesture. Every member's bank is
     * prepared first; then all join and the transport starts at bar 0.
     */
    async start(request: {
      bpm: number;
      target: LooperKeyMode;
      members: readonly LooperMemberRequest[];
      /**
       * Where the run starts: a fixed bar, or the bar that makes `originAudioTime`
       * (an AudioContext time, seconds) bar 0, read when the start is sent.
       * Default bar 0, now.
       */
      at?: { bar: number } | { originAudioTime: number };
      /**
       * With no members: the latch's silent bar grid (Burooj, 2026-10-26). The
       * transport runs, and UIBeat with it, with nothing to play; `instrument`
       * names the live sound whose worklet holds the transport (the one about
       * to be played), prepared but not pinned.
       */
      grid?: { instrument: string };
    }): Promise<TransportReceipt> {
      // Checked before anything stops or changes, as join is.
      checkBpm(request.bpm);
      const at = request.at;
      if (at && !("bar" in at ? Number.isFinite(at.bar) : Number.isFinite(at.originAudioTime))) {
        throw new RangeError("A start is at a finite bar or origin time");
      }
      for (const memberRequest of request.members) { checkSettings(memberRequest); checkLoops(memberRequest); }
      halt(true);
      const attempt = run;
      const audioContext = options.audio.getContext();
      const unlocked = resumeAudioContext(audioContext);
      releaseActivity = holdAudioActivity();
      try {
        await unlocked;
        session = { bpm: request.bpm, target: { ...request.target }, soloId: null };
        const entries: [string, Membership][] = [];
        for (const memberRequest of request.members) {
          const prepared = await prepare(memberRequest.instrument);
          if (attempt !== run) return cancelledReceipt(0);
          port = prepared.port;
          session.holder = memberRequest.instrument;
          const entry: Membership = { request: memberRequest, settings: settingsOf(memberRequest) };
          memberships.set(memberRequest.id, entry);
          pin(memberRequest.id, entry, prepared.instrumentId);
          entries.push([memberRequest.id, entry]);
        }
        if (!entries.length && request.grid) {
          const prepared = await prepare(request.grid.instrument);
          if (attempt !== run) return cancelledReceipt(0);
          port = prepared.port;
          session.holder = request.grid.instrument;
        }
        if (!port) throw new Error("The Looper needs a member to start");
        playing = true;
        watchRecovery();
        const joins = entries.map(([, entry]) => { build(entry); return joinChange(entry); });
        if (joins.length) void change({ type: "batch", changes: joins });
        const id = ++requestId;
        const started = new Promise<TransportReceipt>(resolve => receipts.set(id, resolve));
        // Read after every bank has loaded, so a cold start still lands on its origin.
        startBar = !at ? 0 : "bar" in at ? at.bar
          : (audioContext.currentTime - at.originAudioTime) * request.bpm / (60 * BEATS_PER_BAR);
        send({ type: "transport-start", requestId: id, run, bpm: request.bpm, bar: startBar });
        startBeat(request.bpm);
        return started;
      } catch (error) {
        if (attempt === run) halt(false);
        throw error;
      }
    },

    /**
     * Join a member (or replace one with the same id). A cold instrument
     * loads first while the others keep playing; a bank refused for sample
     * memory throws PatternLoadError with `budget` set and nothing joins.
     */
    async join(request: LooperMemberRequest, boundary: TransportBoundary = "immediate"): Promise<TransportReceipt> {
      requireSession();
      checkSettings(request);
      checkBoundary(boundary);
      checkLoops(request);
      const previous = memberships.get(request.id);
      const entry: Membership = { request, settings: settingsOf(request, previous?.settings), instrumentId: previous?.instrumentId };
      memberships.set(request.id, entry);
      /** The join never happened: no member, no pin of its own, no solo naming it. */
      const undo = () => {
        if (memberships.get(request.id) !== entry) return;
        entry.releasePin?.();
        entry.releasePin = undefined;
        if (previous) memberships.set(request.id, previous);
        else {
          memberships.delete(request.id);
          // A solo tapped while it loaded named a member that never came: lift it.
          if (session?.soloId === request.id && playing) {
            session.soloId = null;
            void change({ type: "solo", memberId: null });
          }
        }
      };
      // Still ours, in a live Looper: not left, replaced or stopped while loading.
      const ours = () => playing && Boolean(session) && memberships.get(request.id) === entry;
      let prepared!: Awaited<ReturnType<typeof prepare>>;
      let restart = false;
      // A rebuild (or another join restarting the run) while the bank loads is
      // not the end of this join: load again against the renderer now current.
      for (let attempt = 0; ; attempt++) {
        const epoch = recoveryEpoch;
        try {
          prepared = await prepare(request.instrument);
        } catch (error) {
          if (attempt < 3 && ours() && recoveryEpoch !== epoch) { await restoring?.catch(() => {}); continue; }
          undo();
          throw error;
        }
        if (!ours()) { undo(); return cancelledReceipt(0); }
        if (recovery) {
          if (attempt < 3 && restoring) { await restoring.catch(() => {}); continue; }
          undo();
          throw new PatternLoadError("The audio engine restarted", true);
        }
        // After a rebuild with nobody to restore, this join starts the new run.
        restart = idleBar !== undefined;
        if (restart) {
          port = prepared.port;
          session!.holder = request.instrument;
        }
        if (prepared.port.generation === port?.generation) break;
        if (attempt >= 3) { undo(); throw new PatternLoadError("The audio engine restarted", true); }
      }
      pin(request.id, entry, prepared.instrumentId);
      build(entry);
      // A re-join replaces the member only at its boundary: until then the
      // previous one plays on with its bank pinned and its tables known.
      if (previous) leaving.add(previous);
      // A solo naming it was sent as its own change (the transport keeps a
      // solo on a member not here yet), so a later un-solo always wins.
      const receipt = change(joinChange(entry), restart ? "immediate" : boundary);
      if (restart) {
        startBar = idleBar!;
        idleBar = undefined;
        anchors = [];
        send({ type: "transport-start", requestId: ++requestId, run: ++run, bpm: session!.bpm, bar: startBar });
      }
      void receipt.then(applied => {
        if (previous) leaving.delete(previous);
        if (applied.refused) {
          // Refused for any reason: it never happened (the previous member, if any, plays on).
          undo();
          return;
        }
        // The previous member's bank is released once it has stopped playing: when this join
        // applied, or when it was withdrawn (a leave or a later join), never while it sounds.
        if (previous && memberships.get(request.id) !== previous) previous.releasePin?.();
        prune();
      });
      return receipt;
    },

    /** Leave: the member's sounding notes finish their gates; its bank is unpinned. */
    leave(id: string, boundary: TransportBoundary = "immediate"): Promise<TransportReceipt> {
      const looper = requireSession();
      const refused = refusal(() => checkBoundary(boundary));
      if (refused) return refused;
      const entry = memberships.get(id);
      memberships.delete(id);
      if (entry) leaving.add(entry);
      if (looper.soloId === id) looper.soloId = null;
      const receipt = change({ type: "leave", memberId: id }, boundary);
      // Unpin once the leave has applied: until then the member still sounds.
      void receipt.then(() => {
        if (!entry) return;
        leaving.delete(entry);
        if (memberships.get(id) !== entry) entry.releasePin?.();
        prune();
      });
      return receipt;
    },

    /**
     * Fade members out over `bars` from now, then they leave (BJS-598): Stop All
     * and the Loop Dial's flick. They play on through the fade on one level
     * ramp to silence; the receipt answers when they have left, on the frame
     * the ramp reaches silence, and their banks stay pinned until then. A join
     * of one of them meanwhile brings it back at full level (its notes already
     * sounding fade on). Stop ends the fade early (its receipt says cancelled),
     * letting the notes already fading ramp out; a cut stops them too.
     */
    fadeOut(ids: readonly string[], bars = 1): Promise<TransportReceipt> {
      const looper = requireSession();
      const refused = refusal(() => {
        if (!ids.length) throw new RangeError("A fade-out names a member");
        if (!(Number.isFinite(bars) && bars > 0)) throw new RangeError("A fade-out lasts a positive number of bars");
      });
      if (refused) return refused;
      const entries: [string, Membership][] = [];
      for (const id of ids) {
        const entry = memberships.get(id);
        memberships.delete(id);
        if (entry) { leaving.add(entry); entries.push([id, entry]); }
        if (looper.soloId === id) looper.soloId = null;
      }
      const receipt = change({ type: "fade-out", memberIds: [...ids], bars });
      void receipt.then(() => {
        for (const [id, entry] of entries) {
          leaving.delete(entry);
          if (memberships.get(id) !== entry) entry.releasePin?.();
        }
        prune();
      });
      return receipt;
    },

    /**
     * Shift (offset), rate, mute or pin a member. Pinning swaps its table to
     * the recorded key and mode (or back to the bend) in the same change.
     */
    setMember(id: string, patch: Partial<LooperMemberSettings>, boundary: TransportBoundary = "immediate"): Promise<TransportReceipt> {
      requireSession();
      const refused = refusal(() => { checkSettings(patch); checkBoundary(boundary); });
      if (refused) return refused;
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
      const refused = refusal(() => {
        checkBoundary(boundary);
        if (id !== null && !memberships.has(id)) throw new RangeError(`${id} is not a member`);
      });
      if (refused) return refused;
      looper.soloId = id;
      const receipt = change({ type: "solo", memberId: id }, boundary);
      return id === null ? receipt : afterSilence(receipt);
    },

    setTempo(bpm: number, boundary: TransportBoundary = "immediate"): Promise<TransportReceipt> {
      const looper = requireSession();
      const refused = refusal(() => { checkBpm(bpm); checkBoundary(boundary); });
      if (refused) return refused;
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
      const refused = refusal(() => checkBoundary(boundary));
      if (refused) return refused;
      looper.target = { ...target };
      const parts: TransportSingleChange[] = [];
      for (const entry of memberships.values()) {
        if (!entry.member || entry.settings.pinned) continue;
        parts.push({ type: "replace", table: build(entry).table });
      }
      return parts.length ? change({ type: "batch", changes: parts }, boundary) : Promise.resolve(null);
    },

    /**
     * The transport bar sounding at `audioTime` (AudioContext seconds) on the
     * published tempo map; null while no run plays or its map has not arrived.
     * A live attack's audio time gives the bar it was played on.
     */
    barAtAudioTime(audioTime: number): number | null {
      if (!playing || recovery || !port || !anchors.length || !Number.isFinite(audioTime)) return null;
      return barAtFrame(anchors, audioTime * port.sampleRate, port.sampleRate);
    },

    /**
     * The bar the listener hears now: what the transport publishes to UIBeat
     * each frame (the output timestamp, so output latency included); null
     * while no run plays, the context is not running, or a restore is on.
     */
    heardBar(): number | null {
      if (!playing || recovery || !port || !anchors.length || context?.state !== "running") return null;
      const heard = heardFrame();
      return heard === null ? null : barAtFrame(anchors, heard, port.sampleRate);
    },

    /** Follow whether the engine is restoring a rebuilt renderer; returns the unsubscribe. */
    onRecoveryChange(listener: (recovering: boolean) => void): () => void {
      recoveryListeners.add(listener);
      return () => { recoveryListeners.delete(listener); };
    },

    /** Listen for the transport stopping without being asked; returns the unsubscribe. */
    onInterrupted(listener: (error: Error) => void): () => void {
      interruptedListeners.add(listener);
      return () => { interruptedListeners.delete(listener); };
    },

    /** The Looper as the transport plays it, for UI and tests. */
    getLooper() {
      return {
        running: playing && Boolean(session) && !recovery,
        recovering: Boolean(recovery),
        bpm: session?.bpm ?? null,
        target: session?.target ? { ...session.target } : null,
        soloId: session?.soloId ?? null,
        members: [...memberships.entries()].map(([id, entry]) => ({ id, ...entry.settings,
          generation: entry.member?.table.generation ?? null, loading: !entry.member })),
        /** Member tables held for event identity (bounded: see `members`). */
        tables: members.size,
      };
    },

    /** Stop the Looper; `cut` also silences fading notes and release tails at once (Stop All's second tap). */
    stop(options: { cut?: boolean } = {}) { halt(true, options.cut === true); },
    dispose() {
      halt(true);
      unsubscribe();
    },
  };
}

export type PatternPlayer = ReturnType<typeof createPatternPlayer>;

let productionPlayer: PatternPlayer | undefined;
const productionListeners = new Set<(player: PatternPlayer | undefined) => void>();
/** The app's single pattern player, created by the first Code Strip. */
export function setProductionPatternPlayer(player: PatternPlayer | undefined) {
  if (player === productionPlayer) return;
  productionPlayer = player;
  for (const listener of [...productionListeners]) listener(player);
}
export function getProductionPatternPlayer(): PatternPlayer | undefined { return productionPlayer; }
/** Called when the production player is created or released (the Code Strip mounts or unmounts). */
export function onProductionPatternPlayer(listener: (player: PatternPlayer | undefined) => void): () => void {
  productionListeners.add(listener);
  return () => { productionListeners.delete(listener); };
}
/** Sounding pattern notes, for the Stage's production note sources. */
export function getActivePatternStageNotes(): readonly ActiveNote[] {
  return productionPlayer?.getActiveNotes() ?? [];
}

export function getPatternPlaybackDiagnostics() {
  return { activeTransports: productionPlayer ? 1 : 0, playing: productionPlayer?.isPlaying ?? false };
}
