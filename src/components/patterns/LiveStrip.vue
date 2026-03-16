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
import { MAJOR_SOLFEGE, MINOR_SOLFEGE } from "@/data";
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
import type { LogNote, PatternNote } from "@/types/patterns";

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
const { getStaticPrimaryColor } = useColorSystem();
const { attachEditor, detachEditor, syncCode, setPlaying, setError } =
  useLiveStrudelMirror();

const editorRoot = ref<HTMLElement | null>(null);
const notationRef = ref<HTMLElement | null>(null);
const initError = ref<string | null>(null);
const isBooting = ref(true);
const mirror = ref<StrudelMirrorInstance | null>(null);

const liveStripConfig = computed(() => visualConfigStore.config.liveStrip);

const generatedCode = computed(() => {
  if (patternsStore.isStripCleared) {
    return EMPTY_EDITOR_CODE;
  }

  const notes = patternsStore.currentSketchNotes;
  if (!notes.length) {
    return EMPTY_EDITOR_CODE;
  }

  return logNotesToStrudel(notes as LogNote[], {
    notationType: "relative",
    scaleKey: patternsStore.currentSketchMeta.key,
    scaleMode: patternsStore.currentSketchMeta.mode,
    sound: toStrudelSound(patternsStore.currentSketchMeta.instrument ?? "sine"),
  }).replace(/\s+/g, " ").trim();
});

function solfegeName(scaleIndex: number, mode: string): string {
  const list = mode === "minor" ? MINOR_SOLFEGE : MAJOR_SOLFEGE;
  return list[scaleIndex]?.name ?? "Do";
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
    const color = getStaticPrimaryColor(
      solfegeName(note.scaleIndex, patternsStore.currentSketchMeta.mode),
      patternsStore.currentSketchMeta.mode,
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
      v-if="liveStripConfig.enabled"
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
  min-height: 2.35rem;
  max-height: 2.75rem;
  width: 100%;
  min-width: 0;
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
  min-height: 2.35rem;
  max-height: 2.75rem;
  background: transparent;
  color: hsla(0, 0%, 100%, 0.9);
}

.live-strip__editor:deep(.cm-scroller) {
  font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
  line-height: 1.35;
  overflow-x: auto;
  overflow-y: hidden;
}

.live-strip__editor:deep(.cm-content) {
  padding: 0.18rem 0.4rem 0.22rem;
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

.live-strip__editor:deep(.cm-note-playing) {
  border-radius: 4px;
  transition: background-image 90ms linear, box-shadow 90ms linear;
}
</style>
