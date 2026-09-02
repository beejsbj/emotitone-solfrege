<script lang="ts">
export type {
  CodeStripChordToken,
  CodeStripDensity,
  CodeStripDurationMode,
  CodeStripGlyph,
  CodeStripNote,
  CodeStripNoteToken,
  CodeStripToken,
} from "./types";
</script>

<script setup lang="ts">
import { EditorState, StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { StrudelMirror } from "@strudel/codemirror";
import * as StrudelCore from "@strudel/core";
import * as StrudelMini from "@strudel/mini";
import * as StrudelTonal from "@strudel/tonal";
import * as StrudelWebAudio from "@strudel/webaudio";
import { transpiler } from "@strudel/transpiler";
import {
  computed,
  getCurrentInstance,
  markRaw,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import { toStrudelSound } from "@/composables/useStrudel";
import { useCodeStripStrudel } from "@/composables/useCodeStripStrudel";
import {
  emotitoneStrudelOutput,
  getAudioContext,
  initSuperdoughAudio,
  stopStrudelVisuals,
} from "@/services/superdoughAudio";
import { logNotesToStrudel } from "@/services/StrudelNotation";
import { usePatternsStore } from "@/stores/patterns";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type { LogNote } from "@/types/patterns";
import { buildRecordedCodeStripTokens } from "./recordingTokens";
import {
  applySpecimenPlayback,
  codeStripStrudelExtension,
  parseCodeStripEvents,
  serializeCodeStripTokens,
  setCodeStripPlaying,
  updateCodeStripPresentation,
} from "./strudelExtension";
import type {
  CodeStripDensity,
  CodeStripDurationMode,
  CodeStripToken,
} from "./types";

interface StrudelMirrorInstance {
  setCode: (code: string) => void;
  evaluate: () => Promise<void>;
  stop: () => Promise<void> | void;
  clear?: () => void;
  updateSettings?: (settings: Record<string, unknown>) => void;
  code?: string;
  editor?: unknown;
  view?: unknown;
}

const props = withDefaults(
  defineProps<{
    tokens?: CodeStripToken[];
    source?: string;
    density?: CodeStripDensity;
    durationMode?: CodeStripDurationMode;
    timeSignature?: string;
    wrapped?: boolean;
    scrollable?: boolean;
    showChevron?: boolean;
    ariaLabel?: string;
  }>(),
  {
    tokens: undefined,
    source: undefined,
    density: "default",
    durationMode: "stacked",
    timeSignature: "4/4",
    wrapped: false,
    scrollable: true,
    showChevron: true,
    ariaLabel: "Editable Strudel pattern",
  },
);

const EMPTY_EDITOR_CODE = "// Play or record a pattern to see it in CodeStrip.";
const isControlled = computed(() => props.tokens !== undefined || props.source !== undefined);
const patternsStore = usePatternsStore();
const visualConfigStore = useVisualConfigStore();
const appContext = getCurrentInstance()?.appContext;
const {
  attachEditor,
  detachEditor,
  syncCode,
  setPlaying,
  setError,
  isPlaying,
} = useCodeStripStrudel();

const editorRoot = ref<HTMLElement | null>(null);
const initError = ref<string | null>(null);
const isBooting = ref(true);
// Stateful third-party editor classes must retain their own object identity.
// StrudelMirror also keeps a separate runtime code cache, reconciled from the
// visible EditorView document immediately before evaluation below.
const mirror = shallowRef<StrudelMirrorInstance | null>(null);
let controlledView: EditorView | null = null;
let attachedController: Parameters<typeof detachEditor>[0] | undefined;
let followLoopFrame: number | null = null;
let followTargetScrollLeft = 0;
let followScroller: HTMLElement | null = null;
let followLastFrameTime: number | null = null;
let followPlaybackActive = false;

const FOLLOW_TIME_CONSTANT_MS = 150;
const RECORDING_FOLLOW_ANCHOR = 0.75;

const codeStripConfig = computed(() => visualConfigStore.config.codeStrip);
const keyboardConfig = computed(() => visualConfigStore.config.keyboard);
const barMs = computed(() => (60000 / patternsStore.currentSketchMeta.bpm) * 4);
const recordedTokens = computed(() => buildRecordedCodeStripTokens({
  notes: patternsStore.isStripCleared ? [] : patternsStore.currentSketchNotes,
  mode: patternsStore.currentSketchMeta.mode,
  musicKey: patternsStore.currentSketchMeta.key,
  notation: codeStripConfig.value.notation,
  barMs: barMs.value,
  sourceBpm: patternsStore.currentSketchMeta.bpm,
  surfaceStyle: keyboardConfig.value.surfaceStyle,
  keyBrightness: keyboardConfig.value.keyBrightness,
  keySaturation: keyboardConfig.value.keySaturation,
}));
const presentationTokens = computed(() => props.tokens ?? recordedTokens.value);

const generatedCode = computed(() => {
  if (isControlled.value) {
    if (props.source) return props.source;
    return serializeCodeStripTokens(props.tokens ?? []);
  }

  if (patternsStore.isStripCleared || !patternsStore.currentSketchNotes.length) {
    return EMPTY_EDITOR_CODE;
  }

  return logNotesToStrudel(patternsStore.currentSketchNotes as LogNote[], {
    bpm: codeStripConfig.value.bpm,
    sourceBpm: patternsStore.currentSketchMeta.bpm,
    notationType: codeStripConfig.value.notation === "note" ? "absolute" : "relative",
    scaleKey: patternsStore.currentSketchMeta.key,
    scaleMode: patternsStore.currentSketchMeta.mode,
    scaleOctave: keyboardConfig.value.mainOctave,
    sound: toStrudelSound(patternsStore.currentSketchMeta.instrument ?? "sine"),
  }).replace(/\s+/g, " ").trim();
});

const hostClasses = computed(() => [
  "code-strip",
  `code-strip--${props.density}`,
  { "code-strip--wrapped": props.wrapped },
  { "code-strip--scrollable": props.scrollable },
  { "code-strip--playing": isPlaying.value },
]);

function getMirrorView(instance: StrudelMirrorInstance | null) {
  return (instance?.editor ?? instance?.view) as EditorView | undefined;
}

function activeView() {
  return controlledView ?? getMirrorView(mirror.value);
}

function getMirrorCode(instance: StrudelMirrorInstance | null) {
  return getMirrorView(instance)?.state.doc.toString() ?? instance?.code ?? "";
}

function replaceControlledCode(code: string) {
  if (!controlledView || controlledView.state.doc.toString() === code) return;
  controlledView.dispatch({
    changes: { from: 0, to: controlledView.state.doc.length, insert: code },
  });
}

function syncMirrorCode(code: string) {
  const instance = mirror.value;
  if (!instance) return;
  if (getMirrorCode(instance) !== code) instance.setCode(code);
  syncCode(code);
}

function reconcileMirrorRuntimeCode(instance: StrudelMirrorInstance) {
  const visibleCode = getMirrorCode(instance);
  if (instance.code !== visibleCode) instance.code = visibleCode;
  syncCode(visibleCode);
}

async function evaluateMirror(instance: StrudelMirrorInstance) {
  reconcileMirrorRuntimeCode(instance);
  const editor = getMirrorView(instance);
  if (editor) setCodeStripPlaying(editor, true);
  try {
    await instance.evaluate();
  } catch (error) {
    if (editor) setCodeStripPlaying(editor, false);
    throw error;
  }
}

function revealLatestRecordedEvent() {
  const view = getMirrorView(mirror.value);
  if (!view) return;
  const events = parseCodeStripEvents(view.state.doc);
  const latest = events[events.length - 1];
  if (!latest) return;

  view.requestMeasure({
    read(measuredView) {
      const scroller = measuredView.scrollDOM;
      const coordinates = measuredView.coordsAtPos(latest.to);
      if (!coordinates) return null;
      const scrollerRect = scroller.getBoundingClientRect();
      const eventRight = scroller.scrollLeft + coordinates.right - scrollerRect.left;
      return {
        scroller,
        target: eventRight - scroller.clientWidth * RECORDING_FOLLOW_ANCHOR,
      };
    },
    write(measurement) {
      if (!measurement) return;
      startFollowScroll(measurement.scroller, measurement.target);
    },
  });
}

function syncPresentation() {
  const view = activeView();
  if (!view) return;

  updateCodeStripPresentation(view, {
    tokens: presentationTokens.value,
    durationMode: props.durationMode,
    density: props.density,
    timeSignature: props.timeSignature,
    showRests: codeStripConfig.value.showRests,
    notation: codeStripConfig.value.notation,
    mode: patternsStore.currentSketchMeta.mode,
    musicKey: patternsStore.currentSketchMeta.key,
    surfaceStyle: keyboardConfig.value.surfaceStyle === "monochrome"
      ? "monochrome"
      : "colored",
    keyBrightness: keyboardConfig.value.keyBrightness,
    keySaturation: keyboardConfig.value.keySaturation,
    appContext,
  });

  if (isControlled.value) applySpecimenPlayback(view, presentationTokens.value);
}

function stopFollow() {
  followPlaybackActive = false;
  followTargetScrollLeft = 0;
  followScroller = null;
  followLastFrameTime = null;
  if (followLoopFrame != null) cancelAnimationFrame(followLoopFrame);
  followLoopFrame = null;
}

function startFollowScroll(scroller: HTMLElement, target: number) {
  followScroller = scroller;
  followTargetScrollLeft = Math.max(
    0,
    Math.min(scroller.scrollWidth - scroller.clientWidth, target),
  );
  if (Math.abs(followTargetScrollLeft - scroller.scrollLeft) < 0.5) return;
  if (followLoopFrame != null) return;

  const step = (timestamp: number) => {
    followLoopFrame = null;
    const nextScroller = followScroller;
    if (!nextScroller) return;

    const delta = followTargetScrollLeft - nextScroller.scrollLeft;
    if (Math.abs(delta) < 0.5) {
      nextScroller.scrollLeft = followTargetScrollLeft;
      followLastFrameTime = null;
      return;
    }

    const elapsed = followLastFrameTime == null
      ? 1000 / 60
      : Math.max(0, timestamp - followLastFrameTime);
    followLastFrameTime = timestamp;
    const blend = 1 - Math.exp(-elapsed / FOLLOW_TIME_CONSTANT_MS);
    nextScroller.scrollLeft += delta * blend;
    followLoopFrame = requestAnimationFrame(step);
  };

  followLastFrameTime = null;
  followLoopFrame = requestAnimationFrame(step);
}

function followActivePlayback() {
  if (!followPlaybackActive) return;
  const root = editorRoot.value;
  const scroller = root?.querySelector<HTMLElement>(".cm-scroller");
  const active = root?.querySelector<HTMLElement>(
    ".cm-code-strip-event--active[data-follow-rank]",
  );
  if (!scroller || !active) return;

  const scrollerRect = scroller.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  const targetCenter = activeRect.left - scrollerRect.left + scroller.scrollLeft + activeRect.width / 2;
  followTargetScrollLeft = Math.max(
    0,
    Math.min(
      scroller.scrollWidth - scroller.clientWidth,
      targetCenter - scroller.clientWidth * 0.42,
    ),
  );
  startFollowScroll(scroller, followTargetScrollLeft);
}

function initializeControlledView() {
  if (!editorRoot.value) return;
  controlledView = new EditorView({
    state: EditorState.create({
      doc: generatedCode.value,
      extensions: [
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        codeStripStrudelExtension,
      ],
    }),
    parent: editorRoot.value,
  });
  syncPresentation();
}

async function initializeStrudelMirror() {
  if (!editorRoot.value) return;

  const instance = markRaw(new StrudelMirror({
    root: editorRoot.value,
    initialCode: generatedCode.value,
    transpiler,
    defaultOutput: emotitoneStrudelOutput,
    getTime: () => getAudioContext().currentTime,
    solo: true,
    prebake: async () => {
      await Promise.all([
        initSuperdoughAudio(),
        StrudelCore.evalScope(
          Promise.resolve(StrudelCore),
          Promise.resolve(StrudelMini),
          Promise.resolve(StrudelTonal),
          Promise.resolve(StrudelWebAudio),
        ),
      ]);
    },
    onDraw: () => {
      void nextTick(followActivePlayback);
    },
    onToggle: (started: boolean) => {
      setPlaying(started);
      followPlaybackActive = started;
      const view = getMirrorView(instance);
      if (view) setCodeStripPlaying(view, started);
      if (!started) {
        stopFollow();
        stopStrudelVisuals();
      }
    },
  }) as StrudelMirrorInstance);
  mirror.value = instance;

  instance.updateSettings?.({
    fontSize: 13,
    fontFamily: "IBM Plex Mono, 'SFMono-Regular', monospace",
    theme: "strudelTheme",
    isLineNumbersDisplayed: false,
    isActiveLineHighlighted: true,
    isBracketMatchingEnabled: true,
    isBracketClosingEnabled: true,
    isLineWrappingEnabled: false,
    isAutoCompletionEnabled: true,
    isPatternHighlightingEnabled: true,
    isFlashEnabled: false,
    isTooltipEnabled: true,
    isTabIndentationEnabled: true,
    isMultiCursorEnabled: true,
  });

  const view = getMirrorView(instance);
  if (view) {
    view.dispatch({
      effects: StateEffect.appendConfig.of([
        EditorView.updateListener.of((update) => {
          if (update.docChanged) syncCode(update.state.doc.toString());
        }),
        codeStripStrudelExtension,
      ]),
    });
    syncPresentation();
  }

  attachedController = {
    getCode: () => getMirrorCode(instance),
    setCode: (code: string) => instance.setCode(code),
    evaluate: () => evaluateMirror(instance),
    stop: () => {
      const editor = getMirrorView(instance);
      if (editor) setCodeStripPlaying(editor, false);
      return instance.stop();
    },
  };
  attachEditor(attachedController, generatedCode.value);
}

onMounted(async () => {
  try {
    if (isControlled.value) initializeControlledView();
    else await initializeStrudelMirror();
  } catch (error) {
    initError.value = error instanceof Error
      ? error.message
      : "CodeStrip failed to initialize.";
    setError(error);
    console.error("[CodeStrip] Strudel mirror init error:", error);
  } finally {
    isBooting.value = false;
  }
});

watch(generatedCode, (code) => {
  if (isControlled.value) replaceControlledCode(code);
  else syncMirrorCode(code);
  syncPresentation();
});

watch(
  [
    presentationTokens,
    () => props.durationMode,
    () => props.density,
    () => props.timeSignature,
    () => codeStripConfig.value.notation,
    () => codeStripConfig.value.showRests,
    () => keyboardConfig.value.surfaceStyle,
    () => keyboardConfig.value.keyBrightness,
    () => keyboardConfig.value.keySaturation,
  ],
  syncPresentation,
  { deep: true },
);

watch(
  [() => patternsStore.currentSketchMeta.bpm, () => codeStripConfig.value.bpm],
  async () => {
    if (isControlled.value || !mirror.value || !isPlaying.value) return;
    syncMirrorCode(generatedCode.value);
    await evaluateMirror(mirror.value);
  },
);

watch(
  () => {
    const notes = patternsStore.currentWorkingNotes;
    return notes[notes.length - 1]?.id;
  },
  async () => {
    if (isControlled.value) return;
    await nextTick();
    revealLatestRecordedEvent();
  },
);

watch(
  () => patternsStore.loadedBaseNotes.length,
  async () => {
    if (isControlled.value) return;
    await nextTick();
    const scroller = editorRoot.value?.querySelector<HTMLElement>(".cm-scroller");
    if (scroller) scroller.scrollLeft = 0;
  },
);

onBeforeUnmount(() => {
  stopFollow();
  controlledView?.destroy();
  controlledView = null;

  const instance = mirror.value;
  if (!instance) return;
  detachEditor(attachedController);
  try {
    stopStrudelVisuals();
    void instance.stop();
    instance.clear?.();
  } catch (error) {
    console.error("[CodeStrip] Strudel mirror teardown error:", error);
  } finally {
    mirror.value = null;
    attachedController = undefined;
  }
});
</script>

<template>
  <section
    v-show="isControlled || codeStripConfig.enabled"
    :class="hostClasses"
    :style="{ opacity: isControlled ? 1 : codeStripConfig.opacity }"
    :aria-label="ariaLabel"
  >
    <div v-if="initError" class="code-strip__error">{{ initError }}</div>
    <div
      ref="editorRoot"
      class="code-strip__editor"
      :class="{ 'code-strip__editor--booting': isBooting }"
    />
  </section>
</template>

<style scoped>
.code-strip {
  --strip-border: hsla(152, 100%, 50%, 0.16);
  display: flex;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--strip-border);
  background: var(--ink-2);
  color: var(--ivory);
  container-type: inline-size;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.code-strip--playing {
  border-color: hsla(152, 100%, 50%, 0.24);
  box-shadow: 0 0 14px hsla(152, 100%, 50%, 0.04);
}

.code-strip__error {
  padding: .3rem .4rem;
  color: hsl(0 100% 80% / .92);
  font-size: .72rem;
}

.code-strip__editor {
  width: 100%;
  min-width: 0;
  overflow: hidden;
  background: transparent;
}

.code-strip__editor--booting {
  opacity: .68;
}

.code-strip__editor:deep(.cm-editor) {
  width: 100%;
  min-width: 0;
  background: transparent !important;
  color: var(--ivory-2);
}

.code-strip__editor:deep(.cm-scroller) {
  overflow-x: auto;
  overflow-y: hidden;
  background: transparent !important;
  font-family: var(--font-mono);
  line-height: 1.15;
  scrollbar-width: none;
}

.code-strip__editor:deep(.cm-scroller::-webkit-scrollbar) {
  display: none;
}

.code-strip__editor:deep(.cm-content) {
  width: max-content;
  min-width: 100%;
  padding: 7px 10px;
  white-space: pre;
  caret-color: var(--ivory);
}

.code-strip--dense .code-strip__editor:deep(.cm-content) {
  padding-block: 5px;
}

.code-strip--spaced .code-strip__editor:deep(.cm-content) {
  padding-block: 10px;
}

.code-strip__editor:deep(.cm-line) {
  display: flex;
  align-items: center;
  min-width: max-content;
}

.code-strip__editor:deep(.cm-code-strip-event) {
  display: inline-flex;
  flex: 0 0 auto;
  margin-inline: 2.5px;
  vertical-align: middle;
}

.code-strip--dense .code-strip__editor:deep(.cm-code-strip-event) {
  margin-inline: 1.5px;
}

.code-strip--spaced .code-strip__editor:deep(.cm-code-strip-event) {
  margin-inline: 5px;
}

.code-strip__editor:deep(.cm-code-strip-event--hidden) {
  margin: 0;
}

.code-strip__editor:deep(.cm-inline-meta) {
  color: var(--ivory-4);
  font-size: .68em;
  opacity: .76;
  vertical-align: .46em;
}

.code-strip__editor:deep(.cm-inline-meta-active) {
  color: var(--ivory-2);
  opacity: 1;
}

.code-strip__editor:deep(.cm-focused) {
  outline: none;
}

.code-strip__editor:deep(.cm-selectionBackground),
.code-strip__editor:deep(.cm-content ::selection) {
  background: hsl(152 80% 45% / .22) !important;
}

@media (prefers-reduced-motion: reduce) {
  .code-strip {
    transition: none;
  }
}
</style>
