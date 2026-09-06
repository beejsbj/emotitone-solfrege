<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = withDefaults(defineProps<{
  modelValue?: boolean;
  defaultOpen?: boolean;
  anchor?: "top" | "bottom";
  handleAlign?: "left" | "center" | "right";
  accessibleName: string;
  handleLabel?: string;
  handleTestId?: string;
  fixed?: boolean;
  storageKey?: string;
  initialContentHeight?: number;
  minContentHeight?: number;
  maxHeightRatio?: number;
  scroll?: boolean;
  closeOnEscape?: boolean;
}>(), {
  modelValue: undefined,
  defaultOpen: false,
  anchor: "bottom",
  handleAlign: "center",
  handleLabel: "",
  fixed: false,
  storageKey: undefined,
  initialContentHeight: 240,
  minContentHeight: 0,
  maxHeightRatio: 0.85,
  scroll: true,
  closeOnEscape: false,
});
const emit = defineEmits<{
  "update:modelValue": [open: boolean];
  resize: [height: number];
}>();
const root = ref<HTMLElement | null>(null);
const persistent = ref<HTMLElement | null>(null);
const persistentHeight = ref(0);
const frameHeight = ref(typeof window === "undefined" ? 800 : window.innerHeight);
const currentHeight = ref(0);
// Store content space, not total height: expanding the Pattern List must not resize keys.
const preferredContentHeight = ref(props.initialContentHeight);
const dragging = ref(false);
const ready = ref(false);
let observer: ResizeObserver | undefined;
let gesture: { id: number; y: number; height: number; moved: boolean } | undefined;
let suppressClick = false;
let clickReset: ReturnType<typeof setTimeout> | undefined;
const maxHeight = computed(() => Math.max(0, Math.min(
  frameHeight.value * props.maxHeightRatio,
  frameHeight.value - 44,
)));
const height = computed(() => Math.min(currentHeight.value, maxHeight.value));
const expanded = computed(() => height.value > persistentHeight.value + 0.5);
const contentHeight = computed(() => Math.max(props.minContentHeight, height.value - persistentHeight.value));
const visibleContentHeight = computed(() => Math.max(0, height.value - persistentHeight.value));

function remember() {
  if (!props.storageKey) return;
  try {
    localStorage.setItem(`emotitone.drawer.${props.storageKey}`, JSON.stringify({
      contentHeight: preferredContentHeight.value,
    }));
  } catch { /* A restricted or full store must not prevent drawer interaction. */ }
}
function publish() {
  emit("update:modelValue", expanded.value);
  emit("resize", height.value);
}
function setHeight(value: number) {
  currentHeight.value = Math.max(0, Math.min(value, maxHeight.value));
  publish();
}
function open() {
  setHeight(persistentHeight.value + Math.max(props.minContentHeight, preferredContentHeight.value));
}
function close() {
  setHeight(persistentHeight.value);
}
function toggle() {
  if (expanded.value) close();
  else open();
}
function click() {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  toggle();
}
function pointerDown(event: PointerEvent) {
  if (event.button !== 0 || gesture) return;
  clearTimeout(clickReset);
  suppressClick = false;
  gesture = { id: event.pointerId, y: event.clientY, height: height.value, moved: false };
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}
function pointerMove(event: PointerEvent) {
  if (!gesture || gesture.id !== event.pointerId) return;
  const distance = event.clientY - gesture.y;
  if (!gesture.moved && Math.abs(distance) < 4) return;
  gesture.moved = true;
  dragging.value = true;
  setHeight(gesture.height + (props.anchor === "top" ? distance : -distance));
  event.preventDefault();
}
function pointerEnd(event: PointerEvent) {
  if (!gesture || gesture.id !== event.pointerId) return;
  suppressClick = gesture.moved;
  if (gesture.moved && height.value >= persistentHeight.value + props.minContentHeight && expanded.value) {
    preferredContentHeight.value = height.value - persistentHeight.value;
    remember();
  }
  gesture = undefined;
  dragging.value = false;
  // A drag's synthetic click is suppressed; the next independent activation is not.
  clickReset = setTimeout(() => { suppressClick = false; }, 0);
}
function measure() {
  const nextFrame = props.fixed ? window.innerHeight : root.value?.parentElement?.clientHeight;
  frameHeight.value = nextFrame || window.innerHeight;
  const nextPersistent = persistent.value?.getBoundingClientRect().height ?? 0;
  const previous = persistentHeight.value;
  const wasAtPersistent = Math.abs(currentHeight.value - previous) < 1;
  const wasExpanded = currentHeight.value > previous;
  persistentHeight.value = nextPersistent;
  if (ready.value && (wasExpanded || wasAtPersistent)) {
    currentHeight.value = Math.max(0, currentHeight.value + nextPersistent - previous);
  }
}
function keydown(event: KeyboardEvent) {
  if (props.closeOnEscape && event.key === "Escape" && expanded.value) close();
}
watch(() => props.modelValue, value => {
  if (!ready.value || value === undefined || value === expanded.value) return;
  if (value) open();
  else close();
});
watch(() => props.minContentHeight, () => {
  if (expanded.value && !dragging.value) {
    currentHeight.value = Math.max(currentHeight.value, persistentHeight.value + props.minContentHeight);
  }
});
onMounted(async () => {
  await nextTick();
  measure();
  if (props.storageKey) {
    try {
      const stored = JSON.parse(localStorage.getItem(`emotitone.drawer.${props.storageKey}`) || "null");
      if (Number.isFinite(stored?.contentHeight) && stored.contentHeight > 0) {
        preferredContentHeight.value = stored.contentHeight;
      }
    } catch { /* Ignore invalid or unavailable persistence. */ }
  }
  if (props.modelValue ?? props.defaultOpen) open();
  else close();
  ready.value = true;
  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(measure);
    if (persistent.value) observer.observe(persistent.value);
    if (!props.fixed && root.value?.parentElement) observer.observe(root.value.parentElement);
  }
  window.addEventListener("resize", measure);
  document.addEventListener("keydown", keydown);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  clearTimeout(clickReset);
  window.removeEventListener("resize", measure);
  document.removeEventListener("keydown", keydown);
});
defineExpose({ open, close, toggle, height, preferredContentHeight });
</script>

<template>
  <section
    ref="root"
    class="drawer"
    :class="[`drawer--${anchor}`, `drawer--handle-${handleAlign}`, {
      'drawer--fixed': fixed, 'drawer--dragging': dragging, 'drawer--ready': ready,
    }]"
    :style="{ height: `${height}px` }"
    :aria-label="accessibleName"
    :data-expanded="expanded"
  >
    <button
      type="button"
      class="drawer__handle"
      :data-testid="handleTestId"
      :aria-label="accessibleName"
      :aria-expanded="expanded"
      @click="click"
      @pointerdown="pointerDown"
      @pointermove="pointerMove"
      @pointerup="pointerEnd"
      @pointercancel="pointerEnd"
      @lostpointercapture="pointerEnd"
    >
      <span class="drawer__icon" aria-hidden="true"><slot name="icon" /></span>
      <span v-if="handleLabel" class="drawer__label">{{ handleLabel }}</span>
      <span class="drawer__grip" aria-hidden="true" />
      <slot name="status" />
    </button>
    <div class="drawer__clip" :inert="height <= 0 ? true : undefined">
      <div v-if="$slots.persistent" ref="persistent" class="drawer__persistent">
        <slot name="persistent" />
      </div>
      <div
        class="drawer__content"
        :class="{ 'drawer__content--scroll': scroll }"
        :style="{ height: `${contentHeight}px` }"
        :inert="visibleContentHeight <= 0 ? true : undefined"
      >
        <slot :height="contentHeight" :visible-height="visibleContentHeight" :is-open="expanded" :close="close" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.drawer {
  --drawer-handle-height: 36px;
  position: absolute;
  inset-inline: 0;
  min-width: 0;
  background: var(--ink-3);
  color: var(--ivory);
  pointer-events: auto;
}
.drawer--fixed { position: fixed; }
.drawer--top { top: 0; }
.drawer--bottom { bottom: 0; }
.drawer--ready { transition: height 220ms cubic-bezier(.215, .61, .355, 1); }
.drawer--dragging { transition: none; }
.drawer__clip { height: 100%; overflow: hidden; }
.drawer__persistent { display: flow-root; }
.drawer__content { min-width: 0; overflow: hidden; }
.drawer--top .drawer__content {
  box-sizing: border-box;
  padding-top: var(--drawer-handle-height);
}
.drawer__content--scroll { overflow-y: auto; overscroll-behavior: contain; }
.drawer__handle {
  position: absolute;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: min(240px, 65%);
  min-height: var(--drawer-handle-height);
  padding: 6px 12px;
  border: 0;
  border-radius: 0;
  background: var(--ink-3);
  color: var(--ivory);
  cursor: ns-resize;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.drawer--top .drawer__handle { top: 100%; }
.drawer--bottom .drawer__handle { bottom: 100%; }
.drawer--handle-left .drawer__handle { left: 0; }
.drawer--handle-right .drawer__handle { right: 0; }
.drawer--handle-center .drawer__handle { left: 50%; transform: translateX(-50%); }
.drawer__handle:focus-visible { outline: 2px solid var(--ivory); outline-offset: -2px; }
.drawer__icon { display: flex; flex: 0 0 16px; }
.drawer__icon :deep(svg) { width: 16px; height: 16px; }
.drawer__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--t-label); }
.drawer__grip { flex: 0 0 20px; height: 6px; border-block: 2px solid var(--ivory-4); }
@media (hover: hover) and (pointer: fine) {
  .drawer__handle:hover { color: var(--ivory-2); }
}
@media (prefers-reduced-motion: reduce) {
  .drawer--ready { transition: none; }
}
@media (forced-colors: active) {
  .drawer { background: Canvas; color: CanvasText; }
  .drawer__handle { background: ButtonFace; color: ButtonText; border: 1px solid ButtonText; }
  .drawer__grip { border-color: ButtonText; }
  .drawer__handle:focus-visible { outline-color: Highlight; }
}
</style>
