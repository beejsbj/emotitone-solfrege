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

  const unsubscribeSource = liveAudioInput.subscribe((source) => {
    if (source || !lease) return;
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

    try {
      const nextLease = await liveAudioInput.acquire(requestController.signal);
      if (generation !== activeGeneration) {
        await nextLease.release();
        return;
      }
      lease = nextLease;
      stageBridge = createLivePitchStageBridge({
        key: musicStore.currentKey as ChromaticNote,
        mode: musicStore.currentMode as MusicalMode,
        instrument: instrumentStore.currentInstrument,
      });
      pitchMonitor = await startLivePitchMonitor(
        nextLease.source,
        (frame) => stageBridge?.push(frame),
      );
      if (generation !== activeGeneration) {
        await pitchMonitor.stop();
        pitchMonitor = null;
        stageBridge.stop();
        stageBridge = null;
        await nextLease.release();
        lease = null;
        return;
      }
      requestController = null;
      status.value = "listening";
    } catch (caught) {
      if (generation !== activeGeneration) return;
      requestController = null;
      const failedLease = lease;
      lease = null;
      await pitchMonitor?.stop().catch(() => undefined);
      pitchMonitor = null;
      stageBridge?.stop();
      stageBridge = null;
      await failedLease?.release().catch(() => undefined);
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
