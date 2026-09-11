import { computed, onBeforeUnmount, readonly, ref } from "vue";
import {
  liveAudioInput,
  type LiveAudioLease,
} from "@/services/liveAudio";
import { startLivePitchMonitor, type LivePitchMonitor } from "@/services/livePitch";
import { createLivePitchStageBridge } from "@/services/hummingStage";
import { useInstrumentStore } from "@/stores/instrument";
import { useMusicStore } from "@/stores/music";
import type { ChromaticNote, MusicalMode } from "@/types/music";

export type LiveListeningStatus =
  | "idle"
  | "requesting"
  | "listening"
  | "error";

export function useLiveListening() {
  const musicStore = useMusicStore();
  const instrumentStore = useInstrumentStore();
  const status = ref<LiveListeningStatus>("idle");
  const error = ref<string | null>(null);
  let lease: LiveAudioLease | null = null;
  let requestController: AbortController | null = null;
  let pitchMonitor: LivePitchMonitor | null = null;
  let stageBridge: ReturnType<typeof createLivePitchStageBridge> | null = null;
  let generation = 0;
  type ListeningStartup = {
    generation: number;
    cancelled: boolean;
    lease: LiveAudioLease | null;
    monitor: LivePitchMonitor | null;
    bridge: ReturnType<typeof createLivePitchStageBridge> | null;
  };
  let pendingStartup: ListeningStartup | null = null;

  const cleanupStartup = async (startup: ListeningStartup) => {
    if (startup.monitor) {
      await startup.monitor.stop().catch(() => undefined);
    }
    startup.monitor = null;
    startup.bridge?.stop();
    startup.bridge = null;
    if (startup.lease) {
      await startup.lease.release().catch(() => undefined);
    }
    startup.lease = null;
  };

  const unsubscribeSource = liveAudioInput.subscribe((source) => {
    if (source || (!lease && status.value !== "requesting")) return;
    generation += 1;
    requestController?.abort();
    requestController = null;
    const startup = pendingStartup;
    pendingStartup = null;
    if (startup) {
      startup.cancelled = true;
      void cleanupStartup(startup);
    }
    lease = null;
    void pitchMonitor?.stop();
    pitchMonitor = null;
    stageBridge?.stop();
    stageBridge = null;
    error.value = "Microphone input ended.";
    status.value = "error";
  });

  const isListening = computed(() => status.value === "listening");
  const statusMessage = computed(() => {
    if (status.value === "requesting") return "Requesting microphone access";
    if (status.value === "listening") return "Listening to live audio";
    if (status.value === "error") return error.value ?? "Live listening failed";
    return "Live listening is off";
  });

  async function start() {
    if (status.value === "requesting" || lease) return;
    const activeGeneration = ++generation;
    error.value = null;
    status.value = "requesting";
    requestController = new AbortController();
    const startup: ListeningStartup = {
      generation: activeGeneration,
      cancelled: false,
      lease: null,
      monitor: null,
      bridge: null,
    };
    pendingStartup = startup;

    try {
      const nextLease = await liveAudioInput.acquire(requestController.signal);
      startup.lease = nextLease;
      if (generation !== activeGeneration || startup.cancelled) {
        await cleanupStartup(startup);
        return;
      }
      const nextBridge = createLivePitchStageBridge({
        key: musicStore.currentKey as ChromaticNote,
        mode: musicStore.currentMode as MusicalMode,
        instrument: instrumentStore.currentInstrument,
      });
      startup.bridge = nextBridge;
      const nextMonitor = await startLivePitchMonitor(
        nextLease.source,
        (frame) => {
          if (generation === activeGeneration && !startup.cancelled) {
            nextBridge.push(frame);
          }
        },
      );
      startup.monitor = nextMonitor;
      if (generation !== activeGeneration || startup.cancelled) {
        await cleanupStartup(startup);
        return;
      }
      lease = nextLease;
      stageBridge = nextBridge;
      pitchMonitor = nextMonitor;
      startup.lease = null;
      startup.bridge = null;
      startup.monitor = null;
      if (pendingStartup === startup) pendingStartup = null;
      requestController = null;
      status.value = "listening";
    } catch (caught) {
      await cleanupStartup(startup);
      if (pendingStartup === startup) pendingStartup = null;
      if (generation !== activeGeneration) return;
      requestController = null;
      if (caught instanceof DOMException && caught.name === "AbortError") {
        status.value = "idle";
        return;
      }
      error.value = friendlyListeningError(caught);
      status.value = "error";
    }
  }

  async function stop() {
    generation += 1;
    requestController?.abort();
    requestController = null;
    const startup = pendingStartup;
    pendingStartup = null;
    if (startup) {
      startup.cancelled = true;
      await cleanupStartup(startup);
    }
    const activeLease = lease;
    lease = null;
    const activeMonitor = pitchMonitor;
    pitchMonitor = null;
    const activeBridge = stageBridge;
    stageBridge = null;
    await activeMonitor?.stop();
    activeBridge?.stop();
    await activeLease?.release();
    error.value = null;
    status.value = "idle";
  }

  async function toggle() {
    if (lease || status.value === "requesting") await stop();
    else await start();
  }

  onBeforeUnmount(() => {
    void stop();
    unsubscribeSource();
  });

  return {
    status: readonly(status),
    error: readonly(error),
    isListening,
    statusMessage,
    start,
    stop,
    toggle,
  };
}

function friendlyListeningError(caught: unknown) {
  if (caught instanceof DOMException && caught.name === "NotAllowedError") {
    return "Microphone permission was not granted.";
  }
  if (caught instanceof Error) return caught.message;
  return "Live listening failed.";
}
