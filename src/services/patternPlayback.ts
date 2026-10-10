import { resumeAudioContext, holdAudioActivity } from "@/services/audioLifecycle";
import * as StrudelCore from "@strudel/core";
import * as StrudelMini from "@strudel/mini";
import * as StrudelTonal from "@strudel/tonal";
import * as StrudelWebAudio from "@strudel/webaudio";
import { transpiler } from "@strudel/transpiler";
import {
  emotitoneStrudelOutput,
  ensureSoundfontCatalog,
  getAudioContext,
  initSuperdoughAudio,
  stopStrudelVisuals,
} from "@/services/superdoughAudio";
import { setSoundingNotationSpans } from "@/services/notationSpans";
import type { NotationSpan } from "@/types/notation";

interface PatternScheduler {
  cps?: number;
  started?: boolean;
  setCps?: (cps: number) => void;
  now?: () => number;
  stop?: () => void;
}

/**
 * The one pattern transport: Strudel's REPL and scheduler without an editor.
 * It plays the code it is given; the Code Strip only shows that code.
 */
export interface PatternTransport {
  /** The code the next evaluation plays. */
  code: string;
  /** The span each phrase note produced in `code`. */
  spans: readonly NotationSpan[];
  setCode: (code: string, spans?: readonly NotationSpan[]) => void;
  evaluate: () => Promise<void | boolean>;
  stop: () => Promise<void> | void;
  repl: { scheduler: PatternScheduler };
}

interface PatternTransportOptions {
  initialCode: string;
  initialSpans?: readonly NotationSpan[];
  /** Each animation frame while playing, with the scheduler's cycle position. */
  onFrame: (time: number) => void;
  onToggle: (started: boolean) => void;
  onEvalError: (error: unknown) => void;
}

interface StrudelRepl {
  scheduler: PatternScheduler & { stop: () => void };
  evaluate: (code: string, autostart?: boolean) => Promise<unknown>;
}

let activeTransport: PatternTransport | undefined;
let disposeActiveTransport: (() => void) | undefined;
// Keeps the audio context awake through silent bars while the pattern plays.
let releaseTransport: (() => void) | undefined;
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

export function createPatternTransport(options: PatternTransportOptions): PatternTransport {
  if (activeTransport) throw new Error("The pattern transport already exists");

  const prebaked = Promise.all([initSuperdoughAudio(), prepareScope()]);
  // Keep an early failure observable through evaluation, not as an unhandled rejection.
  prebaked.catch(() => undefined);
  let frame: number | null = null;
  let evaluatingSpans: readonly NotationSpan[] = [];

  const stopFrames = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  };

  const repl = StrudelCore.repl({
    defaultOutput: emotitoneStrudelOutput,
    getTime: () => getAudioContext().currentTime,
    transpiler,
    beforeEval: async () => {
      await prebaked;
      // General MIDI soundfonts load on demand (BJS-509).
      if (transport.code.includes("gm_")) await ensureSoundfontCatalog();
    },
    beforeStart: async () => {
      await resumeAudioContext(getAudioContext());
    },
    // Called with the new pattern just before the scheduler receives it, so
    // the spans always describe the code whose haps are being triggered.
    editPattern: (pattern: unknown) => {
      setSoundingNotationSpans(evaluatingSpans);
      return pattern;
    },
    onToggle: (started: boolean) => {
      if (started) releaseTransport ??= holdAudioActivity();
      else {
        releaseTransport?.();
        releaseTransport = undefined;
      }
      options.onToggle(started);
      if (!started) {
        stopFrames();
        setSoundingNotationSpans(null);
        return;
      }
      if (frame !== null) return;
      const tick = () => {
        options.onFrame(repl.scheduler.now?.() ?? 0);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    },
    onEvalError: options.onEvalError,
  }) as StrudelRepl;

  const transport: PatternTransport = {
    code: options.initialCode,
    spans: options.initialSpans ?? [],
    setCode(code, spans = []) {
      transport.code = code;
      transport.spans = spans;
    },
    async evaluate() {
      evaluatingSpans = transport.spans;
      await repl.evaluate(transport.code, true);
    },
    stop() {
      repl.scheduler.stop();
    },
    repl,
  };

  activeTransport = transport;
  disposeActiveTransport = stopFrames;
  return transport;
}

/** Stop the transport and release it, allowing a clean remount. */
export function disposePatternTransport(transport: PatternTransport): Promise<void> {
  if (activeTransport !== transport) return Promise.resolve();
  activeTransport = undefined;
  const stopFrames = disposeActiveTransport;
  disposeActiveTransport = undefined;
  let stopped: Promise<void> | void;
  try {
    stopped = transport.stop();
  } finally {
    releaseTransport?.();
    releaseTransport = undefined;
    stopFrames?.();
    setSoundingNotationSpans(null);
    stopStrudelVisuals();
  }
  return Promise.resolve(stopped);
}

export function getPatternPlaybackDiagnostics() {
  return { activeTransports: activeTransport ? 1 : 0 };
}
