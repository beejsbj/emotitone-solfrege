import { computed, readonly, ref } from "vue";
import { useInstrumentStore } from "@/stores/instrument";

export interface CodeStripStrudelController {
  getCode: () => string;
  setCode: (code: string) => void;
  evaluate: () => Promise<void>;
  stop: () => Promise<void> | void;
}

const controller = ref<CodeStripStrudelController | null>(null);
const currentCode = ref("");
const isPlaying = ref(false);
const isReady = ref(false);
const lastError = ref<string | null>(null);

function hasPlayableContent(code: string): boolean {
  let index = 0;
  while (index < code.length) {
    if (/\s/.test(code[index] ?? "")) {
      index += 1;
      continue;
    }
    if (code.startsWith("//", index)) {
      const newline = code.indexOf("\n", index + 2);
      index = newline < 0 ? code.length : newline + 1;
      continue;
    }
    if (code.startsWith("/*", index)) {
      const closing = code.indexOf("*/", index + 2);
      index = closing < 0 ? code.length : closing + 2;
      continue;
    }
    return true;
  }
  return false;
}

export function useCodeStripStrudel() {
  const instrumentStore = useInstrumentStore();

  function attachEditor(nextController: CodeStripStrudelController, initialCode = "") {
    controller.value = nextController;
    currentCode.value = initialCode || nextController.getCode();
    isReady.value = true;
    lastError.value = null;
  }

  function detachEditor(nextController?: CodeStripStrudelController) {
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
    if (
      !controller.value ||
      !hasPlayableContent(currentCode.value) ||
      instrumentStore.isInteractionLocked
    ) {
      isPlaying.value = false;
      return;
    }

    lastError.value = null;
    const selectionEpoch = instrumentStore.selectionEpoch;

    try {
      await controller.value.evaluate();
      if (
        instrumentStore.isInteractionLocked ||
        instrumentStore.selectionEpoch !== selectionEpoch
      ) {
        await controller.value.stop();
        isPlaying.value = false;
        return;
      }
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
