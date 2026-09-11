<template>
  <div
    ref="keyboardRef"
    class="keyboard"
    :class="[
      `keyboard--motion-${resolvedMotion}`,
      `keyboard--contrast-${resolvedContrast}`,
      { 'keyboard--padded': resolvedKeyboardPadding },
    ]"
    :style="{ '--keyboard-gap': `${Math.max(resolvedGap, 0)}px` }"
    role="group"
    aria-label="Solfège keyboard"
    :aria-busy="isInteractionLocked || undefined"
    :aria-disabled="isInteractionLocked || undefined"
    :data-geometry-family="resolvedFamily"
    :data-edition-seed="resolvedEditionSeed"
    @focusout="handleFocusOut"
    @keyup="handleFocusActivationKeyUp"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
    @lostpointercapture="handlePointerCancel"
  >
    <div
      class="keyboard__chord-row"
      role="group"
      aria-label="Harmony chords"
      :data-chord-count="renderChords.length"
      :data-geometry-family="resolvedChordFamily"
      :style="{ '--keyboard-chord-count': Math.max(renderChords.length, 1) }"
    >
      <ChordKey
        v-for="(chord, chordIndex) in renderChords"
        :key="chord.harmony.id"
        :ref="(instance) => setChordKeyRef(chord.harmony.id, instance)"
        class="keyboard__chord-key"
        :members="chord.members"
        :symbol="chord.harmony.symbol"
        :accessible-name="chord.harmony.accessibleName"
        :geometry="resolvedChordFamily"
        :pressed="chord.pressed"
        :disabled="isInteractionLocked"
        :tabindex="chord.harmony.id === rememberedChordFocusId ? 0 : -1"
        :data-chord-id="chord.harmony.id"
        :data-alteration="chord.harmony.alteration"
        @focus="rememberChordFocus(chord.harmony.id)"
        @keydown="handleChordKeyDown($event, chordIndex)"
        @press="emitChordIntent('press', $event, chord.attackHarmony)"
        @release="emitChordIntent('release', $event, chord.attackHarmony)"
      />
    </div>

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
          'keyboard__key--pressed': isKeyPhysicallyPressed(key),
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
        :octave="key.colorOctave ?? row.octave"
        :mode="key.mode"
        :music-key="key.musicKey"
        :surface-style="resolvedSurfaceStyle"
        :accidental="key.accidental"
        :key-brightness="key.keyBrightness"
        :key-saturation="key.keySaturation"
        :sounding="key.sounding"
        :pressed="isKeyPhysicallyPressed(key)"
        managed-input
        :disabled="isInteractionLocked"
        :aria-label="keyAriaLabel(key, row.octave)"
        :aria-keyshortcuts="key.shortcut || undefined"
        :tabindex="key.id === rememberedFocusId ? 0 : -1"
        :data-key-id="key.id"
        :data-edition-variant="variationFor(key.id).variant"
        @focus="rememberFocus(key.id)"
        @keydown="handleKeyDown($event, rowIndex, keyIndex)"
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
  reactive,
  ref,
  watch,
  type ComponentPublicInstance,
} from "vue";
import { fitKeyboardRows, KEYBOARD_CHORD_ROW_HEIGHT } from "./keyboardSizing";
import Key from "@/components/compounds/Key.vue";
import type { KeyInputEvent } from "@/components/compounds/Key.vue";
import ChordKey from "@/components/compounds/ChordKey.vue";
import type { ChordMember } from "@/components/compounds/Chord.vue";
import type {
  NoteLabel,
  NoteProportion,
  NoteSurfaceStyle,
} from "@/components/primatives/Note.vue";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import { CHROMATIC_NOTES } from "@/data";
import { getChromaticNoteForScaleIndex } from "@/services/musicColor";
import { useKeyboardControls } from "@/composables/useKeyboardControls";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useInstrumentStore } from "@/stores/instrument";
import { useMusicStore } from "@/stores/music";
import { triggerNoteHaptic } from "@/utils/hapticFeedback";
import {
  buildHarmony,
  type HarmonyAlteration,
  type HarmonyChord,
} from "@/domain/harmony";
import { createVoiceGroupLifecycle } from "@/services/inputVoiceGroups";
import {
  KEYBOARD_PAGE_EDITION_SEED,
  keyboardEditionVariation,
  keyboardEditionRowVariations,
  keyboardChordFamily,
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
  colorOctave?: number;
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

export interface KeyboardChordIntent extends KeyInputEvent {
  chordId: string;
  chord: HarmonyChord;
  source: "pointer" | "focus";
}

interface KeyboardChordView {
  /** Live settings used by a new owner attacking this degree. */
  attackHarmony: HarmonyChord;
  /** Snapshot shown while any existing owner holds this degree. */
  harmony: HarmonyChord;
  members: ChordMember[];
  pressed: boolean;
  /** Held snapshot whose degree no longer exists in the live harmony. */
  orphaned: boolean;
}

interface ActiveChordSnapshot {
  harmony: HarmonyChord;
  mode: MusicalMode;
  key: ChromaticNote;
  notePitches: string[];
}

const props = withDefaults(
  defineProps<{
    usage?: "production" | "controlled";
    rows?: KeyboardRowView[];
    mainOctave?: number;
    primaryLabel?: NoteLabel;
    showLabels?: boolean;
    keyboardPadding?: boolean;
    surfaceStyle?: NoteSurfaceStyle;
    geometryFamily?: KeyboardGeometryFamily;
    editionSeed?: string;
    gap?: number;
    availableHeight?: number;
    mainRowHeight?: number;
    outerRowHeight?: number;
    outerInset?: number;
    variationAmplitude?: number;
    motion?: "system" | "reduced";
    contrast?: "system" | "forced";
    tonic?: ChromaticNote;
    scaleType?: MusicalMode;
    harmonyAlteration?: HarmonyAlteration;
  }>(),
  {
    usage: "production",
    rows: () => [],
    mainOctave: 4,
    primaryLabel: "syllable",
    showLabels: true,
    keyboardPadding: false,
    surfaceStyle: "colored",
    geometryFamily: undefined,
    editionSeed: undefined,
    gap: 2,
    mainRowHeight: 76,
    outerRowHeight: 56,
    outerInset: 0,
    variationAmplitude: 1,
    motion: "system",
    contrast: "system",
    tonic: "C",
    scaleType: "major",
    harmonyAlteration: "auto",
  },
);

const emit = defineEmits<{
  press: [intent: KeyboardIntent];
  release: [intent: KeyboardIntent];
  focusChange: [keyId: string];
  chordPress: [intent: KeyboardChordIntent];
  chordRelease: [intent: KeyboardChordIntent];
}>();

function chordMembers(
  chord: HarmonyChord,
  mode: MusicalMode,
  key: ChromaticNote,
  surfaceStyle: NoteSurfaceStyle,
  keyBrightness = 1,
  keySaturation = 1,
): ChordMember[] {
  return chord.voicing.pitches.map((pitch, voicingOrder) => ({
    id: `${chord.id}:${pitch.name}:${voicingOrder}`,
    rawPitch: pitch.name,
    primary: "raw",
    visibleLabels: ["raw"],
    scaleIndex: pitch.scaleIndex ?? chord.degreeIndex,
    pitchClassIndex: pitch.pitchClassIndex,
    octave: pitch.octave,
    mode,
    musicKey: key,
    surfaceStyle,
    accidental: pitch.pitchClass.includes("#"),
    keyBrightness,
    keySaturation,
    voicingOrder,
    // Playable keys retain musical identity at rest; CodeStrip owns temporal progress.
    progress: 1,
  }));
}

function createProductionWiring() {
  const store = useKeyboardDrawerStore();
  const instrumentStore = useInstrumentStore();
  const musicStore = useMusicStore();
  const config = computed(() => store.keyboardConfig);
  const currentMusicKey = computed(() => musicStore.currentKey as ChromaticNote);
  const currentMode = computed(() => musicStore.currentMode);
  const surfaceStyle = computed<NoteSurfaceStyle>(() =>
    config.value.surfaceStyle === "monochrome" ? "monochrome" : "colored",
  );
  const gap = computed(() => ({
    none: 0,
    small: 2,
    medium: 4,
  })[config.value.keyGaps] ?? 2);
  const voiceGroups = createVoiceGroupLifecycle((noteId) => musicStore.releaseNote(noteId));
  const activeChordSnapshots = reactive(new Map<string, ActiveChordSnapshot>());

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
  const scientificOctave = (rawPitch: string, fallback: number) => {
    const match = rawPitch.match(/(-?\d+)$/);
    return match ? Number(match[1]) : fallback;
  };
  const soundingNoteKeys = computed(() => new Set(
    musicStore
      .getActiveNotes()
      .map((note) => `${note.solfegeIndex}_${note.keyboardOctave ?? note.octave}`),
  ));
  const chordPressedPitches = computed(() => new Set(
    Array.from(activeChordSnapshots.values()).flatMap((snapshot) => snapshot.notePitches),
  ));
  const rows = computed<KeyboardRowView[]>(() =>
    store.visibleOctaves.map((octave) => ({
      octave,
      keys: store.solfegeData.map((solfege, scaleIndex) => {
        const id = noteKey(scaleIndex, octave);
        const rawPitch = noteName(scaleIndex, octave);
        return {
          id,
          syllable: solfege.name,
          degree: degreeLabel(solfege.number),
          rawPitch,
          scaleIndex,
          pitchClassIndex: pitchClassIndex(scaleIndex),
          colorOctave: scientificOctave(rawPitch, octave),
          mode: musicStore.currentMode,
          musicKey: currentMusicKey.value,
          accidental: isAccidental(scaleIndex, octave),
          keyBrightness: config.value.keyBrightness,
          keySaturation: config.value.keySaturation,
          sounding: store.isVisualNoteActive(id) || soundingNoteKeys.value.has(id),
          pressed: store.isKeyPressed(id) || chordPressedPitches.value.has(rawPitch),
        };
      }),
    })),
  );

  const chords = computed<KeyboardChordView[]>(() => {
    const liveHarmony = buildHarmony({
      tonic: currentMusicKey.value,
      scaleType: musicStore.currentMode,
      octave: config.value.mainOctave,
      alteration: props.harmonyAlteration,
    });
    const snapshots = Array.from(activeChordSnapshots.values());
    const rendered = liveHarmony.map((harmony) => {
      const snapshot = snapshots.find(
        (candidate) => candidate.harmony.id === harmony.id,
      );
      const displayedHarmony = snapshot?.harmony ?? harmony;
      return {
        attackHarmony: harmony,
        harmony: displayedHarmony,
        members: chordMembers(
          displayedHarmony,
          snapshot?.mode ?? musicStore.currentMode,
          snapshot?.key ?? currentMusicKey.value,
          surfaceStyle.value,
          config.value.keyBrightness,
          config.value.keySaturation,
        ),
        pressed: Boolean(snapshot) || store.isKeyPressed(`chord:${harmony.id}`),
        orphaned: false,
      };
    });
    const liveIds = new Set(liveHarmony.map((harmony) => harmony.id));
    const orphanSnapshots = snapshots.filter(
      (snapshot, index) => !liveIds.has(snapshot.harmony.id)
        && snapshots.findIndex(
          (candidate) => candidate.harmony.id === snapshot.harmony.id,
        ) === index,
    );

    return rendered.concat(orphanSnapshots.map((snapshot) => ({
      attackHarmony: snapshot.harmony,
      harmony: snapshot.harmony,
      members: chordMembers(
        snapshot.harmony,
        snapshot.mode,
        snapshot.key,
        surfaceStyle.value,
        config.value.keyBrightness,
        config.value.keySaturation,
      ),
      pressed: true,
      orphaned: true,
    })));
  });

  const inputPressId = (intent: KeyboardIntent) =>
    `melody:${intent.inputId}:${intent.keyId}`;
  const melodyVoiceOwnerId = (keyId: string) => `melody-key:${keyId}`;
  const heldInputsByKey = new Map<string, Set<string>>();
  const chordPressId = (intent: KeyboardChordIntent) =>
    `chord:${intent.inputId}:${intent.chordId}`;

  function press(intent: KeyboardIntent) {
    if (instrumentStore.isInteractionLocked) return;

    const pressId = inputPressId(intent);
    const heldInputs = heldInputsByKey.get(intent.keyId) ?? new Set<string>();
    if (heldInputs.has(pressId)) return;

    const shouldAttack = heldInputs.size === 0;
    heldInputs.add(pressId);
    heldInputsByKey.set(intent.keyId, heldInputs);
    store.addTouch(pressId, intent.keyId);
    if (intent.source === "pointer" && config.value.hapticFeedback) {
      triggerNoteHaptic();
    }
    if (!shouldAttack) return;

    void voiceGroups.attack(melodyVoiceOwnerId(intent.keyId), [
      (isCancelled) => musicStore.attackNoteWithOctave(
        intent.scaleIndex,
        intent.octave,
        isCancelled,
      ),
    ]);
  }

  function release(intent: KeyboardIntent) {
    const pressId = inputPressId(intent);
    store.removeTouch(pressId);
    const heldInputs = heldInputsByKey.get(intent.keyId);
    if (!heldInputs?.delete(pressId) || heldInputs.size > 0) return;

    heldInputsByKey.delete(intent.keyId);
    voiceGroups.release(melodyVoiceOwnerId(intent.keyId));
  }

  function pressChord(intent: KeyboardChordIntent) {
    if (instrumentStore.isInteractionLocked) return;

    const ownerId = chordPressId(intent);
    activeChordSnapshots.set(ownerId, {
      harmony: intent.chord,
      mode: musicStore.currentMode,
      key: currentMusicKey.value,
      notePitches: intent.chord.voicing.pitches.map((pitch) => pitch.name),
    });
    store.addTouch(ownerId, `chord:${intent.chordId}`);
    if (intent.source === "pointer" && config.value.hapticFeedback) {
      triggerNoteHaptic();
    }
    // The chord object is the setting snapshot captured at attack time.
    void voiceGroups.attack(
      ownerId,
      intent.chord.voicing.pitches.map((pitch) =>
        (isCancelled) => musicStore.attackExactPitch(pitch.name, isCancelled),
      ),
    );
  }

  function releaseChord(intent: KeyboardChordIntent) {
    const ownerId = chordPressId(intent);
    activeChordSnapshots.delete(ownerId);
    store.removeTouch(ownerId);
    voiceGroups.release(ownerId);
  }

  function clear() {
    heldInputsByKey.clear();
    activeChordSnapshots.clear();
    voiceGroups.releaseAll();
    store.clearAllTouches();
  }

  return {
    config,
    currentMusicKey,
    currentMode,
    rows,
    chords,
    surfaceStyle,
    gap,
    isInteractionLocked: computed(() => instrumentStore.isInteractionLocked),
    press,
    release,
    pressChord,
    releaseChord,
    clear,
  };
}

const isProductionUsage = props.usage === "production";
const productionWiring = isProductionUsage ? createProductionWiring() : null;
const renderRows = computed(() => productionWiring?.rows.value ?? props.rows);
const resolvedTonic = computed(() =>
  productionWiring?.currentMusicKey.value ?? props.tonic,
);
const resolvedScaleType = computed(() =>
  productionWiring?.currentMode.value ?? props.scaleType,
);
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
const resolvedKeyboardPadding = computed(
  () => productionWiring?.config.value.keyboardPadding ?? props.keyboardPadding,
);
const isInteractionLocked = computed(
  () => productionWiring?.isInteractionLocked.value ?? false
);
// Host allocation changes only row geometry, never row count or note/input ownership.
const fittedRows = computed(() => props.availableHeight === undefined ? null
  : fitKeyboardRows(
    Math.max(
      0,
      props.availableHeight
        - KEYBOARD_CHORD_ROW_HEIGHT
        - (resolvedKeyboardPadding.value ? 8 : 0),
    ),
    renderRows.value.length,
  ));
const resolvedMainRowHeight = computed(() => fittedRows.value?.main ?? props.mainRowHeight);
const resolvedOuterRowHeight = computed(() => fittedRows.value?.outer ?? props.outerRowHeight);
const resolvedOuterInset = computed(() => isProductionUsage ? 0 : props.outerInset);
const resolvedVariationAmplitude = computed(
  () => isProductionUsage ? 1 : props.variationAmplitude,
);
const resolvedMotion = computed(() => isProductionUsage ? "system" : props.motion);
const resolvedContrast = computed(() => isProductionUsage ? "system" : props.contrast);
const renderChords = computed<KeyboardChordView[]>(() =>
  productionWiring?.chords.value ?? buildHarmony({
    tonic: resolvedTonic.value,
    scaleType: resolvedScaleType.value,
    octave: resolvedMainOctave.value,
    alteration: props.harmonyAlteration,
  }).map((harmony) => ({
    attackHarmony: harmony,
    harmony,
    members: chordMembers(
      harmony,
      resolvedScaleType.value,
      resolvedTonic.value,
      resolvedSurfaceStyle.value,
    ),
    pressed: false,
    orphaned: false,
  })),
);

const mountFamily = keyboardFamilyForDate(new Date());
const resolvedFamily = computed(() => props.geometryFamily ?? mountFamily);
const resolvedChordFamily = computed(() => keyboardChordFamily(resolvedFamily.value));
const resolvedEditionSeed = computed(
  () => props.editionSeed ?? KEYBOARD_PAGE_EDITION_SEED,
);
const keyboardRef = ref<HTMLElement | null>(null);
const keyElements = new Map<string, HTMLButtonElement>();
const chordKeyElements = new Map<string, HTMLButtonElement>();
const rememberedFocusId = ref("");
const rememberedChordFocusId = ref("");
const activeFocusInputs = new Map<string, KeyboardIntent>();
const activeChordPointerInputs = new Map<string, KeyboardChordIntent>();
const activeChordFocusInputs = new Map<string, KeyboardChordIntent>();
const chordPointerSnapshotId = (inputId: string, chordId: string) =>
  `${inputId}:${chordId}`;
const activePointerInputs = reactive(new Map<number, KeyboardIntent | null>());
const pointerPositions = new Map<number, { x: number; y: number }>();

const allKeys = computed(() => renderRows.value.flatMap((row) => row.keys));
const defaultFocusId = computed(
  () =>
    renderRows.value.find((row) => row.octave === resolvedMainOctave.value)?.keys[0]?.id
    ?? renderRows.value[0]?.keys[0]?.id
    ?? "",
);
const defaultChordFocusId = computed(() => renderChords.value[0]?.harmony.id ?? "");
const rowSignature = computed(() =>
  renderRows.value
    .map((row) => `${row.octave}:${row.keys.map((key) => key.id).join(",")}`)
    .join("|"),
);
const chordSignature = computed(() =>
  renderChords.value.map((chord) => chord.harmony.id).join(","),
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
    releaseMissingMelodyInputs(new Event("keyboard-remap"));
    if (!allKeys.value.some((key) => key.id === rememberedFocusId.value)) {
      rememberedFocusId.value = defaultFocusId.value;
    }
  },
  { immediate: true },
);

watch(
  chordSignature,
  () => {
    releaseMissingChordFocusInputs(new Event("chord-remap"));
    if (!renderChords.value.some((chord) =>
      chord.harmony.id === rememberedChordFocusId.value,
    )) {
      rememberedChordFocusId.value = defaultChordFocusId.value;
    }
  },
  { immediate: true },
);

watch(isInteractionLocked, (locked) => {
  if (!locked) return;
  releaseFocusedInputs(new Event("instrument-warmup"));
  releasePointerInputs(new Event("instrument-warmup"));
  productionWiring?.clear();
});

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

function setChordKeyRef(
  chordId: string,
  instance: Element | ComponentPublicInstance | null,
) {
  if (!instance) {
    chordKeyElements.delete(chordId);
    return;
  }
  const element = instance instanceof Element
    ? instance
    : (instance.$el as HTMLButtonElement | undefined);
  if (element instanceof HTMLButtonElement) chordKeyElements.set(chordId, element);
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
    zIndex: isKeyPhysicallyPressed(key) ? 10_001 : variation.layer,
  };
}

function isKeyPhysicallyPressed(key: KeyboardKeyView) {
  return Boolean(key.pressed) || Array.from(activePointerInputs.values()).some(
    (intent) => intent?.keyId === key.id,
  );
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

function rememberChordFocus(chordId: string) {
  rememberedChordFocusId.value = chordId;
  emit("focusChange", `chord:${chordId}`);
}

function focusChord(chordIndex: number) {
  const chord = renderChords.value[chordIndex];
  if (!chord) return;
  rememberChordFocus(chord.harmony.id);
  void nextTick(() => chordKeyElements.get(chord.harmony.id)?.focus());
}

function focusSurvivingChordBeforeRelease(chordId: string) {
  const releasedIndex = renderChords.value.findIndex(
    (chord) => chord.harmony.id === chordId,
  );
  const releasedChord = renderChords.value[releasedIndex];
  const releasedElement = chordKeyElements.get(chordId);
  if (
    !releasedChord?.orphaned
    || !releasedElement
    || document.activeElement !== releasedElement
  ) {
    return;
  }

  const survivingChords = renderChords.value.filter((chord) => !chord.orphaned);
  const replacement = survivingChords[
    Math.min(Math.max(releasedIndex, 0), survivingChords.length - 1)
  ];
  if (!replacement) return;

  rememberChordFocus(replacement.harmony.id);
  chordKeyElements.get(replacement.harmony.id)?.focus();
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
    if (isInteractionLocked.value) return;

    if (productionWiring) void productionWiring.press(intent);
    emit("press", intent);
    return;
  }
  productionWiring?.release(intent);
  emit("release", intent);
}

function emitChordIntent(
  kind: "press" | "release",
  payload: KeyInputEvent,
  chord: HarmonyChord,
) {
  if (kind === "press" && isInteractionLocked.value) return;

  const currentIntent: KeyboardChordIntent = {
    ...payload,
    chordId: chord.id,
    chord,
    source: payload.inputId.startsWith("focus:") ? "focus" : "pointer",
  };
  if (kind === "press") {
    activeChordPointerInputs.set(
      chordPointerSnapshotId(payload.inputId, chord.id),
      currentIntent,
    );
    dispatchChordIntent(kind, currentIntent);
    return;
  }

  const snapshotId = chordPointerSnapshotId(payload.inputId, chord.id);
  const pressedIntent = activeChordPointerInputs.get(snapshotId);
  activeChordPointerInputs.delete(snapshotId);
  dispatchChordIntent(kind, pressedIntent
    ? { ...pressedIntent, event: payload.event }
    : currentIntent);
}

function dispatchChordIntent(
  kind: "press" | "release",
  intent: KeyboardChordIntent,
) {
  if (kind === "press") {
    if (isInteractionLocked.value) return;

    productionWiring?.pressChord(intent);
    emit("chordPress", intent);
    return;
  }
  productionWiring?.releaseChord(intent);
  emit("chordRelease", intent);
}

function handleChordKeyDown(event: KeyboardEvent, chordIndex: number) {
  if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    if (event.key === "ArrowLeft") focusChord(Math.max(0, chordIndex - 1));
    else if (event.key === "ArrowRight") {
      focusChord(Math.min(renderChords.value.length - 1, chordIndex + 1));
    } else if (event.key === "Home") focusChord(0);
    else focusChord(renderChords.value.length - 1);
    return;
  }
  if (![" ", "Enter"].includes(event.key) || event.repeat) return;
  const chord = renderChords.value[chordIndex]?.attackHarmony;
  if (!chord) return;
  const inputId = `focus:${event.code}:chord`;
  if (activeChordFocusInputs.has(inputId)) return;
  event.preventDefault();
  const intent: KeyboardChordIntent = {
    inputId,
    event,
    chordId: chord.id,
    chord,
    source: "focus",
  };
  activeChordFocusInputs.set(inputId, intent);
  dispatchChordIntent("press", intent);
}

function pointerInputId(event: PointerEvent) {
  return event.pointerType === "mouse"
    ? `mouse:${event.pointerId}`
    : `${event.pointerType || "pointer"}:${event.pointerId}`;
}

function keyIntentForId(
  keyId: string | undefined,
  event: PointerEvent,
): KeyboardIntent | null {
  if (!keyId) return null;
  const row = renderRows.value.find((candidate) =>
    candidate.keys.some((key) => key.id === keyId),
  );
  const key = row?.keys.find((candidate) => candidate.id === keyId);
  if (!row || !key) return null;

  return {
    inputId: pointerInputId(event),
    event,
    keyId: key.id,
    scaleIndex: key.scaleIndex,
    octave: row.octave,
    source: "pointer",
  };
}

function keyIntentAtPoint(event: PointerEvent): KeyboardIntent | null {
  const root = keyboardRef.value;
  if (!root) return null;

  const hit = typeof document.elementFromPoint === "function"
    ? document.elementFromPoint(event.clientX, event.clientY)
    : event.target;
  const element = hit instanceof Element
    ? hit.closest<HTMLElement>("[data-key-id]")
    : null;
  if (!element || !root.contains(element)) return null;

  return keyIntentForId(element.dataset.keyId, event);
}

function segmentEntryTime(
  start: { x: number; y: number },
  end: { x: number; y: number },
  rect: DOMRect,
) {
  if (rect.width <= 0 || rect.height <= 0) return null;

  let entry = 0;
  let exit = 1;
  const clipAxis = (origin: number, delta: number, min: number, max: number) => {
    if (delta === 0) return origin >= min && origin <= max;
    const first = (min - origin) / delta;
    const second = (max - origin) / delta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
    return entry <= exit;
  };

  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  if (!clipAxis(start.x, deltaX, rect.left, rect.right)) return null;
  if (!clipAxis(start.y, deltaY, rect.top, rect.bottom)) return null;

  if (entry >= exit) return null;
  const midpoint = entry + ((exit - entry) / 2);
  const midpointX = start.x + (deltaX * midpoint);
  const midpointY = start.y + (deltaY * midpoint);
  const crossesInterior = midpointX > rect.left
    && midpointX < rect.right
    && midpointY > rect.top
    && midpointY < rect.bottom;
  return crossesInterior && entry >= 0 && entry <= 1 ? entry : null;
}

function movePointerAlongSegment(
  pointerId: number,
  start: { x: number; y: number },
  event: PointerEvent,
) {
  const end = { x: event.clientX, y: event.clientY };
  if (start.x === end.x && start.y === end.y) {
    movePointerInput(pointerId, keyIntentAtPoint(event), event);
    pointerPositions.set(pointerId, end);
    return;
  }

  const currentKeyId = activePointerInputs.get(pointerId)?.keyId;
  const crossings = Array.from(keyElements.entries())
    .map(([keyId, element]) => ({
      keyId,
      entry: segmentEntryTime(start, end, element.getBoundingClientRect()),
    }))
    .filter((crossing): crossing is { keyId: string; entry: number } =>
      crossing.entry !== null
      && !(crossing.entry === 0 && crossing.keyId === currentKeyId)
    )
    .sort((a, b) => a.entry - b.entry);

  for (const crossing of crossings) {
    movePointerInput(
      pointerId,
      keyIntentForId(crossing.keyId, event),
      event,
    );
  }
  movePointerInput(pointerId, keyIntentAtPoint(event), event);
  pointerPositions.set(pointerId, end);
}

function pointerSamples(event: PointerEvent) {
  const coalesced = typeof event.getCoalescedEvents === "function"
    ? event.getCoalescedEvents()
    : [];
  const samples = coalesced.filter((sample) => sample.pointerId === event.pointerId);
  const last = samples[samples.length - 1];
  if (!last || last.clientX !== event.clientX || last.clientY !== event.clientY) {
    samples.push(event);
  }
  return samples;
}

function movePointerThroughSamples(event: PointerEvent) {
  for (const sample of pointerSamples(event)) {
    const start = pointerPositions.get(event.pointerId)
      ?? { x: sample.clientX, y: sample.clientY };
    movePointerAlongSegment(event.pointerId, start, sample);
  }
}

function pointerMovedSinceLastSample(event: PointerEvent) {
  const previous = pointerPositions.get(event.pointerId);
  if (!previous) return true;
  return pointerSamples(event).some((sample) =>
    sample.clientX !== previous.x || sample.clientY !== previous.y,
  );
}

function movePointerInput(pointerId: number, next: KeyboardIntent | null, event: Event) {
  const current = activePointerInputs.get(pointerId);
  if (current?.keyId === next?.keyId) return;

  if (current) dispatchIntent("release", { ...current, event });
  activePointerInputs.set(pointerId, next);
  if (next) dispatchIntent("press", next);
}

function handlePointerDown(event: PointerEvent) {
  if (isInteractionLocked.value) return;
  if (event.isPrimary === false && event.pointerType === "mouse") return;
  if (["mouse", "pen"].includes(event.pointerType) && event.button !== 0) return;
  if (activePointerInputs.has(event.pointerId)) return;

  const intent = keyIntentAtPoint(event);
  if (!intent) return;

  if (event.pointerType !== "mouse") event.preventDefault();
  keyboardRef.value?.setPointerCapture?.(event.pointerId);
  activePointerInputs.set(event.pointerId, intent);
  pointerPositions.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
  });
  dispatchIntent("press", intent);
}

function handlePointerMove(event: PointerEvent) {
  if (!activePointerInputs.has(event.pointerId)) return;
  event.preventDefault();
  movePointerThroughSamples(event);
}

function finishPointerInput(event: PointerEvent) {
  if (!activePointerInputs.has(event.pointerId)) return;
  event.preventDefault();
  movePointerInput(event.pointerId, null, event);
  activePointerInputs.delete(event.pointerId);
  pointerPositions.delete(event.pointerId);
}

function handlePointerUp(event: PointerEvent) {
  if (!activePointerInputs.has(event.pointerId)) return;
  event.preventDefault();
  // A row resize can move a different key beneath a stationary finger. Only
  // pointer movement, never layout movement, may create a final glissando step.
  if (pointerMovedSinceLastSample(event)) movePointerThroughSamples(event);
  finishPointerInput(event);
}

function handlePointerCancel(event: PointerEvent) {
  finishPointerInput(event);
}

function releasePointerInputs(event: Event) {
  for (const intent of activePointerInputs.values()) {
    if (intent) dispatchIntent("release", { ...intent, event });
  }
  activePointerInputs.clear();
  pointerPositions.clear();
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

function handleFocusActivationKeyUp(event: KeyboardEvent) {
  if (![" ", "Enter"].includes(event.key)) return;
  const melodyInputId = `focus:${event.code}`;
  const chordInputId = `focus:${event.code}:chord`;
  const melodyIntent = activeFocusInputs.get(melodyInputId);
  const chordIntent = activeChordFocusInputs.get(chordInputId);
  if (!melodyIntent && !chordIntent) return;
  event.preventDefault();
  if (melodyIntent) {
    activeFocusInputs.delete(melodyInputId);
    dispatchIntent("release", { ...melodyIntent, event });
  }
  if (chordIntent) {
    focusSurvivingChordBeforeRelease(chordIntent.chordId);
    activeChordFocusInputs.delete(chordInputId);
    dispatchChordIntent("release", { ...chordIntent, event });
  }
}

function releaseMelodyFocusInputs(event: Event) {
  for (const intent of activeFocusInputs.values()) {
    dispatchIntent("release", { ...intent, event });
  }
  activeFocusInputs.clear();
}

function releaseMissingMelodyInputs(event: Event) {
  const renderedIds = new Set(allKeys.value.map((key) => key.id));
  for (const [inputId, intent] of activeFocusInputs) {
    if (renderedIds.has(intent.keyId)) continue;
    activeFocusInputs.delete(inputId);
    dispatchIntent("release", { ...intent, event });
  }
  for (const [pointerId, intent] of activePointerInputs) {
    if (!intent || renderedIds.has(intent.keyId)) continue;
    dispatchIntent("release", { ...intent, event });
    activePointerInputs.set(pointerId, null);
  }
}

function releaseMissingChordFocusInputs(event: Event) {
  const renderedIds = new Set(
    renderChords.value.map((chord) => chord.harmony.id),
  );
  for (const [inputId, intent] of activeChordFocusInputs) {
    if (renderedIds.has(intent.chordId)) continue;
    activeChordFocusInputs.delete(inputId);
    dispatchChordIntent("release", { ...intent, event });
  }
}

function releaseChordFocusInputs(event: Event) {
  for (const intent of activeChordFocusInputs.values()) {
    dispatchChordIntent("release", { ...intent, event });
  }
  activeChordFocusInputs.clear();
}

function releaseFocusedInputs(event: Event) {
  releaseMelodyFocusInputs(event);
  releaseChordFocusInputs(event);
}

function handleFocusOut(event: FocusEvent) {
  const nextTarget = event.relatedTarget;
  if (
    nextTarget instanceof Node
    && keyboardRef.value?.contains(nextTarget)
  ) {
    return;
  }
  releaseFocusedInputs(event);
}

function handleVisibilityChange(event: Event) {
  if (document.visibilityState === "hidden") {
    releaseFocusedInputs(event);
    releasePointerInputs(event);
  }
}

function handleWindowBlur(event: Event) {
  releaseFocusedInputs(event);
  releasePointerInputs(event);
}

onMounted(() => {
  window.addEventListener("blur", handleWindowBlur);
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onBeforeUnmount(() => {
  window.removeEventListener("blur", handleWindowBlur);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  releaseFocusedInputs(new Event("unmount"));
  releasePointerInputs(new Event("unmount"));
  productionWiring?.clear();
  keyElements.clear();
  chordKeyElements.clear();
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
  container-name: keyboard;
  user-select: none;
  -webkit-user-select: none;
}

.keyboard__chord-row {
  display: grid;
  min-width: 0;
  min-height: 44px;
  grid-template-columns: repeat(var(--keyboard-chord-count, 1), minmax(0, 1fr));
  align-items: stretch;
  gap: var(--keyboard-gap, 2px);
  padding-block: 1px 2px;
  overflow: visible;
  touch-action: none;
}

.keyboard__chord-row > .keyboard__chord-key {
  min-width: 0;
  overflow: visible;
  touch-action: none;
}

.keyboard--padded { padding: 4px; }

.keyboard__row {
  --keyboard-variation-amplitude: var(--keyboard-user-variation-amplitude, 1);
  display: flex;
  box-sizing: border-box;
  min-width: 0;
  flex-shrink: 0;
  align-items: stretch;
  gap: var(--keyboard-gap, 2px);
  padding-inline: var(--keyboard-outer-inset, 0px);
  touch-action: none;
}

.keyboard__key {
  min-width: 0 !important;
  flex: 1 1 0;
  overflow: visible;
  container-type: inline-size;
  container-name: keyboard-key;
}

.keyboard__key :deep(.key__face),
.keyboard__key :deep(.note) {
  width: 100%;
}

.keyboard__key :deep(.note) {
  height: var(--keyboard-note-height);
}

.keyboard__row--main .keyboard__key :deep(.note) {
  --note-primary-size: clamp(16px, 62cqi, 24px);
}

.keyboard__row:not(.keyboard__row--main) .keyboard__key :deep(.note) {
  --note-primary-size: clamp(15px, 47cqi, 18px);
}

.keyboard__key--focus-preview {
  outline: 2px solid var(--ivory, currentColor);
  outline-offset: 2px;
}

.keyboard__key--pressed {
  z-index: 10001 !important;
}

@container keyboard (max-width: 390px) {
  .keyboard__row {
    --keyboard-variation-amplitude: calc(var(--keyboard-user-variation-amplitude, 1) * .45);
  }

  .keyboard__key :deep(.note) {
    --note-aux-size: 7px;
    --note-padding-inline: 4px;
    --note-primary-safe-inline: 4px;
  }
}

.keyboard--motion-reduced :deep(.key__face),
.keyboard--motion-reduced :deep(.chord-key__face) {
  --key-face-hover-y: 0px;
  --key-face-press-y: 0px;
  --key-face-press-scale: 1;
  transition: none;
}

.keyboard--motion-reduced :deep(.chord__fused-progress) {
  transition: none;
  will-change: auto;
}

.keyboard--motion-reduced :deep(.note)::before {
  animation: none;
}

.keyboard--motion-reduced :deep(.note)::after {
  transition: none;
}

.keyboard--contrast-forced :deep(.key:focus-visible),
.keyboard--contrast-forced :deep(.chord-key:focus-visible),
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

.keyboard--contrast-forced :deep(.chord__fused) {
  border: 1px solid CanvasText;
  background: Canvas !important;
  box-shadow: none;
  forced-color-adjust: none;
}

.keyboard--contrast-forced :deep(.chord__fused::after) {
  display: none;
}

.keyboard--contrast-forced :deep(.chord__fused-member) {
  background: Canvas;
}

.keyboard--contrast-forced :deep(.chord__fused-progress) {
  background: Highlight !important;
}

.keyboard--contrast-forced :deep(.chord__symbol) {
  color: CanvasText;
  text-shadow: none;
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
