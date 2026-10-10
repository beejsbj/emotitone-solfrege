<template>
  <Teleport to="body">
    <div class="humming-capture-transport">
      <Button
        class="humming-capture-transport__primary"
        size="md"
        :tone="canAccept ? 'ivory' : 'brass'"
        :haptic="haptic"
        :loading="loading"
        :disabled="loading"
        :accessible-name="buttonLabel"
        :title="buttonTitle"
        @click="emit('toggle')"
      >
        <Check v-if="canAccept" />
        <Mic v-else />
      </Button>

      <span v-if="canCancel" class="humming-capture-transport__cancel-slot">
        <Button
          class="humming-capture-transport__cancel"
          size="sm"
          tone="ink"
          :haptic="haptic"
          accessible-name="Cancel humming capture"
          title="Cancel humming capture"
          @click="emit('cancel')"
        >
          <X />
        </Button>
      </span>

      <div
        v-if="status === 'error' || takeLabels.length > 1"
        class="humming-capture-transport__feedback"
      >
        <p
          v-if="status === 'error'"
          class="humming-capture-transport__error"
          role="alert"
        >
          {{ statusMessage }}
        </p>
        <select
          v-if="takeLabels.length > 1"
          class="humming-capture-transport__take-select"
          aria-label="Hummed take"
          :value="selectedTakeIndex"
          @change="handleTakeSelection"
        >
          <option
            v-for="(takeLabel, takeIndex) in takeLabels"
            :key="`${takeIndex}-${takeLabel}`"
            :value="takeIndex"
          >
            {{ takeLabel }}
          </option>
        </select>
      </div>

      <p
        v-if="status === 'recording'"
        class="humming-capture-transport__feedback humming-capture-transport__countdown"
        aria-hidden="true"
      >
        {{ remainingSeconds <= 10
          ? `${remainingSeconds} ${remainingSeconds === 1 ? 'second' : 'seconds'} left — your take saves automatically`
          : statusMessage }}
      </p>

      <output
        v-if="status !== 'error'"
        class="humming-capture-transport__status"
        role="status"
        aria-live="polite"
      >
        {{ statusMessage }}
      </output>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Check, Mic, X } from "lucide-vue-next";
import Button from "@/components/primatives/Button.vue";
import type { HummingCaptureStatus } from "@/composables/useHummingCapture";

const props = withDefaults(defineProps<{
  status?: HummingCaptureStatus;
  error?: string | null;
  statusMessage?: string;
  remainingSeconds?: number;
  takeLabels?: readonly string[];
  selectedTakeIndex?: number;
  haptic?: boolean;
}>(), {
  status: "idle",
  error: null,
  statusMessage: "Ready to capture a hummed pattern",
  remainingSeconds: 60,
  takeLabels: () => [],
  selectedTakeIndex: 0,
  haptic: false,
});

const loading = computed(() =>
  ["requesting", "preparing", "analyzing"].includes(props.status),
);
const canAccept = computed(() => props.status === "recording");
const canCancel = computed(() =>
  ["requesting", "recording", "preparing", "analyzing"].includes(props.status),
);
const buttonLabel = computed(() => {
  if (canAccept.value) return "Accept humming capture";
  if (props.status === "error") return "Retry humming capture";
  if (props.status === "requesting") return "Requesting microphone";
  if (["preparing", "analyzing"].includes(props.status)) return "Analyzing humming";
  return "Start humming capture";
});
const buttonTitle = computed(() => props.error ?? buttonLabel.value);
const emit = defineEmits<{
  toggle: [];
  cancel: [];
  selectTake: [index: number];
}>();

function handleTakeSelection(event: Event) {
  emit("selectTake", Number((event.target as HTMLSelectElement).value));
}
</script>

<style scoped>
.humming-capture-transport {
  --humming-primary-size: 28px;
  --humming-cancel-size: 22.4px;

  position: fixed;
  z-index: 110;
  top: calc(env(safe-area-inset-top, 0px) + var(--s-5));
  left: 50%;
  display: inline-flex;
  pointer-events: auto;
  transform: translateX(-50%);
}

.humming-capture-transport .humming-capture-transport__primary {
  --button-size: var(--humming-primary-size);
  inline-size: var(--humming-primary-size);
  block-size: var(--humming-primary-size);
}

.humming-capture-transport .humming-capture-transport__cancel {
  --button-size: var(--humming-cancel-size);
  inline-size: var(--humming-cancel-size);
  block-size: var(--humming-cancel-size);
}

.humming-capture-transport__cancel-slot {
  position: absolute;
  top: 50%;
  /* Far enough out that the two keys' --hit-min touches meet without
     overlapping: half of each touch, less half of each face. */
  left: calc(100% + var(--hit-min) - (var(--humming-primary-size) + var(--humming-cancel-size)) / 2);
  display: flex;
  transform: translateY(-50%);
}

.humming-capture-transport__feedback {
  position: absolute;
  top: calc(100% + var(--s-3));
  left: 50%;
  display: grid;
  width: max-content;
  max-width: min(280px, calc(100vw - 2 * var(--s-5)));
  justify-items: center;
  gap: var(--s-2);
  transform: translateX(-50%);
}

.humming-capture-transport__error,
.humming-capture-transport__countdown,
.humming-capture-transport__take-select {
  border: 1px solid var(--hairline);
  border-radius: var(--r-xs);
  background: var(--ink-3);
  color: var(--ivory-2);
  font: var(--t-mono);
  font-size: 9px;
}

.humming-capture-transport__error,
.humming-capture-transport__countdown {
  margin: 0;
  padding: var(--s-3) var(--s-4);
  line-height: 1.35;
  text-align: center;
}

.humming-capture-transport__take-select {
  /* A take list is a field: at least the no-zoom text size and a full touch. */
  min-block-size: var(--hit-min);
  padding: 0 var(--s-3);
  font-size: var(--input-text-min);
}

.humming-capture-transport__status {
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

@media (max-width: 480px) {
  .humming-capture-transport {
    top: calc(env(safe-area-inset-top, 0px) + var(--s-4));
  }
}
</style>
