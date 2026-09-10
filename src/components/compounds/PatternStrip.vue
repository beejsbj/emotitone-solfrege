<template>
  <article
    class="pattern-strip"
    :class="{
      'pattern-strip--active': active,
      'pattern-strip--disabled': disabled,
    }"
    :style="stripStyle"
  >
    <span class="pattern-strip__spine" aria-hidden="true"></span>

    <BarTape
      v-if="!active"
      class="pattern-strip__tape"
      :segments="item.barTape"
      :aria-label="`${item.name} note timeline`"
    />

    <div class="pattern-strip__row">
      <button
        class="pattern-strip__identity"
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
        class="pattern-strip__actions"
        data-reel-control
        aria-label="Pattern actions"
        @pointerdown.stop
      >
        <Button
          size="sm"
          tone="ink"
          :disabled="disabled || !item.canDelete"
          :accessible-name="deleteLabel"
          :title="deleteLabel"
          @click.stop="emit('delete')"
        >
          <Check v-if="item.deleteArmed" aria-hidden="true" />
          <Trash2 v-else aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          tone="ivory"
          :disabled="disabled"
          :accessible-name="copyLabel"
          :title="copyLabel"
          @click.stop="emit('copy')"
        >
          <Check v-if="item.copied" aria-hidden="true" />
          <Copy v-else aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          tone="brass"
          :disabled="disabled"
          :accessible-name="openLabel"
          :title="openLabel"
          @click.stop="emit('openStrudel')"
        >
          <ExternalLink aria-hidden="true" />
        </Button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from "vue";
import { Check, Copy, ExternalLink, Trash2 } from "lucide-vue-next";
import BarTape from "../primatives/BarTape.vue";
import Button from "../primatives/Button.vue";
import type { BarTapeSegment } from "../primatives/BarTape.vue";

export interface PatternStripItem {
  id: string;
  name: string;
  rootLabel: string;
  spine: string;
  barTape: BarTapeSegment[];
  copied?: boolean;
  canDelete?: boolean;
  deleteArmed?: boolean;
  deleteUnavailableLabel?: string;
}

const props = withDefaults(defineProps<{
  item: PatternStripItem;
  active?: boolean;
  disabled?: boolean;
}>(), {
  active: false,
  disabled: false,
});

const emit = defineEmits<{
  select: [];
  delete: [];
  copy: [];
  openStrudel: [];
}>();

const stripStyle = computed(() => ({
  "--pattern-strip-spine": props.item.spine,
}) as CSSProperties);

const deleteLabel = computed(() => {
  if (!props.item.canDelete) {
    return props.item.deleteUnavailableLabel
      ?? `Default pattern ${props.item.name} cannot be deleted`;
  }
  return props.item.deleteArmed
    ? `Confirm delete ${props.item.name}`
    : `Delete ${props.item.name}`;
});
const copyLabel = computed(() => props.item.copied
  ? `Copied ${props.item.name}`
  : `Copy ${props.item.name} Strudel code`);
const openLabel = computed(() => `Open ${props.item.name} in Strudel`);
</script>

<style scoped>
.pattern-strip {
  position: relative;
  display: grid;
  width: 100%;
  height: 51.2px;
  min-width: 0;
  min-height: 51.2px;
  box-sizing: border-box;
  overflow: hidden;
  background: var(--ink);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--ivory) 9%, transparent),
    0 8px 20px color-mix(in srgb, var(--ink) 42%, transparent);
  color: var(--ivory);
}

.pattern-strip--disabled {
  cursor: progress;
}

.pattern-strip__spine {
  position: absolute;
  z-index: 2;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--pattern-strip-spine, var(--ivory));
}

.pattern-strip__row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--s-4);
  padding: 1.6px 10px 1.6px 16px;
}

.pattern-strip__identity {
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

.pattern-strip__identity:disabled {
  cursor: progress;
}

.pattern-strip__identity:focus-visible {
  outline: 2px solid var(--ivory-2);
  outline-offset: 2px;
}

.pattern-strip__identity strong {
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

.pattern-strip__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--s-3);
}

.pattern-strip__tape {
  margin-left: 4px;
}

@media (max-width: 520px) {
  .pattern-strip__row {
    gap: var(--s-3);
    padding-right: 7px;
    padding-left: 13px;
  }

  .pattern-strip__actions {
    gap: var(--s-2);
  }

  .pattern-strip__identity strong {
    font-size: clamp(15px, 5vw, 20px);
  }
}

@media (forced-colors: active) {
  .pattern-strip {
    border: 1px solid CanvasText;
    background: Canvas;
    box-shadow: none;
    color: CanvasText;
  }

  .pattern-strip__spine {
    background: Highlight;
  }

  .pattern-strip__identity strong {
    color: CanvasText;
  }
}
</style>
