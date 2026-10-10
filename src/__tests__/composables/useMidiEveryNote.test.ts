import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, disposePinia, setActivePinia, type Pinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MusicalMode } from "@/types/music";
import { LiveAudioCore } from "@/audio/live/core";
import type { LiveRenderer, LiveRendererCallbacks } from "@/audio/liveRenderer";

vi.unmock("@/services/music");
vi.unmock("@/data");
vi.unmock("@/composables/useVisualConfig");
const playback = vi.hoisted(() => ({
  renderer: null as LiveRenderer | null,
  listener: undefined as LiveRendererCallbacks | undefined,
}));
vi.mock("@/services/livePlayback", () => ({
  getLivePlayback: () => playback.renderer,
  subscribeLivePlayback: (listener: LiveRendererCallbacks) => {
    playback.listener = listener;
    return () => { playback.listener = undefined; };
  },
  needsLivePlaybackPreparation: () => false,
}));

import { useMidiControls } from "@/composables/useMidiControls";
import { useMusicStore } from "@/stores/music";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useInstrumentStore } from "@/stores/instrument";
import { useVisualConfigStore } from "@/stores/visualConfig";
import * as audio from "@/services/superdoughAudio";

let pinia: Pinia;
let wrapper: VueWrapper | undefined;
let midiDescriptor: PropertyDescriptor | undefined;
let input: { id: string; name: string; state: string; onmidimessage: ((event: { data: Uint8Array }) => void) | null };
const EPOCH = 1_800_000_000_000;

function packet(status: number, pitch: number, velocity = 100) {
  input.onmidimessage!({ data: new Uint8Array([status, pitch, velocity]) });
}
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(EPOCH);
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - EPOCH);
  vi.spyOn(window, "dispatchEvent");
  vi.mocked(audio.attackNote).mockResolvedValue(undefined);
  vi.mocked(audio.getAudioContext).mockImplementation(() => ({
    state: "running", currentTime: performance.now() / 1000,
  } as AudioContext));
  playback.renderer = null;
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

describe("every MIDI pitch through the shared performer", () => {
  it.each<[string, MusicalMode, number, string, string, boolean]>([
    ["C", "major", 66, "F#4", "Fi", true],
    ["D", "minor", 66, "F#4", "Mi", true],
    ["F", "major", 70, "A#4", "Fa", false],
    ["B", "major", 60, "C4", "Ra", true],
    ["C", "major pentatonic", 65, "F4", "Fa", true],
    ["G", "dorian", 66, "F#4", "Ti", true],
    ["C", "chromatic", 66, "F#4", "Fi", false],
    ["C", "major", 0, "C-1", "Do", false],
    ["C", "major", 127, "G9", "So", false],
  ])("plays and labels %s %s MIDI %i", async (key, mode, pitch, noteName, label, borrowed) => {
    const music = useMusicStore();
    music.setKey(key);
    music.setMode(mode);
    await connect();
    packet(0x90, pitch, 37);
    await vi.advanceTimersByTimeAsync(0);
    const [attack] = events("note-played");
    expect(attack).toMatchObject({ noteName, note: { name: label }, isBorrowed: borrowed });
    expect(audio.attackNote).toHaveBeenCalledExactlyOnceWith(attack.noteId, noteName, "piano", { velocity: 37 / 127 });
    expect(music.getActiveNoteNames()).toEqual([noteName]);
    expect(useKeyboardDrawerStore().touch.activeTouches.size).toBe(borrowed ? 0 : 1);
    packet(0x80, pitch);
    await vi.advanceTimersByTimeAsync(0);
    expect(audio.releaseNote).toHaveBeenCalledExactlyOnceWith(attack.noteId);
    expect(events("note-released")).toEqual([expect.objectContaining({ noteId: attack.noteId, noteName, isBorrowed: borrowed })]);
    expect(music.activeNotes.size).toBe(0);
    expect(useKeyboardDrawerStore().touch.activeTouches.size).toBe(0);
  });

  it("accepts all 128 MIDI notes without quantizing their pitches", async () => {
    const music = useMusicStore();
    await connect();
    for (let pitch = 0; pitch <= 127; pitch++) {
      packet(0x90, pitch);
      await vi.advanceTimersByTimeAsync(0);
      const attack = events("note-played").at(-1);
      expect(attack.frequency).toBeCloseTo(440 * 2 ** ((pitch - 69) / 12), 6);
      expect(audio.attackNote).toHaveBeenLastCalledWith(attack.noteId, attack.noteName, "piano", { velocity: 100 / 127 });
      packet(0x80, pitch);
      await vi.advanceTimersByTimeAsync(0);
      expect(audio.releaseNote).toHaveBeenLastCalledWith(attack.noteId);
      expect(music.activeNotes.size).toBe(0);
    }
    expect(audio.attackNote).toHaveBeenCalledTimes(128);
    expect(audio.releaseNote).toHaveBeenCalledTimes(128);
  });

  it("labels every chromatic-mode semitone without marking it borrowed", async () => {
    useMusicStore().setMode("chromatic");
    await connect();
    const labels = ["Do", "Ra", "Re", "Me", "Mi", "Fa", "Fi", "So", "Le", "La", "Te", "Ti"];
    for (const [semitone, name] of labels.entries()) {
      packet(0x90, 60 + semitone);
      await vi.advanceTimersByTimeAsync(0);
      expect(events("note-played").at(-1)).toMatchObject({ note: { name }, isBorrowed: false });
      packet(0x80, 60 + semitone);
      await vi.advanceTimersByTimeAsync(0);
    }
    expect(useMusicStore().activeNotes.size).toBe(0);
  });

  it("retains borrowed identity and velocity on every repeated pulse", async () => {
    useMusicStore().setPlayMode("repeat:16");
    await connect();
    packet(0x90, 66, 19);
    await vi.advanceTimersByTimeAsync(300);
    const attacks = events("note-played");
    expect(attacks).toHaveLength(3);
    expect(attacks.every(attack => attack.noteName === "F#4" && attack.note.name === "Fi" && attack.isBorrowed)).toBe(true);
    expect(vi.mocked(audio.attackNote).mock.calls.every(([, pitch, , options]) => pitch === "F#4" && options?.velocity === 19 / 127)).toBe(true);
    packet(0x80, 66);
    await vi.advanceTimersByTimeAsync(1000);
    expect(useMusicStore().activeNotes.size).toBe(0);
    expect(events("note-played")).toHaveLength(3);
  });

  it("treats velocity zero as off and ignores an unmatched off", async () => {
    await connect();
    packet(0x90, 66, 0);
    expect(audio.attackNote).not.toHaveBeenCalled();
    packet(0x90, 66);
    await vi.advanceTimersByTimeAsync(0);
    const [attack] = events("note-played");
    packet(0x90, 66, 0);
    await vi.advanceTimersByTimeAsync(0);
    expect(audio.releaseNote).toHaveBeenCalledExactlyOnceWith(attack.noteId);
    expect(useMusicStore().activeNotes.size).toBe(0);
  });

  it("pairs repeated borrowed note-ons with their own voices in arrival order", async () => {
    await connect();
    packet(0x90, 66, 20);
    packet(0x90, 66, 110);
    await vi.advanceTimersByTimeAsync(0);
    const [first, second] = events("note-played");
    expect(first.noteId).not.toBe(second.noteId);
    expect(vi.mocked(audio.attackNote).mock.calls.map(([, name, , options]) => [name, options?.velocity])).toEqual([
      ["F#4", 20 / 127], ["F#4", 110 / 127],
    ]);
    packet(0x80, 66);
    await vi.advanceTimersByTimeAsync(0);
    expect(audio.releaseNote).toHaveBeenCalledExactlyOnceWith(first.noteId);
    expect(useMusicStore().getActiveNotes().map(note => note.noteId)).toEqual([second.noteId]);
    packet(0x80, 66);
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.mocked(audio.releaseNote).mock.calls).toEqual([[first.noteId], [second.noteId]]);
    expect(useMusicStore().activeNotes.size).toBe(0);
  });

  it("keeps MIDI channels and on-screen unisons independently owned across key changes", async () => {
    const music = useMusicStore();
    await connect();
    const screenId = await music.attackExactPitch("F#4");
    packet(0x90, 66);
    packet(0x91, 66);
    await vi.advanceTimersByTimeAsync(0);
    const [, first, second] = events("note-played");
    music.setKey("D");
    packet(0x80, 66);
    await vi.advanceTimersByTimeAsync(0);
    expect(audio.releaseNote).toHaveBeenCalledExactlyOnceWith(first.noteId);
    expect(music.getActiveNotes().map(note => note.noteId)).toEqual([screenId, second.noteId]);
    packet(0x81, 66);
    await vi.advanceTimersByTimeAsync(0);
    expect(music.getActiveNotes().map(note => note.noteId)).toEqual([screenId]);
    await music.releaseNote(screenId!);
  });

  it("handles off and reattack while an earlier borrowed attack is still pending", async () => {
    let resolveAttack!: () => void;
    vi.mocked(audio.attackNote).mockImplementationOnce(() => new Promise<void>(resolve => { resolveAttack = resolve; }));
    await connect();
    packet(0x90, 66);
    const firstId = vi.mocked(audio.attackNote).mock.calls[0][0];
    packet(0x80, 66);
    packet(0x90, 66);
    await vi.advanceTimersByTimeAsync(0);
    const [second] = events("note-played");
    resolveAttack();
    await vi.advanceTimersByTimeAsync(0);
    expect(audio.stopNote).toHaveBeenCalledWith(firstId);
    expect(useMusicStore().getActiveNotes().map(note => note.noteId)).toEqual([second.noteId]);
    packet(0x80, 66);
    await vi.advanceTimersByTimeAsync(0);
    expect(audio.releaseNote).toHaveBeenCalledExactlyOnceWith(second.noteId);
  });

  it("cancels a borrowed attack that settles after MIDI disconnect", async () => {
    let resolveAttack!: () => void;
    vi.mocked(audio.attackNote).mockImplementationOnce(() => new Promise<void>(resolve => { resolveAttack = resolve; }));
    await connect();
    packet(0x90, 66);
    const firstId = vi.mocked(audio.attackNote).mock.calls[0][0];
    wrapper!.unmount();
    wrapper = undefined;
    resolveAttack();
    await vi.advanceTimersByTimeAsync(0);
    expect(audio.stopNote).toHaveBeenCalledWith(firstId);
    expect(events("note-played")).toEqual([]);
    expect(useMusicStore().activeNotes.size).toBe(0);
  });

  it("uses the shared la-based minor syllables for borrowed notes", async () => {
    useMusicStore().setKey("A");
    useMusicStore().setMode("minor");
    useVisualConfigStore().laBasedMinor = true;
    await connect();
    packet(0x90, 68);
    await vi.advanceTimersByTimeAsync(0);
    expect(events("note-played")[0]).toMatchObject({ noteName: "G#4", note: { name: "Si" }, isBorrowed: true });
    packet(0x80, 68);
    await vi.advanceTimersByTimeAsync(0);
    expect(useMusicStore().activeNotes.size).toBe(0);
  });

  it("passes borrowed pitch and velocity into the worklet and renders sound before releasing it", async () => {
    const sampleRate = 1000;
    const core = new LiveAudioCore(sampleRate, response => {
      if (response.type === "event") playback.listener?.onEvent(response.event);
      else if (response.type === "plan") playback.listener?.onPlan?.(response.events);
      else if (response.type === "owner-ended") playback.listener?.onOwnerEnded?.(response.ownerId);
    });
    let frame = 0;
    core.command({ type: "prepare", requestId: 1, instrument: {
      kind: "oscillator", waveform: "sine", instrumentId: "piano", gain: 1, attack: 0, decay: 0, sustain: 1, release: 0,
    } }, frame);
    playback.renderer = {
      press: (ownerId, notes) => core.command({ type: "press", ownerId, notes }, frame),
      release: ownerId => core.command({ type: "release", ownerId }, frame),
      configure: config => core.command({ type: "configure", config }, frame),
      clear: () => core.command({ type: "clear" }, frame),
      dispose: () => {}, forget: async () => {},
    };
    const render = (length: number) => {
      const output = [new Float32Array(length), new Float32Array(length)];
      core.render(output, frame);
      frame += length;
      return output[0];
    };
    await connect();
    packet(0x90, 66, 32);
    await vi.advanceTimersByTimeAsync(0);
    const quiet = render(100);
    expect(Math.max(...quiet.map(Math.abs))).toBeGreaterThan(.2);
    expect(Math.max(...quiet.map(Math.abs))).toBeLessThanOrEqual(32 / 127);
    expect(events("note-played")[0]).toMatchObject({ noteName: "F#4", note: { name: "Fi" }, isBorrowed: true });
    packet(0x80, 66);
    await vi.advanceTimersByTimeAsync(0);
    expect(render(100).every(sample => sample === 0)).toBe(true);
    expect(useMusicStore().activeNotes.size).toBe(0);
    expect(audio.attackNote).not.toHaveBeenCalled();
  });
});
