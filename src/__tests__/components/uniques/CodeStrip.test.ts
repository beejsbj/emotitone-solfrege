import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { reactive } from "vue";
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
  serializeCodeStripTokens: vi.fn(() => "`< C4@0.25 >`"),
}));

vi.mock("@/composables/useStrudel", () => ({
  toStrudelSound: () => "sine",
}));

vi.mock("@/services/StrudelNotation", () => ({
  logNotesToStrudel: () => "`< C4@0.25 >`.as(\"note\").sound(\"sine\").cpm(120 / 4)",
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
    evaluate = mocks.mirrorEvaluate;
    stop = vi.fn().mockResolvedValue(undefined);
    clear = vi.fn();
    updateSettings = vi.fn();

    constructor(options: any) {
      mocks.mirrorOptions = options;
      mocks.mirrorInitialCode = options.initialCode;
      this.code = options.initialCode;
      this.editor = {
        hasFocus: false,
        state: { doc: { toString: () => this.code, length: this.code.length } },
        dispatch: vi.fn(),
      };
    }

    setCode(code: string) {
      this.code = code;
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
});
