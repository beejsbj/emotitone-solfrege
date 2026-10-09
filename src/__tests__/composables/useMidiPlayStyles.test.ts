import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, disposePinia, setActivePinia, type Pinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/services/music");
vi.unmock("@/data");
vi.unmock("@/composables/useVisualConfig");

import { useMidiControls } from "@/composables/useMidiControls";
import { useMusicStore } from "@/stores/music";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useVisualConfigStore } from "@/stores/visualConfig";
import * as audio from "@/services/superdoughAudio";
import { LIVE_AUDIO_SCHEDULING_LEAD_MS } from "@/services/liveAudioTiming";

const onset = (offset = 0) => LIVE_AUDIO_SCHEDULING_LEAD_MS + offset;

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

function packet(status: number, pitch: number) {
  expect(input.onmidimessage).toBeTypeOf("function");
  input.onmidimessage!({ data: new Uint8Array([status, pitch, status === 0x90 ? 100 : 0]) });
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
    vi.mocked(audio.attackNote).mockResolvedValue(undefined);
    vi.mocked(audio.getAudioContext).mockImplementation(() => ({
      currentTime: performance.now() / 1000,
    } as AudioContext));

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
    clear = vi.fn(() => {
      const currentTime = performance.now();
      midiMessages = midiMessages.filter(({ timestamp, sentAt }) =>
        timestamp === undefined ? sentAt < currentTime : timestamp <= currentTime + 1
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
    useVisualConfigStore().updateConfig("codeStrip", { bpm: 120 });
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    disposePinia(pinia);
    if (midiDescriptor) Object.defineProperty(navigator, "requestMIDIAccess", midiDescriptor);
    else Reflect.deleteProperty(navigator, "requestMIDIAccess");
    vi.clearAllTimers();
    vi.restoreAllMocks();
    vi.useRealTimers();
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
    expect(scheduledNotes()
      .filter(({ message: [status] }) => (status & 0xf0) === 0x90)
      .at(-1)?.timestamp)
      .toBeGreaterThan(performance.now());
    await vi.advanceTimersByTimeAsync(499);
    expect(notes()).toEqual([
      [0x90, 60], [0x80, 60], [0x90, 64], [0x80, 64], [0x90, 67], [0x80, 67],
      [0x90, 60], [0x80, 60],
    ]);
    expect(scheduledNotes().map(({ timestamp }) => timestamp))
      .toEqual([0, 200, 250, 450, 500, 700, 750, 950].map(onset));
    [60, 64, 67].forEach((pitch) => packet(0x80, pitch));
    await vi.advanceTimersByTimeAsync(1000);
    // The fourth pulse was queued ahead but physical release cancels it.
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

  it("replaces a released pitch in a queued MIDI arpeggio without leaving a silent step", async () => {
    const music = useMusicStore();
    music.setPlayMode("arp-up:16");
    await connect();
    [60, 64, 67].forEach((pitch) => packet(0x90, pitch));
    await vi.advanceTimersByTimeAsync(60);
    packet(0x80, 64);
    await vi.advanceTimersByTimeAsync(180);
    [60, 67].forEach((pitch) => packet(0x80, pitch));
    await vi.advanceTimersByTimeAsync(1000);

    expect(notesWithTimestamps()).toEqual([
      [0x90, 60, onset()], [0x80, 60, onset(100)],
      [0x90, 67, onset(125)], [0x80, 67, onset(225)],
    ]);
    expect(music.activeNotes.size).toBe(0);
    expect(useKeyboardDrawerStore().touch.activeTouches.size).toBe(0);
  });

  it("restores a twice-revised MIDI arpeggio slot without its canceled off swallowing the attack", async () => {
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

    expect(notesWithTimestamps()).toEqual([
      [0x90, 60, onset()], [0x80, 60, onset(100)],
      [0x90, 67, onset(125)], [0x80, 67, onset(225)],
    ]);
    expect(music.activeNotes.size).toBe(0);
    expect(useKeyboardDrawerStore().touch.activeTouches.size).toBe(0);
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

  it("cancels a fast MIDI press before its first styled pulse is scheduled", async () => {
    const music = useMusicStore();
    music.setPlayStyle("repeat");
    await connect();
    packet(0x90, 60);
    packet(0x80, 60);
    await vi.advanceTimersByTimeAsync(1000);
    expect(notes()).toEqual([]);
    expect(music.activeNotes.size).toBe(0);
    expect(useKeyboardDrawerStore().touch.activeTouches.size).toBe(0);
  });

  it("pairs a lookahead attack with an off when its owner releases before onset", async () => {
    useMusicStore().setPlayStyle("arp-up");
    await connect();
    packet(0x90, 60);
    await vi.advanceTimersByTimeAsync(240);
    packet(0x80, 60);
    await vi.advanceTimersByTimeAsync(0);

    const scheduled = scheduledNotes()
      .map(({ message, timestamp }) => [message[0] & 0xf0, message[1], timestamp]);
    expect(scheduled).toContainEqual([0x90, 60, onset(250)]);
    expect(scheduled.at(-1)).toEqual([0x80, 60, onset(250)]);
    expect(notes()).toEqual([[0x90, 60], [0x80, 60]]);
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

  it("preserves a pending input across a mode change without suppressing later app notes", async () => {
    const music = useMusicStore();
    await connect();
    let resolveAttack!: () => void;
    vi.mocked(audio.attackNote).mockImplementationOnce(() => new Promise<void>((resolve) => { resolveAttack = resolve; }));
    packet(0x90, 60);
    music.setPlayStyle("repeat");
    resolveAttack();
    await vi.advanceTimersByTimeAsync(320);
    packet(0x80, 60);
    await vi.advanceTimersByTimeAsync(500);
    expect(notes()).toEqual([[0x90, 60], [0x80, 60], [0x90, 60], [0x80, 60]]);
    music.setPlayStyle("together");
    const owner = await music.attackExactPitch("C4");
    await music.releaseNote(owner!);
    expect(notes().slice(-2)).toEqual([[0x90, 60], [0x80, 60]]);
    expect(notes()).toHaveLength(6);
  });
});
