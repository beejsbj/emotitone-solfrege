import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { createPinia, disposePinia, setActivePinia, type Pinia } from "pinia";
import { attachLiveCore, type LiveSeat } from "../helpers/liveCore";
import capturedPhrases from "../fixtures/persistence/phrases.v2.store-capture.json?raw";

vi.unmock("@/services/music");
vi.unmock("@/data");
const seat = vi.hoisted(() => ({ renderer: null, listeners: new Set() }) as LiveSeat);
vi.mock("@/services/livePlayback", async () => (await import("../helpers/liveCore")).livePlaybackOn(seat));
// The real Shape path: the instrument store's knobs reach the worklet core.
vi.mock("@/services/audioEngine", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/audioEngine")>(),
  initAudioEngine: vi.fn(async () => {}),
  prewarmSoundSamples: vi.fn(async () => {}),
  isPrewarmed: () => true,
  getReadySounds: () => [],
}));

import { useMusicStore } from "@/stores/music";
import { usePhrasesStore } from "@/stores/phrases";
import { useInstrumentStore } from "@/stores/instrument";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { logNotesToStrudel } from "@/services/StrudelNotation";
import { getAudioContext } from "@/services/audioRuntime";

/*
 * Live play styles through the music store, the recorder and the Strudel
 * export, on the real worklet core rendered on the test's clock (BJS-495:
 * the worklet is the only renderer, so Repeat, Arp and Strum are its own).
 * Each instrument is prepared with its catalogue articulation, as the loader
 * prepares it. Unlike the retired main-thread engine, a styled pulse starts
 * on the press itself: there is no scheduling lead.
 */
const EPOCH = 1_800_000_000_000;
let pinia: Pinia;
let recorderStore: ReturnType<typeof usePhrasesStore> | undefined;
let stopFollowing: () => void;

function noteEvents(type: string) {
  return vi.mocked(window.dispatchEvent).mock.calls
    .map(([event]) => event as CustomEvent)
    .filter((event) => event.type === type)
    .map((event) => event.detail);
}

function connectRecorder() {
  recorderStore = usePhrasesStore();
  return recorderStore;
}

/** The store leaves no main-thread timers behind (the core's own pump aside). */
function expectNoTimers() {
  stopFollowing();
  expect(vi.getTimerCount()).toBe(0);
}

describe("live styles through music, recording, and Strudel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(EPOCH);
    localStorage.removeItem("emotitone-visual-config");
    vi.spyOn(window, "dispatchEvent");
    vi.spyOn(performance, "now").mockImplementation(() => Date.now() - EPOCH);
    vi.mocked(getAudioContext).mockImplementation(() => ({
      state: "running",
      currentTime: performance.now() / 1000,
    } as AudioContext));
    seat.listeners.clear();
    stopFollowing = attachLiveCore(seat, {
      envelope: "catalog", instruments: ["piano", "triangle", "sine", "square", "sawtooth"],
    }).follow(() => getAudioContext().currentTime);
    pinia = createPinia();
    setActivePinia(pinia);
    // Expected envelopes below are piano's percussive articulation. Pin it
    // instead of inheriting the app default instrument.
    useInstrumentStore().currentInstrument = "piano";
    useVisualConfigStore().useEphemeralDefaults();
  });

  afterEach(() => {
    stopFollowing();
    recorderStore?.removeEventListeners();
    recorderStore = undefined;
    disposePinia(pinia);
    vi.clearAllTimers();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each(["solfege", "exact"] as const)("records the full normal envelope for %s input", async (input) => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    const owner = await (input === "exact" ? music.attackExactPitch("C4") : music.attackNote(0));
    await vi.advanceTimersByTimeAsync(200);
    await music.releaseNote(owner!);
    await vi.advanceTimersByTimeAsync(300);

    const expected = { attack: 0.001, decay: 0.001, sustain: 1, release: 0.2 };
    expect(noteEvents("note-played")[0].articulation).toEqual(expected);
    expect(noteEvents("note-released")[0].articulation).toEqual(expected);
    expect(patterns.takeNotes[0].articulation).toEqual(expected);
  });

  it.each(["together", "repeat"])("records the Shaped %s envelope and press-time Shape", async (style) => {
    const music = useMusicStore();
    const instrument = useInstrumentStore();
    const patterns = connectRecorder();
    music.setPlayStyle(style);
    instrument.setSynthControl("attack", 0.2);
    instrument.setSynthControl("release", 0.8);
    const owner = await music.attackExactPitch("C4");
    await vi.advanceTimersByTimeAsync(200);
    await music.releaseNote(owner!);
    await vi.advanceTimersByTimeAsync(1000);

    expect(patterns.takeNotes[0].articulation).toEqual({
      attack: 0.2, decay: 0.001, sustain: 1, release: style === "repeat" ? 0.03 : 0.8,
    });
    expect(patterns.takeContext.shape).toMatchObject({ attack: 0.2, release: 0.8 });
  });

  it("keeps a held repeat in one pattern while a Shape knob sweeps", async () => {
    const music = useMusicStore();
    const instrument = useInstrumentStore();
    const patterns = connectRecorder();
    music.setPlayMode("repeat:16");
    const owner = await music.attackExactPitch("C4");
    for (const cutoff of [6000, 3000, 1500]) {
      await vi.advanceTimersByTimeAsync(130);
      instrument.setSynthControl("cutoff", cutoff);
    }
    await vi.advanceTimersByTimeAsync(130);
    await music.releaseNote(owner!);
    await vi.advanceTimersByTimeAsync(1000);

    expect(patterns.takeNotes.length).toBeGreaterThan(3);
    expect(patterns.takeContext.shape.cutoff === 12000).toBe(true);

    // The next press carries the swept Shape and starts a new pattern.
    const next = await music.attackExactPitch("E4");
    await vi.advanceTimersByTimeAsync(20);
    await music.releaseNote(next!);
    await vi.advanceTimersByTimeAsync(300);
    expect(patterns.takeContext.shape).toMatchObject({ cutoff: 1500 });
  });

  it.each(["together", "repeat"])("isolates %s events from later release snapshots", async (style) => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayStyle(style);
    const owner = await music.attackExactPitch("C4");
    await vi.advanceTimersByTimeAsync(10);
    noteEvents("note-played")[0].articulation.release = 9;
    await vi.advanceTimersByTimeAsync(200);
    await music.releaseNote(owner!);
    await vi.advanceTimersByTimeAsync(300);
    expect(patterns.takeNotes[0].articulation).toEqual({
      attack: 0.001, decay: 0.001, sustain: 1, release: style === "repeat" ? 0.03 : 0.2,
    });
    music.setPlayStyle("together");
    const nextOwner = await music.attackExactPitch("E4");
    await vi.advanceTimersByTimeAsync(20);
    await music.releaseNote(nextOwner!);
    await vi.advanceTimersByTimeAsync(300);
    expect(patterns.takeNotes.at(-1)?.articulation?.release).toBe(0.2);
  });

  it.each(["repeat", "arp-up", "arp-up-down", "strum-down"])("records the full %s envelope", async (style) => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayStyle(style);
    const owners = await Promise.all(["C4", "E4", "G4"].map(pitch => music.attackExactPitch(pitch)));
    await vi.advanceTimersByTimeAsync(710);
    await Promise.all(owners.map(owner => music.releaseNote(owner!)));
    await vi.advanceTimersByTimeAsync(500);

    const expected = { attack: 0.001, decay: 0.001, sustain: 1, release: style === "strum-down" ? 0.2 : 0.03 };
    expect(patterns.takeNotes.length).toBeGreaterThanOrEqual(3);
    for (const type of ["note-played", "note-released"]) {
      expect(noteEvents(type).map(note => note.articulation)).toEqual(
        patterns.takeNotes.map(() => expected),
      );
    }
    expect(patterns.takeNotes.map(note => note.articulation)).toEqual(patterns.takeNotes.map(() => expected));
  });

  it.each([
    ['square', 'together', 0.12], ['sawtooth', 'strum-down', 0.12],
    ['square', 'repeat', 0.03], ['sawtooth', 'arp-up', 0.03],
    ['amSynth', 'strum-down', 0.12], ['fmSynth', 'together', 0.12], ['metalSynth', 'repeat', 0.03],
  ] as const)('captures the native %s envelope for high-pitch %s notes', async (instrument, style, release) => {
    await useInstrumentStore().setInstrument(instrument);
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayStyle(style);
    const owners = await Promise.all(['C7', 'E7'].map(pitch => music.attackExactPitch(pitch)));
    await vi.advanceTimersByTimeAsync(510);
    await Promise.all(owners.map(owner => music.releaseNote(owner!)));
    await vi.advanceTimersByTimeAsync(500);

    const expected = { attack: 0.003, decay: 0.001, sustain: 1, release };
    expect(patterns.takeNotes.length).toBeGreaterThanOrEqual(2);
    expect(patterns.takeContext.instrument).toBe(instrument);
    for (const logged of patterns.takeNotes) {
      expect(logged).toMatchObject({ articulation: expected });
      expect(['C7', 'E7']).toContain(logged.note);
    }
    for (const type of ['note-played', 'note-released']) {
      expect(noteEvents(type)).toHaveLength(patterns.takeNotes.length);
      for (const event of noteEvents(type)) expect(event).toMatchObject({ instrument, articulation: expected });
    }
    expect(music.activeNotes.size).toBe(0);
    expectNoTimers();
  });

  it("cancels held output on audio suspension and preserves wall-clock position after resume", async () => {
    let pausedAt: number | undefined;
    let pausedDuration = 0;
    const context = Object.assign(new EventTarget(), { state: "running" });
    Object.defineProperty(context, "currentTime", {
      get: () => 12 + ((pausedAt ?? performance.now()) - pausedDuration) / 1000,
    });
    vi.mocked(getAudioContext).mockReturnValue(context as unknown as AudioContext);
    const music = useMusicStore();
    music.setPlayMode("repeat:16");
    await music.attackExactPitch("C4");
    await vi.advanceTimersByTimeAsync(30);
    pausedAt = performance.now();
    context.state = "suspended";
    context.dispatchEvent(new Event("statechange"));
    expect(music.activeNotes.size).toBe(0);
    expect(noteEvents("note-released")[0].timestamp).toBe(EPOCH + 30);
    await vi.advanceTimersByTimeAsync(50);
    pausedDuration += performance.now() - pausedAt;
    pausedAt = undefined;
    context.state = "running";
    context.dispatchEvent(new Event("statechange"));
    const owner = await music.attackExactPitch("E4");
    await vi.advanceTimersByTimeAsync(5);
    // Each pulse starts on its press: C4 at 0, E4 at 80 ms of wall clock.
    expect(noteEvents("note-played").map(event => event.timestamp)).toEqual([EPOCH, EPOCH + 80]);
    await music.releaseNote(owner!);
  });

  it("keeps musical timestamps while presenting repeat onset and release at estimated output", async () => {
    vi.mocked(getAudioContext).mockImplementation(() => ({
      state: "running",
      currentTime: performance.now() / 1000,
      getOutputTimestamp: () => ({ contextTime: 0, performanceTime: 200 }),
    } as AudioContext));
    const music = useMusicStore();
    music.setPlayMode("repeat:16");
    const owner = await music.attackExactPitch("C4");
    await vi.advanceTimersByTimeAsync(5);
    const played = noteEvents("note-played")[0];
    expect(played.timestamp).toBe(EPOCH);
    expect(played.audibleAt).toBeCloseTo(200);
    expect(music.getActiveNotes()[0]?.audibleAt).toBeCloseTo(200);
    await vi.advanceTimersByTimeAsync(100);
    // A sixteenth at 120 BPM gates for 100 ms.
    const released = noteEvents("note-released")[0];
    expect(released.timestamp).toBe(EPOCH + 100);
    expect(released.audibleAt).toBeCloseTo(300);
    await music.releaseNote(owner!);
  });

  it("records the generated arpeggio, with exact gates and rests in Strudel", async () => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayStyle("arp-up");
    const owners = await Promise.all(["C4", "E4", "G4"].map((pitch) => music.attackExactPitch(pitch)));
    await vi.advanceTimersByTimeAsync(710);
    await Promise.all(owners.map((owner) => music.releaseNote(owner!)));
    await vi.advanceTimersByTimeAsync(300);

    expect(patterns.takeNotes.map((note) => [note.note, note.pressTime, note.duration])).toEqual([
      ["C4", 0, 200], ["E4", 250, 200], ["G4", 500, 200],
    ]);
    expect(noteEvents("note-released").map((note) => note.noteId).sort())
      .toEqual(noteEvents("note-played").map((note) => note.noteId).sort());
    // Uniform recorded gates print once, not as a per-note column.
    const code = logNotesToStrudel(patterns.takeNotes);
    expect(code).toContain("C4@0.1 ~@0.025 E4@0.1 ~@0.025 G4@0.1");
    expect(code).toContain('.as("note")');
    expect(code).toContain(".attack(0.001).decay(0.001).sustain(1).release(0.03)");
    expect(music.activeNotes.size).toBe(0);
    expectNoTimers();
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
    await vi.advanceTimersByTimeAsync(300);
    // The held Together note ends at the change; sixteenths start right there.
    expect(patterns.takeNotes.map((note) => [note.pressTime, note.duration])).toEqual([
      [0, 20], [20, 100], [145, 100],
    ]);
    expect(patterns.takeNotes.map(note => note.articulation?.release)).toEqual([0.2, 0.03, 0.03]);
    expect(patterns.book.phrases.filter(phrase => phrase.shelf === "recent")).toHaveLength(0);
    music.setPlayMode("strum-down");
    expect(music.playMode).toBe("strum-down");
    music.setPlayMode("invalid:8");
    expect(music.playMode).toBe("strum-down");
  });

  it.each(["repeat", "arp-up", "arp-up-down"])(
    "schedules and records every %s sixteenth while main-thread callbacks run late", async (style) => {
      const music = useMusicStore();
      const patterns = connectRecorder();
      music.setPlayMode(`${style}:16`);
      const owners = await Promise.all(["C4", "E4", "G4"].map((pitch) => music.attackExactPitch(pitch)));
      await vi.advanceTimersByTimeAsync(30);
      // The page stalls: every 20 ms of timers sees 60 ms of clock.
      for (let i = 0; i < 16; i++) {
        vi.setSystemTime(Date.now() + 40);
        await vi.advanceTimersByTimeAsync(20);
      }
      await Promise.all(owners.map((owner) => music.releaseNote(owner!)));
      await vi.advanceTimersByTimeAsync(1000);

      const cycle = style === "arp-up-down" ? ["C4", "E4", "G4", "E4"] : ["C4", "E4", "G4"];
      const expected = Array.from({ length: 8 }, (_, i) => {
        const at = i * 125;
        const pitches = style === "repeat" ? ["C4", "E4", "G4"] : [cycle[i % cycle.length]];
        return pitches.map((pitch) => [pitch, at, Math.min(100, 990 - at)]);
      }).flat();
      expect(patterns.takeNotes.map((note) => [note.note, note.pressTime, note.duration])).toEqual(expected);
      expect(noteEvents("note-played")).toHaveLength(expected.length);
      expect(music.activeNotes.size).toBe(0);
      expectNoTimers();
    },
  );

  it("records staggered overlapping strum notes and stops on physical release", async () => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayStyle("strum-down");
    const owners = await Promise.all(["C4", "E4", "G4"].map((pitch) => music.attackExactPitch(pitch)));
    await vi.advanceTimersByTimeAsync(300);
    await Promise.all(owners.map((owner) => music.releaseNote(owner!)));
    await vi.advanceTimersByTimeAsync(500);
    const notes = [...patterns.takeNotes];
    // 35 ms apart, high to low, all ending on the physical release.
    expect(notes.map((note) => note.note)).toEqual(["G4", "E4", "C4"]);
    expect(notes.map((note) => note.pressTime - notes[0].pressTime)).toEqual([0, 35, 70]);
    expect(new Set(notes.map((note) => note.pressTime + note.duration)).size).toBe(1);
    const code = logNotesToStrudel(notes);
    expect(code).toContain("~@0.0175");
    expect(music.activeNotes.size).toBe(0);
  });

  it("records a newly held repeat pitch on the next beat without retriggering its neighbors", async () => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayMode("repeat:16");
    const c = await music.attackExactPitch("C4");
    await vi.advanceTimersByTimeAsync(60);
    const e = await music.attackExactPitch("E4");
    await vi.advanceTimersByTimeAsync(180);
    await Promise.all([c, e].map((owner) => music.releaseNote(owner!)));
    await vi.advanceTimersByTimeAsync(1000);
    expect(patterns.takeNotes.map((note) => [note.note, note.pressTime, note.duration])).toEqual([
      ["C4", 0, 100], ["C4", 125, 100], ["E4", 125, 100],
    ]);
    expect(music.activeNotes.size).toBe(0);
    expectNoTimers();
  });

  it("plays and records a pitch let go before its arpeggio turn on that turn (BJS-597)", async () => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayMode("arp-up:16");
    const owners = await Promise.all(["C4", "G4"].map((pitch) => music.attackExactPitch(pitch)));
    await vi.advanceTimersByTimeAsync(60);
    // E4 takes the 125 ms slot from G4 and is let go before it; every touch
    // plays its first note, so E4 sounds there for the 5 ms minimum gate. G4,
    // let go at 240 ms before its own turn, takes the next one.
    const e = await music.attackExactPitch("E4");
    await vi.advanceTimersByTimeAsync(10);
    await music.releaseNote(e!);
    await vi.advanceTimersByTimeAsync(170);
    await Promise.all(owners.map((owner) => music.releaseNote(owner!)));
    await vi.advanceTimersByTimeAsync(1000);
    expect(patterns.takeNotes.map((note) => [note.note, note.pressTime, note.duration])).toEqual([
      ["C4", 0, 100], ["E4", 125, 5], ["G4", 250, 5],
    ]);
    expect(noteEvents("note-played").map((note) => note.noteName)).toEqual(["C4", "E4", "G4"]);
    expect(music.activeNotes.size).toBe(0);
    expectNoTimers();
  });

  it("changes style while held and the original owner still releases its new output", async () => {
    const music = useMusicStore();
    const owner = await music.attackNoteWithOctave(0, 4);
    music.setPlayStyle("repeat");
    await vi.advanceTimersByTimeAsync(310);
    // Eighths at 120 BPM from the change: 0 and 250 ms.
    expect(noteEvents("note-played").map((event) => event.noteName)).toEqual(["C4", "C4"]);
    await music.releaseNote(owner!);
    await vi.advanceTimersByTimeAsync(1000);
    expect(noteEvents("note-played")).toHaveLength(2);
    expect(music.activeNotes.size).toBe(0);
    expectNoTimers();
  });

  it("uses shared BPM and rate, and preserves captured borrowed pitch identity", async () => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayStyle("repeat");
    music.setPlayRate(16);
    useVisualConfigStore().updateConfig("codeStrip", { bpm: 60 });
    const owner = await music.attackExactPitch("F#4");
    music.setKey("G");
    await vi.advanceTimersByTimeAsync(490);
    await music.releaseNote(owner!);
    await vi.advanceTimersByTimeAsync(500);
    expect(patterns.takeNotes.map((note) => [note.note, note.pressTime, note.duration])).toEqual([
      ["F#4", 0, 200], ["F#4", 250, 200],
    ]);
    expect(patterns.takeNotes.every((note) => note.isBorrowed)).toBe(true);
  });

  it("stops every generated voice when switching instruments, and a stale release spares other inputs", async () => {
    const music = useMusicStore();
    music.setPlayStyle("arp-up");
    const owner = await music.attackExactPitch("C4");
    await vi.advanceTimersByTimeAsync(1);
    useInstrumentStore().selectionEpoch += 1;
    await vi.advanceTimersByTimeAsync(1000);
    // The first pulse sounded on the press; the switch ended it and every later one.
    expect(noteEvents("note-played")).toHaveLength(1);
    expect(noteEvents("note-released")).toHaveLength(1);
    expect(music.activeNotes.size).toBe(0);
    music.setPlayStyle("together");
    await music.attackExactPitch("E4");
    await vi.advanceTimersByTimeAsync(5);
    await music.releaseNote(owner!);
    await vi.advanceTimersByTimeAsync(50);
    expect(music.getActiveNoteNames()).toEqual(["E4"]);
    expectNoTimers();
  });

  it.each(["together", "strum-up"])("drops a %s tap let go before its note when the window blurs (BJS-597)", async (style) => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayStyle(style);
    // Let go before anything rendered: the tap waits for its first note.
    const owner = await music.attackExactPitch("C4");
    await music.releaseNote(owner!);
    // A stop, not a lifted finger: the waiting note is dropped.
    window.dispatchEvent(new Event("blur"));
    await vi.advanceTimersByTimeAsync(1000);
    expect(noteEvents("note-played")).toEqual([]);
    expect(patterns.takeNotes).toEqual([]);
    expect(music.activeNotes.size).toBe(0);
    // Without the blur the same tap plays its note.
    const again = await music.attackExactPitch("C4");
    await music.releaseNote(again!);
    await vi.advanceTimersByTimeAsync(1000);
    expect(noteEvents("note-played").map((note) => note.noteName)).toEqual(["C4"]);
    expectNoTimers();
  });

  it("releaseAll cancels queued notes and does not record the held source chord", async () => {
    const music = useMusicStore();
    const patterns = connectRecorder();
    music.setPlayStyle("strum-up");
    await Promise.all(["C4", "E4", "G4"].map((pitch) => music.attackExactPitch(pitch)));
    await music.releaseAllNotes();
    await vi.advanceTimersByTimeAsync(1000);
    expect(patterns.takeNotes).toEqual([]);
    expect(noteEvents("note-played")).toEqual([]);
    expectNoTimers();
  });

  /*
   * An untouched Kept copy on the desk follows the controls (rule 6 in
   * docs/pattern-system-reimagined.md). Only envelope stages that came from
   * the Shape follow; a Repeat or Arp pulse's 30 ms release is its gate.
   */
  describe("re-skinning a Kept copy (BJS-649)", () => {
    async function hold(pitches: string[], ms: number) {
      const music = useMusicStore();
      const owners = await Promise.all(pitches.map((pitch) => music.attackExactPitch(pitch)));
      await vi.advanceTimersByTimeAsync(ms);
      await Promise.all(owners.map((owner) => music.releaseNote(owner!)));
      await vi.advanceTimersByTimeAsync(500);
    }

    const releases = (notes: readonly { articulation?: { release: number } }[]) =>
      notes.map((note) => note.articulation?.release);

    /** Put a Kept phrase on the desk, as a scroll of the reel does: an untouched copy. */
    async function load(patterns: ReturnType<typeof usePhrasesStore>, keptId: string) {
      patterns.openPhrase(keptId);
      await vi.advanceTimersByTimeAsync(10);
      expect(patterns.take.derivedFrom?.id).toBe(keptId);
      expect(patterns.isTakeTouched).toBe(false);
    }

    /** Close the app and open it again: every store starts over from what was saved. */
    function reopenApp() {
      recorderStore?.removeEventListeners();
      disposePinia(pinia);
      pinia = createPinia();
      setActivePinia(pinia);
      useInstrumentStore().currentInstrument = "piano";
      useVisualConfigStore().useEphemeralDefaults();
      return connectRecorder();
    }

    it.each([
      // The Together note follows the knob to 0.5.
      ["the release moves to 0.5", (instrument: ReturnType<typeof useInstrumentStore>) =>
        instrument.setSynthControl("release", 0.5), "piano", 0.5],
      // Triangle has no Shape of its own: the Together note takes its natural release.
      ["the instrument changes", (instrument: ReturnType<typeof useInstrumentStore>) =>
        instrument.setInstrument("triangle"), "triangle", 0.12],
    ] as const)("keeps every pulse's 0.03 gate when a Kept copy follows the controls and %s", async (
      _move, moveControls, sound, followed,
    ) => {
      const music = useMusicStore();
      // The release knob sits on the gate's own value (0.01 floor, 0.01 step).
      useInstrumentStore().setSynthControl("release", 0.03);
      connectRecorder();
      await hold(["C4"], 200);
      music.setPlayMode("repeat:16");
      await hold(["E4"], 300);
      music.setPlayMode("arp-up:16");
      await hold(["C4", "G4"], 240);
      const keptId = recorderStore!.keepTake()!;
      await vi.advanceTimersByTimeAsync(10);

      // Later: the app opens again on the saved shelf, and the Kept phrase is loaded.
      const patterns = reopenApp();
      const instrument = useInstrumentStore();
      const kept = patterns.findPhrase(keptId)!;
      // One Together note, three Repeat pulses, two Arp pulses: all at 0.03.
      expect(kept.notes.map((note) => note.note)).toEqual(["C4", "E4", "E4", "E4", "C4", "G4"]);
      expect(releases(kept.notes)).toEqual(Array(6).fill(0.03));
      const recorded = JSON.parse(JSON.stringify(kept.notes));
      await load(patterns, keptId);
      expect(instrument.shape.release).toBe(0.03);

      // The Shape's release follows the controls; the pulses stay short.
      await moveControls(instrument);
      await vi.advanceTimersByTimeAsync(10);
      expect(patterns.takeContext.instrument).toBe(sound);
      expect(patterns.isTakeTouched).toBe(false);
      expect(releases(patterns.takeNotes)).toEqual([followed, 0.03, 0.03, 0.03, 0.03, 0.03]);
      // A pulse's attack is the Shaped instrument's, so it follows on every note:
      // piano's 0.001, or triangle's natural 0.003.
      expect(patterns.takeNotes.map((note) => note.articulation?.attack))
        .toEqual(Array(6).fill(sound === "triangle" ? 0.003 : 0.001));
      // What keeps them short was saved with the phrase: only the pulses are marked.
      expect(kept.notes.map((note) => note.gated ?? false)).toEqual([false, true, true, true, true, true]);

      // Back where it was recorded: every note as it was played. The Kept source never moved.
      await instrument.setInstrument("piano");
      instrument.setSynthControl("release", 0.03);
      await vi.advanceTimersByTimeAsync(10);
      expect(JSON.parse(JSON.stringify(patterns.takeNotes))).toEqual(recorded);
      expect(JSON.parse(JSON.stringify(patterns.findPhrase(keptId)!.notes))).toEqual(recorded);
    });

    it("marks exactly the Repeat and Arp notes, in every play mode", async () => {
      const MODES = [
        ["together", false], ["strum-up", false], ["strum-down", false],
        ["repeat:16", true], ["arp-up:16", true], ["arp-up-down:16", true],
      ] as const;
      const music = useMusicStore();
      const instrument = useInstrumentStore();
      const patterns = connectRecorder();
      instrument.setSynthControl("release", 0.03);
      // Each recorded note, by the mode it was played in.
      const playedIn = new Map<string, (typeof MODES)[number][0]>();
      for (const [mode] of MODES) {
        music.setPlayMode(mode);
        await hold(["C4", "E4", "G4"], 240);
        for (const note of patterns.takeNotes) if (!playedIn.has(note.id)) playedIn.set(note.id, mode);
      }
      const keptId = patterns.keepTake()!;
      const kept = patterns.findPhrase(keptId)!;
      const modeOf = (note: { id: string }) => playedIn.get(note.id)!;
      const pulse = (note: { id: string }) => MODES.find(([mode]) => mode === modeOf(note))![1];
      // Every mode is in the take, and only the pulses carry the mark.
      expect(new Set(kept.notes.map(modeOf))).toEqual(new Set(MODES.map(([mode]) => mode)));
      expect(kept.notes.map((note) => [modeOf(note), note.gated ?? false]))
        .toEqual(kept.notes.map((note) => [modeOf(note), pulse(note)]));

      await load(patterns, keptId);
      await instrument.setInstrument("triangle");
      await vi.advanceTimersByTimeAsync(10);
      expect(patterns.takeNotes.map((note) => [modeOf(note), note.articulation?.release]))
        .toEqual(patterns.takeNotes.map((note) => [modeOf(note), pulse(note) ? 0.03 : 0.12]));
    });

    it("re-skins a phrase saved before pulses were marked exactly as before", async () => {
      // Exact bytes the store on main (76d28df4) saved for two Kept takes,
      // each a Together note then pulses: the first at release 0.03, the
      // second (Arp) at 0.4.
      localStorage.setItem("phrases", capturedPhrases);
      const instrument = useInstrumentStore();
      const patterns = connectRecorder();
      const [atKnob, offKnob] = patterns.shelves.kept
        .slice()
        .sort((left, right) => left.createdAt - right.createdAt);
      expect(releases(atKnob.notes)).toEqual([0.03, 0.03, 0.03, 0.03]);
      expect(releases(offKnob.notes)).toEqual([0.4, 0.03, 0.03, 0.03]);
      expect([...atKnob.notes, ...offKnob.notes].some((note) => "gated" in note)).toBe(false);

      // Nothing says which 0.03 was a gate, so each reads as the Shape's, as it always has.
      await load(patterns, atKnob.id);
      instrument.setSynthControl("release", 0.5);
      await nextTick();
      expect(releases(patterns.takeNotes)).toEqual([0.5, 0.5, 0.5, 0.5]);

      // Gates off the knob's value were never the Shape's, and stay.
      await load(patterns, offKnob.id);
      instrument.setSynthControl("release", 0.9);
      await nextTick();
      expect(releases(patterns.takeNotes)).toEqual([0.9, 0.03, 0.03, 0.03]);
      await instrument.setInstrument("triangle");
      await vi.advanceTimersByTimeAsync(10);
      expect(releases(patterns.takeNotes)).toEqual([0.12, 0.03, 0.03, 0.03]);
    });
  });
});
