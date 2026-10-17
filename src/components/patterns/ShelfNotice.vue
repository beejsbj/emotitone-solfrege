<template>
  <section
    class="shelf-notice"
    :class="[`shelf-notice--${state}`, { 'shelf-notice--busy': busy }]"
    :data-shelf-notice="state"
    :data-reel-busy="busy ? 'true' : undefined"
    :aria-hidden="busy ? 'true' : undefined"
    :inert="busy || undefined"
    :aria-label="copy.heading"
  >
    <span class="shelf-notice__lamp" aria-hidden="true" />
    <div class="shelf-notice__text">
      <p :role="state === 'failed' ? 'alert' : 'status'">
        <span class="shelf-notice__heading">{{ copy.heading }}</span>
        <span class="shelf-notice__body">{{ copy.body }}</span>
      </p>
      <p class="shelf-notice__detail">
        {{ oldestTitle
          ? `Oldest Recent: ${oldestTitle}`
          : "No Recent phrases to release. Copy any phrases you want to save before deleting them from the reel." }}
      </p>
    </div>
    <div v-if="oldestTitle" class="shelf-notice__action">
      <Button
        size="sm"
        :tone="armed ? 'brass' : 'ink'"
        :accessible-name="armed ? 'Confirm release oldest Recent' : 'Release oldest Recent'"
        :title="armed ? 'Confirm release oldest Recent' : 'Release oldest Recent'"
        @click="emit('release')"
      >
        <Check v-if="armed" />
        <Trash2 v-else />
      </Button>
      <span class="shelf-notice__action-label" aria-hidden="true">{{ armed ? "Tap again" : "Release" }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Check, Trash2 } from "lucide-vue-next";
import Button from "@/components/primatives/Button.vue";

/*
 * The phrase shelf's storage notice: an Ink display floating over the Stage,
 * with Brass as the attention signal (Burooj, 2026-10-17). Two honest states:
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
  ? {
    heading: "Not saving",
    body: "New sketches are not being saved. They stay in this tab until there is room.",
  }
  : {
    heading: "Shelf full",
    body: "Still saving. Free some space soon.",
  });
</script>

<style scoped>
/* Chassis, not music: an opaque Ink display with Ivory type. Brass is the
   attention signal (bezel and lamp); no Music Color, no brand paper. */
.shelf-notice {
  --notice-bezel: var(--brass-lo);
  --notice-lamp: var(--brass);
  --notice-lamp-glow: color-mix(in srgb, var(--brass) 45%, transparent);

  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  column-gap: var(--s-5);
  box-sizing: border-box;
  padding: var(--s-5) var(--s-5) var(--s-5) var(--s-6);
  background: var(--ink);
  color: var(--ivory);
  border-radius: var(--r-xs);
  box-shadow: 0 0 0 2px var(--notice-bezel), inset 0 2px 5px color-mix(in srgb, var(--ink) 80%, transparent);
  transition: opacity var(--dur-ui) var(--ease-brush), visibility 0s;
}

.shelf-notice--failed {
  --notice-bezel: var(--brass);
  --notice-lamp: var(--brass-hi);
  --notice-lamp-glow: color-mix(in srgb, var(--brass) 75%, transparent);

  box-shadow: 0 0 0 3px var(--notice-bezel), var(--shadow-glow-brass);
}

.shelf-notice--busy {
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--dur-tap) var(--ease-brush), visibility 0s linear var(--dur-tap);
}

.shelf-notice__lamp {
  align-self: start;
  inline-size: 10px;
  block-size: 10px;
  margin-block-start: 5px;
  border-radius: 50%;
  background: var(--notice-lamp);
  box-shadow: 0 0 0 2px var(--brass-edge), 0 0 10px 2px var(--notice-lamp-glow);
}

.shelf-notice__text {
  display: grid;
  gap: var(--s-2);
  min-width: 0;
}

.shelf-notice__text p {
  margin: 0;
}

.shelf-notice__heading {
  display: block;
  margin-block-end: var(--s-3);
  font: var(--t-h2);
  color: var(--ivory);
}

.shelf-notice__body {
  display: block;
  font: var(--t-body-s-mono);
  color: var(--ivory);
}

.shelf-notice__detail {
  font: var(--t-caption);
  color: var(--ivory-2);
  overflow-wrap: anywhere;
}

.shelf-notice__action {
  display: grid;
  justify-items: center;
  gap: var(--s-2);
}

.shelf-notice__action-label {
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  color: var(--ivory-2);
  text-transform: uppercase;
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
    box-shadow: none;
    border: 2px solid CanvasText;
  }

  .shelf-notice__lamp {
    background: CanvasText;
    box-shadow: none;
  }
}
</style>
