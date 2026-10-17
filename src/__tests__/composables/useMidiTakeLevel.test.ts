import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, disposePinia, setActivePinia, type Pinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LogNote } from "@/types/patterns";
import { TRANSPORT_EVENT_FIELDS, TransportEventKind } from "@/audio/live/transportEvents";
import type { TransportCommand, TransportResponse } from "@/audio/live/transport";

vi.unmock("@/services/music");
vi.unmock("@/data");
vi.unmock("@/composables/useVisualConfig");

/**
 * BJS-556: MIDI out follows what is heard. A soft take plays at full level in
 * the app, so the ROLI / external synth gets the full-level note-on, not the
 * recorded velocity. The real pattern player turns worklet records into
 * `note-played` events; the real MIDI mirror turns those into note-on packets.
 */
const harness = vi.hoisted(() => ({
  commands: [] as unknown[],
  listeners: new Set<{ onTransport?: (response: unknown) => void }>(),
}));
vi.mock("@/services/livePlayback", () => ({
  prepareLivePlayback: vi.fn().mockResolvedValue(undefined),
  getLiveTransport: () => ({ send: (command: unknown) => harness.commands.push(command), sampleRate: 1000, generation: 1 }),
  getLivePlaybackFailure: () => undefined,
  pinLivePlayback: () => () => {},
  getLivePlayback: () => null,
  waitForLivePlayback: () => undefined,
  needsLivePlaybackPreparation: () => false,
  subscribeLivePlayback: (listener: { onTransport?: (response: unknown) => void }) => {
    harness.listeners.add(listener);
    return () => harness.listeners.delete(listener);
  },
}));

import { useMidiControls } from "@/composables/useMidiControls";
import { createPatternPlayer } from "@/services/patternTransport";
import { UIBeatClock } from "@/composables/useUIBeat";
import * as audio from "@/services/superdoughAudio";

const EPOCH = 1_800_000_000_000;
let pinia: Pinia;
let wrapper: VueWrapper | undefined;
let midiDescriptor: PropertyDescriptor | undefined;

const note = (id: string, pitch: string, start: number, velocity?: number) => ({
  id, note: pitch, key: "C", mode: "major", scaleIndex: pitch === "C4" ? 0 : 1, octave: 4,
  pressTime: start, releaseTime: start + 400, duration: 400, instrument: "sine",
  ...(velocity === undefined ? {} : { velocity }),
}) as unknown as LogNote;

function batch(...records: number[][]) {
  const values = new Float64Array(records.length * TRANSPORT_EVENT_FIELDS);
  records.forEach((record, index) => values.set(record, index * TRANSPORT_EVENT_FIELDS));
  return { type: "transport-events" as const, buffer: values.buffer, count: records.length };
}

/** Play a take on the real pattern player and sound its first note; return the MIDI note-on messages sent. */
async function midiNoteOns(velocities: (number | undefined)[]) {
  const send = vi.fn();
  const access = await navigator.requestMIDIAccess();
  (access.outputs as unknown as Map<string, unknown>).set("roli", {
    id: "roli", name: "LUMI Keys", state: "connected", send, clear: vi.fn(),
  });
  wrapper = mount({ template: "<div />", setup() { useMidiControls(); } }, { global: { plugins: [pinia] } });
  await vi.advanceTimersByTimeAsync(0);

  const context = { state: "running", currentTime: 0, sampleRate: 1000, baseLatency: 0, outputLatency: 0,
    addEventListener: vi.fn(), removeEventListener: vi.fn() };
  const player = createPatternPlayer({
    audio: { getContext: () => context as unknown as AudioContext, ensureReady: async () => ({} as AudioNode) },
    uiBeat: new UIBeatClock({ observeEnvironment: false }),
    target: window,
    requestFrame: () => 0,
    cancelFrame: () => {},
  });
  const notes = velocities.map((velocity, index) => note(`n${index}`, index % 2 ? "D4" : "C4", index * 500, velocity));
  await player.play({ id: "take", notes, config: { sourceBpm: 120, bpm: 120 }, instrument: "sine",
    key: "C", mode: "major", bpm: 120 });
  const join = (harness.commands as TransportCommand[]).find(command =>
    command.type === "transport-change" && command.change.type === "join") as Extract<TransportCommand, { type: "transport-change" }>;
  const generation = (join.change as { member: { table: { generation: number } } }).member.table.generation;
  // Sound every note: [kind, serial, generation, noteIndex, frame, bar, length].
  const records = velocities.map((_, index) => [TransportEventKind.Attack, index + 1, generation, index, 100 + index * 500, 0, 400]);
  for (const listener of [...harness.listeners]) listener.onTransport?.(batch(...records) as TransportResponse);
  await vi.advanceTimersByTimeAsync(2000);
  player.dispose();
  return send.mock.calls.map(([message]) => Array.from(message as number[])).filter(message => (message[0] & 0xf0) === 0x90);
}

beforeEach(() => {
  vi.clearAllMocks();
  harness.commands = [];
  harness.listeners.clear();
  vi.useFakeTimers();
  vi.setSystemTime(EPOCH);
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - EPOCH);
  vi.mocked(audio.getAudioContext).mockImplementation(() => ({
    state: "running", currentTime: performance.now() / 1000,
  } as AudioContext));
  midiDescriptor = Object.getOwnPropertyDescriptor(navigator, "requestMIDIAccess");
  Object.defineProperty(navigator, "requestMIDIAccess", {
    configurable: true,
    value: vi.fn().mockResolvedValue({ inputs: new Map(), outputs: new Map(), onstatechange: null }),
  });
  pinia = createPinia();
  setActivePinia(pinia);
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

describe("MIDI out follows the take's playback level", () => {
  it("sends full-level note-ons for an evenly soft take", async () => {
    const noteOns = await midiNoteOns([.3, .3]);
    expect(noteOns.map(message => message[2])).toEqual([127, 127]);
  });

  it("keeps the ratios of a soft-to-loud take, loudest at 127", async () => {
    const noteOns = await midiNoteOns([.2, .1]);
    expect(noteOns.map(message => message[2])).toEqual([127, Math.round(127 / 2)]);
  });
});
