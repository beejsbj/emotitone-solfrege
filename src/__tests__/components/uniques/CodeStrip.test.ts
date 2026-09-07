import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { nextTick, reactive } from "vue";
import type { PatternNote } from "@/types/patterns";

const mocks = vi.hoisted(() => ({
  patternsStore: null as any,
  instrumentStore: null as any,
  visualConfigStore: null as any,
  mirrorOptions: null as any,
  mirrorInitialCode: "",
  mirrorEvaluate: vi.fn().mockResolvedValue(undefined),
  mirrorUpdateSettingsError: null as Error | null,
  mirrorRawStop: vi.fn(),
  stopStrudelVisuals: vi.fn(),
  updatePresentation: vi.fn(),
  setCodeStripPlaying: vi.fn(),
  applySpecimenPlayback: vi.fn(),
  mirrorInstance: null as any,
  mirrorScroller: null as HTMLElement | null,
  latestEvent: null as HTMLElement | null,
  rafCallbacks: [] as FrameRequestCallback[],
}));

vi.mock("@/stores/patterns", () => ({
  usePatternsStore: () => mocks.patternsStore,
}));

vi.mock("@/stores/instrument", () => ({
  useInstrumentStore: () => mocks.instrumentStore,
}));

vi.mock("@/stores/visualConfig", () => ({
  useVisualConfigStore: () => mocks.visualConfigStore,
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
  applySpecimenPlayback: mocks.applySpecimenPlayback,
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
  stopStrudelVisuals: mocks.stopStrudelVisuals,
}));

vi.mock("@strudel/codemirror", () => ({
  StrudelMirror: class {
    code: string;
    editor: EditorView;
    stop: ReturnType<typeof vi.fn>;
    clear = vi.fn();
    drawer = { stop: vi.fn() };
    repl: {
      setCode: ReturnType<typeof vi.fn>;
      scheduler: { onToggle: (started: boolean) => void };
    };
    updateSettings = vi.fn(() => {
      if (mocks.mirrorUpdateSettingsError) throw mocks.mirrorUpdateSettingsError;
    });
    options: any;

    constructor(options: any) {
      this.options = options;
      this.code = options.initialCode;
      this.repl = {
        setCode: vi.fn(),
        scheduler: { onToggle: options.onToggle },
      };
      this.editor = new EditorView({
        state: EditorState.create({ doc: options.initialCode }),
        parent: options.root,
      });
      const scroller = this.editor.scrollDOM;
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
      this.editor.coordsAtPos = () => ({ left: 420, right: 420, top: 0, bottom: 20 });
      const requestEditorMeasure = this.editor.requestMeasure.bind(this.editor);
      this.editor.requestMeasure = (request?: any) => {
        if (!request) return requestEditorMeasure();
        request.write(request.read(this.editor), this.editor);
      };

      mocks.mirrorOptions = options;
      mocks.mirrorInitialCode = options.initialCode;
      this.stop = vi.fn(async () => {
        this.repl.scheduler.onToggle(false);
      });
      mocks.mirrorRawStop = this.stop;
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
      try {
        await mocks.mirrorEvaluate(this.code);
        this.repl.scheduler.onToggle(true);
      } catch (error) {
        this.options.onEvalError(error);
      }
    }
  },
}));

vi.mock("@strudel/core", () => ({ evalScope: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@strudel/mini", () => ({}));
vi.mock("@strudel/tonal", () => ({}));
vi.mock("@strudel/webaudio", () => ({}));
vi.mock("@strudel/transpiler", () => ({ transpiler: vi.fn() }));

import CodeStrip from "@/components/uniques/CodeStrip/index.vue";
import { useCodeStripStrudel } from "@/composables/useCodeStripStrudel";

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

beforeEach(async () => {
  if (mocks.instrumentStore) await useCodeStripStrudel().detachEditor();
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
  mocks.instrumentStore = reactive({ isInteractionLocked: false, selectionEpoch: 0 });
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
  mocks.mirrorUpdateSettingsError = null;
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
    expect(wrapper.classes()).not.toContain("code-strip--unframed");
    expect(wrapper.classes()).not.toContain("code-strip--empty");
    expect(wrapper.get(".code-strip__editor").attributes("style") ?? "")
      .not.toContain("display: none");
    expect(mocks.mirrorInitialCode).toContain("C4@0.25");
    expect(mocks.mirrorOptions.bgFill).toBe(false);
    expect(useCodeStripStrudel().isReady.value).toBe(true);
    expect(useCodeStripStrudel().currentCode.value).toContain("C4@0.25");
    expect(mocks.updatePresentation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        durationMode: "stacked",
        tokens: [expect.objectContaining({ type: "note", rawPitch: "C4" })],
      }),
    );

    wrapper.unmount();
    await flushPromises();
    expect(useCodeStripStrudel().isReady.value).toBe(false);
    expect(mocks.mirrorRawStop).toHaveBeenCalledOnce();
    expect(mocks.mirrorInstance.clear).toHaveBeenCalledOnce();
  });

  it("keeps the empty production editor compact and free of third-party fill", async () => {
    mocks.patternsStore.currentSketchNotes = [];
    mocks.patternsStore.currentWorkingNotes = [];
    mocks.patternsStore.isStripCleared = true;

    const wrapper = mount(CodeStrip, { props: { framed: false } });
    await flushPromises();

    expect(mocks.mirrorInitialCode).toBe("// Record a pattern");
    expect(mocks.mirrorOptions.bgFill).toBe(false);
    expect(wrapper.classes()).toContain("code-strip--unframed");
    expect(wrapper.classes()).toContain("code-strip--empty");

    wrapper.unmount();
  });

  it("preserves the default frame around an empty standalone CodeStrip", async () => {
    mocks.patternsStore.currentSketchNotes = [];
    mocks.patternsStore.currentWorkingNotes = [];
    mocks.patternsStore.isStripCleared = true;

    const wrapper = mount(CodeStrip);
    await flushPromises();

    expect(wrapper.classes()).toContain("code-strip--empty");
    expect(wrapper.classes()).not.toContain("code-strip--unframed");

    wrapper.unmount();
  });

  it("disposes a mirror that fails before transport attachment", async () => {
    mocks.mirrorUpdateSettingsError = new Error("settings failed");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const wrapper = mount(CodeStrip);
    await flushPromises();

    expect(wrapper.get(".code-strip__error").text()).toBe("settings failed");
    expect(useCodeStripStrudel().isReady.value).toBe(false);
    expect(mocks.mirrorRawStop).toHaveBeenCalledOnce();
    expect(mocks.stopStrudelVisuals).not.toHaveBeenCalled();
    expect(mocks.mirrorInstance.clear).toHaveBeenCalledOnce();

    wrapper.unmount();
    expect(mocks.mirrorRawStop).toHaveBeenCalledOnce();
    expect(mocks.mirrorInstance.clear).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it("turns the source decorations to Ink as soon as play is requested", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    const transport = useCodeStripStrudel();

    await transport.play();
    expect(mocks.setCodeStripPlaying).toHaveBeenCalledWith(expect.anything(), true);
    expect(mocks.mirrorEvaluate).toHaveBeenCalledOnce();

    const presentationsBeforeDraw = mocks.updatePresentation.mock.calls.length;
    mocks.mirrorOptions.onDraw([], .5);
    await flushPromises();
    expect(mocks.updatePresentation).toHaveBeenCalledTimes(presentationsBeforeDraw);

    await transport.stop();
    expect(mocks.setCodeStripPlaying).toHaveBeenLastCalledWith(expect.anything(), false);
    wrapper.unmount();
  });

  it("keeps a controlled specimen independent from the live editor transport", async () => {
    const live = mount(CodeStrip);
    const specimen = mount(CodeStrip, {
      props: { source: "`< C4@0.25 E4@0.25 >`" },
    });
    await flushPromises();
    const specimenView = mocks.applySpecimenPlayback.mock.calls.at(-1)?.[0];
    expect(specimenView).toBeDefined();
    mocks.setCodeStripPlaying.mockClear();

    await useCodeStripStrudel().play();
    await nextTick();

    expect(live.classes()).toContain("code-strip--playing");
    expect(specimen.classes()).not.toContain("code-strip--playing");
    expect(
      mocks.setCodeStripPlaying.mock.calls.some(([view]) => view === specimenView),
    ).toBe(false);

    await useCodeStripStrudel().stop();
    expect(
      mocks.setCodeStripPlaying.mock.calls.some(([view]) => view === specimenView),
    ).toBe(false);
    specimen.unmount();
    live.unmount();
  });

  it("blocks editor-owned playback shortcuts while samples are warming", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    mocks.instrumentStore.isInteractionLocked = true;

    await mocks.mirrorInstance.evaluate();

    expect(mocks.mirrorEvaluate).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("stops playback when warmup begins during a pending evaluation", async () => {
    let resolveEvaluation!: () => void;
    mocks.mirrorEvaluate.mockImplementationOnce(
      () => new Promise<void>((resolve) => {
        resolveEvaluation = resolve;
      }),
    );
    const wrapper = mount(CodeStrip);
    await flushPromises();

    const evaluation = mocks.mirrorInstance.evaluate();
    await vi.waitFor(() => expect(mocks.mirrorEvaluate).toHaveBeenCalledOnce());
    mocks.instrumentStore.isInteractionLocked = true;
    resolveEvaluation();
    await evaluation;

    expect(mocks.mirrorRawStop).toHaveBeenCalled();
    expect(useCodeStripStrudel().isPlaying.value).toBe(false);
    wrapper.unmount();
  });

  it("detaches and releases a pending editor evaluation on unmount", async () => {
    let resolveEvaluation!: () => void;
    mocks.mirrorEvaluate.mockImplementationOnce(
      () => new Promise<void>((resolve) => {
        resolveEvaluation = resolve;
      }),
    );
    const wrapper = mount(CodeStrip);
    await flushPromises();

    const evaluation = mocks.mirrorInstance.evaluate();
    await vi.waitFor(() => expect(mocks.mirrorEvaluate).toHaveBeenCalledOnce());
    wrapper.unmount();
    await flushPromises();

    expect(useCodeStripStrudel().isReady.value).toBe(false);
    expect(mocks.mirrorInstance.clear).toHaveBeenCalledOnce();
    expect(mocks.mirrorRawStop).toHaveBeenCalledOnce();

    resolveEvaluation();
    await evaluation;
    await vi.waitFor(() => expect(mocks.mirrorRawStop).toHaveBeenCalledTimes(2));

    expect(useCodeStripStrudel().isPlaying.value).toBe(false);
  });

  it("forwards swallowed Strudel evaluation errors through the real transport", async () => {
    mocks.mirrorEvaluate.mockRejectedValueOnce(new Error("invalid pattern"));
    const wrapper = mount(CodeStrip);
    await flushPromises();

    await useCodeStripStrudel().play();

    expect(useCodeStripStrudel().lastError.value).toBe("invalid pattern");
    expect(useCodeStripStrudel().isPlaying.value).toBe(false);
    expect(mocks.mirrorRawStop).toHaveBeenCalledOnce();
    expect(mocks.stopStrudelVisuals).toHaveBeenCalledOnce();
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
    mocks.mirrorInstance.code = "sound('stale')";
    expect(mocks.mirrorInstance.code).not.toBe(visibleSource);

    await useCodeStripStrudel().play();
    expect(mocks.mirrorInstance.code).toBe(visibleSource);
    expect(mocks.mirrorEvaluate).toHaveBeenLastCalledWith(visibleSource);
    wrapper.unmount();
  });

  it("coalesces presentation updates and applies the latest metadata after a source edit", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    mocks.updatePresentation.mockClear();

    const nextNote: PatternNote = {
      ...recordedNote,
      id: "d",
      note: "D4",
      scaleDegree: 2,
      scaleIndex: 1,
    };
    mocks.patternsStore.currentSketchNotes = [nextNote];
    mocks.patternsStore.currentWorkingNotes = [nextNote];
    await wrapper.setProps({ durationMode: "bar" });
    await nextTick();
    await flushPromises();

    expect(mocks.updatePresentation).toHaveBeenCalledOnce();
    expect(mocks.updatePresentation).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ durationMode: "bar" }),
    );
    wrapper.unmount();
  });

  it("repairs a stale runtime source from the visible document before Play", async () => {
    const wrapper = mount(CodeStrip);
    await flushPromises();
    const visibleSource = mocks.mirrorInstance.editor.state.doc.toString();
    mocks.mirrorInstance.code = "`< stale@1 >`";

    await useCodeStripStrudel().play();

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
    expect(new Set(samples).size).toBeGreaterThan(2);
    expect(samples.at(-1)!).toBeGreaterThan(0);
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
    for (let frame = 1; frame <= 12 && mocks.mirrorScroller!.scrollLeft === 0; frame++) {
      mocks.rafCallbacks.shift()?.(frame * 16);
    }
    expect(mocks.mirrorScroller!.scrollLeft).toBeGreaterThan(0);
    wrapper.unmount();
  });
});
