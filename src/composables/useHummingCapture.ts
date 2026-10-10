import { computed, onBeforeUnmount, readonly, ref, watch } from "vue";
import { createHummingStageBridge } from "@/services/hummingStage";
import {
  analyzePitchRecording,
  preparePitchAnalysisAudio,
  pitchAnalysisToPatternCandidates,
} from "@/services/pitchAnalysis";
import {
  startMicrophoneCapture,
  type MicrophoneCapture,
} from "@/services/microphoneCapture";
import { useInstrumentStore } from "@/stores/instrument";
import { useMusicStore } from "@/stores/music";
import { usePhrasesStore } from "@/stores/phrases";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type { Shape } from "@/types/instrument";
import type { ChromaticNote, MusicalMode } from "@/types/music";

export type HummingCaptureStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "preparing"
  | "analyzing"
  | "error";

export const HUMMING_RECORDING_LIMIT_SECONDS = 60;
const COUNTDOWN_REFRESH_MS = 250;

export function useHummingCapture() {
  const musicStore = useMusicStore();
  const instrumentStore = useInstrumentStore();
  const phrasesStore = usePhrasesStore();
  const visualConfigStore = useVisualConfigStore();
  const status = ref<HummingCaptureStatus>("idle");
  const error = ref<string | null>(null);
  const takePatternIds = ref<string[]>([]);
  const takeLabels = ref<string[]>([]);
  const selectedTakeIndex = ref(0);
  const importedNoteCount = ref(0);
  const remainingSeconds = ref(HUMMING_RECORDING_LIMIT_SECONDS);
  let limitTimer: ReturnType<typeof setTimeout> | null = null;
  let countdownTimer: ReturnType<typeof setInterval> | null = null;

  function stopWhenHidden() {
    if (document.visibilityState === "hidden") void stop();
  }

  function clearRecordingTimers() {
    document.removeEventListener("visibilitychange", stopWhenHidden);
    if (limitTimer != null) clearTimeout(limitTimer);
    if (countdownTimer != null) clearInterval(countdownTimer);
    limitTimer = null;
    countdownTimer = null;
  }

  let session: MicrophoneCapture | null = null;
  let pendingRecording: Promise<Blob> | null = null;
  let stageBridge: ReturnType<typeof createHummingStageBridge> | null = null;
  let requestController: AbortController | null = null;
  let generation = 0;
  let captureContext: {
    key: ChromaticNote;
    mode: MusicalMode;
    instrument: string;
    bpm: number;
    shape: Shape;
  } | null = null;

  // Live presentation follows the controls; analysis retains the take's starting context.
  const stopContextWatch = watch(
    () => [musicStore.currentKey, musicStore.currentMode, instrumentStore.currentInstrument],
    () => stageBridge?.updateContext({
      key: musicStore.currentKey as ChromaticNote,
      mode: musicStore.currentMode as MusicalMode,
      instrument: instrumentStore.currentInstrument,
    }),
    { flush: "sync" },
  );

  const isBusy = computed(() =>
    ["requesting", "preparing", "analyzing"].includes(status.value),
  );
  const isRecording = computed(() => status.value === "recording");
  const canToggle = computed(() => !isBusy.value);
  const statusMessage = computed(() => {
    if (status.value === "requesting") return "Requesting microphone access";
    if (status.value === "recording") {
      // Keep live-region text stable between the three countdown milestones.
      if (remainingSeconds.value <= 1) return "1 second left";
      if (remainingSeconds.value <= 5) return "5 seconds left";
      if (remainingSeconds.value <= 10) return "10 seconds left — your take saves automatically";
      return "Listening to your humming (60-second limit)";
    }
    if (status.value === "preparing") return "Preparing the recording";
    if (status.value === "analyzing") return "Analyzing the phrase";
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
    takePatternIds.value = [];
    takeLabels.value = [];
    selectedTakeIndex.value = 0;
    status.value = "requesting";
    remainingSeconds.value = HUMMING_RECORDING_LIMIT_SECONDS;
    captureContext = {
      key: musicStore.currentKey as ChromaticNote,
      mode: musicStore.currentMode as MusicalMode,
      instrument: instrumentStore.currentInstrument,
      bpm: visualConfigStore.config.codeStrip.bpm,
      shape: { ...instrumentStore.shape },
    };
    stageBridge = createHummingStageBridge(captureContext);

    try {
      const nextSession = await startMicrophoneCapture(
        (frame) => {
          if (generation === activeGeneration) stageBridge?.push(frame);
        },
        (caught) => {
          if (generation === activeGeneration) fail(caught);
        },
      );
      if (generation !== activeGeneration) {
        await nextSession.cancel();
        return;
      }
      session = nextSession;
      status.value = "recording";
      const deadline = performance.now() + HUMMING_RECORDING_LIMIT_SECONDS * 1000;
      countdownTimer = setInterval(() => {
        remainingSeconds.value = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
      }, COUNTDOWN_REFRESH_MS);
      limitTimer = setTimeout(() => {
        remainingSeconds.value = 0;
        void stop();
      }, HUMMING_RECORDING_LIMIT_SECONDS * 1000);
      document.addEventListener("visibilitychange", stopWhenHidden);
      stopWhenHidden();
    } catch (caught) {
      if (generation === activeGeneration) fail(caught);
    }
  }

  async function stop() {
    if (!isRecording.value || !session || !captureContext) return;
    clearRecordingTimers();
    const activeSession = session;
    const activeGeneration = generation;
    const activeContext = captureContext;
    session = null;
    stageBridge?.stop();
    stageBridge = null;
    status.value = "preparing";

    try {
      pendingRecording = activeSession.stop();
      const recording = await pendingRecording;
      if (generation !== activeGeneration) return;
      pendingRecording = null;
      const wav = await preparePitchAnalysisAudio(recording, HUMMING_RECORDING_LIMIT_SECONDS);
      if (generation !== activeGeneration) return;

      status.value = "analyzing";
      requestController = new AbortController();
      const analysis = await analyzePitchRecording(wav, {
        signal: requestController.signal,
      });
      if (generation !== activeGeneration) return;

      const candidates = pitchAnalysisToPatternCandidates(
        analysis,
        activeContext,
      );
      if (!candidates.length) {
        throw new Error("Pitch analysis could not find a stable note in that capture.");
      }

      // Notes played during the capture are already in the take; opening
      // the first capture sends that take to Recent rather than dropping it.
      const importedIds = phrasesStore.importPhrases(candidates, activeContext);
      takePatternIds.value = importedIds;
      takeLabels.value = candidates.map((candidate) => {
        const takeNumber = candidate.source?.takeNumber;
        return takeNumber == null ? candidate.name : `Take ${takeNumber}`;
      });
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
    phrasesStore.openPhrase(patternId);
  }

  async function cancel() {
    clearRecordingTimers();
    const activeGeneration = ++generation;
    requestController?.abort();
    requestController = null;
    stageBridge?.stop();
    stageBridge = null;
    const activeSession = session;
    session = null;
    const activeRecording = pendingRecording;
    await activeSession?.cancel();
    // Recorder completion includes monitor shutdown and release of the audio lease.
    await activeRecording?.catch(() => undefined);
    if (pendingRecording === activeRecording) pendingRecording = null;
    if (generation === activeGeneration && status.value !== "error") status.value = "idle";
  }

  function fail(caught: unknown) {
    clearRecordingTimers();
    stageBridge?.stop();
    stageBridge = null;
    session = null;
    pendingRecording = null;
    error.value = friendlyCaptureError(caught);
    status.value = "error";
  }

  onBeforeUnmount(() => {
    stopContextWatch();
    void cancel();
  });

  return {
    status: readonly(status),
    error: readonly(error),
    isBusy,
    isRecording,
    canToggle,
    statusMessage,
    remainingSeconds: readonly(remainingSeconds),
    takeCount: computed(() => takePatternIds.value.length),
    takeLabels: readonly(takeLabels),
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
