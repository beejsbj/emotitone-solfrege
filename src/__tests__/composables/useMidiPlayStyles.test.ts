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

const EPOCH = 1_800_000_000_000;
let pinia: Pinia;
let wrapper: VueWrapper | undefined;
let midiDescriptor: PropertyDescriptor | undefined;
let input: { id: string; name: string; state: string; onmidimessage: ((event: { data: Uint8Array }) => void) | null };
let send: ReturnType<typeof vi.fn>;

function packet(status: number, pitch: number) {
  expect(input.onmidimessage).toBeTypeOf("function");
  input.onmidimessage!({ data: new Uint8Array([status, pitch, status === 0x90 ? 100 : 0]) });
}

function notes() {
  return send.mock.calls.map(([message]) => message as number[])
    .filter(([status]) => (status & 0xf0) === 0x90 || (status & 0xf0) === 0x80)
    .map(([status, pitch]) => [status & 0xf0, pitch]);
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

    // The shared test setup replaces dispatchEvent. Route production listeners
    // through it so these tests exercise the complete music-to-MIDI event path.
    const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
    vi.spyOn(window, "addEventListener").mockImplementation((type, listener) => {
      if (!listener) return;
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    });
    vi.spyOn(window, "removeEventListener").mockImplementation((type, listener) => {
      if (listener) listeners.get(type)?.delete(listener);
    });
    vi.mocked(window.dispatchEvent).mockImplementation((event) => {
      for (const listener of listeners.get(event.type) ?? []) {
        if (typeof listener === "function") listener.call(window, event);
        else listener.handleEvent(event);
      }
      return true;
    });

    input = { id: "roli-input", name: "LUMI Keys", state: "connected", onmidimessage: null };
    send = vi.fn();
    midiDescriptor = Object.getOwnPropertyDescriptor(navigator, "requestMIDIAccess");
    Object.defineProperty(navigator, "requestMIDIAccess", {
      configurable: true,
      value: vi.fn().mockResolvedValue({
        inputs: new Map([[input.id, input]]),
        outputs: new Map([["roli-output", { id: "roli-output", name: "LUMI Keys", state: "connected", send }]]),
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
    vi.mocked(window.dispatchEvent).mockReset();
    vi.clearAllTimers();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("mirrors every arpeggio pulse from a held ROLI chord, including its first note", async () => {
    const music = useMusicStore();
    music.setPlayStyle("arp-up");
    await connect();
    [60, 64, 67].forEach((pitch) => packet(0x90, pitch));
    await vi.advanceTimersByTimeAsync(740);
    expect(notes()).toEqual([
      [0x90, 60], [0x80, 60], [0x90, 64], [0x80, 64], [0x90, 67], [0x80, 67],
    ]);
    [60, 64, 67].forEach((pitch) => packet(0x80, pitch));
    await vi.advanceTimersByTimeAsync(1000);
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

  it("starts mirroring when a held ordinary ROLI note changes to Repeat", async () => {
    const music = useMusicStore();
    await connect();
    packet(0x90, 60);
    await vi.advanceTimersByTimeAsync(0);
    expect(notes()).toEqual([]); // The original ROLI press suppresses its own echo.
    music.setPlayStyle("repeat");
    await vi.advanceTimersByTimeAsync(300);
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

  it("preserves a pending input across a mode change without suppressing later app notes", async () => {
    const music = useMusicStore();
    await connect();
    let resolveAttack!: () => void;
    vi.mocked(audio.attackNote).mockImplementationOnce(() => new Promise<void>((resolve) => { resolveAttack = resolve; }));
    packet(0x90, 60);
    music.setPlayStyle("repeat");
    resolveAttack();
    await vi.advanceTimersByTimeAsync(300);
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
