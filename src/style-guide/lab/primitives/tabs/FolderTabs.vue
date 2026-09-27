<script setup lang="ts">
import { ref } from "vue";
import type { TabsSelectionSource } from "@/components/primatives/Tabs.vue";
import type { LabTabsProps } from "@/types/primitivesLab";
import { useLabTabs } from "./useLabTabs";

/*
 * Direction A · Folder. Real file-folder tabs standing on the edge of the
 * sheet they open. The chosen tab rises in Ivory (or Brass) and joins a paper
 * edge that runs the full width — the destination visibly connects to its
 * content. No bordered box, no floating chip.
 */
const props = withDefaults(defineProps<LabTabsProps>(), {
  tone: "ivory",
  density: "comfortable",
  layout: "equal",
  ariaLabel: "Tabs",
});
const emit = defineEmits<{ "update:modelValue": [value: string, source: TabsSelectionSource] }>();
const root = ref<HTMLElement | null>(null);
const { onKeydown, onClick, label } = useLabTabs(props, emit, root);
</script>

<template>
  <div
    ref="root"
    class="folder"
    :class="[`folder--${density}`, `folder--${layout}`, `folder--tone-${tabs.find((tab) => tab.value === modelValue)?.tone ?? tone}`]"
    role="tablist"
    :aria-label="ariaLabel"
    @keydown="onKeydown"
  >
    <div class="folder__row">
      <button
        v-for="(tab, index) in tabs"
        :key="tab.value"
        type="button"
        role="tab"
        class="folder__tab"
        :class="{ 'folder__tab--active': tab.value === modelValue, 'folder__tab--brass': tab.tone === 'brass' }"
        :style="{ zIndex: tab.value === modelValue ? tabs.length + 1 : tabs.length - index }"
        :data-tab-value="tab.value"
        :aria-selected="tab.value === modelValue"
        :tabindex="tab.value === modelValue ? 0 : -1"
        :disabled="tab.disabled"
        @click="onClick(tab, $event)"
      >
        <component :is="tab.icon" v-if="tab.icon" class="folder__icon" />
        <span>{{ label(tab) }}</span>
      </button>
    </div>
    <span class="folder__edge" aria-hidden="true" />
  </div>
</template>

<style scoped>
.folder {
  --sheet: var(--ivory);
  --sheet-ink: var(--ink);
  position: relative;
  width: 100%;
  padding-top: 6px;
}

.folder--tone-brass { --sheet: var(--brass-fill); --sheet-ink: var(--brass-edge); }

.folder__row {
  display: flex;
  align-items: flex-end;
  padding-inline: 6px;
}

.folder--scroll .folder__row {
  overflow-x: auto;
  scrollbar-width: none;
  overscroll-behavior-inline: contain;
  padding-top: 6px;
  margin-top: -6px;
}

.folder__tab {
  position: relative;
  display: inline-flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  min-height: 40px;
  margin-inline-end: -8px;
  padding: 11px 18px 9px;
  border: 0;
  background: var(--ink-3);
  color: var(--ivory-3);
  /* Folder-tab silhouette: sloped shoulders, a hand-cut top edge. */
  clip-path: polygon(10px 0, calc(100% - 12px) 1px, 100% 100%, 0 100%);
  cursor: pointer;
  font: 700 13px/1 var(--font-display);
  letter-spacing: .14em;
  text-transform: uppercase;
  white-space: nowrap;
  translate: 0 4px;
  transition: translate var(--dur-bounce) var(--ease-bounce), background-color var(--dur-ui) var(--ease-brush), color var(--dur-ui) var(--ease-brush);
}

.folder--scroll .folder__tab { flex: 0 0 auto; }

.folder__tab:nth-child(even) { background: var(--ink-4); }
.folder__tab:not(:disabled):hover { color: var(--ivory); translate: 0 2px; }

.folder__tab--active,
.folder__tab--active:nth-child(even) {
  background: var(--sheet);
  color: var(--sheet-ink);
  translate: 0 0;
}

.folder__tab--brass:not(.folder__tab--active) { color: var(--brass-hi); }

.folder__tab:focus-visible {
  outline: 2px solid var(--ivory);
  outline-offset: -5px;
}

.folder__tab:disabled { cursor: not-allowed; opacity: .38; }

.folder__icon { width: 12px; height: 12px; flex: none; }

.folder__edge {
  display: block;
  height: 5px;
  background: var(--sheet);
  transition: background-color var(--dur-ui) var(--ease-brush);
}

.folder--compact .folder__tab { min-height: 32px; padding: 8px 14px 6px; font-size: 10px; }
.folder--compact .folder__edge { height: 4px; }

@media (prefers-reduced-motion: reduce) {
  .folder__tab,
  .folder__edge { transition: none; }
}

@media (forced-colors: active) {
  .folder__tab { border: 1px solid ButtonText; color: ButtonText; }
  .folder__tab--active { background: Highlight; color: HighlightText; }
  .folder__edge { background: Highlight; }
}
</style>
