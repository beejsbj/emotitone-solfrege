import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

vi.unmock("@/services/music");
vi.unmock("@/data");

import { useMusicStore } from "@/stores/music";

const superdoughMocks = vi.hoisted(() => ({
  attackNote: vi.fn().mockResolvedValue(undefined),
  releaseNote: vi.fn(),
  releaseAll: vi.fn(),
  playNoteWithDuration: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/superdoughAudio", () => ({
  attackNote: superdoughMocks.attackNote,
  releaseNote: superdoughMocks.releaseNote,
  releaseAll: superdoughMocks.releaseAll,
  playNoteWithDuration: superdoughMocks.playNoteWithDuration,
  initSuperdoughAudio: vi.fn().mockResolvedValue(undefined),
  isPrewarmed: vi.fn().mockReturnValue(true),
  prewarmSoundSamples: vi.fn().mockResolvedValue(undefined),
  getAudioContext: vi.fn(),
  emotitoneStrudelOutput: vi.fn(),
  stopStrudelVisuals: vi.fn(),
}));

describe("music store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    superdoughMocks.attackNote.mockClear();
    superdoughMocks.releaseNote.mockClear();
    superdoughMocks.releaseAll.mockClear();
    superdoughMocks.playNoteWithDuration.mockClear();
    if (typeof localStorage?.clear === "function") {
      localStorage.clear();
    }
  });

  it("exposes expanded mode metadata through computed state", () => {
    const musicStore = useMusicStore();

    musicStore.setKey("D");
    musicStore.setMode("harmonic minor");

    expect(musicStore.currentModeDefinition.label).toBe("Harmonic Minor");
    expect(musicStore.currentKeyDisplay).toBe("D Harmonic Minor");
    expect(musicStore.currentScale.degreeCount).toBe(7);
    expect(musicStore.currentScale.solfege.map((note) => note.name)).toEqual([
      "Do",
      "Re",
      "Me",
      "Fa",
      "Sol",
      "Le",
      "Ti",
    ]);
  });

  it("tracks dynamic scale notes for non-heptatonic modes", () => {
    const musicStore = useMusicStore();

    musicStore.setMode("major pentatonic");
    expect(musicStore.currentScale.degreeCount).toBe(5);
    expect(musicStore.currentScaleNotes).toEqual(["C", "D", "E", "G", "A"]);
    expect(musicStore.solfegeData.map((note) => note.name)).toEqual([
      "Do",
      "Re",
      "Mi",
      "Sol",
      "La",
    ]);
  });

  it("refreshes scale structure after mode changes even if the initial scale was already read", () => {
    const musicStore = useMusicStore();

    expect(musicStore.currentScale.degreeCount).toBe(7);
    expect(musicStore.solfegeData.map((note) => note.name)).toEqual([
      "Do",
      "Re",
      "Mi",
      "Fa",
      "Sol",
      "La",
      "Ti",
    ]);

    musicStore.setMode("minor blues");

    expect(musicStore.currentScale.degreeCount).toBe(6);
    expect(musicStore.solfegeData.map((note) => note.name)).toEqual([
      "Do",
      "Me",
      "Fa",
      "Se",
      "Sol",
      "Te",
    ]);
  });

  it("parses chromatic note input using deterministic fallback for sparse modes", () => {
    const musicStore = useMusicStore();

    musicStore.setMode("major pentatonic");
    expect(musicStore.parseNoteInput("F4")).toEqual({
      solfegeIndex: 2,
      octave: 4,
    });

    musicStore.setMode("chromatic");
    expect(musicStore.parseNoteInput("F#4")).toEqual({
      solfegeIndex: 6,
      octave: 4,
    });
  });

  it("plays notes using the actual current mode degree count", async () => {
    const musicStore = useMusicStore();
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

    musicStore.setKey("F#");
    musicStore.setMode("chromatic");
    const noteId = await musicStore.attackNote(11, 4);

    expect(noteId).toMatch(/^F5_11_4_/);
    expect(superdoughMocks.attackNote).toHaveBeenCalledWith(
      noteId,
      "F5",
      "piano"
    );
    expect(musicStore.getActiveNotes()).toHaveLength(1);
    expect(musicStore.getActiveNotes()[0].solfege.name).toBe("Ti");
    expect(musicStore.getActiveNotes()[0].mode).toBe("chromatic");
    expect(musicStore.getActiveNotes()[0].key).toBe("F#");
    const notePlayedEvent = dispatchEventSpy.mock.calls.find(
      ([event]) => event.type === "note-played"
    )?.[0] as CustomEvent;
    expect(notePlayedEvent.detail.mode).toBe("chromatic");
    expect(notePlayedEvent.detail.key).toBe("F#");

    await musicStore.releaseNote(noteId!);
    expect(superdoughMocks.releaseNote).toHaveBeenCalledWith(noteId);
    expect(musicStore.getActiveNotes()).toHaveLength(0);
    const noteReleasedEvent = dispatchEventSpy.mock.calls.find(
      ([event]) => event.type === "note-released"
    )?.[0] as CustomEvent;
    expect(noteReleasedEvent.detail.mode).toBe("chromatic");
    expect(noteReleasedEvent.detail.key).toBe("F#");
    dispatchEventSpy.mockRestore();
  });

  it("dispatches duration playback with the resolved note for the current mode", async () => {
    const musicStore = useMusicStore();

    musicStore.setMode("minor blues");
    const noteId = await musicStore.playNoteWithDuration(3, 4, "8n");

    expect(noteId).toContain("sdplay_");
    expect(superdoughMocks.playNoteWithDuration).toHaveBeenCalledWith(
      "F#4",
      250,
      "piano"
    );
  });
});
