import { PitchDetector } from "pitchy";

export const MELOGRAPH_LIVE_SOURCE = "melograph-live";

export interface MelographLivePitchFrame {
  timestampSeconds: number;
  frequencyHz: number | null;
  midi: number | null;
  clarity: number;
  voiced: boolean;
}

export interface MelographLiveMonitor {
  stop: () => Promise<void>;
}

export interface MicrophoneCapture {
  stop: () => Promise<Blob>;
  cancel: () => Promise<void>;
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
  ): MelographLivePitchFrame {
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

export async function startMelographLiveMonitor(
  stream: MediaStream,
  onFrame: (frame: MelographLivePitchFrame) => void,
): Promise<MelographLiveMonitor> {
  const context = new AudioContext();
  const tracker = new LiveMpmTracker();
  let source: MediaStreamAudioSourceNode | undefined;
  let analyser: AnalyserNode | undefined;
  let mute: GainNode | undefined;
  let animationFrame: number | null = null;

  const cleanup = async () => {
    safeDisconnect(source);
    safeDisconnect(analyser);
    safeDisconnect(mute);
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    if (context.state !== "closed") {
      await context.close();
    }
  };

  try {
    source = context.createMediaStreamSource(stream);
    analyser = context.createAnalyser();
    analyser.fftSize = FRAME_SIZE;
    analyser.smoothingTimeConstant = 0;
    mute = context.createGain();
    mute.gain.value = 0;
    mute.connect(context.destination);

    source.connect(analyser);
    analyser.connect(mute);
    await context.resume();

    const samples = new Float32Array(FRAME_SIZE);
    const samplePitch = () => {
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

export async function startMicrophoneCapture(
  onFrame: (frame: MelographLivePitchFrame) => void,
  onError: (error: Error) => void = () => undefined,
): Promise<MicrophoneCapture> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    throw new Error("This browser does not support microphone capture.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  let monitor: MelographLiveMonitor | undefined;
  try {
    monitor = await startMelographLiveMonitor(stream, onFrame);
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    let cancelled = false;
    let settled = false;
    let resolveCompletion!: (blob: Blob) => void;
    let rejectCompletion!: (error: Error) => void;
    const completion = new Promise<Blob>((resolve, reject) => {
      resolveCompletion = resolve;
      rejectCompletion = reject;
    });
    void completion.catch(() => undefined);

    const cleanup = async () => {
      await monitor?.stop().catch(() => undefined);
      stream.getTracks().forEach((track) => track.stop());
    };

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => {
      if (settled) return;
      settled = true;
      const error = new Error("The microphone recording failed.");
      try {
        onError(error);
      } finally {
        void cleanup().then(() => {
          rejectCompletion(error);
        });
      }
    };
    recorder.onstop = () => {
      if (settled) return;
      settled = true;
      const blob = new Blob(chunks, {
        type: recorder.mimeType || chunks[0]?.type || "audio/webm",
      });
      void cleanup().then(() => {
        if (cancelled) {
          rejectCompletion(new Error("Microphone capture was cancelled."));
        } else {
          resolveCompletion(blob);
        }
      });
    };
    recorder.start();

    return {
      stop() {
        if (recorder.state !== "inactive") recorder.stop();
        return completion;
      },
      async cancel() {
        cancelled = true;
        if (recorder.state !== "inactive") recorder.stop();
        await completion.catch(() => undefined);
      },
    };
  } catch (error) {
    await monitor?.stop().catch(() => undefined);
    stream.getTracks().forEach((track) => track.stop());
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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}
