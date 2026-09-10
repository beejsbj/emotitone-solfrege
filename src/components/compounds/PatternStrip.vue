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
      class="pattern-strip__tape"
      :segments="item.barTape"
      :aria-label="`${item.name} note timeline`"
    />

    <div class="pattern-strip__row">
      <form
        v-if="renaming"
        class="pattern-strip__rename"
        data-reel-control
        @submit.prevent="commitRename(true)"
        @pointerdown.stop
        @click.stop
      >
        <input
          ref="renameInput"
          v-model="draftName"
          maxlength="80"
          :aria-label="`Rename ${item.name}`"
          @blur="commitRename()"
          @keydown.escape.stop.prevent="cancelRename(true)"
        />
      </form>
      <button
        v-else
        ref="identityButton"
        class="pattern-strip__identity"
        type="button"
        :disabled="disabled"
        :aria-label="active
          ? `Unwind patterns around ${item.name}, ${item.instrumentLabel}, root ${item.rootLabel}`
          : `Select ${item.name}, ${item.instrumentLabel}, root ${item.rootLabel}`"
        @click.stop="handleIdentityClick"
        @keydown.f2.stop.prevent="beginRename"
      >
        <span class="pattern-strip__identity-copy">
          <strong>{{ item.name }}</strong>
          <small>
            <component
              :is="item.instrumentIcon"
              :size="10"
              :stroke-width="1.75"
              class="pattern-strip__instrument-icon"
              aria-hidden="true"
            />
            <span>{{ item.instrumentLabel }}</span>
          </small>
        </span>
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
          :disabled="disabled || item.canCopy === false"
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
          :disabled="disabled || item.canOpenStrudel === false"
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
import {
  computed,
  nextTick,
  ref,
  type Component,
  type CSSProperties,
} from "vue";
import { Check, Copy, ExternalLink, Trash2 } from "lucide-vue-next";
import BarTape from "../primatives/BarTape.vue";
import Button from "../primatives/Button.vue";
import type { BarTapeSegment } from "../primatives/BarTape.vue";

export interface PatternStripItem {
  id: string;
  name: string;
  instrumentIcon: Component;
  instrumentLabel: string;
  rootLabel: string;
  spine: string;
  barTape: BarTapeSegment[];
  copied?: boolean;
  canDelete?: boolean;
  canCopy?: boolean;
  canOpenStrudel?: boolean;
  canRename?: boolean;
  deleteArmed?: boolean;
  deleteUnavailableLabel?: string;
  copyUnavailableLabel?: string;
  openUnavailableLabel?: string;
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
  rename: [name: string];
}>();

const renaming = ref(false);
const draftName = ref("");
const renameInput = ref<HTMLInputElement | null>(null);
const identityButton = ref<HTMLButtonElement | null>(null);
let lastPointerClickAt = Number.NEGATIVE_INFINITY;

function handleIdentityClick(event: MouseEvent) {
  const now = performance.now();
  const isPointerDoubleTap = event.detail > 1
    || (event.detail === 1 && now - lastPointerClickAt <= 360);
  lastPointerClickAt = event.detail === 1 ? now : Number.NEGATIVE_INFINITY;

  if (isPointerDoubleTap && props.active && props.item.canRename !== false) {
    lastPointerClickAt = Number.NEGATIVE_INFINITY;
    beginRename();
    return;
  }
  emit("select");
}

function beginRename() {
  if (!props.active || props.disabled || props.item.canRename === false) return;
  draftName.value = props.item.name;
  renaming.value = true;
  void nextTick(() => {
    renameInput.value?.focus();
    renameInput.value?.select();
  });
}

function restoreIdentityFocus() {
  void nextTick(() => identityButton.value?.focus({ preventScroll: true }));
}

function cancelRename(restoreFocus = false) {
  renaming.value = false;
  draftName.value = props.item.name;
  if (restoreFocus) restoreIdentityFocus();
}

function commitRename(restoreFocus = false) {
  if (!renaming.value) return;
  const name = draftName.value.trim();
  renaming.value = false;
  if (name && name !== props.item.name) emit("rename", name);
  if (restoreFocus) restoreIdentityFocus();
}

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
const copyLabel = computed(() => {
  if (props.item.canCopy === false) {
    return props.item.copyUnavailableLabel
      ?? `Copy is unavailable for ${props.item.name}`;
  }
  return props.item.copied
    ? `Copied ${props.item.name}`
    : `Copy ${props.item.name} Strudel code`;
});
const openLabel = computed(() => props.item.canOpenStrudel === false
  ? props.item.openUnavailableLabel ?? `Open in Strudel is unavailable for ${props.item.name}`
  : `Open ${props.item.name} in Strudel`);
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
  touch-action: manipulation;
}

.pattern-strip__identity-copy {
  display: grid;
  min-width: 0;
  gap: 1px;
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

.pattern-strip__identity small {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  color: var(--ivory-3);
  font: var(--t-caption);
  letter-spacing: var(--tracking-label);
  line-height: 1;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.pattern-strip__identity small span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.pattern-strip__instrument-icon {
  width: 10px;
  height: 10px;
  flex: none;
}

.pattern-strip__rename {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
}

.pattern-strip__rename input {
  width: 100%;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid var(--ivory-3);
  border-radius: 0;
  outline: none;
  background: var(--ink-2);
  color: var(--ivory);
  font: var(--t-h2);
  letter-spacing: var(--tracking-display);
  line-height: 1;
  text-transform: uppercase;
}

.pattern-strip__rename input:focus-visible {
  border-color: var(--ivory);
  box-shadow: 0 0 0 1px var(--ivory);
}

.pattern-strip__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--s-3);
}

.pattern-strip__tape {
  position: absolute;
  z-index: 3;
  inset: 0 0 auto 4px;
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

  .pattern-strip__identity small {
    font-size: 9px;
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

  .pattern-strip__identity small {
    color: GrayText;
  }

  .pattern-strip__rename input {
    border-color: CanvasText;
    background: Canvas;
    color: CanvasText;
  }
}

</style>
