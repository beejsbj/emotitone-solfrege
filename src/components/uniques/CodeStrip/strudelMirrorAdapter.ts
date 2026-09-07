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

export class StrudelMirrorCodeStripAdapter implements CodeStripEditorAdapter {
  private readonly listeners = new Set<CodeStripEditorListener>();
  private readonly options: StrudelMirrorAdapterOptions;
  private readonly onRelease: () => void;
  private mirrorInstance!: StrudelMirror;
  private rawEvaluate!: () => Promise<void>;
  private rawStop!: () => Promise<void>;
  private evaluationOperation: CodeStripTransportOperation | null = null;
  private stopOperation: CodeStripTransportOperation | null = null;
  private cancelEvaluation: (() => void) | null = null;
  private runtimeGeneration = 0;
  private activeRuntime = 0;
  private readonly revokedRuntimes = new Set<number>();
  private readonly settledRuntimes = new Set<number>();
  private readonly quarantineViews = new Map<number, EditorView>();
  private renewBeforeEvaluation = false;
  private destroyed = false;
  private commands: CodeStripTransportCommands | null = null;

  constructor(options: StrudelMirrorAdapterOptions) {
    this.options = options;
    this.onRelease = options.onRelease;
    this.createRuntime(options.root, options.initialSource);
    this.installSourceSynchronization();
  }

  get mirror() {
    return this.mirrorInstance;
  }

  get view(): EditorView | undefined {
    return (this.mirror.editor ?? this.mirror.view) as EditorView | undefined;
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
      },
      () => {
        this.settledRuntimes.add(runtime);
        this.disposeQuarantine(runtime);
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
    else if (request.cancelEvaluation) this.revokeRuntime(true);
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
    this.revokeRuntime(false);
    try {
      await this.rawStop();
    } finally {
      this.destroy();
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.revokeRuntime(false);
    this.destroyed = true;
    this.listeners.clear();
    this.mirror.clear();
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
    const liveView = this.view;
    const quarantineRoot = document.createElement("div");

    this.createRuntime(quarantineRoot, source);
    const newMirror = this.mirror;
    const quarantineView = this.view;
    if (liveView && quarantineView) {
      oldMirror.editor = quarantineView;
      (oldMirror as StrudelMirror & { root: HTMLElement }).root = quarantineRoot;
      newMirror.editor = liveView;
      (newMirror as StrudelMirror & { root: HTMLElement }).root = this.options.root;
      this.quarantineViews.set(oldRuntime, quarantineView);
      if (this.settledRuntimes.has(oldRuntime)) this.disposeQuarantine(oldRuntime);
    }
    oldMirror.clear();
    this.renewBeforeEvaluation = false;
    if (this.commands) {
      newMirror.evaluate = this.commands.play;
      newMirror.stop = this.commands.stop;
    }
    this.options.onRuntimeRenewed?.();
  }

  private revokeRuntime(renew: boolean) {
    const runtime = this.activeRuntime;
    this.revokedRuntimes.add(runtime);
    (this.mirror as StrudelMirror & { solo: boolean }).solo = false;
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
    view.destroy();
  }

  private emit(event: Parameters<CodeStripEditorListener>[0]) {
    for (const listener of [...this.listeners]) listener(event);
  }
}
