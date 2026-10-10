import { afterEach, expect, it, vi } from "vitest";
import { manageAudioLifecycle } from "@/services/audioLifecycle";

const mocks = vi.hoisted(() => ({ options: undefined as undefined | {
  onToggle(started: boolean): void; beforeStart(): Promise<void>;
}, context: Object.assign(new EventTarget(), { state: "interrupted", resume: vi.fn(), suspend: vi.fn() }) }));
vi.mock("@strudel/core", () => ({ evalScope: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@strudel/mini", () => ({}));
vi.mock("@strudel/tonal", () => ({}));
vi.mock("@strudel/webaudio", () => ({}));
vi.mock("@strudel/transpiler", () => ({ transpiler: vi.fn() }));
vi.mock("@strudel/codemirror", () => ({ StrudelMirror: class {
  constructor(options: typeof mocks.options) { mocks.options = options; }
  stop() { mocks.options!.onToggle(false); }
} }));
vi.mock("@/services/superdoughAudio", () => ({
  setStrudelLaBasedMinor: vi.fn(),
  getAudioContext: () => mocks.context, initSuperdoughAudio: vi.fn(),
  stopStrudelVisuals: vi.fn(), emotitoneStrudelOutput: vi.fn(),
}));
import { createPatternEditor, disposePatternEditor } from "@/services/patternPlayback";

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
it("resumes interrupted native playback and protects silent transport bars until stop", async () => {
  vi.useFakeTimers();
  vi.spyOn(performance, "now").mockImplementation(() => Date.now());
  mocks.context.resume.mockImplementation(async () => {
    mocks.context.state = "running";
    mocks.context.dispatchEvent(new Event("statechange"));
  });
  mocks.context.suspend.mockImplementation(async () => {
    mocks.context.state = "suspended";
    mocks.context.dispatchEvent(new Event("statechange"));
  });
  const stop = manageAudioLifecycle(mocks.context as unknown as AudioContext, { isSounding: () => false });
  const onToggle = vi.fn();
  const editor = createPatternEditor({ root: document.createElement("div"), initialCode: "", onDraw: vi.fn(), onToggle, onEvalError: vi.fn() });
  try {
    await mocks.options!.beforeStart();
    expect(mocks.context.resume).toHaveBeenCalledOnce();
    mocks.options!.onToggle(true);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(mocks.context.suspend).not.toHaveBeenCalled();
    await disposePatternEditor(editor);
    await vi.advanceTimersByTimeAsync(30_250);
    expect(mocks.context.suspend).toHaveBeenCalledOnce();
  } finally { await disposePatternEditor(editor); stop(); }
});
