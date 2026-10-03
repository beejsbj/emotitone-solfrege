<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import Sticker from "@/components/primatives/Sticker";
import {
  STAGE_LAB_UNIT_IDS,
  type StageLabMessage,
  type StageLabPaper,
  type StageLabSelection,
  type StageLabState,
  type StageLabUnit,
  type StageLabUnitId,
} from "@/types/stageLab";
import FocusedPoster from "../../focused/FocusedPoster.vue";
import "../../focused/focused-page.css";
import { STAGE_LAB_STATES } from "./labConductor";
import { STAGE_LAB_UNITS } from "./labUnits";
import { STAGE_LAB_LOOKS, STAGE_LAB_PRESETS, type StageLabPreset } from "./labFamilies";
import StageLabFrameCell from "./StageLabFrameCell.vue";

/*
 * Guide-only design lab for the Stage step of the reimagining pass. Every
 * Stage part is its own unit: its strip runs production beside each of its
 * directions, each in its own frame with every other part production, all
 * driven by the same scripted states and live keys. Compose mounts any
 * combination of picks in one frame. `?unit=<id>` narrows the page.
 */
const onlyUnit = new URLSearchParams(window.location.search).get("unit");
const units = STAGE_LAB_UNITS.filter((unit) => !onlyUnit || unit.id === onlyUnit);

const state = ref<StageLabState>("phrase");
const mode = ref<"merge" | "web">("merge");
const wide = ref(false);
const KEYS = ["C4", "D4", "E4", "F4", "G4", "G#4", "A4", "B4", "C5"];
const held = ref(new Set<string>());

const broadcast = (message: StageLabMessage) => {
  document.querySelectorAll<HTMLIFrameElement>("iframe[data-stage-lab-frame]").forEach((frame) => {
    frame.contentWindow?.postMessage(message, window.location.origin);
  });
};

const selectState = (next: StageLabState) => {
  state.value = next;
  broadcast({ type: "stage-lab:state", state: next });
};
const selectMode = (next: "merge" | "web") => {
  mode.value = next;
  broadcast({ type: "stage-lab:mode", mode: next });
};
const wake = () => broadcast({ type: "stage-lab:wake" });
// Measured paint cost per part, shown in every frame.
const timings = ref(false);
const toggleTimings = () => {
  timings.value = !timings.value;
  broadcast({ type: "stage-lab:timings", on: timings.value });
};

const press = (pitch: string, down: boolean) => {
  if (down === held.value.has(pitch)) return;
  // Playing over a looping phrase would fight it; the keys play into silence.
  if (down && state.value === "phrase") selectState("silence");
  const next = new Set(held.value);
  if (down) next.add(pitch); else next.delete(pitch);
  held.value = next;
  broadcast({ type: "stage-lab:key", pitch, down });
};

// A frame that mounts late joins the current state and connection mode.
const onFrameReady = (frame: HTMLIFrameElement) => {
  frame.contentWindow?.postMessage({ type: "stage-lab:state", state: state.value } satisfies StageLabMessage, window.location.origin);
  frame.contentWindow?.postMessage({ type: "stage-lab:mode", mode: mode.value } satisfies StageLabMessage, window.location.origin);
  frame.contentWindow?.postMessage({ type: "stage-lab:timings", on: timings.value } satisfies StageLabMessage, window.location.origin);
};

// A strip shows only its own part: every other part keeps running, unseen.
const frameParams = (unit: StageLabUnit, direction: string | null) => ({
  [unit.id]: direction ?? "production",
  surface: "parts",
  hide: STAGE_LAB_UNIT_IDS.filter((other) => other !== unit.id).join(","),
  state: state.value,
  mode: mode.value,
});
// Frames keep their first src; later changes travel as messages, not reloads.
const firstParams = new Map(units.flatMap((unit) => [
  [`${unit.id}:production`, frameParams(unit, null)] as const,
  ...unit.directions.map((d) => [`${unit.id}:${d.id}`, frameParams(unit, d.id)] as const),
]));

// Compose starts on the Lit family preset; each change of pick or Look remounts its one frame.
const PICKS: StageLabSelection = { ...STAGE_LAB_PRESETS[0].selection };
const composed = reactive<StageLabSelection>({ ...PICKS });
const composeLook = ref(STAGE_LAB_PRESETS[0].look);
const composeKey = computed(() => [...STAGE_LAB_UNIT_IDS.map((unit) => composed[unit]), composeLook.value].join("|"));
const activePreset = ref<string | null>(STAGE_LAB_PRESETS[0].id);
const usePreset = (preset: StageLabPreset) => {
  Object.assign(composed, preset.selection);
  composeLook.value = preset.look;
  activePreset.value = preset.id;
};
// Mixer rules: any solo shows only the soloed parts; otherwise every unmuted part shows.
const muted = ref(new Set<StageLabUnitId>());
const soloed = ref(new Set<StageLabUnitId>());
const hidden = computed(() => STAGE_LAB_UNIT_IDS.filter((unit) =>
  soloed.value.size ? !soloed.value.has(unit) : muted.value.has(unit)));
const toggled = (set: Set<StageLabUnitId>, unit: StageLabUnitId) => {
  const next = new Set(set);
  if (next.has(unit)) next.delete(unit); else next.add(unit);
  return next;
};
const toggleMute = (unit: StageLabUnitId) => { muted.value = toggled(muted.value, unit); };
const toggleSolo = (unit: StageLabUnitId) => { soloed.value = toggled(soloed.value, unit); };
let composeFrame: HTMLIFrameElement | null = null;
const sendHidden = () => composeFrame?.contentWindow?.postMessage(
  { type: "stage-lab:hidden", hidden: hidden.value } satisfies StageLabMessage, window.location.origin);
watch(hidden, sendHidden);
const joinCompose = (frame: HTMLIFrameElement) => {
  composeFrame = frame;
  onFrameReady(frame);
  sendHidden();
};
// Params are taken once per pick set; state, mode and mute/solo then travel as
// messages, so toggling never reloads the frame.
const composeParams = ref<Record<string, string>>({});
watch(composeKey, () => {
  composeParams.value = {
    ...composed,
    surface: "parts",
    hide: hidden.value.join(","),
    look: composeLook.value,
    state: state.value,
    mode: mode.value,
  };
}, { immediate: true });
const choose = (unit: StageLabUnit, choice: string) => {
  (composed as Record<string, string>)[unit.id] = choice;
  activePreset.value = null;
};
// Looks stack: each chip toggles its knobs on or off; Canonical clears them all.
const activeLooks = computed(() => composeLook.value.split(",").filter((id) => id && id !== "canonical"));
const chooseLook = (id: string) => {
  const next = id === "canonical"
    ? []
    : activeLooks.value.includes(id) ? activeLooks.value.filter((look) => look !== id) : [...activeLooks.value, id];
  composeLook.value = next.length ? next.join(",") : "canonical";
  activePreset.value = null;
};
const presetNote = computed(() => STAGE_LAB_PRESETS.find((preset) => preset.id === activePreset.value)?.note ?? "");
const lookNote = computed(() => (activeLooks.value.length ? activeLooks.value : ["canonical"])
  .map((id) => STAGE_LAB_LOOKS.find((look) => look.id === id)?.note ?? "").join(" "));
const FAMILY_NAMES = { lit: "Lit", paper: "Paper", dot: "Dot", any: "Any family" } as const;

const stickerColor = (paper: StageLabPaper) => (paper === "cobalt" ? "ivory" : paper);
</script>

<template>
  <main class="slab focused-page guide-paper--cobalt">
    <FocusedPoster layer="compositions" unit-id="stage-lab" kicker="Design lab · guide only" title="Stage Lab">
      <p>
        Step 4 of the reimagining pass: every part of the canvas on its own. Each strip shows only its part:
        production first, then that part's directions, every frame playing the same notes at the same moment.
        Compose puts any picks together in one frame, with mute and solo per part.
      </p>
    </FocusedPoster>

    <nav class="slab__nav" aria-label="Lab units">
      <a v-for="unit in STAGE_LAB_UNITS" :key="unit.id" class="guide-chip" :href="`?unit=${unit.id}`">{{ unit.name }}</a>
      <a v-if="onlyUnit" class="guide-chip" href="?">All units</a>
    </nav>

    <section class="slab-controls" aria-label="Lab controls">
      <div class="slab-controls__row">
        <button class="guide-chip slab-controls__wake" type="button" @click="wake">Start silent signal</button>
        <button class="guide-chip" type="button" :aria-pressed="wide" @click="wide = !wide">
          {{ wide ? "Desktop frames" : "Phone frames" }}
        </button>
        <button class="guide-chip" type="button" :aria-pressed="timings" @click="toggleTimings">Timings</button>
        <span class="slab-controls__group" role="group" aria-label="Connections">
          <button
            v-for="option in (['merge', 'web'] as const)"
            :key="option"
            class="guide-chip"
            type="button"
            :aria-pressed="mode === option"
            @click="selectMode(option)"
          >{{ option === "merge" ? "Merge" : "Web" }}</button>
        </span>
      </div>
      <div class="slab-controls__row" role="group" aria-label="Musical state">
        <button
          v-for="option in STAGE_LAB_STATES"
          :key="option.id"
          class="guide-chip"
          type="button"
          :aria-pressed="state === option.id"
          @click="selectState(option.id)"
        >{{ option.label }}</button>
      </div>
      <div class="slab-keys" role="group" aria-label="Play into every frame">
        <button
          v-for="pitch in KEYS"
          :key="pitch"
          class="slab-keys__key"
          :class="{ 'slab-keys__key--sharp': pitch.includes('#') }"
          type="button"
          :aria-pressed="held.has(pitch)"
          @pointerdown.prevent="press(pitch, true)"
          @pointerup="press(pitch, false)"
          @pointerleave="press(pitch, false)"
          @pointercancel="press(pitch, false)"
          @keydown.space.prevent="press(pitch, true)"
          @keyup.space="press(pitch, false)"
        >{{ pitch.replace("#", "♯") }}</button>
      </div>
    </section>

    <div class="focused-page__body">
      <section v-if="!onlyUnit" id="lab-compose" class="focused-sheet slab-sheet slab-compose" aria-label="Compose a Stage from picks">
        <header class="focused-sheet__head">
          <div>
            <p class="focused-sheet__source">Any direction from each part, together in one frame</p>
            <h3 class="focused-sheet__title">Compose</h3>
          </div>
        </header>
        <div class="slab-compose__families">
          <p class="slab-compose__label">Families</p>
          <div class="slab-compose__presets" role="group" aria-label="Family presets">
            <button
              v-for="preset in STAGE_LAB_PRESETS"
              :key="preset.id"
              class="guide-chip"
              :class="`slab-family--${preset.family}`"
              type="button"
              :aria-pressed="activePreset === preset.id"
              @click="usePreset(preset)"
            >{{ preset.name }}</button>
          </div>
          <p v-if="presetNote" class="slab-compose__note">{{ presetNote }}</p>
          <p class="slab-compose__label">Looks · knob presets on the production settings (they stack)</p>
          <div class="slab-compose__presets" role="group" aria-label="Looks">
            <button
              v-for="look in STAGE_LAB_LOOKS"
              :key="look.id"
              class="guide-chip"
              type="button"
              :aria-pressed="look.id === 'canonical' ? !activeLooks.length : activeLooks.includes(look.id)"
              @click="chooseLook(look.id)"
            >{{ look.name }}</button>
          </div>
          <p class="slab-compose__note">{{ lookNote }}</p>
        </div>
        <div class="slab-compose__body">
          <dl class="slab-compose__choices">
            <div
              v-for="unit in STAGE_LAB_UNITS"
              :key="unit.id"
              :class="{ 'slab-compose__part--hidden': hidden.includes(unit.id) }"
            >
              <dt>{{ unit.name }}</dt>
              <dd role="group" :aria-label="unit.name">
                <button
                  class="slab-mixer"
                  type="button"
                  :aria-pressed="muted.has(unit.id)"
                  :aria-label="`Mute ${unit.name}`"
                  @click="toggleMute(unit.id)"
                >M</button>
                <button
                  class="slab-mixer slab-mixer--solo"
                  type="button"
                  :aria-pressed="soloed.has(unit.id)"
                  :aria-label="`Solo ${unit.name}`"
                  @click="toggleSolo(unit.id)"
                >S</button>
                <button
                  class="guide-chip"
                  type="button"
                  :aria-pressed="composed[unit.id] === 'production'"
                  @click="choose(unit, 'production')"
                >P</button>
                <button
                  v-for="direction in unit.directions"
                  :key="direction.id"
                  class="guide-chip"
                  type="button"
                  :title="direction.name"
                  :aria-pressed="composed[unit.id] === direction.id"
                  @click="choose(unit, direction.id)"
                >{{ direction.letter }} · {{ direction.name }}</button>
              </dd>
            </div>
          </dl>
          <StageLabFrameCell
            :key="`compose-${composeKey}-${wide}`"
            letter="✦"
            caption="Composed"
            :params="composeParams"
            :wide="wide"
            :join="joinCompose"
          />
        </div>
      </section>

      <section v-for="(unit, index) in units" :id="`lab-${unit.id}`" :key="unit.id" class="slab-unit">
        <p v-if="unit.group && units[index - 1]?.group !== unit.group" class="slab-group">
          {{ unit.group }}: Blobs, Connections and Lettering are independent parts that work together
        </p>
        <header class="slab-unit__head">
          <h2 class="slab-unit__title">{{ unit.name }}</h2>
          <p class="slab-unit__meta">{{ unit.directions.length }} directions · <code>{{ unit.source }}</code></p>
          <p class="slab-unit__reading">{{ unit.reading }}</p>
          <p class="slab-unit__aside"><strong>Stays production:</strong> {{ unit.keeps }}</p>
          <p v-if="unit.pick" class="slab-unit__aside"><strong>Lab pick:</strong> {{ unit.pick }}</p>
          <p v-if="unit.verdict" class="slab-unit__verdict">{{ unit.verdict }}</p>
        </header>

        <section :id="`lab-${unit.id}-compare`" class="focused-sheet slab-sheet" aria-label="Production beside every direction">
          <header class="focused-sheet__head">
            <div>
              <p class="focused-sheet__source">Production beside every direction · only this part shows</p>
              <h3 class="focused-sheet__title">Side by side</h3>
            </div>
          </header>
          <div class="slab-strip" :class="{ 'slab-strip--wide': wide }">
            <StageLabFrameCell
              :key="`${unit.id}-production-${wide}`"
              letter="P"
              caption="Production"
              :params="firstParams.get(`${unit.id}:production`)!"
              :wide="wide"
              :join="onFrameReady"
            />
            <StageLabFrameCell
              v-for="direction in unit.directions"
              :key="`${unit.id}-${direction.id}-${wide}`"
              :letter="direction.letter"
              :caption="direction.name"
              :params="firstParams.get(`${unit.id}:${direction.id}`)!"
              :wide="wide"
              :join="onFrameReady"
            />
          </div>
        </section>

        <div class="slab-unit__sheets">
          <article
            v-for="direction in unit.directions"
            :id="`lab-${unit.id}-${direction.id}`"
            :key="direction.id"
            class="focused-sheet slab-sheet"
            :class="`guide-paper--${direction.paper}`"
          >
            <header class="focused-sheet__head">
              <div>
                <p class="focused-sheet__source">Direction {{ direction.letter }} · lab/stage/painters</p>
                <h3 class="focused-sheet__title">{{ direction.name }}</h3>
              </div>
              <Sticker variant="fill" :color="stickerColor(direction.paper)">{{ direction.letter }}</Sticker>
            </header>
            <p class="slab-bible" :class="`slab-bible--${direction.bible.fit}`">
              <span class="slab-bible__chip slab-bible__chip--family">{{ FAMILY_NAMES[direction.family] }}</span>
              <span class="slab-bible__chip">{{ direction.bible.zone }}</span>
              <span class="slab-bible__chip">{{ direction.bible.role }}</span>
              <span class="slab-bible__chip slab-bible__chip--fit">{{ direction.bible.fit === "fits" ? "Fits the bible" : "Caution" }}</span>
              <span class="slab-bible__note">{{ direction.bible.note }}</span>
            </p>
            <p class="focused-sheet__prose">{{ direction.idea }}</p>
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
.slab__nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3);
  max-width: 1240px;
  margin: 0 auto;
  padding: var(--s-7) var(--s-6) 0;
}

/* Lab controls stay in reach while the frames scroll past. */
.slab-controls {
  position: sticky;
  top: calc(var(--guide-masthead-top, 0px) + var(--guide-masthead-height, 56px));
  z-index: 5;
  display: grid;
  gap: var(--s-3);
  max-width: 1240px;
  margin: var(--s-6) auto 0;
  padding: var(--s-4) var(--s-6);
  background: var(--ink);
}

/* One line per row on a phone, swiped sideways, so the frames stay in view. */
.slab-controls__row,
.slab-controls__group {
  display: flex;
  flex-wrap: nowrap;
  gap: var(--s-2);
  overflow-x: auto;
  scrollbar-width: none;
}

.slab-controls .guide-chip {
  flex: none;
  min-height: 32px;
  padding: 6px 10px 4px;
  font-size: 14px;
}

.slab-keys {
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  gap: 3px;
  touch-action: none;
}

.slab-keys__key {
  min-height: 40px;
  border: 0;
  background: var(--ivory);
  color: var(--ink);
  font: 700 14px/1 var(--font-display);
  user-select: none;
  cursor: pointer;
}

.slab-keys__key--sharp { background: var(--ink-4); color: var(--ivory); }
.slab-keys__key[aria-pressed="true"] { background: var(--ivory-3); }

.slab-group {
  margin: 0;
  padding: var(--s-3) var(--s-4);
  background: var(--ivory);
  color: var(--ink);
  font: 700 18px/1.1 var(--font-display);
  letter-spacing: .06em;
  text-transform: uppercase;
}

.slab-unit { display: grid; gap: var(--s-7); scroll-margin-top: var(--s-10); }

/* Anchors land below the masthead and the sticky lab controls. */
.slab-sheet { scroll-margin-top: calc(var(--guide-masthead-height, 56px) + 190px); }

.slab-unit__title {
  margin: 0;
  color: var(--ivory);
  font: 700 clamp(44px, 9vw, 96px)/.9 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.slab-unit__meta {
  margin: var(--s-5) 0 0;
  color: var(--ivory-3);
  font: var(--t-body-s-mono);
}

.slab-unit__meta code { color: var(--ivory-2); font: inherit; }

.slab-unit__reading,
.slab-unit__aside {
  max-width: 70ch;
  margin: var(--s-4) 0 0;
  color: var(--ivory);
  font: var(--t-body-s-mono);
}

.slab-unit__aside { color: var(--ivory-2); }
.slab-unit__aside strong { color: var(--ivory); }

.slab-unit__verdict {
  max-width: 70ch;
  margin: var(--s-4) 0 0;
  padding: var(--s-3) var(--s-4);
  background: var(--ivory);
  color: var(--ink);
  font: var(--t-body-s-mono);
}

/* Phones swipe through the frames; wide screens see all four at once. */
.slab-strip {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: min(78vw, 340px);
  gap: var(--s-5);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: var(--s-3);
}

.slab-strip--wide { grid-auto-columns: min(86vw, 560px); }

@media (min-width: 1100px) {
  .slab-strip { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, 1fr)); overflow: visible; }
  .slab-strip--wide { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.slab-unit__sheets {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--s-9);
}

.slab-compose__families { display: grid; gap: var(--s-3); }

.slab-compose__label {
  margin: 0;
  color: var(--ivory);
  font: 700 14px/1 var(--font-display);
  letter-spacing: .06em;
  text-transform: uppercase;
}

.slab-compose__presets { display: flex; flex-wrap: wrap; gap: var(--s-2); }
.slab-compose__presets .guide-chip { min-height: 32px; padding: 6px 10px 4px; font-size: 14px; }

.slab-compose__note {
  max-width: 70ch;
  margin: 0;
  color: var(--ivory-3);
  font: var(--t-caption);
}

.slab-bible__chip--family { background: var(--ivory-4); color: var(--ivory); }

.slab-compose__body {
  display: grid;
  gap: var(--s-6);
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 900px) {
  .slab-compose__families { display: grid; gap: var(--s-3); }

.slab-compose__label {
  margin: 0;
  color: var(--ivory);
  font: 700 14px/1 var(--font-display);
  letter-spacing: .06em;
  text-transform: uppercase;
}

.slab-compose__presets { display: flex; flex-wrap: wrap; gap: var(--s-2); }
.slab-compose__presets .guide-chip { min-height: 32px; padding: 6px 10px 4px; font-size: 14px; }

.slab-compose__note {
  max-width: 70ch;
  margin: 0;
  color: var(--ivory-3);
  font: var(--t-caption);
}

.slab-bible__chip--family { background: var(--ivory-4); color: var(--ivory); }

.slab-compose__body { grid-template-columns: minmax(0, 1fr) minmax(0, 340px); align-items: start; }
}

.slab-compose__choices {
  display: grid;
  gap: var(--s-4);
  margin: 0;
}

.slab-compose__choices dt {
  margin-bottom: var(--s-2);
  color: var(--ivory);
  font: 700 14px/1 var(--font-display);
  letter-spacing: .06em;
  text-transform: uppercase;
}

.slab-compose__choices dd {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  margin: 0;
}

.slab-compose__choices .guide-chip { min-height: 32px; padding: 6px 10px 4px; font-size: 14px; }

/* Mixer keys: square hardware buttons, Ivory when engaged. Guide scaffold only. */
.slab-mixer {
  width: 32px;
  min-height: 32px;
  border: 0;
  background: var(--ink-4);
  color: var(--ivory-2);
  font: 700 14px/1 var(--font-display);
  cursor: pointer;
}

.slab-mixer[aria-pressed="true"] { background: var(--ivory); color: var(--ink); }
.slab-mixer--solo { margin-right: var(--s-3); }
.slab-compose__part--hidden dt { color: var(--ivory-4); }

@media (min-width: 1100px) {
  .slab-unit__sheets { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

.slab-bible {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-3);
  margin: 0;
}

.slab-bible__chip {
  padding: 4px 8px 3px;
  background: var(--ink-4);
  color: var(--ivory-2);
  font: 700 12px/1 var(--font-display);
  letter-spacing: .08em;
  text-transform: uppercase;
}

.slab-bible--fits .slab-bible__chip--fit { background: var(--ivory); color: var(--ink); }
.slab-bible--caution .slab-bible__chip--fit { background: var(--brass); color: var(--brass-edge); }
.slab-bible__note { color: var(--ivory-3); font: var(--t-caption); }

</style>
