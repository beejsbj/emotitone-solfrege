<script setup lang="ts">
import BrandLogo from "@/components/uniques/BrandLogo.vue";
import Mark from "@/components/primatives/Mark.vue";
import { GUIDE_LAYERS, guideLayerHref } from "../guideCatalog";
import CutHeadline from "./CutHeadline.vue";
import FloatingMarks, { type FloatingMark } from "./FloatingMarks.vue";

// Each tile is cut from a different authored geometry token and tilt.
const TILE_CUTS = ["var(--clip-offcut)", "var(--clip-tab)", "var(--clip-tile)", "var(--clip-paper-rip)", "var(--clip-tab)", "var(--clip-offcut)"];
const TILE_TILTS = ["var(--rot-tile-2)", "var(--rot-tile-3)", "var(--rot-tile-4)", "var(--rot-tile-5)", "var(--rot-tile-1)", "var(--rot-sticker)"];

const heroMarks: FloatingMark[] = [
  { name: "eighth", x: 8, y: 18, size: 34, rotate: -12, color: "mustard" },
  { name: "star", x: 88, y: 12, size: 26, rotate: 8, color: "cobalt" },
  { name: "zigzag", x: 94, y: 62, size: 40, rotate: 20, color: "tomato" },
  { name: "staccato", x: 2, y: 46, size: 16, rotate: 0, color: "ivory" },
  { name: "sharp", x: 58, y: 8, size: 22, rotate: -8, color: "pine" },
  { name: "wave", x: 44, y: 92, size: 36, rotate: 4, color: "plum" },
];
</script>

<template>
  <main class="guide-index">
    <section class="guide-index__hero">
      <FloatingMarks :marks="heroMarks" />
      <div class="guide-index__hero-copy">
        <CutHeadline text="Emotitone" />
        <p class="guide-index__title">Design System</p>
        <p class="guide-index__tagline">
          Every token, piece, and surface of the instrument — mounted from the same sources the app plays.
        </p>
        <ol class="guide-index__lineage" aria-label="Lineage">
          <li>Tokens</li>
          <li>Primitives</li>
          <li>Compounds</li>
          <li>Compositions</li>
        </ol>
        <p class="guide-index__lineage-note">Uniques stand beside the ladder. Systems run through all of it.</p>
      </div>
      <BrandLogo class="guide-index__logo" layout="mark" size="min(34vw, 300px)" />
    </section>

    <section class="guide-index__layers" aria-label="Layers">
      <a
        v-for="(layer, index) in GUIDE_LAYERS"
        :key="layer.id"
        class="guide-tile"
        :class="`guide-paper--${layer.color}`"
        :href="guideLayerHref(layer.id)"
        :style="{ '--tile-cut': TILE_CUTS[index], '--tile-tilt': TILE_TILTS[index] }"
      >
        <span class="guide-tile__backing" aria-hidden="true" />
        <span class="guide-tile__face">
          <span class="guide-tile__number">{{ layer.number }}</span>
          <span class="guide-tile__title">{{ layer.title }}</span>
          <span class="guide-tile__blurb">{{ layer.blurb }}</span>
          <span class="guide-tile__units">
            {{ layer.units.length }} {{ layer.units.length === 1 ? "unit" : "units" }} ·
            {{ layer.units.map((unit) => unit.name).join(" · ") }}
          </span>
          <span class="guide-tile__mark" aria-hidden="true">
            <Mark :name="layer.mark" tone="inherit" :size="84" />
          </span>
        </span>
      </a>
    </section>
  </main>
</template>

<style scoped>
.guide-index {
  padding: 0 var(--s-6) var(--s-10);
}

.guide-index__hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--s-8);
  max-width: 1240px;
  margin: 0 auto;
  padding: var(--s-10) 0 var(--s-9);
}

.guide-index__hero-copy { position: relative; min-width: 0; }

.guide-index__title {
  margin: var(--s-4) 0 0;
  font: 700 clamp(34px, 7vw, 76px)/0.9 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
}

.guide-index__tagline {
  max-width: 44ch;
  margin: var(--s-6) 0 0;
  font: var(--t-body-mono);
  color: var(--ivory-2);
}

.guide-index__lineage {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  margin: var(--s-8) 0 0;
  padding: 0;
  list-style: none;
}

.guide-index__lineage li {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  font: 700 18px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.guide-index__lineage li:not(:last-child)::after {
  content: "→";
  color: var(--brass);
  font-family: var(--font-mono);
  font-size: 14px;
}

.guide-index__lineage-note {
  margin: var(--s-3) 0 0;
  font: var(--t-caption);
  color: var(--ivory-3);
}

.guide-index__logo { position: relative; }

.guide-index__layers {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 330px), 1fr));
  gap: var(--s-9) var(--s-8);
  max-width: 1240px;
  margin: 0 auto;
}

.guide-tile {
  position: relative;
  display: block;
  min-height: 340px;
  color: var(--guide-paper-ink);
  text-decoration: none;
  transform: rotate(var(--tile-tilt));
  transition: transform var(--dur-ui) var(--ease-swing);
}

.guide-tile__backing,
.guide-tile__face {
  clip-path: var(--tile-cut);
}

.guide-tile__backing {
  position: absolute;
  inset: 0;
}

/* A second sheet of paper under the face: the hard, cut-paper shadow. */
.guide-tile__backing {
  background: var(--ivory);
  transform: translate(8px, 8px);
  transition: transform var(--dur-ui) var(--ease-swing);
}

.guide-tile__face {
  position: relative;
  box-sizing: border-box;
  min-height: inherit;
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  padding: var(--s-8) var(--s-8) var(--s-9);
  background: var(--guide-paper);
  overflow: hidden;
  transition: transform var(--dur-ui) var(--ease-swing);
}

.guide-tile.guide-paper--bone .guide-tile__backing { background: var(--tomato); }

.guide-tile__number {
  font: 700 clamp(64px, 12vw, 96px)/1 var(--font-display);
  color: transparent;
  -webkit-text-stroke: 2px var(--guide-paper-ink);
}

.guide-tile__title {
  margin-top: calc(var(--s-4) * -1);
  font: 700 clamp(40px, 8vw, 56px)/1.05 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.guide-tile__blurb {
  max-width: 30ch;
  font: var(--t-body-s-mono);
}

.guide-tile__units {
  margin-top: auto;
  max-width: 34ch;
  font: var(--t-caption);
  opacity: .78;
}

.guide-tile__mark {
  position: absolute;
  right: var(--s-6);
  top: var(--s-7);
  opacity: .9;
  transform: rotate(-14deg);
  transition: transform var(--dur-panel) var(--ease-swing);
}

.guide-tile:hover,
.guide-tile:focus-visible {
  transform: rotate(0deg);
}

.guide-tile:hover .guide-tile__face,
.guide-tile:focus-visible .guide-tile__face {
  transform: translate(-4px, -4px);
}

.guide-tile:hover .guide-tile__backing,
.guide-tile:focus-visible .guide-tile__backing {
  transform: translate(10px, 10px);
}

.guide-tile:hover .guide-tile__mark,
.guide-tile:focus-visible .guide-tile__mark {
  transform: rotate(10deg) scale(1.12);
}

.guide-tile:focus-visible { outline: none; }
.guide-tile:focus-visible .guide-tile__face { box-shadow: inset 0 0 0 3px var(--guide-paper-ink); }

@media (max-width: 760px) {
  .guide-index { padding: 0 var(--s-4) var(--s-10); }
  .guide-index__hero { grid-template-columns: 1fr; padding-top: var(--s-8); }
  .guide-index__logo { display: none; }
  .guide-tile { min-height: 280px; }
  .guide-tile__face { padding: var(--s-7) var(--s-6) var(--s-9); }
}

@media (prefers-reduced-motion: reduce) {
  .guide-tile,
  .guide-tile__face,
  .guide-tile__backing,
  .guide-tile__mark { transition: none; }
}
</style>
