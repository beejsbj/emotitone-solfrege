<template>
  <button
    ref="keyRef"
    class="key"
    :class="{ 'key--pressed': isPhysicallyPressed }"
    type="button"
    :aria-label="resolvedAriaLabel"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
    @touchstart.prevent="handleTouchStart"
    @touchmove.prevent="handleTouchMove"
    @touchend.prevent="handleTouchEnd"
    @touchcancel.prevent="handleTouchCancel"
  >
    <span class="key__face" aria-hidden="true">
      <Note
        :syllable="syllable"
        :degree="degree"
        :raw-pitch="rawPitch"
        :primary="primary"
        :visible-labels="visibleLabels"
        :geometry="geometry"
        :proportion="proportion"
        :scale-index="scaleIndex"
        :pitch-class-index="pitchClassIndex"
        :octave="octave"
        :mode="mode"
        :music-key="musicKey"
        :surface-style="surfaceStyle"
        :accidental="accidental"
        :key-brightness="keyBrightness"
        :key-saturation="keySaturation"
        :sounding="sounding"
      />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import Note from "@/components/primatives/Note.vue";
import type {
  NoteGeometry,
  NoteLabel,
  NoteProportion,
  NoteSurfaceStyle,
} from "@/components/primatives/Note.vue";
import type { ChromaticNote, MusicalMode } from "@/types/music";

export interface KeyInputEvent {
  inputId: string;
  event: Event;
}

const props = withDefaults(
  defineProps<{
    syllable?: string;
    degree?: string;
    rawPitch?: string;
    primary?: NoteLabel;
    visibleLabels?: NoteLabel[];
    geometry?: NoteGeometry;
    proportion?: NoteProportion;
    scaleIndex?: number;
    pitchClassIndex?: number;
    octave?: number;
    mode?: MusicalMode;
    musicKey?: ChromaticNote;
    surfaceStyle?: NoteSurfaceStyle;
    accidental?: boolean | null;
    keyBrightness?: number;
    keySaturation?: number;
    sounding?: boolean;
    pressed?: boolean;
    ariaLabel?: string;
  }>(),
  {
    syllable: "Do",
    degree: "I",
    rawPitch: "C4",
    primary: "syllable",
    visibleLabels: () => ["syllable", "degree", "raw"],
    geometry: "standard",
    proportion: "medium",
    scaleIndex: 0,
    pitchClassIndex: undefined,
    octave: 4,
    mode: "major",
    musicKey: "C",
    surfaceStyle: "colored",
    accidental: null,
    keyBrightness: 1,
    keySaturation: 1,
    sounding: false,
    pressed: false,
    ariaLabel: undefined,
  },
);

const emit = defineEmits<{
  press: [payload: KeyInputEvent];
  release: [payload: KeyInputEvent];
}>();

const keyRef = ref<HTMLButtonElement | null>(null);
const activeInputIds = reactive(new Set<string>());
const mouseInputId = "mouse";
const touchInputId = (identifier: number) => `touch:${identifier}`;

const isPhysicallyPressed = computed(
  () => props.pressed || activeInputIds.size > 0,
);

const resolvedAriaLabel = computed(() => {
  if (props.ariaLabel) return props.ariaLabel;

  const hasSyllable = props.visibleLabels.includes("syllable") && props.syllable;
  const hasRawPitch = props.visibleLabels.includes("raw") && props.rawPitch;

  if (hasSyllable && hasRawPitch) return `${props.syllable} (${props.rawPitch})`;
  if (hasRawPitch) return props.rawPitch;
  if (hasSyllable) return props.syllable;
  if (props.visibleLabels.includes("degree") && props.degree) return props.degree;
  return props.rawPitch;
});

function beginInput(inputId: string, event: Event) {
  if (activeInputIds.has(inputId)) return;

  activeInputIds.add(inputId);
  emit("press", { inputId, event });
}

function endInput(inputId: string, event: Event) {
  if (!activeInputIds.delete(inputId)) return;

  emit("release", { inputId, event });
}

function releaseAllInputs(event: Event) {
  for (const inputId of Array.from(activeInputIds)) {
    endInput(inputId, event);
  }
}

function handleMouseDown(event: MouseEvent) {
  if (event.button !== 0) return;
  beginInput(mouseInputId, event);
}

function handleMouseUp(event: MouseEvent) {
  endInput(mouseInputId, event);
}

function handleMouseLeave(event: MouseEvent) {
  endInput(mouseInputId, event);
}

function isTouchWithinKey(touch: Touch, tolerance = 0) {
  const element = keyRef.value;
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  return (
    touch.clientX >= rect.left - tolerance &&
    touch.clientX <= rect.right + tolerance &&
    touch.clientY >= rect.top - tolerance &&
    touch.clientY <= rect.bottom + tolerance
  );
}

function handleTouchStart(event: TouchEvent) {
  for (const touch of Array.from(event.changedTouches)) {
    if (isTouchWithinKey(touch)) {
      beginInput(touchInputId(touch.identifier), event);
    }
  }
}

function handleTouchMove(event: TouchEvent) {
  for (const touch of Array.from(event.touches)) {
    const inputId = touchInputId(touch.identifier);
    if (activeInputIds.has(inputId) && !isTouchWithinKey(touch, 5)) {
      endInput(inputId, event);
    }
  }
}

function handleTouchEnd(event: TouchEvent) {
  for (const touch of Array.from(event.changedTouches)) {
    endInput(touchInputId(touch.identifier), event);
  }
}

function handleTouchCancel(event: TouchEvent) {
  handleTouchEnd(event);
}

function handleWindowBlur(event: Event) {
  releaseAllInputs(event);
}

function handleVisibilityChange(event: Event) {
  if (document.visibilityState === "hidden") {
    releaseAllInputs(event);
  }
}

onMounted(() => {
  window.addEventListener("blur", handleWindowBlur);
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onBeforeUnmount(() => {
  window.removeEventListener("blur", handleWindowBlur);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  releaseAllInputs(new Event("unmount"));
});
</script>

<style scoped>
.key {
  display: inline-grid;
  min-width: 44px;
  min-height: 44px;
  place-items: center;
  margin: 0;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: inherit;
  font: inherit;
  appearance: none;
  touch-action: manipulation;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

.key:focus-visible {
  outline: 2px solid var(--ivory, currentColor);
  outline-offset: 2px;
}

.key__face {
  --key-face-press-y: 0px;
  --key-face-press-scale: 1;
  --key-face-hover-y: 0px;
  display: block;
  pointer-events: none;
  transform:
    translateY(calc(var(--key-face-hover-y) + var(--key-face-press-y)))
    rotate(var(--key-face-rotation, 0deg))
    scale(var(--key-face-press-scale));
  transition: transform 90ms ease-in-out;
  will-change: transform;
}

.key--pressed .key__face {
  --key-face-press-y: 2px;
  --key-face-press-scale: .97;
}

.key--pressed .key__face :deep(.note__surface) {
  box-shadow:
    var(--note-shadow),
    inset 0 2px 4px rgba(0, 0, 0, .42),
    inset 0 0 0 1px var(--note-inner-border);
}

@media (hover: hover) and (pointer: fine) {
  .key:not(.key--pressed):hover .key__face {
    --key-face-hover-y: -1px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .key__face,
  .key--pressed .key__face {
    --key-face-press-y: 0px;
    --key-face-press-scale: 1;
    --key-face-hover-y: 0px;
    transition: none;
    will-change: auto;
  }

  @media (hover: hover) and (pointer: fine) {
    .key:not(.key--pressed):hover .key__face {
      --key-face-hover-y: 0px;
    }
  }
}

@media (forced-colors: active) {
  .key:focus-visible {
    outline-color: CanvasText;
  }
}
</style>
