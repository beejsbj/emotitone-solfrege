import { getAudioContext } from "@/services/superdoughAudio";

export interface LiveAudioSource {
  context: AudioContext;
  node: MediaStreamAudioSourceNode;
  stream: MediaStream;
}

export interface LiveAudioLease {
  source: LiveAudioSource;
  release: () => Promise<void>;
}

export interface LiveAudioInput {
  acquire: (signal?: AbortSignal) => Promise<LiveAudioLease>;
  subscribe: (listener: (source: LiveAudioSource | null) => void) => () => void;
}

interface LiveAudioDependencies {
  getContext: () => AudioContext;
  getUserMedia: () => Promise<MediaStream>;
}

export function createLiveAudioInput(
  dependencies: LiveAudioDependencies,
): LiveAudioInput {
  let source: LiveAudioSource | null = null;
  let sourceRequest: Promise<LiveAudioSource> | null = null;
  const pendingAcquires = new Set<symbol>();
  const leases = new Set<symbol>();
  const listeners = new Set<(source: LiveAudioSource | null) => void>();
  const trackEndListeners = new Map<MediaStreamTrack, () => void>();

  function publish(nextSource: LiveAudioSource | null) {
    source = nextSource;
    listeners.forEach((listener) => listener(source));
  }

  function closeSource() {
    if (!source) return;
    const staleSource = source;
    staleSource.stream.getTracks().forEach((track) => {
      const listener = trackEndListeners.get(track);
      if (listener) track.removeEventListener?.("ended", listener);
      trackEndListeners.delete(track);
    });
    publish(null);
    staleSource.node.disconnect();
    staleSource.stream.getTracks().forEach((track) => track.stop());
  }

  async function openSource(): Promise<LiveAudioSource> {
    if (source) return source;
    if (sourceRequest) return sourceRequest;

    sourceRequest = (async () => {
      const stream = await dependencies.getUserMedia();
      try {
        const context = dependencies.getContext();
        if (context.state === "suspended") await context.resume();
        const node = context.createMediaStreamSource(stream);
        const nextSource = { context, node, stream };
        publish(nextSource);
        stream.getTracks().forEach((track) => {
          const handleEnded = () => {
            if (source !== nextSource) return;
            leases.clear();
            closeSource();
          };
          trackEndListeners.set(track, handleEnded);
          track.addEventListener?.("ended", handleEnded, { once: true });
        });
        return nextSource;
      } catch (error) {
        stream.getTracks().forEach((track) => track.stop());
        throw error;
      }
    })().finally(() => {
      sourceRequest = null;
    });

    return sourceRequest;
  }

  async function closeIfUnused() {
    if (!source || leases.size > 0 || pendingAcquires.size > 0) return;
    closeSource();
  }

  return {
    async acquire(signal?: AbortSignal) {
      if (signal?.aborted) throw abortError();
      const pendingId = Symbol("live-audio-acquire");
      pendingAcquires.add(pendingId);

      try {
        const activeSource = await openSource();
        if (signal?.aborted) throw abortError();

        const leaseId = Symbol("live-audio-lease");
        let released = false;
        leases.add(leaseId);
        return {
          source: activeSource,
          async release() {
            if (released) return;
            released = true;
            leases.delete(leaseId);
            await closeIfUnused();
          },
        };
      } finally {
        pendingAcquires.delete(pendingId);
        await closeIfUnused();
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      listener(source);
      return () => listeners.delete(listener);
    },
  };
}

export const liveAudioInput = createLiveAudioInput({
  getContext: getAudioContext,
  getUserMedia: async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not support microphone input.");
    }
    return navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
  },
});

function abortError() {
  return new DOMException("Microphone input was cancelled.", "AbortError");
}
