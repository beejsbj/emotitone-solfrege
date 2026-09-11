import { PitchDetector } from "pitchy";
import type { LiveAudioSource } from "@/services/liveAudio";

export const LIVE_PITCH_SOURCE = "live-pitch";

export interface LivePitchFrame {
  timestampSeconds: number;
  frequencyHz: number | null;
  midi: number | null;
  clarity: number;
  voiced: boolean;
}

export interface LivePitchMonitor {
  stop: () => Promise<void>;
}

const FRAME_SIZE = 2_048;
const CLARITY_GATE = 0.8;
const RMS_GATE = 0.003;
const FLOOR_HZ = 65;
const CEILING_HZ = 1_050;

export class LiveMpmTracker {
  private readonly detector = PitchDetector.forFloat32Array(FRAME_SIZE);

  analyze(
    samples: Float32Array,
    sampleRate: number,
    timestampSeconds: number,
  ): LivePitchFrame {
    if (samples.length !== FRAME_SIZE) {
      throw new Error(`Expected ${FRAME_SIZE} live pitch samples.`);
    }
    const [frequency, clarityValue] = this.detector.findPitch(
      samples,
      sampleRate,
    );
    const rms = Math.sqrt(
      samples.reduce((sum, sample) => sum + sample * sample, 0)
        / FRAME_SIZE,
    );
    const clarity = Number.isFinite(clarityValue)
      ? clamp(clarityValue, 0, 1)
      : 0;
    const voiced = Number.isFinite(frequency)
      && frequency >= FLOOR_HZ
      && frequency <= CEILING_HZ
      && clarity >= CLARITY_GATE
      && rms >= RMS_GATE;

    return {
      timestampSeconds: round(timestampSeconds, 6),
      frequencyHz: voiced ? round(frequency, 4) : null,
      midi: voiced
        ? round(69 + 12 * Math.log2(frequency / 440), 4)
        : null,
      clarity: round(clarity, 4),
      voiced,
    };
  }
}

export async function startLivePitchMonitor(
  source: LiveAudioSource,
  onFrame: (frame: LivePitchFrame) => void,
): Promise<LivePitchMonitor> {
  const { context, node: sourceNode } = source;
  const tracker = new LiveMpmTracker();
  let analyser: AnalyserNode | undefined;
  let mute: GainNode | undefined;
  let animationFrame: number | null = null;
  let stopped = false;

  const cleanup = async () => {
    if (stopped) return;
    stopped = true;
    if (analyser) safeDisconnectEdge(sourceNode, analyser);
    safeDisconnect(analyser);
    safeDisconnect(mute);
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  };

  try {
    analyser = context.createAnalyser();
    analyser.fftSize = FRAME_SIZE;
    analyser.smoothingTimeConstant = 0;
    mute = context.createGain();
    mute.gain.value = 0;
    mute.connect(context.destination);

    sourceNode.connect(analyser);
    analyser.connect(mute);
    await context.resume();

    const samples = new Float32Array(FRAME_SIZE);
    const samplePitch = () => {
      if (stopped) return;
      analyser?.getFloatTimeDomainData(samples);
      onFrame(tracker.analyze(samples, context.sampleRate, context.currentTime));
      animationFrame = requestAnimationFrame(samplePitch);
    };
    animationFrame = requestAnimationFrame(samplePitch);
    return { stop: cleanup };
  } catch (error) {
    await cleanup().catch(() => undefined);
    throw error;
  }
}

function safeDisconnect(node: AudioNode | undefined) {
  try {
    node?.disconnect();
  } catch {
    // Partially initialized Web Audio nodes may have no active connection.
  }
}

function safeDisconnectEdge(source: AudioNode, destination: AudioNode) {
  try {
    source.disconnect(destination);
  } catch {
    // The source may already have been torn down by its owning lease.
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}
