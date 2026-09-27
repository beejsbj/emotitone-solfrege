<script setup lang="ts">
import { defineAsyncComponent, provide } from "vue";
import type { GuideLayer, GuideUnit } from "@/types/styleGuide";
import { GUIDE_UNIT_DENSITY } from "./guideContext";

const props = defineProps<{
  layer: GuideLayer;
  unit: GuideUnit;
  index: number;
}>();

provide(GUIDE_UNIT_DENSITY, props.unit.density);

const Specimen = props.unit.specimen ? defineAsyncComponent(props.unit.specimen) : undefined;
const showFocusedLink = Boolean(props.unit.focusedHref && props.unit.specimen);
const ordinal = `${props.layer.number}.${String(props.index + 1).padStart(2, "0")}`;
</script>

<template>
  <section :id="unit.id" class="guide-unit" :aria-labelledby="`${unit.id}-title`">
    <header class="guide-unit__header">
      <span class="guide-unit__ordinal">{{ ordinal }}</span>
      <h2 :id="`${unit.id}-title`" class="guide-unit__name">{{ unit.name }}</h2>
      <a v-if="showFocusedLink" class="guide-unit__focused" :href="unit.focusedHref">
        Open the focused page →
      </a>
    </header>

    <div v-if="Specimen" class="guide-unit__sheet">
      <Specimen />
    </div>

    <a v-else-if="unit.focusedHref" class="guide-unit__portal" :href="unit.focusedHref">
      <span class="guide-unit__portal-summary">{{ unit.summary }}</span>
      <span class="guide-unit__portal-cta">Open {{ unit.name }} →</span>
    </a>
  </section>
</template>

<style scoped>
.guide-unit {
  scroll-margin-top: calc(var(--guide-masthead-height, 56px) + 56px);
  max-width: 1240px;
  margin: 0 auto;
  padding: var(--s-10) 0 0;
}

.guide-unit__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--s-2) var(--s-5);
  margin-bottom: var(--s-6);
}

.guide-unit__ordinal {
  display: inline-block;
  padding: 6px 10px 4px;
  background: var(--guide-paper);
  color: var(--guide-paper-ink);
  clip-path: var(--clip-tab);
  font: 600 13px/1 var(--font-mono);
  transform: rotate(var(--rot-sticker));
  align-self: center;
}

.guide-unit__name {
  margin: 0;
  font: 700 clamp(40px, 8vw, 72px)/0.9 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
}

.guide-unit__focused {
  margin-left: auto;
  color: var(--guide-paper-text);
  font: var(--t-mono);
  text-decoration: none;
}

.guide-unit__focused:hover { text-decoration: underline; }

/* The unit's sheet: one filled surface, no border. Specimen stages inside
   it are plain Ink wells — the product's own background. */
.guide-unit__sheet {
  position: relative;
  padding: var(--s-8);
  background: var(--ink-2);
}

/* Some legacy specimens still have fixed internals; let them scroll rather
   than be clipped until each layer is migrated. */
.guide-unit__sheet > * {
  max-width: 100%;
  overflow-x: auto;
}

.guide-unit__sheet::before {
  content: "";
  position: absolute;
  top: -6px;
  left: var(--s-8);
  width: 88px;
  height: 12px;
  background: var(--guide-paper);
  clip-path: var(--clip-paper-rip);
  transform: rotate(var(--rot-tile-3));
}

.guide-unit__portal {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-6);
  padding: var(--s-9) var(--s-8);
  background: var(--guide-paper);
  color: var(--guide-paper-ink);
  clip-path: var(--clip-offcut);
  text-decoration: none;
  transition: transform var(--dur-ui) var(--ease-swing);
}

.guide-unit__portal:hover,
.guide-unit__portal:focus-visible { transform: rotate(var(--rot-tile-2)) translateY(-2px); }

.guide-unit__portal-summary {
  max-width: 52ch;
  font: var(--t-body-mono);
}

.guide-unit__portal-cta {
  font: 700 28px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

@media (max-width: 760px) {
  .guide-unit { padding-top: var(--s-9); }
  .guide-unit__sheet { padding: var(--s-7) var(--s-5); }
  .guide-unit__focused { margin-left: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .guide-unit__portal { transition: none; }
}
</style>
