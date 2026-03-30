import { beforeEach, describe, expect, it, vi } from "vitest";
import { setActivePinia } from "pinia";
import { useMusicStore } from "@/stores/music";
import * as superdoughAudio from "@/services/superdoughAudio";
import { createTestPinia } from "../helpers/test-utils";

describe("Music Store live note semantics", () => {
  beforeEach(() => {
    setActivePinia(createTestPinia());
    vi.clearAllMocks();
  });

  it("keeps symbolic note state while delegating attack to the audio service", async () => {
    const musicStore = useMusicStore();

    const noteId = await musicStore.attackNote(0);

    expect(noteId).toMatch(/^C4_0_4_\d+_[a-z0-9]{6}$/);
    expect(musicStore.activeNotes.size).toBe(1);
    expect(musicStore.isPlaying).toBe(true);
    expect(vi.mocked(superdoughAudio.attackNote)).toHaveBeenCalledWith(
      noteId,
      "C4",
      expect.any(String),
    );
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "note-played",
        detail: expect.objectContaining({
          noteId,
          noteName: "C4",
        }),
      }),
    );
  });

  it("starts release immediately in app state while delegating audio release by note id", async () => {
    const musicStore = useMusicStore();
    const noteId = await musicStore.attackNote(0);

    await musicStore.releaseNote(noteId!);

    expect(musicStore.activeNotes.size).toBe(0);
    expect(musicStore.isPlaying).toBe(false);
    expect(vi.mocked(superdoughAudio.releaseNote)).toHaveBeenCalledWith(noteId);

    const dispatchedTypes = vi
      .mocked(window.dispatchEvent)
      .mock.calls
      .map(([event]) => (event as Event).type);
    expect(dispatchedTypes).toContain("note-played");
    expect(dispatchedTypes).toContain("note-released");
    expect(dispatchedTypes.indexOf("note-played")).toBeLessThan(dispatchedTypes.indexOf("note-released"));
  });

  it("releases all active live notes through the shared audio service", async () => {
    const musicStore = useMusicStore();

    await musicStore.attackNote(0);
    await musicStore.attackNote(2);
    musicStore.releaseAllNotes();

    expect(musicStore.activeNotes.size).toBe(0);
    expect(vi.mocked(superdoughAudio.releaseAll)).toHaveBeenCalledTimes(1);
  });
});
