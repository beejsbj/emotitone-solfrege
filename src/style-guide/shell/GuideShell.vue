<script setup lang="ts">
import BrandLogo from "@/components/uniques/BrandLogo.vue";
import type { GuideLayerId } from "@/types/styleGuide";
import { GUIDE_LAYERS, guideLayerHref } from "../guideCatalog";

defineProps<{
  activeLayer?: GuideLayerId;
}>();
</script>

<template>
  <div class="guide-shell">
    <header class="guide-shell__masthead">
      <a class="guide-shell__home" href="/style-guide" aria-label="Design system index">
        <BrandLogo layout="mark" :size="38" accessible-label="EmotiTone" />
        <span class="guide-shell__wordmark">Design<br>System</span>
      </a>
      <nav class="guide-shell__nav" aria-label="Design system layers">
        <a
          v-for="layer in GUIDE_LAYERS"
          :key="layer.id"
          class="guide-shell__chip"
          :class="[`guide-paper--${layer.color}`, { 'is-active': layer.id === activeLayer }]"
          :href="guideLayerHref(layer.id)"
          :aria-current="layer.id === activeLayer ? 'page' : undefined"
        >
          <span class="guide-shell__chip-number">{{ layer.number }}</span>
          {{ layer.title }}
        </a>
      </nav>
    </header>

    <slot />

    <footer class="guide-shell__footer">
      <span>Cut-paper jazz, lit by a synth.</span>
      <a href="/">Play the instrument →</a>
    </footer>
  </div>
</template>

<style scoped>
.guide-shell {
  min-height: 100vh;
  background: var(--ink);
  color: var(--ivory);
  overflow-x: clip;
}

.guide-shell {
  --guide-masthead-height: 56px;
}

.guide-shell__masthead {
  position: sticky;
  top: 0;
  z-index: 40;
  box-sizing: border-box;
  height: var(--guide-masthead-height);
  display: flex;
  align-items: center;
  gap: var(--s-5);
  padding: var(--s-3) var(--s-6);
  background: var(--ink);
  border-bottom: 1px solid var(--hairline);
}

.guide-shell__home {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--s-3);
  color: var(--ivory);
  text-decoration: none;
}

.guide-shell__wordmark {
  font: 700 15px/0.9 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.guide-shell__nav {
  display: flex;
  flex: 1;
  gap: var(--s-3);
  min-width: 0;
  padding: var(--s-2) var(--s-1);
  overflow-x: auto;
  scrollbar-width: none;
}

.guide-shell__chip {
  display: inline-flex;
  flex: none;
  align-items: baseline;
  gap: var(--s-2);
  padding: 7px 12px 5px;
  background: transparent;
  color: var(--ivory-2);
  box-shadow: inset 0 0 0 1.5px var(--guide-paper);
  clip-path: var(--clip-tab);
  font: 700 16px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-decoration: none;
  text-transform: uppercase;
  transform: rotate(var(--rot-tile-2));
  transition: transform var(--dur-ui) var(--ease-swing), background-color var(--dur-tap) var(--ease-stab), color var(--dur-tap) var(--ease-stab);
}

.guide-shell__chip:nth-child(even) { transform: rotate(var(--rot-tile-3)); }

.guide-shell__chip:hover,
.guide-shell__chip:focus-visible,
.guide-shell__chip.is-active {
  background: var(--guide-paper);
  color: var(--guide-paper-ink);
  transform: rotate(0deg) translateY(-1px);
}

.guide-shell__chip:focus-visible { outline: 2px solid var(--ivory); outline-offset: 3px; }

.guide-shell__chip-number {
  font: 500 10px/1 var(--font-mono);
  opacity: .75;
}

.guide-shell__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--s-4);
  padding: var(--s-9) var(--s-6);
  color: var(--ivory-3);
  font: var(--t-mono);
}

.guide-shell__footer a {
  color: var(--brass);
  text-decoration: none;
}

@media (max-width: 640px) {
  .guide-shell__masthead { padding: var(--s-3) var(--s-4); }
  .guide-shell__wordmark { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .guide-shell__chip { transition: none; }
}
</style>
