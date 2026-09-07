import { StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { StrudelMirror } from "@strudel/codemirror";
import { markRaw } from "vue";
import type {
  CodeStripEditorAdapter,
  CodeStripEditorListener,
  CodeStripStopRequest,
  CodeStripTransportCommands,
  CodeStripTransportOperation,
  StrudelMirrorAdapterOptions,
} from "@/types/codeStripTransport";

export class StrudelMirrorCodeStripAdapter implements CodeStripEditorAdapter {
  private readonly listeners = new Set<CodeStripEditorListener>();
  private readonly rawEvaluate: () => Promise<void>;
  private readonly rawStop: () => Promise<void>;
  private evaluationOperation: CodeStripTransportOperation | null = null;
  private stopOperation: CodeStripTransportOperation | null = null;
  private destroyed = false;
  private readonly onRelease: () => void;

  readonly mirror: StrudelMirror;

  constructor(options: StrudelMirrorAdapterOptions) {
    this.onRelease = options.onRelease;
    const instance = markRaw(new StrudelMirror({
      root: options.root,
      initialCode: options.initialSource,
      bgFill: false,
      transpiler: options.transpiler,
      defaultOutput: options.defaultOutput,
      getTime: options.getTime,
      solo: true,
      prebake: options.prebake,
      onDraw: options.onDraw,
      onToggle: (started: boolean) => {
        this.emit({
          type: "playing",
          isPlaying: started,
          operation: started ? this.evaluationOperation : this.stopOperation,
        });
      },
      onEvalError: (error: unknown) => {
        this.emit({
          type: "error",
          error,
          operation: this.evaluationOperation,
        });
      },
    }));

    this.mirror = instance;
    this.rawEvaluate = instance.evaluate.bind(instance);
    const rawStop = instance.stop.bind(instance);
    this.rawStop = async () => {
      await rawStop();
    };

    this.view?.dispatch({
      effects: StateEffect.appendConfig.of(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.emit({ type: "source", source: update.state.doc.toString() });
          }
        }),
      ),
    });
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

  async evaluate(source: string, operation: CodeStripTransportOperation) {
    this.evaluationOperation = operation;
    // StrudelMirror maintains a runtime cache separately from EditorView. The
    // transport chooses the visible source; the adapter reconciles that source
    // into the third-party runtime immediately before evaluation.
    if ((this.mirror as StrudelMirror & { code?: string }).code !== source) {
      (this.mirror as StrudelMirror & { code?: string }).code = source;
    }

    try {
      await this.rawEvaluate();
    } finally {
      if (this.evaluationOperation === operation) this.evaluationOperation = null;
    }
  }

  async stop(request: CodeStripStopRequest) {
    this.stopOperation = request.operation;
    try {
      await this.rawStop();
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
    this.mirror.evaluate = commands.play;
    this.mirror.stop = commands.stop;
  }

  updateSettings(settings: Record<string, unknown>) {
    this.mirror.updateSettings(settings);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.listeners.clear();
    this.mirror.clear();
  }

  private emit(event: Parameters<CodeStripEditorListener>[0]) {
    for (const listener of [...this.listeners]) listener(event);
  }
}
