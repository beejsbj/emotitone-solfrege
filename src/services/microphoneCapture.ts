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
  let sourceError: Error | undefined;
  let unsubscribeSource: () => void = () => undefined;
  let failRecording: ((error: Error) => void) | undefined;
  let releasePromise: Promise<void> | undefined;
  const releaseLease = () => releasePromise ??= lease.release();

  try {
    unsubscribeSource = liveAudioInput.subscribe((source) => {
      if (source === lease.source || sourceError) return;
      sourceError = new Error("Microphone input ended.");
      if (failRecording) {
        failRecording(sourceError);
      } else {
        // Startup can still be awaiting the monitor when the device disappears.
        unsubscribeSource();
        try {
          onError(sourceError);
        } finally {
          void releaseLease();
        }
      }
    });
    if (sourceError) throw sourceError;
    monitor = await startLivePitchMonitor(lease.source, (frame) => {
      if (!sourceError) onFrame(frame);
    });
    if (sourceError) throw sourceError;
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
      unsubscribeSource();
      await monitor?.stop().catch(() => undefined);
      await releaseLease();
    };

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    failRecording = (error) => {
      if (settled) return;
      settled = true;
      unsubscribeSource();
      if (recorder.state !== "inactive") recorder.stop();
      try {
        onError(error);
      } finally {
        void cleanup().then(() => rejectCompletion(error));
      }
    };
    recorder.onerror = () => {
      failRecording?.(new Error("The microphone recording failed."));
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
        unsubscribeSource();
        if (recorder.state !== "inactive") recorder.stop();
        return completion;
      },
      async cancel() {
        cancelled = true;
        unsubscribeSource();
        if (recorder.state !== "inactive") recorder.stop();
        await completion.catch(() => undefined);
      },
    };
  } catch (error) {
    unsubscribeSource();
    await monitor?.stop().catch(() => undefined);
    await releaseLease();
    throw error;
  }
}
