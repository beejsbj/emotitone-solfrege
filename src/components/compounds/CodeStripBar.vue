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
    </div>

    <div class="code-strip-bar__strip">
      <CodeStrip
        :usage="resolvedUsage"
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

  </section>
</template>

<script setup lang="ts">
import {
  CornerDownLeft,
  Delete as BackspaceIcon,
  Play,
  Square,
} from "lucide-vue-next";
import Button from "@/components/primatives/Button.vue";
import CodeStrip from "@/components/uniques/CodeStrip/index.vue";
import type {
  CodeStripDensity,
  CodeStripDurationMode,
  CodeStripToken,
} from "@/components/uniques/CodeStrip/index.vue";

const props = withDefaults(
  defineProps<{
    usage?: "production" | "controlled";
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
    usage: undefined,
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

const resolvedUsage = props.usage
  ?? (props.tokens !== undefined || props.source !== undefined ? "controlled" : "production");

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
  column-gap: var(--s-4);
  width: 100%;
  min-width: 0;
  min-height: 40px;
  box-sizing: border-box;
  /* Reserve room for Button's paper offset and focus ring. */
  padding: var(--s-4) var(--s-5);
  border: 0;
  background-color: var(--instrument-bar-surface);
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

</style>
