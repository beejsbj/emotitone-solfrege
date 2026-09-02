import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick, reactive } from "vue";
import type { PatternNote } from "@/types/patterns";

const mocks = vi.hoisted(() => ({
  patternsStore: null as any,
  visualConfigStore: null as any,
  mirrorOptions: null as any,
  mirrorInitialCode: "",
  mirrorEvaluate: vi.fn().mockResolvedValue(undefined),
  attachEditor: vi.fn(),
  detachEditor: vi.fn(),
  syncCode: vi.fn(),
  setPlaying: vi.fn(),
  setError: vi.fn(),
  updatePresentation: vi.fn(),
  setCodeStripPlaying: vi.fn(),
  mirrorInstance: null as any,
  mirrorScroller: null as HTMLElement | null,
  latestEvent: null as HTMLElement | null,
  rafCallbacks: [] as FrameRequestCallback[],
}));

vi.mock("@/stores/patterns", () => ({
  usePatternsStore: () => mocks.patternsStore,
}));

vi.mock("@/stores/visualConfig", () => ({
  useVisualConfigStore: () => mocks.visualConfigStore,
}));

vi.mock("@/composables/useCodeStripStrudel", () => ({
  useCodeStripStrudel: () => ({
    attachEditor: mocks.attachEditor,
    detachEditor: mocks.detachEditor,
    syncCode: mocks.syncCode,
    setPlaying: mocks.setPlaying,
    setError: mocks.setError,
    isPlaying: { value: false },
  }),
}));

vi.mock("@/components/uniques/CodeStrip/recordingTokens", () => ({
  buildRecordedCodeStripTokens: () => [{
    type: "note",
    note: "do",
    text: "Do",
    rawPitch: "C4",
    scaleIndex: 0,
    duration: "@0.25",
  }],
}));

vi.mock("@/components/uniques/CodeStrip/strudelExtension", () => ({
  codeStripStrudelExtension: [],
  updateCodeStripPresentation: mocks.updatePresentation,
  setCodeStripPlaying: mocks.setCodeStripPlaying,
  applySpecimenPlayback: vi.fn(),
  parseCodeStripEvents: (doc: { toString: () => string }) => {
    const patternEnd = doc.toString().indexOf(">");
    return patternEnd > 0 ? [{ to: patternEnd }] : [];
  },
  serializeCodeStripTokens: vi.fn(() => "`< C4@0.25 >`"),
}));

vi.mock("@/composables/useStrudel", () => ({
  toStrudelSound: () => "sine",
}));

vi.mock("@/services/StrudelNotation", () => ({
  logNotesToStrudel: (notes: PatternNote[]) =>
    `\`< ${notes.map((note) => `${note.note}@0.25`).join(" ")} >\`.as(\"note\").sound(\"sine\").cpm(120 / 4)`,
}));

vi.mock("@/services/superdoughAudio", () => ({
  initSuperdoughAudio: vi.fn().mockResolvedValue(undefined),
  getAudioContext: () => ({ currentTime: 0 }),
  emotitoneStrudelOutput: vi.fn(),
  stopStrudelVisuals: vi.fn(),
}));

vi.mock("@strudel/codemirror", () => ({
  StrudelMirror: class {
    code: string;
    editor: any;
    stop = vi.fn().mockResolvedValue(undefined);
    clear = vi.fn();
    updateSettings = vi.fn();

    constructor(options: any) {
      const makeDoc = (value: string) => ({
        length: value.length,
        toString: () => value,
      });
      const scroller = document.createElement("div");
      scroller.className = "cm-scroller";
      Object.defineProperties(scroller, {
        clientWidth: { configurable: true, value: 300 },
        scrollWidth: { configurable: true, value: 1000 },
      });
      const latestEvent = document.createElement("span");
      latestEvent.className = "cm-code-strip-event";
      Object.defineProperties(latestEvent, {
        offsetLeft: { configurable: true, value: 420 },
        offsetWidth: { configurable: true, value: 80 },
      });
      scroller.appendChild(latestEvent);
      options.root.appendChild(scroller);

      const rawEditor = {
        hasFocus: false,
        scrollDOM: scroller,
        state: { doc: makeDoc(options.initialCode) },
        coordsAtPos: () => ({ left: 420, right: 420, top: 0, bottom: 20 }),
        requestMeasure(request: any) {
          request.write(request.read(this), this);
        },
        dispatch(this: any, transaction: any) {
          if (transaction.changes) {
            const nextCode = transaction.changes.insert;
            this.state.doc = makeDoc(nextCode);
            // Match the installed StrudelMirror behavior: setCode changes the
            // EditorView document, but its public runtime code can remain stale.
          }
        },
      };

      mocks.mirrorOptions = options;
      mocks.mirrorInitialCode = options.initialCode;
      this.code = options.initialCode;
      this.editor = rawEditor;
      mocks.mirrorInstance = this;
      mocks.mirrorScroller = scroller;
      mocks.latestEvent = latestEvent;
    }

    setCode(code: string) {
      this.editor.dispatch({
        changes: { from: 0, to: this.editor.state.doc.length, insert: code },
      });
    }

    async evaluate() {
      await mocks.mirrorEvaluate(this.code);
    }
  },
}));

vi.mock("@strudel/core", () => ({ evalScope: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@strudel/mini", () => ({}));
vi.mock("@strudel/tonal", () => ({}));
vi.mock("@strudel/webaudio", () => ({}));
vi.mock("@strudel/transpiler", () => ({ transpiler: vi.fn() }));

import CodeStrip from "@/components/uniques/CodeStrip/index.vue";

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

beforeEach(() => {
  mocks.patternsStore = reactive({
    currentSketchNotes: [recordedNote],
    currentSketchMeta: {
      mode: "major",
      key: "C",
      instrument: "sine",
      bpm: 120,
    },
    currentWorkingNotes: [recordedNote],
    loadedBaseNotes: [] as PatternNote[],
    isStripCleared: false,
  });
  mocks.visualConfigStore = reactive({
    config: {
      codeStrip: {
        enabled: true,
        opacity: 1,
        bpm: 120,
        notation: "solfege",
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
  mocks.mirrorOptions = null;
  mocks.mirrorInitialCode = "";
  mocks.mirrorInstance = null;
  mocks.mirrorScroller = null;
  mocks.latestEvent = null;
  mocks.rafCallbacks = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    mocks.rafCallbacks.push(callback);
    return mocks.rafCallbacks.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CodeStrip production Strudel document", () => {
  it("is the sole public host for one editable Strudel mirror", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();

    expect(wrapper.findAll(".code-strip")).toHaveLength(1);
    expect(wrapper.find(".live-strip").exists()).toBe(false);
    expect(wrapper.get(".code-strip__editor").attributes("style") ?? "")
      .not.toContain("display: none");
    expect(mocks.mirrorInitialCode).toContain("C4@0.25");
    expect(mocks.attachEditor).toHaveBeenCalledOnce();
    expect(mocks.updatePresentation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        durationMode: "stacked",
        tokens: [expect.objectContaining({ type: "note", rawPitch: "C4" })],
      }),
    );

    wrapper.unmount();
    expect(mocks.detachEditor).toHaveBeenCalledOnce();
  });

  it("turns the source decorations to Ink as soon as play is requested", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    const controller = mocks.attachEditor.mock.calls[0][0];

    await controller.evaluate();
    expect(mocks.setCodeStripPlaying).toHaveBeenCalledWith(expect.anything(), true);
    expect(mocks.mirrorEvaluate).toHaveBeenCalledOnce();

    const presentationsBeforeDraw = mocks.updatePresentation.mock.calls.length;
    mocks.mirrorOptions.onDraw([], .5);
    await flushPromises();
    expect(mocks.updatePresentation).toHaveBeenCalledTimes(presentationsBeforeDraw);

    mocks.mirrorOptions.onToggle(false);
    expect(mocks.setCodeStripPlaying).toHaveBeenLastCalledWith(expect.anything(), false);
    wrapper.unmount();
  });

  it("evaluates the current visible recording instead of stale runtime source", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();

    const nextNote: PatternNote = {
      ...recordedNote,
      id: "d",
      note: "D4",
      scaleDegree: 2,
      scaleIndex: 1,
    };
    mocks.patternsStore.currentSketchNotes = [nextNote];
    mocks.patternsStore.currentWorkingNotes = [nextNote];
    await nextTick();
    await flushPromises();

    const visibleSource = mocks.mirrorInstance.editor.state.doc.toString();
    expect(visibleSource).toContain("D4@0.25");
    expect(mocks.mirrorInstance.code).not.toBe(visibleSource);

    const controller = mocks.attachEditor.mock.calls[0][0];
    await controller.evaluate();
    expect(mocks.mirrorInstance.code).toBe(visibleSource);
    expect(mocks.mirrorEvaluate).toHaveBeenLastCalledWith(visibleSource);
    wrapper.unmount();
  });

  it("repairs a stale runtime source from the visible document before Play", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    const visibleSource = mocks.mirrorInstance.editor.state.doc.toString();
    mocks.mirrorInstance.code = "`< stale@1 >`";

    const controller = mocks.attachEditor.mock.calls[0][0];
    await controller.evaluate();

    expect(mocks.mirrorInstance.code).toBe(visibleSource);
    expect(mocks.mirrorEvaluate).toHaveBeenLastCalledWith(visibleSource);
    wrapper.unmount();
  });

  it("smoothly follows the latest semantic event without jumping into the raw source tail", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    expect(mocks.mirrorScroller).not.toBeNull();

    mocks.mirrorScroller!.scrollLeft = 0;
    const nextNote: PatternNote = {
      ...recordedNote,
      id: "d",
      note: "D4",
      scaleDegree: 2,
      scaleIndex: 1,
    };
    mocks.patternsStore.currentSketchNotes = [recordedNote, nextNote];
    mocks.patternsStore.currentWorkingNotes = [recordedNote, nextNote];
    await nextTick();
    await flushPromises();

    expect(mocks.mirrorScroller!.scrollLeft).toBe(0);
    expect(mocks.rafCallbacks.length).toBeGreaterThan(0);

    const samples: number[] = [];
    for (let frame = 1; frame <= 12; frame++) {
      const callback = mocks.rafCallbacks.shift();
      if (!callback) break;
      callback(frame * 16);
      samples.push(mocks.mirrorScroller!.scrollLeft);
    }

    expect(samples.length).toBeGreaterThan(2);
    expect(samples.every((sample, index) => index === 0 || sample >= samples[index - 1]))
      .toBe(true);
    expect(samples[0]).toBeGreaterThan(0);
    expect(samples[0]).toBeLessThan(samples.at(-1)!);
    expect(samples.at(-1)!).toBeLessThan(
      mocks.mirrorScroller!.scrollWidth - mocks.mirrorScroller!.clientWidth,
    );
    wrapper.unmount();
  });

  it("reveals a replacement event even when the recording length is unchanged", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    mocks.mirrorScroller!.scrollLeft = 0;

    const replacement: PatternNote = {
      ...recordedNote,
      id: "replacement",
      note: "E4",
      scaleDegree: 3,
      scaleIndex: 2,
    };
    mocks.patternsStore.currentSketchNotes = [replacement];
    mocks.patternsStore.currentWorkingNotes = [replacement];
    await nextTick();
    await flushPromises();

    expect(mocks.rafCallbacks.length).toBeGreaterThan(0);
    mocks.rafCallbacks.shift()?.(16);
    expect(mocks.mirrorScroller!.scrollLeft).toBeGreaterThan(0);
    wrapper.unmount();
  });
});
