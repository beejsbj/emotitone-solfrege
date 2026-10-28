import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { disposePinia, setActivePinia, type Pinia } from "pinia";
import { useMusicStore } from "@/stores/music";
import { createTestPinia } from "../helpers/test-utils";
import { attachLiveCore, type LiveSeat } from "../helpers/liveCore";

const seat = vi.hoisted(() => ({ renderer: null, listeners: new Set() }) as LiveSeat);
vi.mock("@/services/livePlayback", async () => (await import("../helpers/liveCore")).livePlaybackOn(seat));

/** Live note state follows the worklet's own voices (the only renderer). */
describe("Music Store live note semantics", () => {
  let pinia: Pinia;
  let live: ReturnType<typeof attachLiveCore>;
  const dispatched = () => vi.mocked(window.dispatchEvent).mock.calls.map(([event]) => event as CustomEvent);

  beforeEach(() => {
    pinia = createTestPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
    vi.spyOn(window, "dispatchEvent");
    seat.listeners.clear();
    live = attachLiveCore(seat);
  });

  afterEach(() => {
    disposePinia(pinia);
    vi.restoreAllMocks();
  });

  it("keeps symbolic note state for the voice the worklet starts", async () => {
    const musicStore = useMusicStore();

    const owner = await musicStore.attackNote(0);
    live.render(20);

    expect(owner).toMatch(/^held_/);
    expect(live.core.voiceCount).toBe(1);
    expect(musicStore.activeNotes.size).toBe(1);
    expect(musicStore.isPlaying).toBe(true);
    const played = dispatched().find((event) => event.type === "note-played")!;
    expect(played.detail).toMatchObject({ noteName: "C4", source: "live-play-style" });
    expect(musicStore.isNoteActive(played.detail.noteId)).toBe(true);
  });

  it("releases by input owner: the worklet ends the voice and the store follows", async () => {
    const musicStore = useMusicStore();
    const owner = await musicStore.attackNote(0);
    live.render(20);

    await musicStore.releaseNote(owner!);
    live.render(20);

    expect(live.core.voiceCount).toBe(0);
    expect(musicStore.activeNotes.size).toBe(0);
    expect(musicStore.isPlaying).toBe(false);
    const types = dispatched().map((event) => event.type);
    expect(types.indexOf("note-played")).toBeGreaterThanOrEqual(0);
    expect(types.indexOf("note-played")).toBeLessThan(types.indexOf("note-released"));
  });

  it("releases every live input together", async () => {
    const musicStore = useMusicStore();

    await musicStore.attackNote(0);
    await musicStore.attackNote(2);
    live.render(20);
    expect(musicStore.activeNotes.size).toBe(2);
    await musicStore.releaseAllNotes();
    live.render(20);

    expect(live.core.voiceCount).toBe(0);
    expect(musicStore.activeNotes.size).toBe(0);
  });
});
