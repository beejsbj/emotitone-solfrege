import { afterEach, expect, it, vi } from "vitest";
import { manageAudioLifecycle } from "@/services/audioLifecycle";

const mocks = vi.hoisted(() => ({ options: undefined as undefined | {
  onToggle(started: boolean): void; beforeStart(): Promise<void>; beforeEval(args: { code: string }): Promise<void>;
}, context: Object.assign(new EventTarget(), { state: "interrupted", resume: vi.fn(), suspend: vi.fn() }) }));
vi.mock("@strudel/core", () => ({
  evalScope: vi.fn().mockResolvedValue(undefined),
  repl: (options: typeof mocks.options) => {
    mocks.options = options;
    return { scheduler: { stop: () => mocks.options!.onToggle(false) }, evaluate: vi.fn() };
  },
}));
vi.mock("@strudel/mini", () => ({}));
vi.mock("@strudel/tonal", () => ({}));
vi.mock("@strudel/webaudio", () => ({}));
vi.mock("@strudel/transpiler", () => ({ transpiler: vi.fn() }));
vi.mock("@/services/superdoughAudio", () => ({
  preparePatternSounds: vi.fn().mockResolvedValue(undefined),
  setStrudelLaBasedMinor: vi.fn(),
  getAudioContext: () => mocks.context, initSuperdoughAudio: vi.fn(),
  stopStrudelVisuals: vi.fn(), emotitoneStrudelOutput: vi.fn(),
}));
import { initSuperdoughAudio, preparePatternSounds } from "@/services/superdoughAudio";
import { createPatternTransport, disposePatternTransport } from "@/services/patternPlayback";
import { soundingNoteIdForHap } from "@/services/notationSpans";

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
  const editor = createPatternTransport({ initialCode: "", onFrame: vi.fn(), onToggle, onEvalError: vi.fn() });
  try {
    // Creating the transport prebakes audio but loads no pattern sounds yet.
    expect(preparePatternSounds).not.toHaveBeenCalled();
    // Play waits until the sounds the pattern names are loaded for its renderer.
    editor.code = "s('gm_celesta')";
    let finishCatalog!: () => void;
    vi.mocked(preparePatternSounds).mockImplementationOnce(() => new Promise<void>(resolve => { finishCatalog = resolve; }));
    let started = false;
    const starting = mocks.options!.beforeEval({ code: editor.code }).then(() => { started = true; });
    await vi.waitFor(() => expect(preparePatternSounds).toHaveBeenCalledWith("s('gm_celesta')"));
    expect(started).toBe(false);
    finishCatalog();
    await starting;
    await mocks.options!.beforeStart();
    expect(mocks.context.resume).toHaveBeenCalledOnce();
    mocks.options!.onToggle(true);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(mocks.context.suspend).not.toHaveBeenCalled();
    await disposePatternTransport(editor);
    await vi.advanceTimersByTimeAsync(30_250);
    expect(mocks.context.suspend).toHaveBeenCalledOnce();
  } finally { await disposePatternTransport(editor); stop(); }
});

it("refuses to publish or start from an evaluation that outlives its transport", async () => {
  type Hooks = { editPattern(pattern: unknown): unknown; beforeStart(): Promise<void> };
  const noteAt = () => soundingNoteIdForHap({ context: { locations: [{ start: 0, end: 1 }] } });
  const stale = createPatternTransport({ initialCode: "", onFrame: vi.fn(), onToggle: vi.fn(), onEvalError: vi.fn() });
  const staleHooks = mocks.options as unknown as Hooks;
  stale.setCode("a", [{ noteId: "old", from: 0, to: 1 }]);
  await stale.evaluate();
  // Unmounted mid-evaluation; a new strip mounts and plays its own phrase.
  await disposePatternTransport(stale);
  const current = createPatternTransport({ initialCode: "", onFrame: vi.fn(), onToggle: vi.fn(), onEvalError: vi.fn() });
  try {
    current.setCode("a", [{ noteId: "new", from: 0, to: 1 }]);
    await current.evaluate();
    (mocks.options as unknown as Hooks).editPattern("pattern");
    expect(noteAt()).toBe("new");

    // The stale evaluation resumes: it must not relabel the new notes or start sounding.
    staleHooks.editPattern("pattern");
    expect(noteAt()).toBe("new");
    await expect(staleHooks.beforeStart()).rejects.toThrow("disposed");
  } finally { await disposePatternTransport(current); }
});

it("prepares the code each evaluation plays and retries a failed warm-up on the next", async () => {
  vi.mocked(initSuperdoughAudio).mockRejectedValueOnce(new Error("audio unavailable"));
  const transport = createPatternTransport({ initialCode: "", onFrame: vi.fn(), onToggle: vi.fn(), onEvalError: vi.fn() });
  const hooks = mocks.options!;
  try {
    // The first Play fails with the warm-up…
    await expect(hooks.beforeEval({ code: "s('piano')" })).rejects.toThrow("audio unavailable");
    // …and the next one warms again rather than replaying the old failure.
    transport.code = "s('newer')";
    await hooks.beforeEval({ code: "s('piano')" });
    expect(initSuperdoughAudio).toHaveBeenCalledTimes(2);
    // It prepares the code being evaluated, not code published since.
    expect(preparePatternSounds).toHaveBeenLastCalledWith("s('piano')");
  } finally { await disposePatternTransport(transport); }
});

it("does not start or report playback from a transport disposed while its audio resumed", async () => {
  let finishResume!: () => void;
  mocks.context.state = "suspended";
  mocks.context.resume.mockImplementation(() => new Promise<void>((resolve) => {
    finishResume = () => {
      mocks.context.state = "running";
      mocks.context.dispatchEvent(new Event("statechange"));
      resolve();
    };
  }));
  const onToggle = vi.fn();
  const stale = createPatternTransport({ initialCode: "", onFrame: vi.fn(), onToggle, onEvalError: vi.fn() });
  const hooks = mocks.options!;
  const starting = hooks.beforeStart();
  await vi.waitFor(() => expect(mocks.context.resume).toHaveBeenCalled());

  await disposePatternTransport(stale);
  onToggle.mockClear();
  finishResume();
  await expect(starting).rejects.toThrow("disposed");
  // Nor can a late start of its scheduler report playback.
  hooks.onToggle(true);
  expect(onToggle).not.toHaveBeenCalled();
});
