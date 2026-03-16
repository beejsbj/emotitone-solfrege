import { computed, readonly, ref } from "vue";

export interface LiveStrudelMirrorController {
  getCode: () => string;
  setCode: (code: string) => void;
  evaluate: () => Promise<void>;
  stop: () => Promise<void> | void;
}

const controller = ref<LiveStrudelMirrorController | null>(null);
const currentCode = ref("");
const isPlaying = ref(false);
const isReady = ref(false);
const lastError = ref<string | null>(null);

function hasPlayableContent(code: string): boolean {
  const trimmed = code.trim();
  return Boolean(trimmed) && !trimmed.startsWith("//");
}

export function useLiveStrudelMirror() {
  function attachEditor(nextController: LiveStrudelMirrorController, initialCode = "") {
    controller.value = nextController;
    currentCode.value = initialCode || nextController.getCode();
    isReady.value = true;
    lastError.value = null;
  }

  function detachEditor(nextController?: LiveStrudelMirrorController) {
    if (nextController && controller.value !== nextController) {
      return;
    }

    controller.value = null;
    currentCode.value = "";
    isPlaying.value = false;
    isReady.value = false;
  }

  function syncCode(code: string) {
    currentCode.value = code;
  }

  function setPlaying(nextValue: boolean) {
    isPlaying.value = nextValue;
  }

  function setError(error: unknown) {
    lastError.value = error instanceof Error ? error.message : String(error);
  }

  async function play() {
    if (!controller.value || !hasPlayableContent(currentCode.value)) {
      isPlaying.value = false;
      return;
    }

    lastError.value = null;

    try {
      await controller.value.evaluate();
      isPlaying.value = true;
    } catch (error) {
      setError(error);
      isPlaying.value = false;
      throw error;
    }
  }

  async function stop() {
    if (!controller.value) {
      isPlaying.value = false;
      return;
    }

    try {
      await controller.value.stop();
    } finally {
      isPlaying.value = false;
    }
  }

  async function toggle() {
    if (isPlaying.value) {
      await stop();
      return;
    }

    await play();
  }

  return {
    attachEditor,
    detachEditor,
    syncCode,
    setPlaying,
    setError,
    play,
    stop,
    toggle,
    currentCode: readonly(currentCode),
    isPlaying: readonly(isPlaying),
    isReady: readonly(isReady),
    lastError: readonly(lastError),
    hasPlayableCode: computed(() => hasPlayableContent(currentCode.value)),
  };
}
