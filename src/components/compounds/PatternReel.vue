<template>
  <section
    ref="reelRoot"
    class="pattern-reel"
    :class="{
      'pattern-reel--dragging': dragging,
      'pattern-reel--settling': settling,
      'pattern-reel--keyboard': keyboardImmediate,
    }"
    tabindex="0"
    role="group"
    :aria-label="label"
    aria-roledescription="cyclic pattern reel"
    @keydown="handleKeydown"
    @wheel="handleWheel"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="cancelPointer"
    @focusout="handleFocusOut"
    @click.capture="suppressDragClick"
  >
    <div v-if="items.length" class="pattern-reel__viewport">
      <div
        v-for="slot in renderedSlots"
        :key="slot.key"
        class="pattern-reel__slot"
        :class="[
          `pattern-reel__slot--${slot.slot}`,
          {
            'pattern-reel__slot--active': isActiveSlot(slot.slot, slot.item.id),
            [`pattern-reel__slot--depth-${Math.abs(slot.slot)}`]: slot.slot < 0,
          },
        ]"
        :style="slotStyle(slot.slot, slot.item.id)"
        :aria-hidden="isSlotUnavailable(slot.slot, slot.item.id) || undefined"
        :inert="isSlotUnavailable(slot.slot, slot.item.id) || undefined"
      >
        <PatternStrip
          :item="slot.item"
          :active="isCommittedCurrent(slot.item.id)"
          :disabled="disabled || dragging || settling || transientIndex !== null
            || isSlotUnavailable(slot.slot, slot.item.id)"
          @select="handleStripSelect(slot.item.id)"
          @delete="handleDelete(slot.item.id)"
          @copy="emit('copy', slot.item.id)"
          @open-strudel="emit('openStrudel', slot.item.id)"
        />
      </div>
    </div>

    <p v-else class="pattern-reel__empty">Play some notes, then press Return.</p>

    <span class="pattern-reel__sr-only" aria-live="polite">
      {{ liveAnnouncement }}
    </span>
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  type CSSProperties,
} from "vue";
import PatternStrip from "./PatternStrip.vue";
import type { PatternStripItem } from "./PatternStrip.vue";

export type PatternReelInput = "drag" | "wheel" | "tap" | "keyboard";
export type PatternReelItem = PatternStripItem;

const WHEEL_POSITIONS = [
  { y: 0, scale: 1, opacity: 1 },
  { y: -46.4, scale: .95, opacity: .8 },
  { y: -78.4, scale: .85, opacity: .48 },
  { y: -97.6, scale: .72, opacity: .2 },
];
const DECK_POSITIONS = [
  { y: 0, scale: 1, opacity: 1 },
  { y: -14.4, scale: .997, opacity: .92 },
  { y: -24.8, scale: .992, opacity: .74 },
  { y: -33.6, scale: .986, opacity: .52 },
];
const WHEEL_STEP = 46.4;
const WHEEL_DRAG_THRESHOLD = 23.2;
const WHEEL_UNWIND_DISTANCE = 28.8;
const WHEEL_SETTLE_DURATION_MS = 220;
const WHEEL_OPEN_HOLD_MS = 900;
const WHEEL_REBOUND_DURATION_MS = 200;

const props = withDefaults(defineProps<{
  items: PatternReelItem[];
  selectedId: string;
  disabled?: boolean;
  label?: string;
}>(), {
  disabled: false,
  label: "Pattern reel. Use up and down arrows to change the selected pattern.",
});

const emit = defineEmits<{
  commit: [id: string, input: PatternReelInput];
  delete: [id: string];
  copy: [id: string];
  openStrudel: [id: string];
}>();

const reelRoot = ref<HTMLElement | null>(null);
const dragging = ref(false);
const settling = ref(false);
const dragDistance = ref(0);
const transientIndex = ref<number | null>(null);
const revealHeld = ref(false);
const reelRebounding = ref(false);
const keyboardImmediate = ref(false);
const input = ref<PatternReelInput>("tap");
const liveAnnouncement = ref("");

let pointerId: number | null = null;
let pointerStartX = 0;
let pointerStartY = 0;
let pointerLastY = 0;
let pointerLastAt = 0;
let pointerVelocity = 0;
let pointerStartedRevealed = false;
let wheelAccumulator = 0;
let wheelTimer: ReturnType<typeof setTimeout> | undefined;
let settleTimer: ReturnType<typeof setTimeout> | undefined;
let collapseTimer: ReturnType<typeof setTimeout> | undefined;
let reboundTimer: ReturnType<typeof setTimeout> | undefined;
let suppressClicksUntil = 0;
let horizontalGestureRejected = false;

const selectedIndex = computed(() => {
  const index = props.items.findIndex((item) => item.id === props.selectedId);
  return index >= 0 ? index : Math.max(0, props.items.length - 1);
});
const displayIndex = computed(() => transientIndex.value ?? selectedIndex.value);
const dragProgress = computed(() => {
  if (!dragging.value || prefersReducedMotion()) return 0;
  const progress = -dragDistance.value / WHEEL_STEP;
  return Math.max(-1, Math.min(1, progress));
});
const unwindProgress = computed(() => {
  if (prefersReducedMotion()) return 0;
  if (revealHeld.value || transientIndex.value !== null) return 1;
  if (!dragging.value) return 0;
  return Math.min(1, Math.abs(dragDistance.value) / WHEEL_UNWIND_DISTANCE);
});
const previewIndex = computed(() => dragging.value
  ? wrapIndex(selectedIndex.value + Math.round(dragProgress.value))
  : displayIndex.value);
const previewItem = computed(() => props.items[previewIndex.value]);

function wrapIndex(index: number) {
  if (!props.items.length) return 0;
  return ((index % props.items.length) + props.items.length) % props.items.length;
}

function slotForIndex(itemIndex: number) {
  const count = props.items.length;
  if (!count) return null;

  const backward = (displayIndex.value - itemIndex + count) % count;
  if (backward === 0) return 0;

  const forward = (itemIndex - displayIndex.value + count) % count;
  const predecessorCount = Math.min(3, count - 1);
  if (backward <= predecessorCount) return -backward;

  if (count > predecessorCount + 1 && forward === 1) return 1;
  return null;
}

const renderedSlots = computed(() => {
  const stagesShortIncoming = dragging.value
    && dragProgress.value > 0
    && props.items.length <= 4;
  const incoming = stagesShortIncoming
    ? props.items[wrapIndex(displayIndex.value + 1)]
    : undefined;
  const slots = props.items
    .map((item, itemIndex) => ({
      item,
      slot: slotForIndex(itemIndex),
      key: incoming?.id === item.id ? `${item.id}:receding` : item.id,
    }))
    .filter((entry): entry is { item: PatternReelItem; slot: number; key: string } => (
      entry.slot !== null
    ));

  if (incoming) {
    slots.push({ item: incoming, slot: 1, key: incoming.id });
  }

  return slots.sort((first, second) => first.slot - second.slot);
});

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function positionAt(slot: number) {
  if (slot === 1) {
    return { y: WHEEL_STEP, scale: 1.025, opacity: 0 };
  }
  if (slot >= 0) return WHEEL_POSITIONS[0];

  const depth = Math.min(Math.abs(slot), 3);
  const deck = DECK_POSITIONS[depth];
  const wheel = WHEEL_POSITIONS[depth];
  return {
    y: lerp(deck.y, wheel.y, unwindProgress.value),
    scale: lerp(deck.scale, wheel.scale, unwindProgress.value),
    opacity: lerp(deck.opacity, wheel.opacity, unwindProgress.value),
  };
}

function interpolatedPosition(coordinate: number) {
  if (coordinate < -3) {
    const farthest = positionAt(-3);
    const overflow = Math.min(1, Math.abs(coordinate + 3));
    return {
      y: farthest.y - overflow * WHEEL_STEP * .45,
      scale: farthest.scale * (1 - overflow * .08),
      opacity: farthest.opacity * (1 - overflow),
    };
  }
  if (coordinate > 1) return positionAt(1);

  const lowerSlot = Math.floor(coordinate);
  const upperSlot = Math.ceil(coordinate);
  if (lowerSlot === upperSlot) return positionAt(lowerSlot);
  const lower = positionAt(lowerSlot);
  const upper = positionAt(upperSlot);
  const progress = coordinate - lowerSlot;
  return {
    y: lerp(lower.y, upper.y, progress),
    scale: lerp(lower.scale, upper.scale, progress),
    opacity: lerp(lower.opacity, upper.opacity, progress),
  };
}

function isActivePreview(id: string) {
  return previewItem.value?.id === id;
}

function isActiveSlot(slot: number, id: string) {
  return isActivePreview(id) && Math.abs(slot - dragProgress.value) <= .5;
}

function isCommittedCurrent(id: string) {
  return props.items[selectedIndex.value]?.id === id;
}

function isSlotUnavailable(slot: number, id: string) {
  const stagedForwardSlot = slot === 1 && !isActiveSlot(slot, id);
  const recedingShortDuplicate = slot < 0
    && dragging.value
    && dragProgress.value > 0
    && props.items.length <= 4
    && props.items[wrapIndex(displayIndex.value + 1)]?.id === id
    && isActivePreview(id);
  const collapsedPredecessor = slot < 0 && unwindProgress.value === 0;
  return stagedForwardSlot || recedingShortDuplicate || collapsedPredecessor;
}

function slotStyle(slot: number, id: string): CSSProperties {
  const position = interpolatedPosition(slot - dragProgress.value);
  return {
    "--slot-y": `${position.y}px`,
    "--slot-scale": String(position.scale),
    "--slot-opacity": String(position.opacity),
    "--slot-z": String(isActiveSlot(slot, id)
      ? 20
      : 18 - Math.round(Math.abs(slot - dragProgress.value))),
    "--settle-duration": reelRebounding.value
      ? `${WHEEL_REBOUND_DURATION_MS}ms`
      : `${WHEEL_SETTLE_DURATION_MS}ms`,
    "--settle-easing": reelRebounding.value
      ? "var(--ease-reel-rebound)"
      : "var(--ease-brush)",
    "--settle-opacity-easing": "var(--ease-brush)",
  } as CSSProperties;
}

function announce(item: PatternReelItem | undefined) {
  if (!item) return;
  const position = props.items.findIndex((candidate) => candidate.id === item.id) + 1;
  liveAnnouncement.value = `${item.name}, ${position} of ${props.items.length}`;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function beginSettle(inputMode: PatternReelInput) {
  clearTimeout(settleTimer);
  if (inputMode === "keyboard" || prefersReducedMotion()) {
    settling.value = false;
    return;
  }
  settling.value = true;
  settleTimer = setTimeout(() => {
    settling.value = false;
  }, WHEEL_SETTLE_DURATION_MS);
}

function revealWheelTemporarily() {
  if (prefersReducedMotion()) {
    revealHeld.value = false;
    return;
  }

  clearTimeout(collapseTimer);
  collapseTimer = undefined;
  clearTimeout(reboundTimer);
  reelRebounding.value = true;
  revealHeld.value = true;
  reboundTimer = setTimeout(() => {
    reelRebounding.value = false;
  }, WHEEL_REBOUND_DURATION_MS);
  scheduleCollapse(WHEEL_REBOUND_DURATION_MS + WHEEL_OPEN_HOLD_MS);
}

function backgroundSlotFor(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const slot = target.closest(".pattern-reel__slot");
  if (
    !slot
    || !reelRoot.value?.contains(slot)
    || slot.classList.contains("pattern-reel__slot--active")
  ) return null;
  return slot;
}

function collapseWheel() {
  clearTimeout(reboundTimer);
  reelRebounding.value = true;
  revealHeld.value = false;
  reboundTimer = setTimeout(() => {
    reelRebounding.value = false;
  }, WHEEL_REBOUND_DURATION_MS);
}

function scheduleCollapse(delayMs: number) {
  clearTimeout(collapseTimer);
  collapseTimer = setTimeout(() => {
    collapseTimer = undefined;
    if (backgroundSlotFor(document.activeElement)) return;
    collapseWheel();
  }, delayMs);
}

function handleFocusOut(event: FocusEvent) {
  if (
    !revealHeld.value
    || collapseTimer !== undefined
    || !backgroundSlotFor(event.target)
    || backgroundSlotFor(event.relatedTarget)
  ) return;
  scheduleCollapse(WHEEL_OPEN_HOLD_MS);
}

function cancelPendingInteraction(preserveReveal = false) {
  clearTimeout(wheelTimer);
  clearTimeout(settleTimer);
  if (!preserveReveal) {
    clearTimeout(collapseTimer);
    collapseTimer = undefined;
    clearTimeout(reboundTimer);
  }
  wheelAccumulator = 0;
  transientIndex.value = null;
  if (!preserveReveal) {
    revealHeld.value = false;
    reelRebounding.value = false;
  }
  settling.value = false;
  keyboardImmediate.value = false;
  dragDistance.value = 0;
  dragging.value = false;

  if (pointerId !== null && reelRoot.value?.hasPointerCapture(pointerId)) {
    reelRoot.value.releasePointerCapture(pointerId);
  }
  pointerId = null;
  pointerStartedRevealed = false;
  horizontalGestureRejected = false;
}

function prepareAnimatedCommit() {
  const closesRevealedWheel = revealHeld.value && !prefersReducedMotion();
  cancelPendingInteraction();
  if (!closesRevealedWheel) return;

  reelRebounding.value = true;
  reboundTimer = setTimeout(() => {
    reelRebounding.value = false;
  }, WHEEL_REBOUND_DURATION_MS);
}

function commitIndex(nextIndex: number, inputMode: PatternReelInput) {
  const item = props.items[wrapIndex(nextIndex)];
  if (!item || item.id === props.selectedId) return;

  input.value = inputMode;
  beginSettle(inputMode);
  emit("commit", item.id, inputMode);
  announce(item);
}

function commitExact(id: string, inputMode: PatternReelInput) {
  if (props.disabled || performance.now() < suppressClicksUntil) return;
  const nextIndex = props.items.findIndex((item) => item.id === id);
  if (nextIndex < 0) return;
  prepareAnimatedCommit();
  commitIndex(nextIndex, inputMode);
  void nextTick(() => reelRoot.value?.focus({ preventScroll: true }));
}

function handleStripSelect(id: string) {
  if (props.disabled || performance.now() < suppressClicksUntil) return;
  if (id === previewItem.value?.id) {
    revealWheelTemporarily();
    void nextTick(() => reelRoot.value?.focus({ preventScroll: true }));
    return;
  }
  commitExact(id, "tap");
}

function handleDelete(id: string) {
  revealWheelTemporarily();
  emit("delete", id);
}

function isReelControl(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("[data-reel-control]"));
}

function handlePointerDown(event: PointerEvent) {
  if (
    props.disabled
    || event.button !== 0
    || pointerId !== null
    || props.items.length < 2
    || isReelControl(event.target)
    || !(event.target instanceof Element)
    || !event.target.closest(".pattern-reel__viewport")
  ) return;

  const startedRevealed = revealHeld.value;
  cancelPendingInteraction(true);
  pointerId = event.pointerId;
  pointerStartedRevealed = startedRevealed;
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
  pointerLastY = event.clientY;
  pointerLastAt = performance.now();
  pointerVelocity = 0;
  dragDistance.value = 0;
  reelRoot.value?.setPointerCapture(event.pointerId);
}

function handlePointerMove(event: PointerEvent) {
  if (pointerId !== event.pointerId || horizontalGestureRejected) return;
  const delta = event.clientY - pointerStartY;
  const horizontalDelta = event.clientX - pointerStartX;
  const now = performance.now();
  const elapsed = Math.max(1, now - pointerLastAt);
  pointerVelocity = (event.clientY - pointerLastY) / elapsed;
  pointerLastY = event.clientY;
  pointerLastAt = now;

  if (!dragging.value) {
    if (Math.abs(horizontalDelta) > 6 && Math.abs(horizontalDelta) > Math.abs(delta)) {
      horizontalGestureRejected = true;
      return;
    }
    if (Math.abs(delta) < 6 || Math.abs(delta) <= Math.abs(horizontalDelta)) return;
    dragging.value = true;
    if (pointerStartedRevealed) {
      clearTimeout(collapseTimer);
      collapseTimer = undefined;
      clearTimeout(reboundTimer);
      reelRebounding.value = false;
    }
    reelRoot.value?.setPointerCapture(event.pointerId);
  }
  event.preventDefault();

  const maxTravel = WHEEL_STEP * 1.45;
  dragDistance.value = Math.max(-maxTravel, Math.min(maxTravel, delta));
}

function finishPointer(event: PointerEvent, cancelled = false) {
  if (pointerId !== event.pointerId) return;
  const wasDragging = dragging.value;
  const wasHorizontalRejection = horizontalGestureRejected;
  const delta = dragDistance.value;
  const resumeRevealAfterCancel = wasDragging && cancelled && pointerStartedRevealed;
  pointerId = null;
  pointerStartedRevealed = false;
  horizontalGestureRejected = false;
  dragging.value = false;
  dragDistance.value = 0;

  if (reelRoot.value?.hasPointerCapture(event.pointerId)) {
    reelRoot.value.releasePointerCapture(event.pointerId);
  }

  if (wasHorizontalRejection) {
    if (!cancelled) suppressClicksUntil = performance.now() + 320;
    return;
  }

  if (wasDragging && !cancelled) revealWheelTemporarily();
  if (resumeRevealAfterCancel) revealWheelTemporarily();
  if (!wasDragging || cancelled) return;

  event.preventDefault();
  suppressClicksUntil = performance.now() + 320;

  if (Math.abs(delta) < WHEEL_DRAG_THRESHOLD) {
    beginSettle("drag");
    return;
  }

  const recentVelocity = performance.now() - pointerLastAt <= 80 ? pointerVelocity : 0;
  const projectedDelta = delta + recentVelocity * 120;
  if (Math.abs(projectedDelta) < WHEEL_DRAG_THRESHOLD) {
    beginSettle("drag");
    return;
  }

  const direction = projectedDelta > 0 ? -1 : 1;
  commitIndex(selectedIndex.value + direction, "drag");
}

function handlePointerUp(event: PointerEvent) {
  finishPointer(event);
}

function cancelPointer(event: PointerEvent) {
  finishPointer(event, true);
}

function suppressDragClick(event: MouseEvent) {
  if (
    performance.now() >= suppressClicksUntil
    || !(event.target instanceof Element)
    || !event.target.closest(".pattern-reel__viewport")
  ) return;
  event.preventDefault();
  event.stopPropagation();
}

function normalizedWheelDelta(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 20;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return Math.sign(event.deltaY) * WHEEL_STEP;
  }
  return event.deltaY;
}

function handleWheel(event: WheelEvent) {
  if (
    props.disabled
    || props.items.length < 2
    || event.altKey
    || event.ctrlKey
    || event.metaKey
    || isReelControl(event.target)
    || Math.abs(event.deltaY) <= Math.abs(event.deltaX)
  ) return;
  event.preventDefault();

  if (input.value !== "wheel" || (transientIndex.value === null && wheelAccumulator === 0)) {
    cancelPendingInteraction();
  }
  input.value = "wheel";
  wheelAccumulator += normalizedWheelDelta(event);
  revealWheelTemporarily();

  while (Math.abs(wheelAccumulator) >= WHEEL_STEP) {
    const direction = Math.sign(wheelAccumulator);
    transientIndex.value = wrapIndex((transientIndex.value ?? selectedIndex.value) + direction);
    wheelAccumulator -= direction * WHEEL_STEP;
  }

  if (transientIndex.value !== null) beginSettle("wheel");

  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(() => {
    const target = props.items[transientIndex.value ?? selectedIndex.value];
    wheelAccumulator = 0;
    if (target && target.id !== props.selectedId) {
      emit("commit", target.id, "wheel");
      announce(target);
    }
    transientIndex.value = null;
    settling.value = false;
  }, prefersReducedMotion() ? 120 : WHEEL_SETTLE_DURATION_MS);
}

function setKeyboardImmediate() {
  keyboardImmediate.value = true;
  void nextTick(() => requestAnimationFrame(() => {
    keyboardImmediate.value = false;
  }));
}

function handleKeydown(event: KeyboardEvent) {
  if (props.disabled || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target !== reelRoot.value && isReelControl(event.target)) return;
  let nextIndex: number | null = null;

  if (event.key === "ArrowUp") nextIndex = selectedIndex.value - 1;
  if (event.key === "ArrowDown") nextIndex = selectedIndex.value + 1;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = props.items.length - 1;
  if (nextIndex === null) return;

  event.preventDefault();
  cancelPendingInteraction();
  setKeyboardImmediate();
  commitIndex(nextIndex, "keyboard");
  void nextTick(() => reelRoot.value?.focus());
}

onBeforeUnmount(() => {
  cancelPendingInteraction();
});
</script>

<style scoped>
.pattern-reel {
  --ease-reel-rebound: linear(
    0,
    .06 5%,
    .2 13%,
    .44 25%,
    .7 38%,
    .9 52%,
    .99 61%,
    1.1 72%,
    .96 84%,
    1.025 93%,
    1
  );
  --selected-height: 51.2px;
  --reel-height: 164.8px;

  position: relative;
  display: grid;
  width: 100%;
  min-width: 0;
  background: transparent;
  outline: none;
}

.pattern-reel:focus-visible .pattern-reel__slot--active :deep(.pattern-strip) {
  outline: 2px solid var(--ivory-2);
  outline-offset: -2px;
}

.pattern-reel:focus-visible .pattern-reel__empty {
  outline: 2px solid var(--ivory-2);
  outline-offset: -2px;
}

.pattern-reel__viewport {
  position: relative;
  z-index: 1;
  height: var(--reel-height);
  min-width: 0;
  overflow: hidden;
  touch-action: pan-x;
  user-select: none;
}

.pattern-reel__slot {
  position: absolute;
  z-index: var(--slot-z);
  top: calc(100% - var(--selected-height));
  right: 0;
  left: 0;
  min-width: 0;
  opacity: var(--slot-opacity);
  transform: translate3d(0, var(--slot-y), 0) scale(var(--slot-scale));
  transform-origin: 50% 0;
  transition:
    transform var(--settle-duration) var(--settle-easing),
    opacity var(--settle-duration) var(--settle-opacity-easing);
  will-change: transform, opacity;
}

.pattern-reel__slot--active {
  min-height: var(--selected-height);
}

.pattern-reel__slot--1 {
  pointer-events: none;
}

.pattern-reel--dragging .pattern-reel__slot,
.pattern-reel--keyboard .pattern-reel__slot {
  transition: none;
}

.pattern-reel__empty {
  display: grid;
  min-height: var(--selected-height);
  place-items: center;
  margin: 0;
  padding: 0;
  color: var(--ivory-3);
  font: var(--t-body-s-mono);
  text-align: center;
}

.pattern-reel__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  border: 0;
  clip-path: inset(50%);
  pointer-events: none;
  white-space: nowrap;
}

@media (max-height: 760px) {
  .pattern-reel {
    --reel-height: 148.8px;
  }

  .pattern-reel__slot--depth-3:not(.pattern-reel__slot--active) {
    visibility: hidden;
  }
}

@media (max-height: 660px) {
  .pattern-reel {
    --reel-height: 118.4px;
  }

  .pattern-reel__slot--depth-2:not(.pattern-reel__slot--active) {
    visibility: hidden;
  }
}

@media (max-height: 560px) {
  .pattern-reel {
    --reel-height: 97.6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pattern-reel__slot {
    transition: none;
    will-change: auto;
  }
}

@media (forced-colors: active) {
  .pattern-reel__slot {
    opacity: 1;
  }

  .pattern-reel__slot--1:not(.pattern-reel__slot--active) {
    opacity: 0;
  }
}
</style>
