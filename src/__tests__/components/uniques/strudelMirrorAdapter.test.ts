import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { history, undo } from "@codemirror/commands";
import { reactive } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockWidgetEffect = StateEffect.define<string>();
const mockWidgetField = StateField.define<string | null>({
  create: () => null,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(mockWidgetEffect)) value = effect.value;
    }
    return value;
  },
});

const mocks = vi.hoisted(() => ({
  instrumentStore: null as unknown as {
    isInteractionLocked: boolean;
    selectionEpoch: number;
  },
  mirrors: [] as Array<{
    options: any;
    evaluate: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    rawEvaluate: ReturnType<typeof vi.fn>;
    rawStop: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    drawer: { stop: ReturnType<typeof vi.fn> };
    schedulerActive: boolean;
    solo: boolean;
    editor: EditorView;
    repl: {
      setCode: ReturnType<typeof vi.fn>;
      scheduler: { onToggle: (started: boolean) => void };
    };
    complete: () => void;
  }>,
  sharedVisualOwner: null as string | null,
  sharedCanvasOwner: null as string | null,
  canvasCleanups: 0,
  audioOutputs: [] as string[],
  draws: [] as string[],
}));

vi.mock("@/stores/instrument", () => ({
  useInstrumentStore: () => mocks.instrumentStore,
}));

vi.mock("@strudel/codemirror", () => ({
  StrudelMirror: class {
    code: string;
    options: any;
    evaluate: ReturnType<typeof vi.fn>;
    rawEvaluate: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    rawStop: ReturnType<typeof vi.fn>;
    clear = vi.fn();
    updateSettings = vi.fn();
    schedulerActive = false;
    solo: boolean;
    root: HTMLElement;
    editor: EditorView;
    drawer = { stop: vi.fn() };
    repl: {
      setCode: ReturnType<typeof vi.fn>;
      scheduler: { onToggle: (started: boolean) => void };
    };
    private resolveEvaluation: (() => void) | null = null;

    constructor(options: any) {
      this.options = options;
      this.code = options.initialCode;
      this.solo = options.solo;
      this.root = options.root;
      this.repl = {
        setCode: vi.fn(),
        scheduler: {
          onToggle: (started: boolean) => {
            options.onToggle(started);
            if (!started) {
              mocks.canvasCleanups += 1;
              mocks.sharedCanvasOwner = null;
            }
          },
        },
      };
      this.editor = new EditorView({
        state: EditorState.create({
          doc: options.initialCode,
          extensions: [
            history(),
            mockWidgetField,
            EditorView.updateListener.of((update) => {
              if (!update.docChanged) return;
              this.code = update.state.doc.toString();
              this.repl.setCode(this.code);
            }),
          ],
        }),
        parent: options.root,
      });
      this.rawEvaluate = vi.fn(
        () => new Promise<void>((resolve) => {
          this.resolveEvaluation = resolve;
        }),
      );
      this.evaluate = this.rawEvaluate;
      this.rawStop = vi.fn(async () => {
        this.schedulerActive = false;
        this.repl.scheduler.onToggle(false);
      });
      this.stop = this.rawStop;
      mocks.mirrors.push(this);
    }

    getCode() {
      return this.code;
    }

    setCode(source: string) {
      this.editor.dispatch({
        changes: { from: 0, to: this.editor.state.doc.length, insert: source },
      });
    }

    complete() {
      this.schedulerActive = true;
      void this.options.defaultOutput(this.code);
      this.repl.scheduler.onToggle(true);
      this.editor.dispatch({ effects: mockWidgetEffect.of(this.code) });
      this.options.onDraw();
      this.resolveEvaluation?.();
      this.resolveEvaluation = null;
    }
  },
}));

import { useCodeStripStrudel } from "@/composables/useCodeStripStrudel";
import { StrudelMirrorCodeStripAdapter } from "@/components/uniques/CodeStrip/strudelMirrorAdapter";

function createAdapter(
  source: string,
  releaseShared: () => void,
  root = document.createElement("div"),
) {
  return new StrudelMirrorCodeStripAdapter({
    root,
    initialSource: source,
    transpiler: vi.fn(),
    defaultOutput: (code: unknown) => {
      mocks.audioOutputs.push(String(code));
    },
    getTime: () => 0,
    prebake: async () => undefined,
    onDraw: () => {
      mocks.sharedVisualOwner = source;
      mocks.sharedCanvasOwner = source;
      mocks.draws.push(source);
    },
    onRelease: releaseShared,
  });
}

describe("StrudelMirror CodeStrip adapter ownership", () => {
  beforeEach(() => {
    mocks.instrumentStore = reactive({
      isInteractionLocked: false,
      selectionEpoch: 0,
    });
    mocks.mirrors = [];
    mocks.sharedVisualOwner = null;
    mocks.sharedCanvasOwner = null;
    mocks.canvasCleanups = 0;
    mocks.audioOutputs = [];
    mocks.draws = [];
  });

  afterEach(async () => {
    await useCodeStripStrudel().detachEditor();
  });

  it("contains late retired completion without blocking or clearing a replacement", async () => {
    const transport = useCodeStripStrudel();
    const releaseShared = vi.fn(() => {
      mocks.sharedVisualOwner = null;
    });
    const oldAdapter = createAdapter("sound('old')", releaseShared);
    transport.attachEditor(oldAdapter);
    const oldPlay = transport.play();
    await vi.waitFor(() => expect(mocks.mirrors[0].rawEvaluate).toHaveBeenCalledOnce());

    const newAdapter = createAdapter("sound('new')", releaseShared);
    transport.attachEditor(newAdapter);
    const newPlay = transport.play();

    expect(mocks.mirrors[0].rawStop).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(releaseShared).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(mocks.mirrors[1].rawEvaluate).toHaveBeenCalledOnce());
    await oldPlay;

    mocks.mirrors[1].complete();
    await newPlay;

    expect(transport.currentCode.value).toBe("sound('new')");
    expect(transport.isPlaying.value).toBe(true);
    expect(mocks.sharedVisualOwner).toBe("sound('new')");

    mocks.mirrors[0].complete();
    await vi.waitFor(() => expect(mocks.mirrors[0].schedulerActive).toBe(false));

    expect(mocks.mirrors[0].solo).toBe(false);
    expect(mocks.mirrors[0].rawStop).toHaveBeenCalledTimes(2);
    expect(mocks.mirrors[1].schedulerActive).toBe(true);
    expect(mocks.mirrors[1].rawStop).not.toHaveBeenCalled();
    expect(mocks.sharedVisualOwner).toBe("sound('new')");
    expect(mocks.sharedCanvasOwner).toBe("sound('new')");
    expect(mocks.canvasCleanups).toBe(1);
    expect(releaseShared).toHaveBeenCalledOnce();

    // A callback arriving after retirement is disconnected from transport and
    // cannot release the replacement's shared visuals.
    mocks.mirrors[0].options.onToggle(true);
    expect(transport.isPlaying.value).toBe(true);
    expect(mocks.sharedVisualOwner).toBe("sound('new')");
    expect(releaseShared).toHaveBeenCalledOnce();
  });

  it("disposes an unattached mirror without releasing active shared visuals", async () => {
    const transport = useCodeStripStrudel();
    const releaseShared = vi.fn(() => {
      mocks.sharedVisualOwner = null;
    });
    const activeAdapter = createAdapter("sound('active')", releaseShared);
    transport.attachEditor(activeAdapter);
    const activePlay = transport.play();
    await vi.waitFor(() => expect(mocks.mirrors[0].rawEvaluate).toHaveBeenCalledOnce());
    mocks.mirrors[0].complete();
    await activePlay;
    expect(mocks.sharedVisualOwner).toBe("sound('active')");

    const unattachedAdapter = createAdapter("sound('unattached')", releaseShared);
    await unattachedAdapter.disposeUnattached();

    expect(mocks.mirrors[1].rawStop).toHaveBeenCalledOnce();
    expect(mocks.mirrors[1].clear).toHaveBeenCalledOnce();
    expect(mocks.mirrors[0].schedulerActive).toBe(true);
    expect(mocks.sharedVisualOwner).toBe("sound('active')");
    expect(mocks.sharedCanvasOwner).toBe("sound('active')");
    expect(mocks.canvasCleanups).toBe(0);
    expect(releaseShared).not.toHaveBeenCalled();
  });

  it("parks a cancelled runtime before stale afterEval can touch the live view", async () => {
    const transport = useCodeStripStrudel();
    const releaseShared = vi.fn();
    const root = document.createElement("div");
    document.body.appendChild(root);
    const adapter = createAdapter("sound('old')", releaseShared, root);
    transport.attachEditor(adapter);
    const liveView = adapter.view!;
    adapter.replaceSource("sound('edited')");

    const firstPlay = transport.play();
    await vi.waitFor(() => expect(mocks.mirrors[0].rawEvaluate).toHaveBeenCalledOnce());
    await transport.stop();
    await firstPlay;

    const quarantineView = mocks.mirrors[0].editor;
    expect(quarantineView).not.toBe(liveView);
    expect(mocks.mirrors[0].drawer.stop).toHaveBeenCalledOnce();
    expect(mocks.mirrors[0].clear).toHaveBeenCalledOnce();
    adapter.replaceSource("sound('after stop')");
    expect(liveView.state.doc.toString()).toBe("sound('after stop')");
    expect(quarantineView.state.doc.toString()).toBe("sound('edited')");
    expect(transport.currentCode.value).toBe("sound('after stop')");

    mocks.mirrors[0].complete();
    await vi.waitFor(() => expect(mocks.mirrors[0].rawStop).toHaveBeenCalledTimes(2));

    expect(quarantineView.destroyed).toBe(true);
    expect(adapter.view).toBe(liveView);
    expect(liveView.state.doc.toString()).toBe("sound('after stop')");
    expect(liveView.state.field(mockWidgetField)).toBeNull();
    expect(mocks.audioOutputs).toEqual([]);
    expect(mocks.draws).toEqual([]);
    expect(mocks.canvasCleanups).toBe(1);
    expect(releaseShared).toHaveBeenCalledOnce();

    root.remove();
  });

  it("renews a cancelled runtime while preserving the live editor state", async () => {
    const transport = useCodeStripStrudel();
    const releaseShared = vi.fn(() => {
      mocks.sharedVisualOwner = null;
    });
    const root = document.createElement("div");
    document.body.appendChild(root);
    const adapter = createAdapter("sound('initial')", releaseShared, root);
    transport.attachEditor(adapter);
    adapter.routeCommands({ play: transport.play, stop: transport.stop });
    const liveView = adapter.view!;
    const preservedField = StateField.define({
      create: () => "preserved",
      update: (value) => value,
    });
    adapter.appendConfig(preservedField);
    adapter.replaceSource("sound('edited')");
    liveView.dispatch({ selection: { anchor: 5 } });
    liveView.scrollDOM.scrollLeft = 27;
    liveView.focus();

    const firstPlay = transport.play();
    await vi.waitFor(() => expect(mocks.mirrors[0].rawEvaluate).toHaveBeenCalledOnce());
    await transport.stop();
    await firstPlay;

    const replay = transport.play();
    await vi.waitFor(() => expect(mocks.mirrors).toHaveLength(2));
    await vi.waitFor(() => expect(mocks.mirrors[1].rawEvaluate).toHaveBeenCalledOnce());

    expect(adapter.view).toBe(liveView);
    expect(liveView.state.doc.toString()).toBe("sound('edited')");
    expect(liveView.state.selection.main.anchor).toBe(5);
    expect(liveView.scrollDOM.scrollLeft).toBe(27);
    expect(liveView.hasFocus).toBe(true);
    expect(liveView.state.field(preservedField)).toBe("preserved");
    expect(mocks.mirrors[0].editor).not.toBe(liveView);
    expect(mocks.mirrors[0].solo).toBe(false);
    expect(mocks.mirrors[0].evaluate).toBe(transport.play);
    expect(mocks.mirrors[0].stop).toBe(transport.stop);
    expect(mocks.mirrors[1].evaluate).toBe(transport.play);
    expect(mocks.mirrors[1].stop).toBe(transport.stop);

    expect(undo(liveView)).toBe(true);
    expect(liveView.state.doc.toString()).toBe("sound('initial')");
    expect(mocks.mirrors[1].code).toBe("sound('initial')");
    expect(mocks.mirrors[1].repl.setCode).toHaveBeenLastCalledWith("sound('initial')");
    adapter.replaceSource("sound('latest')");
    expect(mocks.mirrors[1].code).toBe("sound('latest')");
    expect(mocks.mirrors[1].repl.setCode).toHaveBeenLastCalledWith("sound('latest')");

    // This order is the inverse of the replacement regression above: the old
    // raw work completes while the renewed runtime is still evaluating.
    mocks.mirrors[0].complete();
    await vi.waitFor(() => expect(mocks.mirrors[0].schedulerActive).toBe(false));
    expect(mocks.mirrors[0].editor.destroyed).toBe(true);
    expect(mocks.mirrors[1].schedulerActive).toBe(false);
    expect(mocks.audioOutputs).toEqual([]);
    expect(mocks.draws).toEqual([]);

    mocks.mirrors[1].complete();
    await replay;
    expect(transport.isPlaying.value).toBe(true);
    expect(mocks.audioOutputs).toEqual(["sound('latest')"]);
    expect(mocks.draws).toEqual(["sound('initial')"]);
    expect(releaseShared).toHaveBeenCalledOnce();

    // Strudel's editor/global shortcuts call the mirror methods directly.
    // Renewal must keep those methods routed through the transport owner.
    await mocks.mirrors[0].stop();
    expect(transport.isPlaying.value).toBe(false);
    expect(mocks.mirrors[1].rawStop).toHaveBeenCalledOnce();
    const commandPlay = mocks.mirrors[0].evaluate();
    await vi.waitFor(() => expect(mocks.mirrors[1].rawEvaluate).toHaveBeenCalledTimes(2));
    mocks.mirrors[1].complete();
    await commandPlay;
    expect(transport.isPlaying.value).toBe(true);

    root.remove();
  });

  it("destroys the live and pending quarantine views exactly once", async () => {
    const transport = useCodeStripStrudel();
    const root = document.createElement("div");
    document.body.appendChild(root);
    const adapter = createAdapter("sound('pending')", vi.fn(), root);
    transport.attachEditor(adapter);
    adapter.routeCommands({ play: transport.play, stop: transport.stop });
    const liveView = adapter.view!;
    const destroyLive = vi.spyOn(liveView, "destroy");

    const firstPlay = transport.play();
    await vi.waitFor(() => expect(mocks.mirrors[0].rawEvaluate).toHaveBeenCalledOnce());
    await transport.stop();
    await firstPlay;
    const firstQuarantine = mocks.mirrors[0].editor;
    const destroyFirstQuarantine = vi.spyOn(firstQuarantine, "destroy");

    const secondPlay = transport.play();
    await vi.waitFor(() => expect(mocks.mirrors[1].rawEvaluate).toHaveBeenCalledOnce());
    await transport.stop();
    await secondPlay;
    const secondQuarantine = mocks.mirrors[1].editor;
    const destroySecondQuarantine = vi.spyOn(secondQuarantine, "destroy");

    expect(firstQuarantine.destroyed).toBe(false);
    expect(secondQuarantine.destroyed).toBe(false);
    await transport.detachEditor(adapter);

    expect(destroyLive).toHaveBeenCalledOnce();
    expect(destroyFirstQuarantine).toHaveBeenCalledOnce();
    expect(destroySecondQuarantine).toHaveBeenCalledOnce();
    expect(mocks.mirrors[0].clear).toHaveBeenCalled();
    expect(mocks.mirrors[1].clear).toHaveBeenCalled();
    expect(adapter.view).toBeUndefined();

    root.remove();
  });
});
