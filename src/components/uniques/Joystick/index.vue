<template>
  <div class="joystick" :class="`joystick--${resolvedVisual}`" role="group" :aria-label="label"
    :data-latched="modelValue" :data-effective="effectiveValue" :data-momentary="held || undefined"
    :data-dragging="dragging || undefined" :data-active="pointerId !== null || undefined">
    <div ref="plate" class="joystick__plate" role="radiogroup" :aria-label="`${label} chord character`"
      @pointerdown="beginPointer" @lostpointercapture="cancelPointer" @click.prevent>
      <span v-for="option in JOYSTICK_OPTIONS.filter(item => item.value !== 'auto')" :key="option.value"
        class="joystick__detent" :class="{ 'joystick__detent--effective': effectiveValue === option.value }"
        :style="detentStyle(option.value)" aria-hidden="true"></span>
      <span class="joystick__stick" :style="stickStyle" aria-hidden="true"></span>
      <button v-for="option in JOYSTICK_OPTIONS" :key="option.value"
        :ref="(element) => setOptionRef(option.value, element)" class="joystick__option sr-only"
        type="button" role="radio" :aria-checked="effectiveValue === option.value"
        :aria-label="`${option.label}: ${option.description}`" :tabindex="modelValue === option.value ? 0 : -1"
        @click.stop="selectKeyboard($event, option.value)" @keydown="handleKeydown($event, option.value)">
        {{ option.label }}
      </button>
    </div>
    <span class="joystick__label" aria-hidden="true">{{ label }}</span>
    <span class="sr-only" aria-live="polite">{{ statusText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from "vue";
import type { HarmonyAlteration } from "@/domain/harmony";
import { triggerUIHaptic } from "@/utils/hapticFeedback";
import { JOYSTICK_OPTIONS, directionFromVector, vectorFromDirection } from "./joystickOptions";
import { currentJoystickPageVisual, type JoystickVisual } from "./edition";

export type { JoystickVisual } from "./edition";

const props = withDefaults(defineProps<{
  modelValue?: HarmonyAlteration;
  label?: string;
  visual?: JoystickVisual;
  holdThreshold?: number;
}>(), { modelValue: "auto", label: "Harmony", holdThreshold: 260 });
const emit = defineEmits<{
  "update:modelValue": [value: HarmonyAlteration];
  effectiveChange: [value: HarmonyAlteration];
}>();
const plate = ref<HTMLElement | null>(null);
const resolvedVisual = computed(() => props.visual ?? currentJoystickPageVisual());
const pointerValue = ref<HarmonyAlteration | null>(null);
const pointerVector = ref({ x: 0, y: 0 });
const held = ref(false);
const dragging = ref(false);
const pointerId = ref<number | null>(null);
const optionElements = new Map<HarmonyAlteration, HTMLButtonElement>();
let startVector = { x: 0, y: 0 };
let start = { x: 0, y: 0 };
let radius = 1;
let holdTimer: ReturnType<typeof setTimeout> | undefined;
let lastEffective = props.modelValue;
const effectiveValue = computed(() => pointerValue.value ?? props.modelValue);
const vector = computed(() => pointerId.value === null ? vectorFromDirection(props.modelValue) : pointerVector.value);
const stickStyle = computed(() => ({ left: `${50 + vector.value.x * 27}%`, top: `${50 + vector.value.y * 27}%` }));
const statusText = computed(() => `${JOYSTICK_OPTIONS.find(option => option.value === effectiveValue.value)?.label}, ${held.value ? 'momentary' : 'latched'}`);
function detentStyle(value: HarmonyAlteration) {
  const point = vectorFromDirection(value);
  return { left: `${50 + point.x * 42}%`, top: `${50 + point.y * 42}%` };
}
function announce(value: HarmonyAlteration, haptic = false) {
  if (value === lastEffective) return;
  lastEffective = value;
  emit("effectiveChange", value);
  if (haptic) triggerUIHaptic();
}
watch(() => props.modelValue, value => { if (pointerId.value === null) announce(value); });
function setOptionRef(value: HarmonyAlteration, element: Element | ComponentPublicInstance | null) {
  if (element instanceof HTMLButtonElement) optionElements.set(value, element);
  else optionElements.delete(value);
}
function updateVector(event: PointerEvent) {
  const x = startVector.x + (event.clientX - start.x) / radius;
  const y = startVector.y + (event.clientY - start.y) / radius;
  const length = Math.max(1, Math.hypot(x, y));
  pointerVector.value = { x: x / length, y: y / length };
  pointerValue.value = directionFromVector(x, y);
  announce(pointerValue.value, true);
}
function beginPointer(event: PointerEvent) {
  if (pointerId.value !== null || event.button !== 0 || !plate.value) return;
  event.preventDefault();
  const bounds = plate.value.getBoundingClientRect();
  radius = Math.max(1, Math.min(bounds.width, bounds.height) * 0.27);
  start = { x: event.clientX, y: event.clientY };
  startVector = vectorFromDirection(effectiveValue.value);
  pointerVector.value = { ...startVector };
  pointerValue.value = effectiveValue.value;
  pointerId.value = event.pointerId;
  held.value = false;
  dragging.value = false;
  optionElements.get(props.modelValue)?.focus({ preventScroll: true });
  try { plate.value.setPointerCapture?.(event.pointerId); } catch { /* Global tracking covers unavailable capture. */ }
  document.addEventListener("pointermove", movePointer, { passive: false });
  document.addEventListener("pointerup", finishPointer);
  document.addEventListener("pointercancel", cancelPointer);
  holdTimer = setTimeout(() => { held.value = true; }, Math.max(0, props.holdThreshold));
}
function movePointer(event: PointerEvent) {
  if (event.pointerId !== pointerId.value) return;
  event.preventDefault();
  // Knob's 5px activation threshold applies radially: both axes belong to the stick.
  if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) dragging.value = true;
  if (!dragging.value) return;
  updateVector(event);
}
function cleanup() {
  clearTimeout(holdTimer);
  holdTimer = undefined;
  const previousId = pointerId.value;
  pointerId.value = null;
  pointerValue.value = null;
  held.value = false;
  dragging.value = false;
  document.removeEventListener("pointermove", movePointer);
  document.removeEventListener("pointerup", finishPointer);
  document.removeEventListener("pointercancel", cancelPointer);
  if (previousId !== null && plate.value?.hasPointerCapture?.(previousId)) plate.value.releasePointerCapture(previousId);
}
function finishPointer(event: PointerEvent) {
  if (event.pointerId !== pointerId.value) return;
  event.preventDefault();
  movePointer(event);
  const value = pointerValue.value ?? props.modelValue;
  const restore = held.value;
  const completedDrag = dragging.value;
  cleanup();
  if (!completedDrag) return;
  if (restore) announce(props.modelValue);
  else { emit("update:modelValue", value); announce(value); }
}
function cancelActivePointer() {
  if (pointerId.value === null) return;
  cleanup();
  announce(props.modelValue);
}
function cancelPointer(event: PointerEvent) {
  if (event.pointerId === pointerId.value) cancelActivePointer();
}
function selectKeyboard(event: MouseEvent, value: HarmonyAlteration) {
  // Pointer compatibility clicks are always inert; native keyboard clicks have detail 0.
  if (event.detail !== 0) return;
  cancelActivePointer();
  emit("update:modelValue", value);
  announce(value, true);
}
function handleKeydown(event: KeyboardEvent, value: HarmonyAlteration) {
  const index = JOYSTICK_OPTIONS.findIndex(option => option.value === value);
  const row = Math.floor(index / 3);
  const column = index % 3;
  let next = index;
  if (event.key === "ArrowLeft") next = row * 3 + Math.max(0, column - 1);
  else if (event.key === "ArrowRight") next = row * 3 + Math.min(2, column + 1);
  else if (event.key === "ArrowUp") next = Math.max(0, row - 1) * 3 + column;
  else if (event.key === "ArrowDown") next = Math.min(2, row + 1) * 3 + column;
  else if (event.key === "Home") next = 4;
  else return;
  event.preventDefault();
  optionElements.get(JOYSTICK_OPTIONS[next].value)?.focus({ preventScroll: true });
}
function visibilityChange() { if (document.visibilityState === "hidden") cancelActivePointer(); }
onMounted(() => {
  window.addEventListener("blur", cancelActivePointer);
  document.addEventListener("visibilitychange", visibilityChange);
});
onBeforeUnmount(() => {
  cancelActivePointer();
  window.removeEventListener("blur", cancelActivePointer);
  document.removeEventListener("visibilitychange", visibilityChange);
  optionElements.clear();
});
</script>

<style scoped>
.joystick { --joystick-size: clamp(44px, 92cqi, 58px); display: grid; inline-size: var(--joystick-size); max-inline-size: 100%; flex: 0 0 var(--joystick-size); justify-items: center; gap: 1px; container-type: inline-size; color: var(--brass); user-select: none; }
.joystick__plate { position: relative; inline-size: 100%; aspect-ratio: 1; border-radius: 50%; background: var(--brass-fill); box-shadow: 0 2px 0 var(--brass-edge); isolation: isolate; cursor: grab; touch-action: none; -webkit-tap-highlight-color: transparent; }
.joystick__plate::before { content: ''; position: absolute; inset: 12%; border-radius: inherit; background: var(--ink); box-shadow: inset 0 2px 6px var(--brass-edge); pointer-events: none; }
.joystick__plate:focus-within { outline: 2px solid var(--ivory); outline-offset: 3px; }
.joystick[data-dragging] .joystick__plate { cursor: grabbing; }
.joystick__detent { position: absolute; inline-size: 4%; aspect-ratio: 1; border-radius: 50%; background: var(--brass-edge); transform: translate(-50%, -50%); pointer-events: none; }
.joystick__detent--effective { background: var(--ivory); box-shadow: 0 0 4px var(--brass-hi); }
.joystick__stick { position: absolute; z-index: 1; inline-size: 29%; aspect-ratio: 1; border-radius: 50%; background: var(--brass-sheen), var(--brass-fill); box-shadow: inset 0 -2px 2px var(--brass-lo), 0 3px 4px var(--brass-edge); transform: translate(-50%, -50%); pointer-events: none; transition: left var(--dur-tap) var(--ease-stab), top var(--dur-tap) var(--ease-stab); }
.joystick[data-active] .joystick__stick { transition: none; }
.joystick--digital .joystick__plate { background: var(--ink); box-shadow: inset 0 0 0 2px var(--brass); }
.joystick--digital .joystick__plate::before { inset: 22%; border-radius: 0; background: linear-gradient(transparent 48%, var(--brass-edge) 48% 52%, transparent 52%), linear-gradient(90deg, transparent 48%, var(--brass-edge) 48% 52%, transparent 52%); box-shadow: none; }
.joystick--digital .joystick__detent { inline-size: 5%; border-radius: 0; background: var(--brass-lo); }
.joystick--digital .joystick__detent--effective { background: var(--brass-hi); }
.joystick--digital .joystick__stick { border-radius: 20%; background: var(--brass); box-shadow: 0 0 8px color-mix(in srgb, var(--brass) 50%, transparent); }
.joystick__label { max-width: 100%; color: var(--ivory-3); font-family: var(--font-display); font-size: clamp(8px, 14cqi, 10px); font-weight: 500; letter-spacing: .08em; line-height: 1; text-align: center; text-transform: uppercase; white-space: nowrap; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); border: 0; white-space: nowrap; pointer-events: none; }
@media (prefers-reduced-motion: reduce) { .joystick__stick { transition: none; } }
@media (forced-colors: active) {
  .joystick .joystick__plate { border: 1px solid CanvasText; background: Canvas; box-shadow: none; forced-color-adjust: none; }
  .joystick .joystick__plate::before { background: Canvas; box-shadow: none; }
  .joystick .joystick__detent { background: CanvasText; }
  .joystick .joystick__detent--effective { background: Highlight; outline: 1px solid Highlight; }
  .joystick .joystick__stick { background: Highlight; border: 1px solid HighlightText; box-shadow: none; }
  .joystick__plate:focus-within { outline-color: Highlight; }
}
</style>
