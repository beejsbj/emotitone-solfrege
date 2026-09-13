type ClockContext = Pick<AudioContext, "currentTime"> & Partial<Pick<AudioContext,
  "state" | "addEventListener" | "removeEventListener"
>>;

/** Keep rhythmic deadlines in the audio clock's own millisecond domain.
 * currentTime is quantized to render blocks: resampling its relationship to
 * performance.now for every voice introduces timing jitter. Only wall-clock
 * presentation/recording needs an anchor, shared until the context changes state.
 */
export function createLiveAudioClock(
  getContext: () => ClockContext,
  options: { epochNow?: () => number; onSuspend?: () => void } = {},
) {
  const epochNow = options.epochNow ?? (() => Date.now());
  let context: ClockContext | undefined;
  let epochOffset = 0;
  let state: AudioContextState | undefined;
  let anchorInvalid = true;

  const onStateChange = () => {
    anchorInvalid = true;
    if (context?.state && context.state !== "running") options.onSuspend?.();
  };
  function sync() {
    const next = getContext();
    if (next !== context) {
      context?.removeEventListener?.("statechange", onStateChange);
      context = next;
      context.addEventListener?.("statechange", onStateChange);
      anchorInvalid = true;
    }
    if (anchorInvalid || state !== context.state) {
      epochOffset = epochNow() - context.currentTime * 1000;
      state = context.state;
      anchorInvalid = false;
    }
    return context;
  }

  return {
    now: () => sync().currentTime * 1000,
    toAudioTime: (timestamp: number) => timestamp / 1000,
    fromAudioTime: (seconds: number) => seconds * 1000,
    toEpochTime(timestamp: number) {
      sync();
      return epochOffset + timestamp;
    },
    fromEpochTime(timestamp: number) {
      sync();
      return timestamp - epochOffset;
    },
    dispose() {
      context?.removeEventListener?.("statechange", onStateChange);
      context = undefined;
      anchorInvalid = true;
    },
  };
}

export type LiveAudioClock = ReturnType<typeof createLiveAudioClock>;
