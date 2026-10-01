<template>
  <article
    class="pattern-strip"
    :class="{
      'pattern-strip--active': active,
      'pattern-strip--disabled': disabled,
      [`pattern-strip--tone-${item.tone}`]: Boolean(item.tone),
      'pattern-strip--recording': item.recording,
    }"
    :style="stripStyle"
  >
    <span class="pattern-strip__spine" aria-hidden="true"></span>

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
      <component
        v-else
        :is="selectable ? 'button' : 'div'"
        ref="identityElement"
        class="pattern-strip__identity"
        :class="{ 'pattern-strip__identity--static': !selectable }"
        :type="selectable ? 'button' : undefined"
        :role="selectable ? undefined : 'group'"
        :tabindex="!selectable && item.canRename !== false ? 0 : undefined"
        :disabled="selectable ? disabled : undefined"
        :aria-label="identityLabel"
        @click.stop="handleIdentityClick"
        @keydown.f2.stop.prevent="beginRename"
      >
        <span class="pattern-strip__identity-copy">
          <strong>{{ item.name }}</strong>
          <small>
            <span
              v-if="item.shelfTag || item.lamp"
              class="pattern-strip__shelf"
              data-testid="pattern-strip-shelf"
            >
              <span
                v-if="item.lamp"
                class="pattern-strip__lamp"
                :class="`pattern-strip__lamp--${item.lamp}`"
                aria-hidden="true"
              />
              {{ item.shelfTag }}
            </span>
            <component
              :is="item.instrumentIcon"
              :size="10"
              :stroke-width="1.75"
              class="pattern-strip__instrument-icon"
              aria-hidden="true"
            />
            <span class="pattern-strip__instrument">{{ item.instrumentLabel }}</span>
            <span v-if="item.detail" class="pattern-strip__detail">{{ item.detail }}</span>
          </small>
        </span>
      </component>

      <LoopDial
        class="pattern-strip__dial"
        :segments="item.loopDial"
        :length-ms="item.loopLengthMs"
        :bar-ms="item.loopBarMs"
        :live="item.loopLive"
        :aria-label="`${item.name} note timeline`"
      />

      <div
        v-if="item.actions?.length"
        class="pattern-strip__actions"
        data-reel-control
        aria-label="Pattern actions"
        @pointerdown.stop
      >
        <Button
          v-for="action in item.actions"
          :key="action.kind"
          size="sm"
          :tone="ACTION_TONES[action.kind]"
          :disabled="disabled || action.disabled"
          :accessible-name="action.label"
          :title="action.label"
          :data-action="action.kind"
          @click.stop="runAction(action.kind)"
        >
          <Check v-if="action.done" aria-hidden="true" />
          <component :is="ACTION_ICONS[action.kind]" v-else aria-hidden="true" />
        </Button>
      </div>
      <div
        v-else-if="!item.actions"
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
  watch,
  type Component,
  type CSSProperties,
} from "vue";
import {
  ArrowDownToLine,
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  Trash2,
} from "lucide-vue-next";
import LoopDial from "../primatives/LoopDial.vue";
import Button from "../primatives/Button.vue";
import type { LoopDialSegment } from "../primatives/LoopDial.vue";

export type PatternStripActionKind = "keep" | "delete" | "copy" | "open" | "load";

export interface PatternStripAction {
  kind: PatternStripActionKind;
  label: string;
  disabled?: boolean;
  /** Show a check: delete armed, copied, kept. */
  done?: boolean;
}

/** Which shelf a strip belongs to; `take` gets the desk material and lamp. */
export type PatternStripTone = "take" | "recent" | "kept" | "library";

export interface PatternStripItem {
  id: string;
  name: string;
  instrumentIcon: Component;
  instrumentLabel: string;
  rootLabel: string;
  spine: string;
  loopDial: LoopDialSegment[];
  /** Whole loop in ms, rests and trailing silence included; places notes in time. */
  loopLengthMs?: number;
  /** One bar in ms at the phrase's tempo, so the dial can follow playback. */
  loopBarMs?: number;
  /** The transport plays this phrase: its Loop Dial spins with playback. */
  loopLive?: boolean;
  copied?: boolean;
  canDelete?: boolean;
  canCopy?: boolean;
  canOpenStrudel?: boolean;
  canRename?: boolean;
  deleteArmed?: boolean;
  deleteUnavailableLabel?: string;
  copyUnavailableLabel?: string;
  openUnavailableLabel?: string;
  tone?: PatternStripTone;
  /** One short word for where the phrase lives, e.g. "Library", "3m ago", "Now". */
  shelfTag?: string;
  /**
   * The desk lamp. armed: loaded, only being looked at (a hollow ring).
   * live: yours, being played into (filled; glows while a key is down).
   */
  lamp?: "armed" | "live";
  /** Spoken state, e.g. "on the desk; playing makes a copy". */
  stateLabel?: string;
  /** Trailing meta, e.g. the solfège contour of a named phrase. */
  detail?: string;
  /** A key is down in this phrase right now. */
  recording?: boolean;
  /** Replaces the default delete/copy/open trio when present. */
  actions?: PatternStripAction[];
}

const ACTION_ICONS: Record<PatternStripActionKind, Component> = {
  keep: Bookmark,
  delete: Trash2,
  copy: Copy,
  open: ExternalLink,
  load: ArrowDownToLine,
};
const ACTION_TONES: Record<PatternStripActionKind, "ink" | "ivory" | "brass"> = {
  keep: "ivory",
  delete: "ink",
  copy: "ivory",
  open: "brass",
  load: "brass",
};

const props = withDefaults(defineProps<{
  item: PatternStripItem;
  active?: boolean;
  disabled?: boolean;
  selectable?: boolean;
}>(), {
  active: false,
  disabled: false,
  selectable: true,
});

const emit = defineEmits<{
  select: [];
  delete: [];
  copy: [];
  openStrudel: [];
  rename: [name: string];
  keep: [];
  load: [];
}>();

function runAction(kind: PatternStripActionKind) {
  if (kind === "keep") emit("keep");
  else if (kind === "delete") emit("delete");
  else if (kind === "copy") emit("copy");
  else if (kind === "open") emit("openStrudel");
  else emit("load");
}

const renaming = ref(false);
const draftName = ref("");
const renameInput = ref<HTMLInputElement | null>(null);
const identityElement = ref<HTMLElement | null>(null);
let lastPointerClickAt = Number.NEGATIVE_INFINITY;

function handleIdentityClick(event: MouseEvent) {
  const now = performance.now();
  const canArmRename = event.detail >= 1
    && props.active
    && !props.disabled
    && props.item.canRename !== false;
  const isPointerDoubleTap = canArmRename && now - lastPointerClickAt <= 360;
  lastPointerClickAt = canArmRename && !isPointerDoubleTap
    ? now
    : Number.NEGATIVE_INFINITY;

  if (isPointerDoubleTap) {
    beginRename();
    return;
  }
  if (!props.selectable) return;
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
  void nextTick(() => identityElement.value?.focus({ preventScroll: true }));
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

watch(
  [() => props.active, () => props.item.id],
  ([active, itemId], [, previousItemId]) => {
    lastPointerClickAt = Number.NEGATIVE_INFINITY;
    if (renaming.value && (!active || itemId !== previousItemId)) cancelRename();
  },
);

const stripStyle = computed(() => ({
  "--pattern-strip-spine": props.item.spine,
}) as CSSProperties);

const identityLabel = computed(() => {
  const state = props.item.stateLabel ? `, ${props.item.stateLabel}` : "";
  const root = props.item.rootLabel ? `, root ${props.item.rootLabel}` : "";
  const identity = `${props.item.name}${state}, ${props.item.instrumentLabel}${root}`;
  if (!props.selectable) {
    return props.item.canRename === false
      ? `Current pattern ${identity}`
      : `Current pattern ${identity}; double-tap or press F2 to rename`;
  }
  return props.active
    ? `Unwind patterns around ${identity}`
    : `Select ${identity}`;
});

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
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--ivory) 9%, transparent);
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

.pattern-strip__identity--static {
  cursor: default;
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

/* The take is flat Ink like every strip; only its Brass edges mark it. */
.pattern-strip--tone-take {
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--brass-hi) 38%, transparent),
    inset 0 -1px 0 color-mix(in srgb, var(--brass-lo) 30%, transparent);
}

/* Where the phrase lives: one engraved word and, on the desk, a lamp. No box:
   the meta line is ~200px wide and the contour needs it more. */
.pattern-strip__shelf {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 5px;
  color: var(--ivory-3);
}

.pattern-strip--tone-take .pattern-strip__shelf {
  color: var(--brass-hi);
}

/* The lamp takes its colour from the music (the phrase's root), never from
   the brand palette: this is the playing zone. */
.pattern-strip__lamp {
  width: 7px;
  height: 7px;
  flex: none;
  box-sizing: border-box;
  border-radius: 50%;
  transition:
    background-color 120ms var(--ease-brush),
    box-shadow 120ms var(--ease-brush);
}

.pattern-strip__lamp--armed {
  border: 1.5px solid var(--brass);
  background: transparent;
}

.pattern-strip__lamp--live {
  background: var(--pattern-strip-spine, var(--brass));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ink) 60%, transparent);
}

.pattern-strip--recording .pattern-strip__lamp--live {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--ivory) 45%, transparent),
    0 0 7px var(--pattern-strip-spine, var(--brass));
}

/* The instrument name gives way before the contour does. */
.pattern-strip__instrument {
  flex: 0 1000 auto;
  min-width: 2ch;
}

.pattern-strip__detail {
  flex: 0 1 auto;
  min-width: 0;
  color: var(--ivory-2);
  text-transform: none;
}

.pattern-strip__detail::before {
  content: "· ";
}

/* The loop sits between copy and controls without taking height from the row. */
.pattern-strip__dial {
  margin-inline: var(--s-3) var(--s-2);
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
  .pattern-strip__lamp--armed {
    border-color: CanvasText;
  }

  .pattern-strip__lamp--live {
    forced-color-adjust: none;
    background: Highlight;
  }

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
