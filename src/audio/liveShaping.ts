/**
 * Shape-tab effects for the live AudioWorklet. The worklet renders dry voices;
 * this chain applies the same lowpass and orbit sends Superdough applies to
 * fallback notes, so both live backends and Strudel share one sound.
 */

/** Values the Shape tab owns; matches the Superdough live payload rules. */
export interface LiveShaping {
  cutoff: number;
  resonance: number;
  room: number;
  delay: number;
}

/** The subset of a Superdough orbit the live chain sends into. */
export interface LiveOrbitSends {
  getDelay(time: number, feedback: number, at: number): AudioNode;
  getReverb(...params: undefined[]): AudioNode;
  sendDelay(from: AudioNode, amount: number): GainNode;
  sendReverb(from: AudioNode, amount: number): GainNode;
}

export interface LiveShapingChain {
  /** Connect the worklet here instead of the master output. */
  readonly input: AudioNode;
  apply(shaping: LiveShaping): void;
  dispose(): void;
}

/** At or above this cutoff the filter is bypassed, as in live Superdough notes. */
export const OPEN_CUTOFF_HZ = 12000;
export const LIVE_DELAY_TIME_SECONDS = 0.25;
export const LIVE_DELAY_FEEDBACK = 0.3;
// Short smoothing keeps knob drags free of zipper noise.
const SMOOTHING_SECONDS = 0.015;

export function createLiveShapingChain(
  context: BaseAudioContext,
  destination: AudioNode,
  getOrbit: () => LiveOrbitSends | undefined,
): LiveShapingChain {
  const input = new GainNode(context, { gain: 1, channelCount: 2, channelCountMode: "explicit" });
  const filter = new BiquadFilterNode(context, { type: "lowpass", frequency: OPEN_CUTOFF_HZ, Q: 1 });
  const post = new GainNode(context, { gain: 1, channelCount: 2, channelCountMode: "explicit" });
  filter.connect(post);
  post.connect(destination);
  input.connect(post);
  let filtering = false;
  let delaySend: GainNode | undefined;
  let reverbSend: GainNode | undefined;

  const glide = (param: AudioParam, value: number) =>
    param.setTargetAtTime(value, context.currentTime, SMOOTHING_SECONDS);

  return {
    input,
    apply({ cutoff, resonance, room, delay }) {
      const shouldFilter = cutoff < OPEN_CUTOFF_HZ;
      if (shouldFilter) {
        glide(filter.frequency, cutoff);
        // Superdough only receives resonance above zero; otherwise Q stays 1.
        glide(filter.Q, resonance > 0 ? resonance : 1);
      }
      if (shouldFilter !== filtering) {
        input.disconnect();
        input.connect(shouldFilter ? filter : post);
        filtering = shouldFilter;
      }

      // Sends are created on first use so an untouched Shape tab never builds
      // the orbit's reverb or delay.
      if (delay > 0 || delaySend) {
        const orbit = getOrbit();
        if (orbit && !delaySend && delay > 0) {
          orbit.getDelay(LIVE_DELAY_TIME_SECONDS, LIVE_DELAY_FEEDBACK, context.currentTime);
          delaySend = orbit.sendDelay(post, 0);
        }
        if (delaySend) glide(delaySend.gain, Math.max(0, delay));
      }
      if (room > 0 || reverbSend) {
        const orbit = getOrbit();
        if (orbit && !reverbSend && room > 0) {
          orbit.getReverb();
          reverbSend = orbit.sendReverb(post, 0);
        }
        if (reverbSend) glide(reverbSend.gain, Math.max(0, room));
      }
    },
    dispose() {
      input.disconnect();
      filter.disconnect();
      post.disconnect();
      delaySend?.disconnect();
      reverbSend?.disconnect();
    },
  };
}
