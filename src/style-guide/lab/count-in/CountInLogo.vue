<script setup lang="ts">
import type { LabLogoProps } from "@/types/styleGuide";
import LabMarkGlyph from "../LabMarkGlyph.vue";

/**
 * Direction A · Paste-Up. Two gig-poster scraps slapped on the wall: an Ink E
 * on Mustard, an Ivory T on Tomato, counted in by four beat dots.
 */
const props = withDefaults(defineProps<LabLogoProps>(), {
  surface: "ink",
  variant: "full",
  lockup: false,
  size: "160px",
  live: false,
});

const beats = [12, 23, 34, 45];
</script>

<template>
  <div
    class="count-logo"
    :class="[`count-logo--on-${props.surface}`, { 'count-logo--lockup': lockup, 'count-logo--live': live }]"
    :style="{ '--count-logo-size': size }"
    role="img"
    aria-label="EmotiTone"
  >
    <svg class="count-logo__mark" viewBox="0 0 120 124" aria-hidden="true">
      <g class="count-logo__beats">
        <LabMarkGlyph
          v-for="(x, index) in beats"
          :key="x"
          class="count-logo__beat"
          :style="{ '--beat-index': index }"
          name="disk"
          :x="x"
          :y="8"
          :size="index === 0 ? 10 : 8"
        />
      </g>

      <g class="count-logo__scrap count-logo__scrap--e">
        <polygon class="count-logo__paper count-logo__paper--e" points="6,20 66,14 70,102 10,108" />
        <polygon class="count-logo__glyph--e" points="16,28 29,27 31,97 18,98" />
        <polygon class="count-logo__glyph--e" points="29,27 51,25 51,38 29,39" />
        <polygon class="count-logo__glyph--e" points="29,55 47,54 47,66 30,67" />
        <polygon class="count-logo__glyph--e" points="30,84 51,82 52,95 31,97" />
      </g>

      <g class="count-logo__scrap count-logo__scrap--t">
        <polygon class="count-logo__paper count-logo__paper--t" points="54,34 116,28 113,118 57,121" />
        <polygon class="count-logo__glyph--t" points="61,41 109,37 109,52 61,55" />
        <polygon class="count-logo__glyph--t" points="78,52 93,51 91,112 77,113" />
      </g>

      <template v-if="variant === 'full'">
        <LabMarkGlyph class="count-logo__sprinkle count-logo__sprinkle--wave" name="wave" :x="104" :y="14" :size="16" :rotate="-8" />
        <LabMarkGlyph class="count-logo__sprinkle count-logo__sprinkle--star" name="star" :x="14" :y="116" :size="12" :rotate="10" />
        <LabMarkGlyph class="count-logo__sprinkle count-logo__sprinkle--accent" name="sharp" :x="40" :y="115" :size="13" :rotate="-6" />
      </template>
    </svg>

    <strong v-if="lockup" class="count-logo__wordmark">
      <span>EMOTI</span><span class="count-logo__tab">TONE</span>
    </strong>
  </div>
</template>

<style scoped>
.count-logo {
  --count-logo-dot: var(--ivory);
  --count-logo-word: var(--ivory);
  display: inline-flex;
  align-items: center;
  gap: calc(var(--count-logo-size) * .14);
  max-width: 100%;
}

.count-logo--on-bone {
  --count-logo-dot: var(--ink);
  --count-logo-word: var(--ink);
}

.count-logo__mark {
  display: block;
  width: var(--count-logo-size);
  max-width: 100%;
  height: auto;
  overflow: visible;
}

.count-logo__paper--e { fill: var(--mustard); }
.count-logo__paper--t { fill: var(--tomato); }
.count-logo__glyph--e { fill: var(--ink); }
.count-logo__glyph--t { fill: var(--ivory); }
.count-logo__beat { fill: var(--count-logo-dot); }
.count-logo__beat:first-child { fill: var(--tomato); }
.count-logo__sprinkle--wave { fill: var(--cobalt); }
.count-logo__sprinkle--star { fill: var(--plum); }
.count-logo__sprinkle--accent { fill: var(--count-logo-dot); }

.count-logo__wordmark {
  display: inline-flex;
  align-items: center;
  color: var(--count-logo-word);
  font: 700 calc(var(--count-logo-size) * .42)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  white-space: nowrap;
}

.count-logo__tab {
  margin-left: .06em;
  padding: .1em .14em .04em;
  line-height: 1.1;
  background: var(--tomato);
  color: var(--ivory);
  clip-path: var(--clip-tab);
  transform: rotate(var(--rot-sticker));
}

/* Live: the dots count the band in, and each scrap takes the beat it lands on. */
.count-logo--live .count-logo__beat {
  transform-box: fill-box;
  transform-origin: center;
  animation: count-logo-beat calc(var(--lab-beat, 577ms) * 4) var(--ease-stab) calc(var(--beat-index) * var(--lab-beat, 577ms)) infinite;
}

.count-logo--live .count-logo__scrap {
  transform-box: fill-box;
  transform-origin: 50% 90%;
  animation: count-logo-slap calc(var(--lab-beat, 577ms) * 2) var(--ease-stab) infinite;
}

.count-logo--live .count-logo__scrap--t { animation-delay: var(--lab-beat, 577ms); }

@keyframes count-logo-beat {
  0% { opacity: 1; transform: scale(1.5); }
  22%, 100% { opacity: .38; transform: scale(1); }
}

@keyframes count-logo-slap {
  0% { transform: rotate(-1.4deg) scale(1.025); }
  30%, 100% { transform: rotate(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .count-logo--live .count-logo__beat,
  .count-logo--live .count-logo__scrap { animation: none; }
}

@media (forced-colors: active) {
  .count-logo__paper--e,
  .count-logo__paper--t { fill: CanvasText; }
  .count-logo__glyph--e,
  .count-logo__glyph--t { fill: Canvas; }
}
</style>
