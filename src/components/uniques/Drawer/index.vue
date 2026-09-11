<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

const props = withDefaults(defineProps<{
  modelValue?: boolean;
  defaultOpen?: boolean;
  anchor?: "top" | "bottom";
  handleAlign?: "left" | "center" | "right";
  handlePlacement?: "edge" | "persistent";
  accessibleName: string;
  handleResizeDescription?: string;
  handleLabel?: string;
  handleTestId?: string;
  fixed?: boolean;
  storageKey?: string;
  initialContentHeight?: number;
  minContentHeight?: number;
  maxContentHeight?: number;
  maxHeightRatio?: number;
  scroll?: boolean;
  dragToCollapse?: boolean;
  keyboardResizeStep?: number;
  haptic?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  fitContentOnOpen?: boolean;
  naturalContentHeight?: number;
}>(), {
  modelValue: undefined,
  defaultOpen: false,
  anchor: "bottom",
  handleAlign: "center",
  handlePlacement: "edge",
  handleLabel: "",
  handleResizeDescription: "",
  fixed: false,
  storageKey: undefined,
  initialContentHeight: 240,
  minContentHeight: 0,
  maxContentHeight: undefined,
  maxHeightRatio: 0.85,
  scroll: true,
  dragToCollapse: true,
  keyboardResizeStep: 0,
  haptic: false,
  closeOnEscape: false,
  closeOnOutside: false,
  fitContentOnOpen: false,
});
const emit = defineEmits<{
  "update:modelValue": [open: boolean];
  resize: [height: number];
  contentResize: [contentHeight: number, source?: "pointer"];
  closed: [];
}>();
const root = ref<HTMLElement | null>(null);
const persistent = ref<HTMLElement | null>(null);
const handleRail = ref<HTMLElement | null>(null);
const clip = ref<HTMLElement | null>(null);
const content = ref<HTMLElement | null>(null);
const persistentHeight = ref(0);
const handleTop = ref(0);
const frameHeight = ref(typeof window === "undefined" ? 800 : window.innerHeight);
const currentHeight = ref(0);
// Store content space, not total height: expanding the Pattern List must not resize keys.
const preferredContentHeight = ref(props.initialContentHeight);
const dragging = ref(false);
const layoutResizing = ref(false);
const ready = ref(false);
const closingContentHeight = ref(0);
let observer: ResizeObserver | undefined;
let visibilityObserver: IntersectionObserver | undefined;
let contentObserver: MutationObserver | undefined;
const observedControls = new Map<HTMLElement, boolean>();

function observeClippedControls() {
  if (!visibilityObserver) return;
  const selector = 'button, a[href], input, select, textarea, [tabindex], [contenteditable="true"]';
  const controls = new Set(persistent.value?.querySelectorAll<HTMLElement>(selector));
  // Minimum-sized content can extend beyond the clip (Keyboard). Top panels
  // have no content floor and retain their normal scroll-to-focused-item behavior.
  if (!props.scroll && props.minContentHeight > 0) {
    content.value?.querySelectorAll<HTMLElement>(selector).forEach(element => controls.add(element));
  }
  for (const [element, originallyInert] of observedControls) {
    if (!controls.has(element)) {
      visibilityObserver.unobserve(element);
      element.inert = originallyInert;
      observedControls.delete(element);
    }
  }
  for (const element of controls) {
    if (observedControls.has(element)) continue;
    observedControls.set(element, Boolean(element.inert));
    visibilityObserver.observe(element);
  }
}
let gesture: { id: number; y: number; height: number; moved: boolean } | undefined;
let suppressClick = false;
let opening = false;
let fitContent = false;
let openRequest = 0;
let layoutResizeRequest = 0;
let clickReset: ReturnType<typeof setTimeout> | undefined;
const viewportMaxHeight = computed(() => Math.max(0, Math.min(
  frameHeight.value * props.maxHeightRatio,
  frameHeight.value - 44,
)));
const maxHeight = computed(() => Math.min(
  viewportMaxHeight.value,
  props.maxContentHeight === undefined
    ? Number.POSITIVE_INFINITY
    : persistentHeight.value + props.maxContentHeight,
));
const height = computed(() => Math.min(currentHeight.value, maxHeight.value));
const expanded = computed(() => height.value > persistentHeight.value + 0.5);
const usableOpenThreshold = computed(() => Math.min(
  maxHeight.value,
  persistentHeight.value + Math.max(props.minContentHeight, 1),
));
const canFitMinimumContent = computed(() =>
  maxHeight.value >= persistentHeight.value + props.minContentHeight,
);
const usableOpen = computed(() => expanded.value
  && height.value >= usableOpenThreshold.value - 0.5);
const contentHeight = computed(() => Math.max(props.minContentHeight, height.value > 0
  ? height.value - persistentHeight.value : closingContentHeight.value));
const visibleContentHeight = computed(() => Math.max(0, height.value - persistentHeight.value));

function remember() {
  if (!props.storageKey || props.fitContentOnOpen) return;
  try {
    localStorage.setItem(`emotitone.drawer.${props.storageKey}`, JSON.stringify({
      contentHeight: preferredContentHeight.value,
    }));
  } catch { /* A restricted or full store must not prevent drawer interaction. */ }
}
function publish(source?: "pointer") {
  emit("update:modelValue", expanded.value);
  emit("resize", height.value);
  if (!usableOpen.value) return;
  if (source === "pointer") emit("contentResize", visibleContentHeight.value, source);
  else emit("contentResize", visibleContentHeight.value);
}
function setHeight(value: number, source?: "pointer") {
  currentHeight.value = Math.max(0, Math.min(value, maxHeight.value));
  publish(source);
}
function interactiveHeight(value: number) {
  if (props.dragToCollapse) return value;
  if (!canFitMinimumContent.value) return persistentHeight.value;
  return Math.max(usableOpenThreshold.value, value);
}
async function setLayoutHeight(value: number) {
  const request = ++layoutResizeRequest;
  layoutResizing.value = true;
  setHeight(value);
  await finishLayoutResize(request);
}
async function finishLayoutResize(request: number) {
  await nextTick();
  if (request !== layoutResizeRequest || !root.value) return;
  // Commit the target while transitions are disabled before restoring them.
  root.value.getBoundingClientRect();
  layoutResizing.value = false;
}
function fittedHeight() {
  const inset = content.value ? parseFloat(getComputedStyle(content.value).paddingTop) || 0 : 0;
  return props.naturalContentHeight !== undefined
    ? props.naturalContentHeight + inset
    : content.value?.scrollHeight || props.initialContentHeight;
}
async function open() {
  if (!props.dragToCollapse && !canFitMinimumContent.value) {
    setHeight(persistentHeight.value);
    return;
  }
  if (!props.fitContentOnOpen) {
    setHeight(persistentHeight.value + Math.max(props.minContentHeight, preferredContentHeight.value));
    return;
  }
  if (opening) return;
  opening = true;
  fitContent = true;
  const request = ++openRequest;
  // Let the host mount/measure real content before choosing the open target.
  emit("update:modelValue", true);
  await nextTick();
  await nextTick();
  if (request !== openRequest || !root.value) return;
  opening = false;
  setHeight(fittedHeight());
}
function finishClose() {
  if (height.value === 0) {
    closingContentHeight.value = 0;
    emit("closed");
  }
}
function transitionEnd(event: TransitionEvent) {
  if (event.target === root.value && event.propertyName === "height") finishClose();
}
function close() {
  closingContentHeight.value = contentHeight.value;
  openRequest++;
  opening = false;
  fitContent = false;
  setHeight(persistentHeight.value);
  void nextTick(() => {
    if (!root.value) return;
    const noMotion = getComputedStyle(root.value).transitionDuration.split(',')
      .every(duration => !parseFloat(duration));
    if (noMotion || root.value.getBoundingClientRect().height === 0) finishClose();
  });
}
function toggle() {
  if (usableOpen.value) close();
  else open();
}
function click() {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  if (props.haptic) triggerUIHaptic();
  toggle();
}
function pointerDown(event: PointerEvent) {
  if (event.button !== 0 || gesture) return;
  clearTimeout(clickReset);
  suppressClick = false;
  const renderedHeight = root.value?.getBoundingClientRect().height ?? height.value;
  gesture = { id: event.pointerId, y: event.clientY, height: renderedHeight, moved: false };
  if (ready.value) {
    currentHeight.value = renderedHeight;
    dragging.value = true;
  }
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}
function pointerMove(event: PointerEvent) {
  if (!gesture || gesture.id !== event.pointerId) return;
  const distance = event.clientY - gesture.y;
  if (!gesture.moved && Math.abs(distance) < 4) return;
  gesture.moved = true;
  fitContent = false;
  dragging.value = true;
  const requestedHeight = gesture.height + (props.anchor === "top" ? distance : -distance);
  setHeight(interactiveHeight(requestedHeight), "pointer");
  event.preventDefault();
}
function handleKeydown(event: KeyboardEvent) {
  if (props.keyboardResizeStep <= 0) return;
  const expands = props.anchor === "bottom" ? event.key === "ArrowUp" : event.key === "ArrowDown";
  const contracts = props.anchor === "bottom" ? event.key === "ArrowDown" : event.key === "ArrowUp";
  if (!expands && !contracts) return;
  if (contracts && !usableOpen.value) {
    event.preventDefault();
    return;
  }

  const requestedHeight = height.value + (expands ? props.keyboardResizeStep : -props.keyboardResizeStep);
  void setLayoutHeight(interactiveHeight(requestedHeight));
  if (usableOpen.value) {
    preferredContentHeight.value = visibleContentHeight.value;
    remember();
  }
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
  if (height.value === 0) finishClose();
  // A drag's synthetic click is suppressed; the next independent activation is not.
  clickReset = setTimeout(() => { suppressClick = false; }, 0);
}
function measure() {
  const layoutRequest = ready.value ? ++layoutResizeRequest : 0;
  if (layoutRequest) layoutResizing.value = true;
  const nextFrame = props.fixed ? window.innerHeight : root.value?.parentElement?.clientHeight;
  frameHeight.value = nextFrame || window.innerHeight;
  const nextPersistent = persistent.value?.getBoundingClientRect().height ?? 0;
  if (props.handlePlacement === "persistent" && handleRail.value) {
    const railHeight = handleRail.value.getBoundingClientRect().height;
    handleTop.value = handleRail.value.offsetTop
      + Math.max(0, (railHeight - 28) / 2);
  }
  const previous = persistentHeight.value;
  const wasAtPersistent = Math.abs(currentHeight.value - previous) < 1;
  const wasExpanded = currentHeight.value > previous;
  persistentHeight.value = nextPersistent;
  if (ready.value && (wasExpanded || wasAtPersistent)) {
    currentHeight.value = Math.max(0, currentHeight.value + nextPersistent - previous);
  }
  if (!ready.value) return;
  if (!props.dragToCollapse
    && currentHeight.value > persistentHeight.value
    && !canFitMinimumContent.value) {
    setHeight(persistentHeight.value);
    void finishLayoutResize(layoutRequest);
    return;
  }
  publish();
  void finishLayoutResize(layoutRequest);
}
function outsidePointer(event: PointerEvent) {
  if (props.closeOnOutside && (expanded.value || opening) && event.target instanceof Node
    && !root.value?.contains(event.target)) close();
}
function keydown(event: KeyboardEvent) {
  if (props.closeOnEscape && event.key === "Escape" && expanded.value) close();
}
watch(() => props.modelValue, value => {
  if (!ready.value || value === undefined) return;
  if (value === false && opening) { close(); return; }
  if (value === expanded.value) return;
  if (value) open();
  else close();
});
watch(() => props.naturalContentHeight, () => {
  if (fitContent && expanded.value && !opening && !dragging.value) setHeight(fittedHeight());
});
watch(() => props.minContentHeight, () => {
  if (expanded.value && !dragging.value) {
    if (!props.dragToCollapse && !canFitMinimumContent.value) {
      setHeight(persistentHeight.value);
      return;
    }
    void setLayoutHeight(persistentHeight.value + Math.max(
      props.minContentHeight,
      preferredContentHeight.value,
    ));
  }
});
onMounted(async () => {
  await nextTick();
  measure();
  if (props.storageKey && !props.fitContentOnOpen) {
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
  // A partly collapsed stack must not retain invisible tab stops.
  // Observe focus targets rather than whole bars: labels can remain visible after
  // their button faces have left the clip. Consumer-owned inert state is retained.
  if (root.value && clip.value && typeof IntersectionObserver !== "undefined") {
    visibilityObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        const originallyInert = observedControls.get(element);
        if (originallyInert === undefined) continue;
        element.inert = originallyInert || !entry.isIntersecting
          || entry.intersectionRect.height <= 0 || entry.intersectionRect.width <= 0;
      }
    }, { root: clip.value, threshold: 0 });
    observeClippedControls();
    contentObserver = new MutationObserver(observeClippedControls);
    contentObserver.observe(root.value, { childList: true, subtree: true });
  }
  window.addEventListener("resize", measure);
  document.addEventListener("keydown", keydown);
  document.addEventListener("pointerdown", outsidePointer, true);
});
onBeforeUnmount(() => {
  openRequest++;
  layoutResizeRequest++;
  observer?.disconnect();
  visibilityObserver?.disconnect();
  contentObserver?.disconnect();
  for (const [element, originallyInert] of observedControls) element.inert = originallyInert;
  observedControls.clear();
  clearTimeout(clickReset);
  window.removeEventListener("resize", measure);
  document.removeEventListener("keydown", keydown);
  document.removeEventListener("pointerdown", outsidePointer, true);
});
defineExpose({ open, close, toggle, height, preferredContentHeight });
</script>

<template>
  <section
    ref="root"
    class="drawer"
    :class="[`drawer--${anchor}`, `drawer--handle-${handleAlign}`, {
      'drawer--fixed': fixed, 'drawer--dragging': dragging,
      'drawer--layout-resize': layoutResizing, 'drawer--ready': ready,
      'drawer--handle-persistent': handlePlacement === 'persistent',
    }]"
    :style="{
      height: `${height}px`,
      '--drawer-handle-top': handlePlacement === 'persistent' ? `${handleTop}px` : undefined,
    }"
    :aria-label="accessibleName"
    :data-expanded="expanded"
    @transitionend="transitionEnd"
  >
    <button
      type="button"
      class="drawer__handle"
      :data-testid="handleTestId"
      :aria-label="accessibleName"
      :aria-expanded="expanded"
      :aria-description="handleResizeDescription || undefined"
      :aria-keyshortcuts="keyboardResizeStep > 0 ? 'ArrowUp ArrowDown' : undefined"
      @click="click"
      @keydown="handleKeydown"
      @pointerdown="pointerDown"
      @pointermove="pointerMove"
      @pointerup="pointerEnd"
      @pointercancel="pointerEnd"
      @lostpointercapture="pointerEnd"
    >
      <span class="drawer__grip" aria-hidden="true" />
      <span v-if="$slots.icon" class="drawer__icon" aria-hidden="true"><slot name="icon" /></span>
      <span v-if="handleLabel" class="drawer__label">{{ handleLabel }}</span>
      <span class="drawer__grip" aria-hidden="true" />
    </button>
    <div ref="clip" class="drawer__clip" :inert="height <= 0 ? true : undefined">
      <div
        v-if="$slots.persistent || $slots['persistent-leading']"
        ref="persistent"
        class="drawer__persistent"
      >
        <slot name="persistent-leading" />
        <div
          v-if="handlePlacement === 'persistent'"
          ref="handleRail"
          class="drawer__handle-rail"
          aria-hidden="true"
        />
        <slot name="persistent" />
      </div>
      <div
        ref="content"
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
  --drawer-handle-height: 28px;
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
.drawer--ready { transition: height var(--dur-panel) var(--ease-swing); }
.drawer--dragging { transition: none; }
.drawer--layout-resize { transition: none; }
.drawer__clip { height: 100%; overflow: clip; }
.drawer__persistent { display: flow-root; }
.drawer__handle-rail {
  height: 40px;
  background: var(--drawer-handle-rail-surface, var(--ink-3));
}
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
  gap: 4px;
  max-width: min(240px, 65%);
  min-height: var(--drawer-handle-height);
  padding: 4px;
  border: 0;
  border-radius: 0;
  background: var(--ink-3);
  color: var(--ivory);
  cursor: ns-resize;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.drawer__handle::before { content: ""; position: absolute; inset: -6px 0; }
.drawer--top .drawer__handle { top: 100%; }
.drawer--bottom .drawer__handle { bottom: 100%; }
.drawer--handle-persistent .drawer__handle {
  top: var(--drawer-handle-top);
  bottom: auto;
}
.drawer--handle-left .drawer__handle { left: 0; }
.drawer--handle-right .drawer__handle { right: 0; }
.drawer--handle-center .drawer__handle { left: 50%; transform: translateX(-50%); }
.drawer__handle:focus-visible { outline: 2px solid var(--ivory); outline-offset: -2px; }
.drawer__icon { display: flex; flex: 0 0 14px; }
.drawer__icon :deep(svg) { width: 14px; height: 14px; }
.drawer__label {
  min-width: 0;
  padding-inline: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: var(--t-label);
  /* Jazz glyphs extend below the label token's tight line box. */
  line-height: 20px;
  /* Center Jazz’s visible strokes, rather than its asymmetric font box. */
  transform: translateY(-2px);
}
.drawer__grip { flex: 0 0 8px; height: 2px; background: var(--ivory-4); }
@media (hover: hover) and (pointer: fine) {
  .drawer__handle:hover { color: var(--ivory-2); }
}
@media (prefers-reduced-motion: reduce) {
  .drawer--ready { transition: none; }
}
@media (forced-colors: active) {
  .drawer { background: Canvas; color: CanvasText; }
  .drawer__handle-rail { background: Canvas; }
  .drawer__handle { background: ButtonFace; color: ButtonText; border: 1px solid ButtonText; }
  .drawer__grip { background: ButtonText; }
  .drawer__handle:focus-visible { outline-color: Highlight; }
}
</style>
