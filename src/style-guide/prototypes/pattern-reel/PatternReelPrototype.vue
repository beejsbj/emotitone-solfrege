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
    aria-label="Pattern reel. Use up and down arrows to change the selected pattern."
    aria-roledescription="cyclic pattern reel"
    @keydown="handleKeydown"
    @wheel.prevent="handleWheel"
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
          Drag or wheel · tap a visible card · ↑/↓ changes selection
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
            'pattern-reel-prototype__slot--active': slot.slot === 0,
            [`pattern-reel-prototype__slot--depth-${Math.abs(slot.slot)}`]: slot.slot < 0,
          },
        ]"
        :style="slotStyle(slot.slot)"
        :aria-hidden="slot.slot === 1 || undefined"
      >
        <PatternReelSelectedCard
          v-if="slot.slot === 0"
          :item="slot.item"
          :disabled="settling"
          @action="emit('action', $event)"
        />
        <PatternCard
          v-else
          :label="slot.item.label"
          :ordinal="slot.item.ordinal"
          :name="slot.item.name"
          :metadata="slot.item.metadata"
          :spine="slot.item.spine"
          :bar-tape="slot.item.barTape"
          :tabindex="slot.slot < 0 ? 0 : -1"
          @select="commitExact(slot.item.id, 'tap')"
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
import PatternCard from "@/components/compounds/PatternCard.vue";
import Button from "@/components/primatives/Button.vue";
import PatternReelSelectedCard from "./PatternReelSelectedCard.vue";
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
    name: "Wheel face",
    positions: [
      { y: 0, scale: 1, opacity: 1 },
      { y: -58, scale: .95, opacity: .8 },
      { y: -98, scale: .85, opacity: .48 },
      { y: -122, scale: .72, opacity: .2 },
    ],
    step: 58,
    dragThreshold: 29,
    duration: 240,
    easing: "cubic-bezier(.23, 1, .32, 1)",
    maxDragSteps: 3,
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
    maxDragSteps: 3,
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
const dragOffset = ref(0);
const transientIndex = ref<number | null>(null);
const keyboardImmediate = ref(false);
const input = ref<PatternReelPrototypeInput>("initial");
const liveAnnouncement = ref("");

let pointerId: number | null = null;
let pointerStartY = 0;
let pointerLastY = 0;
let pointerLastAt = 0;
let pointerVelocity = 0;
let wheelAccumulator = 0;
let wheelTimer: ReturnType<typeof setTimeout> | undefined;
let settleTimer: ReturnType<typeof setTimeout> | undefined;
let suppressClicksUntil = 0;

const recipe = computed(() => RECIPES[props.variant]);

const selectedIndex = computed(() => {
  const index = props.items.findIndex((item) => item.id === props.selectedId);
  return index >= 0 ? index : Math.max(0, props.items.length - 1);
});

const displayIndex = computed(() => transientIndex.value ?? selectedIndex.value);
const displayItem = computed(() => props.items[displayIndex.value]);
const selectedPosition = computed(() => displayIndex.value + 1);

function wrapIndex(index: number) {
  if (!props.items.length) return 0;
  return ((index % props.items.length) + props.items.length) % props.items.length;
}

function slotForIndex(itemIndex: number) {
  const count = props.items.length;
  if (!count) return null;

  const backward = (displayIndex.value - itemIndex + count) % count;
  if (backward === 0) return 0;

  const predecessorCount = Math.min(3, count - 1);
  if (backward <= predecessorCount) return -backward;

  const forward = (itemIndex - displayIndex.value + count) % count;
  if (count > predecessorCount + 1 && forward === 1) return 1;
  return null;
}

const renderedSlots = computed(() => props.items
  .map((item, itemIndex) => ({ item, slot: slotForIndex(itemIndex) }))
  .filter((entry): entry is { item: PatternReelPrototypeItem; slot: number } => (
    entry.slot !== null
  )));

function slotStyle(slot: number): CSSProperties {
  if (slot === 1) {
    return {
      "--slot-y": `${recipe.value.step}px`,
      "--slot-scale": "1.025",
      "--slot-opacity": "0",
      "--slot-z": "8",
      "--drag-y": `${dragOffset.value}px`,
      "--settle-duration": `${recipe.value.duration}ms`,
      "--settle-easing": recipe.value.easing,
    } as CSSProperties;
  }

  const depth = Math.abs(slot);
  const position = recipe.value.positions[Math.min(depth, 3)];
  return {
    "--slot-y": `${position.y}px`,
    "--slot-scale": String(position.scale),
    "--slot-opacity": String(position.opacity),
    "--slot-z": String(20 - depth),
    "--drag-y": `${dragOffset.value}px`,
    "--settle-duration": `${recipe.value.duration}ms`,
    "--settle-easing": recipe.value.easing,
  } as CSSProperties;
}

function setState(
  nextInput: PatternReelPrototypeInput,
  previewId = displayItem.value?.id ?? props.selectedId,
  isSettling = settling.value,
) {
  input.value = nextInput;
  emit("state", { input: nextInput, previewId, settling: isSettling });
}

function announce(item: PatternReelPrototypeItem | undefined) {
  if (!item) return;
  const position = props.items.findIndex((candidate) => candidate.id === item.id) + 1;
  liveAnnouncement.value = `${item.name}, ${position} of ${props.items.length}`;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function beginSettle(inputMode: PatternReelPrototypeInput) {
  clearTimeout(settleTimer);
  if (inputMode === "keyboard" || prefersReducedMotion()) {
    settling.value = false;
    setState(inputMode, displayItem.value?.id, false);
    return;
  }
  settling.value = true;
  setState(inputMode, displayItem.value?.id, true);
  settleTimer = setTimeout(() => {
    settling.value = false;
    setState(inputMode, displayItem.value?.id, false);
  }, recipe.value.duration);
}

function commitIndex(nextIndex: number, inputMode: PatternReelPrototypeInput) {
  const item = props.items[wrapIndex(nextIndex)];
  if (!item || item.id === props.selectedId) {
    setState(inputMode, item?.id ?? props.selectedId, false);
    return;
  }

  beginSettle(inputMode);
  emit("commit", item.id, inputMode);
  announce(item);
}

function commitStep(step: number, inputMode: PatternReelPrototypeInput) {
  if (props.items.length < 2 || settling.value) return;
  commitIndex(selectedIndex.value + step, inputMode);
}

function commitExact(id: string, inputMode: PatternReelPrototypeInput) {
  if (performance.now() < suppressClicksUntil || settling.value) return;
  const nextIndex = props.items.findIndex((item) => item.id === id);
  if (nextIndex < 0) return;
  commitIndex(nextIndex, inputMode);
}

function isReelControl(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("[data-reel-control]"));
}

function handlePointerDown(event: PointerEvent) {
  if (
    event.button !== 0
    || props.items.length < 2
    || isReelControl(event.target)
    || !(event.target instanceof Element)
    || !event.target.closest(".pattern-reel-prototype__viewport")
  ) return;

  pointerId = event.pointerId;
  pointerStartY = event.clientY;
  pointerLastY = event.clientY;
  pointerLastAt = performance.now();
  pointerVelocity = 0;
  dragOffset.value = 0;
  reelRoot.value?.setPointerCapture(event.pointerId);
}

function handlePointerMove(event: PointerEvent) {
  if (pointerId !== event.pointerId) return;
  const delta = event.clientY - pointerStartY;
  const now = performance.now();
  const elapsed = Math.max(1, now - pointerLastAt);
  pointerVelocity = (event.clientY - pointerLastY) / elapsed;
  pointerLastY = event.clientY;
  pointerLastAt = now;

  if (!dragging.value && Math.abs(delta) < 6) return;
  dragging.value = true;
  event.preventDefault();

  const maxTravel = recipe.value.step * (recipe.value.maxDragSteps + .45);
  dragOffset.value = Math.max(-maxTravel, Math.min(maxTravel, delta));
  setState("drag", props.selectedId, false);
}

function finishPointer(event: PointerEvent, cancelled = false) {
  if (pointerId !== event.pointerId) return;
  const wasDragging = dragging.value;
  const delta = dragOffset.value;
  pointerId = null;
  dragging.value = false;
  dragOffset.value = 0;

  if (reelRoot.value?.hasPointerCapture(event.pointerId)) {
    reelRoot.value.releasePointerCapture(event.pointerId);
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

  let travel = Math.abs(delta);
  if (props.variant === "wheel") {
    travel += Math.abs(pointerVelocity) * 120;
  }

  const steps = props.variant === "cassette"
    ? 1
    : Math.max(1, Math.min(recipe.value.maxDragSteps, Math.round(travel / recipe.value.step)));
  const direction = delta > 0 ? -1 : 1;
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
  if (props.items.length < 2) return;
  wheelAccumulator += normalizedWheelDelta(event);
  const threshold = recipe.value.step;

  while (Math.abs(wheelAccumulator) >= threshold) {
    const direction = Math.sign(wheelAccumulator);
    transientIndex.value = wrapIndex((transientIndex.value ?? selectedIndex.value) + direction);
    wheelAccumulator -= direction * threshold;
  }

  if (transientIndex.value !== null) beginSettle("wheel");

  if (transientIndex.value !== null && prefersReducedMotion()) {
    const target = props.items[transientIndex.value];
    if (target && target.id !== props.selectedId) {
      emit("commit", target.id, "wheel");
      announce(target);
    }
    transientIndex.value = null;
    setState("wheel", target?.id ?? props.selectedId, false);
    return;
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
    setState("wheel", target?.id ?? props.selectedId, settling.value);
  }, 120);
}

function setKeyboardImmediate() {
  keyboardImmediate.value = true;
  void nextTick(() => requestAnimationFrame(() => {
    keyboardImmediate.value = false;
  }));
}

function handleKeydown(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  let nextIndex: number | null = null;

  if (event.key === "ArrowUp") nextIndex = selectedIndex.value - 1;
  if (event.key === "ArrowDown") nextIndex = selectedIndex.value + 1;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = props.items.length - 1;
  if (nextIndex === null) return;

  event.preventDefault();
  setKeyboardImmediate();
  commitIndex(nextIndex, "keyboard");
}

watch(() => props.variant, () => {
  dragOffset.value = 0;
  transientIndex.value = null;
  wheelAccumulator = 0;
  settling.value = false;
  setState(input.value, props.selectedId, false);
});

onBeforeUnmount(() => {
  clearTimeout(wheelTimer);
  clearTimeout(settleTimer);
});
</script>

<style scoped>
.pattern-reel-prototype {
  --selected-height: 140px;
  --reel-height: 282px;
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
  transform: translate3d(0, calc(var(--slot-y) + var(--drag-y)), 0) scale(var(--slot-scale));
  transform-origin: 50% 0;
  transition:
    transform var(--settle-duration) var(--settle-easing),
    opacity var(--settle-duration) var(--settle-easing);
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
  --reel-height: 250px;
}

@media (max-width: 520px) {
  .pattern-reel-prototype {
    padding-inline: var(--s-4);
  }
}

@media (max-height: 760px) {
  .pattern-reel-prototype__slot--depth-3 {
    visibility: hidden;
  }
}

@media (max-height: 660px) {
  .pattern-reel-prototype__slot--depth-2 {
    visibility: hidden;
  }
}

@media (max-height: 560px) {
  .pattern-reel-prototype__slot--depth-1 {
    visibility: hidden;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pattern-reel-prototype__slot {
    transform: translate3d(0, var(--slot-y), 0) scale(var(--slot-scale));
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
}
</style>
