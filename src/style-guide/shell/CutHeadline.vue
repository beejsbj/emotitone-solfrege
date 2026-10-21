<script setup lang="ts">
import { computed } from "vue";
import type { GuideLayerColor } from "@/types/styleGuide";

type ScrapColor = GuideLayerColor | "ivory" | "ink" | "brass";

const props = withDefaults(
  defineProps<{
    text: string;
    /** Paper colours cycled across letters. */
    papers?: ScrapColor[];
    /** Rendered element; headlines stay semantic. */
    as?: "h1" | "h2" | "p";
    size?: "hero" | "section";
  }>(),
  {
    papers: () => ["ivory", "tomato", "mustard", "ivory", "plum", "cobalt", "pine"],
    as: "h1",
    size: "hero",
  },
);

// Authored, not random: a stable ransom-note rhythm that reads the same on every load.
const TILTS = [-4, 3, -1.5, 5, -3, 2, -5, 1, 4, -2.5];
const LIFTS = [0, -0.06, 0.04, -0.02, 0.07, -0.05, 0.02, 0.05, -0.03, 0];
const CUTS = [
  "polygon(4% 2%, 97% 0%, 100% 94%, 2% 100%)",
  "polygon(0% 6%, 100% 0%, 96% 100%, 5% 95%)",
  "polygon(3% 0%, 100% 4%, 98% 97%, 0% 100%)",
  "polygon(6% 3%, 94% 0%, 100% 100%, 0% 92%)",
  "polygon(0% 0%, 96% 5%, 100% 96%, 4% 100%)",
];

const letters = computed(() => {
  let visible = 0;
  return [...props.text].map((char, index) => {
    if (char === " ") return { key: index, char, space: true as const };
    const i = visible++;
    const paper = props.papers[i % props.papers.length];
    return {
      key: index,
      char,
      space: false as const,
      style: {
        "--scrap-paper": `var(--${paper})`,
        "--scrap-ink": paper === "ink" || paper === "pine" || paper === "plum" || paper === "cobalt" ? "var(--ivory)" : "var(--ink)",
        "--scrap-tilt": `${TILTS[i % TILTS.length]}deg`,
        "--scrap-lift": `${LIFTS[i % LIFTS.length]}em`,
        "--scrap-cut": CUTS[i % CUTS.length],
        "--scrap-delay": `${i * 45}ms`,
      },
    };
  });
});
</script>

<template>
  <component :is="as" class="cut-headline" :class="`cut-headline--${size}`" :aria-label="text">
    <template v-for="letter in letters" :key="letter.key">
      <span v-if="letter.space" class="cut-headline__space" aria-hidden="true" />
      <span v-else class="cut-headline__scrap" :style="letter.style" aria-hidden="true">{{ letter.char }}</span>
    </template>
  </component>
</template>

<style scoped>
.cut-headline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .04em;
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1;
  text-transform: uppercase;
}

.cut-headline--hero { font-size: clamp(44px, 12vw, 128px); }
.cut-headline--section { font-size: clamp(40px, 10vw, 112px); }

.cut-headline__space { width: .28em; }

.cut-headline__scrap {
  display: inline-block;
  padding: .06em .09em 0;
  background: var(--scrap-paper);
  color: var(--scrap-ink);
  clip-path: var(--scrap-cut);
  transform: translateY(var(--scrap-lift)) rotate(var(--scrap-tilt));
  animation: scrap-drop var(--dur-panel) var(--ease-swing) var(--scrap-delay) both;
}

@keyframes scrap-drop {
  0% { opacity: 0; transform: translateY(-.35em) rotate(calc(var(--scrap-tilt) * -3)); }
  100% { opacity: 1; transform: translateY(var(--scrap-lift)) rotate(var(--scrap-tilt)); }
}

@media (prefers-reduced-motion: reduce) {
  .cut-headline__scrap { animation: none; }
}
</style>
