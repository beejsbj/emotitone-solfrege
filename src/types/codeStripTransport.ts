import type { EditorView } from "@codemirror/view";
import type { StrudelMirror } from "@strudel/codemirror";

export type CodeStripTransportOperation = number;
export type CodeStripEvaluationResult = "completed" | "cancelled";

export type CodeStripEditorEvent =
  | { type: "source"; source: string }
  | {
      type: "playing";
      isPlaying: boolean;
      operation: CodeStripTransportOperation | null;
    }
  | {
      type: "error";
      error: unknown;
      operation: CodeStripTransportOperation | null;
    };

export type CodeStripEditorListener = (event: CodeStripEditorEvent) => void;

export interface CodeStripStopRequest {
  operation: CodeStripTransportOperation;
  releaseShared: boolean;
  /** Settle the current evaluate call and contain any eventual raw completion. */
  cancelEvaluation: boolean;
  /** Revoke any in-flight evaluation's ability to claim playback before returning. */
  retire: boolean;
}

export interface CodeStripEditorAdapter {
  getSource: () => string;
  replaceSource: (source: string) => void;
  evaluate: (
    source: string,
    operation: CodeStripTransportOperation,
  ) => Promise<CodeStripEvaluationResult>;
  stop: (request: CodeStripStopRequest) => Promise<void> | void;
  subscribe: (listener: CodeStripEditorListener) => () => void;
  destroy: () => Promise<void> | void;
}

export interface CodeStripEditorConnection {
  replaceSource: (source: string) => void;
  detach: () => Promise<void>;
}

export interface CodeStripTransportCommands {
  play: () => Promise<void>;
  stop: () => Promise<void>;
}

export interface CodeStripTransportOperationOwner {
  command: number;
  kind: "start" | "stop";
  settlesState: boolean;
  selectionEpoch?: number;
}

export interface CodeStripTransportAttachment {
  adapter: CodeStripEditorAdapter;
  unsubscribe: () => void;
  work: Promise<void>;
  sharedWork: Promise<void>;
  pendingStarts: number;
  operations: Map<CodeStripTransportOperation, CodeStripTransportOperationOwner>;
  failedOperations: Set<CodeStripTransportOperation>;
  retired: boolean;
}

export interface StrudelMirrorAdapterOptions {
  root: HTMLElement;
  initialSource: string;
  transpiler: unknown;
  defaultOutput: unknown;
  getTime: () => number;
  prebake: () => Promise<void>;
  onDraw: () => void;
  onRelease: () => void;
  onRuntimeRenewed?: () => void;
}

export type CodeStripStrudelMirrorRuntime = StrudelMirror & {
  editor: EditorView;
  root: HTMLElement;
  solo: boolean;
  drawer?: { stop?: () => void };
  repl?: {
    scheduler?: { onToggle?: (started: boolean) => void };
    setCode?: (code: string) => void;
  };
};

export interface CodeStripStrudelRuntimeOwnership {
  generation: number;
  mirror: CodeStripStrudelMirrorRuntime;
  rawEvaluate: () => Promise<void>;
  rawStop: () => Promise<void>;
  revoked: boolean;
  settled: boolean;
  cleared: boolean;
  quarantineView: EditorView | null;
}
