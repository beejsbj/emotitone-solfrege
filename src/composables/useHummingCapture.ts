import { computed, onBeforeUnmount, readonly, ref } from "vue";
import { createHummingStageBridge } from "@/services/hummingStage";
import {
  analyzeWithMelograph,
  audioBlobToMelographWav,
  melographAnalysisToPatternCandidates,
} from "@/services/melograph";
import {
  startMicrophoneCapture,
  type MicrophoneCapture,
} from "@/services/melographLivePitch";
import { useInstrumentStore } from "@/stores/instrument";
import { useMusicStore } from "@/stores/music";
import { usePatternsStore } from "@/stores/patterns";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type { ChromaticNote, MusicalMode } from "@/types/music";

export type HummingCaptureStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "preparing"
  | "analyzing"
  | "error";

const MAX_CAPTURE_MS = 45_000;

export function useHummingCapture() {
  const musicStore = useMusicStore();
  const instrumentStore = useInstrumentStore();
  const patternsStore = usePatternsStore();
  const visualConfigStore = useVisualConfigStore();
  const status = ref<HummingCaptureStatus>("idle");
  const error = ref<string | null>(null);
  const takePatternIds = ref<string[]>([]);
  const selectedTakeIndex = ref(0);
  const importedNoteCount = ref(0);

  let session: MicrophoneCapture | null = null;
  let stageBridge: ReturnType<typeof createHummingStageBridge> | null = null;
  let timeoutId: number | null = null;
  let requestController: AbortController | null = null;
  let generation = 0;
  let captureContext: {
    key: ChromaticNote;
    mode: MusicalMode;
    instrument: string;
    bpm: number;
  } | null = null;

  const isBusy = computed(() =>
    ["requesting", "preparing", "analyzing"].includes(status.value),
  );
  const isRecording = computed(() => status.value === "recording");
  const canToggle = computed(() => !isBusy.value);
  const statusMessage = computed(() => {
    if (status.value === "requesting") return "Requesting microphone access";
    if (status.value === "recording") return "Listening to your humming";
    if (status.value === "preparing") return "Preparing the recording";
    if (status.value === "analyzing") return "Melograph is analyzing the phrase";
    if (status.value === "error") return error.value ?? "Humming capture failed";
    if (importedNoteCount.value) {
      const takes = takePatternIds.value.length;
      return `${importedNoteCount.value} notes added from ${takes} ${takes === 1 ? "take" : "takes"}`;
    }
    return "Ready to capture a hummed pattern";
  });

  async function start() {
    if (isBusy.value || isRecording.value) return;
    const activeGeneration = ++generation;
    error.value = null;
    importedNoteCount.value = 0;
    status.value = "requesting";
    captureContext = {
      key: musicStore.currentKey as ChromaticNote,
      mode: musicStore.currentMode as MusicalMode,
      instrument: instrumentStore.currentInstrument,
      bpm: visualConfigStore.config.codeStrip.bpm,
    };
    stageBridge = createHummingStageBridge(captureContext);

    try {
      const nextSession = await startMicrophoneCapture((frame) => {
        if (generation === activeGeneration) stageBridge?.push(frame);
      });
      if (generation !== activeGeneration) {
        await nextSession.cancel();
        return;
      }
      session = nextSession;
      status.value = "recording";
      timeoutId = window.setTimeout(() => void stop(), MAX_CAPTURE_MS);
    } catch (caught) {
      if (generation === activeGeneration) fail(caught);
    }
  }

  async function stop() {
    if (status.value !== "recording" || !session || !captureContext) return;
    const activeGeneration = generation;
    const activeSession = session;
    const activeContext = captureContext;
    session = null;
    clearCaptureTimeout();
    stageBridge?.stop();
    stageBridge = null;
    status.value = "preparing";

    try {
      const recording = await activeSession.stop();
      if (generation !== activeGeneration) return;
      const wav = await audioBlobToMelographWav(recording);
      if (generation !== activeGeneration) return;

      status.value = "analyzing";
      requestController = new AbortController();
      const analysis = await analyzeWithMelograph(wav, {
        signal: requestController.signal,
      });
      if (generation !== activeGeneration) return;

      const candidates = melographAnalysisToPatternCandidates(
        analysis,
        activeContext,
      );
      if (!candidates.length) {
        throw new Error("Melograph could not find a stable note in that capture.");
      }

      const importedIds = patternsStore.importPatternCandidates(
        candidates,
        activeContext,
      );
      takePatternIds.value = importedIds;
      selectedTakeIndex.value = 0;
      importedNoteCount.value = candidates.reduce(
        (total, candidate) => total + candidate.notes.length,
        0,
      );
      status.value = "idle";
      error.value = null;
    } catch (caught) {
      if (generation === activeGeneration) fail(caught);
    } finally {
      if (generation === activeGeneration) requestController = null;
    }
  }

  async function toggle() {
    if (isRecording.value) {
      await stop();
    } else {
      await start();
    }
  }

  function selectTake(index: number) {
    const patternId = takePatternIds.value[index];
    if (!patternId) return;
    selectedTakeIndex.value = index;
    patternsStore.loadPatternAsBase(patternId);
  }

  async function cancel() {
    generation += 1;
    clearCaptureTimeout();
    requestController?.abort();
    requestController = null;
    stageBridge?.stop();
    stageBridge = null;
    const activeSession = session;
    session = null;
    await activeSession?.cancel();
    if (status.value !== "error") status.value = "idle";
  }

  function fail(caught: unknown) {
    clearCaptureTimeout();
    stageBridge?.stop();
    stageBridge = null;
    session = null;
    error.value = friendlyCaptureError(caught);
    status.value = "error";
  }

  function clearCaptureTimeout() {
    if (timeoutId == null) return;
    window.clearTimeout(timeoutId);
    timeoutId = null;
  }

  onBeforeUnmount(() => {
    void cancel();
  });

  return {
    status: readonly(status),
    error: readonly(error),
    isBusy,
    isRecording,
    canToggle,
    statusMessage,
    takeCount: computed(() => takePatternIds.value.length),
    selectedTakeIndex: readonly(selectedTakeIndex),
    start,
    stop,
    toggle,
    selectTake,
    cancel,
  };
}

function friendlyCaptureError(caught: unknown) {
  if (caught instanceof DOMException && caught.name === "NotAllowedError") {
    return "Microphone permission was not granted.";
  }
  if (caught instanceof Error) return caught.message;
  return "Humming capture failed.";
}
