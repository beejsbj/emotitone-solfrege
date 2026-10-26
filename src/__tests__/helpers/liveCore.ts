import { LiveAudioCore } from "@/audio/live/core";
import type { LiveRenderer, LiveRendererCallbacks } from "@/audio/liveRenderer";
import type { PreparedLiveInstrument } from "@/audio/live/types";

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
    getLivePlaybackFailure: () => seat.renderer ? undefined
      : { kind: "unavailable" as const, reason: "No live renderer in this test" },
    setLivePlaybackShaping: () => {},
    pinLivePlayback: () => () => {},
  };
}

export interface LiveCoreOptions {
  /** Frames per second of the offline core. */
  sampleRate?: number;
  /** What the core holds: an id is a sine oscillator; or a prepared instrument as is. */
  instruments?: (string | PreparedLiveInstrument)[];
  /** Envelope of the prepared oscillators. */
  envelope?: { attack: number; decay: number; sustain: number; release: number };
}

/** Put a real core in `seat`. Render it to deliver its events at their frames. */
export function attachLiveCore(seat: LiveSeat, options: LiveCoreOptions = {}) {
  const sampleRate = options.sampleRate ?? 1000;
  const envelope = options.envelope ?? { attack: 0, decay: 0, sustain: 1, release: 0 };
  let frame = 0;
  const each = (deliver: (listener: LiveRendererCallbacks) => void) => [...seat.listeners].forEach(deliver);
  const core = new LiveAudioCore(sampleRate, (response) => {
    if (response.type === "event") each((listener) => listener.onEvent(response.event));
    else if (response.type === "plan") each((listener) => listener.onPlan?.(response.events));
    else if (response.type === "expression-owner") each((listener) => listener.onExpressionOwner?.(response));
    else if (response.type === "owner-ended") each((listener) => listener.onOwnerEnded?.(response.ownerId));
  });
  for (const instrument of options.instruments ?? ["piano"]) {
    core.command({ type: "prepare", requestId: 1, instrument: typeof instrument !== "string" ? instrument : {
      kind: "oscillator", waveform: "sine", instrumentId: instrument, gain: 1, ...envelope,
    } }, frame);
  }
  seat.renderer = {
    press: (ownerId, notes) => core.command({ type: "press", ownerId, notes }, frame),
    release: (ownerId) => core.command({ type: "release", ownerId }, frame),
    setPitchBend: (ownerId, cents) => core.command({ type: "pitch-bend", ownerId, cents }, frame),
    setGain: (ownerId, gain) => core.command({ type: "gain-expression", ownerId, gain }, frame),
    configure: (config) => core.command({ type: "configure", config }, frame),
    clear: () => core.command({ type: "clear" }, frame),
    dispose: () => {},
    forget: async () => {},
  };
  return {
    core,
    sampleRate,
    get frame() { return frame; },
    /** Render `length` frames; returns the left channel. */
    render(length: number) {
      const output = [new Float32Array(length), new Float32Array(length)];
      core.render(output, frame);
      frame += length;
      return output[0];
    },
    /** Render up to `seconds` on the core's clock (whole frames). */
    renderTo(seconds: number) {
      const target = Math.round(seconds * sampleRate);
      return target > frame ? this.render(target - frame) : new Float32Array(0);
    },
  };
}
