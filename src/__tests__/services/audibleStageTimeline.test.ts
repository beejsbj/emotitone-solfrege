import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAudibleStageTimeline } from "@/services/audibleStageTimeline";
import type { ActiveNote } from "@/types/music";

const note = (noteId: string, audibleAt?: number): ActiveNote => ({
  noteId, audibleAt, noteName: "C4", solfegeIndex: 0,
  solfege: { name: "Do", number: 1, emotion: "grounded", description: "tonic", texture: "clear" },
  frequency: 261.63, octave: 4, keyboardOctave: 4, mode: "major", key: "C",
});

function setup() {
  const source = new EventTarget();
  const registry = new Map<string, ActiveNote>();
  const timeline = createAudibleStageTimeline(source, () => [...registry.values()], () => Date.now());
  const events: Array<[string, unknown]> = [];
  for (const type of ["note-played", "note-released"]) {
    timeline.eventTarget.addEventListener(type, event => events.push([event.type, (event as CustomEvent).detail]));
  }
  const emit = (type: string, noteId: string, audibleAt?: number) => {
    const detail = { noteId, audibleAt, timestamp: 1_800_000_000_000, mirrorMidi: false };
    source.dispatchEvent(new CustomEvent(type, { detail }));
    return detail;
  };
  return { registry, timeline, events, emit };
}

describe("audible Stage timeline", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

  it("delays the registry and lifecycle together while retaining the original musical metadata", () => {
    const { registry, timeline, events, emit } = setup();
    const active = note("live", 50);
    registry.set(active.noteId, active);
    const attack = emit("note-played", active.noteId, 50);
    expect(timeline.getActiveNotes()).toEqual([]);
    expect(events).toEqual([]);
    vi.advanceTimersByTime(50);
    expect(timeline.getActiveNotes()).toEqual([active]);
    expect(events).toEqual([["note-played", attack]]);
    const release = emit("note-released", active.noteId, 100);
    registry.delete(active.noteId);
    vi.advanceTimersByTime(49);
    expect(timeline.getActiveNotes()).toEqual([active]);
    vi.advanceTimersByTime(1);
    expect(timeline.getActiveNotes()).toEqual([]);
    expect(events).toEqual([["note-played", attack], ["note-released", release]]);
    timeline.dispose();
  });

  it("retains a short note after its audio registry ends but before it reaches the output", () => {
    const { registry, timeline, events, emit } = setup();
    const active = note("short", 50);
    registry.set(active.noteId, active);
    emit("note-played", active.noteId, 50);
    vi.advanceTimersByTime(10);
    emit("note-released", active.noteId, 60);
    registry.delete(active.noteId);
    vi.advanceTimersByTime(40);
    expect(timeline.getActiveNotes()).toEqual([active]);
    expect(events.map(([type]) => type)).toEqual(["note-played"]);
    vi.advanceTimersByTime(10);
    expect(timeline.getActiveNotes()).toEqual([]);
    expect(events.map(([type]) => type)).toEqual(["note-played", "note-released"]);
    timeline.dispose();
  });

  it("cancels a pending presentation attack when an earlier release supersedes it", () => {
    const { registry, timeline, events, emit } = setup();
    registry.set("cancelled", note("cancelled", 100));
    emit("note-played", "cancelled", 100);
    emit("note-released", "cancelled", 150);
    emit("note-released", "cancelled", 80);
    registry.clear();
    vi.advanceTimersByTime(200);
    expect(events.map(([type]) => type)).toEqual(["note-released"]);
    expect(timeline.getActiveNotes()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    timeline.dispose();
  });

  it("filters already registered future notes and passes unclocked notes through immediately", () => {
    const { registry, timeline, events, emit } = setup();
    const immediate = note("humming");
    const pending = note("pattern", 100);
    registry.set(immediate.noteId, immediate);
    registry.set(pending.noteId, pending);
    expect(timeline.getActiveNotes()).toEqual([immediate]);
    emit("note-played", immediate.noteId);
    expect(events).toHaveLength(1);
    vi.advanceTimersByTime(100);
    expect(timeline.getActiveNotes()).toHaveLength(2);
    timeline.dispose();
  });

  it("removes pending work and source listeners on disposal", () => {
    const { registry, timeline, events, emit } = setup();
    registry.set("pending", note("pending", 100));
    emit("note-played", "pending", 100);
    emit("note-released", "pending", 200);
    timeline.dispose();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(300);
    emit("note-played", "later");
    expect(events).toEqual([]);
    expect(timeline.getActiveNotes()).toEqual([]);
  });
});
