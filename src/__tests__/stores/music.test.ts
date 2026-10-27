import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

vi.unmock("@/services/music");
vi.unmock("@/data");

import { useVisualConfigStore } from "@/stores/visualConfig";
import { useMusicStore } from "@/stores/music";
import { usePhrasesStore } from "@/stores/phrases";
import { useInstrumentStore } from "@/stores/instrument";
import { DEFAULT_INSTRUMENT } from "@/data/instruments";
import { getAudioContext } from "@/services/audioRuntime";
import { attachLiveCore, type LiveSeat } from "../helpers/liveCore";

const seat = vi.hoisted(() => ({ renderer: null, listeners: new Set() }) as LiveSeat);
vi.mock("@/services/livePlayback", async () => (await import("../helpers/liveCore")).livePlaybackOn(seat));

let live: ReturnType<typeof attachLiveCore>;
/** Render the worklet core so the voices it started or ended report back. */
const settle = async () => {
  for (let index = 0; index < 4; index++) await Promise.resolve();
  live.render(20);
};
const events = (spy: ReturnType<typeof vi.spyOn>, type: string) => spy.mock.calls
  .map(([event]) => event as CustomEvent).filter((event) => event.type === type);

/** The audio context sleeps, so the next press waits for it to wake. Returns the wake. */
function sleepAudio() {
  let wake!: () => void;
  const context = Object.assign(new EventTarget(), { state: "suspended", currentTime: 0 });
  Object.assign(context, { resume: vi.fn(() => new Promise<void>((resolve) => {
    wake = () => { Object.assign(context, { state: "running" }); context.dispatchEvent(new Event("statechange")); resolve(); };
  })) });
  vi.mocked(getAudioContext).mockReturnValue(context as unknown as AudioContext);
  return () => wake();
}

describe("music store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(getAudioContext).mockReturnValue({ state: "running", currentTime: 0 } as AudioContext);
    seat.listeners.clear();
    live = attachLiveCore(seat);
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
    expect(musicStore.currentScaleNotes).toEqual(["D", "E", "F", "G", "A", "A#", "C#"]);
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

  it("updates minor labels from the persisted learn preference without changing pitches", async () => {
    const store = useMusicStore();
    const display = useVisualConfigStore();
    store.setKey("A");
    store.setMode("minor");
    expect(store.solfegeData.map((note) => note.name)).toEqual(["Do", "Re", "Me", "Fa", "Sol", "Le", "Te"]);
    display.laBasedMinor = true;
    expect(store.solfegeData.map((note) => note.name)).toEqual(["La", "Ti", "Do", "Re", "Mi", "Fa", "Sol"]);
    const owner = await store.attackExactPitch("G#4");
    await settle();
    expect(store.getActiveNotes()[0]).toMatchObject({ noteName: "G#4", solfege: { name: "Si" } });
    await store.releaseNote(owner ?? undefined);
  });

  it("attacks borrowed chord tones through the exact-pitch seam without scale flooring", async () => {
    const musicStore = useMusicStore();
    const patternsStore = usePhrasesStore();
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

    musicStore.setKey("C");
    musicStore.setMode("major");
    const owner = await musicStore.attackExactPitch("D#4");
    await settle();

    // The exact pitch reaches the worklet, unfloored to the scale.
    expect(events(dispatchEventSpy, "note-played")[0].detail).toMatchObject({ noteName: "D#4", instrument: DEFAULT_INSTRUMENT });
    expect(musicStore.getActiveNotes()[0]).toMatchObject({
      noteName: "D#4",
      solfege: expect.objectContaining({ name: "Me" }),
      solfegeIndex: -1,
      pitchClassIndex: 3,
      octave: 4,
    });

    const playedEvent = dispatchEventSpy.mock.calls
      .map(([event]) => event)
      .find((event) => event.type === "note-played") as CustomEvent;
    patternsStore.handleNotePressed(playedEvent);

    await musicStore.releaseNote(owner ?? undefined);
    await settle();
    const releasedEvent = dispatchEventSpy.mock.calls
      .map(([event]) => event)
      .find((event) => event.type === "note-released") as CustomEvent;
    patternsStore.handleNoteReleased(releasedEvent);
    expect(patternsStore.takeNotes[0]).toMatchObject({
      note: "D#4",
      scaleDegree: 0,
      scaleIndex: -1,
      pitchClassIndex: 3,
      isBorrowed: true,
      // Solfège display data is no longer stored on each recorded note.
    });
    patternsStore.removeEventListeners();
  });

  it("keeps scientific and keyboard octave coordinates separate for exact pitches", async () => {
    const musicStore = useMusicStore();
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

    musicStore.setKey("G");
    musicStore.setMode("major");
    const owner = await musicStore.attackExactPitch("C5");
    await settle();

    expect(musicStore.getActiveNotes()[0]).toMatchObject({
      noteName: "C5",
      solfegeIndex: 3,
      pitchClassIndex: 0,
      octave: 5,
      keyboardOctave: 4,
    });
    const playedEvent = dispatchEventSpy.mock.calls
      .map(([event]) => event)
      .find((event) => event.type === "note-played") as CustomEvent;
    expect(playedEvent.detail).toMatchObject({
      noteName: "C5",
      solfegeIndex: 3,
      octave: 5,
      keyboardOctave: 4,
    });

    await musicStore.releaseNote(owner ?? undefined);
  });

  it("plays notes using the actual current mode degree count", async () => {
    const musicStore = useMusicStore();
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

    musicStore.setKey("F#");
    musicStore.setMode("chromatic");
    const owner = await musicStore.attackNote(11, 4);
    await settle();

    expect(events(dispatchEventSpy, "note-played")[0].detail).toMatchObject({ noteName: "F5", instrument: DEFAULT_INSTRUMENT });
    expect(musicStore.getActiveNotes()).toHaveLength(1);
    expect(musicStore.getActiveNotes()[0].solfege.name).toBe("Ti");
    expect(musicStore.getActiveNotes()[0].mode).toBe("chromatic");
    expect(musicStore.getActiveNotes()[0].key).toBe("F#");
    expect(musicStore.getActiveNotes()[0].pitchClassIndex).toBe(5);
    const notePlayedEvent = dispatchEventSpy.mock.calls.find(
      ([event]) => event.type === "note-played"
    )?.[0] as CustomEvent;
    expect(notePlayedEvent.detail.mode).toBe("chromatic");
    expect(notePlayedEvent.detail.key).toBe("F#");
    expect(notePlayedEvent.detail.pitchClassIndex).toBe(5);

    await musicStore.releaseNote(owner!);
    await settle();
    expect(live.core.voiceCount).toBe(0);
    expect(musicStore.getActiveNotes()).toHaveLength(0);
    const noteReleasedEvent = dispatchEventSpy.mock.calls.find(
      ([event]) => event.type === "note-released"
    )?.[0] as CustomEvent;
    expect(noteReleasedEvent.detail.mode).toBe("chromatic");
    expect(noteReleasedEvent.detail.key).toBe("F#");
    dispatchEventSpy.mockRestore();
  });

  it("shows the selected instrument's failed rebuild in the warm-up error", () => {
    {
      const instrument = useInstrumentStore();
      instrument.currentInstrument = "gm_violin";
      useMusicStore();
      const [listener] = seat.listeners;
      listener.onLoadError?.("gm_violin", "Soundfont refetch failed (offline)");
      expect(instrument.lastWarmupError).toBe("Soundfont refetch failed (offline)");
      expect(instrument.lastWarmupErrorInstrument).toBe("gm_violin");
      instrument.lastWarmupError = null;
      instrument.lastWarmupErrorInstrument = null;
      instrument.currentInstrument = "triangle";
      listener.onLoadError?.("gm_violin", "Another instrument failed");
      expect(instrument.lastWarmupError).toBeNull();
    }
  });

  it("refuses a press on a sound the worklet does not hold, and says why on the deck", async () => {
    // The worklet is the only renderer (BJS-495): no fallback plays it.
    seat.renderer = null;
    const instrumentStore = useInstrumentStore();
    const musicStore = useMusicStore();
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

    expect(await musicStore.attackExactPitch("C4")).toBeNull();
    expect(instrumentStore.lastWarmupError).toBe("No live renderer in this test");
    expect(instrumentStore.lastWarmupErrorInstrument).toBe(instrumentStore.currentInstrument);
    expect(events(dispatchEventSpy, "note-played")).toEqual([]);
    expect(musicStore.getActiveNotes()).toHaveLength(0);
  });

  it("refuses live note attacks while instrument samples are warming", async () => {
    const instrumentStore = useInstrumentStore();
    const musicStore = useMusicStore();
    instrumentStore.warmingInstrument = "gm_vibraphone";

    const owner = await musicStore.attackNote(0, 4);
    await settle();

    expect(owner).toBeNull();
    expect(live.core.voiceCount).toBe(0);
    expect(musicStore.getActiveNotes()).toHaveLength(0);
  });

  it("drops a press that wakes after the instrument selection changed", async () => {
    const instrumentStore = useInstrumentStore();
    const musicStore = useMusicStore();
    const wake = sleepAudio();

    const pending = musicStore.attackNote(0, 4);
    instrumentStore.selectionEpoch += 1;
    wake();
    expect(await pending).toBeNull();
    await settle();
    expect(live.core.voiceCount).toBe(0);
    expect(musicStore.getActiveNotes()).toHaveLength(0);
  });

  it("drops an exact press that wakes after the instrument changed", async () => {
    const instrumentStore = useInstrumentStore();
    const musicStore = useMusicStore();
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
    const wake = sleepAudio();

    const pending = musicStore.attackExactPitch("D#4");
    instrumentStore.selectionEpoch += 1;
    instrumentStore.currentInstrument = "gm_vibraphone";
    wake();
    expect(await pending).toBeNull();
    await settle();
    expect(live.core.voiceCount).toBe(0);
    expect(musicStore.getActiveNotes()).toHaveLength(0);
    expect(events(dispatchEventSpy, "note-played")).toEqual([]);
  });

  it.each(["exact", "melody"] as const)("does not publish a %s press whose input owner released while it waited", async (kind) => {
    const musicStore = useMusicStore();
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
    const wake = sleepAudio();
    let cancelled = false;

    const pending = kind === "exact"
      ? musicStore.attackExactPitch("D#4", () => cancelled)
      : musicStore.attackNoteWithOctave(0, 4, () => cancelled);
    cancelled = true;
    wake();
    expect(await pending).toBeNull();
    await settle();
    expect(live.core.voiceCount).toBe(0);
    expect(musicStore.getActiveNotes()).toHaveLength(0);
    expect(events(dispatchEventSpy, "note-played")).toEqual([]);
  });
});
