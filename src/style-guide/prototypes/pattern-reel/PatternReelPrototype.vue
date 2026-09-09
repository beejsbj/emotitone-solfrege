<template>
  <section
    ref="reelRoot"
    class="pattern-reel-prototype"
    :class="[
      `pattern-reel-prototype--${variant}`,
      {
        'pattern-reel-prototype--dragging': dragging,
        'pattern-reel-prototype--settling': settling,
        'pattern-reel-prototype--keyboard': keyboardImmediate,
      },
    ]"
    tabindex="0"
    role="group"
    aria-label="Pattern reel. Use up and down arrows to change the selected pattern."
    aria-roledescription="cyclic pattern reel"
    @keydown="handleKeydown"
    @wheel="handleWheel"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="cancelPointer"
    @click.capture="suppressDragClick"
  >
    <header class="pattern-reel-prototype__head" data-reel-control>
      <div>
        <span class="pattern-reel-prototype__eyebrow">PatternReel · {{ recipe.name }}</span>
        <span class="pattern-reel-prototype__count">
          {{ selectedPosition }} / {{ items.length }} · cyclic
        </span>
        <span class="pattern-reel-prototype__hint">
          {{ interactionHint }}
        </span>
      </div>

      <div class="pattern-reel-prototype__controls" aria-label="Reel navigation">
        <Button
          size="sm"
          tone="ink"
          :disabled="items.length < 2"
          accessible-name="Select previous pattern"
          title="Previous pattern"
          @click="commitStep(-1, 'control')"
        >
          <ChevronUp aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          tone="ivory"
          :disabled="items.length < 2"
          accessible-name="Select next pattern"
          title="Next pattern"
          @click="commitStep(1, 'control')"
        >
          <ChevronDown aria-hidden="true" />
        </Button>
      </div>
    </header>

    <div class="pattern-reel-prototype__viewport">
      <div class="pattern-reel-prototype__fade" aria-hidden="true"></div>

      <div
        v-for="slot in renderedSlots"
        :key="slot.item.id"
        class="pattern-reel-prototype__slot"
        :class="[
          `pattern-reel-prototype__slot--${slot.slot}`,
          {
            'pattern-reel-prototype__slot--active': isActivePreview(slot.item.id),
            [`pattern-reel-prototype__slot--depth-${Math.abs(slot.slot)}`]: slot.slot < 0,
          },
        ]"
        :style="slotStyle(slot.slot, slot.item.id)"
        :aria-hidden="slot.slot === 1 && !isActivePreview(slot.item.id) || undefined"
      >
        <PatternStripPrototype
          :item="slot.item"
          :active="isActivePreview(slot.item.id)"
          :disabled="dragging || settling || transientIndex !== null"
          @select="handleCardSelect(slot.item.id)"
          @action="emit('action', $event)"
        />
      </div>
    </div>

    <span class="pattern-reel-prototype__sr-only" aria-live="polite">
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
  watch,
  type CSSProperties,
} from "vue";
import { ChevronDown, ChevronUp } from "lucide-vue-next";
import Button from "@/components/primatives/Button.vue";
import PatternStripPrototype from "./PatternStripPrototype.vue";
import type {
  PatternReelPrototypeInput,
  PatternReelPrototypeItem,
  PatternReelPrototypeState,
  PatternReelPrototypeVariant,
} from "./types";

interface ReelRecipe {
  name: string;
  positions: Array<{ y: number; scale: number; opacity: number }>;
  step: number;
  dragThreshold: number;
  duration: number;
  easing: string;
  maxDragSteps: number;
}

const RECIPES: Record<PatternReelPrototypeVariant, ReelRecipe> = {
  wheel: {
    name: "Wheel deck",
    positions: [
      { y: 0, scale: 1, opacity: 1 },
      { y: -58, scale: .95, opacity: .8 },
      { y: -98, scale: .85, opacity: .48 },
      { y: -122, scale: .72, opacity: .2 },
    ],
    step: 58,
    dragThreshold: 29,
    duration: 220,
    easing: "var(--ease-brush)",
    maxDragSteps: 1,
  },
  steps: {
    name: "Paper steps",
    positions: [
      { y: 0, scale: 1, opacity: 1 },
      { y: -48, scale: .97, opacity: .78 },
      { y: -88, scale: .94, opacity: .52 },
      { y: -120, scale: .91, opacity: .28 },
    ],
    step: 48,
    dragThreshold: 24,
    duration: 180,
    easing: "cubic-bezier(.215, .61, .355, 1)",
    maxDragSteps: 1,
  },
  cassette: {
    name: "Tight cassette",
    positions: [
      { y: 0, scale: 1, opacity: 1 },
      { y: -34, scale: .985, opacity: .88 },
      { y: -64, scale: .97, opacity: .62 },
      { y: -90, scale: .955, opacity: .35 },
    ],
    step: 34,
    dragThreshold: 17,
    duration: 140,
    easing: "cubic-bezier(.165, .84, .44, 1)",
    maxDragSteps: 1,
  },
};

const WHEEL_DECK_POSITIONS = [
  { y: 0, scale: 1, opacity: 1 },
  { y: -18, scale: .997, opacity: .92 },
  { y: -31, scale: .992, opacity: .74 },
  { y: -42, scale: .986, opacity: .52 },
];
const WHEEL_UNWIND_DISTANCE = 36;
const WHEEL_OPEN_HOLD_MS = 900;
const WHEEL_REBOUND_DURATION_MS = 200;

const props = defineProps<{
  items: PatternReelPrototypeItem[];
  selectedId: string;
  variant: PatternReelPrototypeVariant;
}>();

const emit = defineEmits<{
  commit: [id: string, input: PatternReelPrototypeInput];
  state: [state: PatternReelPrototypeState];
  action: [action: string];
}>();

const reelRoot = ref<HTMLElement | null>(null);
const dragging = ref(false);
const settling = ref(false);
const dragDistance = ref(0);
const transientIndex = ref<number | null>(null);
const revealHeld = ref(false);
const reelRebounding = ref(false);
const keyboardImmediate = ref(false);
const input = ref<PatternReelPrototypeInput>("initial");
const liveAnnouncement = ref("");

let pointerId: number | null = null;
let pointerStartX = 0;
let pointerStartY = 0;
let pointerLastY = 0;
let pointerLastAt = 0;
let pointerVelocity = 0;
let wheelAccumulator = 0;
let wheelTimer: ReturnType<typeof setTimeout> | undefined;
let settleTimer: ReturnType<typeof setTimeout> | undefined;
let collapseTimer: ReturnType<typeof setTimeout> | undefined;
let reboundTimer: ReturnType<typeof setTimeout> | undefined;
let suppressClicksUntil = 0;

const recipe = computed(() => RECIPES[props.variant]);
const interactionHint = computed(() => props.variant === "wheel"
  ? "Drag to unwind the deck · wheel, tap, or ↑/↓ to select"
  : "Drag or wheel · tap a visible card · ↑/↓ changes selection");

const selectedIndex = computed(() => {
  const index = props.items.findIndex((item) => item.id === props.selectedId);
  return index >= 0 ? index : Math.max(0, props.items.length - 1);
});

const displayIndex = computed(() => transientIndex.value ?? selectedIndex.value);
const displayItem = computed(() => props.items[displayIndex.value]);
const dragProgress = computed(() => {
  if (!dragging.value || prefersReducedMotion()) return 0;
  const progress = -dragDistance.value / recipe.value.step;
  return Math.max(-1, Math.min(1, progress));
});
const unwindProgress = computed(() => {
  if (props.variant !== "wheel" || prefersReducedMotion()) return 0;
  if (revealHeld.value || transientIndex.value !== null) return 1;
  if (!dragging.value) return 0;
  return Math.min(1, Math.abs(dragDistance.value) / WHEEL_UNWIND_DISTANCE);
});
const previewIndex = computed(() => dragging.value
  ? wrapIndex(selectedIndex.value + Math.round(dragProgress.value))
  : displayIndex.value);
const previewItem = computed(() => props.items[previewIndex.value]);
const selectedPosition = computed(() => previewIndex.value + 1);

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
  const stagesForwardIdentity = dragging.value && dragProgress.value > 0 && count <= 4;
  if (stagesForwardIdentity && forward === 1) return 1;

  const predecessorCount = Math.min(3, count - 1 - Number(stagesForwardIdentity));
  if (backward <= predecessorCount) return -backward;

  if (count > predecessorCount + 1 && forward === 1) return 1;
  return null;
}

const renderedSlots = computed(() => props.items
  .map((item, itemIndex) => ({ item, slot: slotForIndex(itemIndex) }))
  .filter((entry): entry is { item: PatternReelPrototypeItem; slot: number } => (
    entry.slot !== null
  )));

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function positionAt(slot: number) {
  if (slot === 1) {
    return { y: recipe.value.step, scale: 1.025, opacity: 0 };
  }
  if (slot >= 0) return recipe.value.positions[0];

  const depth = Math.min(Math.abs(slot), 3);
  const unwound = recipe.value.positions[depth];
  if (props.variant !== "wheel") return unwound;

  const deck = WHEEL_DECK_POSITIONS[depth];
  return {
    y: lerp(deck.y, unwound.y, unwindProgress.value),
    scale: lerp(deck.scale, unwound.scale, unwindProgress.value),
    opacity: lerp(deck.opacity, unwound.opacity, unwindProgress.value),
  };
}

function interpolatedPosition(coordinate: number) {
  if (coordinate < -3) {
    const farthest = positionAt(-3);
    const overflow = Math.min(1, Math.abs(coordinate + 3));
    return {
      y: farthest.y - overflow * recipe.value.step * .45,
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

function slotStyle(slot: number, id: string): CSSProperties {
  const position = interpolatedPosition(slot - dragProgress.value);
  const useRebound = props.variant === "wheel" && reelRebounding.value;
  return {
    "--slot-y": `${position.y}px`,
    "--slot-scale": String(position.scale),
    "--slot-opacity": String(position.opacity),
    "--slot-z": String(isActivePreview(id) ? 20 : 18 - Math.round(Math.abs(slot - dragProgress.value))),
    "--settle-duration": useRebound
      ? `${WHEEL_REBOUND_DURATION_MS}ms`
      : `${recipe.value.duration}ms`,
    "--settle-easing": useRebound
      ? "var(--ease-reel-rebound)"
      : recipe.value.easing,
    "--settle-opacity-easing": useRebound
      ? "var(--ease-brush)"
      : recipe.value.easing,
  } as CSSProperties;
}

function setState(
  nextInput: PatternReelPrototypeInput,
  previewId = displayItem.value?.id ?? props.selectedId,
  isSettling = settling.value,
) {
  const progress = unwindProgress.value;
  input.value = nextInput;
  emit("state", {
    input: nextInput,
    previewId,
    settling: isSettling,
    posture: props.variant !== "wheel"
      ? "fixed"
      : progress <= 0
        ? "deck"
        : progress >= .99
          ? "unwound"
          : "unwinding",
  });
}

function announce(item: PatternReelPrototypeItem | undefined) {
  if (!item) return;
  const position = props.items.findIndex((candidate) => candidate.id === item.id) + 1;
  liveAnnouncement.value = `${item.name}, ${position} of ${props.items.length}`;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function beginSettle(inputMode: PatternReelPrototypeInput, previewId?: string) {
  clearTimeout(settleTimer);
  if (inputMode === "keyboard" || prefersReducedMotion()) {
    settling.value = false;
    setState(inputMode, previewId ?? displayItem.value?.id, false);
    return;
  }
  settling.value = true;
  setState(inputMode, previewId ?? displayItem.value?.id, true);
  settleTimer = setTimeout(() => {
    settling.value = false;
    setState(inputMode, previewId ?? displayItem.value?.id, false);
  }, recipe.value.duration);
}

function revealWheelTemporarily(inputMode: PatternReelPrototypeInput) {
  if (props.variant !== "wheel" || prefersReducedMotion()) {
    revealHeld.value = false;
    setState(inputMode, displayItem.value?.id ?? props.selectedId, false);
    return;
  }

  clearTimeout(collapseTimer);
  clearTimeout(reboundTimer);
  reelRebounding.value = true;
  revealHeld.value = true;
  setState(inputMode, displayItem.value?.id ?? props.selectedId, settling.value);
  reboundTimer = setTimeout(() => {
    reelRebounding.value = false;
  }, WHEEL_REBOUND_DURATION_MS);
  collapseTimer = setTimeout(() => {
    clearTimeout(reboundTimer);
    reelRebounding.value = true;
    revealHeld.value = false;
    setState(inputMode, displayItem.value?.id ?? props.selectedId, settling.value);
    reboundTimer = setTimeout(() => {
      reelRebounding.value = false;
    }, WHEEL_REBOUND_DURATION_MS);
  }, WHEEL_REBOUND_DURATION_MS + WHEEL_OPEN_HOLD_MS);
}

function cancelPendingInteraction(preserveReveal = false) {
  clearTimeout(wheelTimer);
  clearTimeout(settleTimer);
  clearTimeout(collapseTimer);
  clearTimeout(reboundTimer);
  wheelAccumulator = 0;
  transientIndex.value = null;
  if (!preserveReveal) revealHeld.value = false;
  reelRebounding.value = false;
  settling.value = false;
  keyboardImmediate.value = false;
  dragDistance.value = 0;
  dragging.value = false;

  if (pointerId !== null && reelRoot.value?.hasPointerCapture(pointerId)) {
    reelRoot.value.releasePointerCapture(pointerId);
  }
  pointerId = null;
}

function commitIndex(nextIndex: number, inputMode: PatternReelPrototypeInput) {
  const item = props.items[wrapIndex(nextIndex)];
  if (!item || item.id === props.selectedId) {
    setState(inputMode, item?.id ?? props.selectedId, false);
    return;
  }

  beginSettle(inputMode, item.id);
  emit("commit", item.id, inputMode);
  announce(item);
}

function commitStep(step: number, inputMode: PatternReelPrototypeInput) {
  if (props.items.length < 2) return;
  cancelPendingInteraction();
  commitIndex(selectedIndex.value + step, inputMode);
}

function commitExact(id: string, inputMode: PatternReelPrototypeInput) {
  if (performance.now() < suppressClicksUntil) return;
  const nextIndex = props.items.findIndex((item) => item.id === id);
  if (nextIndex < 0) return;
  cancelPendingInteraction();
  commitIndex(nextIndex, inputMode);
  void nextTick(() => reelRoot.value?.focus({ preventScroll: true }));
}

function handleCardSelect(id: string) {
  if (performance.now() < suppressClicksUntil) return;
  if (id === previewItem.value?.id) {
    revealWheelTemporarily("tap");
    void nextTick(() => reelRoot.value?.focus({ preventScroll: true }));
    return;
  }
  commitExact(id, "tap");
}

function isReelControl(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("[data-reel-control]"));
}

function handlePointerDown(event: PointerEvent) {
  if (
    event.button !== 0
    || pointerId !== null
    || props.items.length < 2
    || isReelControl(event.target)
    || !(event.target instanceof Element)
    || !event.target.closest(".pattern-reel-prototype__viewport")
  ) return;

  cancelPendingInteraction(true);
  pointerId = event.pointerId;
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
  pointerLastY = event.clientY;
  pointerLastAt = performance.now();
  pointerVelocity = 0;
  dragDistance.value = 0;
}

function handlePointerMove(event: PointerEvent) {
  if (pointerId !== event.pointerId) return;
  const delta = event.clientY - pointerStartY;
  const horizontalDelta = event.clientX - pointerStartX;
  const now = performance.now();
  const elapsed = Math.max(1, now - pointerLastAt);
  pointerVelocity = (event.clientY - pointerLastY) / elapsed;
  pointerLastY = event.clientY;
  pointerLastAt = now;

  if (!dragging.value) {
    if (Math.abs(horizontalDelta) > 6 && Math.abs(horizontalDelta) > Math.abs(delta)) {
      pointerId = null;
      return;
    }
    if (Math.abs(delta) < 6 || Math.abs(delta) <= Math.abs(horizontalDelta)) return;
    dragging.value = true;
    reelRoot.value?.setPointerCapture(event.pointerId);
  }
  event.preventDefault();

  const maxTravel = recipe.value.step * (recipe.value.maxDragSteps + .45);
  dragDistance.value = Math.max(-maxTravel, Math.min(maxTravel, delta));
  setState("drag", previewItem.value?.id ?? props.selectedId, false);
}

function finishPointer(event: PointerEvent, cancelled = false) {
  if (pointerId !== event.pointerId) return;
  const wasDragging = dragging.value;
  const delta = dragDistance.value;
  pointerId = null;
  dragging.value = false;
  dragDistance.value = 0;

  if (reelRoot.value?.hasPointerCapture(event.pointerId)) {
    reelRoot.value.releasePointerCapture(event.pointerId);
  }

  if (wasDragging && props.variant === "wheel") {
    revealWheelTemporarily("drag");
  }

  if (!wasDragging || cancelled) {
    setState("drag", props.selectedId, false);
    return;
  }

  event.preventDefault();
  suppressClicksUntil = performance.now() + 320;

  if (Math.abs(delta) < recipe.value.dragThreshold) {
    beginSettle("drag");
    return;
  }

  const recentVelocity = performance.now() - pointerLastAt <= 80 ? pointerVelocity : 0;
  let projectedDelta = delta;
  if (props.variant === "wheel") {
    projectedDelta += recentVelocity * 120;
  }

  if (Math.abs(projectedDelta) < recipe.value.dragThreshold) {
    beginSettle("drag", props.selectedId);
    return;
  }

  const steps = props.variant === "cassette"
    ? 1
    : Math.max(1, Math.min(recipe.value.maxDragSteps, Math.round(Math.abs(projectedDelta) / recipe.value.step)));
  const direction = projectedDelta > 0 ? -1 : 1;
  commitIndex(selectedIndex.value + direction * steps, "drag");
}

function handlePointerUp(event: PointerEvent) {
  finishPointer(event);
}

function cancelPointer(event: PointerEvent) {
  finishPointer(event, true);
}

function suppressDragClick(event: MouseEvent) {
  if (performance.now() >= suppressClicksUntil) return;
  event.preventDefault();
  event.stopPropagation();
}

function normalizedWheelDelta(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

function handleWheel(event: WheelEvent) {
  if (
    props.items.length < 2
    || isReelControl(event.target)
    || Math.abs(event.deltaY) <= Math.abs(event.deltaX)
  ) return;
  event.preventDefault();

  if (input.value !== "wheel" || (transientIndex.value === null && wheelAccumulator === 0)) {
    cancelPendingInteraction();
  }
  input.value = "wheel";
  wheelAccumulator += normalizedWheelDelta(event);
  revealWheelTemporarily("wheel");
  const threshold = recipe.value.step;

  while (Math.abs(wheelAccumulator) >= threshold) {
    const direction = Math.sign(wheelAccumulator);
    transientIndex.value = wrapIndex((transientIndex.value ?? selectedIndex.value) + direction);
    wheelAccumulator -= direction * threshold;
  }

  if (transientIndex.value !== null) {
    beginSettle("wheel", displayItem.value?.id);
  }

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
    setState("wheel", target?.id ?? props.selectedId, false);
  }, prefersReducedMotion() ? 120 : recipe.value.duration);
}

function setKeyboardImmediate() {
  keyboardImmediate.value = true;
  void nextTick(() => requestAnimationFrame(() => {
    keyboardImmediate.value = false;
  }));
}

function handleKeydown(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
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

watch(() => props.variant, () => {
  cancelPendingInteraction();
  setState(input.value, props.selectedId, false);
});

onBeforeUnmount(() => {
  cancelPendingInteraction();
});
</script>

<style scoped>
.pattern-reel-prototype {
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
  --selected-height: 64px;
  --reel-height: 206px;
  position: relative;
  display: grid;
  min-width: 0;
  padding: var(--s-5) var(--s-5) 0;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--ink) 52%, transparent), transparent 32%),
    var(--ink-2);
  box-shadow: var(--ring);
  outline: none;
}

.pattern-reel-prototype:focus-visible {
  box-shadow: inset 0 0 0 2px var(--ivory-2);
}

.pattern-reel-prototype__head {
  position: relative;
  z-index: 40;
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-5);
  padding-bottom: var(--s-4);
  border-bottom: 1px solid var(--hairline-2);
}

.pattern-reel-prototype__head > div:first-child {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.pattern-reel-prototype__eyebrow {
  color: var(--ivory);
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.pattern-reel-prototype__count {
  margin-top: 3px;
  color: var(--ivory-3);
  font: var(--t-caption);
  letter-spacing: .12em;
  text-transform: uppercase;
}

.pattern-reel-prototype__controls {
  display: flex;
  flex: 0 0 auto;
  gap: var(--s-4);
}

.pattern-reel-prototype__viewport {
  position: relative;
  z-index: 1;
  height: var(--reel-height);
  min-width: 0;
  overflow: hidden;
  touch-action: pan-x;
  user-select: none;
}

.pattern-reel-prototype__fade {
  position: absolute;
  z-index: 30;
  inset: 0 0 auto;
  height: 52px;
  background: linear-gradient(180deg, var(--ink-2), transparent);
  pointer-events: none;
}

.pattern-reel-prototype__slot {
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

.pattern-reel-prototype__slot--active {
  min-height: var(--selected-height);
}

.pattern-reel-prototype__slot--1 {
  pointer-events: none;
}

.pattern-reel-prototype--dragging .pattern-reel-prototype__slot,
.pattern-reel-prototype--keyboard .pattern-reel-prototype__slot {
  transition: none;
}

.pattern-reel-prototype__hint {
  margin-top: var(--s-2);
  color: var(--ivory-3);
  font: var(--t-caption);
  letter-spacing: .08em;
  text-transform: uppercase;
}

.pattern-reel-prototype__sr-only {
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

.pattern-reel-prototype--cassette {
  --reel-height: 174px;
}

@media (max-width: 520px) {
  .pattern-reel-prototype {
    padding-inline: var(--s-4);
  }
}

@media (max-height: 760px) {
  .pattern-reel-prototype {
    --reel-height: 186px;
  }

  .pattern-reel-prototype__slot--depth-3:not(.pattern-reel-prototype__slot--active) {
    visibility: hidden;
  }
}

@media (max-height: 660px) {
  .pattern-reel-prototype {
    --reel-height: 148px;
  }

  .pattern-reel-prototype__slot--depth-2:not(.pattern-reel-prototype__slot--active) {
    visibility: hidden;
  }
}

@media (max-height: 560px) {
  .pattern-reel-prototype {
    --reel-height: 64px;
  }

  .pattern-reel-prototype__slot--depth-1:not(.pattern-reel-prototype__slot--active) {
    visibility: hidden;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pattern-reel-prototype__slot {
    transition: none;
    will-change: auto;
  }
}

@media (forced-colors: active) {
  .pattern-reel-prototype {
    border: 1px solid CanvasText;
    background: Canvas;
  }

  .pattern-reel-prototype__slot {
    opacity: 1;
  }

  .pattern-reel-prototype__slot--1:not(.pattern-reel-prototype__slot--active) {
    opacity: 0;
  }
}
</style>
