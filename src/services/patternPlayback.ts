import { StrudelMirror } from "@strudel/codemirror";
import * as StrudelCore from "@strudel/core";
import * as StrudelMini from "@strudel/mini";
import * as StrudelTonal from "@strudel/tonal";
import * as StrudelWebAudio from "@strudel/webaudio";
import { transpiler } from "@strudel/transpiler";
import {
  emotitoneStrudelOutput,
  getAudioContext,
  initSuperdoughAudio,
  stopStrudelVisuals,
} from "@/services/superdoughAudio";

export interface PatternEditor {
  setCode: (code: string) => void;
  evaluate: () => Promise<void | boolean>;
  stop: () => Promise<void> | void;
  clear?: () => void;
  updateSettings?: (settings: Record<string, unknown>) => void;
  code?: string;
  editor?: unknown;
  view?: unknown;
  repl?: {
    scheduler?: { cps?: number; setCps?: (cps: number) => void };
  };
}

interface PatternEditorOptions {
  root: HTMLElement;
  initialCode: string;
  onDraw: (haps: unknown[], time: number) => void;
  onToggle: (started: boolean) => void;
  onEvalError: (error: unknown) => void;
}

let activeEditor: PatternEditor | undefined;
let scopeReady: Promise<void> | undefined;

function prepareScope(): Promise<void> {
  scopeReady ??= StrudelCore.evalScope(
    Promise.resolve(StrudelCore),
    Promise.resolve(StrudelMini),
    Promise.resolve(StrudelTonal),
    Promise.resolve(StrudelWebAudio),
  ).catch((error) => {
    scopeReady = undefined;
    throw error;
  });
  return scopeReady;
}

/**
 * StrudelMirror includes a REPL and scheduler. Own that one transport instead
 * of starting an additional @strudel/web runtime behind the editor. CodeStrip
 * supplies presentation/evaluation guards and exposes it through the shared
 * useCodeStripStrudel controller; keyboard shortcuts use this same instance.
 */
export function createPatternEditor(options: PatternEditorOptions): PatternEditor {
  if (activeEditor) throw new Error("The pattern transport already has an editor");
  const instance = new StrudelMirror({
    ...options,
    bgFill: false,
    solo: true,
    transpiler,
    defaultOutput: emotitoneStrudelOutput,
    getTime: () => getAudioContext().currentTime,
    prebake: async () => {
      await Promise.all([initSuperdoughAudio(), prepareScope()]);
    },
    beforeStart: async () => {
      const context = getAudioContext();
      if (context.state === "suspended") await context.resume();
    },
  }) as PatternEditor;
  activeEditor = instance;
  return instance;
}

/** Clear transport listeners and the editor view, allowing a clean remount. */
export function disposePatternEditor(instance: PatternEditor): Promise<void> {
  if (activeEditor !== instance) return Promise.resolve();
  activeEditor = undefined;
  let stopped: Promise<void> | void;
  try {
    stopped = instance.stop();
  } finally {
    stopStrudelVisuals();
    instance.clear?.();
    const view = (instance.editor ?? instance.view) as { destroy?: () => void } | undefined;
    view?.destroy?.();
  }
  return Promise.resolve(stopped);
}

export function getPatternPlaybackDiagnostics() {
  return { activeTransports: activeEditor ? 1 : 0 };
}
