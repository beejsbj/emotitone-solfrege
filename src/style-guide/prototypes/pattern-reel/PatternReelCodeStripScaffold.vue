<template>
  <section class="pattern-reel-codebar" aria-label="CodeStrip Bar prototype context">
    <Button
      size="sm"
      tone="brass"
      accessible-name="Play current pattern"
      title="Play current pattern"
      @click="emit('action', 'Play')"
    >
      <Play aria-hidden="true" />
    </Button>

    <div class="pattern-reel-codebar__document" aria-label="Committed CodeStrip content">
      <span v-if="!item.codeTokens.length" class="pattern-reel-codebar__empty">
        Record a pattern
      </span>
      <span
        v-for="(token, index) in item.codeTokens"
        v-else
        :key="`${item.id}-${index}`"
        class="pattern-reel-codebar__token"
      >{{ token }}</span>
    </div>

    <div class="pattern-reel-codebar__actions">
      <Button
        size="sm"
        tone="ink"
        accessible-name="Delete last event"
        title="Delete last event"
        @click="emit('action', 'Delete last event')"
      >
        <BackspaceIcon aria-hidden="true" />
      </Button>
      <Button
        size="sm"
        tone="ivory"
        accessible-name="Return"
        title="Return"
        @click="emit('action', 'Return')"
      >
        <CornerDownLeft aria-hidden="true" />
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { CornerDownLeft, Delete as BackspaceIcon, Play } from "lucide-vue-next";
import Button from "@/components/primatives/Button.vue";
import type { PatternReelPrototypeItem } from "./types";

defineProps<{
  item: PatternReelPrototypeItem;
}>();

const emit = defineEmits<{
  action: [action: string];
}>();
</script>

<style scoped>
.pattern-reel-codebar {
  display: grid;
  width: 100%;
  min-width: 0;
  min-height: 56px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  column-gap: var(--s-4);
  padding: var(--s-4) var(--s-5);
  background: var(--instrument-bar-surface);
  backdrop-filter: var(--instrument-bar-backdrop);
}

.pattern-reel-codebar__document {
  display: flex;
  min-width: 0;
  align-self: stretch;
  align-items: center;
  gap: 2px;
  overflow: hidden;
  border-bottom: 1px solid var(--hairline);
  color: var(--ivory-2);
  font: var(--t-mono);
  white-space: nowrap;
}

.pattern-reel-codebar__token {
  display: inline-grid;
  min-width: 26px;
  place-items: center;
  padding: 3px 5px;
  background: var(--ink-3);
  color: var(--ivory);
}

.pattern-reel-codebar__token:nth-child(7n + 1) { color: var(--note-do); }
.pattern-reel-codebar__token:nth-child(7n + 2) { color: var(--note-re); }
.pattern-reel-codebar__token:nth-child(7n + 3) { color: var(--note-mi); }
.pattern-reel-codebar__token:nth-child(7n + 4) { color: var(--note-fa); }
.pattern-reel-codebar__token:nth-child(7n + 5) { color: var(--note-sol); }
.pattern-reel-codebar__token:nth-child(7n + 6) { color: var(--note-la); }
.pattern-reel-codebar__token:nth-child(7n + 7) { color: var(--note-ti); }

.pattern-reel-codebar__empty {
  color: var(--ivory-3);
}

.pattern-reel-codebar__actions {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

@media (max-width: 420px) {
  .pattern-reel-codebar {
    column-gap: var(--s-3);
    padding-inline: var(--s-4);
  }

  .pattern-reel-codebar__actions {
    gap: var(--s-2);
  }
}
</style>

