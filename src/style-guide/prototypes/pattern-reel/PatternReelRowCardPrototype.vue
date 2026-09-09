<template>
  <article
    class="pattern-reel-row-card"
    :class="{
      'pattern-reel-row-card--active': active,
      'pattern-reel-row-card--disabled': disabled,
    }"
    :style="rootStyle"
  >
    <span class="pattern-reel-row-card__spine" aria-hidden="true"></span>

    <button
      class="pattern-reel-row-card__identity"
      type="button"
      :disabled="disabled"
      :aria-label="active
        ? `Unwind patterns around ${item.name}, root ${item.rootLabel}`
        : `Select ${item.name}, root ${item.rootLabel}`"
      @click.stop="emit('select')"
    >
      <strong>{{ item.name }}</strong>
    </button>

    <div
      class="pattern-reel-row-card__actions"
      data-reel-control
      aria-label="Pattern actions"
      @pointerdown.stop
    >
      <Button
        size="sm"
        tone="ink"
        :disabled="disabled || !item.isLive"
        :accessible-name="item.isLive ? 'Delete pattern' : 'Default patterns cannot be deleted'"
        :title="item.isLive ? 'Delete pattern' : 'Default patterns cannot be deleted'"
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
  </article>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from "vue";
import { Copy, ExternalLink, Trash2 } from "lucide-vue-next";
import Button from "@/components/primatives/Button.vue";
import type { PatternReelPrototypeItem } from "./types";

const props = defineProps<{
  item: PatternReelPrototypeItem;
  active?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [];
  action: [action: string];
}>();

const rootStyle = computed(() => ({
  "--pattern-root-degree": String(props.item.rootPitchClass),
  "--pattern-root-octave": String(props.item.rootOctave),
}) as CSSProperties);
</script>

<style scoped>
.pattern-reel-row-card {
  --pattern-root-degree: 0;
  --pattern-root-octave: 4;
  --pattern-root-lightness: calc(20% + (var(--pattern-root-octave) * 7.5%));
  --pattern-root-hue: calc((var(--pattern-root-degree) + .5) * 30deg);

  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 76px;
  align-items: center;
  gap: var(--s-4);
  padding: 10px 12px 10px 18px;
  overflow: hidden;
  background: var(--ink);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--ivory) 9%, transparent),
    0 8px 20px color-mix(in srgb, var(--ink) 42%, transparent);
  color: var(--ivory);
}

.pattern-reel-row-card--disabled {
  cursor: progress;
}

.pattern-reel-row-card__spine {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: oklch(
    var(--pattern-root-lightness)
    var(--music-c)
    var(--pattern-root-hue)
  );
}

.pattern-reel-row-card__identity {
  display: flex;
  min-width: 0;
  min-height: 48px;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}

.pattern-reel-row-card__identity:disabled {
  cursor: progress;
}

.pattern-reel-row-card__identity:focus-visible {
  outline: 2px solid var(--ivory-2);
  outline-offset: 4px;
}

.pattern-reel-row-card__identity strong {
  max-width: 100%;
  overflow: hidden;
  color: var(--ivory);
  font: var(--t-h2);
  letter-spacing: var(--tracking-display);
  line-height: 1;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.pattern-reel-row-card__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--s-3);
}

@media (max-width: 520px) {
  .pattern-reel-row-card {
    gap: var(--s-3);
    padding-right: 9px;
    padding-left: 15px;
  }

  .pattern-reel-row-card__actions {
    gap: var(--s-2);
  }

  .pattern-reel-row-card__identity strong {
    font-size: clamp(15px, 5vw, 20px);
  }
}

@media (forced-colors: active) {
  .pattern-reel-row-card {
    border: 1px solid CanvasText;
    background: Canvas;
    box-shadow: none;
    color: CanvasText;
  }

  .pattern-reel-row-card__spine {
    background: Highlight;
  }

  .pattern-reel-row-card__identity strong {
    color: CanvasText;
  }
}
</style>
