<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useAppLoading } from "@/composables/useAppLoading";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import LoadingScreen from "@/components/compositions/LoadingScreen.vue";

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

  if (!midi.isSupported) return "";
  if (midi.isConnecting) return "Requesting browser MIDI access...";
  if (midi.lastError) return "MIDI permission was not granted. Touch and QWERTY still work.";

  if (midi.connectedInputs.length > 0) {
    const roliSync = midi.syncedOutput ? ` Live sync: ${midi.syncedOutput}.` : "";
    return `MIDI ready: ${midi.connectedInputs.join(", ")}.${roliSync}`;
  }

  if (midi.isListening) {
    return midi.syncedOutput
      ? `MIDI ready. Live sync armed on ${midi.syncedOutput}.`
      : "MIDI ready. Connect a controller anytime.";
  }

  return "If you have a controller connected, your browser may ask for MIDI access.";
});

const showMidiMessage = computed(() => Boolean(midiMessage.value));

const loadingChecks = computed(() => [
  { label: "Audio system", complete: loadingState.progress.audioContext.isComplete },
  { label: "All instruments", complete: loadingState.progress.instruments.isComplete },
  { label: "Visual engine", complete: loadingState.progress.visualEffects.isComplete },
]);

const stepMessage = computed(() => {
  const instruments = loadingState.progress.instruments;
  if (
    !instruments.isComplete &&
    instruments.message &&
    instruments.message !== loadingState.progress.overall.message
  ) {
    return instruments.message;
  }

  return "";
});

const handleEnableAudio = async () => {
  audioInitializing.value = true;
  try {
    const success = await enableAudioContext();
    if (success) {
      await initializeInstruments();
      await initializeVisualEffects();
    }
  } catch (error) {
    console.error("Error enabling audio:", error);
  } finally {
    audioInitializing.value = false;
  }
};

const handleRetry = () => {
  resetLoading();
  startInitialization();
};

const handleStartApp = async () => {
  try {
    await enableAudioContext();
  } catch {
    // Audio can still be enabled by the first user note.
  }

  hideSplash();
};

const startInitialization = async () => {
  if (!props.autoStart) return;

  try {
    await initializeVisualEffects();
    await initializeInstruments();
    updatePhase("audioContext", {
      phase: "audio-context",
      progress: 100,
      message: "Audio ready (will enable when you start)",
      isComplete: true,
    });
  } catch (error) {
    console.error("Initialization error:", error);
  }
};

onMounted(() => {
  startInitialization();
});
</script>

<template>
  <Transition name="splash">
    <LoadingScreen
      v-if="isVisible"
      mode="app"
      :progress="overallProgress"
      :phase-label="loadingState.progress.overall.message"
      :step-message="loadingState.config.showMessages ? stepMessage : ''"
      :midi-message="midiMessage"
      :show-midi-message="loadingState.config.showMessages && showMidiMessage"
      :show-progress="loadingState.config.showProgress"
      :is-complete="loadingState.progress.overall.isComplete"
      :needs-audio-interaction="needsAudioInteraction"
      :audio-initializing="audioInitializing"
      :has-error="hasError && !loadingState.progress.overall.isComplete"
      :error-message="errorMessage"
      :is-dev="isDev"
      :checks="loadingChecks"
      @enable-audio="handleEnableAudio"
      @retry="handleRetry"
      @start="handleStartApp"
      @skip="skipLoading"
    />
  </Transition>
</template>

<style scoped>
.splash-enter-active {
  transition: opacity 0.45s ease;
}

.splash-leave-active {
  transition: opacity 0.65s ease, transform 0.65s ease;
}

.splash-enter-from {
  opacity: 0;
}

.splash-leave-to {
  opacity: 0;
  transform: scale(1.015);
}
</style>
