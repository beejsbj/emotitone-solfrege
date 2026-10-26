<script setup lang="ts">
/**
 * Reel Switch (BJS-572): the home reel and one reel per saved Loop, side by
 * side. A sideways drag across the reel turns to the neighbouring reel; a row
 * of pips on the reel's bottom edge says which reel is showing. Props in, a
 * change out: no store. The slot is the reel itself; the switch owns only the
 * sideways gesture, the pips and the page's follow and entrance.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useReducedMotion } from "@/composables/useReducedMotion";
import { trackReelSwipe, type ReelSwipe } from "./reelSwipe";

export interface ReelSwitchReel {
  id: string;
  /** For assistive technology only; no reel name is drawn by the switch. */
  name: string;
  kind: "home" | "loop";
  /** Every pattern of this Loop is playing (its pip wears a Brass ring). */
  sounding?: boolean;
}

export type ReelSwitchInput = "swipe" | "keyboard";

const props = withDefaults(defineProps<{
  reels: ReelSwitchReel[];
  activeId: string;
  disabled?: boolean;
}>(), {
  disabled: false,
});

const emit = defineEmits<{
  change: [id: string, input: ReelSwitchInput];
}>();

const ENTRANCE_PX = 32;
const reduced = useReducedMotion();
const root = ref<HTMLElement | null>(null);
const offset = ref(0);
const following = ref(false);
const settling = ref(false);
const announcement = ref("");

const paged = computed(() => props.reels.length > 1);
const activeIndex = computed(() => Math.max(0, props.reels.findIndex((reel) => reel.id === props.activeId)));
const active = computed(() => props.reels[activeIndex.value]);
const label = computed(() => paged.value
  ? `${active.value?.name ?? "Reel"}, reel ${activeIndex.value + 1} of ${props.reels.length}. Swipe sideways or use Left and Right arrows to change reel.`
  : undefined);
const pageStyle = computed(() => ({
  transform: offset.value ? `translate3d(${offset.value}px, 0, 0)` : undefined,
  opacity: offset.value ? String(Math.max(.4, 1 - Math.abs(offset.value) / 400)) : undefined,
}));

let swipe: ReelSwipe | null = null;
let pointerId: number | null = null;
let settleTimer: ReturnType<typeof setTimeout> | undefined;

function neighbours() {
  return { previous: activeIndex.value > 0, next: activeIndex.value < props.reels.length - 1 };
}

function turn(direction: -1 | 1, input: ReelSwitchInput): boolean {
  const target = props.reels[activeIndex.value + direction];
  if (!target) return false;
  emit("change", target.id, input);
  return true;
}

function settle(from: number) {
  clearTimeout(settleTimer);
  if (reduced.value || !from) {
    offset.value = 0;
    settling.value = false;
    return;
  }
  // Placed without a transition, then released to rest with one.
  settling.value = false;
  offset.value = from;
  void nextTick(() => requestAnimationFrame(() => {
    settling.value = true;
    offset.value = 0;
    settleTimer = setTimeout(() => { settling.value = false; }, 220);
  }));
}

function isControl(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("[data-reel-control], input, textarea"));
}

function onPointerDown(event: PointerEvent) {
  if (!paged.value || props.disabled || pointerId !== null || event.button !== 0 || isControl(event.target)) return;
  pointerId = event.pointerId;
  swipe = trackReelSwipe({ x: event.clientX, y: event.clientY, t: performance.now() });
}

function onPointerMove(event: PointerEvent) {
  if (event.pointerId !== pointerId || !swipe) return;
  const axis = swipe.axis(event.clientX, event.clientY);
  if (axis === "vertical") {
    // The reel's own drag: not ours.
    pointerId = null;
    swipe = null;
    return;
  }
  if (axis !== "sideways") return;
  swipe.sample(event.clientX, performance.now());
  if (!following.value) {
    following.value = true;
    clearTimeout(settleTimer);
    settling.value = false;
    root.value?.setPointerCapture?.(event.pointerId);
  }
  event.preventDefault();
  if (!reduced.value) offset.value = swipe.follow(event.clientX, neighbours());
}

function finish(event: PointerEvent, cancelled: boolean) {
  if (event.pointerId !== pointerId) return;
  const current = swipe;
  const followed = offset.value;
  pointerId = null;
  swipe = null;
  if (root.value?.hasPointerCapture?.(event.pointerId)) root.value.releasePointerCapture(event.pointerId);
  if (!following.value) return;
  following.value = false;
  const width = root.value?.getBoundingClientRect().width || window.innerWidth;
  const direction = cancelled || !current ? 0 : current.release(event.clientX, event.clientY, performance.now(), width);
  if (direction && turn(direction, "swipe")) {
    // The next reel comes in from the side the finger left.
    settle(direction === 1 ? ENTRANCE_PX : -ENTRANCE_PX);
    return;
  }
  settle(followed);
}

function onKeydown(event: KeyboardEvent) {
  if (!paged.value || props.disabled || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  if (event.target instanceof Element && event.target.closest("input, textarea")) return;
  if (turn(event.key === "ArrowLeft" ? -1 : 1, "keyboard")) event.preventDefault();
}

watch(() => props.activeId, () => {
  if (!paged.value || !active.value) return;
  announcement.value = `${active.value.name}, reel ${activeIndex.value + 1} of ${props.reels.length}`;
});

onBeforeUnmount(() => clearTimeout(settleTimer));
</script>

<template>
  <div
    ref="root"
    class="reel-switch"
    :class="{
      'reel-switch--paged': paged,
      'reel-switch--following': following,
      'reel-switch--settling': settling,
    }"
    :role="paged ? 'group' : undefined"
    :aria-roledescription="paged ? 'reels' : undefined"
    :aria-label="label"
    :data-reel="active?.id"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="finish($event, false)"
    @pointercancel="finish($event, true)"
    @keydown="onKeydown"
  >
    <div class="reel-switch__page" :style="pageStyle">
      <slot />
    </div>
    <div v-if="paged" class="reel-switch__pips" aria-hidden="true" data-testid="reel-pips">
      <span
        v-for="reel in reels"
        :key="reel.id"
        class="reel-switch__pip"
        :class="{
          'reel-switch__pip--home': reel.kind === 'home',
          'reel-switch__pip--active': reel.id === active?.id,
          'reel-switch__pip--sounding': reel.sounding,
        }"
        :data-reel-pip="reel.id"
      />
    </div>
    <span v-if="paged" class="reel-switch__sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<style scoped>
.reel-switch {
  position: relative;
  width: 100%;
  min-width: 0;
}

/* Sideways belongs to the switch, vertical to the reel: neither to the browser. */
.reel-switch--paged {
  touch-action: none;
}

.reel-switch__page {
  width: 100%;
  min-width: 0;
}

.reel-switch--settling .reel-switch__page {
  transition:
    transform var(--dur-ui) var(--ease-brush),
    opacity var(--dur-ui) var(--ease-brush);
}

/* One pip per reel on the reel's bottom edge, below the strip's copy: home a
   short bar, each Loop a dot. Ivory marks where you are; a Loop that is
   playing wears a Brass ring. No text: a Loop's name is on its strips. */
.reel-switch__pips {
  position: absolute;
  z-index: 2;
  bottom: var(--s-1);
  left: 50%;
  display: flex;
  align-items: center;
  gap: var(--s-2);
  transform: translateX(-50%);
  pointer-events: none;
}

.reel-switch__pip {
  width: 4px;
  height: 4px;
  box-sizing: border-box;
  border-radius: 50%;
  background: var(--ivory-4);
  transition: background-color var(--dur-tap) var(--ease-brush);
}

.reel-switch__pip--home {
  width: 9px;
  border-radius: 2px;
}

.reel-switch__pip--active {
  background: var(--ivory);
}

.reel-switch__pip--sounding {
  box-shadow: 0 0 0 1px var(--brass);
}

.reel-switch__sr-only {
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

@media (prefers-reduced-motion: reduce) {
  .reel-switch__page,
  .reel-switch--settling .reel-switch__page,
  .reel-switch__pip {
    transition: none;
  }
}

@media (forced-colors: active) {
  .reel-switch__pip {
    forced-color-adjust: none;
    background: GrayText;
  }

  .reel-switch__pip--active {
    background: Highlight;
  }

  .reel-switch__pip--sounding {
    box-shadow: 0 0 0 1px CanvasText;
  }
}
</style>
