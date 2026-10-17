/**
 * Plays a recorded or library pattern on the live worklet's transport
 * (BJS-485). No Strudel scheduler: the audio thread schedules every note.
 *
 * The main thread owns three things here:
 * - preparation: the pattern's instrument must be resident in the worklet
 *   (and stay pinned) before any table refers to it;
 * - note events: numeric worklet records become the app's `note-played` /
 *   `note-released` events with each note's immutable identity, plus an
 *   active-note registry that Stage hydration reads;
 * - UIBeat: the bar the listener hears, from the published tempo anchors.
 */
import { holdAudioActivity, resumeAudioContext } from "@/services/audioLifecycle";
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
import { barAtFrame, bpmAtFrame, type TempoAnchor } from "@/audio/live/tempoMap";
import type { TransportCommand, TransportResponse } from "@/audio/live/transport";
import { readTransportEvents, TransportEventKind, type DecodedTransportEvent } from "@/audio/live/transportEvents";
import { uiBeatClock as defaultUIBeatClock, type UIBeatClock } from "@/composables/useUIBeat";
import type { ActiveNote } from "@/types/music";

/** Event source of transport notes; the recorder ignores it (it is never a performance). */
export const PATTERN_PLAYBACK_SOURCE = "pattern-playback";
const PIN_HOLDER = "pattern-transport";
const BEATS_PER_BAR = 4;

/** The pattern's instrument could not be put in the worklet. */
export class PatternLoadError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
    this.name = "PatternLoadError";
  }
}

export interface PatternRequest extends Omit<PatternMemberRequest, "generation" | "instrumentId"> {
  /** Playback tempo in BPM (one bar is four beats). */
  bpm: number;
}

export interface PatternAudio {
  getContext(): AudioContext;
  /** Load the audio graph and catalog the instrument needs; no PCM for superdough. */
  ensureReady(instrument: string): Promise<AudioNode | null>;
}

interface Registered {
  note: ActiveNote;
  detail: Record<string, unknown>;
  generation: number;
}

export interface PatternPlayerOptions {
  audio: PatternAudio;
  uiBeat?: UIBeatClock;
  /** The transport stopped without being asked (renderer failure or rebuild). */
  onInterrupted?: (error: Error) => void;
  /** Where note events are dispatched; the window in production. */
  target?: EventTarget;
  now?: () => number;
  requestFrame?: (callback: () => void) => number;
  cancelFrame?: (handle: number) => void;
}

export function createPatternPlayer(options: PatternPlayerOptions) {
  const target = options.target ?? window;
  const uiBeat = options.uiBeat ?? defaultUIBeatClock;
  const now = options.now ?? (() => performance.now());
  const requestFrame = options.requestFrame ?? ((callback: () => void) => requestAnimationFrame(callback));
  const cancelFrame = options.cancelFrame ?? ((handle: number) => cancelAnimationFrame(handle));

  let port: LiveTransportPort | undefined;
  let context: AudioContext | undefined;
  let run = 0;
  let generation = 0;
  let requestId = 0;
  let playing = false;
  let current: { request: PatternRequest; member: PatternMember; instrumentId: string } | undefined;
  let releaseActivity: (() => void) | undefined;
  let releasePin: (() => void) | undefined;
  /** Every table of the current run, by generation: events resolve identity here. */
  const members = new Map<number, PatternMember>();
  const registry = new Map<string, Registered>();
  /** Released notes, kept briefly so a forced earlier release can still correct them. */
  const released = new Map<string, { audibleAt: number; detail: Record<string, unknown> }>();
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
    if (!playing) return;
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
    if (context?.state !== "running") {
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

  // --- Lifecycle -----------------------------------------------------------

  /** Put `instrument` in the worklet; the transport port that holds it. */
  async function prepare(instrument: string): Promise<{ port: LiveTransportPort; instrumentId: string }> {
    const instrumentId = resolveLiveSoundName(instrument);
    const destination = await options.audio.ensureReady(instrumentId);
    context = options.audio.getContext();
    await prepareLivePlayback(context, destination, instrumentId);
    const ready = getLiveTransport(instrumentId);
    if (ready) return { port: ready, instrumentId };
    const failure = getLivePlaybackFailure(instrumentId);
    throw new PatternLoadError(
      failure?.kind === "load"
        ? `${instrument} could not load: ${failure.reason}`
        : `${instrument} cannot play patterns on the worklet engine (${failure?.reason ?? "not prepared"})`,
      failure?.kind === "load",
    );
  }

  function build(request: PatternRequest, instrumentId: string): PatternMember {
    const member = buildPatternMember({ ...request, generation: ++generation, instrumentId });
    members.set(member.table.generation, member);
    return member;
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
    snapshot = undefined;
    anchors = [];
    current = undefined;
    stopBeat();
    releasePin?.();
    releasePin = undefined;
    releaseActivity?.();
    releaseActivity = undefined;
    return wasPlaying;
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
        releasePin = pinLivePlayback(PIN_HOLDER, [prepared.instrumentId]);
        const member = build(request, prepared.instrumentId);
        current = { request, member, instrumentId: prepared.instrumentId };
        playing = true;
        send({ type: "transport-change", requestId: ++requestId, boundary: "immediate",
          change: { type: "join", member: { table: member.table, offsetBars: 0, rate: 1, muted: false } } });
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
        if (!playing || attempt !== run || !current) return;
        const previous = current;
        let instrumentId = previous.instrumentId;
        if (resolveLiveSoundName(request.instrument) !== previous.instrumentId) {
          const prepared = await prepare(request.instrument);
          if (!playing || attempt !== run) return;
          if (prepared.port.generation !== port?.generation) throw new PatternLoadError("The audio engine restarted", true);
          instrumentId = prepared.instrumentId;
          releasePin?.();
          releasePin = pinLivePlayback(PIN_HOLDER, [instrumentId]);
        }
        const member = build(request, instrumentId);
        current = { request, member, instrumentId };
        if (request.bpm !== previous.request.bpm) {
          send({ type: "transport-change", requestId: ++requestId, boundary: "immediate", change: { type: "tempo", bpm: request.bpm } });
        }
        send({ type: "transport-change", requestId: ++requestId, boundary: "immediate",
          change: { type: "join", member: { table: member.table, offsetBars: 0, rate: 1, muted: false } } });
      });
      changes = task.catch(() => undefined);
      return task;
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
