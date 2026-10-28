import { LiveAudioCore } from "@/audio/live/core";
import type { LiveRenderer, LiveRendererCallbacks } from "@/audio/liveRenderer";
import type { LiveEnvelopeOverride, PreparedLiveInstrument } from "@/audio/live/types";
import type { LiveShaping } from "@/audio/liveShaping";
import type { LivePlaybackFailure } from "@/services/livePlayback";
import { getLiveArticulation } from "@/services/liveArticulation";

/**
 * The live worklet for store and component tests: the real render core
 * (src/audio/live/core.ts), rendered offline, behind the `livePlayback`
 * surface the music store reads. Since the worklet is the only renderer, a
 * test that plays notes needs one of these (BJS-495).
 *
 * Mock `@/services/livePlayback` with `livePlaybackOn(seat)`, where `seat`
 * comes from `vi.hoisted(liveSeat)`, then `attachLiveCore(seat)` per test:
 *
 *   const seat = vi.hoisted(() => ({ renderer: null, listeners: new Set() }) as LiveSeat);
 *   vi.mock("@/services/livePlayback", async () => (await import("../helpers/liveCore")).livePlaybackOn(seat));
 */
export interface LiveSeat {
  renderer: LiveRenderer | null;
  listeners: Set<LiveRendererCallbacks>;
  /** Set by attachLiveCore: the Shape controls reach the core, as setLivePlaybackShaping does. */
  shape?: (next: LiveShaping & { envelope: LiveEnvelopeOverride }) => void;
  /** Why the worklet holds no sound while `renderer` is null; a generic "not prepared" by default. */
  failure?: LivePlaybackFailure;
}

/** The livePlayback functions the stores call, answered by `seat`. */
export function livePlaybackOn(seat: LiveSeat) {
  return {
    getLivePlayback: () => seat.renderer ?? undefined,
    waitForLivePlayback: () => undefined,
    subscribeLivePlayback: (listener: LiveRendererCallbacks) => {
      seat.listeners.add(listener);
      return () => { seat.listeners.delete(listener); };
    },
    needsLivePlaybackPreparation: () => false,
    getLivePlaybackFailure: (): LivePlaybackFailure | undefined => seat.renderer ? undefined
      : seat.failure ?? { kind: "unavailable", reason: "No live renderer in this test" },
    setLivePlaybackShaping: (next: LiveShaping & { envelope: LiveEnvelopeOverride }) => seat.shape?.(next),
    pinLivePlayback: () => () => {},
  };
}

export interface LiveCoreOptions {
  /** Frames per second of the offline core. */
  sampleRate?: number;
  /** What the core holds (default piano, triangle, sine): an id is a sine oscillator; or a prepared instrument as is. */
  instruments?: (string | PreparedLiveInstrument)[];
  /**
   * Envelope of the prepared oscillators: a fixed one (default instant), or
   * "catalog" for each instrument's own live articulation, as the real loader
   * prepares it (sine, triangle, square and sawtooth then use their waveform).
   */
  envelope?: { attack: number; decay: number; sustain: number; release: number } | "catalog";
}

/** Put a real core in `seat`. Render it to deliver its events at their frames. */
export function attachLiveCore(seat: LiveSeat, options: LiveCoreOptions = {}) {
  const sampleRate = options.sampleRate ?? 1000;
  const fixed = options.envelope ?? { attack: 0, decay: 0, sustain: 1, release: 0 };
  const WAVEFORMS = ["sine", "triangle", "square", "sawtooth"] as const;
  const oscillator = (instrumentId: string): PreparedLiveInstrument => fixed === "catalog"
    ? { kind: "oscillator", instrumentId, gain: 1, ...getLiveArticulation(instrumentId),
      waveform: WAVEFORMS.find((waveform) => waveform === instrumentId) ?? "sine" }
    : { kind: "oscillator", waveform: "sine", instrumentId, gain: 1, ...fixed };
  let frame = 0;
  /** While following a clock, a command first renders up to it, as the worklet applies commands at its render frame. */
  let clock: (() => number) | undefined;
  const sync = () => { if (clock) renderTo(clock()); };
  const each = (deliver: (listener: LiveRendererCallbacks) => void) => [...seat.listeners].forEach(deliver);
  const core = new LiveAudioCore(sampleRate, (response) => {
    if (response.type === "event") each((listener) => listener.onEvent(response.event));
    else if (response.type === "plan") each((listener) => listener.onPlan?.(response.events));
    else if (response.type === "expression-owner") each((listener) => listener.onExpressionOwner?.(response));
    else if (response.type === "owner-ended") each((listener) => listener.onOwnerEnded?.(response.ownerId));
  });
  for (const instrument of options.instruments ?? ["piano", "triangle", "sine"]) {
    core.command({ type: "prepare", requestId: 1,
      instrument: typeof instrument !== "string" ? instrument : oscillator(instrument) }, frame);
  }
  seat.shape = (next) => {
    core.command({ type: "shape", envelope: next.envelope }, frame);
    core.command({ type: "effects", shaping: next }, frame);
  };
  const command = (next: Parameters<LiveAudioCore["command"]>[0]) => { sync(); core.command(next, frame); };
  seat.renderer = {
    press: (ownerId, notes) => command({ type: "press", ownerId, notes }),
    release: (ownerId) => command({ type: "release", ownerId }),
    setPitchBend: (ownerId, cents) => command({ type: "pitch-bend", ownerId, cents }),
    setGain: (ownerId, gain) => command({ type: "gain-expression", ownerId, gain }),
    configure: (config) => command({ type: "configure", config }),
    clear: () => command({ type: "clear" }),
    dispose: () => {},
    forget: async () => {},
  };
  function render(length: number) {
    const output = [new Float32Array(length), new Float32Array(length)];
    core.render(output, frame);
    frame += length;
    return output[0];
  }
  function renderTo(seconds: number) {
    const target = Math.round(seconds * sampleRate);
    return target > frame ? render(target - frame) : new Float32Array(0);
  }
  return {
    core,
    sampleRate,
    get frame() { return frame; },
    /** Render `length` frames; returns the left channel. */
    render,
    /**
     * Keep the core on the test's clock: every millisecond of (fake) timers,
     * and every command, renders up to `seconds()`, so events land at the
     * frames the store's audio clock expects. Returns the stop.
     */
    follow(seconds: () => number) {
      clock = seconds;
      const timer = setInterval(sync, 1);
      return () => { clearInterval(timer); if (clock === seconds) clock = undefined; };
    },
    /** Render up to `seconds` on the core's clock (whole frames). */
    renderTo,
  };
}
