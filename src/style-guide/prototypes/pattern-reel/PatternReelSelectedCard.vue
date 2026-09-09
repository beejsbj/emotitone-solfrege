<template>
  <Card
    class="pattern-reel-selected-card"
    :class="{ 'pattern-reel-selected-card--disabled': disabled }"
    :label="item.label"
    :spine="item.spine"
    flush
  >
    <template #mark>
      <span class="pattern-reel-selected-card__ordinal">{{ item.ordinal }}</span>
    </template>

    <div class="pattern-reel-selected-card__body">
      <div class="pattern-reel-selected-card__copy">
        <span class="pattern-reel-selected-card__status">
          <i aria-hidden="true"></i>
          {{ item.isLive ? "Live input" : "Selected pattern" }}
        </span>
        <strong class="pattern-reel-selected-card__name">{{ item.name }}</strong>
        <span class="pattern-reel-selected-card__meta">{{ item.metadata }}</span>
      </div>

      <div
        class="pattern-reel-selected-card__actions"
        data-reel-control
        aria-label="Selected pattern actions"
        @pointerdown.stop
      >
        <Button
          size="sm"
          tone="ink"
          :disabled="disabled"
          accessible-name="Delete pattern"
          title="Delete pattern"
          @click.stop="emit('action', 'Delete')"
        >
          <Trash2 aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          tone="ivory"
          :disabled="disabled"
          accessible-name="Copy Strudel code"
          title="Copy Strudel code"
          @click.stop="emit('action', 'Copy')"
        >
          <Copy aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          tone="brass"
          :disabled="disabled"
          accessible-name="Open in Strudel"
          title="Open in Strudel"
          @click.stop="emit('action', 'Open in Strudel')"
        >
          <ExternalLink aria-hidden="true" />
        </Button>
      </div>
    </div>

    <template #footer>
      <BarTape :segments="item.barTape" aria-label="Selected pattern note timeline" />
    </template>
  </Card>
</template>

<script setup lang="ts">
import { Copy, ExternalLink, Trash2 } from "lucide-vue-next";
import BarTape from "@/components/primatives/BarTape.vue";
import Button from "@/components/primatives/Button.vue";
import Card from "@/components/primatives/Card.vue";
import type { PatternReelPrototypeItem } from "./types";

defineProps<{
  item: PatternReelPrototypeItem;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  action: [action: string];
}>();
</script>

<style scoped>
.pattern-reel-selected-card {
  width: 100%;
  min-height: 140px;
}

.pattern-reel-selected-card--disabled {
  cursor: progress;
}

.pattern-reel-selected-card__ordinal {
  font: 400 42px/.9 var(--font-display);
  letter-spacing: var(--tracking-display);
}

.pattern-reel-selected-card__body {
  display: flex;
  min-height: 135px;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--s-5);
  padding: 22px 14px 14px 22px;
}

.pattern-reel-selected-card__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.pattern-reel-selected-card__status {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  margin-bottom: var(--s-3);
  color: var(--ivory-2);
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.pattern-reel-selected-card__status i {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  background: var(--brass);
  border-radius: 50%;
  box-shadow: 0 0 9px color-mix(in srgb, var(--brass) 48%, transparent);
}

.pattern-reel-selected-card__name {
  overflow: hidden;
  color: var(--ivory);
  font: var(--t-h1);
  letter-spacing: var(--tracking-display);
  line-height: 1;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.pattern-reel-selected-card__meta {
  overflow: hidden;
  margin-top: 6px;
  color: var(--ivory-3);
  font: var(--t-caption);
  letter-spacing: .12em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.pattern-reel-selected-card__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--s-4);
}

@media (max-width: 520px) {
  .pattern-reel-selected-card__body {
    gap: var(--s-3);
    padding-right: 10px;
    padding-left: 18px;
  }

  .pattern-reel-selected-card__actions {
    gap: var(--s-2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pattern-reel-selected-card__status i {
    box-shadow: none;
  }
}
</style>
