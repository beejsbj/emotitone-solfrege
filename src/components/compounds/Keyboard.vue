<template>
  <div
    ref="keyboardRef"
    class="keyboard"
    :class="[`keyboard--motion-${resolvedMotion}`, `keyboard--contrast-${resolvedContrast}`]"
    :style="{ '--keyboard-gap': `${Math.max(resolvedGap, 0)}px` }"
    role="group"
    aria-label="Solfège keyboard"
    :data-geometry-family="resolvedFamily"
    :data-edition-seed="resolvedEditionSeed"
  >
    <div
      v-for="(row, rowIndex) in renderRows"
      :key="`octave-${row.octave}`"
      class="keyboard__row"
      :class="{ 'keyboard__row--main': row.octave === resolvedMainOctave }"
      role="group"
      :aria-label="rowAriaLabel(row.octave)"
      :data-octave="row.octave"
      :style="rowStyle(row.octave)"
    >
      <Key
        v-for="(key, keyIndex) in row.keys"
        :key="key.id"
        :ref="(instance) => setKeyRef(key.id, instance)"
        class="keyboard__key"
        :class="{
          'keyboard__key--focus-preview': key.focusVisible,
          'keyboard__key--pressed': key.pressed,
        }"
        :style="keyStyle(key, row.octave)"
        :syllable="key.syllable"
        :degree="key.degree"
        :raw-pitch="key.rawPitch"
        :primary="primaryLabelFor(row.octave)"
        :visible-labels="visibleLabelsFor(row.octave)"
        :geometry="resolvedFamily"
        :proportion="proportionFor(row.octave)"
        :scale-index="key.scaleIndex"
        :pitch-class-index="key.pitchClassIndex"
        :octave="row.octave"
        :mode="key.mode"
        :music-key="key.musicKey"
        :surface-style="resolvedSurfaceStyle"
        :accidental="key.accidental"
        :key-brightness="key.keyBrightness"
        :key-saturation="key.keySaturation"
        :sounding="key.sounding"
        :pressed="key.pressed"
        :aria-label="keyAriaLabel(key, row.octave)"
        :aria-keyshortcuts="key.shortcut || undefined"
        :tabindex="key.id === rememberedFocusId ? 0 : -1"
        :data-key-id="key.id"
        :data-edition-variant="variationFor(key.id).variant"
        @focus="rememberFocus(key.id)"
        @keydown="handleKeyDown($event, rowIndex, keyIndex)"
        @keyup="handleKeyUp($event, key)"
        @press="emitIntent('press', $event, key, row.octave)"
        @release="emitIntent('release', $event, key, row.octave)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type ComponentPublicInstance,
} from "vue";
import Key from "@/components/compounds/Key.vue";
import type { KeyInputEvent } from "@/components/compounds/Key.vue";
import type {
  NoteLabel,
  NoteProportion,
  NoteSurfaceStyle,
} from "@/components/primatives/Note.vue";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import { CHROMATIC_NOTES } from "@/data";
import { getChromaticNoteForScaleIndex } from "@/services/musicColor";
import { useKeyboardControls } from "@/composables/useKeyboardControls";
import { useSolfegeInteraction } from "@/composables/useSolfegeInteraction";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { triggerNoteHaptic } from "@/utils/hapticFeedback";
import {
  KEYBOARD_PAGE_EDITION_SEED,
  keyboardEditionVariation,
  keyboardEditionRowVariations,
  keyboardFamilyForDate,
  type KeyboardGeometryFamily,
} from "./keyboardEdition";
import {
  accessiblePitch,
  accessibleScaleDegree,
} from "./keyboardAccessibility";

export interface KeyboardKeyView {
  id: string;
  syllable: string;
  degree: string;
  rawPitch: string;
  scaleIndex: number;
  pitchClassIndex?: number;
  mode?: MusicalMode;
  musicKey?: ChromaticNote;
  accidental?: boolean | null;
  keyBrightness?: number;
  keySaturation?: number;
  sounding?: boolean;
  pressed?: boolean;
  focusVisible?: boolean;
  shortcut?: string;
}

export interface KeyboardRowView {
  octave: number;
  keys: KeyboardKeyView[];
}

export interface KeyboardIntent extends KeyInputEvent {
  keyId: string;
  scaleIndex: number;
  octave: number;
  source: "pointer" | "focus";
}

const props = withDefaults(
  defineProps<{
    usage?: "production" | "controlled";
    rows?: KeyboardRowView[];
    mainOctave?: number;
    primaryLabel?: NoteLabel;
    showLabels?: boolean;
    surfaceStyle?: NoteSurfaceStyle;
    geometryFamily?: KeyboardGeometryFamily;
    editionSeed?: string;
    gap?: number;
    mainRowHeight?: number;
    outerRowHeight?: number;
    outerInset?: number;
    variationAmplitude?: number;
    motion?: "system" | "reduced";
    contrast?: "system" | "forced";
  }>(),
  {
    usage: "production",
    rows: () => [],
    mainOctave: 4,
    primaryLabel: "syllable",
    showLabels: true,
    surfaceStyle: "colored",
    geometryFamily: undefined,
    editionSeed: undefined,
    gap: 2,
    mainRowHeight: 88,
    outerRowHeight: 56,
    outerInset: 0,
    variationAmplitude: 1,
    motion: "system",
    contrast: "system",
  },
);

const emit = defineEmits<{
  press: [intent: KeyboardIntent];
  release: [intent: KeyboardIntent];
  focusChange: [keyId: string];
}>();

function createProductionWiring() {
  const store = useKeyboardDrawerStore();
  const musicStore = useMusicStore();
  const config = computed(() => store.keyboardConfig);
  const currentMusicKey = computed(() => musicStore.currentKey as ChromaticNote);
  const surfaceStyle = computed<NoteSurfaceStyle>(() =>
    config.value.surfaceStyle === "monochrome" ? "monochrome" : "colored",
  );
  const gap = computed(() => ({
    none: 0,
    small: 2,
    medium: 4,
  })[config.value.keyGaps] ?? 2);
  const { attackNoteWithOctave, releaseNoteByButtonKey } = useSolfegeInteraction();

  useKeyboardControls(computed(() => config.value.mainOctave));

  const romanDegrees = [
    "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII",
  ];
  const degreeLabel = (number: number) => romanDegrees[number - 1] ?? String(number);
  const noteKey = (scaleIndex: number, octave: number) => `${scaleIndex}_${octave}`;
  const noteName = (scaleIndex: number, octave: number) =>
    musicStore.getNoteName(scaleIndex, octave);
  const isAccidental = (scaleIndex: number, octave: number) =>
    /[#b♯♭]/.test(noteName(scaleIndex, octave));
  const pitchClassIndex = (scaleIndex: number) => {
    const pitch = getChromaticNoteForScaleIndex(
      scaleIndex,
      musicStore.currentMode,
      currentMusicKey.value,
    );
    return pitch ? CHROMATIC_NOTES.indexOf(pitch) : undefined;
  };
  const soundingNoteKeys = computed(() => new Set(
    musicStore
      .getActiveNotes()
      .map((note) => `${note.solfegeIndex}_${note.octave}`),
  ));
  const rows = computed<KeyboardRowView[]>(() =>
    store.visibleOctaves.map((octave) => ({
      octave,
      keys: store.solfegeData.map((solfege, scaleIndex) => {
        const id = noteKey(scaleIndex, octave);
        return {
          id,
          syllable: solfege.name,
          degree: degreeLabel(solfege.number),
          rawPitch: noteName(scaleIndex, octave),
          scaleIndex,
          pitchClassIndex: pitchClassIndex(scaleIndex),
          mode: musicStore.currentMode,
          musicKey: currentMusicKey.value,
          accidental: isAccidental(scaleIndex, octave),
          keyBrightness: config.value.keyBrightness,
          keySaturation: config.value.keySaturation,
          sounding: store.isVisualNoteActive(id) || soundingNoteKeys.value.has(id),
          pressed: store.isKeyPressed(id),
        };
      }),
    })),
  );

  const inputPressId = (intent: KeyboardIntent) =>
    `${intent.inputId}:${intent.keyId}`;

  async function press(intent: KeyboardIntent) {
    store.addTouch(inputPressId(intent), intent.keyId);
    if (intent.source === "pointer" && config.value.hapticFeedback) {
      triggerNoteHaptic();
    }
    await attackNoteWithOctave(intent.scaleIndex, intent.octave, intent.event);
  }

  function release(intent: KeyboardIntent) {
    store.removeTouch(inputPressId(intent));
    releaseNoteByButtonKey(intent.keyId, intent.event);
  }

  return {
    config,
    rows,
    surfaceStyle,
    gap,
    press,
    release,
    clear: store.clearAllTouches,
  };
}

const isProductionUsage = props.usage === "production";
const productionWiring = isProductionUsage ? createProductionWiring() : null;
const renderRows = computed(() => productionWiring?.rows.value ?? props.rows);
const resolvedMainOctave = computed(
  () => productionWiring?.config.value.mainOctave ?? props.mainOctave,
);
const resolvedPrimaryLabel = computed(
  () => productionWiring?.config.value.primaryLabel ?? props.primaryLabel,
);
const resolvedShowLabels = computed(
  () => productionWiring?.config.value.showLabels ?? props.showLabels,
);
const resolvedSurfaceStyle = computed(
  () => productionWiring?.surfaceStyle.value ?? props.surfaceStyle,
);
const resolvedGap = computed(() => productionWiring?.gap.value ?? props.gap);
const resolvedMainRowHeight = computed(() => productionWiring
  ? Math.max(88 * productionWiring.config.value.keySize, 44)
  : props.mainRowHeight);
const resolvedOuterRowHeight = computed(() => productionWiring
  ? Math.max(56 * productionWiring.config.value.keySize, 44)
  : props.outerRowHeight);
const resolvedOuterInset = computed(() => isProductionUsage ? 0 : props.outerInset);
const resolvedVariationAmplitude = computed(
  () => isProductionUsage ? 1 : props.variationAmplitude,
);
const resolvedMotion = computed(() => isProductionUsage ? "system" : props.motion);
const resolvedContrast = computed(() => isProductionUsage ? "system" : props.contrast);

const mountFamily = keyboardFamilyForDate(new Date());
const resolvedFamily = computed(() => props.geometryFamily ?? mountFamily);
const resolvedEditionSeed = computed(
  () => props.editionSeed ?? KEYBOARD_PAGE_EDITION_SEED,
);
const keyboardRef = ref<HTMLElement | null>(null);
const keyElements = new Map<string, HTMLButtonElement>();
const rememberedFocusId = ref("");
const activeFocusInputs = new Map<string, KeyboardIntent>();

const allKeys = computed(() => renderRows.value.flatMap((row) => row.keys));
const defaultFocusId = computed(
  () =>
    renderRows.value.find((row) => row.octave === resolvedMainOctave.value)?.keys[0]?.id
    ?? renderRows.value[0]?.keys[0]?.id
    ?? "",
);
const rowSignature = computed(() =>
  renderRows.value
    .map((row) => `${row.octave}:${row.keys.map((key) => key.id).join(",")}`)
    .join("|"),
);
const editionVariations = computed(() => new Map(
  renderRows.value.flatMap((row) =>
    keyboardEditionRowVariations(
      resolvedFamily.value,
      resolvedEditionSeed.value,
      row.keys.map((key) => key.id),
    ),
  ),
));

watch(
  rowSignature,
  () => {
    releaseFocusedInputs(new Event("keyboard-remap"));
    if (!allKeys.value.some((key) => key.id === rememberedFocusId.value)) {
      rememberedFocusId.value = defaultFocusId.value;
    }
  },
  { immediate: true },
);

function setKeyRef(
  keyId: string,
  instance: Element | ComponentPublicInstance | null,
) {
  if (!instance) {
    keyElements.delete(keyId);
    return;
  }

  const element = instance instanceof Element
    ? instance
    : (instance.$el as HTMLButtonElement | undefined);
  if (element instanceof HTMLButtonElement) keyElements.set(keyId, element);
}

function variationFor(keyId: string) {
  return editionVariations.value.get(keyId) ?? keyboardEditionVariation(
    resolvedFamily.value,
    resolvedEditionSeed.value,
    keyId,
  );
}

function keyStyle(key: KeyboardKeyView, octave: number) {
  const variation = variationFor(key.id);
  const height = octave === resolvedMainOctave.value
    ? resolvedMainRowHeight.value
    : resolvedOuterRowHeight.value;

  return {
    "--keyboard-note-height": `${Math.max(height, 44)}px`,
    "--keyboard-edition-rotation": variation.rotation,
    "--key-face-rotation": "calc(var(--keyboard-edition-rotation) * var(--keyboard-variation-amplitude))",
    "--note-geometry-override-clip": variation.cut,
    "--note-geometry-override-shadow": variation.shadow,
    zIndex: key.pressed ? 10_001 : variation.layer,
  };
}

function rowStyle(octave: number) {
  return {
    "--keyboard-outer-inset": octave === resolvedMainOctave.value
      ? "0px"
      : `${Math.max(resolvedOuterInset.value, 0)}px`,
    "--keyboard-user-variation-amplitude": Math.max(
      0,
      resolvedVariationAmplitude.value,
    ),
  };
}

function rowAriaLabel(octave: number) {
  return octave === resolvedMainOctave.value
    ? `Main octave ${octave}`
    : `Octave ${octave}`;
}

function primaryLabelFor(octave: number): NoteLabel {
  return octave === resolvedMainOctave.value ? resolvedPrimaryLabel.value : "raw";
}

function proportionFor(octave: number): NoteProportion {
  return octave === resolvedMainOctave.value ? "medium" : "wide";
}

function visibleLabelsFor(octave: number): NoteLabel[] {
  if (!resolvedShowLabels.value) return [];
  return octave === resolvedMainOctave.value
    ? ["syllable", "degree", "raw"]
    : ["raw"];
}

function keyAriaLabel(key: KeyboardKeyView, octave: number) {
  const context = octave === resolvedMainOctave.value
    ? "main octave"
    : `octave ${octave}`;
  const sounding = key.sounding && key.id === rememberedFocusId.value
    ? ", sounding"
    : "";
  return `${key.syllable}, scale degree ${accessibleScaleDegree(key.scaleIndex)}, ${accessiblePitch(key.rawPitch)}, ${context}${sounding}`;
}

function rememberFocus(keyId: string) {
  rememberedFocusId.value = keyId;
  emit("focusChange", keyId);
}

function focusKey(rowIndex: number, keyIndex: number) {
  const key = renderRows.value[rowIndex]?.keys[keyIndex];
  if (!key) return;
  rememberFocus(key.id);
  void nextTick(() => keyElements.get(key.id)?.focus());
}

function moveFocus(event: KeyboardEvent, rowIndex: number, keyIndex: number) {
  if (event.key === "ArrowLeft") return focusKey(rowIndex, Math.max(0, keyIndex - 1));
  if (event.key === "ArrowRight") {
    return focusKey(
      rowIndex,
      Math.min(renderRows.value[rowIndex].keys.length - 1, keyIndex + 1),
    );
  }
  if (event.key === "ArrowUp") return focusKey(Math.max(0, rowIndex - 1), keyIndex);
  if (event.key === "ArrowDown") {
    return focusKey(Math.min(renderRows.value.length - 1, rowIndex + 1), keyIndex);
  }
  if (event.key === "Home") return focusKey(rowIndex, 0);
  if (event.key === "End") return focusKey(rowIndex, renderRows.value[rowIndex].keys.length - 1);
}

function emitIntent(
  kind: "press" | "release",
  payload: KeyInputEvent,
  key: KeyboardKeyView,
  octave: number,
) {
  const intent: KeyboardIntent = {
    ...payload,
    keyId: key.id,
    scaleIndex: key.scaleIndex,
    octave,
    source: payload.inputId.startsWith("focus:") ? "focus" : "pointer",
  };
  dispatchIntent(kind, intent);
}

function dispatchIntent(kind: "press" | "release", intent: KeyboardIntent) {
  if (kind === "press") {
    if (productionWiring) void productionWiring.press(intent);
    emit("press", intent);
    return;
  }
  productionWiring?.release(intent);
  emit("release", intent);
}

function handleKeyDown(event: KeyboardEvent, rowIndex: number, keyIndex: number) {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    moveFocus(event, rowIndex, keyIndex);
    return;
  }

  if (![" ", "Enter"].includes(event.key) || event.repeat) return;
  const key = renderRows.value[rowIndex]?.keys[keyIndex];
  if (!key) return;

  const inputId = `focus:${event.code}`;
  if (activeFocusInputs.has(inputId)) return;
  event.preventDefault();

  const intent: KeyboardIntent = {
    inputId,
    event,
    keyId: key.id,
    scaleIndex: key.scaleIndex,
    octave: renderRows.value[rowIndex].octave,
    source: "focus",
  };
  activeFocusInputs.set(inputId, intent);
  dispatchIntent("press", intent);
}

function handleKeyUp(event: KeyboardEvent, key: KeyboardKeyView) {
  if (![" ", "Enter"].includes(event.key)) return;
  const inputId = `focus:${event.code}`;
  const intent = activeFocusInputs.get(inputId);
  if (!intent || intent.keyId !== key.id) return;
  event.preventDefault();
  activeFocusInputs.delete(inputId);
  dispatchIntent("release", { ...intent, event });
}

function releaseFocusedInputs(event: Event) {
  for (const intent of activeFocusInputs.values()) {
    dispatchIntent("release", { ...intent, event });
  }
  activeFocusInputs.clear();
}

function handleVisibilityChange(event: Event) {
  if (document.visibilityState === "hidden") releaseFocusedInputs(event);
}

onMounted(() => {
  window.addEventListener("blur", releaseFocusedInputs);
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onBeforeUnmount(() => {
  window.removeEventListener("blur", releaseFocusedInputs);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  releaseFocusedInputs(new Event("unmount"));
  productionWiring?.clear();
  keyElements.clear();
});
</script>

<style scoped>
.keyboard {
  --keyboard-variation-amplitude: 1;
  display: flex;
  min-width: 0;
  overflow: visible;
  flex-direction: column;
  isolation: isolate;
  container-type: inline-size;
}

.keyboard__row {
  --keyboard-variation-amplitude: var(--keyboard-user-variation-amplitude, 1);
  display: flex;
  box-sizing: border-box;
  min-width: 0;
  flex-shrink: 0;
  align-items: stretch;
  gap: var(--keyboard-gap, 2px);
  padding-inline: var(--keyboard-outer-inset, 0px);
}

.keyboard__key {
  min-width: 0 !important;
  flex: 1 1 0;
  overflow: visible;
}

.keyboard__key :deep(.key__face),
.keyboard__key :deep(.note) {
  width: 100%;
}

.keyboard__key :deep(.note) {
  height: var(--keyboard-note-height);
}

.keyboard__key--focus-preview {
  outline: 2px solid var(--ivory, currentColor);
  outline-offset: 2px;
}

.keyboard__key--pressed {
  z-index: 10001 !important;
}

@container (max-width: 390px) {
  .keyboard__row {
    --keyboard-variation-amplitude: calc(var(--keyboard-user-variation-amplitude, 1) * .45);
  }

  .keyboard__key :deep(.note) {
    --note-primary-size: 20px;
    --note-aux-size: 7px;
    --note-padding-inline: 4px;
    --note-primary-safe-inline: 4px;
  }
}

.keyboard--motion-reduced :deep(.key__face) {
  --key-face-hover-y: 0px;
  --key-face-press-y: 0px;
  --key-face-press-scale: 1;
  transition: none;
}

.keyboard--motion-reduced :deep(.note)::before {
  animation: none;
}

.keyboard--motion-reduced :deep(.note)::after {
  transition: none;
}

.keyboard--contrast-forced :deep(.key:focus-visible),
.keyboard--contrast-forced .keyboard__key--focus-preview {
  outline-color: CanvasText;
}

.keyboard--contrast-forced :deep(.note__surface) {
  border: 1px solid CanvasText;
  background: Canvas !important;
  box-shadow: none;
  color: CanvasText;
  forced-color-adjust: none;
}

.keyboard--contrast-forced :deep(.note__label) {
  color: CanvasText;
}

@media (prefers-reduced-motion: reduce) {
  .keyboard :deep(.key__face) {
    --key-face-hover-y: 0px;
    --key-face-press-y: 0px;
    --key-face-press-scale: 1;
    transition: none;
  }
}

@media (forced-colors: active) {
  .keyboard :deep(.note__surface) {
    border: 1px solid CanvasText;
    background: Canvas !important;
    box-shadow: none;
    forced-color-adjust: none;
  }
}
</style>
