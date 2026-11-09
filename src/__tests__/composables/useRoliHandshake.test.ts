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
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useInstrumentStore } from "@/stores/instrument";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { getAudioContext } from "@/services/audioRuntime";
import { ROLI_SCRIPT_VERSION } from "@/services/roliLiveSync";

type FakeInput = { id: string; name: string; state: string; onmidimessage: ((event: { data: Uint8Array }) => void) | null };
let pinia: Pinia;
let wrapper: VueWrapper | undefined;
let midiDescriptor: PropertyDescriptor | undefined;
let roli: FakeInput;
let keyboard: FakeInput;
let sent: number[][];
let output: { id: string; name: string; type: string; state: string; send: (message: number[]) => void };
let access: { inputs: Map<string, FakeInput>; outputs: Map<string, typeof output>; onstatechange: ((event: unknown) => void) | null };
const EPOCH = 1_800_000_000_000;

const fromRoli = (...bytes: number[]) => roli.onmidimessage!({ data: new Uint8Array(bytes) });
const fromKeyboard = (...bytes: number[]) => keyboard.onmidimessage!({ data: new Uint8Array(bytes) });
const pings = () => sent.filter(([status, controller]) => status === 0xbf && controller === 112);

async function connect() {
  wrapper = mount({ template: "<div />", setup() { useMidiControls(); } }, {
    global: { plugins: [pinia] },
  });
  await vi.advanceTimersByTimeAsync(0);
  expect(useKeyboardDrawerStore().midi.syncedOutput).toBe("ROLI Piano");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(EPOCH);
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - EPOCH);
  vi.mocked(getAudioContext).mockImplementation(() => ({
    state: "running", currentTime: performance.now() / 1000,
  } as AudioContext));
  seat.listeners.clear();
  attachLiveCore(seat);
  roli = { id: "roli-in", name: "ROLI Piano", state: "connected", onmidimessage: null };
  keyboard = { id: "keys-in", name: "MIDI keyboard", state: "connected", onmidimessage: null };
  sent = [];
  output = { id: "roli-out", name: "ROLI Piano", type: "output", state: "connected", send: (message) => { sent.push(message); } };
  access = { inputs: new Map([[roli.id, roli], [keyboard.id, keyboard]]), outputs: new Map([[output.id, output]]), onstatechange: null };
  midiDescriptor = Object.getOwnPropertyDescriptor(navigator, "requestMIDIAccess");
  Object.defineProperty(navigator, "requestMIDIAccess", { configurable: true, value: vi.fn().mockResolvedValue(access) });
  pinia = createPinia();
  setActivePinia(pinia);
  useVisualConfigStore().useEphemeralDefaults();
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

describe("the ROLI script handshake", () => {
  it("asks a newly connected ROLI whether the EmotiTone script is running", async () => {
    await connect();
    expect(pings()).toEqual([[0xbf, 112, 0]]);
    expect(useKeyboardDrawerStore().midi.syncedScriptVersion).toBeNull();
  });

  it("knows the script is running when the piano answers with its version", async () => {
    await connect();
    fromRoli(0xbf, 112, ROLI_SCRIPT_VERSION);
    expect(useKeyboardDrawerStore().midi.syncedScriptVersion).toBe(ROLI_SCRIPT_VERSION);
  });

  it("does not take its own ping, echoed back, for an answer", async () => {
    await connect();
    fromRoli(0xbf, 112, 0);
    expect(useKeyboardDrawerStore().midi.syncedScriptVersion).toBeNull();
  });

  it("forgets the script when the piano's output goes away", async () => {
    await connect();
    fromRoli(0xbf, 112, ROLI_SCRIPT_VERSION);
    output.state = "disconnected";
    access.onstatechange!({ port: { ...output, type: "output" } });
    expect(useKeyboardDrawerStore().midi.syncedScriptVersion).toBeNull();
  });

  it("follows the piano's own octave buttons without sending the octave back", async () => {
    await connect();
    sent = [];
    fromRoli(0xbf, 111, 6);
    await vi.advanceTimersByTimeAsync(0);
    expect(useKeyboardDrawerStore().keyboardConfig.mainOctave).toBe(6);
    expect(sent.filter(([status, controller]) => status === 0xbf && controller === 111)).toEqual([]);
    useKeyboardDrawerStore().setMainOctave(3);
    await vi.advanceTimersByTimeAsync(0);
    expect(sent.filter(([status, controller]) => status === 0xbf && controller === 111)).toEqual([[0xbf, 111, 3]]);
  });

  it("ignores sync controllers from a keyboard that is not the ROLI", async () => {
    await connect();
    const before = useKeyboardDrawerStore().keyboardConfig.mainOctave;
    fromKeyboard(0xbf, 112, ROLI_SCRIPT_VERSION);
    fromKeyboard(0xbf, 111, before === 6 ? 2 : 6);
    expect(useKeyboardDrawerStore().midi.syncedScriptVersion).toBeNull();
    expect(useKeyboardDrawerStore().keyboardConfig.mainOctave).toBe(before);
  });
});
