import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, reactive, ref } from "vue";
import { createTestWrapper } from "../../helpers/test-utils";
import LiveStrip from "@/components/patterns/LiveStrip.vue";

const mockPatternsStore = reactive({
  currentSketchNotes: [] as Array<any>,
  currentWorkingNotes: [] as Array<any>,
  loadedBaseNotes: [] as Array<any>,
  currentSketchMeta: {
    bpm: 120,
    key: "C",
    mode: "major",
    instrument: "sine",
  },
  isStripCleared: false,
  focusedPatternId: null as string | null,
});

const mockVisualConfigStore = reactive({
  config: {
    liveStrip: {
      enabled: true,
      opacity: 1,
      bpm: 120,
      notation: "solfege" as const,
      showRests: true,
      showStrudelLine: false,
    },
    keyboard: {
      mainOctave: 4,
      colorMode: "colorful",
      keyBrightness: 1,
      keySaturation: 1,
      glassmorphOpacity: 0.5,
      keyShape: 4,
      angledStyle: false,
    },
    dynamicColors: {
      musicColorMode: "movable",
    },
  },
});

const mockMirrorState = {
  isPlaying: ref(false),
  attachEditor: vi.fn(),
  detachEditor: vi.fn(),
  syncCode: vi.fn(),
  setPlaying: vi.fn(),
  setError: vi.fn(),
};

vi.mock("@/stores/patterns", () => ({
  usePatternsStore: () => mockPatternsStore,
}));

vi.mock("@/stores/visualConfig", () => ({
  useVisualConfigStore: () => mockVisualConfigStore,
}));

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    getKeyBackground: () => ({
      background: "rgba(255,255,255,0.08)",
      primaryColor: "#88ffcc",
    }),
    getStaticPrimaryColorByScaleIndex: () => "#88ffcc",
  }),
}));

vi.mock("@/composables/useLiveStrudelMirror", () => ({
  useLiveStrudelMirror: () => ({
    attachEditor: mockMirrorState.attachEditor,
    detachEditor: mockMirrorState.detachEditor,
    syncCode: mockMirrorState.syncCode,
    setPlaying: mockMirrorState.setPlaying,
    setError: mockMirrorState.setError,
    isPlaying: mockMirrorState.isPlaying,
  }),
}));

vi.mock("@/services/StrudelNotation", () => ({
  logNotesToStrudel: vi.fn((notes: Array<{ note: string }>) =>
    notes.length ? notes.map((note) => note.note).join(" ") : ""
  ),
}));

vi.mock("@/services/superdoughAudio", () => ({
  initSuperdoughAudio: vi.fn(async () => {}),
  getAudioContext: () => ({ currentTime: 0 }),
  emotitoneStrudelOutput: {},
  stopStrudelVisuals: vi.fn(),
}));

vi.mock("@/components/patterns/strudelPlaybackHighlight", () => ({
  strudelPlaybackHighlightExtension: [],
  highlightPlaybackLocations: vi.fn(),
  updatePlaybackHighlightOptions: vi.fn(),
}));

vi.mock("@strudel/codemirror", () => {
  class MockStrudelMirror {
    code: string;
    view: any;
    editor: any;
    scroller: HTMLElement;
    content: HTMLElement;
    setCode: (code: string) => void;
    evaluate = vi.fn(async () => {});
    stop = vi.fn(async () => {});
    clear = vi.fn();
    updateSettings = vi.fn();

    constructor({ root, initialCode }: { root: HTMLElement; initialCode: string }) {
      this.code = initialCode;

      root.innerHTML = "";
      const editor = document.createElement("div");
      editor.className = "cm-editor";
      const scroller = document.createElement("div");
      scroller.className = "cm-scroller";
      const content = document.createElement("div");
      content.className = "cm-content";
      scroller.appendChild(content);
      editor.appendChild(scroller);
      root.appendChild(editor);
      (root as any).__mockStrudelMirror = this;

      this.scroller = scroller;
      this.content = content;
      this.view = {
        hasFocus: false,
        state: {
          doc: {
            toString: () => this.code,
          },
        },
        dispatch: vi.fn(),
      };
      this.editor = this.view;
      this.renderCode(initialCode);
      this.setCode = (code: string) => {
        this.code = code;
        this.renderCode(code);
      };
    }

    renderCode(code: string) {
      this.content.innerHTML = "";
      const tokens = code.trim().split(/\s+/).filter(Boolean);

      for (const token of tokens) {
        const element = document.createElement("span");
        element.className = "cm-live-strip-token";
        element.textContent = token;
        this.content.appendChild(element);
        this.content.appendChild(document.createTextNode(" "));
      }
    }
  }

  return {
    StrudelMirror: MockStrudelMirror,
  };
});

vi.mock("@strudel/core", () => ({
  evalScope: vi.fn(async () => {}),
}));

vi.mock("@strudel/mini", () => ({}));
vi.mock("@strudel/tonal", () => ({}));
vi.mock("@strudel/webaudio", () => ({}));
vi.mock("@strudel/transpiler", () => ({
  transpiler: {},
}));

vi.mock("@codemirror/state", () => ({
  StateEffect: {
    appendConfig: {
      of: vi.fn((value) => value),
    },
  },
}));

vi.mock("@codemirror/view", () => ({
  EditorView: {
    updateListener: {
      of: vi.fn((value) => value),
    },
  },
}));

function createNote(id: string, note: string) {
  return {
    id,
    note,
    scaleDegree: 1,
    scaleIndex: 0,
    octave: 4,
    frequency: 261.63,
    velocity: 0.8,
    pressTime: Number(id.replace(/\D/g, "")) * 100,
    releaseTime: Number(id.replace(/\D/g, "")) * 100 + 80,
    duration: 80,
  };
}

function applyScrollMetrics(element: HTMLElement, scrollWidth = 480, clientWidth = 140) {
  const scrollTo = vi.fn(({ left }: { left: number }) => {
    element.scrollLeft = left;
  });

  Object.defineProperty(element, "scrollWidth", {
    configurable: true,
    value: scrollWidth,
  });
  Object.defineProperty(element, "clientWidth", {
    configurable: true,
    value: clientWidth,
  });
  Object.defineProperty(element, "scrollTo", {
    configurable: true,
    value: scrollTo,
  });

  element.scrollLeft = 0;
  return scrollTo;
}

function installTokenGeometry(selector: string) {
  const offsetLeftDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "offsetLeft"
  );
  const offsetWidthDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "offsetWidth"
  );

  Object.defineProperty(HTMLElement.prototype, "offsetLeft", {
    configurable: true,
    get() {
      if (this instanceof HTMLElement && this.matches(selector)) {
        const tokens = Array.from(this.parentElement?.querySelectorAll(selector) ?? []);
        const index = Math.max(0, tokens.indexOf(this));
        return 36 + index * 92;
      }

      return offsetLeftDescriptor?.get?.call(this) ?? 0;
    },
  });

  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() {
      if (this instanceof HTMLElement && this.matches(selector)) {
        return 36;
      }

      return offsetWidthDescriptor?.get?.call(this) ?? 0;
    },
  });

  return () => {
    if (offsetLeftDescriptor) {
      Object.defineProperty(HTMLElement.prototype, "offsetLeft", offsetLeftDescriptor);
    }

    if (offsetWidthDescriptor) {
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", offsetWidthDescriptor);
    }
  };
}

async function flushStripUpdates() {
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

function resetStores() {
  const firstNote = createNote("note-1", "C4");

  mockPatternsStore.currentSketchNotes = [firstNote];
  mockPatternsStore.currentWorkingNotes = [firstNote];
  mockPatternsStore.loadedBaseNotes = [];
  mockPatternsStore.currentSketchMeta = {
    bpm: 120,
    key: "C",
    mode: "major",
    instrument: "sine",
  };
  mockPatternsStore.isStripCleared = false;
  mockPatternsStore.focusedPatternId = null;

  mockVisualConfigStore.config.liveStrip = {
    enabled: true,
    opacity: 1,
    bpm: 120,
    notation: "solfege",
    showRests: true,
    showStrudelLine: false,
  };

  mockMirrorState.isPlaying.value = false;
}

describe("LiveStrip.vue", () => {
  let wrapper: ReturnType<typeof createTestWrapper> | null = null;
  let restoreTokenGeometry: (() => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    resetStores();
  });

  afterEach(() => {
    restoreTokenGeometry?.();
    restoreTokenGeometry = null;
    wrapper?.unmount();
    wrapper = null;
  });

  it("follows newly appended live notes in supplement mode", async () => {
    restoreTokenGeometry = installTokenGeometry(".token");
    wrapper = createTestWrapper(LiveStrip);
    await flushStripUpdates();

    const notationBar = wrapper.get('[data-testid="live-strip-notation"]').element as HTMLElement;
    const scrollTo = applyScrollMetrics(notationBar);

    const nextNote = createNote("note-2", "D4");
    mockPatternsStore.currentSketchNotes.push(nextNote);
    mockPatternsStore.currentWorkingNotes.push(nextNote);

    await flushStripUpdates();

    expect(scrollTo).toHaveBeenLastCalledWith({ left: 87.2, behavior: "smooth" });
    expect(notationBar.scrollLeft).toBeCloseTo(87.2);
  });

  it("follows newly appended live notes in Strudel editor mode", async () => {
    restoreTokenGeometry = installTokenGeometry(".cm-live-strip-token");
    mockVisualConfigStore.config.liveStrip.showStrudelLine = true;

    wrapper = createTestWrapper(LiveStrip);
    await flushStripUpdates();

    const editorRoot = wrapper.get('[data-testid="live-strip-editor"]').element as HTMLElement;
    const scroller = editorRoot.querySelector(".cm-scroller") as HTMLElement;
    const scrollTo = applyScrollMetrics(scroller);

    const nextNote = createNote("note-2", "D4");
    mockPatternsStore.currentSketchNotes.push(nextNote);
    mockPatternsStore.currentWorkingNotes.push(nextNote);

    await flushStripUpdates();

    expect(scrollTo).toHaveBeenLastCalledWith({ left: 87.2, behavior: "smooth" });
    expect(scroller.scrollLeft).toBeCloseTo(87.2);
  });

  it("does not auto-follow appended Strudel notes while the editor is focused", async () => {
    restoreTokenGeometry = installTokenGeometry(".cm-live-strip-token");
    mockVisualConfigStore.config.liveStrip.showStrudelLine = true;

    wrapper = createTestWrapper(LiveStrip);
    await flushStripUpdates();

    const editorRoot = wrapper.get('[data-testid="live-strip-editor"]').element as HTMLElement;
    const scroller = editorRoot.querySelector(".cm-scroller") as HTMLElement;
    const scrollTo = applyScrollMetrics(scroller);
    const view = (editorRoot as any).__mockStrudelMirror?.view;
    view.hasFocus = true;

    const nextNote = createNote("note-2", "D4");
    mockPatternsStore.currentSketchNotes.push(nextNote);
    mockPatternsStore.currentWorkingNotes.push(nextNote);

    await flushStripUpdates();

    expect(scrollTo).not.toHaveBeenCalled();
    expect(scroller.scrollLeft).toBe(0);
  });

  it("resets the strip scroll when loading a base pattern or clearing the strip", async () => {
    mockVisualConfigStore.config.liveStrip.showStrudelLine = true;

    wrapper = createTestWrapper(LiveStrip);
    await flushStripUpdates();

    const editorRoot = wrapper.get('[data-testid="live-strip-editor"]').element as HTMLElement;
    const scroller = editorRoot.querySelector(".cm-scroller") as HTMLElement;
    const scrollTo = applyScrollMetrics(scroller);
    scroller.scrollLeft = 220;

    const baseNote = createNote("note-9", "G4");
    mockPatternsStore.loadedBaseNotes = [baseNote];
    mockPatternsStore.currentSketchNotes = [baseNote];
    mockPatternsStore.currentWorkingNotes = [];
    mockPatternsStore.focusedPatternId = "pattern-1";

    await flushStripUpdates();

    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: "auto" });

    scroller.scrollLeft = 180;
    mockPatternsStore.isStripCleared = true;
    mockPatternsStore.loadedBaseNotes = [];
    mockPatternsStore.currentSketchNotes = [];
    mockPatternsStore.currentWorkingNotes = [];

    await flushStripUpdates();

    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: "auto" });
    expect(scroller.scrollLeft).toBe(0);
  });
});
