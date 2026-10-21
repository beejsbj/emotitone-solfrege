/**
 * Dry and wet output connections for the live AudioWorklet. Per-voice filtering
 * and send levels live on the audio thread; native effect buses belong to the app.
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
  readonly room: AudioNode;
  readonly delay: AudioNode;
  dispose(): void;
}

/** At or above this cutoff the filter is bypassed, as in live Superdough notes. */
export const OPEN_CUTOFF_HZ = 12000;
export const LIVE_DELAY_TIME_SECONDS = 0.25;
export const LIVE_DELAY_FEEDBACK = 0.3;
export function createLiveShapingChain(
  context: BaseAudioContext,
  destination: AudioNode,
  getOrbit: () => LiveOrbitSends | undefined,
): LiveShapingChain {
  const input = new GainNode(context, { channelCount: 2, channelCountMode: "explicit" });
  const room = new GainNode(context, { channelCount: 2, channelCountMode: "explicit" });
  const delay = new GainNode(context, { channelCount: 2, channelCountMode: "explicit" });
  input.connect(destination);
  const orbit = getOrbit();
  if (orbit) {
    room.connect(orbit.getReverb());
    delay.connect(orbit.getDelay(LIVE_DELAY_TIME_SECONDS, LIVE_DELAY_FEEDBACK, context.currentTime));
  }
  return {
    input, room, delay,
    dispose() { input.disconnect(); room.disconnect(); delay.disconnect(); },
  };
}
