import { StateEffect, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { StrudelMirror } from "@strudel/codemirror";
import { markRaw } from "vue";
import type {
  CodeStripEditorAdapter,
  CodeStripEditorListener,
  CodeStripEvaluationResult,
  CodeStripStopRequest,
  CodeStripTransportCommands,
  CodeStripTransportOperation,
  StrudelMirrorAdapterOptions,
} from "@/types/codeStripTransport";

type OwnedStrudelMirror = StrudelMirror & {
  editor: EditorView;
  root: HTMLElement;
  solo: boolean;
  drawer?: { stop?: () => void };
  repl?: {
    scheduler?: { onToggle?: (started: boolean) => void };
    setCode?: (code: string) => void;
  };
};

export class StrudelMirrorCodeStripAdapter implements CodeStripEditorAdapter {
  private readonly listeners = new Set<CodeStripEditorListener>();
  private readonly options: StrudelMirrorAdapterOptions;
  private readonly onRelease: () => void;
  private mirrorInstance!: StrudelMirror;
  private liveView: EditorView | null = null;
  private rawEvaluate!: () => Promise<void>;
  private rawStop!: () => Promise<void>;
  private evaluationOperation: CodeStripTransportOperation | null = null;
  private stopOperation: CodeStripTransportOperation | null = null;
  private cancelEvaluation: (() => void) | null = null;
  private runtimeGeneration = 0;
  private activeRuntime = 0;
  private readonly revokedRuntimes = new Set<number>();
  private readonly settledRuntimes = new Set<number>();
  private readonly clearedRuntimes = new Set<number>();
  private readonly runtimeMirrors = new Map<number, StrudelMirror>();
  private readonly quarantineViews = new Map<number, EditorView>();
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
    if (this.getSource() !== source) this.mirror.setCode(source);
  }

  async evaluate(
    source: string,
    operation: CodeStripTransportOperation,
  ): Promise<CodeStripEvaluationResult> {
    if (this.destroyed) throw new Error("CodeStrip editor adapter is destroyed");
    if (this.renewBeforeEvaluation) this.renewRuntime(source);

    const runtime = this.activeRuntime;
    const rawEvaluate = this.rawEvaluate;
    const rawStop = this.rawStop;
    this.settledRuntimes.delete(runtime);
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
    const lateCleanup = rawWork.then(
      async () => {
        this.settledRuntimes.add(runtime);
        if (this.revokedRuntimes.has(runtime)) {
          await rawStop().catch(() => undefined);
        }
        this.disposeQuarantine(runtime);
        this.releaseRetiredRuntime(runtime);
      },
      () => {
        this.settledRuntimes.add(runtime);
        this.disposeQuarantine(runtime);
        this.releaseRetiredRuntime(runtime);
      },
    );

    try {
      const outcome = await Promise.race([
        rawWork.then(() => "completed" as const),
        cancellation,
      ]);
      if (outcome === "cancelled") void lateCleanup;
      return this.revokedRuntimes.has(runtime) ? "cancelled" : outcome;
    } finally {
      if (this.cancelEvaluation === cancelEvaluation) this.cancelEvaluation = null;
      if (this.evaluationOperation === operation) this.evaluationOperation = null;
    }
  }

  async stop(request: CodeStripStopRequest) {
    const rawStop = this.rawStop;
    this.stopOperation = request.operation;
    if (request.retire) this.revokeRuntime(false);
    else if (request.cancelEvaluation && this.cancelEvaluation) {
      this.revokeRuntime(true);
    }
    try {
      await rawStop();
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
    this.revokeRuntime(false, true);
    try {
      await this.rawStop();
    } finally {
      this.destroy();
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.revokeRuntime(false, true);
    this.destroyed = true;
    this.listeners.clear();
    for (const [runtime, mirror] of this.runtimeMirrors) {
      this.clearRuntime(runtime, mirror);
    }
    for (const view of this.quarantineViews.values()) this.destroyView(view);
    if (this.liveView) this.destroyView(this.liveView);
    this.liveView = null;
    this.quarantineViews.clear();
    this.runtimeMirrors.clear();
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
    this.runtimeMirrors.set(runtime, instance);
    this.rawEvaluate = instance.evaluate.bind(instance);
    const rawStop = instance.stop.bind(instance);
    this.rawStop = async () => {
      await rawStop();
    };
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
    const oldRuntime = this.activeRuntime;
    const oldMirror = this.mirror;
    const liveView = this.liveView;
    if (!this.settledRuntimes.has(oldRuntime)) {
      this.parkRuntime(oldRuntime, oldMirror);
    }
    const quarantineRoot = document.createElement("div");

    this.createRuntime(quarantineRoot, source);
    const newMirror = this.mirror;
    const replacementView = this.runtimeView(newMirror);
    if (liveView) {
      (newMirror as OwnedStrudelMirror).editor = liveView;
      (newMirror as OwnedStrudelMirror).root = this.options.root;
    }
    if (replacementView && replacementView !== liveView) this.destroyView(replacementView);
    this.clearRuntime(oldRuntime, oldMirror);
    if (this.settledRuntimes.has(oldRuntime)) this.releaseRetiredRuntime(oldRuntime);
    this.renewBeforeEvaluation = false;
    if (this.commands) {
      newMirror.evaluate = this.commands.play;
      newMirror.stop = this.commands.stop;
    }
    this.options.onRuntimeRenewed?.();
  }

  private revokeRuntime(renew: boolean, localOnly = false) {
    const runtime = this.activeRuntime;
    const mirror = this.runtimeMirrors.get(runtime) ?? this.mirror;
    this.revokedRuntimes.add(runtime);
    const ownedMirror = mirror as OwnedStrudelMirror;
    ownedMirror.solo = false;
    if (this.cancelEvaluation || localOnly) {
      // StrudelMirror's outer onToggle performs global cleanupDraw even when
      // the adapter ignores the callback. Cyclist/NeoCyclist read this property
      // at call time, so revoke it before either stop or a late start.
      const scheduler = ownedMirror.repl?.scheduler;
      if (scheduler) scheduler.onToggle = () => undefined;
      ownedMirror.drawer?.stop?.();
      if (this.cancelEvaluation) this.parkRuntime(runtime, mirror);
    }
    this.clearRuntime(runtime, mirror);
    this.cancelEvaluation?.();
    this.renewBeforeEvaluation = renew && !this.destroyed;
  }

  private ownsRuntime(runtime: number) {
    return !this.destroyed
      && this.activeRuntime === runtime
      && !this.revokedRuntimes.has(runtime);
  }

  private disposeQuarantine(runtime: number) {
    const view = this.quarantineViews.get(runtime);
    if (!view) return;
    this.quarantineViews.delete(runtime);
    this.destroyView(view);
  }

  private parkRuntime(runtime: number, mirror: StrudelMirror) {
    if (this.quarantineViews.has(runtime) || !this.liveView) return;
    const quarantineRoot = document.createElement("div");
    const quarantineView = new EditorView({
      state: this.liveView.state,
      parent: quarantineRoot,
    });
    (mirror as OwnedStrudelMirror).editor = quarantineView;
    (mirror as OwnedStrudelMirror).root = quarantineRoot;
    this.quarantineViews.set(runtime, quarantineView);
  }

  private releaseRetiredRuntime(runtime: number) {
    if (runtime === this.activeRuntime) return;
    const mirror = this.runtimeMirrors.get(runtime);
    if (mirror) this.clearRuntime(runtime, mirror);
    this.runtimeMirrors.delete(runtime);
    this.revokedRuntimes.delete(runtime);
    this.settledRuntimes.delete(runtime);
  }

  private runtimeView(mirror: StrudelMirror) {
    const runtimeMirror = mirror as StrudelMirror & {
      editor?: EditorView;
      view?: EditorView;
    };
    return runtimeMirror.editor ?? runtimeMirror.view;
  }

  private clearRuntime(runtime: number, mirror: StrudelMirror) {
    if (this.clearedRuntimes.has(runtime)) return;
    this.clearedRuntimes.add(runtime);
    mirror.clear();
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
