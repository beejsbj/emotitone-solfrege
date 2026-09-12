<template>
  <button
    ref="keyRef"
    class="key pressable-key"
    :class="{
      'key--pressed': isPhysicallyPressed,
      'pressable-key--pressed': isPhysicallyPressed,
    }"
    type="button"
    :disabled="disabled"
    :aria-label="resolvedAriaLabel"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
    @touchstart.prevent="handleTouchStart"
    @touchmove.prevent="handleTouchMove"
    @touchend.prevent="handleTouchEnd"
    @touchcancel.prevent="handleTouchCancel"
  >
    <span class="key__face pressable-key__face" aria-hidden="true">
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
import { computed, ref, watch } from "vue";
import Note from "@/components/primatives/Note.vue";
import { usePressableKey, type PressInputEvent } from "@/composables/usePressableKey";
import "./pressableKey.css";
import type {
  NoteGeometry,
  NoteLabel,
  NoteProportion,
  NoteSurfaceStyle,
} from "@/components/primatives/Note.vue";
import type { ChromaticNote, MusicalMode } from "@/types/music";

export type KeyInputEvent = PressInputEvent;

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
    managedInput?: boolean;
    disabled?: boolean;
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
    managedInput: false,
    disabled: false,
    ariaLabel: undefined,
  },
);

const emit = defineEmits<{
  press: [payload: KeyInputEvent];
  release: [payload: KeyInputEvent];
}>();

const keyRef = ref<HTMLButtonElement | null>(null);
const {
  isLocallyPressed,
  handleMouseDown,
  handleMouseUp,
  handleMouseLeave,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleTouchCancel,
  releaseAllInputs,
} = usePressableKey(keyRef, {
  press: (payload) => emit("press", payload),
  release: (payload) => emit("release", payload),
}, {
  disabled: () => props.disabled,
  managedInput: () => props.managedInput,
});

const isPhysicallyPressed = computed(
  () => props.pressed || isLocallyPressed.value,
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

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) releaseAllInputs(new Event("disabled"));
  },
);
</script>

<style scoped>
.key--pressed .key__face :deep(.note__surface) {
  box-shadow:
    var(--note-shadow),
    inset 0 2px 4px rgba(0, 0, 0, .42),
    inset 0 0 0 1px var(--note-inner-border);
}

</style>
