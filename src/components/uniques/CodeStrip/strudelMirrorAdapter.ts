import { StateEffect, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { StrudelMirror } from "@strudel/codemirror";
import { markRaw } from "vue";
import type {
  CodeStripEditorAdapter,
  CodeStripEditorListener,
  CodeStripEvaluationResult,
  CodeStripStrudelMirrorRuntime,
  CodeStripStrudelRuntimeOwnership,
  CodeStripStopRequest,
  CodeStripTransportCommands,
  CodeStripTransportOperation,
  StrudelMirrorAdapterOptions,
} from "@/types/codeStripTransport";

export class StrudelMirrorCodeStripAdapter implements CodeStripEditorAdapter {
  private readonly listeners = new Set<CodeStripEditorListener>();
  private readonly options: StrudelMirrorAdapterOptions;
  private readonly onRelease: () => void;
  private mirrorInstance!: StrudelMirror;
  private liveView: EditorView | null = null;
  private evaluationOperation: CodeStripTransportOperation | null = null;
  private stopOperation: CodeStripTransportOperation | null = null;
  private cancelEvaluation: (() => void) | null = null;
  private runtimeGeneration = 0;
  private activeRuntime = 0;
  private readonly runtimeOwnership = new Map<
    number,
    CodeStripStrudelRuntimeOwnership
  >();
  private readonly destroyedViews = new WeakSet<EditorView>();
  private renewBeforeEvaluation = false;
  private destroyed = false;
  private commands: CodeStripTransportCommands | null = null;

  constructor(options: StrudelMirrorAdapterOptions) {
    this.options = options;
    this.onRelease = options.onRelease;
    this.createRuntime(options.root, options.initialSource);
    this.liveView = this.runtimeView(this.mirror) ?? null;
    this.installSourceSynchronization();
  }

  get mirror() {
    return this.mirrorInstance;
  }

  get view(): EditorView | undefined {
    return this.liveView ?? undefined;
  }

  getSource() {
    return this.view?.state.doc.toString() ?? this.mirror.getCode?.() ?? "";
  }

  replaceSource(source: string) {
    const view = this.liveView;
    if (!view || view.state.doc.toString() === source) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: source },
    });
  }

  async evaluate(
    source: string,
    operation: CodeStripTransportOperation,
  ): Promise<CodeStripEvaluationResult> {
    if (this.destroyed) throw new Error("CodeStrip editor adapter is destroyed");
    if (this.renewBeforeEvaluation) this.renewRuntime(source);

    const ownership = this.activeOwnership();
    const runtime = ownership.generation;
    const { rawEvaluate, rawStop } = ownership;
    ownership.settled = false;
    this.evaluationOperation = operation;
    // StrudelMirror maintains a runtime cache separately from EditorView. The
    // transport chooses the visible source; the adapter reconciles that source
    // into the current third-party runtime immediately before evaluation.
    if ((this.mirror as StrudelMirror & { code?: string }).code !== source) {
      (this.mirror as StrudelMirror & { code?: string }).code = source;
    }

    let cancelEvaluation!: () => void;
    const cancellation = new Promise<"cancelled">((resolve) => {
      cancelEvaluation = () => resolve("cancelled");
    });
    this.cancelEvaluation = cancelEvaluation;
    let rawWork: Promise<void>;
    try {
      rawWork = rawEvaluate();
    } catch (error) {
      rawWork = Promise.reject(error);
    }
    const settleRawWork = async () => {
      ownership.settled = true;
      if (ownership.revoked) await rawStop().catch(() => undefined);
      this.disposeQuarantine(ownership);
      this.releaseRetiredRuntime(ownership);
    };
    const lateCleanup = rawWork.then(settleRawWork, settleRawWork);

    try {
      const outcome = await Promise.race([
        rawWork.then(() => "completed" as const),
        cancellation,
      ]);
      if (outcome === "cancelled") void lateCleanup;
      return ownership.revoked ? "cancelled" : outcome;
    } finally {
      if (this.cancelEvaluation === cancelEvaluation) this.cancelEvaluation = null;
      if (this.evaluationOperation === operation) this.evaluationOperation = null;
    }
  }

  async stop(request: CodeStripStopRequest) {
    const ownership = this.activeOwnership();
    const { rawStop } = ownership;
    this.stopOperation = request.operation;
    const shouldCancel = request.cancelEvaluation && this.cancelEvaluation !== null;
    const shouldRevoke = request.retire || shouldCancel;
    if (shouldRevoke) this.invalidateRuntime(ownership);

    let stopWork: Promise<void>;
    try {
      // Installed Strudel stops its scheduler synchronously. Let this one safe,
      // pre-handoff callback perform the intended visual cleanup, then sever
      // the callback before a late evaluation can restart the old scheduler.
      stopWork = rawStop();
    } catch (error) {
      stopWork = Promise.reject(error);
    } finally {
      if (shouldRevoke) {
        this.containRuntime(ownership, !request.retire && shouldCancel);
      }
    }
    try {
      await stopWork;
    } finally {
      if (request.releaseShared) this.onRelease();
      if (this.stopOperation === request.operation) this.stopOperation = null;
    }
  }

  subscribe(listener: CodeStripEditorListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  routeCommands(commands: CodeStripTransportCommands) {
    this.commands = commands;
    this.mirror.evaluate = commands.play;
    this.mirror.stop = commands.stop;
  }

  appendConfig(extension: Extension) {
    this.view?.dispatch({
      effects: StateEffect.appendConfig.of(extension),
    });
  }

  updateSettings(settings: Record<string, unknown>) {
    this.mirror.updateSettings(settings);
  }

  async disposeUnattached() {
    if (this.destroyed) return;
    const ownership = this.activeOwnership();
    this.revokeRuntime(false);
    try {
      await ownership.rawStop();
    } finally {
      this.destroy();
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.revokeRuntime(false);
    this.destroyed = true;
    this.listeners.clear();
    for (const ownership of this.runtimeOwnership.values()) {
      this.clearRuntime(ownership);
      this.disposeQuarantine(ownership);
    }
    if (this.liveView) this.destroyView(this.liveView);
    this.liveView = null;
    this.runtimeOwnership.clear();
  }

  private createRuntime(root: HTMLElement, initialSource: string) {
    this.runtimeGeneration += 1;
    const runtime = this.runtimeGeneration;
    this.activeRuntime = runtime;
    const options = this.options;
    const instance = markRaw(new StrudelMirror({
      root,
      initialCode: initialSource,
      bgFill: false,
      transpiler: options.transpiler,
      defaultOutput: (...args: unknown[]) => {
        if (!this.ownsRuntime(runtime)) return undefined;
        return (options.defaultOutput as (...values: unknown[]) => unknown)(...args);
      },
      getTime: options.getTime,
      solo: true,
      prebake: options.prebake,
      onDraw: () => {
        if (this.ownsRuntime(runtime)) options.onDraw();
      },
      onToggle: (started: boolean) => {
        if (!this.ownsRuntime(runtime)) return;
        this.emit({
          type: "playing",
          isPlaying: started,
          operation: started ? this.evaluationOperation : this.stopOperation,
        });
      },
      onEvalError: (error: unknown) => {
        if (!this.ownsRuntime(runtime)) return;
        this.emit({
          type: "error",
          error,
          operation: this.evaluationOperation,
        });
      },
    }));

    this.mirrorInstance = instance;
    const rawEvaluate = instance.evaluate.bind(instance);
    const rawStop = instance.stop.bind(instance);
    this.runtimeOwnership.set(runtime, {
      generation: runtime,
      mirror: instance as CodeStripStrudelMirrorRuntime,
      rawEvaluate,
      rawStop: async () => {
        await rawStop();
      },
      revoked: false,
      settled: false,
      cleared: false,
      quarantineView: null,
    });
  }

  private installSourceSynchronization() {
    this.view?.dispatch({
      effects: StateEffect.appendConfig.of(
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || this.destroyed) return;
          const source = update.state.doc.toString();
          const currentMirror = this.mirror as StrudelMirror & {
            code?: string;
            repl?: { setCode?: (code: string) => void };
          };
          currentMirror.code = source;
          currentMirror.repl?.setCode?.(source);
          this.emit({ type: "source", source });
        }),
      ),
    });
  }

  private renewRuntime(source: string) {
    const oldOwnership = this.activeOwnership();
    const oldMirror = oldOwnership.mirror;
    const liveView = this.liveView;
    if (!oldOwnership.settled) this.parkRuntime(oldOwnership);
    const quarantineRoot = document.createElement("div");

    this.createRuntime(quarantineRoot, source);
    const newMirror = this.mirror;
    const replacementView = this.runtimeView(newMirror);
    if (liveView) {
      (newMirror as CodeStripStrudelMirrorRuntime).editor = liveView;
      (newMirror as CodeStripStrudelMirrorRuntime).root = this.options.root;
    }
    if (replacementView && replacementView !== liveView) this.destroyView(replacementView);
    this.clearRuntime(oldOwnership);
    if (oldOwnership.settled) this.releaseRetiredRuntime(oldOwnership);
    this.renewBeforeEvaluation = false;
    if (this.commands) {
      newMirror.evaluate = this.commands.play;
      newMirror.stop = this.commands.stop;
    }
    this.options.onRuntimeRenewed?.();
  }

  private revokeRuntime(renew: boolean) {
    const ownership = this.activeOwnership();
    this.invalidateRuntime(ownership);
    this.containRuntime(ownership, renew);
  }

  private invalidateRuntime(ownership: CodeStripStrudelRuntimeOwnership) {
    ownership.revoked = true;
    ownership.mirror.solo = false;
  }

  private containRuntime(
    ownership: CodeStripStrudelRuntimeOwnership,
    renew: boolean,
  ) {
    const { mirror } = ownership;
    // StrudelMirror's outer onToggle performs global cleanupDraw even when the
    // adapter ignores the callback. Cyclist/NeoCyclist read this property at
    // call time, so revoke it after the intended stop but before a late start.
    const scheduler = mirror.repl?.scheduler;
    if (scheduler) scheduler.onToggle = () => undefined;
    mirror.drawer?.stop?.();
    if (this.cancelEvaluation) this.parkRuntime(ownership);
    this.clearRuntime(ownership);
    this.cancelEvaluation?.();
    this.renewBeforeEvaluation = renew && !this.destroyed;
  }

  private ownsRuntime(runtime: number) {
    const ownership = this.runtimeOwnership.get(runtime);
    return !this.destroyed
      && this.activeRuntime === runtime
      && Boolean(ownership)
      && !ownership?.revoked;
  }

  private disposeQuarantine(ownership: CodeStripStrudelRuntimeOwnership) {
    const view = ownership.quarantineView;
    if (!view) return;
    ownership.quarantineView = null;
    this.destroyView(view);
  }

  private parkRuntime(ownership: CodeStripStrudelRuntimeOwnership) {
    if (ownership.quarantineView || !this.liveView) return;
    const quarantineRoot = document.createElement("div");
    const quarantineView = new EditorView({
      state: this.liveView.state,
      parent: quarantineRoot,
    });
    ownership.mirror.editor = quarantineView;
    ownership.mirror.root = quarantineRoot;
    ownership.quarantineView = quarantineView;
  }

  private releaseRetiredRuntime(ownership: CodeStripStrudelRuntimeOwnership) {
    if (ownership.generation === this.activeRuntime && !this.destroyed) return;
    this.clearRuntime(ownership);
    this.runtimeOwnership.delete(ownership.generation);
  }

  private runtimeView(mirror: StrudelMirror) {
    const runtimeMirror = mirror as StrudelMirror & {
      editor?: EditorView;
      view?: EditorView;
    };
    return runtimeMirror.editor ?? runtimeMirror.view;
  }

  private activeOwnership() {
    const ownership = this.runtimeOwnership.get(this.activeRuntime);
    if (!ownership) throw new Error("CodeStrip Strudel runtime is unavailable");
    return ownership;
  }

  private clearRuntime(ownership: CodeStripStrudelRuntimeOwnership) {
    if (ownership.cleared) return;
    ownership.cleared = true;
    ownership.mirror.clear();
  }

  private destroyView(view: EditorView) {
    if (this.destroyedViews.has(view)) return;
    this.destroyedViews.add(view);
    view.destroy();
  }

  private emit(event: Parameters<CodeStripEditorListener>[0]) {
    for (const listener of [...this.listeners]) listener(event);
  }
}
