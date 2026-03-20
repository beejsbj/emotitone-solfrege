import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

vi.unmock("@/services/music");
vi.unmock("@/data");

import { useMusicStore } from "@/stores/music";

vi.mock("@/services/superdoughAudio", () => ({
  attackNote: vi.fn().mockResolvedValue(undefined),
  releaseNote: vi.fn(),
  releaseAll: vi.fn(),
  playNoteWithDuration: vi.fn().mockResolvedValue(undefined),
}));

describe("music store MIDI helpers", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("parses negative octaves from chromatic note strings", () => {
    const musicStore = useMusicStore();

    expect(musicStore.parseNoteInput("C-1")).toEqual({
      solfegeIndex: 0,
      octave: -1,
    });
  });

  it("maps wrapped scale tones back to the correct base octave", () => {
    const musicStore = useMusicStore();

    musicStore.setKey("B");
    musicStore.setMode("major");

    expect(musicStore.parseNoteInput("C#4")).toEqual({
      solfegeIndex: 1,
      octave: 3,
    });
  });

  it("normalizes flat note names when matching scale notes", () => {
    const musicStore = useMusicStore();

    musicStore.setKey("F");
    musicStore.setMode("major");

    expect(musicStore.parseNoteInput("Bb4")).toEqual({
      solfegeIndex: 3,
      octave: 4,
    });
  });

  it("creates a fresh note id for repeated attacks of the same pitch", async () => {
    const musicStore = useMusicStore();

    const firstNoteId = await musicStore.attackNoteWithOctave(0, 4);
    const secondNoteId = await musicStore.attackNoteWithOctave(0, 4);

    expect(firstNoteId).toMatch(/^C4_0_4_/);
    expect(secondNoteId).toMatch(/^C4_0_4_/);
    expect(firstNoteId).not.toBe(secondNoteId);
  });
});
