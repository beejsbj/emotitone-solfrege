<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { StrudelMirror } from "@strudel/codemirror";
import * as StrudelCore from "@strudel/core";
import * as StrudelMini from "@strudel/mini";
import * as StrudelTonal from "@strudel/tonal";
import * as StrudelWebAudio from "@strudel/webaudio";
import { transpiler } from "@strudel/transpiler";
import { toStrudelSound } from "@/composables/useStrudel";
import { useLiveStrudelMirror } from "@/composables/useLiveStrudelMirror";
import { usePatternsStore } from "@/stores/patterns";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { useColorSystem } from "@/composables/useColorSystem";
import { getSolfegeNameForMode } from "@/data";
import {
  initSuperdoughAudio,
  getAudioContext,
  emotitoneStrudelOutput,
  stopStrudelVisuals,
} from "@/services/superdoughAudio";
import { logNotesToStrudel } from "@/services/StrudelNotation";
import {
  strudelPlaybackHighlightExtension,
  highlightPlaybackLocations,
  updatePlaybackHighlightOptions,
} from "./strudelPlaybackHighlight";
import type { KeyboardConfig } from "@/types/visual";
import type { LogNote, PatternNote } from "@/types/patterns";
import type { MusicalMode } from "@/types/music";

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

type Token = {
  text: string;
  color: string | null;
  isRest: boolean;
};

const EMPTY_EDITOR_CODE = "// Play or load a pattern to see it in Strudel.";
const BAR_MS = (60000 / 120) * 4;

const patternsStore = usePatternsStore();
const visualConfigStore = useVisualConfigStore();
const {
  getKeyBackground,
  getStaticPrimaryColorByScaleIndex,
} = useColorSystem();
const { attachEditor, detachEditor, syncCode, setPlaying, setError } =
  useLiveStrudelMirror();

const editorRoot = ref<HTMLElement | null>(null);
const notationRef = ref<HTMLElement | null>(null);
const initError = ref<string | null>(null);
const isBooting = ref(true);
const mirror = ref<StrudelMirrorInstance | null>(null);
let followLoopFrame: number | null = null;
let followTargetScrollLeft = 0;
let followPlaybackActive = false;

const liveStripConfig = computed(() => visualConfigStore.config.liveStrip);
const keyboardConfig = computed(() => visualConfigStore.config.keyboard);
const noteSkins = computed(() =>
  patternsStore.currentSketchNotes.map((note, index) =>
    buildNoteSkin(
      note,
      index,
      keyboardConfig.value,
      liveStripConfig.value.notation,
      patternsStore.currentSketchMeta.mode
    )
  )
);
const highlightOptions = computed(() => ({
  isNoteColoringEnabled: true,
  isProgressiveFillEnabled: true,
  isPatternTextColoringEnabled: true,
  notationMode: liveStripConfig.value.notation,
  scaleMode: patternsStore.currentSketchMeta.mode,
  noteSkins: noteSkins.value,
}));

const generatedCode = computed(() => {
  if (patternsStore.isStripCleared) {
    return EMPTY_EDITOR_CODE;
  }

  const notes = patternsStore.currentSketchNotes;
  if (!notes.length) {
    return EMPTY_EDITOR_CODE;
  }

  return logNotesToStrudel(notes as LogNote[], {
    notationType: liveStripConfig.value.notation === "note" ? "absolute" : "relative",
    scaleKey: patternsStore.currentSketchMeta.key,
    scaleMode: patternsStore.currentSketchMeta.mode,
    sound: toStrudelSound(patternsStore.currentSketchMeta.instrument ?? "sine"),
  }).replace(/\s+/g, " ").trim();
});

function solfegeName(scaleIndex: number, mode: string): string {
  return getSolfegeNameForMode(mode as MusicalMode, scaleIndex);
}

function tokenText(note: PatternNote): string {
  const notation = liveStripConfig.value.notation;
  if (notation === "note") {
    return note.note;
  }

  if (notation === "degree") {
    return String(note.scaleIndex + 1);
  }

  return solfegeName(note.scaleIndex, patternsStore.currentSketchMeta.mode);
}

function keyTextColorValue(
  colorMode: KeyboardConfig["colorMode"],
  isAccidental: boolean
): string {
  if (colorMode === "monochrome") {
    return isAccidental ? "hsla(0, 0%, 0%, 0.94)" : "hsla(0, 0%, 100%, 0.96)";
  }

  return isAccidental ? "hsla(0, 0%, 0%, 0.9)" : "hsla(0, 0%, 100%, 0.96)";
}

function buildStripClipPath(index: number, config: KeyboardConfig) {
  if (!config.angledStyle) {
    return undefined;
  }

  const topLeft = (index * 7) % 11;
  const topRight = 90 + ((index * 5 + 3) % 11);
  const bottomRight = 90 + ((index * 11 + 5) % 11);
  const bottomLeft = (index * 13 + 2) % 11;

  return `polygon(${topLeft}% 1%, ${topRight}% 1%, ${bottomRight}% 99%, ${bottomLeft}% 99%)`;
}

function buildNoteSkin(
  note: PatternNote,
  index: number,
  config: KeyboardConfig,
  notation: "solfege" | "note" | "degree",
  mode: string
) {
  const label =
    notation === "note"
      ? note.note
      : notation === "degree"
        ? String(note.scaleIndex + 1)
        : solfegeName(note.scaleIndex, mode);
  const isAccidental = note.note.includes("#");
  const { background, primaryColor } = getKeyBackground(
    note.scaleIndex,
    mode as MusicalMode,
    patternsStore.currentSketchMeta.key,
    note.octave,
    config.colorMode,
    isAccidental,
    {
      keyBrightness: config.keyBrightness,
      keySaturation: config.keySaturation,
      glassmorphOpacity: config.glassmorphOpacity,
    }
  );
  const passiveColor =
    getStaticPrimaryColorByScaleIndex(
      note.scaleIndex,
      mode as MusicalMode,
      patternsStore.currentSketchMeta.key,
      note.octave
    ) || primaryColor;
  const activeTextColor = keyTextColorValue(config.colorMode, isAccidental);

  return {
    label,
    color: passiveColor,
    activeTextColor,
    fillBackground: background,
    fillColor: primaryColor,
    shapeRadius: `${config.keyShape}px`,
    clipPath: buildStripClipPath(index, config),
  };
}

const displayTokens = computed((): Token[] => {
  if (patternsStore.isStripCleared) {
    return [];
  }

  const notes = patternsStore.currentSketchNotes;
  if (!notes.length) {
    return [];
  }

  const origin = notes[0].pressTime;
  const tokens: Token[] = [];
  let cursor = 0;

  for (const note of notes) {
    const start = note.pressTime - origin;
    const duration = Math.max(1, note.duration);
    const gap = start - cursor;

    if (gap > 50) {
      const restRatio = parseFloat((gap / BAR_MS).toFixed(4));
      tokens.push({
        text: `~@${restRatio}`,
        color: null,
        isRest: true,
      });
    }

    const durationRatio = parseFloat((duration / BAR_MS).toFixed(4));
    const durationSuffix = durationRatio === 1 ? "" : `@${durationRatio}`;
    const tokenLabel = tokenText(note);
    const color = getStaticPrimaryColorByScaleIndex(
      note.scaleIndex,
      patternsStore.currentSketchMeta.mode,
      patternsStore.currentSketchMeta.key,
      note.octave
    );

    tokens.push({
      text: `${tokenLabel}${durationSuffix}`,
      color,
      isRest: false,
    });

    cursor = start + duration;
  }

  if (!liveStripConfig.value.showRests) {
    return tokens.filter((token) => !token.isRest);
  }

  return tokens;
});

function getMirrorView(instance: StrudelMirrorInstance | null): EditorView | undefined {
  return (instance?.editor ?? instance?.view) as EditorView | undefined;
}

function getMirrorCode(instance: StrudelMirrorInstance | null): string {
  const view = getMirrorView(instance);
  if (view) {
    return view.state.doc.toString();
  }

  return instance?.code ?? "";
}

function resetPlaybackFollow() {
  followTargetScrollLeft = 0;
}

function syncMirrorCode(code: string) {
  const instance = mirror.value;
  if (!instance) {
    return;
  }

  if (getMirrorCode(instance) === code) {
    syncCode(code);
    return;
  }

  instance.setCode(code);
  syncCode(code);
}

function followActivePlayback() {
  const view = getMirrorView(mirror.value);
  const root = editorRoot.value;
  if (!view || !root || view.hasFocus) {
    return;
  }

  const scroller = root.querySelector<HTMLElement>(".cm-scroller");
  const activeToken = root.querySelector<HTMLElement>(
    ".cm-live-strip-token--active[data-note-index]"
  );
  if (!scroller || !activeToken) {
    return;
  }

  const targetCenter = activeToken.offsetLeft + activeToken.offsetWidth / 2;
  followTargetScrollLeft = Math.max(
    0,
    Math.min(
      scroller.scrollWidth - scroller.clientWidth,
      targetCenter - scroller.clientWidth * 0.42
    )
  );

  if (followLoopFrame != null) {
    return;
  }

  const step = () => {
    followLoopFrame = null;

    const followView = getMirrorView(mirror.value);
    const followRoot = editorRoot.value;
    if (!followPlaybackActive || !followView || !followRoot || followView.hasFocus) {
      return;
    }

    const followScroller = followRoot.querySelector<HTMLElement>(".cm-scroller");
    if (!followScroller) {
      return;
    }

    const delta = followTargetScrollLeft - followScroller.scrollLeft;
    if (Math.abs(delta) < 0.5) {
      return;
    }

    followScroller.scrollLeft += delta * 0.14;
    followLoopFrame = requestAnimationFrame(step);
  };

  followLoopFrame = requestAnimationFrame(step);
}

onMounted(async () => {
  if (!editorRoot.value) {
    return;
  }

  try {
    const instance = new StrudelMirror({
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
            Promise.resolve(StrudelWebAudio)
          ),
        ]);
      },
      onDraw: (haps: Array<{ isActive?: (time: unknown) => boolean }>, time: number) => {
        const activeHaps = haps.filter((hap) => hap?.isActive?.(time));
        const view = getMirrorView(mirror.value);
        if (view) {
          highlightPlaybackLocations(view, time, activeHaps as never[]);
        }
        followActivePlayback();
      },
      onToggle: (started: boolean) => {
        setPlaying(started);
        followPlaybackActive = started;

        if (!started) {
          resetPlaybackFollow();
          if (followLoopFrame != null) {
            cancelAnimationFrame(followLoopFrame);
            followLoopFrame = null;
          }
          stopStrudelVisuals();
          const view = getMirrorView(mirror.value);
          if (view) {
            highlightPlaybackLocations(view, 0, []);
          }
        }
      },
    }) as StrudelMirrorInstance;

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
            if (update.docChanged) {
              syncCode(update.state.doc.toString());
            }
          }),
          strudelPlaybackHighlightExtension,
        ]),
      });

      updatePlaybackHighlightOptions(view, {
        ...highlightOptions.value,
      });
    }

    attachEditor(
      {
        getCode: () => getMirrorCode(instance),
        setCode: (code: string) => instance.setCode(code),
        evaluate: () => instance.evaluate(),
        stop: () => instance.stop(),
      },
      generatedCode.value
    );
  } catch (error) {
    initError.value =
      error instanceof Error ? error.message : "Strudel editor failed to initialize.";
    setError(error);
    console.error("[LiveStrip] StrudelMirror init error:", error);
  } finally {
    isBooting.value = false;
  }
});

watch(generatedCode, (nextCode) => {
  resetPlaybackFollow();
  syncMirrorCode(nextCode);
});

watch(
  highlightOptions,
  (nextOptions) => {
    const view = getMirrorView(mirror.value);
    if (!view) {
      return;
    }

    updatePlaybackHighlightOptions(view, nextOptions);
  },
  { deep: true }
);

watch(
  () => patternsStore.currentWorkingNotes.length,
  async () => {
    await nextTick();
    if (notationRef.value) {
      notationRef.value.scrollLeft = notationRef.value.scrollWidth;
    }
  }
);

watch(
  () => patternsStore.loadedBaseNotes.length,
  async () => {
    await nextTick();
    if (notationRef.value) {
      notationRef.value.scrollLeft = 0;
    }
  }
);

onBeforeUnmount(() => {
  if (followLoopFrame != null) {
    cancelAnimationFrame(followLoopFrame);
    followLoopFrame = null;
  }

  const instance = mirror.value;
  if (!instance) {
    return;
  }

  detachEditor();

  try {
    stopStrudelVisuals();
    void instance.stop();
    instance.clear?.();
  } catch (error) {
    console.error("[LiveStrip] StrudelMirror teardown error:", error);
  } finally {
    mirror.value = null;
  }
});
</script>

<template>
  <div class="live-strip">
    <div v-if="initError" class="live-strip__error">
      {{ initError }}
    </div>

    <div
      v-if="liveStripConfig.enabled && !liveStripConfig.showStrudelLine"
      class="live-strip__supplement"
      :style="{ opacity: liveStripConfig.opacity }"
    >
      <div v-if="displayTokens.length" ref="notationRef" class="notation-bar">
        <div class="notation-tokens">
          <span
            v-for="(token, index) in displayTokens"
            :key="index"
            class="token"
            :class="token.isRest ? 'token--rest' : 'token--note'"
            :style="token.color ? { backgroundColor: token.color } : {}"
          >
            {{ token.text }}
          </span>
        </div>
      </div>
      <div v-else class="empty-hint">play something…</div>

    </div>

    <div
      v-show="liveStripConfig.enabled && liveStripConfig.showStrudelLine"
      ref="editorRoot"
      class="live-strip__editor"
      :class="{ 'live-strip__editor--booting': isBooting }"
    />
  </div>
</template>

<style scoped>
.live-strip {
  --strip-border: hsla(152, 100%, 50%, 0.14);
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  width: 100%;
  min-width: 0;
}

.live-strip__error {
  padding: 0 0.35rem;
  font-size: 0.72rem;
  color: hsla(0, 100%, 80%, 0.92);
}

.live-strip__supplement {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, hsla(0, 0%, 7%, 0.96), hsla(0, 0%, 4%, 0.98));
  border: 1px solid hsla(0, 0%, 100%, 0.06);
  border-radius: 6px;
  overflow: hidden;
}

.notation-bar {
  overflow-x: auto;
  min-width: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.notation-bar::-webkit-scrollbar {
  display: none;
}

.notation-tokens {
  display: flex;
  gap: 0.25rem;
  padding: 0.35rem 0.5rem;
  width: max-content;
  align-items: center;
}

.token {
  display: inline-flex;
  align-items: center;
  font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  padding: 0.2rem 0.35rem;
  border-radius: 3px;
}

.token--note {
  color: hsla(0, 0%, 100%, 0.92);
}

.token--rest {
  color: hsla(0, 0%, 100%, 0.2);
  background-color: hsla(0, 0%, 100%, 0.05);
  font-weight: 400;
}

.empty-hint {
  padding: 0.35rem 0.6rem;
  font-size: 0.65rem;
  color: hsla(0, 0%, 100%, 0.25);
  font-style: italic;
}

.live-strip__editor {
  min-height: 0;
  height: auto;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--strip-border);
  border-radius: 6px;
  overflow: hidden;
  background: transparent !important;
  background-color: transparent !important;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  box-shadow: none;
}

.live-strip__editor--booting {
  opacity: 0.68;
}

.live-strip__editor:deep(.cm-editor) {
  min-height: 0;
  height: auto;
  max-height: none;
  background: transparent !important;
  background-color: transparent !important;
  color: hsla(0, 0%, 100%, 0.9);
}

.live-strip__editor:deep(.cm-scroller) {
  font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
  line-height: 1.15;
  overflow-x: auto;
  overflow-y: hidden;
  background: transparent !important;
  background-color: transparent !important;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.live-strip__editor:deep(.cm-scroller::-webkit-scrollbar) {
  display: none;
}

.live-strip__editor:deep(.cm-content) {
  padding: 0.18rem 0.4rem 0.2rem;
  white-space: pre;
  width: max-content;
  min-width: 100%;
  background: transparent !important;
  background-color: transparent !important;
}

.live-strip__editor:deep(.cm-live-strip-token) {
  position: relative;
  display: inline-grid;
  grid-template-rows: auto auto;
  justify-items: center;
  align-items: end;
  min-width: 1.18rem;
  margin: 0 0.07rem 0 0;
  padding: 0.06rem 0.14rem 0.08rem;
  border-radius: var(--live-strip-radius, 4px);
  clip-path: var(--live-strip-clip-path, none);
  white-space: nowrap;
  overflow: hidden;
  background-color: transparent;
  isolation: isolate;
  box-shadow: var(--live-strip-shadow, none);
  transition:
    clip-path 120ms ease,
    border-radius 120ms ease,
    box-shadow 100ms linear,
    color 100ms linear,
    transform 100ms linear,
    opacity 100ms linear;
}

.live-strip__editor:deep(.cm-live-strip-token)::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--live-strip-fill-surface, var(--live-strip-fill-color, transparent));
  transform-origin: bottom center;
  transform: scaleY(var(--live-strip-fill-scale, 0));
  transition: transform 72ms linear, opacity 100ms linear;
  pointer-events: none;
}

.live-strip__editor:deep(.cm-live-strip-token__label) {
  position: relative;
  z-index: 1;
  font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
  font-weight: 600;
  letter-spacing: 0;
  font-size: 0.74rem;
  line-height: 0.88;
  color: var(--live-strip-label-color, var(--strudel-note-color));
  transition: color 90ms linear;
}

.live-strip__editor:deep(.cm-live-strip-token__duration) {
  position: relative;
  z-index: 1;
  margin-top: 0.05rem;
  font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
  font-size: 0.45rem;
  line-height: 0.82;
  letter-spacing: 0.01em;
  color: color-mix(
    in srgb,
    var(--live-strip-label-color, var(--strudel-note-color)) 62%,
    transparent
  );
  transition: color 90ms linear;
}

.live-strip__editor:deep(.cm-live-strip-token--rest) {
  min-width: 0.85rem;
  background-image: none;
  box-shadow: none;
}

.live-strip__editor:deep(.cm-live-strip-token--rest .cm-live-strip-token__label) {
  color: hsla(0, 0%, 100%, 0.42);
}

.live-strip__editor:deep(.cm-live-strip-token--rest .cm-live-strip-token__duration) {
  color: hsla(0, 0%, 100%, 0.24);
}

.live-strip__editor:deep(.cm-inline-meta) {
  opacity: 0.76;
  font-size: 0.55em;
  vertical-align: 0.46em;
  color: hsla(92, 42%, 60%, 0.88);
  background: transparent;
  border-radius: 0;
  padding: 0 0 0 0.03rem;
  transition:
    opacity 120ms ease,
    background-color 120ms ease,
    color 120ms ease,
    font-size 120ms ease;
}

.live-strip__editor:deep(.cm-inline-meta.cm-inline-meta-active) {
  opacity: 0.95;
  font-size: 0.58em;
  vertical-align: 0.34em;
  color: hsla(0, 0%, 100%, 0.92);
  background: hsla(152, 100%, 50%, 0.08);
  border-radius: 3px;
  padding: 0 0.08rem;
}

.live-strip__editor:deep([data-strudel-note-color]) {
  color: var(--strudel-note-color) !important;
}

.live-strip__editor:deep([data-strudel-note-color] *) {
  color: inherit !important;
}

.live-strip__editor:deep(.cm-activeLine) {
  background: transparent !important;
}

.live-strip__editor:deep(.cm-activeLineGutter) {
  background: transparent;
}

.live-strip__editor:deep(.cm-gutters) {
  display: none;
}

.live-strip__editor:deep(.cm-focused) {
  outline: none;
}

.live-strip__editor:deep(.cm-selectionBackground) {
  background: hsla(152, 100%, 50%, 0.16) !important;
}

.live-strip__editor:deep(.cm-cursor) {
  border-left-color: hsla(152, 100%, 72%, 0.95);
}

.live-strip__editor:deep(.cm-live-strip-token--active) {
  transform: translateY(-0.5px);
}
</style>
