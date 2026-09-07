<template>
  <button
    ref="keyRef"
    class="chord-key pressable-key"
    :class="{
      'chord-key--pressed': isPhysicallyPressed,
      'pressable-key--pressed': isPhysicallyPressed,
    }"
    type="button"
    :aria-label="accessibleName"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend.prevent="handleTouchEnd"
    @touchcancel="handleTouchCancel"
    @keydown="trackActivationKeyDown"
    @keyup="trackActivationKeyUp"
    @blur="clearActivationKeys"
    @click="handleClickOnlyActivation"
  >
    <span class="chord-key__face pressable-key__face" aria-hidden="true">
      <Chord
        :members="members"
        display="symbol"
        :symbol="symbol"
        :proportion="proportion"
        :geometry="geometry"
        :accessible-name="accessibleName"
      />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import Chord from "@/components/compounds/Chord.vue";
import type {
  ChordMember,
  ChordProportion,
} from "@/components/compounds/Chord.vue";
import type { NoteGeometry } from "@/components/primatives/Note.vue";
import { usePressableKey, type PressInputEvent } from "@/composables/usePressableKey";
import "./pressableKey.css";

export type ChordKeyInputEvent = PressInputEvent;

const props = withDefaults(defineProps<{
  members: ChordMember[];
  symbol: string;
  accessibleName: string;
  proportion?: ChordProportion;
  geometry?: NoteGeometry;
  pressed?: boolean;
}>(), {
  proportion: "compact",
  geometry: "offcut",
  pressed: false,
});

const emit = defineEmits<{
  press: [payload: ChordKeyInputEvent];
  release: [payload: ChordKeyInputEvent];
}>();

const keyRef = ref<HTMLButtonElement | null>(null);
const CLICK_PULSE_MS = 120;
const TOUCH_HOLD_DELAY_MS = 120;
const TOUCH_PAN_THRESHOLD_PX = 8;
const activationKeys = new Set<string>();
let suppressKeyboardClick = false;
const {
  isLocallyPressed,
  handleMouseDown,
  handleMouseUp,
  handleMouseLeave,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleTouchCancel,
  pulseInput,
} = usePressableKey(keyRef, {
  press: (payload) => emit("press", payload),
  release: (payload) => emit("release", payload),
}, {
  touchHoldDelayMs: TOUCH_HOLD_DELAY_MS,
  touchPanThresholdPx: TOUCH_PAN_THRESHOLD_PX,
  touchTapPulseMs: CLICK_PULSE_MS,
});

function isActivationKey(event: KeyboardEvent) {
  return event.key === " " || event.key === "Enter";
}

function trackActivationKeyDown(event: KeyboardEvent) {
  if (isActivationKey(event)) activationKeys.add(event.code);
}

function trackActivationKeyUp(event: KeyboardEvent) {
  if (!isActivationKey(event) || !activationKeys.delete(event.code)) return;
  // A native Space click follows keyup in the same task. Keep that click owned
  // by Keyboard's existing key lifecycle, then reopen click-only activation.
  suppressKeyboardClick = true;
  queueMicrotask(() => {
    suppressKeyboardClick = false;
  });
}

function clearActivationKeys() {
  activationKeys.clear();
  suppressKeyboardClick = false;
}

function handleClickOnlyActivation(event: MouseEvent) {
  // Real pointer clicks already ran through mousedown/up. Keyboard clicks are
  // owned by Keyboard's keydown/up handlers. Detail 0 with no keyboard cycle
  // is the bounded path for switch, virtual-cursor, and programmatic clicks.
  if (event.detail !== 0 || activationKeys.size > 0 || suppressKeyboardClick) return;
  pulseInput("click", event, CLICK_PULSE_MS);
}

const isPhysicallyPressed = computed(() => props.pressed || isLocallyPressed.value);
</script>

<style scoped>
.chord-key {
  width: 100%;
  min-width: 44px;
  touch-action: pan-x;
}

.chord-key__face,
.chord-key :deep(.chord),
.chord-key :deep(.chord__fused) {
  width: 100%;
}

.chord-key :deep(.chord__fused-member) {
  width: auto;
  min-width: 0;
  flex: 1 1 0;
}

.chord-key :deep(.chord__symbol) {
  overflow: hidden;
  padding-inline: 2px;
  font-size: clamp(10px, 3.8cqi, 16px);
  text-overflow: ellipsis;
}

.chord-key--pressed :deep(.chord__fused) {
  box-shadow:
    var(--shadow-key),
    inset 0 2px 4px rgba(0, 0, 0, .42);
}
</style>
