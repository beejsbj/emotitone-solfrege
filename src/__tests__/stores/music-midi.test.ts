import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

vi.unmock("@/services/music");
vi.unmock("@/data");

import { useMusicStore } from "@/stores/music";
import { attachLiveCore, type LiveSeat } from "../helpers/liveCore";

const seat = vi.hoisted(() => ({ renderer: null, listeners: new Set() }) as LiveSeat);
vi.mock("@/services/livePlayback", async () => (await import("../helpers/liveCore")).livePlaybackOn(seat));

describe("music store MIDI helpers", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    seat.listeners.clear();
    attachLiveCore(seat);
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

  it("gives repeated attacks of the same pitch their own owners", async () => {
    const musicStore = useMusicStore();

    const first = await musicStore.attackNoteWithOctave(0, 4);
    const second = await musicStore.attackNoteWithOctave(0, 4);

    expect(first).toMatch(/^held_/);
    expect(second).toMatch(/^held_/);
    expect(first).not.toBe(second);
  });
});
