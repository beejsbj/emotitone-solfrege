import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick, reactive } from "vue";
import type { PatternNote } from "@/types/patterns";

const mocks = vi.hoisted(() => ({
  phrasesStore: null as any,
  instrumentStore: null as any,
  visualConfigStore: null as any,
  replOptions: null as any,
  replInstance: null as any,
  replEvaluate: vi.fn(),
  schedulerStop: vi.fn(),
  schedulerSetCps: vi.fn(),
  schedulerNow: 0,
  started: false,
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
  audioContext: {
    currentTime: 0,
    state: "running",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as any,
  isPlaying: { value: false },
}));

vi.mock("@/stores/phrases", () => ({
  usePhrasesStore: mocks.usePhrasesStore,
}));

vi.mock("@/stores/instrument", () => ({
  useInstrumentStore: mocks.useInstrumentStore,
}));

vi.mock("@/stores/visualConfig", () => ({
  useVisualConfigStore: mocks.useVisualConfigStore,
}));

vi.mock("@/composables/useCodeStripStrudel", () => ({
  useCodeStripStrudel: mocks.useCodeStripStrudel,
}));

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

vi.mock("@/composables/useStrudel", () => ({
  toStrudelSound: () => "sine",
}));

vi.mock("@/services/StrudelNotation", () => ({
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
}));

vi.mock("@/services/superdoughAudio", () => ({
  initSuperdoughAudio: vi.fn().mockResolvedValue(undefined),
  getAudioContext: () => mocks.audioContext,
  emotitoneStrudelOutput: vi.fn(),
  stopStrudelVisuals: vi.fn(),
}));

// Strudel's headless REPL: the scheduler and evaluation the transport owns.
vi.mock("@strudel/core", () => ({
  evalScope: vi.fn().mockResolvedValue(undefined),
  repl: (options: any) => {
    mocks.replOptions = options;
    const scheduler = {
      cps: 0.5,
      setCps: (cps: number) => {
        mocks.schedulerSetCps(cps);
        scheduler.cps = cps;
      },
      now: () => mocks.schedulerNow,
      stop: mocks.schedulerStop,
    };
    mocks.replInstance = { scheduler, evaluate: mocks.replEvaluate };
    return mocks.replInstance;
  },
}));
vi.mock("@strudel/mini", () => ({}));
vi.mock("@strudel/tonal", () => ({}));
vi.mock("@strudel/webaudio", () => ({}));
vi.mock("@strudel/transpiler", () => ({ transpiler: vi.fn() }));

import CodeStrip from "@/components/uniques/CodeStrip/index.vue";
import { uiBeatClock } from "@/composables/useUIBeat";
import { getPatternPlaybackDiagnostics } from "@/services/patternPlayback";
import { soundingNoteIdForHap } from "@/services/notationSpans";
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

/** The scheduler has started (Play) and draws one frame at this cycle position. */
function drawFrame(time: number) {
  if (!mocks.started) {
    mocks.started = true;
    mocks.replOptions.onToggle(true);
  }
  mocks.schedulerNow = time;
  const pending = mocks.rafCallbacks.splice(0);
  for (const callback of pending) callback(0);
}

function controllerOf() {
  return mocks.attachEditor.mock.calls[0][0];
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
    },
    takeDuration: 500,
    lastLiveNoteId: recordedNote.id,
    takeId: "take-1",
  });
  mocks.instrumentStore = reactive({ isInteractionLocked: false });
  mocks.visualConfigStore = reactive({
    config: {
      ...structuredClone(DEFAULT_CONFIG),
      codeStrip: {
        enabled: true,
        opacity: 1,
        bpm: 120,
        notation: "solfege",
        durationMode: "bar",
        showRests: true,
      },
      keyboard: {
        mainOctave: 4,
        surfaceStyle: "colored",
        keyBrightness: 1,
        keySaturation: 1,
      },
    },
  });
  mocks.replOptions = null;
  mocks.replInstance = null;
  mocks.schedulerNow = 0;
  mocks.started = false;
  mocks.rafCallbacks = [];
  mocks.usePhrasesStore.mockReturnValue(mocks.phrasesStore);
  mocks.useInstrumentStore.mockReturnValue(mocks.instrumentStore);
  mocks.useVisualConfigStore.mockReturnValue(mocks.visualConfigStore);
  mocks.useCodeStripStrudel.mockReturnValue(playbackWiring());
  mocks.audioContext.currentTime = 0;
  mocks.audioContext.state = "running";
  mocks.audioContext.addEventListener.mockReset();
  mocks.audioContext.removeEventListener.mockReset();
  mocks.isPlaying.value = false;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    mocks.rafCallbacks.push(callback);
    return mocks.rafCallbacks.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.clearAllMocks();
  mocks.replEvaluate.mockReset();
  // A successful evaluation hands the scheduler its new pattern.
  mocks.replEvaluate.mockImplementation(async () => {
    mocks.replOptions.editPattern?.({});
  });
  mocks.schedulerStop.mockReset();
});

afterEach(() => {
  while (geometryRestores.length) geometryRestores.pop()!();
  vi.unstubAllGlobals();
});

describe("CodeStrip production pattern transport", () => {
  it("owns one production transport and releases it before remount", async () => {
    const first = mount(CodeStrip);
    await flushPromises();
    const firstRepl = mocks.replInstance;
    expect(getPatternPlaybackDiagnostics().activeTransports).toBe(1);
    expect(mocks.replOptions.getTime()).toBe(mocks.audioContext.currentTime);

    const second = mount(CodeStrip);
    await flushPromises();
    expect(mocks.replInstance).toBe(firstRepl);
    expect(mocks.attachEditor).toHaveBeenCalledOnce();
    expect(mocks.setError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "The pattern transport already exists" }),
    );
    second.unmount();
    expect(getPatternPlaybackDiagnostics().activeTransports).toBe(1);

    first.unmount();
    expect(getPatternPlaybackDiagnostics().activeTransports).toBe(0);
    expect(mocks.schedulerStop).toHaveBeenCalledOnce();

    const remount = mount(CodeStrip);
    await flushPromises();
    expect(mocks.replInstance).not.toBe(firstRepl);
    expect(getPatternPlaybackDiagnostics().activeTransports).toBe(1);
    remount.unmount();
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
    expect(mocks.replOptions).toBeNull();
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

  it("turns the Stave to Ink as soon as play is requested and drives UIBeat from frames", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    const fills = () => wrapper.findAll(".code-strip__note").map((node) =>
      (node.element as HTMLElement).style.getPropertyValue("--code-strip-progress"));
    expect(fills()).toEqual(["1"]);

    await controllerOf().evaluate();
    await nextTick();
    expect(fills()).toEqual(["0"]);
    expect(mocks.replEvaluate).toHaveBeenCalledOnce();
    expect(mocks.replEvaluate.mock.lastCall).toEqual([controllerOf().getCode(), true]);

    drawFrame(.5);
    expect(uiBeatClock.snapshot).toMatchObject({
      status: "running",
      mappingAvailable: true,
      barPosition: 0.5,
      beatIndex: 2,
      beatPhase: 0,
    });

    mocks.replOptions.onToggle(false);
    await nextTick();
    expect(fills()).toEqual(["1"]);
    expect(uiBeatClock.snapshot.status).toBe("idle");
    wrapper.unmount();
  });

  it("lights the take's note from the Strudel note event that names it", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    await controllerOf().evaluate();

    // The transport handed the scheduler the spans of the code it plays.
    const span = { start: 3, end: 5 };
    expect(controllerOf().getCode().slice(span.start, span.end)).toBe("C4");
    expect(soundingNoteIdForHap({ context: { locations: [span] } })).toBe("c");

    window.dispatchEvent(new CustomEvent("note-played", {
      detail: { noteId: "strudel_1", sourceNoteId: "c", audibleAt: performance.now(), durationMs: 250 },
    }));
    await nextTick();
    expect(wrapper.get('[data-event-index="0"]').attributes("data-active")).toBe("true");

    window.dispatchEvent(new CustomEvent("note-released", {
      detail: { noteId: "strudel_1", sourceNoteId: "c" },
    }));
    await nextTick();
    expect(wrapper.get('[data-event-index="0"]').attributes("data-active")).toBeUndefined();

    controllerOf().stop();
    expect(soundingNoteIdForHap({ context: { locations: [span] } })).toBe("c");
    mocks.replOptions.onToggle(false);
    expect(soundingNoteIdForHap({ context: { locations: [span] } })).toBeUndefined();
    wrapper.unmount();
  });

  it("keeps UIBeat unavailable when the sounding code is not the generated take", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    controllerOf().setCode('`< C4 D4 >`.sound("sine")');

    await controllerOf().evaluate();
    drawFrame(1.25);

    expect(uiBeatClock.snapshot).toMatchObject({
      status: "unavailable",
      mappingAvailable: false,
      rawPosition: 1.25,
      barPosition: null,
      beatIndex: null,
      presenting: false,
    });
    wrapper.unmount();
  });

  it("retires an evaluation generation when Strudel reports a resolved error", async () => {
    mocks.replEvaluate.mockImplementationOnce(async () => {
      mocks.replOptions.onEvalError(new Error("invalid pattern"));
    });
    const wrapper = mount(CodeStrip);
    await flushPromises();

    await expect(controllerOf().evaluate()).rejects.toThrow("invalid pattern");
    mocks.rafCallbacks.splice(0).forEach((callback) => callback(0));

    expect(uiBeatClock.snapshot.status).toBe("idle");
    expect(mocks.setError).toHaveBeenCalledWith(expect.objectContaining({
      message: "invalid pattern",
    }));
    expect(mocks.schedulerStop).toHaveBeenCalledOnce();
    expect(mocks.setPlaying).toHaveBeenCalledWith(false);
    wrapper.unmount();
  });

  it("serializes overlapping evaluations so stale callbacks cannot stop the newer run", async () => {
    let resolveFirst!: () => void;
    mocks.replEvaluate
      .mockImplementationOnce(
        () => new Promise<void>((resolve) => {
          resolveFirst = resolve;
        }),
      );
    const wrapper = mount(CodeStrip);
    await flushPromises();

    const first = controllerOf().evaluate();
    const second = controllerOf().evaluate();
    await Promise.resolve();
    expect(mocks.replEvaluate).toHaveBeenCalledTimes(1);

    mocks.replOptions.onEvalError(new Error("stale first evaluation"));
    resolveFirst();
    await expect(first).rejects.toThrow("stale first evaluation");
    await expect(second).resolves.toBe(true);
    expect(mocks.replEvaluate).toHaveBeenCalledTimes(2);

    drawFrame(0.5);
    expect(uiBeatClock.snapshot).toMatchObject({
      status: "running",
      generation: expect.any(Number),
      barPosition: 0.5,
    });
    wrapper.unmount();
  });

  it("discards a queued evaluation when playback stops", async () => {
    let resolveFirst!: () => void;
    mocks.replEvaluate.mockImplementationOnce(
      () => new Promise<void>((resolve) => {
        resolveFirst = resolve;
      }),
    );
    const wrapper = mount(CodeStrip);
    await flushPromises();
    const controller = controllerOf();

    const first = controller.evaluate();
    const queued = controller.evaluate();
    await Promise.resolve();
    expect(mocks.replEvaluate).toHaveBeenCalledOnce();

    await controller.stop();
    resolveFirst();
    await expect(first).resolves.toBe(false);
    await expect(queued).resolves.toBe(false);

    expect(mocks.replEvaluate).toHaveBeenCalledOnce();
    expect(uiBeatClock.snapshot.status).toBe("idle");
    wrapper.unmount();
  });

  it("keeps a new Play requested after Stop while retiring older work", async () => {
    let resolveFirst!: () => void;
    mocks.replEvaluate
      .mockImplementationOnce(
        () => new Promise<void>((resolve) => {
          resolveFirst = resolve;
        }),
      );
    const wrapper = mount(CodeStrip);
    await flushPromises();
    const controller = controllerOf();

    const first = controller.evaluate();
    const staleQueued = controller.evaluate();
    await Promise.resolve();
    await controller.stop();
    const afterStop = controller.evaluate();
    resolveFirst();

    await expect(first).resolves.toBe(false);
    await expect(staleQueued).resolves.toBe(false);
    await expect(afterStop).resolves.toBe(true);
    expect(mocks.replEvaluate).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it("does not publish a late evaluation error after Stop cancels its intent", async () => {
    let rejectEvaluation!: (error: Error) => void;
    mocks.replEvaluate.mockImplementationOnce(
      () => new Promise<void>((_resolve, reject) => {
        rejectEvaluation = reject;
      }),
    );
    const wrapper = mount(CodeStrip);
    await flushPromises();
    const controller = controllerOf();

    const evaluation = controller.evaluate();
    await Promise.resolve();
    await controller.stop();
    rejectEvaluation(new Error("late canceled failure"));

    await expect(evaluation).resolves.toBe(false);
    expect(mocks.setError).not.toHaveBeenCalled();
    expect(mocks.setPlaying).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("discards a queued evaluation when its CodeStrip unmounts", async () => {
    let resolveFirst!: () => void;
    mocks.replEvaluate.mockImplementationOnce(
      () => new Promise<void>((resolve) => {
        resolveFirst = resolve;
      }),
    );
    const wrapper = mount(CodeStrip);
    await flushPromises();
    const controller = controllerOf();

    const first = controller.evaluate();
    const queued = controller.evaluate();
    await Promise.resolve();
    expect(mocks.replEvaluate).toHaveBeenCalledOnce();

    wrapper.unmount();
    resolveFirst();
    await expect(first).resolves.toBe(false);
    await expect(queued).resolves.toBe(false);

    expect(mocks.replEvaluate).toHaveBeenCalledOnce();
    expect(mocks.detachEditor).toHaveBeenCalledOnce();
  });

  it("rests during audio suspension and rejoins on the next sounding frame", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    await controllerOf().evaluate();
    drawFrame(0.25);
    expect(uiBeatClock.snapshot.status).toBe("running");

    const stateListener = mocks.audioContext.addEventListener.mock.calls
      .find(([type]: [string]) => type === "statechange")?.[1] as EventListener;
    expect(stateListener).toBeTypeOf("function");
    mocks.audioContext.state = "suspended";
    stateListener(new Event("statechange"));
    expect(uiBeatClock.snapshot).toMatchObject({
      status: "arming",
      beatIndex: null,
      presenting: false,
    });

    mocks.audioContext.state = "running";
    stateListener(new Event("statechange"));
    expect(uiBeatClock.snapshot.status).toBe("arming");
    drawFrame(0.5);
    expect(uiBeatClock.snapshot).toMatchObject({
      status: "running",
      beatIndex: 2,
      presenting: true,
    });
    wrapper.unmount();
    expect(mocks.audioContext.removeEventListener).toHaveBeenCalledWith(
      "statechange",
      stateListener,
    );
  });

  it("invalidates active presentation when the playing code is replaced", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    await controllerOf().evaluate();
    drawFrame(0.25);
    expect(uiBeatClock.snapshot.status).toBe("running");

    controllerOf().setCode('`< E4 >`.sound("sine")');

    expect(uiBeatClock.snapshot.status).toBe("idle");
    wrapper.unmount();
  });

  it("blocks playback while samples are warming", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    mocks.instrumentStore.isInteractionLocked = true;

    await expect(controllerOf().evaluate()).resolves.toBe(false);

    expect(mocks.replEvaluate).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("stops playback when warmup begins during a pending evaluation", async () => {
    let resolveEvaluation!: () => void;
    mocks.replEvaluate.mockImplementationOnce(
      () => new Promise<void>((resolve) => {
        resolveEvaluation = resolve;
      }),
    );
    const wrapper = mount(CodeStrip);
    await flushPromises();

    const evaluation = controllerOf().evaluate();
    await Promise.resolve();
    expect(mocks.replEvaluate).toHaveBeenCalledOnce();
    mocks.instrumentStore.isInteractionLocked = true;
    resolveEvaluation();
    await evaluation;

    expect(mocks.schedulerStop).toHaveBeenCalled();
    expect(mocks.setPlaying).toHaveBeenCalledWith(false);
    wrapper.unmount();
  });

  it("normalizes a fresh generated run to Strudel's continuous scheduler cycle", async () => {
    mocks.visualConfigStore.config.codeStrip.bpm = 90;
    const wrapper = mount(CodeStrip);
    await flushPromises();

    await controllerOf().evaluate();
    drawFrame(0.125);

    expect(mocks.schedulerSetCps).toHaveBeenLastCalledWith(0.375);
    expect(uiBeatClock.snapshot).toMatchObject({
      status: "running",
      bpm: 90,
      rawPosition: 0.125,
      barPosition: 0.125,
      beatPhase: 0.5,
    });
    wrapper.unmount();
  });

  it("preserves UIBeat generation and phase when playback tempo changes", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    await controllerOf().evaluate();
    drawFrame(0.125);
    const before = uiBeatClock.snapshot;

    mocks.isPlaying.value = true;
    mocks.visualConfigStore.config.codeStrip.bpm = 90;
    await nextTick();
    await flushPromises();

    expect(mocks.replEvaluate).toHaveBeenCalledTimes(2);
    expect(mocks.schedulerSetCps).toHaveBeenLastCalledWith(0.375);
    expect(uiBeatClock.snapshot).toMatchObject({
      generation: before.generation,
      status: "running",
      bpm: 90,
      barPosition: before.barPosition,
      beatPhase: before.beatPhase,
      presenting: true,
    });

    drawFrame(0.125);
    expect(uiBeatClock.snapshot.barPosition).toBeCloseTo(0.125);
    drawFrame(0.21875);
    expect(uiBeatClock.snapshot.barPosition).toBeCloseTo(0.21875);
    expect(uiBeatClock.snapshot.generation).toBe(before.generation);
    wrapper.unmount();
  });

  it("coalesces paired pattern and CodeStrip BPM updates into one evaluation", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    await controllerOf().evaluate();
    drawFrame(0.125);
    mocks.isPlaying.value = true;
    mocks.replEvaluate.mockClear();
    mocks.schedulerSetCps.mockClear();

    mocks.phrasesStore.takeContext.bpm = 90;
    mocks.visualConfigStore.config.codeStrip.bpm = 90;
    await nextTick();
    await flushPromises();

    expect(mocks.replEvaluate).toHaveBeenCalledOnce();
    expect(mocks.schedulerSetCps).toHaveBeenCalledOnce();
    expect(mocks.schedulerSetCps).toHaveBeenCalledWith(0.375);
    expect(uiBeatClock.snapshot).toMatchObject({
      status: "running",
      bpm: 90,
      generation: expect.any(Number),
    });
    wrapper.unmount();
  });

  it("starts a new UIBeat generation for a pattern replacement and tempo change in the same flush", async () => {
    const wrapper = mount(CodeStrip);
    try {
      await flushPromises();
      const controller = controllerOf();
      await controller.evaluate();
      drawFrame(0.125);
      const before = uiBeatClock.snapshot;
      mocks.isPlaying.value = true;
      mocks.replEvaluate.mockClear();
      mocks.schedulerSetCps.mockClear();

      // One replacement note keeps the pattern length unchanged. Pattern
      // selection publishes its source metadata and playback BPM together.
      const replacement = { ...recordedNote, id: "new-pattern", note: "D4", scaleDegree: 2, scaleIndex: 1 };
      mocks.phrasesStore.takeNotes = [replacement];
      mocks.phrasesStore.takeContext = { mode: "minor", key: "D", instrument: "sine", bpm: 90 };
      mocks.visualConfigStore.config.codeStrip.bpm = 90;
      await nextTick();
      await flushPromises();

      expect(mocks.replEvaluate).toHaveBeenCalledOnce();
      expect(controller.getCode()).toContain("D4@0.25");
      expect(mocks.replEvaluate.mock.lastCall?.[0]).toBe(controller.getCode());
      expect(mocks.schedulerSetCps).toHaveBeenCalledExactlyOnceWith(0.375);
      expect(uiBeatClock.snapshot.generation).not.toBe(before.generation);
      // A fresh run waits for its own frame instead of displaying the old
      // pattern's mapped beat position at the newly selected tempo.
      expect(uiBeatClock.snapshot.barPosition).toBeNull();
      drawFrame(0.25);
      expect(uiBeatClock.snapshot).toMatchObject({ status: "running", bpm: 90, barPosition: 0.25 });
    } finally {
      wrapper.unmount();
    }
  });

  it("plays the current recording once its publication lands", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();

    const nextNote: PatternNote = {
      ...recordedNote,
      id: "d",
      note: "D4",
      scaleDegree: 2,
      scaleIndex: 1,
    };
    mocks.phrasesStore.takeNotes = [nextNote];
    await nextTick();
    await flushPromises();

    expect(mocks.syncCode).toHaveBeenLastCalledWith(expect.stringContaining("D4@0.25"));
    await controllerOf().evaluate();
    expect(mocks.replEvaluate.mock.lastCall?.[0]).toContain("D4@0.25");
    wrapper.unmount();
  });

  it("coalesces code publications into one per flush", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    mocks.syncCode.mockClear();

    mocks.phrasesStore.takeNotes = [{ ...recordedNote, id: "d", note: "D4", scaleDegree: 2, scaleIndex: 1 }];
    mocks.phrasesStore.takeNotes = [{ ...recordedNote, id: "e", note: "E4", scaleDegree: 3, scaleIndex: 2 }];
    await nextTick();
    await flushPromises();

    expect(mocks.syncCode).toHaveBeenCalledOnce();
    expect(mocks.syncCode).toHaveBeenLastCalledWith(expect.stringContaining("E4@0.25"));
    wrapper.unmount();
  });

  it("lets an explicit source load supersede an already queued recording update", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    const controller = controllerOf();
    mocks.phrasesStore.takeNotes = [{ ...recordedNote, id: "d", note: "D4" }];
    const authored = '`< E4 >`.sound("sine")';
    // Vue's watcher runs first, then this load, then the queued publication.
    queueMicrotask(() => controller.setCode(authored));
    await flushPromises();
    expect(controller.getCode()).toBe(authored);
    await controller.evaluate();
    expect(mocks.replEvaluate.mock.lastCall?.[0]).toBe(authored);
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
