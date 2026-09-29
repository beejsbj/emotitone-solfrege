<script setup lang="ts">
import { computed, provide, ref } from "vue";
import Sticker from "@/components/primatives/Sticker";
import { noteColorResolverKey, staticNoteColorResolver } from "@/components/primatives/noteColorContext";
import type { HarmonyAlteration } from "@/domain/harmony";
import type { LabPaper } from "@/types/uniquesLab";
import FocusedPoster from "../../focused/FocusedPoster.vue";
import "../../focused/focused-page.css";
import CodeStripBench from "./code-strip/CodeStripBench.vue";
import DrawerBench from "./drawer/DrawerBench.vue";
import LabJoystick from "./joystick/LabJoystick.vue";
import LabCell from "./LabCell.vue";
import { UNIQUE_LAB_UNITS } from "./labUnits";

/*
 * Guide-only design lab for the Uniques layer. Every direction keeps the real
 * production component mounted beside the accepted unit. `?unit=<id>` narrows
 * the page to one unit; each unit ends with a side-by-side strip.
 */
const query = new URLSearchParams(window.location.search);
const onlyUnit = query.get("unit");
const units = computed(() => UNIQUE_LAB_UNITS.filter((unit) => !onlyUnit || unit.id === onlyUnit));

provide(noteColorResolverKey, staticNoteColorResolver);

const stickerColor = (paper: LabPaper) => (paper === "cobalt" ? "ivory" : paper);
const compare = ref<HarmonyAlteration>("dominant7");
</script>

<template>
  <main class="ulab focused-page guide-paper--plum">
    <FocusedPoster layer="uniques" unit-id="uniques-lab" kicker="Design lab · guide only" title="Uniques Lab">
      <p>
        Reimagined directions for the Uniques layer, each an idea rather than a variation, mounted beside the
        accepted production unit. Uniques have deep behaviour, so every direction keeps the real component
        mounted and changes only what you see: the playing zone is hardware with paper stuck onto it, and its
        only colour comes from the music.
      </p>
    </FocusedPoster>

    <nav class="ulab__nav" aria-label="Lab units">
      <a v-for="unit in UNIQUE_LAB_UNITS" :key="unit.id" class="guide-chip" :href="`?unit=${unit.id}`">{{ unit.name }}</a>
      <a v-if="onlyUnit" class="guide-chip" href="?">All units</a>
    </nav>

    <div class="focused-page__body">
      <section v-for="unit in units" :id="`lab-${unit.id}`" :key="unit.id" class="ulab-unit">
        <header class="ulab-unit__head">
          <h2 class="ulab-unit__title">{{ unit.name }}</h2>
          <p class="ulab-unit__meta">
            {{ unit.leaveAlone ? "Left alone" : `${unit.directions.length} directions` }} · <code>{{ unit.source }}</code>
          </p>
          <p class="ulab-unit__reading">{{ unit.reading }}</p>
        </header>

        <div v-if="unit.leaveAlone" class="focused-sheet ulab-sheet">
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

        <div v-else class="ulab-unit__sheets">
          <article :id="`lab-${unit.id}-current`" class="focused-sheet ulab-sheet ulab-sheet--current">
            <header class="focused-sheet__head">
              <div>
                <p class="focused-sheet__source">Production · {{ unit.source }}</p>
                <h3 class="focused-sheet__title">Accepted</h3>
              </div>
              <Sticker variant="fill" color="ivory">Shipping</Sticker>
            </header>
            <component :is="unit.bench" />
          </article>

          <article
            v-for="direction in unit.directions"
            :id="`lab-${unit.id}-${direction.id}`"
            :key="direction.id"
            class="focused-sheet ulab-sheet"
            :class="`guide-paper--${direction.paper}`"
          >
            <header class="focused-sheet__head">
              <div>
                <p class="focused-sheet__source">
                  Direction {{ direction.letter }} · lab/uniques/{{ unit.id }}/<template v-if="direction.editions"> · replaces {{ direction.editions.join(" + ") }}</template>
                </p>
                <h3 class="focused-sheet__title">{{ direction.name }}</h3>
              </div>
              <Sticker variant="fill" :color="stickerColor(direction.paper)">{{ direction.letter }}</Sticker>
            </header>
            <p class="ulab-bible" :class="`ulab-bible--${direction.bible.fit}`">
              <span class="ulab-bible__chip">{{ direction.bible.zone }}</span>
              <span class="ulab-bible__chip">{{ direction.bible.role }}</span>
              <span class="ulab-bible__chip ulab-bible__chip--fit">{{ direction.bible.fit === "fits" ? "Fits the bible" : "Caution" }}</span>
              <span class="ulab-bible__note">{{ direction.bible.note }}</span>
            </p>
            <p class="focused-sheet__prose">{{ direction.idea }}</p>
            <component :is="unit.bench" :face="direction.face" :editions="direction.editions" :skin="direction.skin" />
            <dl class="focused-facts">
              <div><dt>Better because</dt><dd>{{ direction.better }}</dd></div>
              <div><dt>Risks</dt><dd>{{ direction.risks }}</dd></div>
            </dl>
          </article>
        </div>

        <section v-if="!unit.leaveAlone && unit.directions.length" :id="`lab-${unit.id}-compare`" class="focused-sheet ulab-sheet">
          <header class="focused-sheet__head">
            <div>
              <p class="focused-sheet__source">Production beside every direction</p>
              <h3 class="focused-sheet__title">Side by side</h3>
            </div>
          </header>
          <div v-if="unit.id === 'joystick'" class="ulab-compare ulab-compare--joystick">
            <LabCell caption="Production · Analog"><LabJoystick v-model="compare" visual="analog" size="88px" /></LabCell>
            <LabCell caption="Production · Digital"><LabJoystick v-model="compare" visual="digital" size="88px" /></LabCell>
            <LabCell v-for="direction in unit.directions" :key="direction.id" :caption="`${direction.letter} · ${direction.name}`">
              <LabJoystick v-model="compare" :face="direction.face" :visual="direction.editions?.[0] ?? 'analog'" size="88px" />
            </LabCell>
          </div>
          <div v-else-if="unit.id === 'drawer'" class="ulab-compare ulab-compare--drawer">
            <LabCell caption="Production" tall><DrawerBench /></LabCell>
            <LabCell v-for="direction in unit.directions" :key="direction.id" :caption="`${direction.letter} · ${direction.name}`" tall>
              <DrawerBench :skin="direction.skin" />
            </LabCell>
          </div>
          <div v-else-if="unit.id === 'code-strip'" class="ulab-compare ulab-compare--strip">
            <CodeStripBench only-playing />
            <CodeStripBench v-for="direction in unit.directions" :key="direction.id" :skin="direction.skin" only-playing :label="`${direction.letter} · ${direction.name}`" />
          </div>
        </section>
      </section>
    </div>
  </main>
</template>

<style scoped>
.ulab__nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3);
  max-width: 1240px;
  margin: 0 auto;
  padding: var(--s-7) var(--s-6) 0;
}

.ulab-unit { display: grid; gap: var(--s-7); scroll-margin-top: var(--s-10); }

.ulab-unit__title {
  margin: 0;
  color: var(--ivory);
  font: 700 clamp(44px, 9vw, 96px)/.9 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.ulab-unit__meta {
  margin: var(--s-5) 0 0;
  color: var(--ivory-3);
  font: var(--t-body-s-mono);
}

.ulab-unit__meta code { color: var(--ivory-2); font: inherit; }

.ulab-unit__reading {
  max-width: 70ch;
  margin: var(--s-4) 0 0;
  color: var(--ivory);
  font: var(--t-body-s-mono);
}

.ulab-bible {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-3);
  margin: 0;
}

.ulab-bible__chip {
  padding: 4px 8px 3px;
  background: var(--ink-4);
  color: var(--ivory-2);
  font: 700 12px/1 var(--font-display);
  letter-spacing: .08em;
  text-transform: uppercase;
}

.ulab-bible--fits .ulab-bible__chip--fit { background: var(--ivory); color: var(--ink); }
.ulab-bible--caution .ulab-bible__chip--fit { background: var(--brass); color: var(--brass-edge); }

.ulab-bible__note { color: var(--ivory-3); font: var(--t-caption); }

.ulab-unit__sheets {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--s-9);
}

@media (min-width: 1100px) {
  .ulab-unit__sheets { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.ulab-sheet--current::before { background: var(--ivory); }

.ulab-sheet :deep(.ulab-bench) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
  gap: var(--s-5);
}

.ulab-compare { display: grid; gap: var(--s-5); }
.ulab-compare--joystick { grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr)); }
.ulab-compare--drawer { grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); }
</style>
