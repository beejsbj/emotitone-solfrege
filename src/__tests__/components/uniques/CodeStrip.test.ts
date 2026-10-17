import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick, reactive } from "vue";
import type { PatternNote } from "@/types/patterns";
import type { TransportCommand, TransportResponse } from "@/audio/live/transport";
import { TRANSPORT_EVENT_FIELDS, TransportEventKind } from "@/audio/live/transportEvents";

/**
 * The production Code Strip plays the take on the worklet transport. The
 * worklet itself is replaced by a fake transport port: these tests drive the
 * real pattern player through its message contract (commands out, receipts,
 * anchors and event batches in) and observe the strip, the window note
 * events, UIBeat and the audio lifecycle.
 */
const mocks = vi.hoisted(() => ({
  phrasesStore: null as any,
  instrumentStore: null as any,
  visualConfigStore: null as any,
  commands: [] as any[],
  listeners: new Set<any>(),
  portReady: true,
  failure: undefined as undefined | { kind: "load" | "fallback"; reason: string },
  pins: [] as string[][],
  releasedPins: 0,
  holds: 0,
  releasedHolds: 0,
  strudelRepl: vi.fn(),
  attachEditor: vi.fn(),
  detachEditor: vi.fn(),
  syncCode: vi.fn(),
  setPlaying: vi.fn(),
  setError: vi.fn(),
  rafCallbacks: [] as FrameRequestCallback[],
  usePhrasesStore: vi.fn(),
  useInstrumentStore: vi.fn(),
  useVisualConfigStore: vi.fn(),
  useCodeStripStrudel: vi.fn(),
  outputContextTime: 0,
  audioContext: {
    currentTime: 0,
    sampleRate: 1000,
    state: "running",
    baseLatency: 0,
    outputLatency: 0,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getOutputTimestamp: () => ({ contextTime: mocks.outputContextTime, performanceTime: performance.now() }),
  } as any,
  isPlaying: { value: false },
}));

vi.mock("@/stores/phrases", () => ({ usePhrasesStore: mocks.usePhrasesStore }));
vi.mock("@/stores/instrument", () => ({ useInstrumentStore: mocks.useInstrumentStore }));
vi.mock("@/stores/visualConfig", () => ({ useVisualConfigStore: mocks.useVisualConfigStore }));
vi.mock("@/composables/useCodeStripStrudel", () => ({ useCodeStripStrudel: mocks.useCodeStripStrudel }));

function playbackWiring() {
  return {
    attachEditor: mocks.attachEditor,
    detachEditor: mocks.detachEditor,
    syncCode: mocks.syncCode,
    setPlaying: mocks.setPlaying,
    setError: mocks.setError,
    isPlaying: mocks.isPlaying,
  };
}

vi.mock("@/services/StrudelNotation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/StrudelNotation")>();
  return {
    ...actual,
    renderStrudelNotation: (notes: PatternNote[], config: { bpm: number }) => {
      let code = "`< ";
      const spans: Array<{ noteId: string; from: number; to: number }> = [];
      notes.forEach((note, index) => {
        if (index) code += " ";
        spans.push({ noteId: note.id, from: code.length, to: code.length + note.note.length });
        code += `${note.note}@0.25`;
      });
      code += ` >\`.as("note").sound("sine").cpm(${config.bpm} / 4)`;
      return { code, spans };
    },
  };
});

vi.mock("@/services/superdoughAudio", () => ({
  initSuperdoughAudio: vi.fn().mockResolvedValue(undefined),
  ensureSoundfontCatalog: vi.fn().mockResolvedValue(undefined),
  getSuperdoughMasterGain: () => ({}),
  getAudioContext: () => mocks.audioContext,
}));

vi.mock("@/services/audioLifecycle", () => ({
  resumeAudioContext: () => undefined,
  holdAudioActivity: () => {
    mocks.holds++;
    return () => { mocks.releasedHolds++; };
  },
}));

// The worklet's transport port: commands are recorded, responses are emitted by the test.
vi.mock("@/services/livePlayback", () => ({
  prepareLivePlayback: vi.fn().mockResolvedValue(undefined),
  getLiveTransport: () => mocks.portReady
    ? { send: (command: unknown) => mocks.commands.push(command), sampleRate: 1000, generation: 1 }
    : undefined,
  getLivePlaybackFailure: () => mocks.failure,
  pinLivePlayback: (_holder: string, names: string[]) => {
    mocks.pins.push(names);
    return () => { mocks.releasedPins++; };
  },
  subscribeLivePlayback: (listener: unknown) => {
    mocks.listeners.add(listener);
    return () => mocks.listeners.delete(listener);
  },
}));

// Strudel's REPL must never be constructed for playback.
vi.mock("@strudel/core", () => ({ repl: mocks.strudelRepl, evalScope: vi.fn() }));

import CodeStrip from "@/components/uniques/CodeStrip/index.vue";
import { uiBeatClock } from "@/composables/useUIBeat";
import { getActivePatternStageNotes, getPatternPlaybackDiagnostics, PatternLoadError } from "@/services/patternTransport";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";

const recordedNote: PatternNote = {
  id: "c",
  note: "C4",
  scaleDegree: 1,
  scaleIndex: 0,
  octave: 4,
  pressTime: 1000,
  releaseTime: 1500,
  duration: 500,
};

function controllerOf() {
  return mocks.attachEditor.mock.calls[0][0];
}

function emit(response: TransportResponse) {
  for (const listener of [...mocks.listeners]) listener.onTransport?.(response);
}

function commandsOf<T extends TransportCommand["type"]>(type: T) {
  return mocks.commands.filter(command => command.type === type) as Extract<TransportCommand, { type: T }>[];
}

/** The member table the player joined most recently. */
function joinedTable() {
  const join = commandsOf("transport-change").filter(command => command.change.type === "join").at(-1)!;
  return (join.change as Extract<typeof join.change, { type: "join" }>).member.table;
}

/** One worklet event batch: [kind, serial, generation, noteIndex, frame, bar, length]. */
function batch(...records: number[][]) {
  const values = new Float64Array(records.length * TRANSPORT_EVENT_FIELDS);
  records.forEach((record, index) => values.set(record, index * TRANSPORT_EVENT_FIELDS));
  return { type: "transport-events" as const, buffer: values.buffer, count: records.length };
}

function drawFrames(count = 1) {
  for (let index = 0; index < count; index++) {
    const pending = mocks.rafCallbacks.splice(0);
    for (const callback of pending) callback(0);
  }
}

function scroller(wrapper: ReturnType<typeof mount>) {
  return wrapper.get(".highlight-strip__scroller").element as HTMLElement;
}

const geometryRestores: Array<() => void> = [];

function overrideOnHTMLElement(name: string, descriptor: PropertyDescriptor) {
  const target = HTMLElement.prototype;
  const own = Object.getOwnPropertyDescriptor(target, name);
  Object.defineProperty(target, name, { configurable: true, ...descriptor });
  geometryRestores.push(() => {
    if (own) Object.defineProperty(target, name, own);
    else delete (target as unknown as Record<string, unknown>)[name];
  });
}

/** Layout the strip: a 300px view onto 1000px of events, 80px apart. */
function stubStripGeometry(maxScroll = Infinity) {
  const isScroller = (element: Element) => element.classList.contains("highlight-strip__scroller");
  let scrollLeft = 0;
  overrideOnHTMLElement("clientWidth", {
    get(this: HTMLElement) { return isScroller(this) ? 300 : 0; },
  });
  overrideOnHTMLElement("scrollWidth", {
    get(this: HTMLElement) { return isScroller(this) ? 1000 : 0; },
  });
  overrideOnHTMLElement("scrollLeft", {
    get(this: HTMLElement) { return isScroller(this) ? scrollLeft : 0; },
    set(this: HTMLElement, value: number) {
      if (isScroller(this)) scrollLeft = Math.min(maxScroll, Math.round(value));
    },
  });
  overrideOnHTMLElement("getBoundingClientRect", {
    value(this: HTMLElement) {
      const index = this.dataset?.eventIndex;
      if (index === undefined) return { left: 0, right: 300, width: 300 } as DOMRect;
      const left = 400 + Number(index) * 80 - scrollLeft;
      return { left, right: left + 80, width: 80 } as DOMRect;
    },
  });
  return { get scrollLeft() { return scrollLeft; } };
}



beforeEach(() => {
  uiBeatClock.stop();
  mocks.phrasesStore = reactive({
    takeNotes: [recordedNote],
    takeContext: {
      mode: "major",
      key: "C",
      instrument: "sine",
      bpm: 120,
      shape: { cutoff: 12000, resonance: 0, room: 0, delay: 0, attack: null, release: null },
      octave: 4,
    },
    takeDuration: 500,
    lastLiveNoteId: recordedNote.id,
    takeId: "take-1",
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
  mocks.commands = [];
  mocks.listeners.clear();
  mocks.portReady = true;
  mocks.failure = undefined;
  mocks.pins = [];
  mocks.releasedPins = 0;
  mocks.holds = 0;
  mocks.releasedHolds = 0;
  mocks.rafCallbacks = [];
  mocks.outputContextTime = 0;
  mocks.usePhrasesStore.mockReturnValue(mocks.phrasesStore);
  mocks.useInstrumentStore.mockReturnValue(mocks.instrumentStore);
  mocks.useVisualConfigStore.mockReturnValue(mocks.visualConfigStore);
  mocks.useCodeStripStrudel.mockReturnValue(playbackWiring());
  mocks.audioContext.state = "running";
  mocks.isPlaying.value = false;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    mocks.rafCallbacks.push(callback);
    return mocks.rafCallbacks.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.clearAllMocks();
});

afterEach(() => {
  while (geometryRestores.length) geometryRestores.pop()!();
  vi.unstubAllGlobals();
});

describe("CodeStrip production pattern transport", () => {
  it("owns one production player and releases it on unmount", async () => {
    const first = mount(CodeStrip);
    await flushPromises();
    expect(getPatternPlaybackDiagnostics().activeTransports).toBe(1);
    first.unmount();
    expect(getPatternPlaybackDiagnostics().activeTransports).toBe(0);
    expect(mocks.listeners.size).toBe(0);
  });

  it("keeps controlled rendering isolated from production stores and playback", async () => {
    vi.clearAllMocks();
    const wrapper = mount(CodeStrip, {
      props: {
        usage: "controlled",
        tokens: [{ type: "note", note: "do", text: "Do", duration: "@0.25" }],
      },
    });
    await flushPromises();

    expect(mocks.usePhrasesStore).not.toHaveBeenCalled();
    expect(mocks.useInstrumentStore).not.toHaveBeenCalled();
    expect(mocks.useVisualConfigStore).not.toHaveBeenCalled();
    expect(mocks.useCodeStripStrudel).not.toHaveBeenCalled();
    expect(mocks.commands).toEqual([]);
    expect(mocks.attachEditor).not.toHaveBeenCalled();
    expect(wrapper.find(".note").exists()).toBe(true);
    expect(wrapper.get(".code-strip").isVisible()).toBe(true);
    wrapper.unmount();
  });

  it("shows the recorded take as read-only notation, not an editor", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();

    expect(wrapper.findAll(".code-strip")).toHaveLength(1);
    expect(wrapper.find(".cm-editor, [contenteditable]").exists()).toBe(false);
    expect(wrapper.find(".highlight-strip").classes()).not.toContain("highlight-strip--unframed");
    expect(wrapper.find(".highlight-strip").classes()).not.toContain("highlight-strip--empty");
    expect(scroller(wrapper).getAttribute("aria-label")).toBe("Pattern code, read-only");
    // The take's note and its loop-tail rest sit on the Stave.
    expect(wrapper.findAll("[data-event-index]")).toHaveLength(2);
    expect(wrapper.find(".note").exists()).toBe(true);
    expect(controllerOf().getCode()).toContain("C4@0.25");

    wrapper.unmount();
    expect(mocks.detachEditor).toHaveBeenCalledOnce();
  });

  it("keeps the empty production strip compact and prompting", async () => {
    mocks.phrasesStore.takeNotes = [];

    const wrapper = mount(CodeStrip, { props: { framed: false } });
    await flushPromises();

    expect(controllerOf().getCode()).toBe("// Record a pattern");
    expect(wrapper.text()).toContain("// Record a pattern");
    expect(wrapper.find(".highlight-strip").classes()).toContain("highlight-strip--unframed");
    expect(wrapper.find(".highlight-strip").classes()).toContain("highlight-strip--empty");

    wrapper.unmount();
  });

  it("preserves the default frame around an empty standalone CodeStrip", async () => {
    mocks.phrasesStore.takeNotes = [];

    const wrapper = mount(CodeStrip);
    await flushPromises();

    expect(wrapper.find(".highlight-strip").classes()).toContain("highlight-strip--empty");
    expect(wrapper.find(".highlight-strip").classes()).not.toContain("highlight-strip--unframed");

    wrapper.unmount();
  });


  it("plays the take on the worklet transport from note data, constructing no Strudel scheduler", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    const fills = () => wrapper.findAll(".code-strip__note").map((node) =>
      (node.element as HTMLElement).style.getPropertyValue("--code-strip-progress"));
    expect(fills()).toEqual(["1"]);

    await expect(controllerOf().evaluate()).resolves.toBe(true);
    await nextTick();
    expect(fills()).toEqual(["0"]);
    expect(mocks.strudelRepl).not.toHaveBeenCalled();
    expect(mocks.commands.map(command => command.type)).toEqual(["transport-change", "transport-start"]);
    expect(commandsOf("transport-start")[0]).toMatchObject({ bpm: 120 });
    const table = joinedTable();
    expect(table).toMatchObject({ id: "take-1", instrumentId: "sine" });
    // 500 ms at 120 BPM is a quarter bar; the loop keeps one beat of tail.
    expect(Array.from(table.begin)).toEqual([0]);
    expect(Array.from(table.gate)).toEqual([0.25]);
    expect(Array.from(table.pitch)).toEqual([60]);
    expect(table.lengthBars).toBeCloseTo(0.5, 9);
    // The bank stays resident and the context awake while the transport runs.
    expect(mocks.pins).toEqual([["sine"]]);
    expect(mocks.holds).toBe(1);
    expect(mocks.setPlaying).toHaveBeenLastCalledWith(true);

    controllerOf().stop();
    expect(commandsOf("transport-stop")).toHaveLength(1);
    expect(mocks.releasedPins).toBe(1);
    expect(mocks.releasedHolds).toBe(1);
    await nextTick();
    expect(fills()).toEqual(["1"]);
    wrapper.unmount();
  });

  it("turns worklet records into typed note events that light the strip and the Stage registry", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    await controllerOf().evaluate();
    const generation = joinedTable().generation;
    const played: CustomEvent[] = [];
    const released: CustomEvent[] = [];
    const onPlayed = (event: Event) => played.push(event as CustomEvent);
    const onReleased = (event: Event) => released.push(event as CustomEvent);
    window.addEventListener("note-played", onPlayed);
    window.addEventListener("note-released", onReleased);
    try {
      emit(batch([TransportEventKind.Attack, 1, generation, 0, 0, 0, 500]));
      await nextTick();
      expect(played).toHaveLength(1);
      expect(played[0].detail).toMatchObject({
        noteId: "pattern-1-1", sourceNoteId: "c", phraseId: "take-1", memberId: "take-1",
        noteName: "C4", solfegeIndex: 0, pitchClassIndex: 0, octave: 4, keyboardOctave: 4,
        isBorrowed: false, key: "C", mode: "major", instrument: "sine",
        note: expect.objectContaining({ name: "Do" }),
        source: "pattern-playback", record: false, durationMs: 500,
      });
      expect(played[0].detail.midiTimestamp).toBe(played[0].detail.audibleAt);
      expect(wrapper.get('[data-event-index="0"]').attributes("data-active")).toBe("true");
      expect(getActivePatternStageNotes()).toEqual([expect.objectContaining({ noteId: "pattern-1-1", noteName: "C4" })]);

      // A second pass of the same phrase note is a new occurrence with the same source.
      emit(batch([TransportEventKind.Release, 1, generation, 0, 500, .25, .01],
        [TransportEventKind.Attack, 2, generation, 0, 1000, .5, 500]));
      await nextTick();
      expect(released.map(event => event.detail.noteId)).toEqual(["pattern-1-1"]);
      expect(released[0].detail).toMatchObject({ note: "Do", sourceNoteId: "c", source: "pattern-playback", record: false });
      expect(played.map(event => [event.detail.noteId, event.detail.sourceNoteId]))
        .toEqual([["pattern-1-1", "c"], ["pattern-1-2", "c"]]);

      // Stop clears every consumer of a still-sounding note.
      controllerOf().stop();
      expect(released.map(event => event.detail.noteId)).toEqual(["pattern-1-1", "pattern-1-2"]);
      expect(getActivePatternStageNotes()).toEqual([]);
    } finally {
      window.removeEventListener("note-played", onPlayed);
      window.removeEventListener("note-released", onReleased);
      wrapper.unmount();
    }
  });

  it("cancels an announced note and drops attacks that ended during a stall", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    await controllerOf().evaluate();
    const generation = joinedTable().generation;
    const events: CustomEvent[] = [];
    const record = (event: Event) => events.push(event as CustomEvent);
    window.addEventListener("note-played", record);
    window.addEventListener("note-released", record);
    try {
      // Heard far in the past: by delivery its whole gate is over.
      mocks.outputContextTime = 100;
      emit(batch([TransportEventKind.Attack, 1, generation, 0, 0, 0, 500]));
      expect(events).toHaveLength(0);
      mocks.outputContextTime = 0;
      emit(batch([TransportEventKind.Attack, 2, generation, 0, 2000, 1, 500],
        [TransportEventKind.Cancel, 2, generation, 0, 2000, 1, 500]));
      expect(events.map(event => event.type)).toEqual(["note-played", "note-released"]);
      // A cancelled note ends at its own onset, so it is never shown.
      expect(events[1].detail.audibleAt).toBe(events[0].detail.audibleAt);
    } finally {
      window.removeEventListener("note-played", record);
      window.removeEventListener("note-released", record);
      wrapper.unmount();
    }
  });

  it("recovers the registry from an overflow snapshot", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    await controllerOf().evaluate();
    const generation = joinedTable().generation;
    emit(batch([TransportEventKind.Attack, 1, generation, 0, 0, 0, 5000],
      [TransportEventKind.Attack, 2, generation, 0, 10, 0, 5000]));
    expect(getActivePatternStageNotes().map(note => note.noteId)).toEqual(["pattern-1-1", "pattern-1-2"]);
    // Records were lost; the snapshot says only note 2 and a new note 3 sound.
    emit(batch([TransportEventKind.SnapshotBegin, 2, 0, 0, 0, 0, 0],
      [TransportEventKind.Active, 2, generation, 0, 10, 0, 5000],
      [TransportEventKind.Active, 3, generation, 0, 20, 0, 5000]));
    expect(getActivePatternStageNotes().map(note => note.noteId)).toEqual(["pattern-1-2", "pattern-1-3"]);
    wrapper.unmount();
  });

  it("drives UIBeat from the worklet tempo map at the heard time, never stepping backward", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    await controllerOf().evaluate();
    expect(uiBeatClock.snapshot.status).toBe("arming");
    emit({ type: "transport-anchors", run: 1, anchors: [{ frame: 0, bar: 0, bpm: 120 }], provisional: false });
    const generation = uiBeatClock.snapshot.generation;

    // 1 s heard at 120 BPM (2 s bars) is half a bar: beat 2.
    mocks.outputContextTime = 1;
    drawFrames();
    expect(uiBeatClock.snapshot).toMatchObject({ status: "running", barPosition: .5, beatIndex: 2, beatPhase: 0, bpm: 120 });
    // The output clock jitters back a little: the bar holds.
    mocks.outputContextTime = .99;
    drawFrames();
    expect(uiBeatClock.snapshot.barPosition).toBe(.5);
    // A tempo anchor at 1.5 s (bar .75) doubles the rate from there.
    emit({ type: "transport-anchors", run: 1, anchors: [{ frame: 0, bar: 0, bpm: 120 }, { frame: 1500, bar: .75, bpm: 240 }], provisional: false });
    mocks.outputContextTime = 2;
    drawFrames();
    expect(uiBeatClock.snapshot).toMatchObject({ generation, bpm: 240 });
    expect(uiBeatClock.snapshot.barPosition).toBeCloseTo(1.25, 9);
    // Anchors from an older run are ignored.
    emit({ type: "transport-anchors", run: 0, anchors: [{ frame: 0, bar: 0, bpm: 30 }], provisional: false });
    mocks.outputContextTime = 2.5;
    drawFrames();
    expect(uiBeatClock.snapshot.barPosition).toBeCloseTo(1.75, 9);

    mocks.audioContext.state = "suspended";
    drawFrames();
    expect(uiBeatClock.snapshot.status).toBe("arming");
    mocks.audioContext.state = "running";

    controllerOf().stop();
    expect(uiBeatClock.snapshot.status).toBe("idle");
    wrapper.unmount();
  });

  it("swaps the table for key, mode, octave, instrument and tempo changes at the next quantum", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    await controllerOf().evaluate();
    const first = joinedTable().generation;
    mocks.commands = [];

    mocks.phrasesStore.takeContext.key = "D";
    await flushPromises();
    const swapped = joinedTable();
    expect(swapped.generation).toBeGreaterThan(first);
    expect(commandsOf("transport-change").at(-1)).toMatchObject({ boundary: "immediate" });

    mocks.visualConfigStore.config.codeStrip.bpm = 90;
    await flushPromises();
    expect(commandsOf("transport-change").map(command => command.change.type)).toEqual(["join", "tempo", "join"]);
    expect(commandsOf("transport-change")[1].change).toEqual({ type: "tempo", bpm: 90 });
    expect(commandsOf("transport-start")).toHaveLength(0);

    // A cold instrument loads (and is pinned) before its table is swapped in.
    mocks.phrasesStore.takeContext.instrument = "piano";
    await flushPromises();
    expect(joinedTable().instrumentId).toBe("piano");
    expect(mocks.pins.at(-1)).toEqual(["piano"]);
    wrapper.unmount();
  });

  it("keeps the old table playing when a changed instrument fails to load", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    await controllerOf().evaluate();
    const before = joinedTable();
    mocks.portReady = false;
    mocks.failure = { kind: "load", reason: "HTTP 404" };
    mocks.phrasesStore.takeContext.instrument = "piano";
    await flushPromises();
    expect(joinedTable()).toBe(before);
    expect(mocks.setError).toHaveBeenCalledWith(expect.any(PatternLoadError));
    expect(commandsOf("transport-stop")).toHaveLength(0);
    wrapper.unmount();
  });

  it("fails a cold first Play with a retryable load error, starts nothing, and plays on retry", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    mocks.portReady = false;
    mocks.failure = { kind: "load", reason: "decode failed" };
    const error = await controllerOf().evaluate().catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(PatternLoadError);
    expect((error as PatternLoadError).retryable).toBe(true);
    expect(commandsOf("transport-start")).toHaveLength(0);
    expect(mocks.setPlaying).toHaveBeenLastCalledWith(false);
    expect(mocks.releasedHolds).toBe(mocks.holds);

    mocks.portReady = true;
    mocks.failure = undefined;
    await expect(controllerOf().evaluate()).resolves.toBe(true);
    expect(commandsOf("transport-start")).toHaveLength(1);
    wrapper.unmount();
  });

  it("stops when the audio engine restarts under it", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    await controllerOf().evaluate();
    for (const listener of [...mocks.listeners]) listener.onRendererReset?.();
    expect(mocks.setPlaying).toHaveBeenLastCalledWith(false);
    expect(mocks.setError).toHaveBeenCalled();
    expect(mocks.releasedHolds).toBe(1);
    wrapper.unmount();
  });

  it("blocks playback while samples are warming, and stops when warmup begins", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    mocks.instrumentStore.isInteractionLocked = true;
    await expect(controllerOf().evaluate()).resolves.toBe(false);
    expect(mocks.commands).toEqual([]);

    mocks.instrumentStore.isInteractionLocked = false;
    await controllerOf().evaluate();
    mocks.instrumentStore.isInteractionLocked = true;
    await nextTick();
    expect(commandsOf("transport-stop")).toHaveLength(1);
    expect(mocks.setPlaying).toHaveBeenLastCalledWith(false);
    wrapper.unmount();
  });

  it("smoothly follows the newest typed note", async () => {
    const geometry = stubStripGeometry();
    const wrapper = mount(CodeStrip);
    await flushPromises();
    mocks.rafCallbacks.length = 0;

    const nextNote: PatternNote = {
      ...recordedNote,
      id: "d",
      note: "D4",
      scaleDegree: 2,
      scaleIndex: 1,
      pressTime: 1500,
      releaseTime: 2000,
    };
    mocks.phrasesStore.takeNotes = [recordedNote, nextNote];
    mocks.phrasesStore.lastLiveNoteId = nextNote.id;
    await nextTick();
    await flushPromises();

    expect(geometry.scrollLeft).toBe(0);
    expect(mocks.rafCallbacks.length).toBeGreaterThan(0);

    const samples: number[] = [];
    for (let frame = 1; frame <= 12; frame++) {
      const callback = mocks.rafCallbacks.shift();
      if (!callback) break;
      callback(frame * 16);
      samples.push(geometry.scrollLeft);
    }

    expect(samples.length).toBeGreaterThan(2);
    expect(samples.every((sample, index) => index === 0 || sample >= samples[index - 1]))
      .toBe(true);
    expect(samples[0]).toBeGreaterThan(0);
    expect(samples[0]).toBeLessThan(samples.at(-1)!);
    wrapper.unmount();
  });

  it("returns to the start when a different phrase arrives", async () => {
    const geometry = stubStripGeometry();
    const wrapper = mount(CodeStrip);
    await flushPromises();
    scroller(wrapper).scrollLeft = 240;
    expect(geometry.scrollLeft).toBe(240);

    mocks.phrasesStore.takeId = "take-2";
    await nextTick();
    await flushPromises();

    expect(geometry.scrollLeft).toBe(0);
    wrapper.unmount();
  });

  it("stays at the start of a phrase switched in from a live take", async () => {
    const geometry = stubStripGeometry();
    const wrapper = mount(CodeStrip);
    await flushPromises();
    scroller(wrapper).scrollLeft = 240;
    mocks.rafCallbacks.length = 0;

    // A Library phrase replaces the live take: the newest-note key clears with it.
    mocks.phrasesStore.takeNotes = [recordedNote, { ...recordedNote, id: "lib-2", pressTime: 1500, releaseTime: 2000 }];
    mocks.phrasesStore.lastLiveNoteId = null;
    mocks.phrasesStore.takeId = "library-1";
    await nextTick();
    await flushPromises();
    for (let frame = 1; frame <= 60; frame++) mocks.rafCallbacks.shift()?.(frame * 16);

    expect(geometry.scrollLeft).toBe(0);
    wrapper.unmount();
  });

  it.each(["rounded pixels", "shrinking scroll extent"])(
    "finishes recording follow with %s so a later manual scroll is not overwritten",
    async (caseName) => {
      const geometry = stubStripGeometry(caseName === "rounded pixels" ? 700 : 50);
      const wrapper = mount(CodeStrip);
      await flushPromises();
      try {
        mocks.rafCallbacks.length = 0;
        mocks.phrasesStore.takeNotes = [recordedNote, { ...recordedNote, id: "next", pressTime: 1500, releaseTime: 2000 }];
        mocks.phrasesStore.lastLiveNoteId = "next";
        await nextTick();
        await flushPromises();
        for (let frame = 1; frame <= 150; frame++) {
          const callback = mocks.rafCallbacks.shift();
          if (!callback) break;
          callback(frame * 16);
        }
        // The last event (index 2, the loop tail) ends at 400 + 3 * 80;
        // its right edge settles at 75% of the 300px view.
        expect(geometry.scrollLeft).toBe(caseName === "rounded pixels" ? 415 : 50);
        expect(mocks.rafCallbacks).toHaveLength(0);
        scroller(wrapper).scrollLeft = 0;
        expect(geometry.scrollLeft).toBe(0);
      } finally {
        wrapper.unmount();
      }
    },
  );
});
