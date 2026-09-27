<script setup lang="ts">
import { computed, provide } from "vue";
import Sticker from "@/components/primatives/Sticker";
import { noteColorResolverKey, staticNoteColorResolver } from "@/components/primatives/noteColorContext";
import type { LabPaper } from "@/types/primitivesLab";
import FocusedPoster from "../../focused/FocusedPoster.vue";
import "../../focused/focused-page.css";
import { PRIMITIVE_LAB_UNITS } from "./labUnits";

/*
 * Guide-only design lab for the Primitives layer. Every direction mounts
 * beside the production unit from its real source. `?unit=<id>` narrows the
 * page to one unit for true-size review and captures.
 */
const query = new URLSearchParams(window.location.search);
const onlyUnit = query.get("unit");
const units = computed(() => PRIMITIVE_LAB_UNITS.filter((unit) => !onlyUnit || unit.id === onlyUnit));

// Production Note and every lab Note read the same static Music Color resolver.
provide(noteColorResolverKey, staticNoteColorResolver);

const stickerColor = (paper: LabPaper) => (paper === "cobalt" ? "ivory" : paper);
</script>

<template>
  <main class="plab focused-page guide-paper--tomato">
    <FocusedPoster layer="primitives" unit-id="primitives-lab" kicker="Design lab · guide only" title="Primitives Lab">
      <p>
        Reimagined directions for the Primitives layer, each an idea rather than a variation, mounted beside
        the accepted production unit from its real source and judged against the design bible: the playing
        zone is hardware with paper stuck onto it, and its only colour comes from the music.
      </p>
    </FocusedPoster>

    <nav class="plab__nav" aria-label="Lab units">
      <a v-for="unit in PRIMITIVE_LAB_UNITS" :key="unit.id" class="guide-chip" :href="`?unit=${unit.id}`">{{ unit.name }}</a>
      <a v-if="onlyUnit" class="guide-chip" href="?">All units</a>
    </nav>

    <div class="focused-page__body">
      <section v-for="unit in units" :id="`lab-${unit.id}`" :key="unit.id" class="plab-unit">
        <header class="plab-unit__head">
          <h2 class="plab-unit__title">{{ unit.name }}</h2>
          <p class="plab-unit__meta">
            {{ unit.leaveAlone ? "Left alone" : `${unit.directions.length} directions` }} · <code>{{ unit.source }}</code>
          </p>
          <p class="plab-unit__reading">{{ unit.reading }}</p>
        </header>

        <div v-if="unit.leaveAlone" class="focused-sheet plab-sheet">
          <header class="focused-sheet__head">
            <div>
              <p class="focused-sheet__source">Production · {{ unit.source }}</p>
              <h3 class="focused-sheet__title">Keep as is</h3>
            </div>
            <Sticker variant="fill" color="ivory">Accepted</Sticker>
          </header>
          <p class="focused-sheet__prose">{{ unit.leaveAlone }}</p>
          <component :is="unit.bench" />
        </div>

        <div v-else class="plab-unit__sheets">
          <article :id="`lab-${unit.id}-current`" class="focused-sheet plab-sheet plab-sheet--current">
            <header class="focused-sheet__head">
              <div>
                <p class="focused-sheet__source">Production · {{ unit.source }}</p>
                <h3 class="focused-sheet__title">Accepted</h3>
              </div>
              <Sticker variant="fill" color="ivory">Shipping</Sticker>
            </header>
            <template v-if="unit.id === 'knob'">
              <h4 class="plab-sheet__subhead">Analog Ring</h4>
              <component :is="unit.bench" visual="ring" />
              <h4 class="plab-sheet__subhead">Digital Arc</h4>
              <component :is="unit.bench" visual="arc" />
            </template>
            <component
              :is="unit.bench"
              v-else
              :component="unit.production"
              :pinned="unit.id === 'tabs' ? { geometry: 'tab' } : undefined"
            />
          </article>

          <article
            v-for="direction in unit.directions"
            :id="`lab-${unit.id}-${direction.id}`"
            :key="direction.id"
            class="focused-sheet plab-sheet"
            :class="`guide-paper--${direction.paper}`"
          >
            <header class="focused-sheet__head">
              <div>
                <p class="focused-sheet__source">Direction {{ direction.letter }} · lab/primitives/{{ unit.id }}/</p>
                <h3 class="focused-sheet__title">{{ direction.name }}</h3>
              </div>
              <Sticker variant="fill" :color="stickerColor(direction.paper)">{{ direction.letter }}</Sticker>
            </header>
            <p class="plab-bible" :class="`plab-bible--${direction.bible.fit}`">
              <span class="plab-bible__chip">{{ direction.bible.zone }}</span>
              <span class="plab-bible__chip">{{ direction.bible.role }}</span>
              <span class="plab-bible__chip plab-bible__chip--fit">{{ direction.bible.fit === "fits" ? "Fits the bible" : "Caution" }}</span>
              <span class="plab-bible__note">{{ direction.bible.note }}</span>
            </p>
            <p class="focused-sheet__prose">{{ direction.idea }}</p>
            <component :is="unit.bench" :component="direction.component" />
            <dl class="focused-facts">
              <div><dt>Better because</dt><dd>{{ direction.better }}</dd></div>
              <div><dt>Risks</dt><dd>{{ direction.risks }}</dd></div>
            </dl>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.plab__nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3);
  max-width: 1240px;
  margin: 0 auto;
  padding: var(--s-7) var(--s-6) 0;
}

.plab-unit { display: grid; gap: var(--s-7); scroll-margin-top: var(--s-10); }

.plab-unit__title {
  margin: 0;
  color: var(--ivory);
  font: 700 clamp(44px, 9vw, 96px)/.9 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.plab-unit__meta {
  margin: var(--s-3) 0 0;
  color: var(--ivory-3);
  font: var(--t-body-s-mono);
}

.plab-unit__meta code { color: var(--ivory-2); font: inherit; }

.plab-unit__reading {
  max-width: 70ch;
  margin: var(--s-4) 0 0;
  color: var(--ivory);
  font: var(--t-body-s-mono);
}

.plab-bible {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-3);
  margin: 0;
}

.plab-bible__chip {
  padding: 4px 8px 3px;
  background: var(--ink-4);
  color: var(--ivory-2);
  font: 700 12px/1 var(--font-display);
  letter-spacing: .08em;
  text-transform: uppercase;
}

.plab-bible--fits .plab-bible__chip--fit { background: var(--ivory); color: var(--ink); }
.plab-bible--caution .plab-bible__chip--fit { background: var(--brass); color: var(--brass-edge); }

.plab-bible__note {
  color: var(--ivory-3);
  font: var(--t-caption);
}

.plab-sheet :deep(.plab-zone) {
  grid-column: 1 / -1;
  margin: var(--s-3) 0 0;
  padding-bottom: var(--s-2);
  color: var(--ivory);
  font: 700 16px/1 var(--font-display);
  letter-spacing: .08em;
  text-transform: uppercase;
  box-shadow: inset 0 -2px 0 var(--ivory-4);
}

.plab-sheet :deep(.plab-zone--brand) { box-shadow: inset 0 -2px 0 var(--guide-paper, var(--tomato)); }

.plab-unit__sheets {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--s-9);
}

@media (min-width: 1100px) {
  .plab-unit__sheets { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.plab-sheet--current::before { background: var(--ivory); }

.plab-sheet__subhead {
  margin: 0;
  color: var(--ivory-2);
  font: 700 18px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.plab-sheet :deep(.plab-bench) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
  gap: var(--s-5);
}
</style>
