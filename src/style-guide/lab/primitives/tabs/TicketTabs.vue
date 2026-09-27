<script setup lang="ts">
import { ref } from "vue";
import type { TabsSelectionSource } from "@/components/primatives/Tabs.vue";
import type { LabTabsProps } from "@/types/primitivesLab";
import { useLabTabs } from "./useLabTabs";

/*
 * Direction B · Ticket. The rail is a strip of gig tickets joined at their
 * perforations, each numbered like an admission stub. Choosing one tears it
 * off the strip: it turns Ivory (or Brass), tips, and lifts on a hard Ink
 * shadow while the gap it left shows the perforation.
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
const number = (index: number) => String(index + 1).padStart(2, "0");
</script>

<template>
  <div
    ref="root"
    class="ticket"
    :class="[`ticket--${density}`, `ticket--${layout}`]"
    role="tablist"
    :aria-label="ariaLabel"
    @keydown="onKeydown"
  >
    <button
      v-for="(tab, index) in tabs"
      :key="tab.value"
      type="button"
      role="tab"
      class="ticket__stub"
      :class="{
        'ticket__stub--active': tab.value === modelValue,
        'ticket__stub--brass': (tab.tone ?? tone) === 'brass',
      }"
      :data-tab-value="tab.value"
      :aria-selected="tab.value === modelValue"
      :tabindex="tab.value === modelValue ? 0 : -1"
      :disabled="tab.disabled"
      @click="onClick(tab, $event)"
    >
      <span class="ticket__no" aria-hidden="true">No.{{ number(index) }}</span>
      <span class="ticket__label">
        <component :is="tab.icon" v-if="tab.icon" class="ticket__icon" />
        {{ label(tab) }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.ticket {
  display: flex;
  width: 100%;
  padding: 8px 4px 10px;
}

.ticket--scroll { overflow-x: auto; scrollbar-width: none; overscroll-behavior-inline: contain; }

.ticket__stub {
  --stub: var(--ink-3);
  --stub-ink: var(--ivory-2);
  position: relative;
  display: grid;
  flex: 1 1 0;
  justify-items: center;
  gap: 3px;
  min-width: 0;
  min-height: 44px;
  padding: 7px 12px 8px;
  border: 0;
  background: var(--stub);
  color: var(--stub-ink);
  /* Perforation: a row of punched half-holes down each joined edge. */
  -webkit-mask:
    radial-gradient(circle at 0 50%, transparent 2.2px, #000 2.6px) left / 6px 8px repeat-y,
    radial-gradient(circle at 100% 50%, transparent 2.2px, #000 2.6px) right / 6px 8px repeat-y,
    linear-gradient(#000 0 0) center / calc(100% - 12px) 100% no-repeat;
  mask:
    radial-gradient(circle at 0 50%, transparent 2.2px, #000 2.6px) left / 6px 8px repeat-y,
    radial-gradient(circle at 100% 50%, transparent 2.2px, #000 2.6px) right / 6px 8px repeat-y,
    linear-gradient(#000 0 0) center / calc(100% - 12px) 100% no-repeat;
  cursor: pointer;
  transition: rotate var(--dur-bounce) var(--ease-bounce), translate var(--dur-bounce) var(--ease-bounce), background-color var(--dur-ui) var(--ease-brush);
}

.ticket--scroll .ticket__stub { flex: 0 0 auto; }
.ticket__stub + .ticket__stub { margin-inline-start: 1px; }
.ticket__stub:nth-child(even) { --stub: var(--ink-4); }

.ticket__no {
  color: var(--ivory-4);
  font: 500 8px/1 var(--font-mono);
  letter-spacing: .1em;
}

.ticket__label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font: 700 13px/1 var(--font-display);
  letter-spacing: .12em;
  text-transform: uppercase;
  white-space: nowrap;
}

.ticket__icon { width: 12px; height: 12px; flex: none; }

.ticket__stub:not(:disabled):not(.ticket__stub--active):hover { --stub-ink: var(--ivory); }
.ticket__stub--brass:not(.ticket__stub--active) { --stub-ink: var(--brass-hi); }

/* Torn off: tipped, lifted, on a hard shadow. */
.ticket__stub--active,
.ticket__stub--active:nth-child(even) {
  --stub: var(--ivory);
  --stub-ink: var(--ink);
  z-index: 1;
  rotate: -3deg;
  translate: 0 -3px;
  filter: drop-shadow(3px 3px 0 var(--ink));
}

.ticket__stub--active .ticket__no { color: var(--ink); opacity: .55; }
.ticket__stub--active.ticket__stub--brass { --stub: var(--brass-fill); --stub-ink: var(--brass-edge); filter: drop-shadow(3px 3px 0 var(--ink)) drop-shadow(0 0 8px rgb(224 169 58 / 40%)); }

.ticket__stub:focus-visible { outline: 2px solid var(--ivory); outline-offset: 2px; }
.ticket__stub:disabled { cursor: not-allowed; opacity: .38; }

.ticket--compact .ticket__stub { min-height: 34px; padding: 5px 9px 6px; }
.ticket--compact .ticket__label { font-size: 10px; }
.ticket--compact .ticket__no { display: none; }

@media (prefers-reduced-motion: reduce) {
  .ticket__stub { transition: none; }
}

@media (forced-colors: active) {
  .ticket__stub { -webkit-mask: none; mask: none; border: 1px dashed ButtonText; color: ButtonText; }
  .ticket__stub--active { background: Highlight; color: HighlightText; }
}
</style>
