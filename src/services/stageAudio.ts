import { liveAudioInput, type LiveAudioSource } from "@/services/liveAudio";
import { getAudioContext, getSuperdoughMasterGain } from "@/services/superdoughAudio";
import type { StageAudioFrame } from "@/composables/canvas/stageRuntime";

const FFT_SIZE = 1024;
const NOISE_FLOOR = 0.006;
const SIGNAL_ON = 0.018;
const SIGNAL_OFF = 0.009;
const SIGNAL_HOLD_MS = 260;
const ATTACK_MS = 70;
const RELEASE_MS = 420;

export interface StageAudioFeatures {
  initialize: () => AudioNode | null;
  sample: (timestampMs: number) => StageAudioFrame;
  cleanup: () => void;
}

export function createStageAudioFeatures(): StageAudioFeatures {
  let context: AudioContext | null = null;
  let bus: GainNode | null = null;
  let analyser: AnalyserNode | null = null;
  let playback: GainNode | null = null;
  let liveSource: LiveAudioSource | null = null;
  let connectedLiveNode: MediaStreamAudioSourceNode | null = null;
  let samples = new Float32Array(FFT_SIZE);
  let envelope = 0;
  let hasSignal = false;
  let signalHeldUntil = 0;
  let lastTimestamp = 0;

  const syncLiveSource = () => {
    if (connectedLiveNode && bus) safeDisconnectEdge(connectedLiveNode, bus);
    connectedLiveNode = null;
    if (!liveSource || !context || !bus) return;
    if (liveSource.context !== context) return;
    liveSource.node.connect(bus);
    connectedLiveNode = liveSource.node;
  };

  const syncPlaybackSource = () => {
    if (!bus) return;
    const nextPlayback = getSuperdoughMasterGain();
    if (nextPlayback === playback) return;
    if (playback) safeDisconnectEdge(playback, bus);
    playback = nextPlayback;
    playback?.connect(bus);
  };

  const unsubscribe = liveAudioInput.subscribe((source) => {
    liveSource = source;
    syncLiveSource();
  });

  return {
    initialize() {
      if (bus) {
        syncPlaybackSource();
        return bus;
      }
      context = getAudioContext() as AudioContext;
      if (!context || typeof context.createGain !== "function") return null;
      bus = context.createGain();
      bus.gain.value = 1;
      analyser = context.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0;
      samples = new Float32Array(analyser.fftSize);
      bus.connect(analyser);
      syncPlaybackSource();
      syncLiveSource();
      return bus;
    },

    sample(timestampMs) {
      if (!analyser) return { envelope: 0, hasSignal: false };
      // Stage can mount before Superdough has finished creating its controller.
      // The render loop is the durable point at which to attach once playback
      // becomes available, without requiring a canvas remount.
      syncPlaybackSource();
      analyser.getFloatTimeDomainData(samples);
      let sumSquares = 0;
      for (const sample of samples) sumSquares += sample * sample;
      const rms = Math.sqrt(sumSquares / samples.length);
      const normalized = clamp((rms - NOISE_FLOOR) / 0.16, 0, 1);
      const deltaMs = lastTimestamp > 0 ? Math.min(100, Math.max(1, timestampMs - lastTimestamp)) : 16;
      lastTimestamp = timestampMs;
      const timeConstant = normalized > envelope ? ATTACK_MS : RELEASE_MS;
      const blend = 1 - Math.exp(-deltaMs / timeConstant);
      envelope += (normalized - envelope) * blend;

      if (rms >= SIGNAL_ON) {
        hasSignal = true;
        signalHeldUntil = timestampMs + SIGNAL_HOLD_MS;
      } else if (rms < SIGNAL_OFF && timestampMs >= signalHeldUntil) {
        hasSignal = false;
      }
      return { envelope: clamp(envelope, 0, 1), hasSignal };
    },

    cleanup() {
      unsubscribe();
      if (connectedLiveNode && bus) safeDisconnectEdge(connectedLiveNode, bus);
      if (playback && bus) safeDisconnectEdge(playback, bus);
      safeDisconnect(bus);
      safeDisconnect(analyser);
      context = null;
      bus = null;
      analyser = null;
      playback = null;
      connectedLiveNode = null;
      envelope = 0;
      hasSignal = false;
      lastTimestamp = 0;
    },
  };
}

function safeDisconnect(node: AudioNode | null) {
  try { node?.disconnect(); } catch { /* The owner may already have disconnected it. */ }
}

function safeDisconnectEdge(source: AudioNode, destination: AudioNode) {
  try { source.disconnect(destination); } catch { /* The edge may already be gone. */ }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
