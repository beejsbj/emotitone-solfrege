<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import LoadingScreen from "@/components/compositions/LoadingScreen.vue";
import { useAppLoading } from "@/composables/useAppLoading";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";

interface Props {
  autoStart?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  autoStart: true,
});

const keyboardDrawerStore = useKeyboardDrawerStore();
const {
  loadingState,
  isVisible,
  overallProgress,
  updatePhase,
  enableAudioContext,
  initializeInstruments,
  initializeVisualEffects,
  hideSplash,
  skipLoading,
  resetLoading,
} = useAppLoading();

const audioInitializing = ref(false);
const isDev = import.meta.env.DEV;

const isComplete = computed(() => loadingState.progress.overall.isComplete);

const needsAudioInteraction = computed(() => (
  loadingState.progress.audioContext.phase === "audio-context" &&
  !loadingState.progress.audioContext.isComplete &&
  Boolean(loadingState.progress.audioContext.error)
));

const hasError = computed(() => (
  Object.values(loadingState.progress).some((state) => state.error)
));

const errorMessage = computed(() => {
  const errorState = Object.values(loadingState.progress).find((state) => state.error);
  return errorState?.error || "An error occurred during initialization";
});

const midiMessage = computed(() => {
  const midi = keyboardDrawerStore.midi;

  if (!midi.isSupported) return "MIDI is unavailable in this browser; touch and QWERTY still work.";
  if (midi.isConnecting) return "Requesting browser MIDI access.";
  if (midi.lastError) return "MIDI permission was not granted; touch and QWERTY still work.";

  if (midi.connectedInputs.length > 0) {
    const roliSync = midi.syncedOutput ? ` Live sync: ${midi.syncedOutput}.` : "";
    return `MIDI ready: ${midi.connectedInputs.join(", ")}.${roliSync}`;
  }

  if (midi.isListening) {
    return midi.syncedOutput
      ? `MIDI ready. Live sync armed on ${midi.syncedOutput}.`
      : "MIDI ready. Connect a controller anytime.";
  }

  return "A connected controller may trigger a browser MIDI permission request.";
});

const phase = computed(() => {
  if (isComplete.value) return "Ready to play";
  return loadingState.progress.overall.message || "Starting soundcheck";
});

const message = computed(() => {
  if (isComplete.value) return "Everything is tuned. Your first note is waiting.";

  const instrumentMessage = loadingState.progress.instruments.message;
  if (
    !loadingState.progress.instruments.isComplete &&
    instrumentMessage &&
    instrumentMessage !== loadingState.progress.overall.message
  ) {
    return instrumentMessage;
  }

  return "Preparing the room where sound becomes shape.";
});

/** The loading phase behind each counted beat; the fourth beat is Ready itself. */
const STAGE_PHASES = ["visualEffects", "instruments", "audioContext"] as const;

const stages = computed(() => {
  const { visualEffects, instruments, audioContext } = loadingState.progress;
  // Each tile reports its own phase, so a held phase (a failed load, blocked audio) stays the active beat.
  const ready = isComplete.value && audioContext.isComplete && !hasError.value;
  const midi = keyboardDrawerStore.midi;
  const midiCheckComplete = ready && !midi.isConnecting;
  const midiStamp = !midi.isSupported ? "N/A" : midi.lastError ? "SKIP" : "SET";
  const definitions = [
    { label: "Visual stage", complete: visualEffects.isComplete },
    { label: "Instrument samples", complete: instruments.isComplete },
    { label: "Audio system", complete: audioContext.isComplete },
    { label: "Ready to play", complete: ready },
    {
      label: "MIDI input",
      complete: midiCheckComplete,
      icon: "midi" as const,
      optional: true,
      detail: midiMessage.value,
      stamp: midiStamp,
    },
  ];
  const activeIndex = definitions.findIndex((stage) => !stage.complete);

  return definitions.map((stage, index) => ({
    ...stage,
    active: index === activeIndex,
  }));
});

/** How far the active beat's own phase has loaded, so its tile fills truthfully. */
const stageProgress = computed(() => {
  const active = stages.value.findIndex((stage) => !stage.optional && stage.active);
  const phase = STAGE_PHASES[active];
  return phase ? loadingState.progress[phase].progress / 100 : undefined;
});

/** Resume audio inside the tap; the splash closes only once the browser lets sound run. */
async function startAudioThenEnter() {
  let started = false;
  try {
    started = await enableAudioContext();
  } catch (error) {
    console.error("Error enabling audio:", error);
  }
  if (!started) return; // needsAudioInteraction now holds the splash on the Enable Audio cue.

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  hideSplash(reducedMotion ? 0 : 500);
}

async function handleEnableAudio() {
  audioInitializing.value = true;
  try {
    await startAudioThenEnter();
  } finally {
    audioInitializing.value = false;
  }
}

function startInitialization() {
  if (!props.autoStart) return;

  void (async () => {
    try {
      await initializeVisualEffects();
      await initializeInstruments();
      // A failed load holds the count on its own beat; the audio beat waits for the retry.
      if (loadingState.progress.instruments.error) return;
      updatePhase("audioContext", {
        phase: "audio-context",
        progress: 100,
        message: "Audio ready (will enable when you start)",
        isComplete: true,
      });
    } catch (error) {
      console.error("Initialization error:", error);
    }
  })();
}

function handleRetry() {
  resetLoading();
  startInitialization();
}

function handleStartApp() {
  return startAudioThenEnter();
}

onMounted(startInitialization);
</script>

<template>
  <Transition name="splash">
    <LoadingScreen
      v-if="isVisible"
      mode="app"
      :progress="overallProgress"
      :stages="stages"
      :stage-progress="stageProgress"
      :phase="phase"
      :message="message"
      :show-progress="loadingState.config.showProgress"
      :show-messages="loadingState.config.showMessages"
      :is-complete="isComplete"
      :needs-audio-interaction="needsAudioInteraction"
      :audio-initializing="audioInitializing"
      :has-error="hasError"
      :error-message="errorMessage"
      :is-dev="isDev"
      @enable-audio="handleEnableAudio"
      @start="handleStartApp"
      @retry="handleRetry"
      @skip="skipLoading"
    />
  </Transition>
</template>

<style>
.splash-enter-active {
  transition: opacity 450ms cubic-bezier(.215, .61, .355, 1);
}

.splash-leave-active {
  transition: opacity 500ms cubic-bezier(.215, .61, .355, 1), transform 500ms cubic-bezier(.215, .61, .355, 1);
}

.splash-enter-from,
.splash-leave-to {
  opacity: 0;
}

.splash-leave-to { transform: scale(1.01); }

@media (prefers-reduced-motion: reduce) {
  .splash-enter-active,
  .splash-leave-active { transition: none; }

  .splash-leave-to { transform: none; }
}
</style>
