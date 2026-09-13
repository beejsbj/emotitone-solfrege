import type { StageAudioFeatures } from "@/services/stageAudio";

export type StageSpecimenSignal = "silence" | "phrase" | "borrowed";

export interface StageSpecimenAudio {
  features: StageAudioFeatures;
  resume: () => Promise<void>;
}

/**
 * Silent Web Audio fixture for the real Stage specimen. It feeds the
 * production Hilbert/analysis seam without acquiring a microphone or routing
 * sound to the browser destination.
 */
export function createStageSpecimenAudio(
  readSignal: () => StageSpecimenSignal,
): StageSpecimenAudio {
  let context: AudioContext | null = null;
  let oscillator: OscillatorNode | null = null;
  let output: GainNode | null = null;
  let silentSink: GainNode | null = null;

  const initialize = () => {
    if (output) return output;
    if (typeof AudioContext === "undefined") return null;

    context = new AudioContext();
    oscillator = context.createOscillator();
    output = context.createGain();
    silentSink = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = 196;
    output.gain.value = 0;
    silentSink.gain.value = 0;
    oscillator.connect(output);
    // Pull the graph in browsers that suspend analyser-only branches, while
    // the zero-gain destination path keeps the specimen inaudible.
    output.connect(silentSink);
    silentSink.connect(context.destination);
    oscillator.start();
    return output;
  };

  return {
    features: {
      initialize,
      sample(timestampMs) {
        const signal = readSignal();
        if (signal === "silence") {
          if (output && context) output.gain.setValueAtTime(0, context.currentTime);
          return { envelope: 0, hasSignal: false };
        }

        const phrase = 0.5 + Math.sin(timestampMs * 0.0017) * 0.24;
        const shimmer = Math.sin(timestampMs * 0.0043) * 0.08;
        const envelope = Math.max(0.14, Math.min(0.92, phrase + shimmer));
        if (output && context && oscillator) {
          oscillator.frequency.setValueAtTime(
            signal === "borrowed" ? 277.18 : 196 + Math.sin(timestampMs * 0.0007) * 24,
            context.currentTime,
          );
          output.gain.setValueAtTime(envelope * 0.62, context.currentTime);
        }
        return { envelope, hasSignal: true };
      },
      cleanup() {
        try { oscillator?.stop(); } catch { /* Already stopped during teardown. */ }
        oscillator?.disconnect();
        output?.disconnect();
        silentSink?.disconnect();
        void context?.close().catch(() => undefined);
        oscillator = null;
        output = null;
        silentSink = null;
        context = null;
      },
    },
    async resume() {
      if (!initialize()) throw new Error("Web Audio is unavailable");
      if (context?.state === "suspended") await context.resume();
    },
  };
}
