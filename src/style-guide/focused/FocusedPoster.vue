<script setup lang="ts">
import { computed } from "vue";
import Mark from "@/components/primatives/Mark.vue";
import type { GuideLayerId } from "@/types/styleGuide";
import { guideLayer, guideLayerHref } from "../guideCatalog";
import CutHeadline from "../shell/CutHeadline.vue";

const props = withDefaults(
  defineProps<{
    /** Layer the focused unit belongs to; drives the paper, number, and back link. */
    layer: GuideLayerId;
    /** Unit id on the layer page, for the back link anchor. */
    unitId: string;
    /** Cut-paper headline text. */
    title: string;
    /** Short taped kicker above the headline. */
    kicker: string;
    /** Transparent band lets a live canvas (Stage) read through the torn paper. */
    compact?: boolean;
  }>(),
  { compact: false },
);

const layerInfo = computed(() => guideLayer(props.layer));

// Same rhythm as the layer bands: Ink scraps on light papers, Ivory on dark ones.
const papers = computed(() => {
  const color = layerInfo.value?.color;
  return color === "bone" || color === "mustard" || color === "tomato"
    ? (["ink", "ivory", "ink", "ink", "ivory"] as const)
    : (["ivory", "ink", "ivory", "ivory", "ink"] as const);
});

// One cut headline per word so long titles break between words, never mid-word.
// Each word starts further along the paper cycle so the rhythm keeps moving.
const words = computed(() =>
  props.title.split(/\s+/).filter(Boolean).map((word, index) => ({
    word,
    papers: [...papers.value.slice(index * 2 % papers.value.length), ...papers.value.slice(0, index * 2 % papers.value.length)],
  })),
);
</script>

<template>
  <header class="focused-poster" :class="{ 'focused-poster--compact': compact }">
    <span v-if="layerInfo" class="focused-poster__number" aria-hidden="true">{{ layerInfo.number }}</span>
    <span v-if="layerInfo" class="focused-poster__mark" aria-hidden="true">
      <Mark :name="layerInfo.mark" tone="inherit" :size="150" />
    </span>

    <div class="focused-poster__copy">
      <a v-if="layerInfo" class="focused-poster__back" :href="`${guideLayerHref(layer)}#${unitId}`">
        ← {{ layerInfo.number }} {{ layerInfo.title }}
      </a>
      <p class="focused-poster__kicker">{{ kicker }}</p>
      <h1 class="focused-poster__title" :aria-label="title">
        <CutHeadline
          v-for="entry in words"
          :key="entry.word"
          :text="entry.word"
          :papers="entry.papers"
          as="p"
          size="section"
          aria-hidden="true"
        />
      </h1>
      <div v-if="$slots.default" class="focused-poster__blurb">
        <slot />
      </div>
    </div>
  </header>
</template>

<style scoped>
.focused-poster {
  position: relative;
  overflow: hidden;
  padding: var(--s-9) var(--s-6) var(--s-11);
  background: var(--guide-paper);
  color: var(--guide-paper-ink);
  /* Torn bottom edge, matching the layer bands. */
  clip-path: polygon(0 0, 100% 0, 100% 88%, 94% 93%, 88% 89%, 80% 95%, 71% 90%, 63% 96%, 55% 91%, 46% 97%, 38% 92%, 29% 98%, 21% 92%, 13% 97%, 6% 91%, 0 96%);
}

.focused-poster__copy {
  position: relative;
  max-width: 1240px;
  margin: 0 auto;
}

.focused-poster__number {
  position: absolute;
  right: 3vw;
  bottom: -.12em;
  font: 700 clamp(140px, 30vw, 360px)/0.8 var(--font-display);
  color: transparent;
  -webkit-text-stroke: 3px var(--guide-paper-ink);
  opacity: .3;
}

.focused-poster__mark {
  position: absolute;
  top: var(--s-7);
  right: 28vw;
  opacity: .2;
  transform: rotate(-18deg);
}

.focused-poster__back {
  display: inline-block;
  margin-bottom: var(--s-6);
  color: inherit;
  font: var(--t-body-s-mono);
  text-decoration: none;
}

.focused-poster__back:hover,
.focused-poster__back:focus-visible { text-decoration: underline; }

.focused-poster__kicker {
  display: table;
  margin: 0 0 var(--s-5);
  padding: 7px 12px 5px;
  background: var(--ink);
  color: var(--ivory);
  clip-path: var(--clip-tab);
  font: 700 18px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  transform: rotate(var(--rot-sticker));
}

.focused-poster__title {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-4) .28em;
  margin: 0;
  font-size: clamp(40px, 10vw, 112px);
}

.focused-poster__blurb {
  max-width: 52ch;
  margin-top: var(--s-7);
  font: var(--t-body-mono);
}

.focused-poster__blurb :deep(p) { margin: 0; }
.focused-poster__blurb :deep(code) { font: inherit; font-weight: 700; }

.focused-poster--compact { padding-bottom: var(--s-10); }
.focused-poster--compact .focused-poster__title {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-4) .28em;
  margin: 0;
  font-size: clamp(40px, 10vw, 112px);
}

.focused-poster__blurb { margin-top: var(--s-5); }

@media (max-width: 760px) {
  .focused-poster { padding: var(--s-8) var(--s-4) var(--s-10); }
  .focused-poster__mark { display: none; }
  .focused-poster__number { opacity: .16; }
}
</style>
