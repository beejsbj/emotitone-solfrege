import { computed, onBeforeUnmount, readonly, ref } from "vue";
import {
  liveAudioInput,
  type LiveAudioLease,
} from "@/services/liveAudio";

export type LiveListeningStatus =
  | "idle"
  | "requesting"
  | "listening"
  | "error";

export function useLiveListening() {
  const status = ref<LiveListeningStatus>("idle");
  const error = ref<string | null>(null);
  let lease: LiveAudioLease | null = null;
  let requestController: AbortController | null = null;
  let generation = 0;

  const unsubscribeSource = liveAudioInput.subscribe((source) => {
    if (source || !lease) return;
    lease = null;
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
      requestController = null;
      status.value = "listening";
    } catch (caught) {
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
    const activeLease = lease;
    lease = null;
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
