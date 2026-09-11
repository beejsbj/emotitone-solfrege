import { liveAudioInput } from "@/services/liveAudio";
import {
  startLivePitchMonitor,
  type LivePitchFrame,
  type LivePitchMonitor,
} from "@/services/livePitch";

export interface MicrophoneCapture {
  stop: () => Promise<Blob>;
  cancel: () => Promise<void>;
}

export async function startMicrophoneCapture(
  onFrame: (frame: LivePitchFrame) => void,
  onError: (error: Error) => void = () => undefined,
): Promise<MicrophoneCapture> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("This browser does not support microphone recording.");
  }

  const lease = await liveAudioInput.acquire();
  let monitor: LivePitchMonitor | undefined;
  try {
    monitor = await startLivePitchMonitor(lease.source, onFrame);
    const recorder = new MediaRecorder(lease.source.stream);
    const chunks: Blob[] = [];
    let cancelled = false;
    let settled = false;
    let cleanedUp = false;
    let resolveCompletion!: (blob: Blob) => void;
    let rejectCompletion!: (error: Error) => void;
    const completion = new Promise<Blob>((resolve, reject) => {
      resolveCompletion = resolve;
      rejectCompletion = reject;
    });
    void completion.catch(() => undefined);

    const cleanup = async () => {
      if (cleanedUp) return;
      cleanedUp = true;
      await monitor?.stop().catch(() => undefined);
      await lease.release();
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
        void cleanup().then(() => rejectCompletion(error));
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
    await lease.release();
    throw error;
  }
}
