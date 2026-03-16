<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { getAudioContext } from "@/services/superdoughAudio";

const props = defineProps<{ code: string }>();

const containerRef = ref<HTMLDivElement | null>(null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mirror: any = null;

// Helper — safely push a new code string into the mirror
function setMirrorCode(newCode: string) {
  if (!mirror) return;
  try {
    if (typeof mirror.setCode === "function") {
      const current =
        typeof mirror.getCode === "function" ? mirror.getCode() : null;
      if (current !== newCode) mirror.setCode(newCode);
    } else if (mirror.view) {
      const doc = mirror.view.state.doc.toString();
      if (doc !== newCode) {
        mirror.view.dispatch({
          changes: { from: 0, to: doc.length, insert: newCode },
        });
      }
    }
  } catch {
    // mirror may not be fully ready yet — ignore
  }
}

onMounted(async () => {
  if (!containerRef.value) return;

  try {
    const [{ StrudelMirror }, { transpiler }, StrudelCore] =
      await Promise.all([
        import("@strudel/codemirror"),
        import("@strudel/transpiler"),
        import("@strudel/core"),
      ]);

    mirror = new StrudelMirror({
      // Display-only — no audio output; keeps this instance from fighting
      // with the useStrudel composable over the global Strudel module registry.
      defaultOutput: () => {},
      getTime: () => getAudioContext().currentTime,
      transpiler,
      root: containerRef.value!,
      initialCode: props.code || "",
      onError: (e: unknown) => {
        // Read-only display — suppress evaluate errors silently
        void e;
      },
      prebake: async () => {
        try {
          await StrudelCore.evalScope(
            import("@strudel/core"),
            import("@strudel/mini"),
            import("@strudel/tonal"),
            // @strudel/webaudio intentionally omitted — would conflict with useStrudel
          );
        } catch {
          // Non-fatal — syntax highlighting degrades gracefully
        }
      },
    });

    if (typeof mirror.updateSettings === "function") {
      mirror.updateSettings({
        theme: "dark",
        isPatternHighlightingEnabled: true,
        isLineNumbersDisplayed: false,
        isActiveLineHighlighted: false,
        isBracketMatchingEnabled: false,
        isLineWrappingEnabled: false,
        isBracketClosingEnabled: false,
        isAutoCompletionEnabled: false,
        isFlashEnabled: false,
        isTooltipEnabled: false,
        isTabIndentationEnabled: false,
        isMultiCursorEnabled: false,
      });
    }
  } catch (err) {
    console.error("[StrudelCodeView] init failed:", err);
  }
});

onBeforeUnmount(() => {
  try {
    mirror?.stop?.();
    mirror?.destroy?.();
  } catch {
    // ignore
  }
  mirror = null;
});

// Keep the editor in sync whenever the code prop changes
watch(
  () => props.code,
  (newCode) => setMirrorCode(newCode),
);
</script>

<template>
  <div ref="containerRef" class="strudel-code-view" />
</template>

<style scoped>
.strudel-code-view {
  display: block;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

/* Strip all interactive chrome from the embedded CodeMirror editor */
.strudel-code-view :deep(.cm-editor) {
  pointer-events: none;
  user-select: none;
  background: transparent !important;
  width: 100% !important;
  max-width: 100%;
}

.strudel-code-view :deep(.cm-cursor),
.strudel-code-view :deep(.cm-cursorLayer) {
  display: none !important;
}

.strudel-code-view :deep(.cm-gutters) {
  display: none !important;
}

.strudel-code-view :deep(.cm-scroller) {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  font-family: "SF Mono", "Fira Code", monospace !important;
  font-size: 0.6rem;
  letter-spacing: 0.02em;
  line-height: 1.4;
}

.strudel-code-view :deep(.cm-scroller::-webkit-scrollbar) {
  display: none;
}

/* Keep the single-line height tight */
.strudel-code-view :deep(.cm-content) {
  padding: 0;
  white-space: pre;
  font-family: "SF Mono", "Fira Code", monospace !important;
}
</style>
