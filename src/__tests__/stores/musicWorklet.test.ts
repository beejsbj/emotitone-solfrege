import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, disposePinia, setActivePinia, type Pinia } from "pinia";
import type { LiveVoiceEvent } from "@/audio/live/types";

vi.unmock("@/services/music");
vi.unmock("@/data");
const worklet = vi.hoisted(() => ({
  listener: undefined as undefined | {
    onEvent(event: LiveVoiceEvent): void;
    onPlan(events: LiveVoiceEvent[]): void;
    onOwnerEnded(ownerId: string): void;
    onError(error: unknown): void;
  },
  engine: { press: vi.fn(), release: vi.fn(), configure: vi.fn(), clear: vi.fn(), dispose: vi.fn() },
  unsubscribe: vi.fn(),
}));
vi.mock("@/services/livePlayback", () => ({
  getLivePlayback: vi.fn(() => worklet.engine),
  subscribeLivePlayback: vi.fn(listener => { worklet.listener = listener; return worklet.unsubscribe; }),
  needsLivePlaybackPreparation: vi.fn(() => false),
}));

import { useMusicStore } from "@/stores/music";
import { usePatternsStore } from "@/stores/patterns";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { useInstrumentStore } from "@/stores/instrument";
import * as audio from "@/services/superdoughAudio";
import { getLivePlayback } from "@/services/livePlayback";
import { SCHEDULED_LIVE_MIDI_EVENT } from "@/services/scheduledLiveVoice";

const EPOCH = 1_800_000_000_000;
let pinia: Pinia;
let context: AudioContext;
let recorderStore: ReturnType<typeof usePatternsStore> | undefined;
const elapsed = () => Date.now() - EPOCH;
function events(type: string) {
  return vi.mocked(window.dispatchEvent).mock.calls
    .map(([event]) => event as CustomEvent).filter(event => event.type === type).map(event => event.detail);
}
function event(ownerId: string, noteId: string, phase: "attack" | "release", at: number, pitch = 60): LiveVoiceEvent {
  return { ownerId, noteId, phase, at, pitch, instrumentId: "piano", style: "repeat" };
}
function recorder() {
  recorderStore = usePatternsStore();
  return recorderStore;
}

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(EPOCH);
  vi.mocked(getLivePlayback).mockReturnValue(worklet.engine as never);
  vi.mocked(audio.attackNote).mockResolvedValue(undefined);
  vi.spyOn(window, "dispatchEvent");
  vi.spyOn(performance, "now").mockImplementation(() => 1000 + elapsed());
  context = Object.assign(new EventTarget(), {
    state: "running",
    getOutputTimestamp: () => ({ contextTime: 12, performanceTime: 1200 }),
  }) as unknown as AudioContext;
  Object.defineProperty(context, "currentTime", { configurable: true, get: () => 12 + elapsed() / 1000 });
  vi.mocked(audio.getAudioContext).mockReturnValue(context);
  pinia = createPinia(); setActivePinia(pinia);
  useVisualConfigStore().updateConfig("codeStrip", { bpm: 120 });
});
afterEach(() => {
  recorderStore?.removeEventListeners();
  recorderStore = undefined;
  disposePinia(pinia);
  vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers();
});

describe("music store production worklet integration", () => {
  it("records the renderer envelope and final release override as independent snapshots", async () => {
    const music = useMusicStore(); const patterns = recorder();
    const owner = await music.attackExactPitch("C4");
    const articulation = { attack: 0.015, decay: 0.08, sustain: 0.65, release: 0.03 };
    worklet.listener!.onEvent({ ...event(owner!, "envelope", "attack", 12), articulation });
    articulation.attack = 9;
    expect(events("note-played")[0].articulation).toEqual({ attack: 0.015, decay: 0.08, sustain: 0.65, release: 0.03 });

    const released = { attack: 0.015, decay: 0.08, sustain: 0.65, release: 0.008 };
    worklet.listener!.onEvent({ ...event(owner!, "envelope", "release", 12.05), articulation: released });
    released.release = 9;
    expect(events("note-released")[0].articulation).toEqual({ attack: 0.015, decay: 0.08, sustain: 0.65, release: 0.008 });
    expect(patterns.loggedNotes[0].articulation).toEqual({ attack: 0.015, decay: 0.08, sustain: 0.65, release: 0.008 });
    expect(events("note-played")[0].articulation.release).toBe(0.03);
    await music.releaseNote(owner!);
  });

  it("retains the captured envelope if a renderer reuses its event before forced close", async () => {
    const music = useMusicStore(); const patterns = recorder();
    const owner = await music.attackExactPitch("C4");
    const articulation = { attack: 0.015, decay: 0.08, sustain: 0.65, release: 0.03 };
    worklet.listener!.onEvent({ ...event(owner!, "reused", "attack", 12), articulation });
    articulation.attack = 9;
    await vi.advanceTimersByTimeAsync(50);
    worklet.listener!.onError(new Error("processor stopped"));
    expect(patterns.loggedNotes[0].articulation).toEqual({ attack: 0.015, decay: 0.08, sustain: 0.65, release: 0.03 });
  });

  it.each(["together", "repeat", "arp-up", "strum-up"] as const)("uses the captured %s style when renderer metadata is absent", async (style) => {
    const music = useMusicStore(); const patterns = recorder();
    const owner = await music.attackExactPitch("C4");
    worklet.listener!.onEvent({ ...event(owner!, "fallback", "attack", 12), style });
    worklet.listener!.onEvent({ ...event(owner!, "fallback", "release", 12.1), style });
    expect(patterns.loggedNotes[0].articulation).toEqual({
      attack: 0.001, decay: 0.001, sustain: 1,
      release: style === "repeat" || style === "arp-up" ? 0.03 : 0.2,
    });
    await music.releaseNote(owner!);
  });

  it("submits a prepared attack immediately and bypasses the per-note audio wrapper", async () => {
    const music = useMusicStore();
    const pending = music.attackExactPitch("C4");
    expect(worklet.engine.press).toHaveBeenCalledTimes(1);
    const owner = await pending;
    expect(worklet.engine.press).toHaveBeenCalledWith(owner, [{ pitch: 60, instrumentId: "piano" }]);
    expect(audio.attackNote).not.toHaveBeenCalled();
    expect(events("note-played")).toEqual([]);
    expect(music.activeNotes.size).toBe(0);
    worklet.listener!.onEvent(event(owner!, "live_1", "attack", 12));
    expect(music.activeNotes.has("live_1")).toBe(true);
    expect(events("note-played")).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
    await music.releaseNote(owner!);
    expect(worklet.engine.release).toHaveBeenCalledWith(owner);
    expect(audio.releaseNote).not.toHaveBeenCalled();
  });

  it("captures metadata before a native renderer emits its synchronous attack", async () => {
    const music = useMusicStore();
    worklet.engine.press.mockImplementationOnce((ownerId: string) => {
      worklet.listener!.onEvent(event(ownerId, "native_sync", "attack", 12));
    });
    const owner = await music.attackExactPitch("C4");
    expect(music.activeNotes.get("native_sync")).toMatchObject({ noteName: "C4" });
    expect(events("note-played")[0]).toMatchObject({ noteName: "C4", timestamp: EPOCH });
    await music.releaseNote(owner!);
    expect(worklet.engine.release).toHaveBeenCalledWith(owner);
  });

  it("records captured borrowed pitches at audio-clock times despite delayed event delivery", async () => {
    const music = useMusicStore(); const patterns = recorder();
    music.setPlayMode("repeat:16");
    const owner = await music.attackExactPitch("F#4");
    music.setKey("G"); music.setMode("minor");
    await vi.advanceTimersByTimeAsync(600);
    worklet.listener!.onEvent(event(owner!, "live_borrowed", "attack", 12.125, 66));
    const played = events("note-played")[0];
    expect(played).toMatchObject({ noteName: "F#4", key: "C", mode: "major", isBorrowed: true,
      timestamp: EPOCH + 125, midiTimestamp: 1125, audibleAt: 1325, mirrorMidi: false });
    expect(music.getActiveNotes()[0].audibleAt).toBe(1325);
    worklet.listener!.onEvent(event(owner!, "live_borrowed", "release", 12.225, 66));
    expect(patterns.loggedNotes.map(note => [note.note, note.pressTime, note.duration, note.key, note.isBorrowed]))
      .toEqual([["F#4", EPOCH + 125, 100, "C", true]]);
    expect(events("note-released")[0]).toMatchObject({ timestamp: EPOCH + 225, midiTimestamp: 1225 });
    expect(events("note-released")[0].audibleAt).toBeCloseTo(1425);
    expect(music.activeNotes.size).toBe(0);
    await music.releaseNote(owner!);
  });

  it("records worklet pulses with the Shape captured when the input was pressed", async () => {
    const music = useMusicStore(); const patterns = recorder();
    const instrument = useInstrumentStore();
    instrument.setSynthControl("room", 0.4);
    const owner = await music.attackExactPitch("C4");
    instrument.setSynthControl("room", 0.8);
    worklet.listener!.onEvent(event(owner!, "pulse_1", "attack", 12.01));
    worklet.listener!.onEvent(event(owner!, "pulse_1", "release", 12.02));
    worklet.listener!.onEvent(event(owner!, "pulse_2", "attack", 12.03));
    worklet.listener!.onEvent(event(owner!, "pulse_2", "release", 12.04));
    await music.releaseNote(owner!);
    expect(patterns.loggedNotes.map(note => [note.shape?.room, note.isStartingNewPattern])).toEqual([[0.4, true], [0.4, false]]);
  });

  it("retains owner context through physical release until delayed audio lifecycle is delivered", async () => {
    const music = useMusicStore(); const patterns = recorder();
    const owner = await music.attackExactPitch("C4");
    await music.releaseNote(owner!);
    expect(worklet.engine.release).toHaveBeenCalledTimes(1);
    // The render thread already sounded this attack before processing release,
    // but both notifications arrive after the main-thread key-up callback.
    await vi.advanceTimersByTimeAsync(300);
    worklet.listener!.onEvent(event(owner!, "live_delayed", "attack", 12.01));
    worklet.listener!.onEvent(event(owner!, "live_delayed", "release", 12.02));
    worklet.listener!.onOwnerEnded(owner!);
    expect(patterns.loggedNotes.map(note => [note.pressTime - EPOCH, note.duration])).toEqual([[10, 10]]);
    worklet.listener!.onEvent(event(owner!, "live_stale", "attack", 12.3));
    await music.releaseNote(owner!);
    expect(events("note-played")).toHaveLength(1);
    expect(worklet.engine.release).toHaveBeenCalledTimes(1);
    expect(music.activeNotes.size).toBe(0);
  });

  it("configures a shared engine once per mode/BPM change and retains independent release ownership", async () => {
    const music = useMusicStore();
    const c = await music.attackExactPitch("C4"); const e = await music.attackExactPitch("E4");
    worklet.engine.configure.mockClear();
    music.setPlayMode("arp-up:16");
    expect(worklet.engine.configure.mock.calls).toEqual([[{ style: "arp-up", rate: 16, bpm: 120 }]]);
    useVisualConfigStore().updateConfig("codeStrip", { bpm: 90 });
    expect(worklet.engine.configure).toHaveBeenLastCalledWith({ style: "arp-up", rate: 16, bpm: 90 });
    await music.releaseNote(c!);
    expect(worklet.engine.release.mock.calls).toEqual([[c]]);
    await music.releaseNote(e!);
    expect(worklet.engine.release.mock.calls).toEqual([[c], [e]]);
    expect(audio.attackNote).not.toHaveBeenCalled();
  });

  it("mirrors lookahead plans to MIDI, deduplicates unchanged plans, and cancels replaced future attacks", async () => {
    const music = useMusicStore(); const patterns = recorder();
    const owner = await music.attackExactPitch("C4");
    const attack = event(owner!, "live_old", "attack", 12.125);
    const release = event(owner!, "live_old", "release", 12.225);
    worklet.listener!.onPlan([attack, release]);
    expect(events(SCHEDULED_LIVE_MIDI_EVENT).map(detail => [detail.phase, detail.midiTimestamp]))
      .toEqual([["attack", 1125], ["release", 1225]]);
    worklet.listener!.onPlan([attack, release]);
    expect(events(SCHEDULED_LIVE_MIDI_EVENT)).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(50);
    worklet.listener!.onPlan([event(owner!, "live_new", "attack", 12.125), event(owner!, "live_new", "release", 12.225)]);
    expect(events(SCHEDULED_LIVE_MIDI_EVENT).slice(2).map(detail => [detail.noteId, detail.phase, detail.midiTimestamp]))
      .toEqual([["live_old", "cancel", 1050], ["live_new", "attack", 1125], ["live_new", "release", 1225]]);
    expect(patterns.loggedNotes).toEqual([]);
    expect(events("note-played")).toEqual([]);
    await music.releaseNote(owner!);
    worklet.listener!.onPlan([]);
    expect(events(SCHEDULED_LIVE_MIDI_EVENT).at(-1)).toMatchObject({ noteId: "live_new", phase: "cancel" });
  });

  it("does not replay completed planned MIDI when delayed lifecycle arrives after a UI stall", async () => {
    const music = useMusicStore(); const patterns = recorder();
    const owner = await music.attackExactPitch("C4");
    const attack = event(owner!, "delayed_plan", "attack", 12.125);
    const release = event(owner!, "delayed_plan", "release", 12.225);
    worklet.listener!.onPlan([attack, release]);
    await vi.advanceTimersByTimeAsync(600);
    worklet.listener!.onEvent(attack);
    worklet.listener!.onPlan([release]);
    worklet.listener!.onEvent(release);
    worklet.listener!.onPlan([]);
    expect(events(SCHEDULED_LIVE_MIDI_EVENT).map(detail => [detail.phase, detail.midiTimestamp]))
      .toEqual([["attack", 1125], ["release", 1225]]);
    expect(patterns.loggedNotes.map(note => [note.pressTime - EPOCH, note.duration])).toEqual([[125, 100]]);
  });

  it("replaces changed planned edges and republishes cancelled plans without replaying lifecycle", async () => {
    const music = useMusicStore();
    const owner = await music.attackExactPitch("C4");
    worklet.listener!.onPlan([event(owner!, "revised", "attack", 12.125), event(owner!, "revised", "release", 12.225)]);
    const attack = event(owner!, "revised", "attack", 12.15);
    const release = event(owner!, "revised", "release", 12.25);
    worklet.listener!.onPlan([attack, release]);
    worklet.listener!.onPlan([]);
    worklet.listener!.onPlan([attack, release]);
    worklet.listener!.onEvent(attack);
    worklet.listener!.onEvent(release);
    expect(events(SCHEDULED_LIVE_MIDI_EVENT).map(detail => detail.phase))
      .toEqual(["attack", "release", "cancel", "attack", "release", "cancel", "attack", "release"]);
  });

  it("keeps clear-all worklet releases on their actual audio lifecycle without duplicate legacy events", async () => {
    const music = useMusicStore(); const patterns = recorder();
    const owner = await music.attackExactPitch("C4");
    worklet.listener!.onEvent(event(owner!, "live_clear", "attack", 12));
    await vi.advanceTimersByTimeAsync(50);
    await music.releaseAllNotes();
    expect(worklet.engine.release).toHaveBeenCalledWith(owner);
    expect(events("note-released")).toHaveLength(0);
    worklet.listener!.onEvent(event(owner!, "live_clear", "release", 12.055));
    worklet.listener!.onOwnerEnded(owner!);
    expect(events("note-released")).toHaveLength(1);
    expect(patterns.loggedNotes.map(note => note.duration)).toEqual([55]);
    expect(music.activeNotes.size).toBe(0);
  });

  it("closes recording and cancels current/future MIDI when the processor fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const music = useMusicStore(); const patterns = recorder();
    const owner = await music.attackExactPitch("C4");
    worklet.listener!.onEvent(event(owner!, "custom_voice_id", "attack", 12));
    worklet.listener!.onPlan([event(owner!, "future_voice", "attack", 12.125)]);
    await vi.advanceTimersByTimeAsync(50);
    worklet.listener!.onError(new Error("processor failed"));
    expect(events("note-released")).toHaveLength(1);
    expect(patterns.loggedNotes.map(note => note.duration)).toEqual([50]);
    expect(events(SCHEDULED_LIVE_MIDI_EVENT).filter(detail => detail.phase === "cancel").map(detail => detail.noteId).sort())
      .toEqual(["custom_voice_id", "future_voice"]);
    expect(music.activeNotes.size).toBe(0);
    expect(music.isPlaying).toBe(false);
    worklet.listener!.onEvent(event(owner!, "future_voice", "attack", 12.125));
    expect(events("note-played")).toHaveLength(1);
    await music.releaseNote(owner!);
    expect(audio.releaseNote).not.toHaveBeenCalled();
  });

  it("preserves a fallback rhythmic owner and its cancellation when the idle worklet fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getLivePlayback).mockReturnValue(undefined);
    const music = useMusicStore();
    music.setPlayMode("repeat:16");
    const owner = await music.attackExactPitch("C4");
    await vi.advanceTimersByTimeAsync(5);
    const sounding = music.getActiveNotes()[0].noteId;
    worklet.listener!.onError(new Error("idle processor failed"));
    await music.releaseNote(owner!);
    expect(vi.mocked(audio.releaseNote).mock.calls.some(([id]) => id === sounding)).toBe(true);
    expect(audio.stopNote).toHaveBeenCalled();
    expect(music.activeNotes.size).toBe(0);
    const scheduled = vi.mocked(audio.attackNote).mock.calls.length;
    await vi.advanceTimersByTimeAsync(1000);
    expect(audio.attackNote).toHaveBeenCalledTimes(scheduled);
  });

  it("rejects pitches outside Tonal's MIDI range before submitting either renderer", async () => {
    const music = useMusicStore();
    expect(await music.attackExactPitch("C10")).toBeNull();
    expect(worklet.engine.press).not.toHaveBeenCalled();
    expect(audio.attackNote).not.toHaveBeenCalled();
  });

  it("closes a suspended voice at the frozen audio clock despite delayed statechange and release messages", async () => {
    const music = useMusicStore(); const patterns = recorder();
    const owner = await music.attackExactPitch("C4");
    worklet.listener!.onEvent(event(owner!, "paused_voice", "attack", 12));
    worklet.listener!.onPlan([event(owner!, "after_pause", "attack", 12.2)]);
    await vi.advanceTimersByTimeAsync(100);
    Object.defineProperty(context, "currentTime", { configurable: true, value: 12.1 });
    Object.defineProperty(context, "state", { configurable: true, value: "suspended" });
    await vi.advanceTimersByTimeAsync(500);
    context.dispatchEvent(new Event("statechange"));
    expect(worklet.engine.release).toHaveBeenCalledWith(owner);
    expect(events("note-released")[0]).toMatchObject({ timestamp: EPOCH + 100, midiTimestamp: 1100 });
    expect(patterns.loggedNotes.map(note => note.duration)).toEqual([100]);
    expect(events(SCHEDULED_LIVE_MIDI_EVENT).filter(detail => detail.phase === "cancel").map(detail => [detail.noteId, detail.midiTimestamp]).sort())
      .toEqual([["after_pause", 1600], ["paused_voice", 1600]]);
    worklet.listener!.onEvent(event(owner!, "paused_voice", "release", 12.1));
    worklet.listener!.onEvent(event(owner!, "after_pause", "attack", 12.2));
    worklet.listener!.onOwnerEnded(owner!);
    expect(events("note-played")).toHaveLength(1);
    expect(events("note-released")).toHaveLength(1);
    expect(music.activeNotes.size).toBe(0);
  });

  it("closes recording before store disposal unsubscribes from delayed worklet events", async () => {
    const music = useMusicStore(); const patterns = recorder();
    const owner = await music.attackExactPitch("C4");
    worklet.listener!.onEvent(event(owner!, "disposed_voice", "attack", 12));
    worklet.listener!.onPlan([event(owner!, "disposed_future", "attack", 12.2)]);
    await vi.advanceTimersByTimeAsync(100);
    music.$dispose();
    // MessagePort responses arrive after this scope has unsubscribed.
    expect(worklet.engine.release).toHaveBeenCalledWith(owner);
    expect(events("note-released")).toHaveLength(1);
    expect(patterns.loggedNotes.map(note => note.duration)).toEqual([100]);
    expect(events(SCHEDULED_LIVE_MIDI_EVENT).filter(detail => detail.phase === "cancel").map(detail => detail.noteId).sort())
      .toEqual(["disposed_future", "disposed_voice"]);
    expect(worklet.unsubscribe).toHaveBeenCalledOnce();
    expect(worklet.unsubscribe.mock.invocationCallOrder[0]).toBeGreaterThan(vi.mocked(window.dispatchEvent).mock.invocationCallOrder.at(-1)!);
  });

  it("instrument selection releases held worklet owners while retaining their final event metadata", async () => {
    const music = useMusicStore(); const patterns = recorder();
    const owner = await music.attackExactPitch("C4");
    worklet.listener!.onEvent(event(owner!, "live_selection", "attack", 12));
    useInstrumentStore().selectionEpoch++;
    expect(worklet.engine.release).toHaveBeenCalledWith(owner);
    worklet.listener!.onEvent(event(owner!, "live_selection", "release", 12.1));
    worklet.listener!.onOwnerEnded(owner!);
    expect(patterns.loggedNotes.map(note => note.duration)).toEqual([100]);
    expect(music.activeNotes.size).toBe(0);
  });
});
