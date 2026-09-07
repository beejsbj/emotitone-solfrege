export type CodeStripTransportOperation = number;

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

export interface CodeStripEditorAdapter {
  getSource: () => string;
  replaceSource: (source: string) => void;
  evaluate: (
    source: string,
    operation: CodeStripTransportOperation,
  ) => Promise<void>;
  stop: (operation: CodeStripTransportOperation) => Promise<void> | void;
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
}
