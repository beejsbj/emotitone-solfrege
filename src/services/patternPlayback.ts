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

import type { LooperPlaybackPort, LooperScheduler } from "@/types/looperTransport";
import type { Pattern } from "@strudel/core";

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
    setPattern?: (pattern: Pattern, autostart: boolean) => Promise<unknown>;
  };
}

export interface PatternEditorOptions {
  root: HTMLElement;
  initialCode: string;
  onDraw: (haps: unknown[], time: number) => void;
  onToggle: (started: boolean) => void;
  onEvalError: (error: unknown) => void;
  /** Submitted onsets for transport diagnostics/recorder identity; audio stays real. */
  onOutput?: (hap: unknown, deadline: number, duration: number, cps: number, audioTime: number) => void;
}

let activeEditor: PatternEditor | undefined;
let scopeReady: Promise<void> | undefined;
const looperPorts = new WeakMap<PatternEditor, LooperPlaybackPort>();

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
  const frames = new Set<(rawPosition: number) => void>();
  let claimed = false;
  const stops = new Set<() => void>();
  const instance = new StrudelMirror({
    ...options,
    onDraw: (haps: unknown[], time: number, ...rest: unknown[]) => {
      (options.onDraw as (...args: unknown[]) => void)(haps, time, ...rest);
      for (const frame of frames) frame(time);
    },
    onToggle: (started: boolean) => {
      options.onToggle(started);
      if (!started) for (const stopped of stops) stopped();
    },
    bgFill: false,
    solo: true,
    transpiler,
    defaultOutput: options.onOutput
      ? (hap: unknown, deadline: number, duration: number, cps: number, audioTime: number) => {
          const output = emotitoneStrudelOutput(hap, deadline, duration, cps, audioTime);
          options.onOutput!(hap, deadline, duration, cps, audioTime);
          return output;
        }
      : emotitoneStrudelOutput,
    getTime: () => getAudioContext().currentTime,
    prebake: async () => {
      await Promise.all([initSuperdoughAudio(), prepareScope()]);
    },
    beforeStart: async () => {
      const context = getAudioContext();
      if (context.state === "suspended") await context.resume();
    },
  }) as PatternEditor;
  const evaluate = instance.evaluate.bind(instance);
  instance.evaluate = () => {
    if (claimed) return Promise.reject(new Error("The Looper owns pattern playback"));
    return evaluate();
  };
  const mirror = instance as PatternEditor & {
    prebaked: Promise<void>;
    drawer: { invalidate(scheduler: LooperScheduler): void };
    repl: { scheduler: LooperScheduler; setPattern(pattern: Pattern, autostart: boolean): Promise<unknown> };
  };
  looperPorts.set(instance, {
    scheduler: mirror.repl.scheduler,
    ready: () => mirror.prebaked,
    setPattern: (pattern, autostart) => mirror.repl.setPattern(pattern, autostart),
    invalidate: () => mirror.drawer.invalidate(mirror.repl.scheduler),
    stop: () => { const stopped = instance.stop(); stopStrudelVisuals(); return stopped; },
    onFrame: listener => { frames.add(listener); return () => { frames.delete(listener); }; },
    onStop: listener => { stops.add(listener); return () => { stops.delete(listener); }; },
    claim: () => {
      if (activeEditor !== instance) throw new Error("Pattern editor was disposed");
      if (claimed) throw new Error("Pattern playback is already claimed");
      claimed = true;
      return () => { claimed = false; };
    },
  });
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

/** Slice 4 attaches the Looper to this editor instead of creating a transport. */
export function getLooperPlaybackPort(instance: PatternEditor): LooperPlaybackPort {
  const port = looperPorts.get(instance);
  if (!port || activeEditor !== instance) throw new Error("No active pattern editor");
  return port;
}
