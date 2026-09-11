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

  it("records the generated arpeggio, with exact gates and rests in Strudel", async () => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayStyle("arp-up");
    const owners = await Promise.all(["C4", "E4", "G4"].map((pitch) => music.attackExactPitch(pitch)));
    await vi.advanceTimersByTimeAsync(710);
    await Promise.all(owners.map((owner) => music.releaseNote(owner!)));

    expect(patterns.loggedNotes.map((note) => [note.note, note.pressTime - EPOCH, note.duration])).toEqual([
      ["C4", 0, 200], ["E4", 250, 200], ["G4", 500, 200],
    ]);
    expect(noteEvents("note-released").map((note) => note.noteId).sort())
      .toEqual(noteEvents("note-played").map((note) => note.noteId).sort());
    expect(logNotesToStrudel(patterns.loggedNotes)).toContain("C4@0.1 ~@0.025 E4@0.1 ~@0.025 G4@0.1");
    expect(music.activeNotes.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("records staggered overlapping strum notes and stops on physical release", async () => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayStyle("strum-down");
    const owners = await Promise.all(["C4", "E4", "G4"].map((pitch) => music.attackExactPitch(pitch)));
    await vi.advanceTimersByTimeAsync(300);
    await Promise.all(owners.map((owner) => music.releaseNote(owner!)));
    const notes = [...patterns.loggedNotes].sort((a, b) => a.pressTime - b.pressTime);
    expect(notes.map((note) => [note.note, note.pressTime - EPOCH, note.duration])).toEqual([
      ["G4", 0, 300], ["E4", 35, 265], ["C4", 70, 230],
    ]);
    const code = logNotesToStrudel(notes);
    expect(code).toContain("~@0.0175");
    expect(code).toContain("~@0.035");
    expect(music.activeNotes.size).toBe(0);
  });

  it("changes style while held and the original note ID still releases its new output", async () => {
    const music = useMusicStore();
    const owner = await music.attackNoteWithOctave(0, 4);
    music.setPlayStyle("repeat");
    await vi.advanceTimersByTimeAsync(260);
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
    await vi.advanceTimersByTimeAsync(460);
    await music.releaseNote(owner!);
    expect(patterns.loggedNotes.map((note) => [note.note, note.pressTime - EPOCH, note.duration])).toEqual([
      ["F#4", 0, 200], ["F#4", 250, 200],
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
    await vi.advanceTimersByTimeAsync(260);
    expect(noteEvents("note-played")).toHaveLength(2);
    await music.releaseNote(owner!);
    expect(music.activeNotes.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops every generated voice and timer when switching instruments", async () => {
    const music = useMusicStore();
    music.setPlayStyle("arp-up");
    const owner = await music.attackExactPitch("C4");
    await vi.advanceTimersByTimeAsync(10);
    useInstrumentStore().selectionEpoch += 1;
    await vi.advanceTimersByTimeAsync(1000);
    expect(noteEvents("note-played")).toHaveLength(1);
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
