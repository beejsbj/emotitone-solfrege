<script setup lang="ts">
import { computed } from "vue";
import Mark from "@/components/primatives/Mark.vue";
import type { GuideLayer } from "@/types/styleGuide";
import CutHeadline from "./CutHeadline.vue";
import GuideUnitSection from "./GuideUnitSection.vue";

const props = defineProps<{ layer: GuideLayer }>();

// Letters alternate Ink and Ivory scraps pasted onto the layer's paper band.
const headlinePapers = computed(() =>
  props.layer.color === "bone" || props.layer.color === "mustard" || props.layer.color === "tomato"
    ? (["ink", "ivory", "ink", "ink", "ivory"] as const)
    : (["ivory", "ink", "ivory", "ivory", "ink"] as const),
);
</script>

<template>
  <main class="guide-layer" :class="`guide-paper--${layer.color}`">
    <section class="guide-layer__band">
      <span class="guide-layer__number" aria-hidden="true">{{ layer.number }}</span>
      <span class="guide-layer__mark" aria-hidden="true">
        <Mark :name="layer.mark" tone="inherit" :size="180" />
      </span>
      <div class="guide-layer__band-copy">
        <CutHeadline :text="layer.title" :papers="[...headlinePapers]" size="section" />
        <p class="guide-layer__blurb">{{ layer.blurb }}</p>
      </div>
    </section>

    <div class="guide-layer__jump-bar">
      <nav class="guide-layer__jump" :aria-label="`${layer.title} units`">
        <a v-for="unit in layer.units" :key="unit.id" :href="`#${unit.id}`">{{ unit.name }}</a>
      </nav>
    </div>

    <div class="guide-layer__units">
      <GuideUnitSection
        v-for="(unit, index) in layer.units"
        :key="unit.id"
        :layer="layer"
        :unit="unit"
        :index="index"
      />
    </div>
  </main>
</template>

<style scoped>
.guide-layer {
  padding-bottom: var(--s-10);
}

.guide-layer__band {
  position: relative;
  overflow: hidden;
  padding: var(--s-10) var(--s-6) var(--s-11);
  background: var(--guide-paper);
  color: var(--guide-paper-ink);
  /* Torn bottom edge: the band is a strip ripped from a poster. */
  clip-path: polygon(0 0, 100% 0, 100% 88%, 94% 93%, 88% 89%, 80% 95%, 71% 90%, 63% 96%, 55% 91%, 46% 97%, 38% 92%, 29% 98%, 21% 92%, 13% 97%, 6% 91%, 0 96%);
}

.guide-layer__band-copy {
  position: relative;
  max-width: 1240px;
  margin: 0 auto;
}

.guide-layer__number {
  position: absolute;
  right: 3vw;
  bottom: -.12em;
  font: 700 clamp(160px, 34vw, 420px)/0.8 var(--font-display);
  color: transparent;
  -webkit-text-stroke: 3px var(--guide-paper-ink);
  opacity: .35;
}

.guide-layer__mark {
  position: absolute;
  top: var(--s-7);
  right: 30vw;
  opacity: .22;
  transform: rotate(-18deg);
}

.guide-layer__blurb {
  max-width: 46ch;
  margin: var(--s-7) 0 0;
  font: var(--t-body-mono);
}

.guide-layer__jump-bar {
  position: sticky;
  top: var(--guide-masthead-height);
  z-index: 30;
  background: var(--ink);
}

.guide-layer__jump {
  display: flex;
  gap: var(--s-2) var(--s-5);
  max-width: 1240px;
  margin: 0 auto;
  padding: var(--s-4) var(--s-6);
  overflow-x: auto;
  scrollbar-width: none;
}

.guide-layer__jump a {
  flex: none;
  color: var(--ivory-3);
  font: 700 17px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-decoration: none;
  text-transform: uppercase;
  transition: color var(--dur-tap) var(--ease-stab);
}

.guide-layer__jump a:hover,
.guide-layer__jump a:focus-visible { color: var(--guide-paper-text); }

.guide-layer__units {
  padding: 0 var(--s-6);
}

@media (max-width: 760px) {
  .guide-layer__band { padding: var(--s-9) var(--s-4) var(--s-10); }
  .guide-layer__mark { display: none; }
  .guide-layer__jump { padding: var(--s-4); }
  .guide-layer__units { padding: 0 var(--s-4); }
}
</style>
