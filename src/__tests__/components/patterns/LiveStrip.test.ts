import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick, reactive, ref } from "vue";
import type { PatternNote } from "@/types/patterns";

const mocks = vi.hoisted(() => ({
  patternsStore: null as any,
  visualConfigStore: null as any,
  mirrorOptions: null as any,
  mirrorInitialCode: "",
  attachEditor: vi.fn(),
  detachEditor: vi.fn(),
  syncCode: vi.fn(),
  setPlaying: vi.fn(),
  setError: vi.fn(),
  updateCodeStripPresentation: vi.fn(),
  rafCallbacks: [] as FrameRequestCallback[],
}));

vi.mock("@/stores/patterns", () => ({
  usePatternsStore: () => mocks.patternsStore,
}));

vi.mock("@/stores/visualConfig", () => ({
  useVisualConfigStore: () => mocks.visualConfigStore,
}));

vi.mock("@/composables/useLiveStrudelMirror", () => ({
  useLiveStrudelMirror: () => ({
    attachEditor: mocks.attachEditor,
    detachEditor: mocks.detachEditor,
    syncCode: mocks.syncCode,
    setPlaying: mocks.setPlaying,
    setError: mocks.setError,
    isPlaying: ref(false),
  }),
}));

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    getKeyBackground: (scaleIndex: number) => ({
      background: `surface-${scaleIndex}`,
      primaryColor: `color-${scaleIndex}`,
    }),
    getStaticPrimaryColorByScaleIndex: (scaleIndex: number) => `color-${scaleIndex}`,
  }),
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

vi.mock("@/components/patterns/codeStripMirrorPresentation", () => ({
  codeStripMirrorPresentationExtension: [],
  updateCodeStripPresentation: mocks.updateCodeStripPresentation,
}));

vi.mock("@strudel/codemirror", () => ({
  StrudelMirror: class {
    code: string;
    editor: any;
    evaluate = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
    clear = vi.fn();
    updateSettings = vi.fn();

    constructor(options: any) {
      mocks.mirrorOptions = options;
      mocks.mirrorInitialCode = options.initialCode;
      this.code = options.initialCode;
      this.editor = {
        hasFocus: false,
        state: { doc: { toString: () => this.code } },
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

import LiveStrip from "@/components/patterns/LiveStrip.vue";

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
      liveStrip: {
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
        glassmorphOpacity: .4,
        keyShape: 4,
        angledStyle: false,
      },
      dynamicColors: { musicColorMode: "movable" },
    },
  });
  mocks.mirrorOptions = null;
  mocks.mirrorInitialCode = "";
  mocks.rafCallbacks = [];
  vi.clearAllMocks();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    mocks.rafCallbacks.push(callback);
    return mocks.rafCallbacks.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LiveStrip CodeStrip production seam", () => {
  it("keeps one editable Strudel mirror and supplies it with the authoritative CodeStrip presentation", async () => {
    const wrapper = mount(LiveStrip);
    await flushPromises();

    expect(wrapper.find(".live-strip__supplement").exists()).toBe(false);
    expect(wrapper.get(".live-strip__editor").attributes("style") ?? "")
      .not.toContain("display: none");
    expect(mocks.mirrorInitialCode).toContain("C4@0.25");
    expect(mocks.attachEditor).toHaveBeenCalledOnce();
    expect(mocks.attachEditor.mock.calls[0][1]).toContain("C4@0.25");
    expect(mocks.updateCodeStripPresentation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        activeTokenIndex: null,
        durationMode: "stacked",
        tokens: [expect.objectContaining({ type: "note", rawPitch: "C4" })],
      }),
    );

    wrapper.unmount();
    expect(mocks.detachEditor).toHaveBeenCalledOnce();
  });

  it("routes playback progress and smooth follow to the CodeStrip scroll surface", async () => {
    const wrapper = mount(LiveStrip);
    await flushPromises();

    const editor = wrapper.get(".live-strip__editor").element as HTMLElement;
    editor.innerHTML = `
      <div class="cm-code-strip-widget" data-active-token-index="0">
        <div class="code-strip__sequence">
          <span data-code-strip-index="0"></span>
        </div>
      </div>
    `;
    const scroller = editor.querySelector<HTMLElement>(".code-strip__sequence")!;
    const token = editor.querySelector<HTMLElement>('[data-code-strip-index="0"]')!;
    Object.defineProperties(scroller, {
      clientWidth: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 500 },
    });
    Object.defineProperties(token, {
      offsetLeft: { configurable: true, value: 300 },
      offsetWidth: { configurable: true, value: 30 },
    });
    scroller.scrollLeft = 0;

    mocks.mirrorOptions.onToggle(true);
    mocks.mirrorOptions.onDraw([], .5);
    await flushPromises();

    expect(mocks.updateCodeStripPresentation).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        activeTokenIndex: 0,
        tokens: [expect.objectContaining({ progress: 0.5 })],
      }),
    );
    expect(mocks.rafCallbacks.length).toBeGreaterThan(0);

    for (let step = 0; step < 8 && mocks.rafCallbacks.length; step++) {
      mocks.rafCallbacks.shift()?.(step);
    }
    expect(scroller.scrollLeft).toBeGreaterThan(0);

    mocks.mirrorOptions.onToggle(false);
    await nextTick();
    expect(mocks.updateCodeStripPresentation).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        activeTokenIndex: null,
        tokens: [expect.objectContaining({ progress: 0 })],
      }),
    );
  });
});
