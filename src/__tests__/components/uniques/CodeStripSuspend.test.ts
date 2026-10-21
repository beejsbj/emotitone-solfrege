import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick, reactive } from "vue";
import type { PatternNote } from "@/types/patterns";
import type { TransportCommand, TransportResponse } from "@/audio/live/transport";
import { TRANSPORT_EVENT_FIELDS, TransportEventKind } from "@/audio/live/transportEvents";

/**
 * BJS-563: the strip's highlight stops while audio is suspended or
 * interrupted, and resumes in step with the sound.
 *
 * The real Code Strip, pattern player and HighlightStrip run against a fake
 * AudioContext whose state and clock the test controls (its time advances only
 * while it is running, as a real one's does) and a fake worklet port whose
 * event batches the test emits. Only what the listener sees is observed: the
 * note's fill and whether it reads as sounding.
 */
const mocks = vi.hoisted(() => ({
  phrasesStore: null as any,
  instrumentStore: null as any,
  visualConfigStore: null as any,
  listeners: new Set<any>(),
  commands: [] as any[],
  rafCallbacks: [] as FrameRequestCallback[],
  context: null as any,
  controller: null as any,
}));

vi.mock("@/stores/phrases", () => ({ usePhrasesStore: () => mocks.phrasesStore }));
vi.mock("@/stores/instrument", () => ({ useInstrumentStore: () => mocks.instrumentStore }));
vi.mock("@/stores/looper", () => ({ useLooperStore: () => ({ deskMemberId: null }) }));
vi.mock("@/stores/visualConfig", () => ({ useVisualConfigStore: () => mocks.visualConfigStore }));
vi.mock("@/composables/useCodeStripStrudel", () => ({
  useCodeStripStrudel: () => ({
    attachEditor: (controller: unknown) => { mocks.controller = controller; }, detachEditor: vi.fn(), syncCode: vi.fn(),
    setPlaying: vi.fn(), setError: vi.fn(), isPlaying: { value: false },
  }),
}));
vi.mock("@/services/superdoughAudio", () => ({
  initSuperdoughAudio: vi.fn().mockResolvedValue(undefined),
  ensureSoundfontCatalog: vi.fn().mockResolvedValue(undefined),
  getSuperdoughMasterGain: () => ({}),
  getAudioContext: () => mocks.context,
}));
vi.mock("@/services/audioLifecycle", () => ({
  resumeAudioContext: () => undefined,
  holdAudioActivity: () => () => {},
}));
vi.mock("@/services/livePlayback", () => ({
  prepareLivePlayback: vi.fn().mockResolvedValue(undefined),
  getLiveTransport: () => ({ send: (command: unknown) => mocks.commands.push(command), sampleRate: 1000, generation: 1 }),
  getLivePlaybackFailure: () => undefined,
  pinLivePlayback: () => () => {},
  subscribeLivePlayback: (listener: unknown) => {
    mocks.listeners.add(listener);
    return () => mocks.listeners.delete(listener);
  },
}));
vi.mock("@strudel/core", () => ({ repl: vi.fn(), evalScope: vi.fn() }));

import CodeStrip from "@/components/uniques/CodeStrip/index.vue";
import { uiBeatClock } from "@/composables/useUIBeat";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";

type ContextState = "running" | "suspended" | "interrupted";

/**
 * An AudioContext whose `currentTime` runs only while it is running, with the
 * `statechange` event a browser fires. `getOutputTimestamp` pairs the audio
 * clock with the performance clock, as the heard-time estimate does.
 */
class FakeContext extends EventTarget {
  state: ContextState = "running";
  sampleRate = 1000;
  baseLatency = 0;
  outputLatency = 0;
  private audioTime = 0;
  private lastPerformance = performance.now();

  get currentTime() { this.settle(); return this.audioTime; }
  getOutputTimestamp() { return { contextTime: this.currentTime, performanceTime: performance.now() }; }

  /** The audio clock is moved by wall time only while running. */
  private settle() {
    const time = performance.now();
    if (this.state === "running") this.audioTime += (time - this.lastPerformance) / 1000;
    this.lastPerformance = time;
  }

  setState(state: ContextState) {
    this.settle();
    this.state = state;
    this.dispatchEvent(new Event("statechange"));
  }
}

const recordedNote: PatternNote = {
  id: "c", note: "C4", scaleDegree: 1, scaleIndex: 0, octave: 4, pressTime: 1000, releaseTime: 1500, duration: 500,
};

function emit(response: TransportResponse) {
  for (const listener of [...mocks.listeners]) listener.onTransport?.(response);
}

/** One worklet event batch: [kind, serial, generation, noteIndex, frame, bar, length]. */
function batch(...records: number[][]) {
  const values = new Float64Array(records.length * TRANSPORT_EVENT_FIELDS);
  records.forEach((record, index) => values.set(record, index * TRANSPORT_EVENT_FIELDS));
  return { type: "transport-events" as const, buffer: values.buffer, count: records.length };
}

/** Wall time passes, with a painted frame every 16 ms as a screen would paint. */
async function elapse(ms: number) {
  for (let left = ms; left > 0; left -= 16) {
    vi.advanceTimersByTime(Math.min(16, left));
    for (const callback of mocks.rafCallbacks.splice(0)) callback(performance.now());
  }
  await nextTick();
}

function readStrip(wrapper: ReturnType<typeof mount>) {
  const note = wrapper.get(".code-strip__note").element as HTMLElement;
  return {
    fill: Number(note.style.getPropertyValue("--code-strip-progress")),
    sounding: wrapper.get('[data-event-index="0"]').attributes("data-active") === "true",
  };
}

async function startPlaying() {
  const wrapper = mount(CodeStrip);
  await flushPromises();
  return wrapper;
}

/** The Play tap: the strip's controller evaluates the take on the transport. */
async function play(wrapper: ReturnType<typeof mount>) {
  await mocks.controller.evaluate();
  await wrapper.vm.$nextTick();
  const join = (mocks.commands as TransportCommand[])
    .filter((command): command is Extract<TransportCommand, { type: "transport-change" }> =>
      command.type === "transport-change" && command.change.type === "join").at(-1)!;
  return (join.change as Extract<typeof join.change, { type: "join" }>).member.table.generation;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["performance", "Date"] });
  // performance.now() starts at 0 under fake timers; a heard time is never 0.
  vi.advanceTimersByTime(10_000);
  uiBeatClock.stop();
  mocks.context = new FakeContext();
  mocks.commands = [];
  mocks.listeners.clear();
  mocks.rafCallbacks = [];
  mocks.phrasesStore = reactive({
    takeNotes: [recordedNote],
    takeContext: {
      mode: "major", key: "C", instrument: "sine", bpm: 120,
      shape: { cutoff: 12000, resonance: 0, room: 0, delay: 0, attack: null, release: null }, octave: 4,
    },
    takeDuration: 500, lastLiveNoteId: recordedNote.id, takeId: "take-1",
  });
  mocks.instrumentStore = reactive({ isInteractionLocked: false });
  mocks.visualConfigStore = reactive({
    laBasedMinor: false,
    config: {
      ...structuredClone(DEFAULT_CONFIG),
      codeStrip: { enabled: true, opacity: 1, bpm: 120, notation: "solfege", showRests: true },
      keyboard: { mainOctave: 4, surfaceStyle: "colored", keyBrightness: 1, keySaturation: 1 },
    },
  });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => mocks.rafCallbacks.push(callback));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe.each(["suspended", "interrupted"] as const)("the highlight while audio is %s", (cause) => {
  it("freezes mid-note and continues from where the sound continues", async () => {
    const wrapper = await startPlaying();
    const generation = await play(wrapper);

    // A note with a 1 s gate is heard from the start of the audio clock.
    emit(batch([TransportEventKind.Attack, 1, generation, 0, mocks.context.currentTime * 1000, 0, 1000]));
    await elapse(400);
    expect(readStrip(wrapper)).toEqual({ fill: expect.closeTo(0.4, 1), sounding: true });

    // An iOS call, or a backgrounded page: audio stops, the wall clock does not.
    mocks.context.setState(cause);
    await elapse(5000);
    expect(readStrip(wrapper)).toEqual({ fill: expect.closeTo(0.4, 1), sounding: true });

    // The sound picks up 300 ms in; so does the light.
    mocks.context.setState("running");
    await elapse(300);
    expect(readStrip(wrapper)).toEqual({ fill: expect.closeTo(0.7, 1), sounding: true });

    // A forced fade ends the note at 800 ms of its audio, 100 ms past the point
    // the sound has reached: the light follows the release, not the 1 s gate.
    emit(batch([TransportEventKind.Release, 1, generation, 0, 800, 0.4, 0.01]));
    await elapse(50);
    expect(readStrip(wrapper)).toMatchObject({ sounding: true });
    await elapse(100);
    expect(readStrip(wrapper)).toEqual({ fill: 1, sounding: false });
    wrapper.unmount();
  });

  it("times a note announced after the resume on the sound, not on the pause", async () => {
    const wrapper = await startPlaying();
    const generation = await play(wrapper);
    await elapse(100);
    mocks.context.setState(cause);
    await elapse(5000);
    mocks.context.setState("running");
    await elapse(50);

    // The next pass is announced 100 ms of audio ahead, on the fresh mapping.
    emit(batch([TransportEventKind.Attack, 1, generation, 0, mocks.context.currentTime * 1000 + 100, 0, 500]));
    await elapse(60);
    expect(readStrip(wrapper)).toEqual({ fill: 0, sounding: false });
    await elapse(80);
    expect(readStrip(wrapper)).toMatchObject({ sounding: true });
    wrapper.unmount();
  });

  it("stays with the sound through a pause no frame was painted in", async () => {
    const wrapper = await startPlaying();
    const generation = await play(wrapper);
    emit(batch([TransportEventKind.Attack, 1, generation, 0, mocks.context.currentTime * 1000, 0, 1000]));
    await elapse(400);

    // A backgrounded page paints nothing; the clock still moves, and so does the state.
    mocks.context.setState(cause);
    vi.advanceTimersByTime(5000);
    mocks.context.setState("running");
    await elapse(300);
    expect(readStrip(wrapper)).toEqual({ fill: expect.closeTo(0.7, 1), sounding: true });
    wrapper.unmount();
  });

  it("does not light a note that was announced ahead until the sound reaches it", async () => {
    const wrapper = await startPlaying();
    const generation = await play(wrapper);

    // The worklet announces a note 200 ms ahead of the audio clock...
    emit(batch([TransportEventKind.Attack, 1, generation, 0, mocks.context.currentTime * 1000 + 200, 0, 500]));
    await elapse(100);
    expect(readStrip(wrapper).sounding).toBe(false);

    // ...then audio stops before it is reached. The wall clock passes its onset.
    mocks.context.setState(cause);
    await elapse(3000);
    expect(readStrip(wrapper)).toEqual({ fill: 0, sounding: false });

    // Resumed, the sound reaches the note 100 ms later, and so does the light.
    mocks.context.setState("running");
    await elapse(60);
    expect(readStrip(wrapper).sounding).toBe(false);
    await elapse(80);
    expect(readStrip(wrapper).sounding).toBe(true);
    wrapper.unmount();
  });
});
