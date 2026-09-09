<template>
  <article
    class="pattern-strip-prototype"
    :class="{
      'pattern-strip-prototype--active': active,
      'pattern-strip-prototype--disabled': disabled,
    }"
    :style="rootStyle"
  >
    <span class="pattern-strip-prototype__spine" aria-hidden="true"></span>

    <BarTape
      v-if="!active"
      class="pattern-strip-prototype__tape"
      :segments="item.barTape"
      :aria-label="`${item.name} note timeline`"
    />

    <div class="pattern-strip-prototype__row">
      <button
        class="pattern-strip-prototype__identity"
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
        class="pattern-strip-prototype__actions"
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
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from "vue";
import { Copy, ExternalLink, Trash2 } from "lucide-vue-next";
import BarTape from "@/components/primatives/BarTape.vue";
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
.pattern-strip-prototype {
  --pattern-root-degree: 0;
  --pattern-root-octave: 4;
  --pattern-root-lightness: calc(20% + (var(--pattern-root-octave) * 7.5%));
  --pattern-root-hue: calc((var(--pattern-root-degree) + .5) * 30deg);

  position: relative;
  display: grid;
  width: 100%;
  min-width: 0;
  min-height: 64px;
  overflow: hidden;
  background: var(--ink);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--ivory) 9%, transparent),
    0 8px 20px color-mix(in srgb, var(--ink) 42%, transparent);
  color: var(--ivory);
}

.pattern-strip-prototype--disabled {
  cursor: progress;
}

.pattern-strip-prototype__spine {
  position: absolute;
  z-index: 2;
  inset: 0 auto 0 0;
  width: 4px;
  background: oklch(
    var(--pattern-root-lightness)
    var(--music-c)
    var(--pattern-root-hue)
  );
}

.pattern-strip-prototype__row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--s-4);
  padding: 6px 10px 6px 16px;
}

.pattern-strip-prototype__identity {
  display: flex;
  min-width: 0;
  min-height: 44px;
  flex: 1;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}

.pattern-strip-prototype__identity:disabled {
  cursor: progress;
}

.pattern-strip-prototype__identity:focus-visible {
  outline: 2px solid var(--ivory-2);
  outline-offset: 2px;
}

.pattern-strip-prototype__identity strong {
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

.pattern-strip-prototype__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--s-3);
}

.pattern-strip-prototype__tape {
  margin-left: 4px;
}

@media (max-width: 520px) {
  .pattern-strip-prototype__row {
    gap: var(--s-3);
    padding-right: 7px;
    padding-left: 13px;
  }

  .pattern-strip-prototype__actions {
    gap: var(--s-2);
  }

  .pattern-strip-prototype__identity strong {
    font-size: clamp(15px, 5vw, 20px);
  }
}

@media (forced-colors: active) {
  .pattern-strip-prototype {
    border: 1px solid CanvasText;
    background: Canvas;
    box-shadow: none;
    color: CanvasText;
  }

  .pattern-strip-prototype__spine {
    background: Highlight;
  }

  .pattern-strip-prototype__identity strong {
    color: CanvasText;
  }
}
</style>
