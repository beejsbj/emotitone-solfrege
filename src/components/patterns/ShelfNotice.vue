<template>
  <section
    class="shelf-notice"
    :class="[`shelf-notice--${state}`, { 'shelf-notice--busy': busy }]"
    :data-shelf-notice="state"
    :data-reel-busy="busy ? 'true' : undefined"
    :aria-hidden="busy ? 'true' : undefined"
    :inert="busy || undefined"
    :aria-label="copy.label"
  >
    <span class="shelf-notice__lamp" aria-hidden="true" />
    <p class="shelf-notice__line" :role="state === 'failed' ? 'alert' : 'status'">
      {{ copy.line }}<span class="shelf-notice__sr">{{ hint }}</span>
    </p>
    <Button
      v-if="oldestTitle"
      class="shelf-notice__release"
      size="xs"
      :tone="armed ? 'ivory' : 'ink'"
      :accessible-name="armed ? 'Confirm release oldest Recent' : 'Release oldest Recent'"
      :title="releaseTitle"
      @click="emit('release')"
    >
      <Check v-if="armed" />
      <Trash2 v-else />
    </Button>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Check, Trash2 } from "lucide-vue-next";
import Button from "@/components/primatives/Button.vue";

/*
 * The phrase shelf's storage notice: one thin Ink strip floating over the
 * Stage. Two honest states told by the lamp and the words, never by a border:
 * over budget still saves; failed means the browser refused the write.
 */
export type ShelfNoticeState = "over-budget" | "failed";

const props = defineProps<{
  state: ShelfNoticeState;
  /** The oldest Recent phrase's title; absent when no Recent can be released. */
  oldestTitle?: string;
  /** The release key has been tapped once and waits for confirmation. */
  armed?: boolean;
  /** The reel is being scrolled: step aside so the unwound wheel stays visible. */
  busy?: boolean;
}>();

const emit = defineEmits<{ release: [] }>();

const copy = computed(() => props.state === "failed"
  ? { label: "Not saving", line: "New sketches are not being saved" }
  : { label: "Shelf full", line: "Shelf full · still saving" });

// While nothing saves, what was played lives only in this tab.
const KEEP_TAB = "Keep this tab open: closing or reloading it loses new sketches.";

// What the line can't fit, for screen readers only.
const hint = computed(() => {
  const keep = props.state === "failed" ? ` ${KEEP_TAB}` : "";
  if (!props.oldestTitle) {
    return `.${keep} No Recent phrases to release. Copy any phrases you want to save before deleting them from the reel.`;
  }
  const ask = props.state === "failed" ? "Free space" : "Free some space soon";
  return `.${keep} ${ask}: release the oldest Recent, ${props.oldestTitle}.`;
});

const releaseTitle = computed(() => {
  const action = props.armed ? `Tap again to release ${props.oldestTitle}` : `Release ${props.oldestTitle}`;
  return props.state === "failed" ? `${action}. Not saving: keep this tab open` : action;
});
</script>

<style scoped>
/* Chassis, not music: a flat opaque Ink strip with Ivory type and no border.
   The only signal is a small Brass lamp; no Music Color, no brand paper. */
.shelf-notice {
  display: flex;
  align-items: center;
  gap: var(--s-5);
  box-sizing: border-box;
  /* Thin: one line around the inline xs keycap, with the same --s-3 margin
     above, below and beside it, wide enough to hold the lip's full hit ring
     and the UIBeat swell. Its touch floor still reaches --hit-min,
     overhanging the strip onto bare Stage. */
  padding-block: var(--s-3);
  padding-inline: var(--s-6) var(--s-3);
  /* The deck's own panel Ink, so the strip reads as chassis over the Stage. */
  background: var(--ink-3);
  color: var(--ivory);
  border-radius: var(--r-xs);
  transition: opacity var(--dur-ui) var(--ease-brush), visibility 0s;
}

.shelf-notice--busy {
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--dur-tap) var(--ease-brush), visibility 0s linear var(--dur-tap);
}

/* Over budget: an unlit Brass lamp, a warning. Failed: lit, with its glow. */
.shelf-notice__lamp {
  flex: 0 0 auto;
  inline-size: 6px;
  block-size: 6px;
  border-radius: 50%;
  background: var(--brass-lo);
}

.shelf-notice--failed .shelf-notice__lamp {
  background: var(--brass-hi);
  box-shadow: var(--shadow-glow-brass);
}

.shelf-notice__line {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font: var(--t-mono);
  color: var(--ivory);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Room under the key for its lit lip, which hangs --s-2 below the switch,
   so cap and lip together sit centred on the line with even margins. */
.shelf-notice__release {
  margin-block-end: var(--s-2);
}

.shelf-notice__sr {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@keyframes shelf-notice-in {
  from { opacity: 0; translate: 0 var(--s-3); }
  to { opacity: 1; translate: 0 0; }
}

@media (prefers-reduced-motion: no-preference) {
  .shelf-notice:not(.shelf-notice--busy) {
    animation: shelf-notice-in var(--dur-ui) var(--ease-brush);
  }
}

@media (prefers-reduced-motion: reduce) {
  .shelf-notice,
  .shelf-notice--busy {
    animation: none;
    transition: none;
  }
}

@media (forced-colors: active) {
  .shelf-notice {
    background: Canvas;
    color: CanvasText;
    outline: 1px solid CanvasText;
  }

  .shelf-notice__lamp {
    background: CanvasText;
    box-shadow: none;
  }
}
</style>
