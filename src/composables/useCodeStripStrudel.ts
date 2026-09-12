import { computed, readonly, ref, shallowRef } from "vue";
import { useInstrumentStore } from "@/stores/instrument";

export interface CodeStripStrudelController {
  getCode: () => string;
  setCode: (code: string) => void;
  evaluate: () => Promise<boolean | void>;
  stop: () => Promise<void> | void;
}

const controller = shallowRef<CodeStripStrudelController | null>(null);
const currentCode = ref("");
const isPlaying = ref(false);
const isReady = ref(false);
const lastError = ref<string | null>(null);
let playbackIntentEpoch = 0;

export function hasPlayableContent(code: string): boolean {
  let index = 0;
  while (index < code.length) {
    if (/\s/.test(code[index] ?? "")) {
      index += 1;
      continue;
    }
    if (code.startsWith("//", index)) {
      const remainder = code.slice(index + 2);
      const lineBreak = remainder.search(/[\r\n\u2028\u2029]/);
      index = lineBreak < 0 ? code.length : index + lineBreak + 3;
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
    playbackIntentEpoch += 1;
    controller.value = nextController;
    currentCode.value = initialCode || nextController.getCode();
    isReady.value = true;
    lastError.value = null;
  }

  function detachEditor(nextController?: CodeStripStrudelController) {
    if (nextController && controller.value !== nextController) {
      return;
    }

    playbackIntentEpoch += 1;
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
    const playEpoch = ++playbackIntentEpoch;
    const activeController = controller.value;
    if (
      !activeController ||
      !hasPlayableContent(currentCode.value) ||
      instrumentStore.isInteractionLocked
    ) {
      isPlaying.value = false;
      return;
    }

    lastError.value = null;
    const selectionEpoch = instrumentStore.selectionEpoch;

    try {
      const accepted = await activeController.evaluate();
      if (
        playEpoch !== playbackIntentEpoch ||
        controller.value !== activeController
      ) return;
      if (accepted === false) {
        isPlaying.value = false;
        return;
      }
      if (
        instrumentStore.isInteractionLocked ||
        instrumentStore.selectionEpoch !== selectionEpoch
      ) {
        await activeController.stop();
        if (
          playEpoch === playbackIntentEpoch &&
          controller.value === activeController
        ) isPlaying.value = false;
        return;
      }
      isPlaying.value = true;
    } catch (error) {
      if (
        playEpoch === playbackIntentEpoch &&
        controller.value === activeController
      ) {
        setError(error);
        isPlaying.value = false;
      }
      throw error;
    }
  }

  async function stop() {
    playbackIntentEpoch += 1;
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
