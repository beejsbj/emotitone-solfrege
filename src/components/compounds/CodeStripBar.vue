<template>
  <section class="code-strip-bar" aria-label="Pattern controls">
    <Button
      class="code-strip-bar__play"
      size="md"
      tone="brass"
      :haptic="haptic"
      :disabled="playDisabled"
      :accessible-name="isPlaying ? 'Stop' : 'Play'"
      :title="isPlaying ? 'Stop' : 'Play'"
      @click="emit('togglePlayback')"
    >
      <Square v-if="isPlaying" />
      <Play v-else />
    </Button>

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
      <Button
        size="md"
        tone="ink"
        :haptic="haptic"
        accessible-name="Delete last event"
        title="Delete last event"
        @click="emit('backspace')"
      >
        <BackspaceIcon />
      </Button>

      <Button
        size="md"
        tone="ivory"
        :haptic="haptic"
        accessible-name="Return"
        title="Return"
        @click="emit('return')"
      >
        <CornerDownLeft />
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { CornerDownLeft, Delete as BackspaceIcon, Play, Square } from "lucide-vue-next";
import Button from "@/components/primatives/Button.vue";
import CodeStrip from "@/components/uniques/CodeStrip/index.vue";
import type {
  CodeStripDensity,
  CodeStripDurationMode,
  CodeStripToken,
} from "@/components/uniques/CodeStrip/index.vue";

withDefaults(
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
  },
);

const emit = defineEmits<{
  togglePlayback: [];
  backspace: [];
  return: [];
}>();
</script>

<style scoped>
.code-strip-bar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: 40px;
  box-sizing: border-box;
  padding: 0;
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

.code-strip-bar__right {
  display: flex;
  align-items: center;
  gap: 0;
}
</style>
