<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
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
import {
  initSuperdoughAudio,
  getAudioContext,
  emotitoneStrudelOutput,
  stopStrudelVisuals,
} from "@/services/superdoughAudio";
import { logNotesToStrudel } from "@/services/StrudelNotation";
import {
  codeStripMirrorPresentationExtension,
  updateCodeStripPresentation,
} from "./codeStripMirrorPresentation";
import type { LogNote } from "@/types/patterns";
import { buildLiveCodeStripFrame } from "./liveCodeStripAdapter";

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

const EMPTY_EDITOR_CODE = "// Play or load a pattern to see it in Strudel.";

const patternsStore = usePatternsStore();
const visualConfigStore = useVisualConfigStore();
const appContext = getCurrentInstance()?.appContext;
const { attachEditor, detachEditor, syncCode, setPlaying, setError, isPlaying } =
  useLiveStrudelMirror();

const editorRoot = ref<HTMLElement | null>(null);
const initError = ref<string | null>(null);
const isBooting = ref(true);
const mirror = ref<StrudelMirrorInstance | null>(null);
const playbackPhase = ref<number | null>(null);
let followLoopFrame: number | null = null;
let followTargetScrollLeft = 0;
let followPlaybackActive = false;

const liveStripConfig = computed(() => visualConfigStore.config.liveStrip);
const keyboardConfig = computed(() => visualConfigStore.config.keyboard);
const barMs = computed(() => (60000 / patternsStore.currentSketchMeta.bpm) * 4);
const codeStripFrame = computed(() =>
  buildLiveCodeStripFrame({
    notes: patternsStore.isStripCleared ? [] : patternsStore.currentSketchNotes,
    mode: patternsStore.currentSketchMeta.mode,
    musicKey: patternsStore.currentSketchMeta.key,
    notation: liveStripConfig.value.notation,
    showRests: liveStripConfig.value.showRests,
    barMs: barMs.value,
    playbackPhase: playbackPhase.value,
    surfaceStyle: keyboardConfig.value.surfaceStyle,
    keyBrightness: keyboardConfig.value.keyBrightness,
    keySaturation: keyboardConfig.value.keySaturation,
  })
);

const generatedCode = computed(() => {
  if (patternsStore.isStripCleared) {
    return EMPTY_EDITOR_CODE;
  }

  const notes = patternsStore.currentSketchNotes;
  if (!notes.length) {
    return EMPTY_EDITOR_CODE;
  }

  return logNotesToStrudel(notes as LogNote[], {
    bpm: liveStripConfig.value.bpm,
    sourceBpm: patternsStore.currentSketchMeta.bpm,
    notationType: liveStripConfig.value.notation === "note" ? "absolute" : "relative",
    scaleKey: patternsStore.currentSketchMeta.key,
    scaleMode: patternsStore.currentSketchMeta.mode,
    scaleOctave: keyboardConfig.value.mainOctave,
    sound: toStrudelSound(patternsStore.currentSketchMeta.instrument ?? "sine"),
  }).replace(/\s+/g, " ").trim();
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

function syncCodeStripPresentation() {
  const view = getMirrorView(mirror.value);
  if (!view) {
    return;
  }

  updateCodeStripPresentation(view, {
    tokens: codeStripFrame.value.tokens,
    activeTokenIndex: codeStripFrame.value.activeTokenIndex,
    durationMode: "stacked",
    appContext,
  });
}

function followActivePlayback() {
  const surface = getFollowSurface();
  const scroller = surface?.scroller;
  const activeToken = surface?.activeToken;
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

    if (!followPlaybackActive) {
      return;
    }

    const followScroller = getFollowSurface()?.scroller;
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

function getFollowSurface() {
  const view = getMirrorView(mirror.value);
  const root = editorRoot.value;
  if (!view || !root || view.hasFocus) return null;

  const widget = root.querySelector<HTMLElement>(".cm-code-strip-widget");
  const tokenIndex = widget?.dataset.activeTokenIndex;
  if (!widget || tokenIndex == null) return null;

  return {
    scroller: widget.querySelector<HTMLElement>(".code-strip__sequence"),
    activeToken: widget.querySelector<HTMLElement>(
      `[data-code-strip-index="${tokenIndex}"]`
    ),
  };
}

function codeStripScroller() {
  return editorRoot.value?.querySelector<HTMLElement>(".code-strip__sequence") ?? null;
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
      onDraw: (_haps: Array<{ isActive?: (time: unknown) => boolean }>, time: number) => {
        playbackPhase.value = Number(time.valueOf());
        void nextTick(followActivePlayback);
      },
      onToggle: (started: boolean) => {
        setPlaying(started);
        followPlaybackActive = started;

        if (!started) {
          playbackPhase.value = null;
          resetPlaybackFollow();
          if (followLoopFrame != null) {
            cancelAnimationFrame(followLoopFrame);
            followLoopFrame = null;
          }
          stopStrudelVisuals();
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
          codeStripMirrorPresentationExtension,
        ]),
      });
      syncCodeStripPresentation();
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
  playbackPhase.value = null;
  syncMirrorCode(nextCode);
});

watch(
  codeStripFrame,
  () => {
    syncCodeStripPresentation();
  },
  { deep: true }
);

watch(
  [() => patternsStore.currentSketchMeta.bpm, () => liveStripConfig.value.bpm],
  async () => {
    if (!mirror.value || !isPlaying.value) {
      return;
    }

    syncMirrorCode(generatedCode.value);
    await mirror.value.evaluate();
  }
);

watch(
  () => patternsStore.currentWorkingNotes.length,
  async () => {
    await nextTick();
    const scroller = codeStripScroller();
    if (scroller) {
      scroller.scrollLeft = scroller.scrollWidth;
    }
  }
);

watch(
  () => patternsStore.loadedBaseNotes.length,
  async () => {
    await nextTick();
    const scroller = codeStripScroller();
    if (scroller) {
      scroller.scrollLeft = 0;
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
      v-show="liveStripConfig.enabled"
      ref="editorRoot"
      class="live-strip__editor"
      :class="{ 'live-strip__editor--booting': isBooting }"
      :style="{ opacity: liveStripConfig.opacity }"
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

</style>
