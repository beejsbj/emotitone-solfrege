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
import { useInstrumentStore } from "@/stores/instrument";
import { getAudioContext } from "@/services/audioRuntime";

let pinia: Pinia;
let wrapper: VueWrapper | undefined;
let midiDescriptor: PropertyDescriptor | undefined;
let input: { id: string; name: string; state: string; onmidimessage: ((event: { data: Uint8Array }) => void) | null };
const EPOCH = 1_800_000_000_000;
let live: ReturnType<typeof attachLiveCore>;

async function settle() {
  await vi.advanceTimersByTimeAsync(0);
  live.render(20);
  await vi.advanceTimersByTimeAsync(0);
}
function send(...bytes: number[]) {
  input.onmidimessage!({ data: new Uint8Array(bytes) });
}
const noteOn = (pitch: number, channel = 1) => send(0x90 | (channel - 1), pitch, 100);
const noteOff = (pitch: number, channel = 1) => send(0x80 | (channel - 1), pitch, 0);
const cc = (controller: number, value: number, channel = 1) => send(0xb0 | (channel - 1), controller, value);
/** A 14-bit bend, centre 8192. */
const bend = (value: number, channel = 1) => send(0xe0 | (channel - 1), value & 0x7f, value >> 7);

async function connect() {
  wrapper = mount({ template: "<div />", setup() { useMidiControls(); } }, {
    global: { plugins: [pinia] },
  });
  await vi.advanceTimersByTimeAsync(0);
  expect(input.onmidimessage).toBeTypeOf("function");
}
function events(type: string) {
  return vi.mocked(window.dispatchEvent).mock.calls
    .map(([event]) => event as CustomEvent).filter(event => event.type === type).map(event => event.detail);
}
function bendsOf(noteId: string) {
  return events("note-expression").filter(detail => detail.noteId === noteId && "cents" in detail)
    .map(detail => detail.cents as number);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(EPOCH);
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - EPOCH);
  vi.spyOn(window, "dispatchEvent");
  vi.mocked(getAudioContext).mockImplementation(() => ({
    state: "running", currentTime: performance.now() / 1000,
  } as AudioContext));
  seat.listeners.clear();
  live = attachLiveCore(seat);
  input = { id: "keyboard", name: "MIDI keyboard", state: "connected", onmidimessage: null };
  midiDescriptor = Object.getOwnPropertyDescriptor(navigator, "requestMIDIAccess");
  Object.defineProperty(navigator, "requestMIDIAccess", {
    configurable: true,
    value: vi.fn().mockResolvedValue({ inputs: new Map([[input.id, input]]), outputs: new Map(), onstatechange: null }),
  });
  pinia = createPinia();
  setActivePinia(pinia);
  useInstrumentStore().currentInstrument = "piano";
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

describe("MIDI pitch bend", () => {
  it("bends the notes held on its channel, over the standard two semitones", async () => {
    await connect();
    noteOn(60);
    noteOn(64, 2);
    await settle();
    const [first, second] = events("note-played");
    bend(8192 + 1024); // an eighth of the way up: a quarter of a semitone
    await settle();
    expect(bendsOf(first.noteId)).toEqual([25]);
    expect(bendsOf(second.noteId)).toEqual([]);
    bend(8192);
    await settle();
    expect(bendsOf(first.noteId)).toEqual([25, 0]);
  });

  it("gives a note the bend its channel already holds (MPE sends it first)", async () => {
    await connect();
    bend(8192 - 1024, 3);
    noteOn(67, 3);
    await settle();
    const [attack] = events("note-played");
    expect(bendsOf(attack.noteId)).toEqual([-25]);
  });

  it("follows a channel's bend range from RPN 0", async () => {
    await connect();
    cc(101, 0, 2);
    cc(100, 0, 2);
    cc(6, 16, 2);
    noteOn(62, 2);
    await settle();
    const [attack] = events("note-played");
    bend(8192 + 128, 2); // 1/64 of sixteen semitones
    await settle();
    expect(bendsOf(attack.noteId)).toEqual([25]);
  });

  it("bends an MPE zone's member channels over 48 semitones after its configuration message", async () => {
    await connect();
    cc(101, 0, 1);
    cc(100, 6, 1);
    cc(6, 15, 1);
    noteOn(62, 5);
    noteOn(60, 1);
    await settle();
    const [member, master] = events("note-played");
    bend(8192 + 43, 5);
    bend(8192 + 1024, 1);
    await settle();
    expect(bendsOf(member.noteId)[0]).toBeCloseTo(43 / 8192 * 4800, 3);
    expect(bendsOf(master.noteId)).toEqual([25]);
  });
});

describe("MIDI sustain pedal", () => {
  it("holds released notes until the pedal lifts", async () => {
    const music = useMusicStore();
    await connect();
    noteOn(60);
    await settle();
    cc(64, 127);
    noteOff(60);
    await settle();
    expect(events("note-released")).toHaveLength(0);
    expect(music.getActiveNoteNames()).toEqual(["C4"]);
    cc(64, 0);
    await settle();
    expect(events("note-released")).toHaveLength(1);
    expect(music.activeNotes.size).toBe(0);
  });

  it("does not hold a key that is still down when the pedal lifts", async () => {
    const music = useMusicStore();
    await connect();
    cc(64, 127);
    noteOn(60);
    await settle();
    cc(64, 0);
    await settle();
    expect(music.getActiveNoteNames()).toEqual(["C4"]);
    noteOff(60);
    await settle();
    expect(music.activeNotes.size).toBe(0);
  });

  it("restrikes a sustained note and releases the new one with the pedal", async () => {
    const music = useMusicStore();
    await connect();
    cc(64, 127);
    noteOn(60);
    noteOff(60);
    await settle();
    noteOn(60);
    noteOff(60);
    await settle();
    expect(events("note-played")).toHaveLength(2);
    expect(music.getActiveNoteNames()).toEqual(["C4"]);
    cc(64, 0);
    await settle();
    expect(music.activeNotes.size).toBe(0);
  });
});

describe("MIDI channel mode messages", () => {
  it("All Notes Off ends every note from the input, sustained or held", async () => {
    const music = useMusicStore();
    await connect();
    noteOn(60);
    cc(64, 127);
    noteOn(64, 2);
    noteOff(64, 2);
    await settle();
    expect(music.activeNotes.size).toBe(2);
    cc(123, 0);
    await settle();
    expect(music.activeNotes.size).toBe(0);
  });
});
