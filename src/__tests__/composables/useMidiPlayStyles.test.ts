import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, disposePinia, setActivePinia, type Pinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { attachLiveCore, type LiveSeat } from "../helpers/liveCore";

vi.unmock("@/services/music");
vi.unmock("@/data");
vi.unmock("@/composables/useVisualConfig");
const seat = vi.hoisted(() => ({ renderer: null, listeners: new Set() }) as LiveSeat);
vi.mock("@/services/livePlayback", async () => (await import("../helpers/liveCore")).livePlaybackOn(seat));

import { useMidiControls } from "@/composables/useMidiControls";
import { useMusicStore } from "@/stores/music";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { getAudioContext } from "@/services/audioRuntime";
import { SCHEDULED_LIVE_MIDI_EVENT } from "@/services/livePerformance";

/** The worklet starts a styled pulse at the press's own frame (no grid while nothing loops). */
const onset = (offset = 0) => offset;
let stopFollowing: () => void;

const EPOCH = 1_800_000_000_000;
let pinia: Pinia;
let wrapper: VueWrapper | undefined;
let midiDescriptor: PropertyDescriptor | undefined;
let input: { id: string; name: string; state: string; onmidimessage: ((event: { data: Uint8Array }) => void) | null };
let send: ReturnType<typeof vi.fn>;
let clear: ReturnType<typeof vi.fn>;
let midiMessages: Array<{
  message: number[];
  timestamp?: number;
  sentAt: number;
  index: number;
}>;

function packet(status: number, pitch: number, velocity = 100) {
  expect(input.onmidimessage).toBeTypeOf("function");
  input.onmidimessage!({ data: new Uint8Array([status, pitch, status === 0x90 ? velocity : 0]) });
}

function notesWithTimestamps() {
  const messages = midiMessages
    .map(({ message, timestamp, index }) => ({
      message,
      timestamp: typeof timestamp === "number" ? timestamp : 1e12 + index,
      index,
    }))
    .filter(({ message: [status] }) => (status & 0xf0) === 0x90 || (status & 0xf0) === 0x80)
    .sort((left, right) => left.timestamp - right.timestamp || left.index - right.index);
  const active = new Set<number>();
  const transitions: number[][] = [];

  for (let index = 0; index < messages.length;) {
    const timestamp = messages[index].timestamp;
    let end = index + 1;
    while (end < messages.length && messages[end].timestamp === timestamp) end += 1;
    const group = messages.slice(index, end);
    index = end;
    for (const pitch of new Set(group.map(({ message }) => message[1]))) {
      const pitchGroup = group.filter(({ message }) => message[1] === pitch);
      const statuses = pitchGroup.map(({ message }) => message[0] & 0xf0);
      // A queued attack canceled before its deadline is paired with an off at
      // that same deadline; it never becomes an audible transition.
      if (!active.has(pitch) && statuses.includes(0x90) && statuses.includes(0x80)) continue;
      for (const status of statuses) {
        if (status === 0x90 && !active.has(pitch)) {
          active.add(pitch);
          transitions.push([status, pitch, timestamp]);
        } else if (status === 0x80 && active.delete(pitch)) {
          transitions.push([status, pitch, timestamp]);
        }
      }
    }
  }

  return transitions;
}

function notes() {
  return notesWithTimestamps().map(([status, pitch]) => [status, pitch]);
}

/**
 * What a synth plays from every packet sent, none withdrawn: packets in
 * deadline order (ties in send order), and per instant only the change a
 * listener hears (an on and off at the same instant is no note).
 */
function played() {
  const sounding = new Set<number>();
  const heard: number[][] = [];
  const packets = [...midiMessages]
    .map((packet) => ({ ...packet, at: packet.timestamp ?? packet.sentAt }))
    .sort((left, right) => left.at - right.at || left.index - right.index);
  for (let index = 0; index < packets.length;) {
    const at = packets[index].at;
    const before = new Set(sounding);
    for (; index < packets.length && packets[index].at === at; index += 1) {
      const [status, pitch] = packets[index].message;
      if ((status & 0xf0) === 0x90) sounding.add(pitch);
      else if ((status & 0xf0) === 0x80) sounding.delete(pitch);
      // All Notes Off (controller 123) on the notes' own channel 1; the ROLI
      // palette and sync use other controllers on channel 16.
      else if (status === 0xb0 && pitch === 123) sounding.clear();
    }
    for (const pitch of new Set([...before, ...sounding])) {
      if (before.has(pitch) !== sounding.has(pitch)) heard.push([sounding.has(pitch) ? 0x90 : 0x80, pitch, at]);
    }
  }
  return { heard, sounding: [...sounding] };
}

/** Chrome's MIDIOutput has no clear() (crbug.com/40411677): queued packets stay queued. */
async function withoutClear() {
  const access = await navigator.requestMIDIAccess();
  Reflect.deleteProperty(access.outputs.get("roli-output")!, "clear");
}

/** A live voice planned for the output `afterMs` from now, as the music store sends it. */
function planned(noteId: string, phase: "attack" | "release" | "cancel", afterMs?: number) {
  window.dispatchEvent(new CustomEvent(SCHEDULED_LIVE_MIDI_EVENT, { detail: {
    noteId, phase, noteName: "C4", keyboardOctave: 4, timestamp: Date.now(),
    ...(afterMs === undefined ? {} : { midiTimestamp: performance.now() + afterMs }),
  } }));
}

function scheduledNotes() {
  return midiMessages
    .filter(({ message: [status] }) => (status & 0xf0) === 0x90 || (status & 0xf0) === 0x80)
    .sort((left, right) => (left.timestamp ?? 1e12) - (right.timestamp ?? 1e12) || left.index - right.index);
}

async function connect() {
  wrapper = mount({ template: "<div />", setup() { useMidiControls(); } }, {
    global: { plugins: [pinia] },
  });
  await vi.advanceTimersByTimeAsync(0);
  expect(useKeyboardDrawerStore().midi.syncedOutput).toBe("LUMI Keys");
  expect(input.onmidimessage).toBeTypeOf("function");
  send.mockClear();
}

describe("live play styles through MIDI input and the ROLI output mirror", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(EPOCH);
    vi.spyOn(performance, "now").mockImplementation(() => Date.now() - EPOCH);
    vi.mocked(getAudioContext).mockImplementation(() => ({
      state: "running",
      currentTime: performance.now() / 1000,
    } as AudioContext));
    // The real worklet core, rendered on the test's clock.
    seat.listeners.clear();
    stopFollowing = attachLiveCore(seat).follow(() => performance.now() / 1000);

    input = { id: "roli-input", name: "LUMI Keys", state: "connected", onmidimessage: null };
    midiMessages = [];
    send = vi.fn((message: number[], timestamp?: number) => {
      midiMessages.push({
        message,
        timestamp,
        sentAt: performance.now(),
        index: midiMessages.length,
      });
    });
    // Web MIDI's clear() drops only enqueued data: a send without a timestamp
    // is already delivered.
    clear = vi.fn(() => {
      const currentTime = performance.now();
      midiMessages = midiMessages.filter(({ timestamp }) =>
        timestamp === undefined || timestamp <= currentTime + 1
      );
    });
    midiDescriptor = Object.getOwnPropertyDescriptor(navigator, "requestMIDIAccess");
    Object.defineProperty(navigator, "requestMIDIAccess", {
      configurable: true,
      value: vi.fn().mockResolvedValue({
        inputs: new Map([[input.id, input]]),
        outputs: new Map([["roli-output", {
          id: "roli-output",
          name: "LUMI Keys",
          state: "connected",
          send,
          clear,
        }]]),
        onstatechange: null,
      }),
    });
    pinia = createPinia();
    setActivePinia(pinia);
    useVisualConfigStore().useEphemeralDefaults();
  });

  afterEach(() => {
    stopFollowing();
    wrapper?.unmount();
    wrapper = undefined;
    disposePinia(pinia);
    if (midiDescriptor) Object.defineProperty(navigator, "requestMIDIAccess", midiDescriptor);
    else Reflect.deleteProperty(navigator, "requestMIDIAccess");
    vi.clearAllTimers();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each(['repeat', 'arp-up', 'strum-up'] as const)('mirrors performed %s velocities at their scheduled deadlines', async style => {
    useMusicStore().setPlayStyle(style);
    await connect();
    packet(0x90, 60, 19);
    packet(0x90, 64, 113);
    await vi.advanceTimersByTimeAsync(350);
    const attacks = scheduledNotes().filter(({ message }) => (message[0] & 0xf0) === 0x90);
    expect(attacks.length).toBeGreaterThanOrEqual(2);
    // A pulse due now goes out at once; later ones carry their deadline.
    for (const { message: [, pitch, velocity] } of attacks) {
      expect(velocity).toBe(pitch === 60 ? 19 : 113);
    }
    expect(new Set(attacks.map(({ message }) => message[1]))).toEqual(new Set([60, 64]));
  });

  it("does not resend delivered ROLI configuration when rhythmic queues change", async () => {
    useMusicStore().setPlayMode("repeat:16");
    await connect();
    await vi.advanceTimersByTimeAsync(100);
    send.mockClear();
    packet(0x90, 60);
    await vi.advanceTimersByTimeAsync(250);
    packet(0x90, 64);
    await vi.advanceTimersByTimeAsync(250);
    expect(clear).toHaveBeenCalled();
    expect(send.mock.calls.filter(([message]) => (message[0] & 0xf0) === 0xb0)).toEqual([]);
  });

  it("repairs only still-pending ROLI configuration packets discarded by MIDI clear", async () => {
    useMusicStore().setPlayMode("repeat:16");
    await connect();
    await vi.advanceTimersByTimeAsync(5);
    const pendingConfig = midiMessages.filter(({ message, timestamp }) =>
      (message[0] & 0xf0) === 0xb0 && timestamp !== undefined && timestamp >= 5,
    ).map(({ message, timestamp }) => [message, timestamp]);
    expect(pendingConfig.length).toBeGreaterThan(0);
    send.mockClear();
    packet(0x90, 60);
    await vi.advanceTimersByTimeAsync(0);
    expect(send.mock.calls.filter(([message]) => (message[0] & 0xf0) === 0xb0)).toEqual(pendingConfig);
  });

  it("still sends changed key, mode and octave settings to the connected output", async () => {
    const music = useMusicStore();
    await connect();
    await vi.advanceTimersByTimeAsync(100);
    send.mockClear();
    music.setKey("D");
    await vi.advanceTimersByTimeAsync(0);
    const keyPalette = send.mock.calls.map(([message]) => message);
    expect(keyPalette).toHaveLength(64);
    await vi.advanceTimersByTimeAsync(100);
    send.mockClear();
    music.setMode("minor");
    await vi.advanceTimersByTimeAsync(0);
    const modePalette = send.mock.calls.map(([message]) => message);
    expect(modePalette).toHaveLength(64);
    expect(modePalette).not.toEqual(keyPalette);
    await vi.advanceTimersByTimeAsync(100);
    send.mockClear();
    useKeyboardDrawerStore().setMainOctave(5);
    await vi.advanceTimersByTimeAsync(0);
    expect(send.mock.calls).toEqual([[[0xbf, 111, 5], 300]]);
  });

  it("sends complete configuration to a replacement output even when its port id is reused", async () => {
    await connect();
    await vi.advanceTimersByTimeAsync(100);
    const access = await vi.mocked(navigator.requestMIDIAccess).mock.results[0].value as MIDIAccess;
    const replacementSend = vi.fn();
    const replacement = { id: "roli-output", name: "LUMI Keys", type: "output", state: "connected", send: replacementSend, clear: vi.fn() };
    (access.outputs as unknown as Map<string, unknown>).set(replacement.id, replacement);
    access.onstatechange!.call(access, { port: replacement } as unknown as MIDIConnectionEvent);
    expect(replacementSend).toHaveBeenCalledTimes(65);
    expect(replacementSend.mock.calls.at(-1)).toEqual([[0xbf, 111, 4], 100]);
    replacementSend.mockClear();
    access.onstatechange!.call(access, { port: replacement } as unknown as MIDIConnectionEvent);
    expect(replacementSend).not.toHaveBeenCalled();
  });

  it("mirrors every arpeggio pulse from a held ROLI chord, including its first note", async () => {
    const music = useMusicStore();
    music.setPlayStyle("arp-up");
    await connect();
    [60, 64, 67].forEach((pitch) => packet(0x90, pitch));
    await vi.advanceTimersByTimeAsync(250);
    expect(notes()).toEqual([
      [0x90, 60], [0x80, 60], [0x90, 64], [0x80, 64],
    ]);
    // The pulse due at this moment is already on its way, never late.
    expect(scheduledNotes()
      .filter(({ message: [status] }) => (status & 0xf0) === 0x90)
      .at(-1)?.timestamp)
      .toBeGreaterThanOrEqual(performance.now());
    await vi.advanceTimersByTimeAsync(490);
    expect(notes()).toEqual([
      [0x90, 60], [0x80, 60], [0x90, 64], [0x80, 64], [0x90, 67], [0x80, 67],
      [0x90, 60], [0x80, 60],
    ]);
    expect(scheduledNotes().map(({ timestamp }) => timestamp))
      .toEqual([0, 200, 250, 450, 500, 700, 750, 950].map(onset));
    [60, 64, 67].forEach((pitch) => packet(0x80, pitch));
    await vi.advanceTimersByTimeAsync(1000);
    // The fourth pulse was queued ahead; the physical release, 10 ms before
    // it, cancels it by clearing the output's queue (the worklet sends no
    // paired note-off for a pulse that never sounds).
    expect(notes()).toHaveLength(6);
    expect(music.activeNotes.size).toBe(0);
    expect(useKeyboardDrawerStore().touch.activeTouches.size).toBe(0);
  });

  it("mirrors repeated chords and pairs the last pulse with note-offs on physical release", async () => {
    const music = useMusicStore();
    music.setPlayStyle("repeat");
    await connect();
    [60, 64, 67].forEach((pitch) => packet(0x90, pitch));
    await vi.advanceTimersByTimeAsync(310);
    [60, 64, 67].forEach((pitch) => packet(0x80, pitch));
    await vi.advanceTimersByTimeAsync(1000);
    expect(notes()).toEqual([
      [0x90, 60], [0x90, 64], [0x90, 67],
      [0x80, 60], [0x80, 64], [0x80, 67],
      [0x90, 60], [0x90, 64], [0x90, 67],
      [0x80, 60], [0x80, 64], [0x80, 67],
    ]);
    expect(music.activeNotes.size).toBe(0);
  });

  it("adds a new held pitch to the next queued sixteenth repeat on MIDI output", async () => {
    const music = useMusicStore();
    music.setPlayMode("repeat:16");
    await connect();
    packet(0x90, 60);
    await vi.advanceTimersByTimeAsync(60);
    packet(0x90, 64);
    await vi.advanceTimersByTimeAsync(180);
    [60, 64].forEach((pitch) => packet(0x80, pitch));
    await vi.advanceTimersByTimeAsync(1000);

    expect(notesWithTimestamps()).toEqual([
      [0x90, 60, onset()], [0x80, 60, onset(100)],
      [0x90, 60, onset(125)], [0x90, 64, onset(125)],
      [0x80, 60, onset(225)], [0x80, 64, onset(225)],
    ]);
    expect(music.activeNotes.size).toBe(0);
    expect(useKeyboardDrawerStore().touch.activeTouches.size).toBe(0);
  });

  /**
   * Each key takes its 1/16 turn once: 60 on the press, then 64 and 67,
   * though both were let go before their first turn, each ended after the
   * 5 ms minimum gate (BJS-597).
   */
  const arpeggioTurns = [
    [0x90, 60, onset()], [0x80, 60, onset(100)],
    [0x90, 64, onset(125)], [0x80, 64, onset(131)],
    [0x90, 67, onset(250)], [0x80, 67, onset(256)],
  ];

  /*
   * The worklet's first styled pulse lands exactly on its press. When the
   * chord's other notes revise the arpeggio in the same tick, that due attack
   * has not reached the output yet: the scheduler must still send it.
   */
  it("plays an arpeggio pitch released before its turn once, on its turn, without leaving a silent step", async () => {
    const music = useMusicStore();
    music.setPlayMode("arp-up:16");
    await connect();
    [60, 64, 67].forEach((pitch) => packet(0x90, pitch));
    await vi.advanceTimersByTimeAsync(60);
    packet(0x80, 64);
    await vi.advanceTimersByTimeAsync(180);
    [60, 67].forEach((pitch) => packet(0x80, pitch));
    await vi.advanceTimersByTimeAsync(1000);

    // Every touch plays its first note (BJS-597): a pitch let go before its
    // turn still takes that turn, briefly, and the arpeggio moves on.
    expect(played()).toEqual({ heard: arpeggioTurns, sounding: [] });
    expect(music.activeNotes.size).toBe(0);
    expect(useKeyboardDrawerStore().touch.activeTouches.size).toBe(0);
  });

  it("plays a pitch added and released before its arpeggio slot in that slot, without its off swallowing the next attack", async () => {
    const music = useMusicStore();
    music.setPlayMode("arp-up:16");
    await connect();
    [60, 67].forEach((pitch) => packet(0x90, pitch));
    await vi.advanceTimersByTimeAsync(60);
    packet(0x90, 64);
    await vi.advanceTimersByTimeAsync(10);
    expect(notesWithTimestamps()).toContainEqual([0x90, 64, onset(125)]);
    packet(0x80, 64);
    await vi.advanceTimersByTimeAsync(170);
    [60, 67].forEach((pitch) => packet(0x80, pitch));
    await vi.advanceTimersByTimeAsync(1000);

    // Every touch plays its first note (BJS-597): a pitch let go before its
    // turn still takes that turn, briefly, and the arpeggio moves on.
    expect(played()).toEqual({ heard: arpeggioTurns, sounding: [] });
    expect(music.activeNotes.size).toBe(0);
    expect(useKeyboardDrawerStore().touch.activeTouches.size).toBe(0);
  });

  describe("on an output that cannot clear its queue", () => {
    beforeEach(withoutClear);

    it.each([
      ["a pitch released before its turn", [[60, 64, 67], [64], [60, 67]]],
      ["a pitch added and released before its slot", [[60, 67], [64], [64], [60, 67]]],
    ] as const)("revises a queued arpeggio (%s) with the same audible notes and nothing left sounding", async (_, steps) => {
      useMusicStore().setPlayMode("arp-up:16");
      await connect();
      const [first, ...rest] = steps;
      first.forEach((pitch) => packet(0x90, pitch));
      await vi.advanceTimersByTimeAsync(60);
      if (rest.length === 3) {
        packet(0x90, 64);
        await vi.advanceTimersByTimeAsync(10);
        packet(0x80, 64);
        await vi.advanceTimersByTimeAsync(170);
      } else {
        packet(0x80, 64);
        await vi.advanceTimersByTimeAsync(180);
      }
      [60, 67].forEach((pitch) => packet(0x80, pitch));
      await vi.advanceTimersByTimeAsync(1000);

      expect(played()).toEqual({ heard: arpeggioTurns, sounding: [] });
    });

    it("answers a withdrawn note-on with a note-off at its deadline", async () => {
      await connect();
      // A press waiting for the loop's next beat, then let go before it.
      planned("held", "attack", 200);
      await vi.advanceTimersByTimeAsync(50);
      planned("held", "cancel");
      await vi.advanceTimersByTimeAsync(500);
      expect(played().sounding).toEqual([]);
    });

    it("leaves nothing sounding when the mirror stops with a note-on still queued", async () => {
      await connect();
      planned("held", "attack", 200);
      await vi.advanceTimersByTimeAsync(50);
      wrapper!.unmount();
      wrapper = undefined;
      await vi.advanceTimersByTimeAsync(500);
      expect(played().sounding).toEqual([]);
    });
  });

  it("starts mirroring when a held ordinary ROLI note changes to Repeat", async () => {
    const music = useMusicStore();
    await connect();
    packet(0x90, 60);
    await vi.advanceTimersByTimeAsync(0);
    expect(notes()).toEqual([]); // The original ROLI press suppresses its own echo.
    music.setPlayStyle("repeat");
    await vi.advanceTimersByTimeAsync(320);
    packet(0x80, 60);
    await vi.advanceTimersByTimeAsync(1000);
    expect(notes()).toEqual([[0x90, 60], [0x80, 60], [0x90, 60], [0x80, 60]]);
    expect(music.activeNotes.size).toBe(0);
  });

  it("a fast MIDI press released before its first pulse renders plays one short note and leaves no note on", async () => {
    const music = useMusicStore();
    music.setPlayStyle("repeat");
    await connect();
    const played = vi.fn();
    window.addEventListener("note-played", played);
    packet(0x90, 60);
    packet(0x80, 60);
    await vi.advanceTimersByTimeAsync(1000);
    window.removeEventListener("note-played", played);
    // Every touch sounds (BJS-597): the first pulse plays a 5 ms gate, then
    // the release ends it, on the output as in the worklet.
    expect(played).toHaveBeenCalledTimes(1);
    expect(notes()).toEqual([[0x90, 60], [0x80, 60]]);
    expect(music.activeNotes.size).toBe(0);
    expect(useKeyboardDrawerStore().touch.activeTouches.size).toBe(0);
  });

  it("never mirrors a pulse whose owner releases before it sounds", async () => {
    useMusicStore().setPlayStyle("arp-up");
    await connect();
    packet(0x90, 60);
    await vi.advanceTimersByTimeAsync(240);
    packet(0x80, 60);
    await vi.advanceTimersByTimeAsync(500);

    const scheduled = scheduledNotes()
      .map(({ message, timestamp }) => [message[0] & 0xf0, message[1], timestamp]);
    // The eighth at 250 ms never sounds, so nothing about it reaches the ROLI.
    expect(scheduled.filter(([status, , timestamp]) => status === 0x90 && timestamp === onset(250))).toEqual([]);
    expect(notesWithTimestamps()).toEqual([[0x90, 60, onset()], [0x80, 60, onset(200)]]);
  });

  it("replaces a queued off before the same pitch is attacked again", async () => {
    useMusicStore().setPlayStyle("arp-up");
    await connect();
    packet(0x90, 60);
    await vi.advanceTimersByTimeAsync(100);
    packet(0x80, 60);
    const clearsBeforeReattack = clear.mock.calls.length;

    await vi.advanceTimersByTimeAsync(10);
    packet(0x90, 60);
    await vi.advanceTimersByTimeAsync(30);
    expect(clear.mock.calls.length).toBeGreaterThan(clearsBeforeReattack);
    const replacementCalls = scheduledNotes()
      .map(({ message, timestamp }) => [message[0] & 0xf0, message[1], timestamp])
      .slice(-3);
    expect(replacementCalls).toEqual([
      [0x80, 60, 100],
      [0x90, 60, onset(110)],
      [0x80, 60, onset(310)],
    ]);
  });

  it("preserves a waiting input across a mode change without suppressing later app notes", async () => {
    const music = useMusicStore();
    await connect();
    // The audio sleeps, so the press waits for it to wake.
    let wake!: () => void;
    const context = Object.assign(new EventTarget(), { state: "suspended" });
    Object.defineProperty(context, "currentTime", { get: () => performance.now() / 1000 });
    Object.assign(context, { resume: vi.fn(() => new Promise<void>((resolve) => {
      wake = () => { Object.assign(context, { state: "running" }); context.dispatchEvent(new Event("statechange")); resolve(); };
    })) });
    vi.mocked(getAudioContext).mockReturnValue(context as unknown as AudioContext);
    packet(0x90, 60);
    music.setPlayStyle("repeat");
    wake();
    await vi.advanceTimersByTimeAsync(320);
    packet(0x80, 60);
    await vi.advanceTimersByTimeAsync(500);
    expect(notes()).toEqual([[0x90, 60], [0x80, 60], [0x90, 60], [0x80, 60]]);
    music.setPlayStyle("together");
    const owner = await music.attackExactPitch("C4");
    await music.releaseNote(owner!);
    // The tap plays its short note (BJS-597); the mirror's note-off follows its end.
    await vi.advanceTimersByTimeAsync(10);
    expect(notes().slice(-2)).toEqual([[0x90, 60], [0x80, 60]]);
    expect(notes()).toHaveLength(6);
  });
});
