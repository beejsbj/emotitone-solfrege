<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
interface Props {
  embedded?: boolean;
  width?: string;
  height?: string;
  maxHeight?: string;
  bodyClass?: string;
}

withDefaults(defineProps<Props>(), {
  width: "min(22rem, calc(100vw - 1rem))",
  height: "",
  maxHeight: "min(72vh, 34rem)",
  bodyClass: "",
});
const emit = defineEmits<{ contentHeight: [height: number] }>();
const panel = ref<HTMLElement | null>(null);
const body = ref<HTMLElement | null>(null);
const naturalBody = ref<HTMLElement | null>(null);
let sizeObserver: ResizeObserver | undefined;
function measureContent() {
  if (!panel.value || !body.value || !naturalBody.value) return;
  const style = getComputedStyle(body.value);
  const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  const chrome = [...panel.value.querySelectorAll<HTMLElement>(':scope > .overlay-panel-shell__layout > header, :scope > .overlay-panel-shell__layout > footer, :scope > .overlay-panel-shell__layout > [data-testid="overlay-panel-shell-toolbar"]')]
    .reduce((height, element) => height + element.getBoundingClientRect().height, 0);
  emit('contentHeight', Math.ceil(naturalBody.value.getBoundingClientRect().height + padding + chrome));
}
onMounted(async () => {
  await nextTick();
  measureContent();
  if (typeof ResizeObserver !== 'undefined' && panel.value && naturalBody.value) {
    sizeObserver = new ResizeObserver(measureContent);
    sizeObserver.observe(naturalBody.value);
    for (const child of panel.value.querySelector('.overlay-panel-shell__layout')?.children ?? []) {
      if (child !== body.value) sizeObserver.observe(child);
    }
  }
});
onBeforeUnmount(() => sizeObserver?.disconnect());
</script>

<template>
  <section
    ref="panel"
    data-testid="overlay-panel-shell"
    class="relative min-h-0 overflow-hidden text-[var(--ivory)]"
    :class="embedded ? 'bg-transparent' : 'border border-[var(--hairline)] bg-[var(--ink)]'"
    :style="{ width, height: height || undefined, maxHeight }"
  >
    <div class="overlay-panel-shell__layout relative flex h-full max-h-full min-h-0 flex-col">
      <header
        v-if="$slots.header"
        data-testid="overlay-panel-shell-header"
        class="shrink-0 border-b border-[rgb(244_239_230/0.14)] bg-[var(--ink)] px-3.5 py-2.5"
      >
        <slot name="header" />
      </header>

      <div
        v-if="$slots.toolbar"
        data-testid="overlay-panel-shell-toolbar"
        class="shrink-0 border-b border-[rgb(244_239_230/0.14)] bg-[var(--ink)] px-3.5 py-2"
      >
        <slot name="toolbar" />
      </div>

      <div
        ref="body"
        data-testid="overlay-panel-shell-body"
        class="overlay-panel-shell__body min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3 touch-pan-y"
        :class="bodyClass"
        :style="{ WebkitOverflowScrolling: 'touch' }"
      >
        <div ref="naturalBody" class="flow-root"><slot /></div>
      </div>

      <footer
        v-if="$slots.footer"
        data-testid="overlay-panel-shell-footer"
        class="shrink-0 border-t border-[rgb(244_239_230/0.14)] bg-[var(--ink)] px-3.5 py-2.5"
      >
        <slot name="footer" />
      </footer>
    </div>
  </section>
</template>
