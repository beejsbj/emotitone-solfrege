<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
import { initSuperdoughAudio, getAudioContext, emotitoneStrudelOutput, stopStrudelVisuals } from "@/services/superdoughAudio";
import { logNotesToStrudel } from "@/services/StrudelNotation";
import { strudelPlaybackHighlightExtension, highlightPlaybackLocations, updatePlaybackHighlightOptions } from "./strudelPlaybackHighlight";
import type { LogNote } from "@/types/patterns";

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
const {
  attachEditor,
  detachEditor,
  syncCode,
  setPlaying,
  setError,
} = useLiveStrudelMirror();

const editorRoot = ref<HTMLElement | null>(null);
const initError = ref<string | null>(null);
const isBooting = ref(true);
const mirror = ref<StrudelMirrorInstance | null>(null);

const generatedCode = computed(() => {
  if (patternsStore.isStripCleared) {
    return EMPTY_EDITOR_CODE;
  }

  const notes = patternsStore.currentSketchNotes;
  if (!notes.length) {
    return EMPTY_EDITOR_CODE;
  }

  return logNotesToStrudel(notes as LogNote[], {
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
      },
      onToggle: (started: boolean) => {
        setPlaying(started);

        if (!started) {
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
        isNoteColoringEnabled: true,
        isProgressiveFillEnabled: true,
        isPatternTextColoringEnabled: false,
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
  syncMirrorCode(nextCode);
});

onBeforeUnmount(() => {
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

    <div ref="editorRoot" class="live-strip__editor" :class="{ 'live-strip__editor--booting': isBooting }" />
  </div>
</template>

<style scoped>
.live-strip {
  --strip-border: hsla(152, 100%, 50%, 0.14);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  width: max-content;
  min-width: 100%;
}

.live-strip__error {
  padding: 0 0.35rem;
  font-size: 0.72rem;
  color: hsla(0, 100%, 80%, 0.92);
}

.live-strip__editor {
  min-height: 5.35rem;
  width: max-content;
  min-width: 100%;
  border: 1px solid var(--strip-border);
  border-radius: 6px;
  overflow: hidden;
  background:
    linear-gradient(180deg, hsla(0, 0%, 10%, 0.96), hsla(0, 0%, 5%, 0.98));
}

.live-strip__editor--booting {
  opacity: 0.68;
}

.live-strip__editor:deep(.cm-editor) {
  min-height: 5.35rem;
  background: transparent;
  color: hsla(0, 0%, 100%, 0.9);
}

.live-strip__editor:deep(.cm-scroller) {
  font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
  line-height: 1.5;
  overflow-x: visible;
  overflow-y: hidden;
}

.live-strip__editor:deep(.cm-content) {
  padding: 0.35rem 0.5rem 0.45rem;
  white-space: pre;
  width: max-content;
  min-width: 100%;
}

.live-strip__editor:deep(.cm-activeLine) {
  background: hsla(152, 100%, 50%, 0.06);
}

.live-strip__editor:deep(.cm-activeLineGutter) {
  background: transparent;
}

.live-strip__editor:deep(.cm-gutters) {
  background: linear-gradient(180deg, hsla(0, 0%, 8%, 0.92), hsla(0, 0%, 5%, 0.92));
  border-right: 1px solid hsla(0, 0%, 100%, 0.06);
  color: hsla(0, 0%, 100%, 0.18);
}

.live-strip__editor:deep(.cm-lineNumbers .cm-gutterElement) {
  padding: 0 0.4rem 0 0.55rem;
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

.live-strip__editor:deep(.cm-note-playing) {
  border-radius: 4px;
  transition: background-image 90ms linear, box-shadow 90ms linear;
}
</style>
