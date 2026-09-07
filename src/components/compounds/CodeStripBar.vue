<template>
  <section class="code-strip-bar" aria-label="Pattern controls">
    <div class="code-strip-bar__left">
      <Button
        class="code-strip-bar__play"
        size="sm"
        :tone="isPlaying ? 'ink' : 'ivory'"
        :haptic="haptic"
        :disabled="playDisabled"
        :accessible-name="isPlaying ? 'Stop' : 'Play'"
        :title="isPlaying ? 'Stop' : 'Play'"
        @click="emit('togglePlayback')"
      >
        <Square v-if="isPlaying" />
        <Play v-else />
      </Button>

      <Button
        class="code-strip-bar__humming"
        size="sm"
        :tone="hummingStatus === 'recording' ? 'ivory' : 'brass'"
        :haptic="haptic"
        :loading="hummingLoading"
        :disabled="hummingLoading"
        :accessible-name="hummingButtonLabel"
        :title="hummingButtonTitle"
        @click="emit('toggleHumming')"
      >
        <Check v-if="hummingStatus === 'recording'" />
        <Mic v-else />
      </Button>

      <Button
        v-if="hummingCanCancel"
        class="code-strip-bar__humming-cancel"
        size="sm"
        tone="ink"
        :haptic="haptic"
        accessible-name="Cancel humming capture"
        title="Cancel humming capture"
        @click="emit('cancelHumming')"
      >
        <X />
      </Button>
    </div>

    <div class="code-strip-bar__strip">
      <CodeStrip
        :tokens="tokens"
        :source="source"
        :density="density"
        :duration-mode="durationMode"
        :time-signature="timeSignature"
        :aria-label="ariaLabel"
        :framed="false"
      />
    </div>

    <div class="code-strip-bar__right">
      <select
        v-if="hummingTakeCount > 1"
        class="code-strip-bar__take-select"
        aria-label="Hummed take"
        :value="selectedHummingTake"
        @change="handleTakeSelection"
      >
        <option
          v-for="takeIndex in hummingTakeCount"
          :key="takeIndex - 1"
          :value="takeIndex - 1"
        >
          Take {{ takeIndex }}
        </option>
      </select>

      <Button
        size="sm"
        tone="ink"
        :haptic="haptic"
        accessible-name="Delete last event"
        title="Delete last event"
        @click="emit('backspace')"
      >
        <BackspaceIcon />
      </Button>

      <Button
        size="sm"
        tone="ivory"
        :haptic="haptic"
        accessible-name="Return"
        title="Return"
        @click="emit('return')"
      >
        <CornerDownLeft />
      </Button>
    </div>

    <output
      class="code-strip-bar__status"
      :role="hummingStatus === 'error' ? 'alert' : 'status'"
      aria-live="polite"
    >
      {{ hummingStatusMessage }}
    </output>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  Check,
  CornerDownLeft,
  Delete as BackspaceIcon,
  Mic,
  Play,
  Square,
  X,
} from "lucide-vue-next";
import Button from "@/components/primatives/Button.vue";
import CodeStrip from "@/components/uniques/CodeStrip/index.vue";
import type { HummingCaptureStatus } from "@/composables/useHummingCapture";
import type {
  CodeStripDensity,
  CodeStripDurationMode,
  CodeStripToken,
} from "@/components/uniques/CodeStrip/index.vue";

const props = withDefaults(
  defineProps<{
    isPlaying?: boolean;
    playDisabled?: boolean;
    haptic?: boolean;
    tokens?: CodeStripToken[];
    source?: string;
    density?: CodeStripDensity;
    durationMode?: CodeStripDurationMode;
    timeSignature?: string;
    ariaLabel?: string;
    hummingStatus?: HummingCaptureStatus;
    hummingError?: string | null;
    hummingStatusMessage?: string;
    hummingTakeCount?: number;
    selectedHummingTake?: number;
  }>(),
  {
    isPlaying: false,
    playDisabled: false,
    haptic: false,
    tokens: undefined,
    source: undefined,
    density: "dense",
    durationMode: "stacked",
    timeSignature: "4/4",
    ariaLabel: "Editable Strudel pattern",
    hummingStatus: "idle",
    hummingError: null,
    hummingStatusMessage: "Ready to capture a hummed pattern",
    hummingTakeCount: 0,
    selectedHummingTake: 0,
  },
);

const hummingLoading = computed(() =>
  ["requesting", "preparing", "analyzing"].includes(props.hummingStatus),
);
const hummingCanCancel = computed(() =>
  ["requesting", "recording", "preparing", "analyzing"].includes(
    props.hummingStatus,
  ),
);

const hummingButtonLabel = computed(() => {
  if (props.hummingStatus === "recording") return "Accept humming capture";
  if (props.hummingStatus === "error") return "Retry humming capture";
  if (props.hummingStatus === "requesting") return "Requesting microphone";
  if (["preparing", "analyzing"].includes(props.hummingStatus)) {
    return "Analyzing humming";
  }
  return "Start humming capture";
});

const hummingButtonTitle = computed(() =>
  props.hummingError ?? hummingButtonLabel.value,
);

const emit = defineEmits<{
  togglePlayback: [];
  toggleHumming: [];
  cancelHumming: [];
  selectHummingTake: [index: number];
  backspace: [];
  return: [];
}>();

function handleTakeSelection(event: Event) {
  emit(
    "selectHummingTake",
    Number((event.target as HTMLSelectElement).value),
  );
}
</script>

<style scoped>
.code-strip-bar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  column-gap: var(--s-4);
  width: 100%;
  min-width: 0;
  min-height: 40px;
  box-sizing: border-box;
  /* Reserve room for Button's paper offset, focus ring, and brass glow. */
  padding: var(--s-4) var(--s-5);
  border: 0;
  background-color: var(--instrument-bar-surface);
  -webkit-backdrop-filter: var(--instrument-bar-backdrop);
  backdrop-filter: var(--instrument-bar-backdrop);
}

.code-strip-bar__strip {
  display: flex;
  align-self: stretch;
  min-width: 0;
}

.code-strip-bar__left,
.code-strip-bar__right {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.code-strip-bar__right {
  min-width: 0;
}

.code-strip-bar__take-select {
  min-width: 0;
  max-width: 72px;
  height: 24px;
  padding: 0 var(--s-3);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 2px;
  background: var(--ink-3);
  color: var(--ivory-2);
  font: inherit;
  font-size: 9px;
}

.code-strip-bar__status {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
