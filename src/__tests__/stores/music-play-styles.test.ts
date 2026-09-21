import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, disposePinia, setActivePinia, type Pinia } from "pinia";

vi.unmock("@/services/music");
vi.unmock("@/data");

import { useMusicStore } from "@/stores/music";
import { usePatternsStore } from "@/stores/patterns";
import { useInstrumentStore } from "@/stores/instrument";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { logNotesToStrudel } from "@/services/StrudelNotation";
import * as audio from "@/services/superdoughAudio";

const EPOCH = 1_800_000_000_000;
let pinia: Pinia;

function noteEvents(type: string) {
  return vi.mocked(window.dispatchEvent).mock.calls
    .map(([event]) => event as CustomEvent)
    .filter((event) => event.type === type)
    .map((event) => event.detail);
}

function connectRecorder() {
  const patterns = usePatternsStore();
  const handlers = new Map<string, EventListener>();
  for (const [type, listener] of vi.mocked(window.addEventListener).mock.calls) {
    if (type === "note-played" || type === "note-released") handlers.set(type, listener as EventListener);
  }
  vi.mocked(window.dispatchEvent).mockImplementation((event) => {
    handlers.get(event.type)?.(event);
    return true;
  });
  return patterns;
}

describe("live styles through music, recording, and Strudel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(EPOCH);
    vi.spyOn(window, "addEventListener").mockImplementation(() => {});
    vi.mocked(audio.attackNote).mockResolvedValue(undefined);
    vi.spyOn(performance, "now").mockImplementation(() => Date.now() - EPOCH);
    vi.mocked(audio.getAudioContext).mockImplementation(() => ({
      currentTime: performance.now() / 1000,
    } as AudioContext));
    pinia = createPinia();
    setActivePinia(pinia);
    useVisualConfigStore().updateConfig("codeStrip", { bpm: 120 });
  });

  afterEach(() => {
    disposePinia(pinia);
    vi.mocked(window.dispatchEvent).mockReset();
    vi.clearAllTimers();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each(["solfege", "exact"] as const)("records the full normal envelope for %s fallback input", async (input) => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    const owner = await (input === "exact" ? music.attackExactPitch("C4") : music.attackNote(0));
    await vi.advanceTimersByTimeAsync(200);
    await music.releaseNote(owner!);

    const expected = { attack: 0.001, decay: 0.001, sustain: 1, release: 0.2 };
    expect(noteEvents("note-played")[0].articulation).toEqual(expected);
    expect(noteEvents("note-released")[0].articulation).toEqual(expected);
    expect(patterns.loggedNotes[0].articulation).toEqual(expected);
  });

  it.each(["together", "repeat"])("isolates %s fallback events from later release snapshots", async (style) => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayStyle(style);
    const owner = await music.attackExactPitch("C4");
    await vi.advanceTimersByTimeAsync(10);
    noteEvents("note-played")[0].articulation.release = 9;
    await vi.advanceTimersByTimeAsync(200);
    await music.releaseNote(owner!);
    expect(patterns.loggedNotes[0].articulation).toEqual({
      attack: 0.001, decay: 0.001, sustain: 1, release: style === "repeat" ? 0.03 : 0.2,
    });
    music.setPlayStyle("together");
    const nextOwner = await music.attackExactPitch("E4");
    await music.releaseNote(nextOwner!);
    expect(patterns.loggedNotes.at(-1)?.articulation?.release).toBe(0.2);
  });

  it.each(["solfege", "exact"] as const)("records the full %s input hold when the fallback attack resolves late", async (input) => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    let finishAttack!: (startedAt: number) => void;
    vi.mocked(audio.attackNote).mockImplementationOnce(() => new Promise<number>((resolve) => {
      finishAttack = resolve;
    }));

    const pendingOwner = input === "exact" ? music.attackExactPitch("C4") : music.attackNote(0);
    expect(audio.attackNote).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(200);
    expect(noteEvents("note-played")).toEqual([]);
    expect(patterns.loggedNotes).toEqual([]);
    finishAttack(0.2);
    const owner = await pendingOwner;

    await vi.advanceTimersByTimeAsync(300);
    await music.releaseNote(owner!);
    expect(patterns.loggedNotes.map(note => [note.note, note.pressTime, note.releaseTime, note.duration]))
      .toEqual([["C4", EPOCH, EPOCH + 500, 500]]);
    expect(noteEvents("note-played")[0]).toMatchObject({ timestamp: EPOCH, audibleAt: 200 });
    expect(music.activeNotes.size).toBe(0);
  });

  it.each(["repeat", "arp-up", "arp-up-down", "strum-down"])("records the full %s fallback envelope", async (style) => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayStyle(style);
    const owners = await Promise.all(["C4", "E4", "G4"].map(pitch => music.attackExactPitch(pitch)));
    await vi.advanceTimersByTimeAsync(710);
    await Promise.all(owners.map(owner => music.releaseNote(owner!)));

    const expected = { attack: 0.001, decay: 0.001, sustain: 1, release: style === "strum-down" ? 0.2 : 0.03 };
    expect(patterns.loggedNotes.length).toBeGreaterThanOrEqual(3);
    for (const type of ["note-played", "note-released"]) {
      expect(noteEvents(type).map(note => note.articulation)).toEqual(
        patterns.loggedNotes.map(() => expected),
      );
    }
    expect(patterns.loggedNotes.map(note => note.articulation)).toEqual(patterns.loggedNotes.map(() => expected));
  });

  it("cancels held output on audio suspension and preserves wall-clock position after resume", async () => {
    let pausedAt: number | undefined;
    let pausedDuration = 0;
    const context = Object.assign(new EventTarget(), { state: "running" });
    Object.defineProperty(context, "currentTime", {
      get: () => 12 + ((pausedAt ?? performance.now()) - pausedDuration) / 1000,
    });
    vi.mocked(audio.getAudioContext).mockReturnValue(context as unknown as AudioContext);
    const music = useMusicStore();
    music.setPlayMode("repeat:16");
    await music.attackExactPitch("C4");
    await vi.advanceTimersByTimeAsync(30);
    pausedAt = performance.now();
    context.state = "suspended";
    context.dispatchEvent(new Event("statechange"));
    expect(music.activeNotes.size).toBe(0);
    expect(noteEvents("note-released")[0].timestamp).toBe(EPOCH + 30);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(50);
    pausedDuration += performance.now() - pausedAt;
    pausedAt = undefined;
    context.state = "running";
    context.dispatchEvent(new Event("statechange"));
    const owner = await music.attackExactPitch("E4");
    await vi.advanceTimersByTimeAsync(5);
    expect(noteEvents("note-played").map(event => event.timestamp)).toEqual([EPOCH + 5, EPOCH + 85]);
    await music.releaseNote(owner!);
  });

  it("keeps musical timestamps while presenting repeat onset and release at estimated output", async () => {
    vi.mocked(audio.getAudioContext).mockImplementation(() => ({
      currentTime: performance.now() / 1000,
      getOutputTimestamp: () => ({ contextTime: 0, performanceTime: 200 }),
    } as AudioContext));
    const music = useMusicStore();
    music.setPlayMode("repeat:16");
    const owner = await music.attackExactPitch("C4");
    await vi.advanceTimersByTimeAsync(5);
    const played = noteEvents("note-played")[0];
    expect(played.timestamp).toBe(EPOCH + 5);
    expect(played.audibleAt).toBeCloseTo(205);
    expect(music.getActiveNotes()[0]?.audibleAt).toBeCloseTo(205);
    await vi.advanceTimersByTimeAsync(100);
    const released = noteEvents("note-released")[0];
    expect(released.timestamp).toBe(EPOCH + 105);
    expect(released.audibleAt).toBeCloseTo(305);
    await music.releaseNote(owner!);
  });

  it("uses the actual Together onset for presentation and the current output clock on release", async () => {
    vi.mocked(audio.getAudioContext).mockImplementation(() => ({
      currentTime: performance.now() / 1000,
      getOutputTimestamp: () => ({ contextTime: 0, performanceTime: 200 }),
    } as AudioContext));
    vi.mocked(audio.attackNote).mockResolvedValueOnce(0.012);
    const music = useMusicStore();
    const owner = await music.attackExactPitch("C4");
    expect(noteEvents("note-played")[0].audibleAt).toBeCloseTo(212);
    await vi.advanceTimersByTimeAsync(20);
    await music.releaseNote(owner!);
    expect(noteEvents("note-released")[0].audibleAt).toBeCloseTo(220);
  });

  it("records the generated arpeggio, with exact gates and rests in Strudel", async () => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayStyle("arp-up");
    const owners = await Promise.all(["C4", "E4", "G4"].map((pitch) => music.attackExactPitch(pitch)));
    await vi.advanceTimersByTimeAsync(710);
    await Promise.all(owners.map((owner) => music.releaseNote(owner!)));

    expect(patterns.loggedNotes.map((note) => [note.note, note.pressTime - EPOCH, note.duration])).toEqual([
      ["C4", 5, 200], ["E4", 255, 200], ["G4", 505, 200],
    ]);
    expect(noteEvents("note-released").map((note) => note.noteId).sort())
      .toEqual(noteEvents("note-played").map((note) => note.noteId).sort());
    expect(logNotesToStrudel(patterns.loggedNotes)).toContain("C4:0.001:0.03@0.1 ~@0.025 E4:0.001:0.03@0.1 ~@0.025 G4:0.001:0.03@0.1");
    expect(music.activeNotes.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("selects style and rate together while a note is held", async () => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    const owner = await music.attackExactPitch("C4");
    await vi.advanceTimersByTimeAsync(20);
    music.setPlayMode("repeat:16");
    expect([music.playStyle, music.playRate, music.playMode]).toEqual(["repeat", 16, "repeat:16"]);
    await vi.advanceTimersByTimeAsync(250);
    await music.releaseNote(owner!);
    expect(patterns.loggedNotes.map((note) => [note.pressTime - EPOCH, note.duration])).toEqual([
      [0, 20], [25, 100], [150, 100],
    ]);
    expect(patterns.loggedNotes.map(note => note.articulation?.release)).toEqual([0.2, 0.03, 0.03]);
    expect(patterns.dynamicPatterns).toHaveLength(1);
    expect(patterns.currentSketchNotes.map(note => note.articulation?.release)).toEqual([0.2, 0.03, 0.03]);
    music.setPlayMode("strum-down");
    expect(music.playMode).toBe("strum-down");
    music.setPlayMode("invalid:8");
    expect(music.playMode).toBe("strum-down");
  });

  it.each(["repeat", "arp-up", "arp-up-down"])(
    "schedules and records every %s sixteenth despite delayed callbacks", async (style) => {
      const music = useMusicStore();
      const patterns = connectRecorder();
      music.setPlayMode(`${style}:16`);
      const owners = await Promise.all(["C4", "E4", "G4"].map((pitch) => music.attackExactPitch(pitch)));
      await vi.advanceTimersByTimeAsync(30);
      for (let i = 0; i < 16; i++) {
        vi.setSystemTime(Date.now() + 40);
        await vi.advanceTimersByTimeAsync(20);
      }
      await Promise.all(owners.map((owner) => music.releaseNote(owner!)));
      await vi.advanceTimersByTimeAsync(1000);

      const cycle = style === "arp-up-down" ? ["C4", "E4", "G4", "E4"] : ["C4", "E4", "G4"];
      const expected = Array.from({ length: 8 }, (_, i) => {
        const at = 5 + i * 125;
        const pitches = style === "repeat" ? ["C4", "E4", "G4"] : [cycle[i % cycle.length]];
        return pitches.map((pitch) => [pitch, at, Math.min(100, 990 - at)]);
      }).flat();
      expect(patterns.loggedNotes.map((note) => [note.note, note.pressTime - EPOCH, note.duration]))
        .toEqual(expected);
      const canceled = new Set(vi.mocked(audio.stopNote).mock.calls.map(([id]) => id));
      expect(vi.mocked(audio.attackNote).mock.calls
        .filter((call) => call[3]!.atTime! * 1000 <= 990 && !canceled.has(call[0]))
        .map((call) => [call[1], Math.round(call[3]!.atTime! * 1000)] as const)
        .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])))
        .toEqual(expected.map(([pitch, at]) => [pitch, at]));
      expect(music.activeNotes.size).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("records staggered overlapping strum notes and stops on physical release", async () => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayStyle("strum-down");
    const owners = await Promise.all(["C4", "E4", "G4"].map((pitch) => music.attackExactPitch(pitch)));
    await vi.advanceTimersByTimeAsync(300);
    await Promise.all(owners.map((owner) => music.releaseNote(owner!)));
    const notes = [...patterns.loggedNotes];
    expect(notes.map((note) => [note.note, note.pressTime - EPOCH, note.duration])).toEqual([
      ["G4", 50, 250], ["E4", 85, 215], ["C4", 120, 180],
    ]);
    const code = logNotesToStrudel(notes);
    expect(code).toContain("~@0.0175");
    expect(code).toContain("~@0.035");
    expect(music.activeNotes.size).toBe(0);
  });

  it("records a newly held repeat pitch on the next prepared beat without retriggering its neighbors", async () => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayMode("repeat:16");
    const c = await music.attackExactPitch("C4");
    await vi.advanceTimersByTimeAsync(60);
    const e = await music.attackExactPitch("E4");
    await vi.advanceTimersByTimeAsync(180);
    await Promise.all([c, e].map((owner) => music.releaseNote(owner!)));
    await vi.advanceTimersByTimeAsync(1000);
    expect(patterns.loggedNotes.map((note) => [note.note, note.pressTime - EPOCH, note.duration])).toEqual([
      ["C4", 5, 100], ["C4", 130, 100], ["E4", 130, 100],
    ]);
    expect(music.activeNotes.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels superseded arpeggio audio and records only the final pitch at the original beat", async () => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayMode("arp-up:16");
    const owners = await Promise.all(["C4", "G4"].map((pitch) => music.attackExactPitch(pitch)));
    await vi.advanceTimersByTimeAsync(60);
    const originalG = vi.mocked(audio.attackNote).mock.calls.find((call) => call[1] === "G4")![0];
    const e = await music.attackExactPitch("E4");
    await vi.advanceTimersByTimeAsync(10);
    const replacementE = vi.mocked(audio.attackNote).mock.calls.find((call) => call[1] === "E4")![0];
    await music.releaseNote(e!);
    await vi.advanceTimersByTimeAsync(170);
    await Promise.all(owners.map((owner) => music.releaseNote(owner!)));
    await vi.advanceTimersByTimeAsync(1000);
    expect(audio.stopNote).toHaveBeenCalledWith(originalG);
    expect(audio.stopNote).toHaveBeenCalledWith(replacementE);
    expect(patterns.loggedNotes.map((note) => [note.note, note.pressTime - EPOCH, note.duration])).toEqual([
      ["C4", 5, 100], ["G4", 130, 100],
    ]);
    expect(noteEvents("note-played").map((note) => note.noteName)).toEqual(["C4", "G4"]);
    expect(music.activeNotes.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("changes style while held and the original note ID still releases its new output", async () => {
    const music = useMusicStore();
    const owner = await music.attackNoteWithOctave(0, 4);
    music.setPlayStyle("repeat");
    await vi.advanceTimersByTimeAsync(310);
    expect(noteEvents("note-played").map((event) => event.noteName)).toEqual(["C4", "C4", "C4"]);
    await music.releaseNote(owner!);
    await vi.advanceTimersByTimeAsync(1000);
    expect(noteEvents("note-played")).toHaveLength(3);
    expect(music.activeNotes.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("uses shared BPM and rate, and preserves captured borrowed pitch identity", async () => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayStyle("repeat");
    music.setPlayRate(16);
    useVisualConfigStore().updateConfig("codeStrip", { bpm: 60 });
    const owner = await music.attackExactPitch("F#4");
    music.setKey("G");
    await vi.advanceTimersByTimeAsync(500);
    await music.releaseNote(owner!);
    expect(patterns.loggedNotes.map((note) => [note.note, note.pressTime - EPOCH, note.duration])).toEqual([
      ["F#4", 5, 200], ["F#4", 255, 200],
    ]);
    expect(patterns.loggedNotes.every((note) => note.key === "C" && note.isBorrowed)).toBe(true);
  });

  it("keeps the held input when a mode change replaces an unresolved Together attack", async () => {
    const music = useMusicStore();
    let resolve!: () => void;
    vi.mocked(audio.attackNote).mockImplementationOnce(() => new Promise<void>((done) => { resolve = done; }));
    const pendingOwner = music.attackExactPitch("C4");
    music.setPlayStyle("repeat");
    await vi.advanceTimersByTimeAsync(10);
    resolve();
    const owner = await pendingOwner;
    expect(owner).toMatch(/^held_/);
    await vi.advanceTimersByTimeAsync(310);
    expect(noteEvents("note-played")).toHaveLength(2);
    await music.releaseNote(owner!);
    expect(music.activeNotes.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops every generated voice and timer when switching instruments", async () => {
    const music = useMusicStore();
    music.setPlayStyle("arp-up");
    const owner = await music.attackExactPitch("C4");
    await vi.advanceTimersByTimeAsync(1);
    useInstrumentStore().selectionEpoch += 1;
    await vi.advanceTimersByTimeAsync(1000);
    expect(noteEvents("note-played")).toHaveLength(0);
    expect(music.activeNotes.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    // A stale release must not stop another independently held input.
    music.setPlayStyle("together");
    const other = await music.attackExactPitch("E4");
    await music.releaseNote(owner!);
    expect(music.activeNotes.has(other!)).toBe(true);
  });

  it("releaseAll cancels queued notes and does not record the held source chord", async () => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayStyle("strum-up");
    await Promise.all(["C4", "E4", "G4"].map((pitch) => music.attackExactPitch(pitch)));
    await music.releaseAllNotes();
    await vi.advanceTimersByTimeAsync(1000);
    expect(patterns.loggedNotes).toEqual([]);
    expect(noteEvents("note-played")).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
