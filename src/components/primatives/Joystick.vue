<template>
  <div
    class="joystick"
    role="group"
    :aria-label="label"
    :data-latched="modelValue"
    :data-effective="effectiveValue"
    :data-momentary="momentaryValue || undefined"
  >
    <div class="joystick__plate" role="radiogroup" :aria-label="`${label} chord character`">
      <button
        v-for="option in JOYSTICK_OPTIONS"
        :key="option.value"
        :ref="(element) => setOptionRef(option.value, element)"
        class="joystick__direction"
        :class="[
          `joystick__direction--${option.position}`,
          {
            'joystick__direction--effective': effectiveValue === option.value,
            'joystick__direction--latched': modelValue === option.value,
          },
        ]"
        type="button"
        role="radio"
        :aria-checked="effectiveValue === option.value"
        :aria-label="`${option.label}: ${option.description}`"
        :title="`${option.label} · ${option.description}`"
        :tabindex="modelValue === option.value ? 0 : -1"
        @pointerdown="beginPointer($event, option.value)"
        @pointerup="finishPointer($event, option.value)"
        @pointercancel="cancelPointer($event)"
        @lostpointercapture="cancelPointer($event)"
        @click="handleClick($event, option.value)"
        @keydown="handleKeydown($event, option.value)"
      >
        <span class="joystick__glyph" aria-hidden="true">{{ option.glyph }}</span>
      </button>
      <span class="joystick__stick" aria-hidden="true"></span>
    </div>
    <span class="joystick__label" aria-hidden="true">{{ label }}</span>
    <span class="joystick__status sr-only" aria-live="polite">{{ statusText }}</span>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type ComponentPublicInstance,
} from "vue";
import type { HarmonyAlteration } from "@/domain/harmony";
import { JOYSTICK_OPTIONS } from "./joystickOptions";

const props = withDefaults(defineProps<{
  modelValue?: HarmonyAlteration;
  label?: string;
  holdThreshold?: number;
}>(), {
  modelValue: "auto",
  label: "Harmony",
  holdThreshold: 260,
});

const emit = defineEmits<{
  "update:modelValue": [value: HarmonyAlteration];
  effectiveChange: [value: HarmonyAlteration];
}>();

const momentaryValue = ref<HarmonyAlteration | null>(null);
const held = ref(false);
const activePointerId = ref<number | null>(null);
const activePointerValue = ref<HarmonyAlteration | null>(null);
const optionElements = new Map<HarmonyAlteration, HTMLButtonElement>();
let holdTimer: ReturnType<typeof setTimeout> | null = null;
let suppressNextClick = false;
let lastEffectiveValue: HarmonyAlteration = props.modelValue;

const effectiveValue = computed(() => momentaryValue.value ?? props.modelValue);
const activeOption = computed(() =>
  JOYSTICK_OPTIONS.find((option) => option.value === effectiveValue.value)
  ?? JOYSTICK_OPTIONS[4],
);
const statusText = computed(() =>
  `${activeOption.value.label}${momentaryValue.value ? ", momentary" : ", latched"}`,
);

function announceEffective(value: HarmonyAlteration) {
  if (lastEffectiveValue === value) return;
  lastEffectiveValue = value;
  emit("effectiveChange", value);
}

watch(() => props.modelValue, (value) => {
  if (!momentaryValue.value) announceEffective(value);
});

function setOptionRef(
  value: HarmonyAlteration,
  element: Element | ComponentPublicInstance | null,
) {
  if (!element) {
    optionElements.delete(value);
    return;
  }
  const resolved = element instanceof Element
    ? element
    : (element.$el as HTMLButtonElement | undefined);
  if (resolved instanceof HTMLButtonElement) optionElements.set(value, resolved);
}

function clearHoldTimer() {
  if (holdTimer) clearTimeout(holdTimer);
  holdTimer = null;
}

function beginPointer(event: PointerEvent, value: HarmonyAlteration) {
  if (activePointerId.value !== null || event.button !== 0) return;
  event.preventDefault();
  activePointerId.value = event.pointerId;
  activePointerValue.value = value;
  momentaryValue.value = value;
  held.value = false;
  announceEffective(value);
  event.currentTarget instanceof HTMLElement
    && event.currentTarget.setPointerCapture?.(event.pointerId);
  holdTimer = setTimeout(() => { held.value = true; }, Math.max(0, props.holdThreshold));
}

function resetPointer(restoreLatch: boolean) {
  clearHoldTimer();
  activePointerId.value = null;
  activePointerValue.value = null;
  held.value = false;
  momentaryValue.value = null;
  if (restoreLatch) announceEffective(props.modelValue);
}

function finishPointer(event: PointerEvent, value: HarmonyAlteration) {
  if (activePointerId.value !== event.pointerId || activePointerValue.value !== value) return;
  event.preventDefault();
  suppressNextClick = true;
  if (held.value) {
    resetPointer(true);
    return;
  }

  clearHoldTimer();
  activePointerId.value = null;
  activePointerValue.value = null;
  momentaryValue.value = null;
  emit("update:modelValue", value);
  announceEffective(value);
}

function cancelActivePointer() {
  if (activePointerId.value === null) return;
  suppressNextClick = true;
  resetPointer(true);
}

function cancelPointer(event: PointerEvent) {
  if (activePointerId.value === event.pointerId) cancelActivePointer();
}

function handleClick(event: MouseEvent, value: HarmonyAlteration) {
  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }
  // Keyboard activation arrives as a trusted click without a pointer sequence.
  emit("update:modelValue", value);
  announceEffective(value);
}

function focusOption(value: HarmonyAlteration) {
  optionElements.get(value)?.focus();
}

function handleKeydown(event: KeyboardEvent, value: HarmonyAlteration) {
  const option = JOYSTICK_OPTIONS.find((candidate) => candidate.value === value);
  if (!option) return;
  const index = JOYSTICK_OPTIONS.indexOf(option);
  let nextIndex = index;
  if (event.key === "ArrowLeft") nextIndex = Math.max(0, index - 1);
  else if (event.key === "ArrowRight") nextIndex = Math.min(8, index + 1);
  else if (event.key === "ArrowUp") nextIndex = Math.max(0, index - 3);
  else if (event.key === "ArrowDown") nextIndex = Math.min(8, index + 3);
  else if (event.key === "Home") nextIndex = 4;
  else return;

  event.preventDefault();
  focusOption(JOYSTICK_OPTIONS[nextIndex].value);
}

function handleVisibilityChange() {
  if (document.visibilityState === "hidden") cancelActivePointer();
}

onMounted(() => {
  window.addEventListener("blur", cancelActivePointer);
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onBeforeUnmount(() => {
  window.removeEventListener("blur", cancelActivePointer);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  cancelActivePointer();
  clearHoldTimer();
  optionElements.clear();
});
</script>

<style scoped>
.joystick {
  --joystick-size: clamp(44px, 92cqi, 58px);
  display: grid;
  min-width: 0;
  justify-items: center;
  gap: 1px;
  container-type: inline-size;
  color: var(--ivory);
  user-select: none;
}

.joystick__plate {
  position: relative;
  display: grid;
  width: var(--joystick-size);
  height: var(--joystick-size);
  grid-template: repeat(3, 1fr) / repeat(3, 1fr);
  overflow: hidden;
  border-radius: 50%;
  background:
    radial-gradient(circle at 42% 35%, rgba(255, 255, 255, .11), transparent 38%),
    var(--ink-3);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, .14),
    inset 0 -3px 7px rgba(0, 0, 0, .55),
    0 2px 0 var(--ink);
  isolation: isolate;
  touch-action: none;
}

.joystick__direction {
  position: relative;
  z-index: 2;
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  margin: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ivory-4);
  font: inherit;
  cursor: pointer;
  appearance: none;
  -webkit-tap-highlight-color: transparent;
}

.joystick__direction:focus-visible {
  outline: 2px solid var(--ivory);
  outline-offset: -2px;
}

.joystick__direction--effective {
  color: var(--brass);
  background: rgba(213, 166, 70, .13);
}

.joystick__direction--latched .joystick__glyph {
  text-shadow: 0 0 6px var(--brass-glow, rgba(213, 166, 70, .65));
}

.joystick__glyph {
  font-family: var(--font-mono);
  font-size: clamp(7px, 18cqi, 10px);
  line-height: 1;
}

.joystick__direction--center .joystick__glyph {
  opacity: 0;
}

.joystick__stick {
  position: absolute;
  z-index: 3;
  top: 50%;
  left: 50%;
  width: 27%;
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle at 38% 30%, rgba(255, 255, 255, .58), transparent 28%),
    var(--brass);
  box-shadow:
    inset 0 -2px 3px rgba(65, 38, 6, .54),
    0 2px 4px rgba(0, 0, 0, .58),
    0 0 7px var(--brass-glow, rgba(213, 166, 70, .35));
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition: transform 100ms ease-out;
}

.joystick[data-effective="augmented"] .joystick__stick { transform: translate(-78%, -78%); }
.joystick[data-effective="flip"] .joystick__stick { transform: translate(-50%, -88%); }
.joystick[data-effective="dominant7"] .joystick__stick { transform: translate(-22%, -78%); }
.joystick[data-effective="dark"] .joystick__stick { transform: translate(-88%, -50%); }
.joystick[data-effective="jazzy7"] .joystick__stick { transform: translate(-12%, -50%); }
.joystick[data-effective="sweet"] .joystick__stick { transform: translate(-78%, -22%); }
.joystick[data-effective="sus4"] .joystick__stick { transform: translate(-50%, -12%); }
.joystick[data-effective="lush9"] .joystick__stick { transform: translate(-22%, -22%); }

.joystick__label {
  max-width: 100%;
  overflow: hidden;
  color: var(--ivory-3);
  font: var(--t-micro);
  letter-spacing: .08em;
  line-height: 1;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .joystick__stick { transition: none; }
}

@media (forced-colors: active) {
  .joystick__plate {
    border: 1px solid CanvasText;
    background: Canvas;
    box-shadow: none;
    forced-color-adjust: none;
  }

  .joystick__direction { color: CanvasText; }
  .joystick__direction--effective { background: Highlight; color: HighlightText; }
  .joystick__stick { background: ButtonFace; border: 1px solid ButtonText; box-shadow: none; }
}
</style>
