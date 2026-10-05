<template>
  <section class="code-strip-bar" aria-label="Pattern controls">
    <div class="code-strip-bar__left">
      <BeatIndicator
        class="code-strip-bar__beat"
        aria-label="Pattern beat"
      >
        <Button
          class="code-strip-bar__play"
          size="sm"
          :tone="isPlaying ? 'ink' : 'ivory'"
          :haptic="haptic"
          :disabled="playDisabled"
          :class="{ 'paper-button--loading code-strip-bar__play--latched': playLatched }"
          :accessible-name="isPlaying ? 'Stop' : 'Play'"
          :title="isPlaying ? 'Stop' : 'Play'"
          @pointerdown="playDown"
          @pointerup="playCancel"
          @pointercancel="playCancel"
          @contextmenu.prevent
          @click="playClick"
        >
          <Square v-if="isPlaying" />
          <Play v-else />
        </Button>
      </BeatIndicator>
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
import BeatIndicator from "@/components/compounds/BeatIndicator.vue";
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
    /** PROTOTYPE: latch is on (hold Play); the key runs its loading orbit. */
    playLatched?: boolean;
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
    playLatched: false,
    tokens: undefined,
    source: undefined,
    density: "dense",
    durationMode: "bar",
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
  playHold: [];
}>();

// PROTOTYPE: holding Play latches the Looper; the click that ends a hold is swallowed.
const PLAY_HOLD_MS = 450;
let playHoldTimer: ReturnType<typeof setTimeout> | undefined;
let playHeld = false;
function playDown() {
  playHeld = false;
  clearTimeout(playHoldTimer);
  playHoldTimer = setTimeout(() => {
    playHeld = true;
    emit("playHold");
  }, PLAY_HOLD_MS);
}
// The key moves under the finger when pressed, so leaving it does not cancel
// the hold; only lifting does.
function playCancel() {
  clearTimeout(playHoldTimer);
  // If the lift lands off the key no click follows; don't swallow the next one.
  setTimeout(() => { playHeld = false; }, 80);
}
function playClick() {
  clearTimeout(playHoldTimer);
  if (playHeld) playHeld = false;
  else emit("togglePlayback");
}

</script>

<style scoped>
/* The latched Play key keeps its icon readable under the loading orbit. */
.code-strip-bar__play--latched :deep(.paper-button__content) {
  opacity: 1;
}

.code-strip-bar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  column-gap: var(--s-4);
  width: 100%;
  min-width: 0;
  min-height: 40px;
  box-sizing: border-box;
  /* Reserve room for Button's lit lip and focus ring. */
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

.code-strip-bar__beat {
  flex: 0 0 auto;
  /* Centre the 32px key in the 40px editor row. Its crown uses the block
     inset above it, so the opaque rail keeps its 56px footprint. */
  margin-block: var(--s-2);
}

</style>
