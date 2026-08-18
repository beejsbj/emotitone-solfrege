<template>
  <button
    ref="keyRef"
    type="button"
    class="key"
    :class="keyClasses"
    :disabled="disabled || inputLocked"
    :aria-label="ariaLabel"
    :aria-pressed="pressed || sounding"
    @touchstart.prevent="handleTouchStart"
    @touchmove.prevent="handleTouchMove"
    @touchend.prevent="handleTouchEnd"
    @touchcancel.prevent="handleTouchEnd"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
  >
    <Note
      v-bind="noteProps"
      :sounding="sounding"
      :sustained="sustained"
      :played-recently="playedRecently"
      :selected="selected"
      :ghosted="ghosted || disabled || inputLocked"
    />
  </button>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import Note from "@/components/primatives/Note.vue";
import type {
  NoteLabel,
  NoteShape,
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
    shape?: NoteShape;
    scaleIndex?: number;
    pitchClassIndex?: number;
    octave?: number;
    mode?: MusicalMode;
    musicKey?: ChromaticNote;
    surfaceStyle?: NoteSurfaceStyle;
    accidental?: boolean;
    keyBrightness?: number;
    keySaturation?: number;
    glassmorphOpacity?: number;
    sounding?: boolean;
    sustained?: boolean;
    playedRecently?: boolean;
    selected?: boolean;
    ghosted?: boolean;
    pressed?: boolean;
    disabled?: boolean;
    inputLocked?: boolean;
    ariaLabel?: string;
  }>(),
  {
    syllable: "Do",
    degree: "I",
    rawPitch: "C4",
    primary: "syllable",
    visibleLabels: () => ["syllable", "degree", "raw"],
    shape: "strip",
    scaleIndex: 0,
    pitchClassIndex: 0,
    octave: 4,
    mode: "major",
    musicKey: "C",
    surfaceStyle: "colored",
    accidental: false,
    keyBrightness: 1,
    keySaturation: 1,
    glassmorphOpacity: 0.4,
    sounding: false,
    sustained: false,
    playedRecently: false,
    selected: false,
    ghosted: false,
    pressed: false,
    disabled: false,
    inputLocked: false,
    ariaLabel: undefined,
  },
);

const emit = defineEmits<{
  press: [payload: KeyInputEvent];
  release: [payload: KeyInputEvent];
}>();

const keyRef = ref<HTMLButtonElement | null>(null);
const activeInputs = ref(new Set<string>());
const mouseInputId = "mouse";
const touchInputId = (identifier: number) => `touch:${identifier}`;

const noteProps = computed(() => ({
  syllable: props.syllable,
  degree: props.degree,
  rawPitch: props.rawPitch,
  primary: props.primary,
  visibleLabels: props.visibleLabels,
  shape: props.shape,
  scaleIndex: props.scaleIndex,
  pitchClassIndex: props.pitchClassIndex,
  octave: props.octave,
  mode: props.mode,
  musicKey: props.musicKey,
  surfaceStyle: props.surfaceStyle,
  accidental: props.accidental,
  keyBrightness: props.keyBrightness,
  keySaturation: props.keySaturation,
  glassmorphOpacity: props.glassmorphOpacity,
}));

const keyClasses = computed(() => ({
  "key--pressed": props.pressed || activeInputs.value.size > 0,
  "key--locked": props.inputLocked,
}));

const ariaLabel = computed(
  () => props.ariaLabel || `${props.syllable} (${props.rawPitch})`,
);

function begin(inputId: string, event: Event) {
  if (props.disabled || props.inputLocked || activeInputs.value.has(inputId)) return;
  activeInputs.value.add(inputId);
  emit("press", { inputId, event });
}

function end(inputId: string, event: Event) {
  if (!activeInputs.value.has(inputId)) return;
  activeInputs.value.delete(inputId);
  emit("release", { inputId, event });
}

function handleMouseDown(event: MouseEvent) { begin(mouseInputId, event); }
function handleMouseUp(event: MouseEvent) { end(mouseInputId, event); }
function handleMouseLeave(event: MouseEvent) { end(mouseInputId, event); }

function handleTouchStart(event: TouchEvent) {
  const rect = keyRef.value?.getBoundingClientRect();
  if (!rect) return;

  for (const touch of Array.from(event.changedTouches)) {
    if (
      touch.clientX >= rect.left && touch.clientX <= rect.right
      && touch.clientY >= rect.top && touch.clientY <= rect.bottom
    ) {
      begin(touchInputId(touch.identifier), event);
    }
  }
}

function handleTouchMove(event: TouchEvent) {
  const rect = keyRef.value?.getBoundingClientRect();
  if (!rect) return;
  const tolerance = 5;

  for (const touch of Array.from(event.touches)) {
    const inputId = touchInputId(touch.identifier);
    if (!activeInputs.value.has(inputId)) continue;
    const inBounds =
      touch.clientX >= rect.left - tolerance
      && touch.clientX <= rect.right + tolerance
      && touch.clientY >= rect.top - tolerance
      && touch.clientY <= rect.bottom + tolerance;
    if (!inBounds) end(inputId, event);
  }
}

function handleTouchEnd(event: TouchEvent) {
  for (const touch of Array.from(event.changedTouches)) {
    end(touchInputId(touch.identifier), event);
  }
}

function releaseAll(event: Event) {
  for (const inputId of [...activeInputs.value]) end(inputId, event);
}

onMounted(() => {
  document.addEventListener("visibilitychange", releaseAll);
  window.addEventListener("blur", releaseAll);
});

onBeforeUnmount(() => {
  releaseAll(new Event("unmount"));
  document.removeEventListener("visibilitychange", releaseAll);
  window.removeEventListener("blur", releaseAll);
});

defineExpose({
  triggerPress: () => begin(mouseInputId, new MouseEvent("mousedown")),
  triggerRelease: () => end(mouseInputId, new MouseEvent("mouseup")),
});
</script>

<style scoped>
.key {
  display: block;
  min-width: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  transition: transform var(--dur-tap) var(--ease-stab);
}

.key--pressed {
  transform: translateY(1px) scale(.95);
}

.key--pressed :deep(.note) {
  box-shadow: var(--shadow-pressed);
  filter: brightness(.88);
}

.key:focus-visible {
  outline: 2px solid rgba(96, 165, 250, .55);
  outline-offset: 2px;
}

.key:disabled {
  cursor: not-allowed;
}

@media (hover: none) and (pointer: coarse) {
  .key:not(.key--pressed):active { transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .key { transition: none; }
}
</style>
